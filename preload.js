const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  listPorts: () => ipcRenderer.invoke('list-ports'),

  // Connect via USB or WiFi (Unified)
  connectMachine: (strategy) => ipcRenderer.invoke('connect-machine', strategy),

  // Send GCode
  sendGcode: (cmd) => ipcRenderer.send('send-gcode', cmd),

  // Machine Data Feed
  onSerialData: (cb) => ipcRenderer.on('serial-data', (e, d) => cb(d)),

  // Machine Connection Status
  onSerialStatus: (cb) => ipcRenderer.on('serial-status', (e, s) => cb(s)),

  // 👇 ADD THIS FOR AUTO-RECONNECT UI UPDATES
  onReconnectStatus: (cb) => ipcRenderer.on('reconnect-status', (e, status) => cb(status)),

  // --- HARDWARE CONFIGURATION ---
  // Set hardware profile (e.g., 'esp32', 'arduino_uno', 'arduino_mega', 'grbl_generic')
  setHardwareProfile: (profileId) => ipcRenderer.invoke('set-hardware-profile', profileId),

  // Set baud rate for current hardware
  setBaudRate: (baudRate) => ipcRenderer.invoke('set-baud-rate', baudRate),

  // Get all available hardware profiles
  getHardwareProfiles: () => ipcRenderer.invoke('get-hardware-profiles'),

  // Get current hardware configuration
  getCurrentHardware: () => ipcRenderer.invoke('get-current-hardware'),

  // Disconnect machine
  disconnectMachine: () => ipcRenderer.invoke('disconnect-machine'),
});

