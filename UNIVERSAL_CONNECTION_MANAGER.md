# Universal Connection Manager - Implementation Guide

## Overview

This implementation provides a cross-platform connection manager for your MKS DLC32 laser engraver, supporting both **Desktop (Electron)** and **Mobile (PWA)** platforms with automatic connection detection and intelligent fallback strategies.

---

## Files Modified/Created

### 1. **src/LaserConnection.js** (NEW - 10.5 KB)
Universal abstraction layer that handles platform differences transparently.

**Features:**
- ✅ Platform auto-detection (Electron vs Mobile/PWA)
- ✅ Unified API (connect, disconnect, sendGcode, onData, onStatus)
- ✅ Desktop priority: USB Serial → TCP/Telnet
- ✅ Mobile priority: WebSocket only
- ✅ Auto-connect with retry logic (2s desktop, 3s mobile)
- ✅ Connection info tracking and status reporting

**Usage:**
```javascript
import LaserConnection from './LaserConnection';

// Auto-connect with retry
LaserConnection.autoConnect((result) => {
  console.log('Connected:', result);
});

// Send G-code
LaserConnection.sendGcode('G21');

// Listen for responses
LaserConnection.onData((data) => {
  if (data.includes('ok')) handleResponse();
});

// Check status
const info = LaserConnection.getConnectionInfo();
// { isConnected, type, platform, address }
```

### 2. **main.js** (UPDATED)
Electron backend with new network reachability handler.

**Changes:**
- ✅ Added `const net = require('net');`
- ✅ Added `ipcMain.handle('check-network', ...)`
  - Tests TCP connectivity to IP:Port
  - 500ms timeout to prevent hanging
  - Returns boolean (true if reachable)

**Handler Signature:**
```javascript
// Call from frontend
const reachable = await window.electron.checkNetwork('192.168.4.1', 8080);
```

### 3. **public/preload.js** (UPDATED)
Security bridge exposing IPC handlers to React frontend.

**New Exposure:**
```javascript
checkNetwork: (ipAddress, port = 8080) => 
  ipcRenderer.invoke('check-network', ipAddress, port)
```

### 4. **src/App.js** (UPDATED)
React component with improved auto-connect logic.

**Changes:**
- ✅ Added `import LaserConnection from './LaserConnection';`
- ✅ Replaced old `useEffect` with intelligent auto-connect hook
- ✅ Desktop strategy: USB scan every 2 seconds
- ✅ Mobile strategy: WebSocket retry every 3 seconds
- ✅ Automatic resume on disconnection

---

## Connection Flow Diagrams

### Desktop (Electron) - USB Priority

```
App Mount
  ↓
[Auto-Connect Interval: 2 seconds]
  ↓
Check USB Ports
  ├─ Device found with vendorId?
  │  ↓
  │  Connect to USB (115200 baud)
  │  ↓
  │  ✅ Success → Stop Scanning
  │
  └─ No USB Found
     ↓
     Check WiFi Reachability
     ├─ 192.168.4.1:8080 Responds?
     │  ↓
     │  Connect via TCP/Telnet
     │  ↓
     │  ✅ Success → Stop Scanning
     │
     └─ No WiFi
        ↓
        Retry in 2 seconds
```

### Mobile (PWA) - WebSocket Only

```
App Mount
  ↓
[Auto-Connect Interval: 3 seconds]
  ↓
Open WebSocket
  ├─ ws://192.168.4.1:81
  │  ↓
  │  ✅ Connected → Stop Scanning
  │
  └─ Connection Failed
     ↓
     Retry in 3 seconds
```

---

## Configuration Reference

### Board Settings
- **IP Address (AP Mode):** `192.168.4.1`
- **USB Baud Rate:** `115200`
- **WebSocket Port:** `81` (Mobile)
- **Telnet/TCP Port:** `8080` (Desktop)

### Auto-Connect Intervals
- **Desktop:** 2000ms (USB + WiFi check)
- **Mobile:** 3000ms (WebSocket retry)

### Network Check Timeout
- **TCP Reachability Test:** 500ms

---

## Usage Patterns

### Pattern 1: Basic Usage in Components

```javascript
import LaserConnection from './LaserConnection';

function MyComponent() {
  useEffect(() => {
    // Listen for connection status
    LaserConnection.onStatus((status, details) => {
      console.log('Connection:', status, details);
      // status: 'connected' | 'disconnected' | 'error'
    });

    // Listen for data from device
    LaserConnection.onData((data) => {
      console.log('Device says:', data);
    });
  }, []);

  const handleSendCommand = () => {
    LaserConnection.sendGcode('G00 X10 Y10');
  };

  return (
    <button onClick={handleSendCommand}>
      Move to X10 Y10
    </button>
  );
}
```

### Pattern 2: Check Connection Info

```javascript
const info = LaserConnection.getConnectionInfo();

if (info.isConnected) {
  console.log(`Connected via ${info.type} on ${info.address}`);
  // type: 'usb' | 'tcp' | 'websocket'
  // address: '/dev/ttyUSB0' or 'ws://192.168.4.1:81'
}

if (info.isMobile) {
  console.log('Running on mobile device');
}
```

### Pattern 3: Manual Connection

```javascript
// Connect to specific address
const result = await LaserConnection.connect('192.168.4.1:8080');

if (result.success) {
  console.log(`Connected via ${result.type}`);
} else {
  console.log('Failed:', result.error);
}
```

### Pattern 4: Graceful Disconnect

```javascript
await LaserConnection.disconnect();
// Cleans up WebSocket or serial port
// Stops auto-connect
// Emits 'disconnected' status
```

---

## Error Handling

The system gracefully handles:
- ❌ USB port not available → Falls back to WiFi
- ❌ WiFi not reachable → Retries automatically
- ❌ WebSocket connection timeout → Retries every 3 seconds
- ❌ Port in use → Closes previous connection first
- ❌ Network timeout → 500ms limit prevents hanging

---

## Platform-Specific Behavior

### Desktop (Electron)

| Scenario | Behavior |
|----------|----------|
| USB device connected | Uses USB (fastest) |
| USB not available | Tests WiFi, connects via TCP |
| Both USB & WiFi available | Prefers USB |
| Connection lost | Auto-reconnect resumes scanning |
| Scan interval | 2 seconds |

### Mobile (PWA)

| Scenario | Behavior |
|----------|----------|
| WebSocket available | Connects immediately |
| WebSocket unavailable | Retries every 3 seconds |
| Connection lost | Auto-reconnect retries |
| Scan interval | 3 seconds |

---

## Debug Console Output

When developing, watch for these logs:

```
[LaserConnection] Platform: Electron
[LaserConnection] Desktop: Scanning for USB ports...
[LaserConnection] Found USB port: /dev/ttyUSB0
[LaserConnection] Connected via usb: /dev/ttyUSB0

// Or WiFi fallback:
[check-network] 192.168.4.1:8080 is reachable
[LaserConnection] WiFi AP reachable. Connecting via TCP...
[LaserConnection] Connected via tcp: 192.168.4.1:8080

// Mobile:
[LaserConnection] Mobile: Attempting WebSocket to ws://192.168.4.1:81...
[LaserConnection] WebSocket connected!
[LaserConnection] Connected via websocket: ws://192.168.4.1:81
```

---

## Testing Checklist

- [ ] Desktop: USB device connects automatically
- [ ] Desktop: Falls back to WiFi if USB not available
- [ ] Desktop: Resumes scanning after disconnection
- [ ] Mobile: WebSocket connects automatically
- [ ] Mobile: Retries if WiFi not available
- [ ] Both: Status updates display correctly
- [ ] Both: G-code commands send successfully
- [ ] Both: Device responses received
- [ ] Both: Graceful disconnect works

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                   React App (App.js)                │
│  - Imports LaserConnection singleton                │
│  - Uses unified API regardless of platform          │
└─────────────────────────────────────────────────────┘
              ↓                    ↓
    ┌─────────────────┐  ┌──────────────────┐
    │    DESKTOP      │  │     MOBILE       │
    │   (Electron)    │  │      (PWA)       │
    └─────────────────┘  └──────────────────┘
         ↓ ↓                       ↓
    ┌─────────┐          ┌──────────────────┐
    │ window  │          │  WebSocket API   │
    │.electron│          │  (Browser native)│
    └────┬────┘          └────────────────┬─┘
         ↓                                 ↓
    ┌─────────────┐         ┌──────────────────┐
    │  main.js    │         │  MKS DLC32       │
    │  (Electron) │         │  AP Mode         │
    └────┬────────┘         └─────────────────┘
         ↓
    ┌──────────────────────────────────┐
    │  MKS DLC32 Board                 │
    │  - USB Serial (fastest)          │
    │  - Port 8080 (Telnet/TCP)        │
    │  - Port 81 (WebSocket)           │
    └──────────────────────────────────┘
```

---

## Future Enhancements

- [ ] Add reconnection exponential backoff
- [ ] Implement connection timeout settings UI
- [ ] Add connection history/logs
- [ ] Support multiple devices
- [ ] Add firmware update via connection
- [ ] Connection quality metrics (latency, reliability)
- [ ] Bluetooth support for future boards

---

## Support

For issues or questions:
1. Check debug console logs
2. Verify board IP with `ping 192.168.4.1`
3. Test USB connection directly
4. Check network reachability manually
