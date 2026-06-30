# Quick Start: Arduino Uno Support

## For Arduino Uno Users

### Step 1: Flash GRBL Firmware
```bash
# Clone GRBL repository
git clone https://github.com/grbl/grbl.git

# Open Arduino IDE
# File → Open → grbl/grblupload.ino
# Tools → Board → Arduino Uno
# Tools → Port → COM# (your Arduino)
# Click Upload
```

### Step 2: Install USB Driver
Download and install the CH340 driver:
- Windows: https://www.wch.cn/downloads/ch340_windows_zip.html
- Mac: https://www.wch.cn/downloads/ch340_mac_zip.html
- Linux: Usually built-in

### Step 3: Configure LaserPix

1. **Open LaserPix application**
2. **Click ⚙️ Hardware button** (top-left)
3. **Select "Arduino Uno"**
4. **Select baud rate: 9600** (IMPORTANT!)
5. **Click CLOSE**
6. **Connect Arduino via USB**
7. Status should show "ON" (green dot)

### Step 4: Start Engraving
Once connected:
1. Capture or upload an image
2. Adjust settings (Power, Speed, etc.)
3. Position your wood
4. Click START
5. Engraving begins!

---

## Important Notes for Arduino Uno

⚠️ **CRITICAL: Always use 9600 baud rate**
- Uno's processor can't handle faster speeds reliably
- Using 115200 may cause random disconnections
- If you see errors, drop to 9600

✅ **Best Practices:**
- Start with lower power (20-30%) and test
- Use simple designs first
- Keep engraving speed under 2000 mm/min
- Split large files into smaller jobs
- Check serial connection is stable

⚠️ **Limitations:**
- Slower than ESP32 systems
- Limited memory for complex jobs
- USB-only (no WiFi)
- Less reliable at high speeds

---

## For Arduino Mega Users

### Step 1: Flash GRBL
```bash
git clone https://github.com/grbl/grbl.git
# Open grblupload.ino in Arduino IDE
# Tools → Board → Arduino Mega 2560
# Upload
```

### Step 2: No driver needed (native USB)

### Step 3: Configure LaserPix
1. Click ⚙️ Hardware
2. Select "Arduino Mega 2560"
3. Select baud rate: **115200**
4. Click CLOSE
5. Connect via USB

### Step 4: Ready!
Arduino Mega has better performance than Uno:
- ✅ Faster engraving (1500-2000 mm/min)
- ✅ More memory (larger files)
- ✅ More stable (better for complex designs)
- ✅ Still USB-only (no WiFi)

---

## Troubleshooting

### Arduino Uno Won't Connect

**Problem: "No machine connected"**
```
1. Check ⚙️ Hardware is set to "Arduino Uno"
2. Check baud rate is "9600" (NOT 115200!)
3. Verify GRBL firmware is flashed
4. Try different USB cable
5. Try different USB port on computer
6. Reinstall CH340 driver
```

**Problem: Starts engraving but stops randomly**
```
1. Use 9600 baud (slower is more stable)
2. Reduce Power to 20-30%
3. Reduce Speed to 1000-1500 mm/min
4. Use shorter G-code files
5. Add delays in GRBL firmware
```

**Problem: Corrupted engraving patterns**
```
1. Definitely use 9600 baud
2. Check USB cable for damage
3. Move away from WiFi routers
4. Try simpler images (fewer details)
5. Increase command delay
```

### Arduino Mega Issues

Most issues are similar to Uno but Mega is more forgiving.

**Prefer 115200 baud:**
- More stable than Uno
- Better for complex jobs
- Faster engraving

**If unstable at 115200:**
- Drop to 9600 (more stable)
- Check firmware compatibility
- Update Arduino bootloader

---

## Switching Between Boards

You can switch hardware anytime:

1. **Disconnect current board**
2. **Click ⚙️ Hardware**
3. **Select new board**
4. **Set correct baud rate:**
   - Uno/Generic → 9600
   - Mega/ESP32 → 115200
5. **Click CLOSE**
6. **Connect new board**

No application restart needed! Settings are saved automatically.

---

## Power & Speed Settings by Board

### Arduino Uno (Conservative)
- **Power:** 20-40%
- **Speed:** 500-1500 mm/min
- **Res:** 2-4 lines/mm
- **Best for:** Simple designs, testing

### Arduino Mega (Moderate)
- **Power:** 30-60%
- **Speed:** 1000-2500 mm/min
- **Res:** 4 lines/mm
- **Best for:** Hobby projects

### MKS DLC32/ESP32 (High Performance)
- **Power:** 40-80%
- **Speed:** 2000-5000 mm/min
- **Res:** 4-10 lines/mm
- **Best for:** Professional work

---

## Performance Comparison

| Feature | Arduino Uno | Arduino Mega | ESP32 |
|---------|------------|-------------|-------|
| **Baud Rate** | 9600 | 115200 | 115200 |
| **Max Speed** | 1000 mm/min | 2000 mm/min | 3000+ mm/min |
| **Memory** | 2KB | 8KB | 520KB |
| **Stability** | Good (9600) | Excellent | Excellent |
| **Cost** | $$ | $$$ | $$$$ |
| **WiFi** | ❌ | ❌ | ✅ |
| **Best Use** | Learning | DIY | Pro |

---

## Technical Specs Reference

### Arduino Uno
```
Processor: ATmega328P (8-bit)
Clock Speed: 16 MHz
RAM: 2 KB
Flash: 32 KB
Serial: Hardware UART @ 9600 baud
Recommended: GRBL 1.1f
```

### Arduino Mega
```
Processor: ATmega2560 (8-bit)
Clock Speed: 16 MHz
RAM: 8 KB
Flash: 256 KB
Serial: Hardware UART @ 9600-115200
Recommended: GRBL 1.1f or later
```

### MKS DLC32
```
Processor: ESP32 (32-bit dual-core)
Clock Speed: 240 MHz
RAM: 520 KB
Flash: 4 MB
Serial: USB-C @ 115200
WiFi: 802.11 b/g/n
```

---

## Getting Help

1. **Read HARDWARE_COMPATIBILITY.md** for detailed guides
2. **Check troubleshooting section** above
3. **Verify board is properly flashed** with GRBL
4. **Try with simple G-code** to isolate issues
5. **Test different USB ports** and cables
6. **Update all drivers** (CH340, Arduino)

---

## Links & Resources

- **GRBL Wiki:** https://github.com/grbl/grbl/wiki
- **Arduino Docs:** https://www.arduino.cc/en/Guide
- **Arduino Uno Pinout:** https://store.arduino.cc/products/arduino-uno-rev3
- **Arduino Mega Pinout:** https://store.arduino.cc/products/arduino-mega-2560-rev3
- **CH340 Driver:** https://www.wch.cn/downloads/ch340_windows_zip.html
- **LaserPix GitHub:** (your repository link)

---

## Summary

✅ **You now have:**
- Arduino Uno support (9600 baud)
- Arduino Mega support (115200 baud)
- Easy hardware switching
- Baud rate configuration
- Per-board optimization

🎉 **Enjoy your Arduino-based laser engraving!**
