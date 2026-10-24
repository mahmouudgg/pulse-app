import { database } from './firebase';
import { ref, set, get, update, onValue, remove } from 'firebase/database';
import { getDeviceInfo, getApproximateLocation, getOrCreateSessionId } from '../utils/deviceDetector';
import { notificationService } from './notificationService';

export const sessionService = {
  // Current local device session ID
  getCurrentSessionId() {
    return getOrCreateSessionId();
  },

  // 1. Register or update the current session in Firebase Realtime Database
  async registerCurrentSession(currentUser) {
    if (!currentUser?.uid) return;

    try {
      const sessionId = getOrCreateSessionId();
      const devInfo = getDeviceInfo();
      const locInfo = await getApproximateLocation();

      const sessionData = {
        sessionId,
        deviceName: devInfo.deviceName,
        deviceType: devInfo.deviceType,
        deviceModel: devInfo.deviceModel,
        os: devInfo.os,
        browser: devInfo.browser,
        location: locInfo.location,
        ip: locInfo.ip,
        status: 'active',
        lastActive: Date.now(),
        updatedAt: Date.now()
      };

      const sessionRef = ref(database, `users/${currentUser.uid}/sessions/${sessionId}`);
      
      // Check if session already exists to preserve firstLogin and detect new devices
      const snap = await get(sessionRef);
      if (!snap.exists()) {
        sessionData.firstLogin = Date.now();

        // Check if user already has other sessions to send security alert
        try {
          const loginAlertsEnabled = localStorage.getItem(`pulse_login_alerts_${currentUser.uid}`) !== 'false';
          const allSessionsSnap = await get(ref(database, `users/${currentUser.uid}/sessions`));
          if (allSessionsSnap.exists() && Object.keys(allSessionsSnap.val()).length > 0 && loginAlertsEnabled) {
            notificationService.addNotification({
              targetUserId: currentUser.uid,
              type: 'security_login_alert',
              actor: {
                uid: 'security_pulse',
                displayName: 'أمان PULSE',
                username: 'pulse_security',
                avatar: 'https://cdn-icons-png.flaticon.com/512/9422/9422891.png',
                isVerified: true
              },
              sessionId,
              device: `${devInfo.deviceName || 'جهاز جديد'} (${devInfo.browser || 'متصفح'})`,
              location: locInfo.location || 'Cairo, Egypt',
              ip: locInfo.ip || '197.38.0.1',
              status: 'pending',
              text: `تم تسجيل دخول جديد لحسابك من جهاز (${devInfo.deviceName || 'جهاز جديد'} - ${devInfo.browser || 'متصفح'}) الموقع: ${locInfo.location || 'Cairo, Egypt'}. هل أنت من قام بهذا النشاط؟`
            });
          }
        } catch (alertErr) {
          console.warn('Security alert dispatch notice:', alertErr);
        }
      }

      await update(sessionRef, sessionData);
      return sessionData;
    } catch (e) {
      console.warn('Session registration error:', e);
    }
  },

  // Dispatch a test security login alert
  async dispatchTestSecurityAlert(currentUser) {
    if (!currentUser?.uid) return null;
    try {
      const devInfo = getDeviceInfo();
      const locInfo = await getApproximateLocation();
      const mockSessionId = 'sess_test_' + Date.now().toString(36);
      return notificationService.addNotification({
        targetUserId: currentUser.uid,
        type: 'security_login_alert',
        actor: {
          uid: 'security_pulse',
          displayName: 'أمان PULSE',
          username: 'pulse_security',
          avatar: 'https://cdn-icons-png.flaticon.com/512/9422/9422891.png',
          isVerified: true
        },
        sessionId: mockSessionId,
        device: `${devInfo.deviceName || 'Chrome'} (${devInfo.os || 'Windows'})`,
        location: locInfo.location || 'Cairo, Egypt',
        ip: locInfo.ip || '197.38.12.94',
        status: 'pending',
        text: `تم تسجيل دخول جديد لحسابك من جهاز (${devInfo.deviceName || 'Chrome'} - ${devInfo.os || 'Windows'}) الموقع: ${locInfo.location || 'Cairo, Egypt'}. هل أنت من قام بهذا النشاط؟`
      });
    } catch (err) {
      console.warn('dispatchTestSecurityAlert error:', err);
      return null;
    }
  },

  // 2. Listen to all sessions of a user in real-time
  subscribeToUserSessions(userId, callback) {
    if (!userId) return () => {};

    try {
      const sessionsRef = ref(database, `users/${userId}/sessions`);
      return onValue(sessionsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.entries(val)
            .map(([key, s]) => {
              if (!s || typeof s !== 'object') return null;
              return {
                id: s.sessionId || key,
                sessionId: s.sessionId || key,
                ...s
              };
            })
            .filter((s) => s && s.sessionId && s.status !== 'revoked')
            .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
          if (callback) callback(list);
        } else {
          if (callback) callback([]);
        }
      }, (err) => {
        console.warn('subscribeToUserSessions error:', err);
      });
    } catch (e) {
      console.warn('subscribeToUserSessions error:', e);
      return () => {};
    }
  },

  // 2.1 Fetch user sessions once
  async getUserSessionsOnce(userId) {
    if (!userId) return [];
    try {
      const snap = await get(ref(database, `users/${userId}/sessions`));
      if (!snap.exists()) return [];
      const val = snap.val();
      return Object.entries(val)
        .map(([key, s]) => {
          if (!s || typeof s !== 'object') return null;
          return { id: s.sessionId || key, sessionId: s.sessionId || key, ...s };
        })
        .filter((s) => s && s.sessionId && s.status !== 'revoked')
        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
    } catch {
      return [];
    }
  },

  // 3. Listen to the current session: if revoked by another device, trigger callback
  subscribeToCurrentSessionStatus(userId, onRevoked) {
    if (!userId) return () => {};
    const currentSessionId = getOrCreateSessionId();

    try {
      const mySessionRef = ref(database, `users/${userId}/sessions/${currentSessionId}`);
      return onValue(mySessionRef, (snapshot) => {
        const val = snapshot.val();
        if (!val || val.status === 'revoked') {
          if (onRevoked) onRevoked();
        }
      });
    } catch (e) {
      return () => {};
    }
  },

  // 4. Revoke a specific session remotely
  async revokeSession(userId, sessionId) {
    if (!userId || !sessionId) return;
    try {
      const sessionRef = ref(database, `users/${userId}/sessions/${sessionId}`);
      await update(sessionRef, {
        status: 'revoked',
        revokedAt: Date.now()
      });
      try {
        await remove(sessionRef);
      } catch (rmErr) {
        // Fallback if remove fails
      }
    } catch (e) {
      console.error('Revoke session error:', e);
      throw e;
    }
  },

  // 5. Revoke all sessions except the current one (Log out everywhere else)
  async revokeAllOtherSessions(userId) {
    if (!userId) return;
    const currentSessionId = getOrCreateSessionId();
    try {
      const sessionsRef = ref(database, `users/${userId}/sessions`);
      const snap = await get(sessionsRef);
      if (snap.exists()) {
        const allSessions = snap.val();
        const promises = [];
        Object.keys(allSessions).forEach((sId) => {
          if (sId !== currentSessionId) {
            const sRef = ref(database, `users/${userId}/sessions/${sId}`);
            promises.push(
              update(sRef, { status: 'revoked', revokedAt: Date.now() })
                .then(() => remove(sRef))
                .catch(() => {})
            );
          }
        });
        await Promise.all(promises);
      }
    } catch (e) {
      console.error('Revoke all other sessions error:', e);
      throw e;
    }
  },

  // ================= QR CODE AUTHENTICATION ENGINE =================

  // 6. Create a QR Login Request Token (invoked by the web/client displaying the QR)
  async createQrAuthRequest() {
    try {
      const token = 'pulse_qr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      const devInfo = getDeviceInfo();
      const locInfo = await getApproximateLocation();

      const qrData = {
        token,
        status: 'pending', // 'pending' | 'authorized' | 'rejected' | 'expired'
        createdAt: Date.now(),
        expiresAt: Date.now() + 120000, // 2 minutes
        requester: {
          deviceName: devInfo.deviceName,
          deviceType: devInfo.deviceType,
          os: devInfo.os,
          browser: devInfo.browser,
          location: locInfo.location,
          ip: locInfo.ip
        }
      };

      const qrRef = ref(database, `qr_auth/${token}`);
      await set(qrRef, qrData);
      return qrData;
    } catch (e) {
      console.error('createQrAuthRequest error:', e);
      throw e;
    }
  },

  // 7. Subscribe to a QR Auth Token (web client waiting for approval)
  subscribeToQrAuth(token, onUpdate) {
    if (!token) return () => {};
    try {
      const qrRef = ref(database, `qr_auth/${token}`);
      return onValue(qrRef, (snapshot) => {
        const val = snapshot.val();
        if (val && onUpdate) {
          onUpdate(val);
        }
      });
    } catch (e) {
      console.warn('subscribeToQrAuth error:', e);
      return () => {};
    }
  },

  // 8. Fetch QR request details by token (invoked by scanning mobile app)
  async getQrRequestDetails(token) {
    if (!token) throw new Error('Token required');
    try {
      const qrRef = ref(database, `qr_auth/${token}`);
      const snap = await get(qrRef);
      if (!snap.exists()) {
        throw new Error('رمز الاستجابة السريعة (QR) غير صالح أو منتهي الصلاحية.');
      }
      const data = snap.val();
      if (data.status === 'expired' || Date.now() > data.expiresAt) {
        throw new Error('انتهت صلاحية رمز الـ QR. يرجى إعادة تحديث الرمز على الجهاز الآخر.');
      }
      if (data.status === 'authorized') {
        throw new Error('تم استخدام هذا الرمز بالفعل.');
      }
      return data;
    } catch (e) {
      console.error('getQrRequestDetails error:', e);
      throw e;
    }
  },

  // 9. Authorize QR Login Request (invoked by authenticated mobile app)
  async authorizeQrLogin(token, currentUser) {
    if (!token || !currentUser?.uid) throw new Error('Missing token or user');
    try {
      const qrRef = ref(database, `qr_auth/${token}`);
      const snap = await get(qrRef);
      if (!snap.exists()) throw new Error('رمز الـ QR غير موجود');

      const qrData = snap.val();
      if (Date.now() > qrData.expiresAt) {
        throw new Error('انتهت صلاحية الرمز، يرجى تحديث الـ QR على الجهاز الآخر.');
      }

      // Safe user payload for authentication
      const userPayload = {
        uid: currentUser.uid,
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        isVerified: !!currentUser.isVerified,
        isFounder: !!currentUser.isFounder,
        isPioneer: !!currentUser.isPioneer,
        pioneerNumber: currentUser.pioneerNumber || null
      };

      // 1. Build and persist active session for the authorized web/remote device
      const requester = qrData.requester || {};
      const newSessionId = qrData.sessionId || requester.sessionId || ('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));

      const newSessionData = {
        sessionId: newSessionId,
        deviceName: requester.deviceName || (requester.deviceType === 'desktop' ? 'متصفح ويب (حاسوب)' : 'متصفح ويب'),
        deviceType: requester.deviceType || 'desktop',
        deviceModel: requester.deviceModel || requester.os || 'جهاز كمبيوتر',
        os: requester.os || 'Windows',
        browser: requester.browser || 'Google Chrome',
        location: requester.location || (requester.city && requester.country ? `${requester.city}، ${requester.country}` : 'مصر'),
        ip: requester.ip || 'مخفي',
        status: 'active',
        firstLogin: Date.now(),
        lastActive: Date.now(),
        updatedAt: Date.now(),
        loginMethod: 'qr_auth',
        platform: 'web'
      };

      try {
        const userSessionRef = ref(database, `users/${currentUser.uid}/sessions/${newSessionId}`);
        await set(userSessionRef, newSessionData);

        // Security Notification alert on device link
        notificationService.addNotification({
          targetUserId: currentUser.uid,
          type: 'system',
          actor: {
            uid: 'security_pulse',
            displayName: 'درع الأمان PULSE',
            username: 'security',
            avatar: 'https://cdn-icons-png.flaticon.com/512/9422/9422891.png',
            isVerified: true
          },
          text: `تم ربط جهاز جديد بنجاح عبر رمز QR (${newSessionData.deviceName}${newSessionData.location ? ' - ' + newSessionData.location : ''}).`
        });
      } catch (sessErr) {
        console.warn('Session persistence error during QR authorization:', sessErr);
      }

      await update(qrRef, {
        status: 'authorized',
        authorizedAt: Date.now(),
        authorizedUser: userPayload,
        sessionId: newSessionId
      });

      return true;
    } catch (e) {
      console.error('authorizeQrLogin error:', e);
      throw e;
    }
  },

  // 10. Reject QR Login Request
  async rejectQrLogin(token) {
    if (!token) return;
    try {
      const qrRef = ref(database, `qr_auth/${token}`);
      await update(qrRef, {
        status: 'rejected',
        rejectedAt: Date.now()
      });
    } catch (e) {
      console.error('rejectQrLogin error:', e);
    }
  }
};
