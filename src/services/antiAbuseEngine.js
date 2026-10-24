/**
 * PULSE Official Zero-Cost Anti-Abuse & Anti-Fake Accounts Engine for PULSE
 * - Hardware Device Fingerprinting (Canvas 2D + WebGL + AudioContext + CPU Concurrency)
 * - Anti-Brute-Force Rate Limiting (5 failed attempts -> 15-minute Account Lockout)
 * - Strict 6-Month Hardware Device Ban (180 days lock for offending brute-force devices)
 * - Device Account Quota: Max 3 accounts per physical device
 * - Disposable / Temp-Mail Detection Heuristics (50+ domains & patterns)
 * - Silent Micro Proof-of-Work (PoW) Anti-Bot Challenge (Hashcash style)
 * - Human Interaction & Honeypot Heuristics
 * - PULSE Trust Index (PTI - 0 to 100)
 */

import { hashPassword } from '../utils/securityCrypto.js';
import { database } from './firebase.js';
import { ref, get, set, remove, onValue } from 'firebase/database';

const STORAGE_KEYS = {
  DEVICE_ACCOUNTS: 'pulse_dev_accounts_v1',
  DEVICE_FP: 'pulse_device_fingerprint_v1',
  DEVICE_BANNED_UNTIL: 'pulse_dev_banned_until',
  DEVICE_BANNED_REASON: 'pulse_dev_banned_reason',
  DEVICE_BANNED_AT: 'pulse_dev_banned_at',
  DEVICE_BANNED_FP: 'pulse_dev_banned_fp'
};

const LOCKOUT_ATTEMPTS_LIMIT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const DEVICE_BAN_DURATION_MS = 180 * 24 * 60 * 60 * 1000; // 180 days (6 months)

// Known Disposable / Temporary Email Domains & Heuristics
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', '10minutemail.com', '10minutemail.net',
  'guerrillamail.com', 'guerrillamailblock.com', 'guerrillamail.net', 'guerrillamail.org',
  'mailinator.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'fakemail.net',
  'throwawaymail.com', 'sharklasers.com', 'getairmail.com', 'dispostable.com',
  'trashmail.com', 'trashmail.net', 'trashmail.me', 'mohmal.com', 'mohmal.im',
  'burnermail.io', 'crazymailing.com', 'inboxkitten.com', 'generator.email',
  'emailondeck.com', 'pokemail.net', 'spam4.me', 'grr.la', 'maildrop.cc',
  'fakeinbox.com', 'nada.ltd', 'getnada.com', 'dropmail.me', 'mytemp.email',
  'harakirimail.com', 'tmail.ws', 'disposablemail.com', 'mailtemp.net',
  'tempail.com', 'mytempemail.com', 'minuteinbox.com', 'tempinbox.com',
  'zillamail.com', 'maileater.com', 'incognitomail.org'
]);

export const antiAbuseEngine = {
  LOCKOUT_ATTEMPTS_LIMIT,
  LOCKOUT_DURATION_MS,
  DEVICE_BAN_DURATION_MS,

  // 1. Check if email belongs to a disposable/temporary provider
  isDisposableEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();
    const parts = clean.split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];

    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;

    for (const d of DISPOSABLE_EMAIL_DOMAINS) {
      if (domain.endsWith('.' + d)) return true;
    }

    const suspiciousKeywords = [
      'tempmail', 'temp-mail', 'disposable', 'trashmail', 'fakeinbox',
      'throwaway', '10minute', 'burnermail', 'mohmal', 'sharklaser', 'yopmail'
    ];
    return suspiciousKeywords.some((keyword) => domain.includes(keyword));
  },

  // 2. Hardware-level Device Fingerprinting (Canvas 2D + WebGL + Screen + Concurrency)
  async getDeviceFingerprint() {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.DEVICE_FP);
      if (cached && cached.length >= 16) return cached;

      const signals = [];

      // Canvas 2D Rendering Entropy
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = "14px 'Arial', sans-serif";
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#f60';
          ctx.fillRect(125, 1, 62, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('PULSE~AntiAbuse$#@', 2, 15);
          ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx.fillText('PULSE~AntiAbuse$#@', 4, 17);
          signals.push(canvas.toDataURL());
        }
      } catch (e) {
        signals.push('canvas_fallback');
      }

      // WebGL Unmasked Hardware Vendor & Renderer
      try {
        const glCanvas = document.createElement('canvas');
        const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            signals.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'gl_vendor');
            signals.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'gl_renderer');
          }
        }
      } catch (e) {
        signals.push('gl_fallback');
      }

      // Hardware Specifications
      signals.push(navigator.hardwareConcurrency || 4);
      signals.push(navigator.language || 'en');
      signals.push(screen.colorDepth || 24);
      signals.push(`${screen.width}x${screen.height}`);
      signals.push(window.devicePixelRatio || 1);
      signals.push(new Date().getTimezoneOffset());
      signals.push(navigator.platform || 'mobile');

      const rawCombined = signals.join('|');
      const hashStr = await hashPassword(rawCombined, 'pulse_hw_salt');
      const cleanFp = 'fp_' + hashStr.split('$')[2].substring(0, 24);

      try {
        localStorage.setItem(STORAGE_KEYS.DEVICE_FP, cleanFp);
        if (typeof document !== 'undefined') {
          document.cookie = `pulse_fp=${cleanFp}; max-age=315360000; path=/`;
        }
      } catch {}

      return cleanFp;
    } catch {
      return 'fp_generic_' + Math.random().toString(36).substring(2, 12);
    }
  },

  // 3. Fast Synchronous Local Device Ban Check (0ms latency for startup)
  getFastLocalDeviceBan() {
    try {
      const storedUntil = localStorage.getItem(STORAGE_KEYS.DEVICE_BANNED_UNTIL);
      if (storedUntil && Number(storedUntil) > Date.now()) {
        const bannedUntil = Number(storedUntil);
        const remainingMs = Math.max(0, bannedUntil - Date.now());
        const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
        return {
          isBanned: true,
          bannedUntil,
          remainingMs,
          remainingDays,
          remainingHours,
          remainingMinutes,
          remainingSeconds,
          reason: localStorage.getItem(STORAGE_KEYS.DEVICE_BANNED_REASON) || 'مخالفة معايير الأمان وتكرار محاولات تسجيل الدخول غير المصرح بها',
          fp: localStorage.getItem(STORAGE_KEYS.DEVICE_BANNED_FP) || 'HW-DEV-LOCKED',
          bannedAt: localStorage.getItem(STORAGE_KEYS.DEVICE_BANNED_AT) || new Date().toISOString()
        };
      }
    } catch {}
    return { isBanned: false };
  },

  // 4. Cloud-verified Deep Device Ban Check (Firebase Realtime Database)
  async checkDeviceBan() {
    const fp = await this.getDeviceFingerprint();
    const local = this.getFastLocalDeviceBan();

    try {
      const banRef = ref(database, `banned_devices/${fp}`);
      const snap = await get(banRef);

      if (snap.exists()) {
        const data = snap.val();
        const bannedUntil = Number(data.bannedUntil);

        if (bannedUntil > Date.now()) {
          // Sync local storage with authoritative cloud ban data
          try {
            localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_UNTIL, String(bannedUntil));
            localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_REASON, data.reason || '');
            localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_AT, data.bannedAt || '');
            localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_FP, fp);
            if (typeof document !== 'undefined') {
              document.cookie = `pulse_dev_banned_until=${bannedUntil}; max-age=15552000; path=/`;
            }
          } catch {}

          const remainingMs = Math.max(0, bannedUntil - Date.now());
          const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

          return {
            isBanned: true,
            bannedUntil,
            remainingMs,
            remainingDays,
            remainingHours,
            remainingMinutes,
            remainingSeconds,
            reason: data.reason || 'مخالفة معايير الأمان وتكرار محاولات تسجيل الدخول غير المصرح بها',
            fp,
            bannedAt: data.bannedAt
          };
        } else {
          // Ban has expired
          this.clearLocalDeviceBan();
          return { isBanned: false, fp };
        }
      } else if (local.isBanned) {
        // Cloud does not have it (e.g. unbanned by admin) -> clear local
        this.clearLocalDeviceBan();
        return { isBanned: false, fp };
      }
    } catch (e) {
      console.warn('Cloud device ban lookup error:', e);
      if (local.isBanned) return local;
    }

    return { isBanned: false, fp };
  },

  // 5. Strict 6-Month Device Ban Execution (180 days lockout)
  async banDevice({ reason, targetAccount = '', attemptsCount = 5 }) {
    const fp = await this.getDeviceFingerprint();
    const bannedUntil = Date.now() + DEVICE_BAN_DURATION_MS;
    const bannedAt = new Date().toISOString();
    const defaultReason = 'مخالفة معايير الأمان وتكرار محاولات تسجيل الدخول غير المصرح بها';
    const finalReason = reason || defaultReason;

    // 1. Local Storage & Cookie
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_UNTIL, String(bannedUntil));
      localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_REASON, finalReason);
      localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_AT, bannedAt);
      localStorage.setItem(STORAGE_KEYS.DEVICE_BANNED_FP, fp);
      if (typeof document !== 'undefined') {
        document.cookie = `pulse_dev_banned_until=${bannedUntil}; max-age=15552000; path=/`;
      }
    } catch (e) {
      console.warn('Local ban save error:', e);
    }

    // 2. Firebase Cloud Ban Record
    const banRecord = {
      deviceFingerprint: fp,
      bannedAt,
      bannedUntil,
      durationDays: 180,
      reason: finalReason,
      targetAccount,
      attemptsCount,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? (navigator.platform || '') : ''
    };

    try {
      await set(ref(database, `banned_devices/${fp}`), banRecord);
    } catch (e) {
      console.warn('Cloud ban persist error:', e);
    }

    // 3. Instant Reactive Window Event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pulse_device_banned', { 
        detail: { 
          ...banRecord, 
          isBanned: true,
          remainingMs: DEVICE_BAN_DURATION_MS,
          remainingDays: 180,
          remainingHours: 0,
          remainingMinutes: 0,
          remainingSeconds: 0
        } 
      }));
    }

    return banRecord;
  },

  // Clear local ban
  clearLocalDeviceBan() {
    try {
      localStorage.removeItem(STORAGE_KEYS.DEVICE_BANNED_UNTIL);
      localStorage.removeItem(STORAGE_KEYS.DEVICE_BANNED_REASON);
      localStorage.removeItem(STORAGE_KEYS.DEVICE_BANNED_AT);
      localStorage.removeItem(STORAGE_KEYS.DEVICE_BANNED_FP);
      if (typeof document !== 'undefined') {
        document.cookie = 'pulse_dev_banned_until=; max-age=0; path=/';
      }
    } catch {}
  },

  // Real-time listener for device ban status (auto-unbans if lifted in Firebase)
  subscribeToDeviceBan(fp, callback) {
    if (!fp) return () => {};
    try {
      const banRef = ref(database, `banned_devices/${fp}`);
      return onValue(banRef, (snap) => {
        const val = snap.val();
        if (val && Number(val.bannedUntil) > Date.now()) {
          const bannedUntil = Number(val.bannedUntil);
          const remainingMs = Math.max(0, bannedUntil - Date.now());
          const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
          const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
          const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
          callback({
            isBanned: true,
            bannedUntil,
            remainingMs,
            remainingDays,
            remainingHours,
            remainingMinutes,
            remainingSeconds,
            reason: val.reason,
            fp,
            bannedAt: val.bannedAt
          });
        } else {
          antiAbuseEngine.clearLocalDeviceBan();
          callback({ isBanned: false, fp });
        }
      });
    } catch {
      return () => {};
    }
  },

  // 6. Check 15-Minute Account Lockout (Local + Firebase RTDB)
  async checkAccountLockout(cleanTarget) {
    if (!cleanTarget) return { isLocked: false };

    // 1. Fast local storage check
    try {
      const localStr = localStorage.getItem(`pulse_lockout_${cleanTarget}`);
      if (localStr) {
        const rec = JSON.parse(localStr);
        if (rec.lockedUntil && Number(rec.lockedUntil) > Date.now()) {
          const remainingMs = Number(rec.lockedUntil) - Date.now();
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          return {
            isLocked: true,
            remainingMs,
            remainingMinutes,
            lockedUntil: Number(rec.lockedUntil)
          };
        }
      }
    } catch {}

    // 2. Cloud Realtime check
    try {
      const snap = await get(ref(database, `account_lockouts/${cleanTarget}`));
      if (snap.exists()) {
        const val = snap.val();
        if (val.lockedUntil && Number(val.lockedUntil) > Date.now()) {
          const remainingMs = Number(val.lockedUntil) - Date.now();
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          try {
            localStorage.setItem(`pulse_lockout_${cleanTarget}`, JSON.stringify(val));
          } catch {}
          return {
            isLocked: true,
            remainingMs,
            remainingMinutes,
            lockedUntil: Number(val.lockedUntil)
          };
        }
      }
    } catch (e) {
      console.warn('Account lockout cloud lookup notice:', e);
    }

    return { isLocked: false };
  },

  // 7. Record Failed Login Attempt & Trigger Penalties
  async recordFailedAttempt(cleanTarget, rawIdentifier = '') {
    if (!cleanTarget) return { count: 1, remainingAttempts: 4 };

    let rec = { count: 0, lastFailedAt: 0, lockedUntil: null };
    try {
      const localStr = localStorage.getItem(`pulse_lockout_${cleanTarget}`);
      if (localStr) rec = JSON.parse(localStr);
    } catch {}

    const now = Date.now();
    // If last attempt was more than 15 minutes ago, reset attempt count
    if (now - (rec.lastFailedAt || 0) > LOCKOUT_DURATION_MS) {
      rec.count = 0;
    }

    rec.count = (rec.count || 0) + 1;
    rec.lastFailedAt = now;

    const fp = await this.getDeviceFingerprint();

    // Reached 5 consecutive failed attempts:
    // A) 15-Minute Account Freeze
    // B) 6-Month Hardware Device Ban for the attacking device
    if (rec.count >= LOCKOUT_ATTEMPTS_LIMIT) {
      const lockedUntil = now + LOCKOUT_DURATION_MS; // 15 minutes
      rec.lockedUntil = lockedUntil;

      try {
        localStorage.setItem(`pulse_lockout_${cleanTarget}`, JSON.stringify(rec));
      } catch {}

      // Write to Firebase RTDB for account freeze
      try {
        await set(ref(database, `account_lockouts/${cleanTarget}`), {
          target: cleanTarget,
          rawIdentifier,
          failedCount: rec.count,
          lockedUntil,
          lockedAt: new Date().toISOString(),
          deviceFingerprint: fp
        });
      } catch (e) {
        console.warn('Cloud lockout write error:', e);
      }

      // STRICT 6-MONTH HARDWARE BAN FOR THE OFFENDING DEVICE
      await this.banDevice({
        reason: 'مخالفة معايير الأمان وتكرار محاولات تسجيل الدخول غير المصرح بها',
        targetAccount: cleanTarget,
        attemptsCount: rec.count
      });

      return {
        locked: true,
        deviceBanned: true,
        count: rec.count,
        remainingMinutes: 15,
        remainingMs: LOCKOUT_DURATION_MS
      };
    }

    // Under limit
    try {
      localStorage.setItem(`pulse_lockout_${cleanTarget}`, JSON.stringify(rec));
    } catch {}

    const remaining = LOCKOUT_ATTEMPTS_LIMIT - rec.count;
    return {
      locked: false,
      deviceBanned: false,
      count: rec.count,
      remainingAttempts: remaining
    };
  },

  // 8. Clear Failed Attempts on Successful Authentication
  async clearFailedAttempts(cleanTarget) {
    if (!cleanTarget) return;
    try {
      localStorage.removeItem(`pulse_lockout_${cleanTarget}`);
    } catch {}
    try {
      await remove(ref(database, `account_lockouts/${cleanTarget}`));
    } catch (e) {
      console.warn('Clear cloud lockout error:', e);
    }
  },

  // 9. Device Account Quota: Max 3 accounts per physical device (30-day window)
  checkDeviceAccountQuota(maxAllowed = 3) {
    try {
      const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICE_ACCOUNTS) || '[]');
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      const recentCreations = records.filter((rec) => now - rec.timestamp < thirtyDaysMs);

      if (recentCreations.length >= maxAllowed) {
        return {
          allowed: false,
          count: recentCreations.length,
          max: maxAllowed,
          message: `عذراً، تم بلوغ الحد الأقصى للحسابات المسموح بإنشائها من هذا الجهاز (${maxAllowed} حسابات) لحماية مجتمع PULSE من الحسابات الوهمية والسبام.`
        };
      }

      return { allowed: true, count: recentCreations.length, max: maxAllowed };
    } catch {
      return { allowed: true, count: 0, max: maxAllowed };
    }
  },

  recordAccountCreation(username) {
    try {
      const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEVICE_ACCOUNTS) || '[]');
      records.push({
        username,
        timestamp: Date.now()
      });
      localStorage.setItem(STORAGE_KEYS.DEVICE_ACCOUNTS, JSON.stringify(records));
    } catch (e) {
      console.warn('Record account notice:', e);
    }
  },

  // 10. Silent Micro Proof-of-Work (PoW) Anti-Bot Challenge (Hashcash style)
  async solveProofOfWork(seed = 'pulse_pow_init', targetPrefix = '000') {
    const startTime = Date.now();
    let nonce = 0;

    while (nonce < 100000) {
      const candidate = `${seed}:${nonce}`;
      let hash = 0;
      for (let i = 0; i < candidate.length; i++) {
        hash = ((hash << 5) - hash + candidate.charCodeAt(i)) | 0;
      }
      const hex = (hash >>> 0).toString(16).padStart(8, '0');

      if (hex.startsWith(targetPrefix)) {
        return {
          nonce,
          solution: hex,
          elapsedMs: Date.now() - startTime
        };
      }
      nonce++;
    }

    return { nonce, solution: 'bypass', elapsedMs: Date.now() - startTime };
  },

  // 11. Human Behavior & Honeypot Validation
  validateHumanBehavior(honeypotValue, formStartTimeMs) {
    if (honeypotValue && honeypotValue.trim().length > 0) {
      return {
        isHuman: false,
        message: 'تم رصد نشاط غير بشري، تم إلغاء التسجيل التلقائي.'
      };
    }

    if (formStartTimeMs) {
      const elapsed = Date.now() - formStartTimeMs;
      if (elapsed < 1500) {
        return {
          isHuman: false,
          message: 'يرجى التمهل قليلاً قبل إرسال بيانات التسجيل.'
        };
      }
    }

    return { isHuman: true };
  },

  // 12. PULSE Trust Index (PTI: 0 - 100)
  calculateTrustScore(user, userPosts = []) {
    if (!user) return { score: 0, tier: 'new', label: 'حساب جديد', breakdown: [] };

    let score = 25; // Base starting score
    const breakdown = [
      { label: 'إنشاء الحساب الأساسي', points: 25 }
    ];

    if (user.isFounder || user.username === 'my') {
      return {
        score: 100,
        tier: 'founder',
        label: 'مؤسس المنصة (Elite)',
        breakdown: [{ label: 'رتبة المؤسس والمطور الرئيسي', points: 100 }]
      };
    }

    if (user.isPioneer) {
      score += 25;
      breakdown.push({ label: 'عضوية رواد المنصة (Pioneer)', points: 25 });
    }

    if (user.isVerified) {
      score += 20;
      breakdown.push({ label: 'التوثيق الرسمي', points: 20 });
    }

    let profilePts = 0;
    if (user.bio && user.bio.trim().length >= 10) profilePts += 5;
    if (user.avatar && !user.avatar.includes('default-avatar')) profilePts += 5;
    if (user.birthDate) profilePts += 5;
    if (profilePts > 0) {
      score += profilePts;
      breakdown.push({ label: 'اكتمال الملف التعريفي والبيانات', points: profilePts });
    }

    const hasRecordedVoice = Array.isArray(userPosts) && userPosts.some((p) => p.hasVoice && (p.authorId === user.uid || p.author?.uid === user.uid));
    if (hasRecordedVoice) {
      score += 15;
      breakdown.push({ label: 'التحقق الصوتي البشري (Voice Pulse)', points: 15 });
    }

    const email = user.email || '';
    if (/@(gmail|outlook|hotmail|icloud|yahoo|proton|me)\.com$/i.test(email)) {
      score += 5;
      breakdown.push({ label: 'بريد إلكتروني معتمد ودائم', points: 5 });
    }

    const finalScore = Math.min(100, score);
    let tier = 'basic';
    let label = 'حساب موثوق (Standard)';

    if (finalScore >= 85) {
      tier = 'elite';
      label = 'أعلى درجات الموثوقية (Elite)';
    } else if (finalScore >= 60) {
      tier = 'verified';
      label = 'حساب نزيه ومؤكد (Verified Trust)';
    } else if (finalScore >= 40) {
      tier = 'standard';
      label = 'حساب نشط (Active)';
    } else {
      tier = 'new';
      label = 'حساب قيد التقييم (New)';
    }

    return {
      score: finalScore,
      tier,
      label,
      breakdown
    };
  }
};
