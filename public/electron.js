const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport'); // Kept your import style
const net = require('net'); // Added for WiFi
const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

let mainWindow;
let activeConnection = null; // Can be SerialPort OR Socket
let connectionType = null;   // 'USB' or 'WIFI'

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, // Kept your preferred size
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the app (Universal method)
  // --- FORCE LIVE RELOAD ---
  console.log("🔌 FORCING LOCALHOST CONNECTION...");
  mainWindow.loadURL('http://localhost:3000');
  
  // Open DevTools immediately so you can see if it connects
  // mainWindow.webContents.openDevTools(); //

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- IPC HANDLERS ---

// List available COM ports
ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error('Error listing ports:', error);
    return [];
  }
});

// CONNECT (Smart Handler: USB or WiFi)
// Replaces your old 'connect-port'
ipcMain.handle('connect-machine', async (event, address) => {
  // 1. Close existing connection if any
  await closeActiveConnection();

  console.log(`Attempting to connect to: ${address}`);

  // 2. Decide: WiFi (IP) or USB (COM)?
  if (address.includes('.') && !address.toLowerCase().includes('com')) {
    return connectWifi(address);
  } else {
    return connectUsb(address);
  }
});

// Helper: Connect via USB
function connectUsb(portPath) {
  return new Promise((resolve) => {
    try {
      const port = new SerialPort({
        path: portPath,
        baudRate: 115200,
        autoOpen: false, 
      });

      port.open((err) => {
        if (err) {
          console.error('Serial port error:', err);
          notifyStatus('error', err.message);
          resolve({ success: false, message: err.message });
        } else {
          activeConnection = port;
          connectionType = 'USB';
          console.log(`Serial port ${portPath} opened`);
          notifyStatus('connected', `Connected to ${portPath}`);
          resolve({ success: true, message: `Connected to ${portPath}` });
        }
      });

      // Handle USB Data
      port.on('data', (data) => {
        if (mainWindow) mainWindow.webContents.send('serial-data', data.toString());
      });

      port.on('error', (err) => {
        notifyStatus('error', err.message);
      });

      port.on('close', () => {
        notifyStatus('disconnected');
        activeConnection = null;
      });

    } catch (error) {
      resolve({ success: false, message: error.message });
    }
  });
}

// Helper: Connect via WiFi
function connectWifi(ipAddress) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const PORT = 8080; // Standard MKS WiFi port

    socket.setTimeout(5000); // 5s timeout

    socket.connect(PORT, ipAddress, () => {
      activeConnection = socket;
      connectionType = 'WIFI';
      console.log(`Connected to WiFi: ${ipAddress}`);
      notifyStatus('connected', `Connected to ${ipAddress}`);
      resolve({ success: true, type: 'WIFI' });
    });

    // Handle WiFi Data
    socket.on('data', (data) => {
      if (mainWindow) mainWindow.webContents.send('serial-data', data.toString());
    });

    socket.on('error', (err) => {
      console.error('WiFi error:', err);
      notifyStatus('error', err.message);
      resolve({ success: false, message: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      notifyStatus('error', 'Connection timed out');
      resolve({ success: false, message: 'Timeout' });
    });

    socket.on('close', () => {
      notifyStatus('disconnected');
      activeConnection = null;
    });
  });
}

// Send G-code (Works for both USB and WiFi)
ipcMain.on('send-gcode', (event, command) => {
  if (activeConnection) {
    console.log('Sending:', command);
    // Both Serial and Socket use .write()
    activeConnection.write(command + '\n', (err) => {
      if (err) console.error('Write error:', err);
    });
  } else {
    console.warn('Cannot send: No connection');
  }
});

// Cleanup Helper
async function closeActiveConnection() {
  if (!activeConnection) return;
  
  if (connectionType === 'USB' && activeConnection.isOpen) {
    await new Promise((resolve) => activeConnection.close(resolve));
  } else if (connectionType === 'WIFI') {
    activeConnection.destroy();
  }
  
  activeConnection = null;
  connectionType = null;
}

// Status Helper (To keep your UI updated)
function notifyStatus(status, message = '') {
  if (mainWindow) {
    mainWindow.webContents.send('serial-status', status); // e.g. 'connected', 'error'
    if (message) console.log(`Status: ${status} - ${message}`);
  }
}

// App lifecycle
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});