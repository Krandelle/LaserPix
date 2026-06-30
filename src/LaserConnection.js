/**
 * LaserConnection.js - Universal Connection Manager
 * * Abstracts platform differences (Electron vs Mobile/PWA)
 * - Desktop (Electron): USB Serial + TCP/Telnet fallback
 * - Mobile (PWA): WebSocket only (Ports 81 & 8080)
 */

class LaserConnection {
  constructor() {
    // Platform detection
    this.isElectron = !!window.electron;
    this.isMobile = this.detectMobileOrPWA();
    
    // Connection state
    this.isConnected = false;
    this.connectionType = null; // 'usb', 'tcp', 'websocket'
    
    // WebSocket reference (for mobile or TCP fallback)
    this.websocket = null;
    
    // Electron references
    this.electronPort = null;
    
    // Event callbacks
    this.dataCallbacks = [];
    this.statusCallbacks = [];
    
    // Auto-connect tracking
    this.autoConnectTimeout = null;
    
    console.log(`[LaserConnection] Platform: ${this.isElectron ? 'Electron' : 'Mobile/PWA'}`);
  }

  /**
   * Detect if running on mobile or PWA
   */
  detectMobileOrPWA() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  navigator.standalone === true ||
                  window.navigator.standalone === true;
    
    return isMobileDevice || isPWA;
  }

  /**
   * Connect - Smart routing based on platform
   */
  async connect(targetAddress = null) {
    console.log(`[LaserConnection] Attempting to connect (${this.isElectron ? 'Electron' : 'Mobile'})...`);
    
    if (this.isElectron) {
      return this.connectElectron(targetAddress);
    } else {
      return this.connectMobile(targetAddress);
    }
  }

  /**
   * Electron Desktop Connection Strategy
   */
  async connectElectron(targetAddress) {
    try {
      if (targetAddress) {
        return await this.connectViaElectron(targetAddress);
      }

      // Step 1: Try USB Serial
      console.log('[LaserConnection] Desktop: Scanning for USB ports...');
      const ports = await window.electron.listPorts();
      
      let usbPort = ports.find(p => p.vendorId); 
      if (!usbPort && ports.length > 0) {
        usbPort = ports[0]; 
      }

      if (usbPort) {
        console.log(`[LaserConnection] Found USB port: ${usbPort.path}`);
        const result = await this.connectViaElectron(usbPort.path);
        if (result.success) {
          return result;
        }
      }

      // Step 2: Try TCP/Telnet to WiFi AP
      console.log('[LaserConnection] No USB found. Checking WiFi...');
      const wifiReachable = await window.electron.checkNetwork('192.168.4.1', 8080);
      
      if (wifiReachable) {
        console.log('[LaserConnection] WiFi AP reachable. Connecting via TCP...');
        return await this.connectViaElectron('192.168.4.1:8080');
      }

      return { success: false, error: 'No USB or WiFi connection found' };
    } catch (err) {
      console.error('[LaserConnection] Electron connection error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Connect via Electron (USB or TCP)
   */
  async connectViaElectron(portOrAddress) {
    try {
      const result = await window.electron.connectPort(portOrAddress);
      
      if (result.success) {
        this.isConnected = true;
        this.electronPort = portOrAddress;
        this.connectionType = portOrAddress.includes(':') ? 'tcp' : 'usb';
        
        console.log(`[LaserConnection] Connected via ${this.connectionType}: ${portOrAddress}`);
        this.emitStatus('connected', { type: this.connectionType, address: portOrAddress });
        
        this.listenToElectronData();
        
        return { success: true, type: this.connectionType, address: portOrAddress };
      } else {
        console.warn(`[LaserConnection] Failed to connect to ${portOrAddress}:`, result.error);
        return result;
      }
    } catch (err) {
      console.error('[LaserConnection] Connection error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Listen to Electron data events
   */
  listenToElectronData() {
    if (!window.electron) return;
    
    window.electron.onSerialData((data) => {
      this.emitData(data);
    });

    window.electron.onSerialStatus((status) => {
      if (status === 'disconnected') {
        this.isConnected = false;
        this.emitStatus('disconnected');
      }
    });
  } 

  /**
   * Mobile/PWA Connection Strategy
   * Tries Port 81 (Standard WS) then Port 8080 (Alternative)
   */
  async connectMobile(targetAddress = null) {
    try {
      // List of ports to try if default fails
      // Try 81 first, then 8080, then 80
      const addressesToTry = targetAddress 
        ? [targetAddress] 
        : ['ws://192.168.4.1:81', 'ws://192.168.4.1:8080', 'ws://192.168.4.1:80'];
      
      for (const wsAddress of addressesToTry) {
        console.log(`[LaserConnection] Mobile: Attempting WebSocket to ${wsAddress}...`);
        
        try {
          // Wrap WebSocket creation in a Promise to await connection
          const result = await new Promise((resolve, reject) => {
            const ws = new WebSocket(wsAddress);
            let isResolved = false; 

            ws.onopen = () => {
              if (isResolved) return;
              isResolved = true;
              console.log(`[LaserConnection] WebSocket connected to ${wsAddress}!`);
              
              this.websocket = ws; 
              this.isConnected = true;
              this.connectionType = 'websocket';
              this.emitStatus('connected', { type: 'websocket', address: wsAddress });
              
              // Set up listeners on the active socket
              ws.onmessage = (event) => this.emitData(event.data);
              
              ws.onerror = (error) => {
                  console.error('[LaserConnection] WebSocket runtime error:', error);
                  this.emitStatus('error', { message: 'Connection Error' });
              };
              
              ws.onclose = () => {
                  console.log('[LaserConnection] WebSocket closed');
                  this.isConnected = false;
                  this.emitStatus('disconnected');
              };

              resolve({ success: true, type: 'websocket', address: wsAddress });
            };

            // Handle initial connection failure
            ws.onerror = (err) => {
               if (!isResolved) {
                 isResolved = true;
                 console.warn(`[LaserConnection] Failed initial connect to ${wsAddress}`);
                 ws.close(); 
                 reject(err); 
               }
            };

            // Timeout safety (2 seconds)
            setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                console.warn(`[LaserConnection] Timeout connecting to ${wsAddress}`);
                ws.close();
                reject(new Error('Timeout'));
              }
            }, 2000); 
          });

          // If we get here, connection succeeded! Return immediately.
          return result;

        } catch (e) {
          // Loop to the next port
          continue; 
        }
      }

      return { success: false, error: 'All WebSocket ports failed' };

    } catch (err) {
      console.error('[LaserConnection] Mobile connection error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Disconnect
   */
  async disconnect() {
    console.log('[LaserConnection] Disconnecting...');
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.isElectron && window.electron) {
       await window.electron.disconnectMachine();
    }

    this.isConnected = false;
    this.connectionType = null;
    this.emitStatus('disconnected');
  }

  /**
   * Send G-code command
   */
  sendGcode(command) {
    if (!this.isConnected) {
      // console.warn('[LaserConnection] Not connected. Cannot send:', command);
      return false;
    }

    try {
      if (this.isElectron) {
        window.electron.sendGcode(command);
      } else if (this.websocket) {
        this.websocket.send(command + '\n');
      }
      return true;
    } catch (err) {
      console.error('[LaserConnection] Error sending G-code:', err);
      return false;
    }
  }

  /**
   * Register callback for incoming data
   */
  onData(callback) {
    this.dataCallbacks.push(callback);
  }

  /**
   * Register callback for status changes
   */
  onStatus(callback) {
    this.statusCallbacks.push(callback);
  }

  /**
   * Emit data to all registered callbacks
   */
  emitData(data) {
    this.dataCallbacks.forEach(cb => {
      try { cb(data); } catch (err) { console.error(err); }
    });
  }

  /**
   * Emit status to all registered callbacks
   */
  emitStatus(status, details = {}) {
    this.statusCallbacks.forEach(cb => {
      try { cb(status, details); } catch (err) { console.error(err); }
    });
  }

  /**
   * Auto-connect with retry logic
   */
  autoConnect(callback = null) {
    if (this.autoConnectTimeout) clearInterval(this.autoConnectTimeout);

    const attemptConnect = async () => {
      if (this.isConnected) return;

      const result = await this.connect();
      if (result.success && callback) {
        callback(result);
      }
    };

    attemptConnect();
    const interval = this.isElectron ? 2000 : 3000;
    this.autoConnectTimeout = setInterval(attemptConnect, interval);
  }
}

// Export as singleton
export default new LaserConnection();