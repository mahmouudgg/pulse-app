import { hashPasswordWithSalt, verifyPasswordWithSalt } from '../utils/securityCrypto';

const STORAGE_KEYS = {
  ENABLED: 'pulse_lock_enabled',
  PIN_HASH: 'pulse_lock_pin_hash',
  PIN_SALT: 'pulse_lock_pin_salt',
  BIOMETRIC_ENABLED: 'pulse_lock_bio_enabled',
  TIMEOUT: 'pulse_lock_timeout', // seconds, 0 = immediately
  LAST_BACKGROUND_TIME: 'pulse_lock_last_bg'
};

export const biometricLockService = {
  // Check if WebAuthn / Platform Biometric is available on this device
  async isBiometricAvailable() {
    try {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
          return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }
      }
    } catch (e) {
      console.warn('Biometric availability check notice:', e);
    }
    return false;
  },

  // Check if App Lock is currently enabled by user
  isLockEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ENABLED) === 'true';
    } catch {
      return false;
    }
  },

  // Check if biometric authentication is enabled alongside PIN
  isBiometricEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED) === 'true';
    } catch {
      return false;
    }
  },

  // Get current lockout timeout (in seconds)
  getLockTimeout() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.TIMEOUT) || '0', 10);
    } catch {
      return 0;
    }
  },

  // Enable App Lock with a 4-digit PIN and optional biometric
  async enableLock(pin, enableBiometrics = true, timeoutSeconds = 0) {
    if (!pin || pin.length < 4) {
      return { success: false, message: 'رمز المرور يجب أن يتكون من 4 أرقام على الأقل.' };
    }

    const { hash, salt } = await hashPasswordWithSalt(pin);
    try {
      localStorage.setItem(STORAGE_KEYS.ENABLED, 'true');
      localStorage.setItem(STORAGE_KEYS.PIN_HASH, hash);
      localStorage.setItem(STORAGE_KEYS.PIN_SALT, salt);
      localStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enableBiometrics ? 'true' : 'false');
      localStorage.setItem(STORAGE_KEYS.TIMEOUT, String(timeoutSeconds));
      return { success: true };
    } catch (e) {
      return { success: false, message: 'فشل حفظ إعدادات القفل.' };
    }
  },

  // Disable App Lock
  disableLock() {
    try {
      localStorage.removeItem(STORAGE_KEYS.ENABLED);
      localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
      localStorage.removeItem(STORAGE_KEYS.PIN_SALT);
      localStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      localStorage.removeItem(STORAGE_KEYS.TIMEOUT);
      localStorage.removeItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
      return true;
    } catch {
      return false;
    }
  },

  // Verify PIN entered by user
  async verifyPin(pin) {
    try {
      const hash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
      const salt = localStorage.getItem(STORAGE_KEYS.PIN_SALT);
      if (!hash || !salt) return false;
      return await verifyPasswordWithSalt(pin, hash, salt);
    } catch {
      return false;
    }
  },

  // Authenticate with Platform Biometrics (Fingerprint / Face ID / Device PIN)
  async authenticateBiometrics() {
    const isSupported = await this.isBiometricAvailable();
    if (!isSupported) {
      return { success: false, reason: 'unsupported' };
    }

    try {
      // Challenge generation
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname || 'localhost'
        }
      });

      if (credential) {
        return { success: true };
      }
      return { success: false, reason: 'failed' };
    } catch (err) {
      // User cancelled or fallback needed
      return { success: false, reason: err.name || 'cancelled' };
    }
  },

  // Record timestamp when app enters background
  recordBackgroundTime() {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_BACKGROUND_TIME, String(Date.now()));
    } catch {}
  },

  // Check if app should be locked when returning to foreground
  shouldLockOnResume() {
    if (!this.isLockEnabled()) return false;
    try {
      const lastBgStr = localStorage.getItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
      if (!lastBgStr) return true;
      const lastBg = parseInt(lastBgStr, 10);
      const timeoutMs = this.getLockTimeout() * 1000;
      return (Date.now() - lastBg) >= timeoutMs;
    } catch {
      return true;
    }
  }
};
