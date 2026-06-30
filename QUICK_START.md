# 🚀 LaserPix EXE - Quick Start

## 📥 Installation
1. Run: `LaserPix Setup 1.0.0.exe` (from `dist/` folder)
2. Click through installer
3. Launch from Desktop shortcut or Start Menu

---

## 🔌 First Connection
1. **Connect Device**: USB cable to computer OR WiFi network
2. **Open LaserPix**
3. **Hardware Setup**:
   - Select your controller (ESP32, Arduino, etc.)
   - Set baud rate (usually 115200)
4. **Click Connect**
   - USB devices auto-detect COM ports
   - WiFi uses 192.168.4.1:8080

---

## 📸 Engraving Workflow
1. **Camera Tab**: Capture or upload image
2. **Edit Tab**: Adjust size, power, speed
3. **Preview Tab**: See engraving path
4. **Engrave Tab**: Start engraving

---

## ⚙️ Hardware Profiles
- **ESP32 (MKS DLC32)** ← Default, most common
- **Arduino Uno** - Slower communication
- **Arduino Mega 2560** - Faster
- **Generic GRBL** - Universal laser controllers

---

## 🆘 Common Fixes
| Problem | Fix |
|---------|-----|
| Blank screen | Wait 10 seconds, it's loading |
| Cannot find device | Check USB cable, power on device |
| Wrong COM port | Open Device Manager, find your device |
| WiFi not connecting | Make sure device is in WiFi mode |

---

## 📂 File Location
**Installer:** `dist/LaserPix Setup 1.0.0.exe`
**Installation:** `C:\Program Files (x86)\LaserPix\` (default)

---

## 🎯 Support
- Check `EXE_BUILD_GUIDE.md` for detailed troubleshooting
- Use F12 in-app to open Developer Console for errors
- Check Windows Event Viewer for crash logs
