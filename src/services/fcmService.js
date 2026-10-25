import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { storageService } from './storageService';

/**
 * PULSE Official Standard FCM (Firebase Cloud Messaging) Service for PULSE
 * Project Number / Sender ID: 455923436884
 * Handles native push notifications, background lock screen delivery, token registration,
 * and Android drawer action buttons (Direct inline reply & View).
 * 
 * STRICT ZERO EMOJIS.
 */
export const fcmService = {
  isInitialized: false,
  currentToken: null,

  async init(currentUser) {
    if (!currentUser?.uid) return;
    if (!Capacitor.isNativePlatform()) {
      console.log('FCM: Web platform detected - using native Web Notifications and In-App chimes');
      this.initWebPermissions();
      return;
    }

    try {
      // 1. Create High-Priority Notification Channels for Android Lockscreen & Heads-up
      await this.createNotificationChannel();

      // 2. Register Native Action Types (Interactive Buttons in Android System Drawer)
      await this.registerActionTypes();

      // 3. Check System Push Permissions (Contextual / On-Demand: do not barrage user on cold launch)
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission not yet granted. Will be requested on demand.');
        return;
      }

      // 4. Attach Listeners Before Registering
      await PushNotifications.removeAllListeners();
      await LocalNotifications.removeAllListeners();

      PushNotifications.addListener('registration', (token) => {
        console.log('FCM Token successfully acquired:', token.value);
        this.currentToken = token.value;
        storageService.saveFCMToken(currentUser.uid, token.value);
        try {
          import('./firebase').then(({ database }) => {
            import('firebase/database').then(({ ref, set }) => {
              set(ref(database, `users/${currentUser.uid}/fcmToken`), token.value).catch(console.warn);
            });
          });
        } catch {}
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.warn('FCM Registration error:', err);
      });

      // 5. Register Device with Firebase Cloud Messaging
      await PushNotifications.register();

      // 6. Handle action performed from Local Notifications (Interactive Drawer Buttons)
      LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
        console.log('Local Notification action performed:', notificationAction);
        const { actionId, inputValue, notification } = notificationAction;
        const extra = notification?.extra || {};

        // A. Direct Inline Reply from Android notification shade
        if (actionId === 'reply' && inputValue && extra.postId) {
          try {
            await storageService.createComment({
              postId: extra.postId,
              content: inputValue,
              authorId: currentUser.uid,
              author: currentUser
            });
            window.dispatchEvent(
              new CustomEvent('pulse_open_post', {
                detail: { postId: extra.postId }
              })
            );
          } catch (replyErr) {
            console.warn('Notification direct reply failed:', replyErr);
          }
          return;
        }

        // B. Direct Inline DM Reply from Android notification shade
        if (actionId === 'reply_dm' && inputValue && extra.conversationId) {
          try {
            await storageService.sendMessage({
              conversationId: extra.conversationId,
              text: inputValue,
              senderId: currentUser.uid,
              senderName: currentUser.displayName || currentUser.name || 'مستخدم'
            });
            window.dispatchEvent(
              new CustomEvent('pulse_open_chat', {
                detail: { conversationId: extra.conversationId }
              })
            );
          } catch (dmErr) {
            console.warn('Notification direct DM reply failed:', dmErr);
          }
          return;
        }

        // C. View Action (or notification body tap)
        if (extra.postId) {
          window.dispatchEvent(
            new CustomEvent('pulse_open_post', {
              detail: { postId: extra.postId }
            })
          );
        } else if (extra.conversationId) {
          window.dispatchEvent(
            new CustomEvent('pulse_open_chat', {
              detail: { conversationId: extra.conversationId }
            })
          );
        }
      });

      // 7. Handle incoming push notifications when app is active or foreground
      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('Push notification received foreground:', notification);
        const title = notification.title || (data.actorName ? `تفاعل من ${data.actorName}` : 'PULSE');
        const body = (notification.body || data.text || 'إشعار جديد في PULSE')
          .replace(/^[\s"\'“”«»`]+|[\s"\'“”«»`]+$/g, '')
          .trim();
        const actionTypeId = data.actionTypeId || (data.postId ? 'PULSE_REPLY_ACTIONS' : (data.conversationId ? 'PULSE_DM_ACTIONS' : 'PULSE_VIEW_ONLY'));

        // Schedule local notification with interactive system drawer buttons
        try {
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
                  postId: data.postId || null,
                  conversationId: data.conversationId || null,
                  type: data.type || 'system'
                }
              }
            ]
          });
        } catch (schedErr) {
          console.warn('Foreground notification schedule notice:', schedErr);
        }

        const detail = {
          id: notification.id || 'push_' + Date.now(),
          type: data.type || 'system',
          actor: {
            displayName: data.actorName || 'PULSE',
            username: data.actorUsername || 'pulse',
            avatar: data.actorAvatar || '',
            isVerified: data.actorVerified === 'true',
            isFounder: data.actorFounder === 'true'
          },
          text: body,
          preview: data.preview || '',
          time: 'الآن'
        };

        window.dispatchEvent(
          new CustomEvent('pulse_push_notification', {
            detail
          })
        );
      });

      // 8. Handle action performed when user taps on notification from lock screen / shade
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification tapped by user:', notification);
        const data = notification.notification?.data || {};
        if (data.postId) {
          window.dispatchEvent(
            new CustomEvent('pulse_open_post', {
              detail: { postId: data.postId }
            })
          );
        } else if (data.conversationId) {
          window.dispatchEvent(
            new CustomEvent('pulse_open_chat', {
              detail: { conversationId: data.conversationId }
            })
          );
        }
      });

      this.isInitialized = true;
    } catch (error) {
      console.warn('Error initializing FCM Push Notifications:', error);
    }
  },

  async registerActionTypes() {
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'PULSE_REPLY_ACTIONS',
            actions: [
              {
                id: 'reply',
                title: 'رد مباشر',
                input: true
              },
              {
                id: 'view',
                title: 'عرض النبضة'
              }
            ]
          },
          {
            id: 'PULSE_DM_ACTIONS',
            actions: [
              {
                id: 'reply_dm',
                title: 'رد مباشر',
                input: true
              },
              {
                id: 'view_dm',
                title: 'عرض المحادثة'
              }
            ]
          },
          {
            id: 'PULSE_VIEW_ONLY',
            actions: [
              {
                id: 'view',
                title: 'عرض'
              }
            ]
          }
        ]
      });
      console.log('FCM: System Notification Action Types registered successfully');
    } catch (err) {
      console.warn('Error registering notification action types:', err);
    }
  },

  async createNotificationChannel() {
    try {
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'pulse_notifications',
          name: 'PULSE Notifications',
          description: 'Instant alerts for voice listens, replies, likes, and mentions',
          importance: 5, // High priority (pops on screen & plays sound)
          visibility: 1, // Public on lockscreen
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#FFFFFF'
        });

        await LocalNotifications.createChannel({
          id: 'pulse_notifications',
          name: 'PULSE Notifications',
          description: 'Instant alerts for voice listens, replies, likes, and mentions',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#FFFFFF'
        });
      }
    } catch (err) {
      console.warn('Error creating notification channel:', err);
    }
  },

  initWebPermissions() {
    // Only check, do not pop up prompt on startup
    if (typeof window !== 'undefined' && 'Notification' in window) {
      console.log('Web notification permission state:', Notification.permission);
    }
  },

  async requestSystemPermissions() {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await PushNotifications.requestPermissions();
        await LocalNotifications.requestPermissions();
        if (res.receive === 'granted') {
          await PushNotifications.register();
          return true;
        }
      } catch (e) {
        console.warn('Error requesting native push permissions:', e);
      }
      return false;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }
};
