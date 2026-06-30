const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  listPorts: () => ipcRenderer.invoke('list-ports'),
  // New Unified Connect Function
  connectMachine: (strategy) => ipcRenderer.invoke('connect-machine', strategy),
  sendGcode: (cmd) => ipcRenderer.send('send-gcode', cmd),
  onSerialData: (cb) => ipcRenderer.on('serial-data', (e, d) => cb(d)),
  onSerialStatus: (cb) => ipcRenderer.on('serial-status', (e, s) => cb(s))
});