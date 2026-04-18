// ═══════════════════════════════════════════
// env.js — Environment variable loader
// ═══════════════════════════════════════════

const DEFAULT_ENV = {
  API_BASE: 'https://my-khkt-api-production.up.railway.app/',
  RETRY_DELAY: '3',
  FACE_RECOGNITION_THRESHOLD: '0.32',
  FRAME_COUNT: '2',
  IMAGE_CAPTURE_INTERVAL: '07:00',
  LOCALE: 'vi-VN',
};

let envVars = { ...DEFAULT_ENV };

// Load .env file
async function loadEnv() {
  try {
    const response = await fetch('.env');
    if (!response.ok) {
      console.warn('.env file not found, using default values');
      return;
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;
      
      const [key, ...valueParts] = line.split('=');
      const trimmedKey = key.trim();
      const value = valueParts.join('=').trim();
      
      if (trimmedKey && value) {
        envVars[trimmedKey] = value;
      }
    });
    
    console.log('Environment variables loaded');
  } catch (error) {
    console.warn('Failed to load .env file:', error.message);
  }
}

// Get environment variable
export function getEnv(key) {
  return envVars[key] !== undefined ? envVars[key] : DEFAULT_ENV[key];
}

// Initialize
export async function initEnv() {
  await loadEnv();
}

// Debug: show all env vars
export function debugEnv() {
  return { ...envVars };
}
