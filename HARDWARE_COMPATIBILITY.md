# Hardware Compatibility Guide

## Overview
LaserPix now supports multiple laser controller boards with configurable baud rates and hardware profiles. You can easily switch between different microcontroller boards without code changes.

---

## Supported Hardware

### 1. **MKS DLC32 (ESP32)** - Default
**Specifications:**
- Default Baud Rate: **115200 bps**
- Alternative Baud Rates: 9600
- Connection Type: USB Serial, WiFi
- Features: High performance, WiFi support
- Command Delay: 50ms

**When to Use:**
- High-speed engraving required
- WiFi connectivity needed
- Premium laser systems

**Installation:**
```
CH340 or CP210X driver required
Download from: ch340.com or silabs.com
```

---

### 2. **Arduino Uno**
**Specifications:**
- Default Baud Rate: **9600 bps**
- Alternative Baud Rates: 19200, 115200 (may be unstable)
- Connection Type: USB Serial only
- Features: Entry-level, limited memory
- Command Delay: 100ms (slower processor)

**When to Use:**
- Learning/hobby projects
- Budget-conscious builds
- Simple engraving jobs
- Testing with GRBL firmware

**Key Considerations:**
- Memory limited (2KB RAM) - keep G-code jobs small
- Slower processing - use lower engraving speeds
- More stable at 9600 baud
- Requires CH340 or CP2102 UART adapter

**Installation:**
```
1. Arduino IDE from arduino.cc
2. GRBL firmware: github.com/grbl/grbl
3. USB-to-Serial adapter (CH340/CP2102)
```

---

### 3. **Arduino Mega 2560**
**Specifications:**
- Default Baud Rate: **115200 bps**
- Alternative Baud Rates: 9600, 19200
- Connection Type: USB Serial only
- Features: More memory, faster processing
- Command Delay: 50ms

**When to Use:**
- Complex/large G-code files
- Mid-range laser systems
- Better than Uno for reliability
- Standard DIY laser builds

**Key Considerations:**
- Much more memory (8KB RAM) than Uno
- Can handle complex patterns
- More reliable at higher baud rates
- Still no WiFi support

**Installation:**
```
1. Arduino IDE from arduino.cc
2. GRBL firmware: github.com/grbl/grbl
3. No adapter needed (native USB)
```

---

### 4. **Generic GRBL Controller**
**Specifications:**
- Default Baud Rate: **115200 bps**
- Alternative Baud Rates: 9600, 19200, 38400, 57600, 115200
- Connection Type: USB Serial only
- Features: Flexible, works with any GRBL-compatible board

**When to Use:**
- Custom boards not listed above
- Any GRBL-compatible microcontroller
- Fallback option for unknown boards

---

## How to Configure Hardware

### Step 1: Access Hardware Settings
1. Launch LaserPix application
2. Click the **⚙️ Hardware** button (top-left corner)
3. The Hardware Configuration dialog opens

### Step 2: Select Your Board
Choose your microcontroller board from the list:
- **MKS DLC32 (ESP32)** - Default
- **Arduino Uno** - Budget option
- **Arduino Mega 2560** - Best compatibility
- **Generic GRBL Controller** - Custom boards

### Step 3: Select Baud Rate
Choose the appropriate baud rate for your board:
```
Arduino Uno:       9600 (RECOMMENDED)
Arduino Mega:      115200 (RECOMMENDED)
MKS DLC32:         115200 (RECOMMENDED)
Generic GRBL:      9600-115200 (Choose based on your board)
```

### Step 4: Connect Machine
After selecting hardware:
1. Close the Hardware Settings dialog
2. Connect your laser controller via USB
3. The machine will detect using the configured baud rate
4. Status indicator will show "ON" when connected

---

## Baud Rate Selection Guide

### What is Baud Rate?
Baud rate is the speed of serial communication (bits per second).

### How to Choose

| Board | Recommended | Stable Range | Notes |
|-------|------------|--------------|-------|
| **Arduino Uno** | 9600 | 9600 | Limited processor speed, use 9600 only |
| **Arduino Mega** | 115200 | 9600-115200 | Can handle higher speeds |
| **MKS DLC32** | 115200 | 9600, 115200 | Jump between speeds, no in-between |
| **Generic GRBL** | 115200 | 9600-115200 | Check your firmware documentation |

### Troubleshooting Baud Rate Issues

**If connection keeps disconnecting:**
```
1. Try lower baud rate (start at 9600)
2. Check USB cable quality
3. Try different USB port
4. Reduce job complexity
```

**If engraving is corrupted or stops:**
```
1. Reduce baud rate
2. Increase command delay (in firmware)
3. Check for serial cable interference
4. Update drivers
```

---

## Installation Instructions by Board

### Arduino Uno with GRBL

**1. Install Arduino IDE**
```
Visit: arduino.cc
Download for your OS
Install following on-screen instructions
```

**2. Load GRBL Firmware**
```
git clone https://github.com/grbl/grbl.git
1. Open Arduino IDE
2. File → Open → grbl/grblupload.ino
3. Select Tools → Board → Arduino Uno
4. Select Tools → Port → COM# (your board)
5. Click Upload
6. Wait for success message
```

**3. Connect to LaserPix**
```
1. Open LaserPix
2. Click ⚙️ Hardware
3. Select "Arduino Uno"
4. Set baud rate to "9600"
5. Click CLOSE
6. Connect via USB - ready to use
```

---

### Arduino Mega 2560 with GRBL

**1. Install Arduino IDE** (same as Uno)

**2. Load GRBL Firmware**
```
git clone https://github.com/grbl/grbl.git
1. Open Arduino IDE
2. File → Open → grbl/grblupload.ino
3. Select Tools → Board → Arduino Mega 2560
4. Select Tools → Port → COM# (your board)
5. Click Upload
```

**3. Connect to LaserPix**
```
1. Open LaserPix
2. Click ⚙️ Hardware
3. Select "Arduino Mega 2560"
4. Set baud rate to "115200"
5. Click CLOSE
6. Connect via USB
```

---

### MKS DLC32 (ESP32)

**1. Install ESP32 Drivers**
```
Download CH340/CP210X driver from manufacturer site
Install drivers for your OS
```

**2. Flash Firmware**
```
Use ESPHome or Arduino IDE with ESP32 support
- Add ESP32 board manager URL to Arduino
- Select MKS DLC32 board
- Flash GRBL firmware for ESP32
```

**3. Connect to LaserPix**
```
1. Open LaserPix
2. Click ⚙️ Hardware
3. Select "MKS DLC32 (ESP32)"
4. Set baud rate to "115200"
5. Can also connect via WiFi (192.168.4.1)
```

---

## Troubleshooting

### Connection Issues

**"No machine connected" message:**
```
1. Check USB cable is properly connected
2. Verify correct board selected in Hardware Settings
3. Check correct baud rate selected
4. Install/update USB drivers (CH340, CP210X, Arduino)
5. Try different USB port
```

**Device shows in Device Manager but won't connect:**
```
1. Right-click device → Update driver
2. Search for updated driver online
3. Reinstall Arduino drivers from arduino.cc
4. Restart application
```

**Engraving starts but stops mid-job:**
```
1. Reduce baud rate (try 57600 or 38400)
2. Check USB cable for damage
3. Reduce speed and power settings
4. Split large files into smaller jobs
```

### Baud Rate Problems

**"Command delay issues" - erratic laser movement:**
```
Solution:
1. Reduce baud rate to 9600
2. Increase command delay in firmware
3. Check for electromagnetic interference (EMI)
4. Use shielded USB cable
```

**"Serial buffer overflow" - corrupted output:**
```
Solution:
1. Use lower baud rate
2. Reduce job complexity
3. Use smaller image files
4. Check GRBL buffer settings
```

---

## Hardware-Specific Tips

### Arduino Uno
- ⚠️ **NEVER** use baud rates above 9600
- Keep G-code files under 2KB
- Use simple patterns (avoid complex details)
- Test with small jobs first
- More reliable for proof-of-concept

### Arduino Mega
- ✅ Better reliability than Uno
- Can handle larger files
- Use 115200 for best performance
- Good for hobby and semi-professional use
- Recommended for most DIY projects

### MKS DLC32 (ESP32)
- ✅ Highest performance option
- Supports WiFi connectivity
- Can handle complex engraving
- Professional-grade capability
- Ideal for commercial use

---

## G-Code Compatibility

All supported boards use **GRBL firmware** which supports standard G-code:

**Common Commands:**
```
G0 X Y     - Rapid movement (no engraving)
G1 X Y S   - Linear movement with power S (0-255)
M5         - Laser off
M4 S#      - Laser on with power level
G28        - Home position
G92 X0 Y0  - Set position (calibration)
```

---

## Performance Expectations

| Board | Max Speed | Resolution | Complexity | Use Case |
|-------|-----------|-----------|-----------|----------|
| Arduino Uno | Slow (500mm/min) | 4 lines/mm | Simple | Testing, hobbyist |
| Arduino Mega | Medium (1500mm/min) | 4 lines/mm | Moderate | DIY projects |
| MKS DLC32 | Fast (3000mm/min) | 4-10 lines/mm | Complex | Professional |

---

## Updating Hardware Configuration

You can change hardware configuration at any time, but:

1. **Close current application** if mid-job
2. **Physically change hardware** if switching boards
3. **Update drivers** if needed
4. **Relaunch LaserPix**
5. **Open Hardware Settings** and select new board
6. **Set appropriate baud rate**
7. **Reconnect and test**

---

## Additional Resources

- **GRBL Documentation:** https://github.com/grbl/grbl/wiki
- **Arduino Docs:** https://www.arduino.cc/en/Guide
- **MKS DLC32:** https://github.com/makerbase-mks/MKS-DLC32
- **CH340 Driver:** https://www.wch.cn/downloads/ch340_windows_zip.html
- **CP210X Driver:** https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Verify board is properly flashed with GRBL
3. Try with different baud rate
4. Check USB drivers are installed
5. Test with smaller simpler G-code files
