# LaserPix

LaserPix is a cross-platform laser controller app built with React and Electron, with support for USB serial and WiFi/TCP connections to embedded laser hardware.

This repository contains the source, desktop packaging setup, and Android/Capacitor support for a hybrid LaserPix application.

## What this app does
- Scans and connects to laser controllers over USB serial
- Supports ESP32, Arduino Uno, Arduino Mega, and generic GRBL hardware profiles
- Provides fallback WiFi/TCP connectivity for network-enabled laser modules
- Packages as a native Windows desktop app using Electron
- Includes mobile/PWA compatibility through Capacitor and WebSocket support

## Tech stack
- JavaScript, HTML, CSS, JSX
- React 19 + Create React App
- Electron 39 for desktop app shell
- serialport for USB device communication
- Node `net` module for TCP/WiFi sockets
- Capacitor Android for mobile/PWA support
- electron-builder for Windows installer packaging
- React Testing Library for UI testing

## Setup
1. Install dependencies:
   ```powershell
   npm install
   ```

2. Start development mode:
   ```powershell
   npm run electron:dev
   ```

   This starts the React dev server and opens Electron together.
   - The terminal must remain open while you develop in this mode.
   - This is normal for development.

## How dev mode works
- `npm run electron:dev` runs two processes:
  1. React development server (`npm start`)
  2. Electron desktop app that loads `http://localhost:3000`
- The app will not work if the dev server is not running or if the terminal is closed.
- That is why `electron:dev` is only for development and debugging.

## Run the actual app without the dev server
To run LaserPix like a real installed program, build and package it:

1. Build the React app:
   ```powershell
   npm run build
   ```

2. Package the desktop app:
   ```powershell
   npm run electron:pack
   ```

3. Install the generated Windows package from `dist/`.

After installation, LaserPix runs without needing a terminal or dev server.

## Important commands
- `npm install` — install dependencies
- `npm run electron:dev` — development mode with live reload
- `npm run build` — create production React build
- `npm run electron:pack` — package the app for Windows
- `npm test` — run UI tests

## Notes for users
- If you are running from source, always use `npm run electron:dev` during development.
- If you want a standalone program, use `npm run electron:pack` and install the app.
- Do not try to open `main.js` directly. Electron needs the built files or the dev server to work correctly.

## Repository layout
- `src/` — React app source
- `public/` — static frontend assets
- `main.js` — Electron main process
- `preload.js` — secure Electron renderer bridge
- `android/` — Capacitor Android project files
- `package.json` — project scripts and dependencies

## Support
If the app does not start, check these first:
- `npm install` has completed successfully
- You ran `npm run electron:dev` for development
- You ran `npm run build` and `npm run electron:pack` for a production build
- `dist/` exists only after packaging
