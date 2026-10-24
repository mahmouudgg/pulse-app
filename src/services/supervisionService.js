/**
 * PULSE Family Supervision & Teen Protection Service
 * Modeled on PULSE Core & Instagram Family Center standards.
 * 
 * Provides:
 * - Age-gated automatic teen detection (< 18 years old)
 * - Guardian-Teen bidirectional linking
 * - Daily screen time limits with automated break reminders
 * - Scheduled downtime (Sleep mode / night pause)
 * - Strict sensitive content filtering & DM stranger blocking
 * - Live usage telemetry and persistent cloud sync (Firebase RTDB)
 */

import { database } from './firebase';
import { ref, get, set, update } from 'firebase/database';

const SUPERVISION_LOCAL_KEY = 'pulse_supervision_state_v1';
const SCREEN_TIME_TODAY_KEY = 'pulse_screen_time_today_v1';

export const supervisionService = {
  /**
   * Calculate age from birthdate string (YYYY-MM-DD)
   */
  calculateAge(birthDateString) {
    if (!birthDateString) return null;
    const birth = new Date(birthDateString);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  /**
   * Determine if a user qualifies as a teen (13 to 17 years old)
   */
  isTeenUser(user) {
    if (!user) return false;
    if (typeof user.isTeen === 'boolean') return user.isTeen;
    const age = this.calculateAge(user.birthDate);
    if (age !== null) {
      return age >= 13 && age < 18;
    }
    return false;
  },

  /**
   * Get current supervision settings for user
   */
  getSettings(user) {
    if (!user?.uid) {
      return this._getDefaultSettings(false);
    }

    try {
      const saved = localStorage.getItem(`${SUPERVISION_LOCAL_KEY}_${user.uid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this._getDefaultSettings(this.isTeenUser(user)), ...parsed };
      }
    } catch (e) {
      console.warn('Error reading supervision settings:', e);
    }

    return this._getDefaultSettings(this.isTeenUser(user));
  },

  _getDefaultSettings(isTeen) {
    return {
      isTeen: Boolean(isTeen),
      guardianUid: null,
      guardianUsername: null,
      guardianDisplayName: null,
      guardianEmail: null,
      linkedTeens: [], // If user is guardian: array of { uid, username, displayName, birthDate }
      dailyLimitMinutes: isTeen ? 60 : 0, // 0 = unlimited, otherwise in minutes
      downtimeEnabled: Boolean(isTeen),
      downtimeStart: '22:00', // 10 PM
      downtimeEnd: '07:00',   // 7 AM
      strictContentFilter: Boolean(isTeen),
      blockStrangerDMs: Boolean(isTeen),
      pauseNotificationsAtNight: Boolean(isTeen),
      lastSyncTimestamp: Date.now()
    };
  },

  /**
   * Save supervision settings locally and to cloud
   */
  async saveSettings(user, newSettings) {
    if (!user?.uid) return;
    const merged = { ...this.getSettings(user), ...newSettings, lastSyncTimestamp: Date.now() };

    try {
      localStorage.setItem(`${SUPERVISION_LOCAL_KEY}_${user.uid}`, JSON.stringify(merged));
    } catch {}

    try {
      const sRef = ref(database, `supervision/${user.uid}`);
      await set(sRef, merged);
    } catch (e) {
      console.warn('Supervision cloud sync notice:', e);
    }

    return merged;
  },

  /**
   * Track live screen time (stored in minutes per day)
   */
  getTodayUsageMinutes() {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const raw = localStorage.getItem(`${SCREEN_TIME_TODAY_KEY}_${todayKey}`);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  },

  recordScreenTime(minutesToAdd = 1) {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const current = this.getTodayUsageMinutes();
      const updated = current + minutesToAdd;
      localStorage.setItem(`${SCREEN_TIME_TODAY_KEY}_${todayKey}`, updated.toString());
      return updated;
    } catch {
      return 0;
    }
  },

  /**
   * Check if user is currently in a scheduled downtime window
   */
  isDowntimeActive(settings) {
    if (!settings || !settings.downtimeEnabled) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (settings.downtimeStart || '22:00').split(':').map(Number);
    const [endH, endM] = (settings.downtimeEnd || '07:00').split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    // Overnight window (e.g. 22:00 to 07:00)
    if (startTotal > endTotal) {
      return currentMins >= startTotal || currentMins < endTotal;
    }
    // Daytime window
    return currentMins >= startTotal && currentMins < endTotal;
  },

  /**
   * Link a Guardian account to a Teen account
   */
  async linkGuardian(teenUser, guardianIdentifier) {
    if (!teenUser?.uid || !guardianIdentifier) {
      throw new Error('يرجى تحديد حساب ولي الأمر');
    }

    const clean = guardianIdentifier.trim().toLowerCase().replace('@', '');
    const snap = await get(ref(database, 'users'));
    const allUsers = snap.val() || {};

    let guardianObj = null;
    for (const [uid, u] of Object.entries(allUsers)) {
      if (!u) continue;
      if (
        u.username?.toLowerCase() === clean ||
        u.email?.toLowerCase() === clean ||
        uid === clean
      ) {
        guardianObj = { ...u, uid: u.uid || uid };
        break;
      }
    }

    if (!guardianObj) {
      throw new Error('لم يتم العثور على حساب ولي الأمر بهذا الاسم أو البريد.');
    }

    if (guardianObj.uid === teenUser.uid) {
      throw new Error('لا يمكنك ربط حسابك بنفسه كولي أمر.');
    }

    // 1. Update Teen supervision
    const teenSettings = {
      isTeen: true,
      guardianUid: guardianObj.uid,
      guardianUsername: guardianObj.username,
      guardianDisplayName: guardianObj.displayName || guardianObj.username,
      guardianEmail: guardianObj.email || null,
      blockStrangerDMs: true,
      strictContentFilter: true,
      downtimeEnabled: true
    };
    await this.saveSettings(teenUser, teenSettings);

    // 2. Update Guardian supervision list
    const currentGuardianSettings = this.getSettings(guardianObj);
    const existingTeens = Array.isArray(currentGuardianSettings.linkedTeens) ? currentGuardianSettings.linkedTeens : [];
    if (!existingTeens.some(t => t.uid === teenUser.uid)) {
      existingTeens.push({
        uid: teenUser.uid,
        username: teenUser.username,
        displayName: teenUser.displayName || teenUser.username,
        birthDate: teenUser.birthDate || null,
        linkedAt: Date.now()
      });
      await this.saveSettings(guardianObj, { linkedTeens: existingTeens });
    }

    return { success: true, guardian: guardianObj };
  },

  /**
   * Unlink Guardian and Teen
   */
  async unlink(currentUser) {
    if (!currentUser?.uid) return;
    const settings = this.getSettings(currentUser);

    // If teen unlinking guardian
    if (settings.guardianUid) {
      const gUid = settings.guardianUid;
      await this.saveSettings(currentUser, {
        guardianUid: null,
        guardianUsername: null,
        guardianDisplayName: null,
        guardianEmail: null
      });

      try {
        const gSnap = await get(ref(database, `supervision/${gUid}`));
        const gVal = gSnap.val() || {};
        if (Array.isArray(gVal.linkedTeens)) {
          const updated = gVal.linkedTeens.filter(t => t.uid !== currentUser.uid);
          await update(ref(database, `supervision/${gUid}`), { linkedTeens: updated });
        }
      } catch {}
    }

    return true;
  }
};
