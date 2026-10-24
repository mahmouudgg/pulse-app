/**
 * Hardware Screen Capture & Anti-Spyware Protection Service
 * Uses Android Native FLAG_SECURE via PulseSecurityNative interface
 * Prevents screen recording, screenshots, and task switcher leakage of sensitive keys.
 */

const STORAGE_KEY = 'pulse_screen_protection';

export const screenSecurity = {
  // Check if native Android bridge is available
  isAvailable() {
    return typeof window !== 'undefined' && Boolean(window.PulseSecurityNative?.setScreenCaptureProtection);
  },

  // Enable or disable FLAG_SECURE
  setProtection(enable) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, enable ? 'true' : 'false');
        if (window.PulseSecurityNative?.setScreenCaptureProtection) {
          window.PulseSecurityNative.setScreenCaptureProtection(Boolean(enable));
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to set screen capture protection:', e);
    }
    return false;
  },

  // Check current setting
  isProtected() {
    try {
      if (typeof window !== 'undefined') {
        if (window.PulseSecurityNative?.isScreenCaptureProtected) {
          return window.PulseSecurityNative.isScreenCaptureProtected();
        }
        return localStorage.getItem(STORAGE_KEY) === 'true';
      }
    } catch {}
    return false;
  },

  // Initialize on app launch
  init() {
    try {
      const isEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
      if (isEnabled && this.isAvailable()) {
        window.PulseSecurityNative.setScreenCaptureProtection(true);
      }
    } catch {}
  }
};
