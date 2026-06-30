/**
 * HardwareConfig.js - Unified Hardware Configuration System
 * Supports multiple laser controller boards with different specs
 */

export const HARDWARE_PROFILES = {
  esp32: {
    name: 'MKS DLC32 (ESP32)',
    description: 'ESP32-based laser controller',
    baudRate: 115200,
    defaultBaudRates: [115200, 9600],
    protocol: 'grbl', // GRBL-compatible
    features: {
      supportsWiFi: true,
      supportsUSB: true,
      maxSpeed: 3000,
      minSpeed: 100,
    },
    vendorIds: ['1A86', '10C4'], // CH340, CP210X
    vendorNames: ['CH340', 'CP210X'],
    commandDelay: 50, // ms between commands
    dataFormat: 'ascii',
    notes: 'High performance with WiFi support'
  },
  
  arduino_uno: {
    name: 'Arduino Uno',
    description: 'Arduino Uno with CNC/Laser Shield',
    baudRate: 9600,
    defaultBaudRates: [9600, 19200, 115200],
    protocol: 'grbl', // GRBL-compatible
    features: {
      supportsWiFi: false,
      supportsUSB: true,
      maxSpeed: 1000,
      minSpeed: 50,
    },
    vendorIds: ['2341', '1A86'], // Arduino, CH340
    vendorNames: ['Arduino', 'CH340'],
    commandDelay: 100, // Slower processor requires more delay
    dataFormat: 'ascii',
    notes: 'Entry-level board, limited memory. USB only.'
  },
  
  arduino_mega: {
    name: 'Arduino Mega 2560',
    description: 'Arduino Mega with CNC/Laser Shield',
    baudRate: 115200,
    defaultBaudRates: [9600, 19200, 115200],
    protocol: 'grbl',
    features: {
      supportsWiFi: false,
      supportsUSB: true,
      maxSpeed: 2000,
      minSpeed: 50,
    },
    vendorIds: ['2341', '1A86'],
    vendorNames: ['Arduino', 'CH340'],
    commandDelay: 50,
    dataFormat: 'ascii',
    notes: 'More memory than Uno, better for complex jobs'
  },

  grbl_generic: {
    name: 'Generic GRBL Controller',
    description: 'Any GRBL-compatible board',
    baudRate: 115200,
    defaultBaudRates: [9600, 19200, 38400, 57600, 115200],
    protocol: 'grbl',
    features: {
      supportsWiFi: false,
      supportsUSB: true,
      maxSpeed: 2000,
      minSpeed: 50,
    },
    vendorIds: [],
    vendorNames: [],
    commandDelay: 100,
    dataFormat: 'ascii',
    notes: 'Select this if your board is not listed'
  }
};

/**
 * Get hardware profile by ID
 */
export function getHardwareProfile(profileId) {
  return HARDWARE_PROFILES[profileId] || HARDWARE_PROFILES.grbl_generic;
}

/**
 * Get all available hardware profiles
 */
export function getAllProfiles() {
  return Object.entries(HARDWARE_PROFILES).map(([id, config]) => ({
    id,
    ...config
  }));
}

/**
 * Detect hardware from vendor/product IDs
 */
export function detectHardware(vendorId, productId = null) {
  const vid = vendorId?.toUpperCase();
  
  // First try exact match
  for (const [profileId, config] of Object.entries(HARDWARE_PROFILES)) {
    if (config.vendorIds.includes(vid)) {
      return profileId;
    }
  }
  
  // Fallback to generic GRBL
  return 'grbl_generic';
}

/**
 * Validate baud rate for hardware
 */
export function isValidBaudRate(profileId, baudRate) {
  const profile = getHardwareProfile(profileId);
  return profile.defaultBaudRates.includes(baudRate);
}

/**
 * Get hardware-specific settings
 */
export function getHardwareSettings(profileId) {
  const profile = getHardwareProfile(profileId);
  return {
    baudRate: profile.baudRate,
    commandDelay: profile.commandDelay,
    maxSpeed: profile.features.maxSpeed,
    minSpeed: profile.features.minSpeed,
    supportsWiFi: profile.features.supportsWiFi,
  };
}

export default HARDWARE_PROFILES;
