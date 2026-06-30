# Arduino Uno & Multi-Hardware Support - Implementation Summary

## What Changed

Your LaserPix software now supports multiple hardware platforms with configurable baud rates. Previously it was hardcoded for MKS DLC32 (ESP32) with 115200 baud. Now you can easily switch between:

- **MKS DLC32 (ESP32)** - 115200 baud (default)
- **Arduino Uno** - 9600 baud (new)
- **Arduino Mega 2560** - 115200 baud (new)
- **Generic GRBL Controller** - Flexible baud rates (new)

---

## Files Modified

### 1. **HardwareConfig.js** (NEW)
- Centralized hardware profile definitions
- Stores specifications for each board type
- Defines baud rate options
- Easily extensible for new hardware

### 2. **main.js**
Changes:
- Added hardware profile storage (`currentHardwareProfile`, `currentBaudRate`)
- Added `HARDWARE_PROFILES` object with all board specs
- Updated USB detection to support Arduino boards (VID 2341)
- Modified `findAndConnectUsb()` to use configurable baud rates
- Added 3 new IPC handlers for hardware configuration:
  - `set-hardware-profile` - Change board type
  - `set-baud-rate` - Change baud rate
  - `get-hardware-profiles` - Get all available profiles
  - `get-current-hardware` - Get current settings

### 3. **preload.js**
Added new Electron API methods exposed to React:
```javascript
window.electron.setHardwareProfile(profileId)
window.electron.setBaudRate(baudRate)
window.electron.getHardwareProfiles()
window.electron.getCurrentHardware()
window.electron.disconnectMachine()
```

### 4. **App.js**
Changes:
- New state variables:
  - `hardwareProfiles` - List of available boards
  - `selectedHardware` - Current board selection
  - `selectedBaudRate` - Current baud rate
  - `availableBaudRates` - Valid rates for board
  - `showHardwareSettings` - Modal visibility

- New useEffect hook to load hardware config on startup

- New handler functions:
  - `handleHardwareChange()` - Handle board selection
  - `handleBaudRateChange()` - Handle baud rate change

- New UI Components:
  - **⚙️ Hardware** button (top-left, next to History)
  - **Hardware Settings Modal** with:
    - Board selection (radio buttons)
    - Baud rate selection
    - Current configuration display
    - Tips and documentation

---

## How to Use

### For End Users

1. **Open LaserPix Application**
2. **Click ⚙️ Hardware button** (top-left corner)
3. **Select your hardware board**:
   - Arduino Uno → 9600 baud
   - Arduino Mega → 115200 baud
   - MKS DLC32 → 115200 baud
   - Other → Choose generic GRBL
4. **Select appropriate baud rate**
5. **Close dialog** and connect USB
6. Machine will now connect with correct settings

### For Developers

To add new hardware support, edit `src/HardwareConfig.js`:

```javascript
const HARDWARE_PROFILES = {
  your_board: {
    name: 'Your Board Name',
    description: 'Your description',
    baudRate: 115200,
    defaultBaudRates: [9600, 19200, 115200],
    protocol: 'grbl',
    features: {
      supportsWiFi: false,
      supportsUSB: true,
      maxSpeed: 2000,
      minSpeed: 50,
    },
    vendorIds: ['XXXX'], // USB Vendor ID
    vendorNames: ['Your Vendor'],
    commandDelay: 100,
    dataFormat: 'ascii',
    notes: 'Important notes about this board'
  }
};
```

Then restart the application.

---

## Baud Rate Configuration

### Arduino Uno
- **ALWAYS use 9600 baud**
- Processor is too slow for faster rates
- More stable and reliable

### Arduino Mega
- Supports 115200 (recommended) or 9600
- Can handle faster communication
- Better for complex jobs

### MKS DLC32
- Default 115200
- Can fall back to 9600 if needed
- Highest performance option

### Generic GRBL
- Try 115200 first
- Fall back to 9600 if unstable
- Check your firmware documentation

---

## Troubleshooting

### Board Won't Connect
1. **Check baud rate**: Arduino Uno MUST be 9600
2. **Check USB cable**: Try different port
3. **Check drivers**: Install CH340 or CP210X
4. **Check firmware**: Board must have GRBL firmware
5. **Try generic GRBL**: If board is unknown

### Engraving Corrupted/Stops
1. **Lower baud rate**: Use 9600 for stability
2. **Check cable**: Replace if damaged
3. **Reduce complexity**: Simplify G-code job
4. **Update drivers**: Get latest versions

### Speed Fluctuates
1. **Slower boards need slower jobs**: Arduino Uno is limited
2. **Check power supply**: Must be stable
3. **Check for EMI**: Move away from interference
4. **Reduce engraving speed**: Use lower power/speed settings

---

## Technical Details

### How It Works

1. **Startup**: App loads hardware profiles from HardwareConfig.js
2. **User Selection**: User picks board via UI modal
3. **IPC Call**: Frontend sends selection to main process
4. **Main Process**: Updates `currentHardwareProfile` and `currentBaudRate`
5. **Connection**: Uses new baud rate when opening serial port
6. **Communication**: All subsequent commands use selected hardware settings

### Serial Port Handling

```javascript
// Before (hardcoded):
const port = new SerialPort({ 
  path: portPath, 
  baudRate: 115200  // Fixed
});

// After (configurable):
const port = new SerialPort({ 
  path: portPath, 
  baudRate: currentBaudRate  // Dynamic based on hardware
});
```

### Command Delay

Different boards have different processing speeds:
- **Arduino Uno**: 100ms delay (slower processor)
- **Arduino Mega**: 50ms delay (better processor)
- **MKS DLC32**: 50ms delay (fastest)

This is stored but not yet implemented in `sendNextLine()`. You can implement it as:

```javascript
const delay = hardwareProfiles[selectedHardware].commandDelay;
await new Promise(r => setTimeout(r, delay));
```

---

## Next Steps (Optional Enhancements)

1. **Speed Limiting**: Automatically limit engraving speed based on board
2. **File Splitting**: Auto-split large jobs for Uno (2KB limit)
3. **Real-time Monitoring**: Show actual baud rate in status
4. **Firmware Detection**: Auto-detect board type from response
5. **Preset Profiles**: Save hardware+speed combinations as presets
6. **Compatibility Check**: Warn if selected config may be unstable

---

## Documentation Files

- **HARDWARE_COMPATIBILITY.md** - User guide with installation instructions
- **HardwareConfig.js** - Source of truth for hardware specs
- This file - Implementation technical details

---

## Code Quality Notes

- ✅ Backward compatible (defaults to ESP32 if not set)
- ✅ Extensible (easy to add new boards)
- ✅ Type-safe object structure
- ✅ User-friendly modal UI
- ✅ Error handling on all IPC calls
- ⚠️ Command delays defined but not yet implemented (for future)
- ⚠️ WiFi detection only works for MKS DLC32 (by design)

---

## Testing Checklist

- [ ] Connect Arduino Uno with 9600 baud - should work
- [ ] Connect Arduino Mega with 115200 baud - should work
- [ ] Connect MKS DLC32 with 115200 baud - should work
- [ ] Switch hardware without restart - should work
- [ ] Invalid baud rate for board - should show error
- [ ] Disconnect and reconnect - should maintain settings
- [ ] Run engraving job on each board - should complete

---

## Support & Questions

If you need to:
- Add another hardware board → Edit HardwareConfig.js
- Change default baud rate → Edit HARDWARE_PROFILES
- Adjust command delays → Modify commandDelay values
- Add new features → Extend IPC handlers in main.js

All changes are backward compatible with the ESP32 system.
