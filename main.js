const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const { SerialPort, ReadlineParser } = require('serialport');

// --- GPU FIXES ---
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

let mainWindow;
let activeConnection = null;
let connectionType = null; // 'usb' or 'wifi'
let connecting = false;    // prevents parallel connection attempts
let reconnectTimer = null; // single reconnect timer - KEPT FOR REFERENCE, BUT UNUSED

// --- HARDWARE CONFIGURATION ---
let currentHardwareProfile = 'esp32'; // default hardware
let currentBaudRate = 115200; // default baud rate

// Hardware profiles with specifications
const HARDWARE_PROFILES = {
  esp32: {
    name: 'MKS DLC32 (ESP32)',
    defaultBaudRate: 115200,
    baudRates: [115200, 9600],
    commandDelay: 50,
  },
  arduino_uno: {
    name: 'Arduino Uno',
    defaultBaudRate: 9600,
    baudRates: [9600, 19200, 115200],
    commandDelay: 100,
  },
  arduino_mega: {
    name: 'Arduino Mega 2560',
    defaultBaudRate: 115200,
    baudRates: [9600, 19200, 115200],
    commandDelay: 50,
  },
  grbl_generic: {
    name: 'Generic GRBL Controller',
    defaultBaudRate: 115200,
    baudRates: [9600, 19200, 38400, 57600, 115200],
    commandDelay: 100,
  }
};

// --- CONSTANTS FOR USB AUTO-DETECT ---
const AUTO_DETECT_DEVICES = [
  { vid: '1A86', pid: '7523', name: 'CH340' },   // CH340
  { vid: '10C4', pid: 'EA60', name: 'CP210X' },  // CP210x
  { vid: '2341', name: 'Arduino' },               // Arduino boards
];

function createWindow() {
  const isDev = !app.isPackaged;
  const preloadPath = path.join(__dirname, 'preload.js');
  const indexPath = path.join(__dirname, 'build', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#F5F5DC',
    show: false, // Don't show until ready
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      enableRemoteModule: false,
      sandbox: true
    },
  });

  if (isDev) {
    console.log('[Main] Loading development server at http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[Main] Production build - Loading from:', indexPath);
    
    // Check if build file exists
    const fs = require('fs');
    if (!fs.existsSync(indexPath)) {
      console.error('[Main] ERROR: index.html not found at:', indexPath);
      console.error('[Main] Current directory:', __dirname);
      console.error('[Main] Directory contents:', require('fs').readdirSync(__dirname));
      mainWindow.webContents.send('build-error', {
        message: 'Application files not found. Please reinstall the application.',
        path: indexPath
      });
      mainWindow.loadURL(`data:text/html,<h1>Application Error</h1><p>Missing build files. Please reinstall.</p>`);
    } else {
      mainWindow.loadFile(indexPath).catch(err => {
        console.error('[Main] Error loading file:', err);
        mainWindow.loadURL(`data:text/html,<h1>Application Error</h1><p>${err.message}</p>`);
      });
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('[Main] Renderer process crashed!');
    mainWindow.reload();
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('[Main] Renderer process unresponsive!');
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => closeConnection());

// -----------------------------------------------------------------------------
// CONNECTION MANAGEMENT
// -----------------------------------------------------------------------------

function closeConnection() {
  if (!activeConnection) return;
  console.log('Closing active connection...');

  try {
    if (connectionType === 'usb' && activeConnection && activeConnection.isOpen) activeConnection.close();
    if (connectionType === 'wifi' && activeConnection) activeConnection.destroy();
  } catch (e) { console.error('Close Error:', e); }

  activeConnection = null;
  connectionType = null;
}

// -----------------------------------------------------------------------------
// USB AUTODETECT (priority path) - Removed scheduleReconnect call
// -----------------------------------------------------------------------------

async function findAndConnectUsb() {
  const ports = await SerialPort.list();
  if (ports.length === 0) return { success: false, error: 'no_ports' };

  let candidates = ports.filter(port =>
    AUTO_DETECT_DEVICES.some(dev =>
      port.vendorId && port.vendorId.toUpperCase() === dev.vid &&
      (dev.pid ? port.productId?.toUpperCase() === dev.pid : true)
    )
  );

  if (candidates.length === 0) {
    const generic = ports.filter(p => !p.vendorId && p.path.toLowerCase().includes('usb'));
    if (generic.length === 0) return { success: false, error: 'no_laser_usb' };
    candidates = generic;
  }

  for (const portInfo of candidates) {
    console.log(`[Main] Trying USB Port: ${portInfo.path} with baud rate ${currentBaudRate}`);
    try {
      await new Promise((resolve, reject) => {
        const port = new SerialPort({ path: portInfo.path, baudRate: currentBaudRate, autoOpen: false });

        port.on('error', err => reject(err));

        port.open(err => {
          if (err) reject(err);
          else {
            activeConnection = port;
            connectionType = 'usb';

            const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
            parser.on('data', data => mainWindow?.webContents.send('serial-data', data.toString()));
            port.on('close', () => {
              mainWindow?.webContents.send('serial-status', 'disconnected');
              // scheduleReconnect(); <-- Removed to prevent USB auto-reconnect loop
            });

            mainWindow?.webContents.send('serial-status', 'connected');
            resolve();
          }
        });
      });

      return { success: true, type: 'usb', path: portInfo.path, baudRate: currentBaudRate };
    } catch (err) {
      console.log(`[Main] USB Failed: ${err.message}`);
    }
  }

  return { success: false, error: 'usb_failed' };
}

// -----------------------------------------------------------------------------
// WIFI CONNECT (fallback path) - Removed scheduleReconnect calls
// -----------------------------------------------------------------------------

function connectWifi() {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.setKeepAlive(true, 1000);

    socket.connect(8080, '192.168.4.1', () => {
      console.log('[Main] WiFi Connected!');
      activeConnection = socket;
      connectionType = 'wifi';
      socket.setTimeout(0); // Remove connection timeout after success

      // small handshake delay
      setTimeout(() => {
        try { socket.write('?\n'); } catch (e) { /* ignore */ }
      }, 50);

      mainWindow?.webContents.send('serial-status', 'connected');
      resolve({ success: true, type: 'wifi' });
    });

    socket.on('data', data => mainWindow?.webContents.send('serial-data', data.toString()));

    socket.on('close', hadError => {
      console.log('[Main] WiFi Closed - Attempting cleanup');
      if (activeConnection === socket) {
        activeConnection = null;
        connectionType = null;
      }
      mainWindow?.webContents.send('serial-status', 'disconnected');
      // scheduleReconnect(); <-- Removed to prevent immediate reset loop
    });

    socket.on('timeout', () => {
      console.log('[Main] WiFi Connection Timeout');
      resolve({ success: false, error: 'timeout' });
    });
    
    socket.on('error', err => {
      console.log('[Main] WiFi Error:', err.message);
      // If error during initial connect, resolve false
      if (connectionType !== 'wifi' || activeConnection !== socket) {
        resolve({ success: false, error: err.message });
      } else {
        // If runtime error during engraving, just clean up and notify frontend
        if (activeConnection === socket) {
          activeConnection = null;
          connectionType = null;
        }
        mainWindow?.webContents.send('serial-status', 'disconnected');
        // scheduleReconnect(); <-- Removed to prevent immediate reset loop
      }
    });
  });
}

// -----------------------------------------------------------------------------
// SAFE SINGLE-RECONNECT SCHEDULER (PREVIOUSLY SCHEDULED, NOW REMOVED)
// -----------------------------------------------------------------------------

// Removed the entire function body for scheduleReconnect to stop the reset loop.
// The frontend (App.js) will now handle connection retry.

// -----------------------------------------------------------------------------
// IPC: HARDWARE CONFIGURATION
// -----------------------------------------------------------------------------

ipcMain.handle('set-hardware-profile', (event, profileId) => {
  if (HARDWARE_PROFILES[profileId]) {
    currentHardwareProfile = profileId;
    const profile = HARDWARE_PROFILES[profileId];
    currentBaudRate = profile.defaultBaudRate;
    console.log(`[Main] Hardware profile set to: ${profileId} (${profile.name}) with baud rate ${currentBaudRate}`);
    return { success: true, profile: profileId, baudRate: currentBaudRate };
  }
  return { success: false, error: 'Unknown profile' };
});

ipcMain.handle('set-baud-rate', (event, baudRate) => {
  const profile = HARDWARE_PROFILES[currentHardwareProfile];
  if (profile && profile.baudRates.includes(baudRate)) {
    currentBaudRate = baudRate;
    console.log(`[Main] Baud rate set to: ${currentBaudRate}`);
    return { success: true, baudRate: currentBaudRate };
  }
  return { success: false, error: `Invalid baud rate for ${profile?.name}` };
});

ipcMain.handle('get-hardware-profiles', (event) => {
  return Object.entries(HARDWARE_PROFILES).map(([id, config]) => ({
    id,
    name: config.name,
    defaultBaudRate: config.defaultBaudRate,
    baudRates: config.baudRates,
    commandDelay: config.commandDelay,
  }));
});

ipcMain.handle('get-current-hardware', (event) => {
  const profile = HARDWARE_PROFILES[currentHardwareProfile];
  return {
    profileId: currentHardwareProfile,
    profileName: profile.name,
    baudRate: currentBaudRate,
    commandDelay: profile.commandDelay,
  };
});

// -----------------------------------------------------------------------------
// IPC: CONNECT LOGIC WITH SMART PRIORITIES
// -----------------------------------------------------------------------------

ipcMain.handle('connect-machine', async (event, strategy) => {
  // Clear the unused timer if it somehow persisted (safe cleanup)
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  if (connecting) return { success: false, error: 'busy' };

  if (activeConnection) {
    return { success: true, type: connectionType };
  }

  connecting = true;
  console.log(`[Main] Connection request → ${strategy}`);

  if (strategy === 'usb') {
    const usbRes = await findAndConnectUsb();
    if (usbRes.success) { connecting = false; return usbRes; }
    console.log('[Main] USB not found or failed → Trying WiFi...');
    const wifiRes = await connectWifi();
    connecting = false;
    return wifiRes;
  }

  if (strategy === 'wifi') {
    const wifiRes = await connectWifi();
    connecting = false;
    return wifiRes;
  }

  connecting = false;
  return { success: false, error: 'invalid_strategy' };
});

// -----------------------------------------------------------------------------
// SEND GCODE - SAFE WRITES
// -----------------------------------------------------------------------------

function isSocketAlive() {
  return connectionType === 'wifi' && activeConnection && !activeConnection.destroyed;
}

ipcMain.on('send-gcode', (event, cmd) => {
  if (!activeConnection) return;

  try {
    if (connectionType === 'wifi') {
      if (!isSocketAlive()) return;
      activeConnection.write(cmd + '\n');
    } else if (connectionType === 'usb') {
      if (!activeConnection || !activeConnection.isOpen) return;
      activeConnection.write(cmd + '\n');
    }
  } catch (err) {
    console.warn('[Main] Write attempted on closed/destroyed socket:', err && err.message);
  }
});

// --- IPC: DISCONNECT ---
ipcMain.handle('disconnect-machine', (event) => {
  closeConnection();
  return { success: true };
});