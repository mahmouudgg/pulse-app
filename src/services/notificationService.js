/**
 * Realtime Notification & Cloud Push Event Engine
 * Dispatches Push Notifications with subtle audio feedback and Firebase Cloud Sync
 * Sender ID: 455923436884
 */

import { database } from './firebase';
import { ref, set, get, update, onValue, onChildAdded, query, limitToLast, orderByKey } from 'firebase/database';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

const STORAGE_KEY = 'pulse_notifications_v3';

export const notificationService = {
  activeListenerUnsubscribe: null,

  getNotifications(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return all[userId] || [];
    } catch {
      return [];
    }
  },

  updateNotificationStatus(userId, actorUid, type, status) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (all[userId]) {
        all[userId] = all[userId].map((n) => {
          if (n.actor?.uid === actorUid && (type ? n.type === type : true)) {
            return { ...n, status };
          }
          return n;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.warn('updateNotificationStatus error:', e);
    }
  },

  updateNotificationById(userId, notifId, updates) {
    if (!userId || !notifId || !updates) return;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (all[userId]) {
        all[userId] = all[userId].map((n) => {
          if (n.id === notifId) {
            return { ...n, ...updates };
          }
          return n;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }

      // Sync update to Firebase RTDB
      try {
        update(ref(database, `notifications/${userId}/${notifId}`), updates).catch((err) => {
          console.warn('Cloud updateNotificationById error:', err);
        });
      } catch (cloudErr) {
        console.warn('Firebase notification update notice:', cloudErr);
      }

      window.dispatchEvent(new CustomEvent('pulse_notifications_updated'));
    } catch (e) {
      console.warn('updateNotificationById error:', e);
    }
  },

  formatRelativeTime(timestamp, lang = 'ar') {
    if (!timestamp) return lang === 'ar' ? 'الآن' : 'Just now';
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - date.getTime();
    if (diffMs < 0 || diffMs < 45000) {
      return lang === 'ar' ? 'الآن' : 'Just now';
    }
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (lang === 'ar') {
      if (diffMins < 60) return `منذ ${diffMins} د`;
      if (diffHours < 24) return `منذ ${diffHours} س`;
      if (diffDays < 7) return `منذ ${diffDays} ي`;
      if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    } else {
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  },

  addNotification({ targetUserId, type, actor, text, preview, link, postId = null, audioUrl = null, hasVoice = false, status = null, requestId = null, sessionId = null, device = null, location = null, ip = null, ...rest }) {
    if (!targetUserId || !actor) return null;
    // Strict PULSE Official rule: Never notify oneself!
    if (targetUserId === actor.uid) return null;

    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!all[targetUserId]) all[targetUserId] = [];

      const timestamp = new Date().toISOString();
      const newNotif = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type, // 'voice_listen' | 'reply' | 'like' | 'repost' | 'mention' | 'system' | 'follow_request' | 'security_login_alert'
        status: status || (type === 'follow_request' || type === 'security_login_alert' ? 'pending' : null),
        requestId,
        sessionId,
        device,
        location,
        ip,
        ...rest,
        actor: {
          uid: actor.uid,
          displayName: actor.displayName,
          username: actor.username,
          avatar: actor.avatar,
          isVerified: actor.isVerified || false,
          isFounder: actor.isFounder || false,
          isAI: actor.isAI || (actor.uid === 'user_1789917894698') || false
        },
        text,
        preview: preview || '',
        link: link || null,
        postId,
        audioUrl,
        hasVoice: Boolean(hasVoice || audioUrl),
        time: this.formatRelativeTime(timestamp),
        createdAt: timestamp,
        read: false
      };

      all[targetUserId].unshift(newNotif);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

      // 1. Dispatch local event for Top Push Toast Banner ONLY IF active user on this client IS the target recipient
      let currentSessionUid = null;
      try {
        const sess = JSON.parse(localStorage.getItem('pulse_session_user') || '{}');
        currentSessionUid = sess?.uid;
      } catch {}

      if (currentSessionUid && currentSessionUid === targetUserId && currentSessionUid !== actor.uid) {
        window.dispatchEvent(
          new CustomEvent('pulse_push_notification', {
            detail: newNotif
          })
        );
        this.playNotificationSound();
        this.triggerSystemNotification(newNotif);
      }

      // 2. Realtime Firebase Cloud Push Queue (Cross-Device Delivery to target recipient)
      try {
        set(ref(database, `notifications/${targetUserId}/${newNotif.id}`), newNotif).catch((err) => {
          console.warn('Firebase notification push notice:', err);
        });
      } catch (cloudErr) {
        console.warn('Cloud sync error:', cloudErr);
      }

      return newNotif;
    } catch (e) {
      console.error('Error adding notification:', e);
    }
  },

  saveToLocalCache(userId, notif) {
    if (!userId || !notif || !notif.id) return;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!all[userId]) all[userId] = [];
      if (!all[userId].some((n) => n.id === notif.id)) {
        all[userId].unshift(notif);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.warn('saveToLocalCache notice:', e);
    }
  },

  // Listen for Realtime Cloud Notifications sent from other users/devices + Smart Local Watchdog
  subscribeToCloudNotifications(userId) {
    if (!userId) return () => {};

    const DISPATCHED_KEY = 'pulse_dispatched_system_notifs_v1';
    const getDispatchedSet = () => {
      try {
        const list = JSON.parse(localStorage.getItem(DISPATCHED_KEY) || '[]');
        return new Set(Array.isArray(list) ? list : []);
      } catch {
        return new Set();
      }
    };

    const markDispatched = (id) => {
      if (!id) return;
      try {
        const set = getDispatchedSet();
        set.add(id);
        const arr = Array.from(set).slice(-200);
        localStorage.setItem(DISPATCHED_KEY, JSON.stringify(arr));
      } catch {}
    };

    let isInitialFetchDone = false;

    // Dispatch helper
    const processNotification = (notif) => {
      if (!notif || !notif.id) return;
      this.saveToLocalCache(userId, notif);

      const dispatched = getDispatchedSet();
      if (!dispatched.has(notif.id) && notif.actor?.uid !== userId) {
        markDispatched(notif.id);
        this.playNotificationSound();
        this.triggerSystemNotification(notif);
        window.dispatchEvent(
          new CustomEvent('pulse_push_notification', {
            detail: notif
          })
        );
      }
    };

    let fbUnsubscribe = () => {};
    let watchdogTimer = null;
    let appStateHandle = null;

    try {
      const notifsRef = ref(database, `notifications/${userId}`);
      const recentQuery = query(notifsRef, orderByKey(), limitToLast(25));

      // 1. Initial snapshot seed so existing past notifications aren't spammed at initial login
      get(recentQuery).then((snapshot) => {
        if (!localStorage.getItem(DISPATCHED_KEY)) {
          const initialIds = [];
          if (snapshot.exists()) {
            snapshot.forEach((childSnap) => {
              const val = childSnap.val();
              if (val?.id) initialIds.push(val.id);
            });
          }
          localStorage.setItem(DISPATCHED_KEY, JSON.stringify(initialIds));
        }
        isInitialFetchDone = true;
      }).catch((err) => {
        console.warn('Initial notifications check notice:', err);
        isInitialFetchDone = true;
      });

      // 2. Realtime WebSocket listener
      fbUnsubscribe = onChildAdded(
        recentQuery,
        (snapshot) => {
          try {
            const notif = snapshot.val();
            // If already seeded or incoming new event
            if (isInitialFetchDone) {
              processNotification(notif);
            } else {
              // During initial load, just cache locally
              if (notif) this.saveToLocalCache(userId, notif);
            }
          } catch (itemErr) {
            console.warn('Notification processing notice:', itemErr);
          }
        },
        (error) => {
          console.warn('Firebase notification listener notice (safe):', error?.message || error);
        }
      );

      // 3. Periodic Smart Watchdog (Every 10 seconds): Scans for new notifications even if WebSocket dropped
      const runWatchdogCheck = async () => {
        try {
          const snap = await get(recentQuery);
          if (snap.exists()) {
            snap.forEach((childSnap) => {
              const notif = childSnap.val();
              if (notif && notif.id) {
                const dispatched = getDispatchedSet();
                if (!dispatched.has(notif.id) && notif.actor?.uid !== userId) {
                  processNotification(notif);
                }
              }
            });
          }
        } catch (e) {
          // ignore network hiccups
        }
      };

      // Bandwidth-optimized: eliminated 10s redundant polling in favor of onChildAdded WebSocket and visibility wakeup
      // watchdogTimer = null;

      // 4. Lifecycle WAKEUP: When user returns to app or wakes screen, immediately check
      const handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          runWatchdogCheck();
        }
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      // Capacitor Native AppState listener
      if (Capacitor.isNativePlatform()) {
        try {
          App.addListener('appStateChange', (state) => {
            if (state.isActive) {
              runWatchdogCheck();
            }
          }).then((handle) => {
            appStateHandle = handle;
          });
        } catch {}
      }

      return () => {
        try {
          if (typeof fbUnsubscribe === 'function') fbUnsubscribe();
          if (watchdogTimer) clearInterval(watchdogTimer);
          if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          }
          if (appStateHandle && typeof appStateHandle.remove === 'function') {
            appStateHandle.remove();
          }
        } catch {}
      };
    } catch (e) {
      console.warn('subscribeToCloudNotifications fallback:', e);
      return () => {};
    }
  },

  // Subtle notification chime (silenced per user architecture guidelines)
  playNotificationSound() {
    // Silent no-op
  },

  // Initialize native background system notification channels & permissions
  async initSystemNotifications() {
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.checkPermissions();
        // Channels can be created in advance without interrupting user

        // Heads-up high priority channels (Android 8.0+)
        await LocalNotifications.createChannel({
          id: 'pulse_notifications',
          name: 'PULSE Notifications',
          description: 'All PULSE interactions and social updates',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#FFFFFF'
        });

        await LocalNotifications.createChannel({
          id: 'pulse_realtime',
          name: 'PULSE Realtime Alerts',
          description: 'Instant alerts for voice listens, replies, mentions and likes',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#FFFFFF'
        });

        // Keep listeners managed by fcmService / notificationService
        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          const extra = notificationAction.notification?.extra;
          if (extra?.postId) {
            window.dispatchEvent(
              new CustomEvent('pulse_open_post', {
                detail: { postId: extra.postId }
              })
            );
          } else if (extra?.conversationId) {
            window.dispatchEvent(
              new CustomEvent('pulse_open_chat', {
                detail: { conversationId: extra.conversationId }
              })
            );
          }
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        // Web notifications checked passively
      }
    } catch (err) {
      console.warn('System notifications init notice:', err);
    }
  },

  // Trigger real native OS notification banner / shade popup on user's device
  async triggerSystemNotification(notif) {
    if (!notif) return;
    const isPaused = localStorage.getItem('pulse_notifs_paused') === 'true';
    if (isPaused) return;

    const actorName = notif.actor?.displayName || (notif.actor?.username ? `@${notif.actor.username}` : 'مستخدم');
    const cleanPreview = (notif.preview || notif.text || '')
      .replace(/^[\s"\'“”«»`]+|[\s"\'“”«»`]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    let title = 'PULSE';
    let body = cleanPreview || notif.text || 'إشعار جديد في PULSE';
    let actionTypeId = 'PULSE_VIEW_ONLY';

    switch (notif.type) {
      case 'reply':
        title = `تعليق جديد من ${actorName}`;
        body = cleanPreview || 'علّق على نبضتك';
        actionTypeId = 'PULSE_REPLY_ACTIONS';
        break;
      case 'mention':
        title = `إشارة جديدة من ${actorName}`;
        body = cleanPreview || 'أشار إليك في إحدى النبضات';
        actionTypeId = 'PULSE_REPLY_ACTIONS';
        break;
      case 'like':
        title = `إعجاب جديد من ${actorName}`;
        body = cleanPreview || 'أُعجب بنبضتك';
        actionTypeId = 'PULSE_VIEW_ONLY';
        break;
      case 'repost':
        title = `إعادة نشر من ${actorName}`;
        body = cleanPreview || 'أعاد نشر نبضتك مع متابعيه';
        actionTypeId = 'PULSE_VIEW_ONLY';
        break;
      case 'voice_listen':
        title = `استماع صوتي من ${actorName}`;
        body = 'استمع إلى التسجيل الصوتي كاملاً';
        actionTypeId = 'PULSE_VIEW_ONLY';
        break;
      case 'message':
        title = `رسالة خاصة من ${actorName}`;
        body = cleanPreview || 'أرسل لك رسالة خاصة جديدة';
        actionTypeId = 'PULSE_DM_ACTIONS';
        break;
      default:
        title = actorName ? `تفاعل من ${actorName}` : 'PULSE';
        body = cleanPreview || notif.text || 'إشعار جديد';
        actionTypeId = notif.postId ? 'PULSE_REPLY_ACTIONS' : (notif.conversationId ? 'PULSE_DM_ACTIONS' : 'PULSE_VIEW_ONLY');
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Double check permissions
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          return; // Skip native alert silently if permission not granted yet
        }

        // Trigger immediate heads-up notification (No AlarmManager delay to prevent SecurityException on Android 12+)
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 2147483647),
              title,
              body,
              channelId: 'pulse_notifications',
              smallIcon: 'ic_stat_pulse',
              iconColor: '#FFFFFF',
              actionTypeId,
              autoCancel: true,
              ongoing: false,
              extra: {
                postId: notif.postId || null,
                conversationId: notif.conversationId || null,
                type: notif.type || 'system'
              }
            }
          ]
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const nativeNotif = new Notification(title, {
          body,
          icon: '/pulse_logo_clean.png'
        });
        nativeNotif.onclick = () => {
          window.focus();
          if (notif.postId) {
            window.dispatchEvent(
              new CustomEvent('pulse_open_post', {
                detail: { postId: notif.postId }
              })
            );
          }
        };
      }
    } catch (err) {
      console.warn('Trigger system notification notice:', err);
    }
  },

  async deleteNotification(userId, notifId) {
    if (!userId || !notifId) return;
    try {
      // 1. Remove from local cache
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (all[userId]) {
        all[userId] = all[userId].filter((n) => n.id !== notifId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
      // 2. Remove from Firebase RTDB
      const { remove } = await import('firebase/database');
      const notifRef = ref(database, `notifications/${userId}/${notifId}`);
      await remove(notifRef).catch(console.warn);
    } catch (e) {
      console.warn('deleteNotification error:', e);
    }
  },

  // Interactive Test Notification method to verify real phone screen alert
  async testNativeNotification(lang = 'ar', currentUser = null) {
    const isAr = lang === 'ar';
    const testNotif = {
      id: 'test_' + Date.now(),
      type: 'test',
      actor: {
        displayName: isAr ? 'فريق نبض PULSE' : 'PULSE Team',
        username: 'pulse',
        avatar: ''
      },
      text: isAr ? 'إشعار نظام حقيقي على هاتفك' : 'Real system notification on your phone',
      preview: isAr
        ? 'نظام الإشعارات متصل بنجاح ويعمل على شريط الإشعارات وشاشة القفل بنقرة واحدة.'
        : 'Notifications are connected and working on your lock screen and status bar.'
    };

    this.playNotificationSound();
    await this.initSystemNotifications();
    await this.triggerSystemNotification(testNotif);
    window.dispatchEvent(
      new CustomEvent('pulse_push_notification', {
        detail: testNotif
      })
    );

    // Also dispatch real Google Cloud FCM Push to user's device via RTDB
    if (currentUser?.uid) {
      try {
        set(ref(database, `notifications/${currentUser.uid}/${testNotif.id}`), {
          ...testNotif,
          createdAt: new Date().toISOString()
        }).catch((err) => {
          console.warn('Test notification cloud sync notice:', err);
        });
      } catch (cloudErr) {
        console.warn('Cloud test dispatch notice:', cloudErr);
      }
    }

    return true;
  },

  getUnreadCount(userId) {
    if (!userId) return 0;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const list = all[userId] || [];
      return list.filter((n) => !n.read).length;
    } catch {
      return 0;
    }
  },

  markAllAsRead(userId) {
    if (!userId) return;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (all[userId]) {
        all[userId] = all[userId].map((n) => ({ ...n, read: true }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
      window.dispatchEvent(new CustomEvent('pulse_notifications_read', { detail: { userId } }));
    } catch (e) {
      console.warn('markAllAsRead error:', e);
    }
  },

  subscribeToUnreadCount(userId, callback) {
    if (!userId || typeof callback !== 'function') return () => {};

    // Initial count
    callback(this.getUnreadCount(userId));

    // Listen to local read / update events
    const handleUpdate = () => {
      callback(this.getUnreadCount(userId));
    };

    window.addEventListener('pulse_notifications_read', handleUpdate);
    window.addEventListener('pulse_notifications_updated', handleUpdate);
    window.addEventListener('pulse_push_notification', handleUpdate);

    // Also listen to RTDB notifications for live unread updates
    let fbUnsubscribe = () => {};
    try {
      const notifsRef = ref(database, `notifications/${userId}`);
      fbUnsubscribe = onValue(notifsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const localAll = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          const localList = localAll[userId] || [];
          const localMap = new Map(localList.map((n) => [n.id, n]));

          Object.entries(val).forEach(([k, item]) => {
            if (item && item.id) {
              if (!localMap.has(item.id)) {
                localMap.set(item.id, { ...item, read: false });
              }
            }
          });

          const merged = Array.from(localMap.values()).sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          );
          localAll[userId] = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localAll));

          const unreadCount = merged.filter((n) => !n.read).length;
          callback(unreadCount);
        } else {
          callback(this.getUnreadCount(userId));
        }
      });
    } catch (e) {
      console.warn('subscribeToUnreadCount RTDB error:', e);
    }

    return () => {
      window.removeEventListener('pulse_notifications_read', handleUpdate);
      window.removeEventListener('pulse_notifications_updated', handleUpdate);
      window.removeEventListener('pulse_push_notification', handleUpdate);
      if (typeof fbUnsubscribe === 'function') fbUnsubscribe();
    };
  }
};

