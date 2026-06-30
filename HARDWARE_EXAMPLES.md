# Hardware Configuration Examples

## Example 1: Setting Up Arduino Uno

### Scenario
You have an Arduino Uno with GRBL firmware and want to use it with LaserPix.

### Steps

**Step 1: Verify GRBL Firmware**
```bash
# Check if Arduino Uno has GRBL flashed
# Launch Arduino IDE
# Open Serial Monitor
# Should see GRBL version message
```

**Step 2: Install USB Driver**
```
Most Arduino Uno clones use CH340 chip
Download: https://www.wch.cn/downloads/ch340_windows_zip.html
Install following manufacturer instructions
Verify in Device Manager → COM port shows up
```

**Step 3: Configure LaserPix**
```
1. Launch LaserPix application
2. See ⚙️ Hardware button in top-left corner
3. Click it
4. Select "Arduino Uno"
5. Verify baud rate shows "9600"
   ↳ If showing 115200, click "9600" button to change
6. See status: "Current Configuration: Arduino Uno"
7. Click CLOSE button
```

**Step 4: Connect Hardware**
```
1. Plug Arduino Uno into USB port
2. Status indicator changes to "ON" (green)
3. Engraving is ready!
```

### Code Configuration (Behind the Scenes)

In `main.js`:
```javascript
currentHardwareProfile = 'arduino_uno';
currentBaudRate = 9600;

// When opening serial port:
const port = new SerialPort({
  path: '/dev/ttyUSB0', // Linux example
  baudRate: 9600        // Correct for Arduino Uno
});
```

---

## Example 2: Switching from ESP32 to Arduino Mega

### Scenario
You previously used MKS DLC32 (ESP32), now switching to Arduino Mega 2560.

### Steps

**Step 1: Prepare Arduino Mega**
```bash
# Flash GRBL firmware to Arduino Mega
# Same as Uno but select "Arduino Mega 2560" in Arduino IDE
# Ensure it's connected and working
```

**Step 2: Change Hardware Settings**
```
1. Click ⚙️ Hardware button
2. Current shows "MKS DLC32 (ESP32)"
3. Click on "Arduino Mega 2560"
4. Baud rate automatically changes to "115200"
5. Click CLOSE
```

**Step 3: Disconnect/Reconnect**
```
1. Unplug MKS DLC32
2. Wait 2 seconds
3. Plug in Arduino Mega
4. Status shows "ON" (green)
5. Ready to engrave!
```

### What Happens Internally

```javascript
// User selects Arduino Mega
handleHardwareChange('arduino_mega')

// Updates state
currentHardwareProfile = 'arduino_mega'
currentBaudRate = 115200

// Next connection uses new settings:
const port = new SerialPort({
  path: 'COM3',        // Different board, different port
  baudRate: 115200     // Mega uses faster speed
});
```

---

## Example 3: Adding Custom GRBL Board

### Scenario
You have a custom GRBL-compatible board that's not in the list.

### Configuration Option A: Use Generic GRBL (Recommended)

**In LaserPix UI:**
```
1. Click ⚙️ Hardware button
2. Scroll to "Generic GRBL Controller"
3. Click it
4. Choose appropriate baud rate:
   - Try 115200 first
   - Fall back to 9600 if unstable
5. Click CLOSE
```

**Testing:**
```
1. Connect your board
2. If status shows "ON" → success!
3. If disconnects → try 9600 baud rate
4. If still fails → board may not have GRBL
```

### Configuration Option B: Add Custom Profile (For Developers)

**Edit src/HardwareConfig.js:**
```javascript
const HARDWARE_PROFILES = {
  // ... existing profiles ...
  
  my_custom_board: {
    name: 'My Custom Board',
    description: 'My awesome custom GRBL board',
    baudRate: 115200,
    defaultBaudRates: [9600, 115200],
    protocol: 'grbl',
    features: {
      supportsWiFi: false,
      supportsUSB: true,
      maxSpeed: 2000,
      minSpeed: 50,
    },
    vendorIds: ['XXXX'], // Your board's USB Vendor ID
    vendorNames: ['My Vendor'],
    commandDelay: 50,
    dataFormat: 'ascii',
    notes: 'My custom board notes'
  }
};
```

**Restart LaserPix:**
```
1. Save HardwareConfig.js
2. Restart the application
3. Your board appears in the list!
```

---

## Example 4: Troubleshooting Connection Issues

### Scenario
Arduino Uno won't connect, keeps showing "No machine connected"

### Diagnostic Steps

**Step 1: Verify Hardware Selection**
```
1. Click ⚙️ Hardware
2. Check "Arduino Uno" is selected
3. Status should show: "Hardware: Arduino Uno"
4. If different, click "Arduino Uno"
```

**Step 2: Verify Baud Rate**
```
1. In Hardware Settings modal
2. Look for baud rate buttons
3. Should show "9600" selected
4. DO NOT USE 115200 FOR ARDUINO UNO!
```

**Step 3: Test Physical Connection**
```bash
# Windows
# Open Device Manager
# Look for "Arduino" or "COM" port
# Should not have yellow warning icon

# If not present:
# 1. Check USB cable
# 2. Try different USB port
# 3. Reinstall CH340 driver
```

**Step 4: Verify GRBL Firmware**
```bash
# Open Arduino IDE Serial Monitor
# Set baud rate to 9600
# Press Enter
# Should see GRBL version message like:
# Grbl 1.1f ['$' for help]

# If no response:
# 1. Re-flash GRBL firmware
# 2. Check board selection in Arduino IDE
# 3. Try different USB port
```

**Step 5: Test with Simple G-code**
```
1. Upload image to LaserPix
2. Use LOWEST power (10%)
3. Use LOWEST speed (500 mm/min)
4. Run on test material (cheap wood)
5. If works → your setup is good
6. If fails → check connections again
```

### Resolution Checklist
```
☐ Hardware set to "Arduino Uno"
☐ Baud rate set to "9600"
☐ GRBL firmware flashed to board
☐ USB driver installed (CH340)
☐ Device appears in Device Manager
☐ USB cable works (test on another device)
☐ Arduino IDE can communicate with board
☐ Status shows green "ON" indicator
☐ Engraving starts successfully
```

---

## Example 5: Performance Tuning by Hardware

### Arduino Uno Settings (Conservative)
```javascript
settings = {
  power: 25,         // Start LOW for Uno
  speed: 1000,       // Slower than others
  linesPerMm: 4,
  // ... other settings
};

// In hardware config (src/HardwareConfig.js):
arduino_uno: {
  commandDelay: 100,  // Extra delay for slow processor
  // ...
}
```

**Why these settings?**
- Uno processor (16MHz) can't handle fast commands
- 100ms delay gives processor time to execute
- Low power prevents servo overload
- Slow speed ensures reliable positioning

### Arduino Mega Settings (Moderate)
```javascript
settings = {
  power: 40,         // More headroom than Uno
  speed: 1500,       // Faster but still safe
  linesPerMm: 4,
};

// Hardware config:
arduino_mega: {
  commandDelay: 50,   // Mega is faster
  // ...
}
```

**Why these settings?**
- Mega has 4x the memory of Uno
- Faster processor (still 16MHz but more efficient)
- Can handle more complex jobs
- 50ms delay sufficient

### MKS DLC32 Settings (High Performance)
```javascript
settings = {
  power: 60,         // Full power capability
  speed: 3000,       // Fast engraving
  linesPerMm: 8,     // Higher resolution
};

// Hardware config:
esp32: {
  commandDelay: 50,
  // ...
}
```

**Why these settings?**
- ESP32 is 32-bit dual-core at 240MHz
- Massive RAM and flash memory
- Can handle complex patterns
- WiFi + USB support
- Professional-grade performance

---

## Example 6: Multi-User Setup

### Scenario
Shop with multiple laser machines, different hardware

### User 1: Arduino Uno at Station 1
```
1. Launch LaserPix at Station 1
2. Click ⚙️ Hardware
3. Select "Arduino Uno"
4. Set baud: "9600"
5. Close - remember the settings
6. Next time it opens with Uno settings
```

### User 2: Arduino Mega at Station 2
```
1. Launch LaserPix at Station 2
2. Click ⚙️ Hardware
3. Select "Arduino Mega 2560"
4. Set baud: "115200"
5. Close - different settings than Station 1
```

### User 3: Professional ESP32 System
```
1. Launch LaserPix at Station 3
2. Click ⚙️ Hardware
3. Select "MKS DLC32 (ESP32)"
4. Set baud: "115200"
5. Can also use WiFi connectivity
```

**Result:**
```
Each station maintains its own hardware config
Users don't need to reconfigure each time
Switch between stations → just select correct hardware
No conflicts or compatibility issues
```

---

## Example 7: Automated Hardware Detection (Future)

### Possible Future Implementation

```javascript
// Auto-detect would look like:
async function autoDetectHardware() {
  const ports = await SerialPort.list();
  
  ports.forEach(port => {
    // Arduino Uno detection
    if (port.vendorId === '2341' && port.productId === '0043') {
      selectHardware('arduino_uno');
      setBaudRate(9600);
    }
    
    // Arduino Mega detection
    if (port.vendorId === '2341' && port.productId === '0042') {
      selectHardware('arduino_mega');
      setBaudRate(115200);
    }
    
    // MKS DLC32 detection
    if (port.vendorId === '1A86') {
      selectHardware('esp32');
      setBaudRate(115200);
    }
  });
}

// Usage:
// await autoDetectHardware();
// Status shows: "Detected: Arduino Mega 2560"
```

---

## Example 8: Error Handling

### Scenario
User selects invalid configuration

### Invalid: Arduino Uno + 115200 Baud

**Current Behavior:**
```javascript
handleHardwareChange('arduino_uno');
// Automatically sets baudRate to 9600 (safe default)
// Shows toast: "Hardware set to: arduino_uno"
```

**Result:**
- User can't accidentally choose unstable config
- 9600 is forced for Arduino Uno
- Other rates not available in dropdown

### Invalid: Generic GRBL + Unbaudable Rate

**Current Behavior:**
```javascript
handleBaudRateChange(230400);  // Not in list
// Function validates:
if (!profile.defaultBaudRates.includes(baudRate)) {
  showToast('Error: Invalid baud rate for Generic GRBL');
  return false;
}
```

**Result:**
- Can only select valid rates
- Dropdown shows only valid options
- No way to select invalid config

---

## Example 9: Pre-Configured Team Setup

### For a School/Lab with Multiple Systems

**Create a setup guide document:**
```
STATION 1: Arduino Uno Laser
- Hardware: Arduino Uno
- Baud Rate: 9600
- Power Limit: 30%
- Speed Limit: 1000 mm/min
- Operator: [Name]
- Contact: [Extension]

STATION 2: Arduino Mega Laser
- Hardware: Arduino Mega 2560
- Baud Rate: 115200
- Power Limit: 50%
- Speed Limit: 2000 mm/min
- Operator: [Name]
- Contact: [Extension]

STATION 3: Professional Laser
- Hardware: MKS DLC32 (ESP32)
- Baud Rate: 115200
- Power Limit: 80%
- Speed Limit: 3000 mm/min
- WiFi: Enabled (192.168.4.1)
- Operator: [Name]
- Contact: [Extension]
```

**Training checklist:**
```
☐ Show how to click ⚙️ Hardware
☐ Demonstrate board selection
☐ Show how to verify baud rate
☐ Explain why Uno needs 9600
☐ Practice switching boards
☐ Test engraving on each station
☐ Show troubleshooting steps
```

---

## Quick Reference

### Arduino Uno
```
Board:       Arduino Uno
Baud:        9600 (ONLY)
Driver:      CH340
Max Speed:   1000 mm/min
Cost:        Low ($)
Best For:    Learning, testing
```

### Arduino Mega
```
Board:       Arduino Mega 2560
Baud:        115200 (or 9600)
Driver:      Native USB
Max Speed:   2000 mm/min
Cost:        Medium ($$)
Best For:    DIY, hobby projects
```

### MKS DLC32
```
Board:       MKS DLC32 (ESP32)
Baud:        115200
Driver:      CH340
Max Speed:   3000+ mm/min
WiFi:        Yes
Cost:        High ($$$)
Best For:    Professional use
```

---

This document provides practical examples of every common scenario. Refer back when setting up new hardware or troubleshooting issues!
