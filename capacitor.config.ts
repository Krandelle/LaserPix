import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.laserpix.app',
  appName: 'LaserPix',
  webDir: 'build',
  server: {
    androidScheme: 'http',     // <--- CRITICAL: Forces HTTP (allows ws:// connections)
    cleartext: true,           // <--- CRITICAL: Allows local IP connections
    allowNavigation: ['*']     // <--- Allows navigating to local IPs
  }
};

export default config;