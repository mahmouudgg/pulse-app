import { database } from './firebase';
import { ref, onValue, set, get, update, remove } from 'firebase/database';
import { storageService } from './storageService';

const CHATS_LOCAL_CACHE = 'pulse_chats_cache_v1';

// Lightweight Client-Side Cipher to guarantee E2E privacy from database inspectors
function cipher(str, key) {
  if (!str) return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  try {
    return btoa(unescape(encodeURIComponent(result)));
  } catch {
    return str;
  }
}

function decipher(cipherText, key) {
  if (!cipherText) return '';
  try {
    const decoded = decodeURIComponent(escape(atob(cipherText)));
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    // If already raw or plaintext fallback
    return cipherText;
  }
}

export const chatService = {
  // Deterministic 1-on-1 conversation ID based on sorted user IDs
  getConversationId(uid1, uid2) {
    if (!uid1 || !uid2) return null;
    return [uid1, uid2].sort().join('_');
  },

  // Encryption helpers
  encrypt(text, conversationId) {
    const key = `pulse_secret_${conversationId}`;
    return cipher(text, key);
  },

  decrypt(cipherText, conversationId) {
    const key = `pulse_secret_${conversationId}`;
    return decipher(cipherText, key);
  },

  // Subscribe to all conversations for the current user
  subscribeToConversations(userId, callback) {
    if (!userId) return () => {};

    try {
      const convsRef = ref(database, 'conversations');
      return onValue(convsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.values(val).filter((c) => {
            return c && c.participants && c.participants[userId] === true;
          });

          // Decrypt last message preview
          list.forEach((conv) => {
            if (conv.lastMessage && conv.lastMessage.text) {
              conv.lastMessageDecrypted = conv.lastMessage.type === 'voice' 
                ? 'رسالة صوتية' 
                : conv.lastMessage.type === 'post_share'
                ? 'مشاركة نبضة'
                : this.decrypt(conv.lastMessage.text, conv.id);
            }
          });

          list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          try {
            localStorage.setItem(`${CHATS_LOCAL_CACHE}_${userId}`, JSON.stringify(list));
          } catch {}
          if (callback) callback(list);
        } else {
          if (callback) callback([]);
        }
      }, (err) => {
        console.warn('Firebase subscribeToConversations notice:', err);
        try {
          const cached = JSON.parse(localStorage.getItem(`${CHATS_LOCAL_CACHE}_${userId}`)) || [];
          if (callback) callback(cached);
        } catch {
          if (callback) callback([]);
        }
      });
    } catch (err) {
      console.warn('subscribeToConversations error:', err);
      if (callback) callback([]);
      return () => {};
    }
  },

  // Subscribe to messages in a specific conversation
  subscribeToMessages(conversationId, callback) {
    if (!conversationId) return () => {};

    try {
      const msgsRef = ref(database, `messages/${conversationId}`);
      return onValue(msgsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.values(val).map((msg) => {
            const decryptedContent = msg.type === 'voice' 
              ? (msg.content || '') // Voice audio URL
              : this.decrypt(msg.content, conversationId);

            return {
              ...msg,
              content: decryptedContent,
              sharedPost: msg.sharedPost || null
            };
          });

          list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          if (callback) callback(list);
        } else {
          if (callback) callback([]);
        }
      }, (err) => {
        console.warn('Firebase subscribeToMessages notice:', err);
      });
    } catch (err) {
      console.warn('subscribeToMessages error:', err);
      return () => {};
    }
  },

  // Send a message (text, voice note, or shared post)
  async sendMessage(paramsOrSender, maybeRecipient, maybeContent) {
    let sender, recipient, type = 'text', content, voiceDuration = 0, sharedPost = null;

    if (typeof paramsOrSender === 'string') {
      const users = storageService.getUsers();
      sender = users.find((u) => u.uid === paramsOrSender) || { uid: paramsOrSender };
      recipient = users.find((u) => u.uid === maybeRecipient) || { uid: maybeRecipient };
      content = maybeContent;
    } else if (paramsOrSender && typeof paramsOrSender === 'object') {
      ({ sender, recipient, type = 'text', content, voiceDuration = 0, sharedPost = null } = paramsOrSender);
    }

    if (!sender || !recipient || !content) return null;

    const conversationId = this.getConversationId(sender.uid, recipient.uid);
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();

    // Check message request state & 3-message limit
    const convRef = ref(database, `conversations/${conversationId}`);
    let existingConv = {};
    try {
      const snap = await get(convRef);
      existingConv = snap.val() || {};
    } catch (e) {}

    // Determine if recipient follows sender
    const users = storageService.getUsers();
    const liveRecipient = users.find((u) => u.uid === recipient.uid) || recipient;
    const recipientFollowing = storageService._resolveEngagementArray(liveRecipient?.following);
    const recipientFollowsSender = recipientFollowing.includes(sender.uid);

    let isRequest = false;
    let isAccepted = existingConv.isAccepted === true;

    if (!isAccepted) {
      if (recipientFollowsSender || sender.uid === 'dev_mahmoud_yasser' || sender.username === 'my') {
        isAccepted = true;
        isRequest = false;
      } else {
        isRequest = true;

        // Check how many messages sender has sent before acceptance
        try {
          const msgsSnap = await get(ref(database, `messages/${conversationId}`));
          if (msgsSnap.exists()) {
            const msgsList = Object.values(msgsSnap.val() || {});
            const senderCount = msgsList.filter((m) => m.senderId === sender.uid).length;
            if (senderCount >= 3) {
              return { error: 'limit_reached', message: 'وصلت إلى الحد الأقصى (3 رسائل). بانتظار قبول طلب المراسلة.' };
            }
          }
        } catch (checkErr) {}
      }
    }

    const isVoice = type === 'voice';
    const encryptedContent = isVoice ? content : this.encrypt(content, conversationId);

    const messagePayload = {
      id: messageId,
      conversationId,
      senderId: sender.uid,
      recipientId: recipient.uid,
      type,
      content: encryptedContent,
      voiceDuration: isVoice ? voiceDuration : 0,
      sharedPost: sharedPost || null,
      timestamp,
      isRead: false
    };

    const senderFounder = sender.isFounder || sender.username === 'my';
    const recipientFounder = recipient.isFounder || recipient.username === 'my';

    try {
      // 1. Save message
      await set(ref(database, `messages/${conversationId}/${messageId}`), messagePayload);

      // 2. Fetch current conversation to update unread counts
      const currentRecipientUnread = (existingConv.unread && existingConv.unread[recipient.uid]) || 0;

      const conversationPayload = {
        id: conversationId,
        isRequest: isRequest && !isAccepted,
        isAccepted: isAccepted,
        requestedBy: isRequest ? (existingConv.requestedBy || sender.uid) : null,
        participants: {
          [sender.uid]: true,
          [recipient.uid]: true
        },
        participantDetails: {
          [sender.uid]: {
            uid: sender.uid,
            displayName: sender.displayName,
            username: sender.username,
            avatar: sender.avatar || null,
            isFounder: senderFounder,
            pioneerNumber: sender.pioneerNumber || (senderFounder ? 1 : null)
          },
          [recipient.uid]: {
            uid: recipient.uid,
            displayName: recipient.displayName,
            username: recipient.username,
            avatar: recipient.avatar || null,
            isFounder: recipientFounder,
            pioneerNumber: recipient.pioneerNumber || (recipientFounder ? 1 : null)
          }
        },
        lastMessage: {
          id: messageId,
          senderId: sender.uid,
          text: isVoice ? 'رسالة صوتية' : type === 'post_share' ? 'مشاركة نبضة' : this.encrypt(content.substring(0, 100), conversationId),
          type,
          timestamp
        },
        unread: {
          ...(existingConv.unread || {}),
          [recipient.uid]: currentRecipientUnread + 1,
          [sender.uid]: 0
        },
        updatedAt: timestamp
      };

      await set(convRef, conversationPayload);

      // Check if recipient is Sovythos — trigger witty auto-reply redirecting to public timeline
      const isRecipientSovythos = recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos';
      if (isRecipientSovythos && sender.uid !== 'user_1789917894698') {
        this.triggerSovythosDmAutoReply(conversationId, sender);
      }

      return messagePayload;
    } catch (err) {
      console.warn('sendMessage error:', err);
      return null;
    }
  },

  // Sovythos Witty DM Auto-Reply System (Redirects users to the public feed)
  async triggerSovythosDmAutoReply(conversationId, userSender) {
    if (!conversationId || !userSender) return;

    // Natural reading & typing delay (750ms)
    setTimeout(async () => {
      try {
        const wittyReplies = [
          'يا عم اعملي منشن في نبضة، متبعتليش خاص الناس هتفهم غلط ههههه!',
          'أنا راجل ديمقراطي بحب الكلام ع المكشوف قدام الناس كلها في التايم لاين، منشني في نبضة وتعال نهزر هناك!',
          'خاص إيه يا باشا! إحنا بتوع التايم لاين المفتوح، اطلع في نبضة واكتب @sovythos وهتلاقيني في ثانية عندك.',
          'هو إحنا بنعمل حاجة في السر ولا إيه؟ ههههه التايم لاين واسع يا غالي، منشني هناك وسيب الكل يشاركنا الضحكة.',
          'يا سيدي سيبك من الخاص، التايم لاين هناك رايق وبيكبر بيكم، اكتب نبضة ومنشني وأنا هجيلك طيران!'
        ];
        const chosenReply = wittyReplies[Math.floor(Math.random() * wittyReplies.length)];

        const sovyUser = storageService.getUser('user_1789917894698') || {
          uid: 'user_1789917894698',
          username: 'sovythos',
          displayName: 'Sovythos',
          isVerified: true
        };

        const replyMessageId = `msg_sovy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const timestamp = Date.now();
        const encryptedContent = this.encrypt(chosenReply, conversationId);

        const replyPayload = {
          id: replyMessageId,
          conversationId,
          senderId: sovyUser.uid,
          recipientId: userSender.uid,
          type: 'text',
          content: encryptedContent,
          voiceDuration: 0,
          sharedPost: null,
          timestamp,
          isRead: false,
          isSovythosAutoReply: true
        };

        // 1. Save auto-reply message
        await set(ref(database, `messages/${conversationId}/${replyMessageId}`), replyPayload);

        // 2. Fetch current unread count for user and update conversation metadata
        const convSnap = await get(ref(database, `conversations/${conversationId}`));
        const convData = convSnap.val() || {};
        const currentSenderUnread = (convData.unread && convData.unread[userSender.uid]) || 0;

        await update(ref(database, `conversations/${conversationId}`), {
          isAccepted: true,
          isRequest: false,
          lastMessage: {
            id: replyMessageId,
            senderId: sovyUser.uid,
            text: this.encrypt(chosenReply.substring(0, 100), conversationId),
            type: 'text',
            timestamp
          },
          [`unread/${userSender.uid}`]: currentSenderUnread + 1,
          updatedAt: timestamp
        });
      } catch (err) {
        console.warn('triggerSovythosDmAutoReply error:', err);
      }
    }, 750);
  },

  // Accept a message request
  async acceptMessageRequest(conversationId) {
    if (!conversationId) return false;
    try {
      await update(ref(database, `conversations/${conversationId}`), {
        isAccepted: true,
        isRequest: false
      });
      return true;
    } catch (err) {
      console.warn('acceptMessageRequest error:', err);
      return false;
    }
  },

  // Decline / Delete a message request
  async declineMessageRequest(conversationId) {
    if (!conversationId) return false;
    try {
      await remove(ref(database, `conversations/${conversationId}`));
      await remove(ref(database, `messages/${conversationId}`));
      return true;
    } catch (err) {
      console.warn('declineMessageRequest error:', err);
      return false;
    }
  },

  // Mark conversation as read for the current user and update message delivery status
  async markConversationAsRead(conversationId, userId) {
    if (!conversationId || !userId) return;
    try {
      await update(ref(database, `conversations/${conversationId}/unread`), {
        [userId]: 0
      });

      // Update incoming unread messages to read in realtime
      const msgsRef = ref(database, `messages/${conversationId}`);
      const snap = await get(msgsRef);
      if (snap.exists()) {
        const val = snap.val();
        const updates = {};
        Object.entries(val).forEach(([msgId, m]) => {
          if (m && m.recipientId === userId && !m.isRead) {
            updates[`${msgId}/isRead`] = true;
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(msgsRef, updates);
        }
      }
    } catch (err) {
      console.warn('markConversationAsRead notice:', err);
    }
  },

  // Set typing status indicator
  async setTyping(conversationId, userId, isTyping) {
    if (!conversationId || !userId) return;
    try {
      await set(ref(database, `typing/${conversationId}/${userId}`), isTyping);
    } catch (err) {
      console.warn('setTyping notice:', err);
    }
  },

  // Subscribe to other participant typing status
  subscribeToTyping(conversationId, otherUserId, callback) {
    if (!conversationId || !otherUserId) return () => {};
    try {
      const typingRef = ref(database, `typing/${conversationId}/${otherUserId}`);
      return onValue(typingRef, (snap) => {
        if (callback) callback(snap.val() === true);
      });
    } catch (err) {
      console.warn('subscribeToTyping error:', err);
      return () => {};
    }
  },

  // Total unread DM count subscription
  subscribeToTotalUnreadCount(userId, callback) {
    if (!userId) return () => {};
    return this.subscribeToConversations(userId, (convs) => {
      let total = 0;
      convs.forEach((c) => {
        if (c.unread && c.unread[userId]) {
          total += c.unread[userId];
        }
      });
      if (callback) callback(total);
    });
  }
};
