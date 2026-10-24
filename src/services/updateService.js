import { Capacitor } from '@capacitor/core';

const FIREBASE_BASE_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com';

export const APP_VERSION_INFO = {
  versionName: '1.0.2',
  versionCode: 3,
  channel: 'stable',
  platform: 'android'
};

export const updateService = {
  async checkForUpdates() {
    try {
      let release = null;
      try {
        const rootRes = await fetch(`${FIREBASE_BASE_URL}/app_release.json`);
        if (rootRes.ok) {
          release = await rootRes.json();
        }
      } catch {}

      if (!release || !release.versionCode) {
        try {
          const legRes = await fetch(`${FIREBASE_BASE_URL}/users/app_release.json`);
          if (legRes.ok) {
            release = await legRes.json();
          }
        } catch {}
      }

      if (!release || !release.versionCode) {
        return { hasUpdate: false };
      }

      const hasUpdate = Number(release.versionCode) > APP_VERSION_INFO.versionCode;

      return {
        hasUpdate,
        currentVersion: APP_VERSION_INFO.versionName,
        currentCode: APP_VERSION_INFO.versionCode,
        latestVersion: release.versionName || release.version || '1.1.0',
        latestCode: release.versionCode,
        releaseNotes: release.releaseNotes || 'تحديث جديد يتضمن تحسينات في الأداء والاستقرار وسرعة الصوتيات.',
        apkUrl: release.apkUrl || 'https://pulseeg.wuaze.com/Pulse-v1.0.apk',
        apkSize: release.apkSize || '5.8 MB',
        isMandatory: Boolean(release.isMandatory),
        releaseDate: release.releaseDate || '2026-09-26'
      };
    } catch (err) {
      console.warn('Update check error:', err);
      return { hasUpdate: false };
    }
  },

  async startDownload(apkUrl) {
    if (!apkUrl) return;
    try {
      window.open(apkUrl, '_system');
    } catch {
      window.location.href = apkUrl;
    }
  }
};
