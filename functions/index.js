/**
 * ============================================================================
 * PULSE Social Platform - Serverless Cloud Functions (FCM Push Service)
 * Triggered automatically on Google Cloud infrastructure when events occur in RTDB.
 * ============================================================================
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const NOTIFICATION_CHANNEL_ID = 'pulse_notifications';

/**
 * Trigger: On New In-App Notification (Like, Reply, Voice Listen, Mention, Repost)
 * Path: /notifications/{userId}/{notifId}
 */
exports.onNotificationCreated = functions.database
  .ref('/notifications/{userId}/{notifId}')
  .onCreate(async (snapshot, context) => {
    const notifData = snapshot.val();
    const targetUserId = context.params.userId;

    if (!notifData || !targetUserId) return null;

    // Never notify oneself
    if (notifData.actor && notifData.actor.uid === targetUserId) {
      return null;
    }

    try {
      // 1. Get recipient FCM token
      const tokenSnap = await admin.database().ref(`/users/${targetUserId}/fcmToken`).once('value');
      const fcmToken = tokenSnap.val();

      if (!fcmToken) {
        console.log(`[FCM Notice] No token registered for user: ${targetUserId}`);
        return null;
      }

      const actorName = notifData.actor?.displayName || `@${notifData.actor?.username}` || 'شخص ما';
      let title = 'PULSE';
      let body = notifData.text || 'لديك إشعار جديد في PULSE';

      switch (notifData.type) {
        case 'like':
          title = `❤️ إعجاب جديد من ${actorName}`;
          body = notifData.preview ? `أعجب بنبضتك: "${notifData.preview}"` : `أعجب بنبضتك الفكرية`;
          break;
        case 'reply':
          title = `💬 رد جديد من ${actorName}`;
          body = notifData.preview ? `رد على نبضتك: "${notifData.preview}"` : `أضاف رداً جديداً على نبضتك`;
          break;
        case 'voice_listen':
          title = `🎙️ استماع صوتي من ${actorName}`;
          body = `استمع لنبضتك الصوتية بالكامل`;
          break;
        case 'repost':
          title = `🔁 إعادة نشر من ${actorName}`;
          body = `قام بإعادة نشر نبضتك لجمهوره`;
          break;
        case 'mention':
          title = `🔔 إشارة لك من ${actorName}`;
          body = notifData.preview || `أشار إليك في إحدى النبضات`;
          break;
      }

      // 2. Dispatch High-Priority Push Notification
      const message = {
        token: fcmToken,
        notification: {
          title: title,
          body: body
        },
        data: {
          type: String(notifData.type || 'notification'),
          postId: String(notifData.postId || ''),
          actorName: String(notifData.actor?.displayName || ''),
          actorUsername: String(notifData.actor?.username || ''),
          actorAvatar: String(notifData.actor?.avatar || ''),
          click_action: 'FCM_PLUGIN_ACTIVITY',
          timestamp: String(Date.now())
        },
        android: {
          priority: 'high',
          notification: {
            channelId: NOTIFICATION_CHANNEL_ID,
            sound: 'default',
            color: '#000000',
            visibility: 'public',
            priority: 'high',
            defaultVibrateTimings: true,
            defaultLightSettings: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`[FCM Success] Sent notification to ${targetUserId}: ${response}`);
      return response;
    } catch (err) {
      console.error(`[FCM Error] Failed sending push to ${targetUserId}:`, err);
      return null;
    }
  });

/**
 * Trigger: On New Direct Message
 * Path: /messages/{conversationId}/{messageId}
 */
exports.onMessageCreated = functions.database
  .ref('/messages/{conversationId}/{messageId}')
  .onCreate(async (snapshot, context) => {
    const msgData = snapshot.val();
    const conversationId = context.params.conversationId;

    if (!msgData || !msgData.recipientId) return null;

    const recipientId = msgData.recipientId;
    const senderId = msgData.senderId;

    if (recipientId === senderId) return null;

    try {
      const tokenSnap = await admin.database().ref(`/users/${recipientId}/fcmToken`).once('value');
      const fcmToken = tokenSnap.val();

      if (!fcmToken) return null;

      const senderName = msgData.senderName || 'مستخدم في PULSE';
      const title = `💬 رسالة خاصة من ${senderName}`;
      const body = msgData.hasVoice ? '🎙️ أرسل لك تسجيلاً صوتياً' : (msgData.text || 'أرسل لك رسالة جديدة');

      const message = {
        token: fcmToken,
        notification: {
          title: title,
          body: body
        },
        data: {
          type: 'message',
          conversationId: String(conversationId),
          senderId: String(senderId),
          actorName: String(senderName),
          click_action: 'FCM_PLUGIN_ACTIVITY',
          timestamp: String(Date.now())
        },
        android: {
          priority: 'high',
          notification: {
            channelId: NOTIFICATION_CHANNEL_ID,
            sound: 'default',
            color: '#000000',
            visibility: 'public',
            priority: 'high',
            defaultVibrateTimings: true,
            defaultLightSettings: true
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`[FCM Success] Sent message alert to ${recipientId}: ${response}`);
      return response;
    } catch (err) {
      console.error(`[FCM Error] Failed sending message push:`, err);
      return null;
    }
  });
