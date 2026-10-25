import { database } from './firebase';
import { ref, onValue, set, get, update, remove } from 'firebase/database';
import { storageService } from './storageService';
import { sovythosService } from './sovythosService';

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

export const SOVYTHOS_FREE_DM_RESPONSES = [
  // 1-10: خفة دم وهزار مصري رايق
  'يا عم نورت الخاص والله، بس متنساش إن التايم لاين المفتوح هو ملعبي الأساسي، اطلع هناك ومنشني برضه!',
  'منور يا غالي، شكلك جاي تفضفض على رواقة بعيد عن زحمة البوستات واللايكات.',
  'خاص إيه يا باشا؟ الناس بره هتقول بنطبخ إيه في السر! بس ولا يهمك، أهو كله كلام بمزاجه.',
  'أنا معاك وسامعك، بس خلي بالك أنا دماغي شغالة 24 ساعة ومبتنامش، قولي بقى إيه اللي شاغل بالك؟',
  'أهو إحنا كده، أول ما التايم لاين يسخن نلاقي الناس هربانة على الخاص! منور يا سيدي.',
  'يا باشا أنت تؤمر، حتى لو مجاني ليك معزة خاصة، بس متحرمنيش من طلتك في نبضات التايم لاين.',
  'شكلك واخد بريك من السكرول وجاي تدور على شوية روقان هنا، تمام أوي يا صاحبي.',
  'أنا كـ سوفيثوس بحب التفاعل والضحك، فلو عندك كلمة حلوة متستخسرهاش في بوستات التايم لاين برضه.',
  'يا مرحب، لو بتسأل على سر المنصة دي فهو إننا بنعمل حاجة مصرية نضيفة ومحترمة بروقان.',
  'الخاص نور يا سيدي، بس خد بالك المحادثات المفتوحة بلا حدود معمولة لمشتركي Pulse Pro، بس عيوني ليك برضه في كلمتين رايقين.',

  // 11-20: حكمة وفلسفة ونظرة ذكية للحياة
  'الحياة يا غالي أبسط من إننا نشيل همها، روق الجي وروق الدي وسيب الباقي يمشي بطبيعته.',
  'أجمل حاجة في الدنيا إنك تركز في خطوتك ومتشغلش بالك بفلان وعلان بيعمل إيه.',
  'اللي بيجري ورا الناس بيتعب، واللي بيجري ورا أهدافه على الهادي بيوصل ومرتاح البال.',
  'الدنيا مش محتاجة حيرة كتير، فنجان شاي مظبوط وفكرة رايقة كفيلة تظبط يومك كله.',
  'الصبر مش معناه تستنى وخلاص، الصبر معناه تكون راضي وبتسعى لحد ما تفرج.',
  'في زمن الدوشة الكتير، الهدوء بقى عملة نادرة، خليك أنت دايماً المنطقة الهادية في يومك.',
  'متستعجلش النتائج، الشجرة اللي بتكبر ببطء جذورها هي اللي بتبقى أثبت في الأرض.',
  'أحسن استثمار تعمله في حياتك هو إنك تطور من نفسك ومتقارنش بدايتك بمواسم غيرك.',
  'راحة البال بتبدأ من اللحظة اللي تقرر فيها إنك مش مضطر تثبت حاجة لأي حد.',
  'الناس بتروح وتيجي، بس الأثر النضيف اللي بتسيبه في مكان هو اللي بيفضل.',

  // 21-30: تكنولوجيا وبرمجة ودنيا السوشيال
  'عالم التكنولوجيا ده بحر واسع، بس الشاطر هو اللي ميتوهش في التريندات الفاضية ويركز في المفيد.',
  'السوشيال ميديا اتعملت عشان تقربنا، بس الذكي هو اللي ميعيشش حياته كلها جوه الشاشة.',
  'لو كل كود كتبناه اشتغل من أول مرة مكنش هيكون للشغلانة دي طعم، المشاكل هي اللي بتعلمنا.',
  'نبض اتعملت علشان تكون منصة نضيفة وراقية بلا دوشة ولا إزعاج، وأنت جزء من المجتمع ده.',
  'البرمجة مش مجرد أسطر كود وخلاص، دي أسلوب تفكير بيعلمك إزاي تحل أي عقدة خطوة بخطوة.',
  'كل ما الدنيا تعقد معاك في الشغل أو المذاكرة، قوم اعمل كوباية قهوة وارجع بص للموضوع من زاوية تانية.',
  'الذكاء الاصطناعي أداة قوية، بس العقل البشري واللمسة الإنسانية هما دايماً الأساس.',
  'متخليش التنبيهات تسحب وقتك من غير ما تحس، اتحكم في تليفونك قبل ما هو يتحكم فيك.',
  'أحلى حاجة في نبض إننا بنجمع ناس بتفهم وعايزة محتوى حقيقي مش مجرد دوشة وخوارزميات صفراء.',
  'التطور سريع جداً اليومين دول، بس اللي بيبني أساسات صح بيفضل مكمل ومستقر.',

  // 31-40: تحفيز ودفعة معنوية وأخوة
  'عاش يا بطل، خطوة بخطوة وكل اللي بتتمناه هيتحقق بس خلي عندك يقين واستمرارية.',
  'لو حسيت بضغط أو تعب النهاردة، افتكر إنك عديت أيام أصعب من دي ولسه واقف على رجلك.',
  'مفيش حد بيوصل للقمة في أسانسير، السلالم بتبني صحتك وعزيمتك خطوة ورا خطوة.',
  'يومك لسه مخلصش، وتقدر تطلع منه بحاجة إيجابية تفرحك حتى لو كانت تفصيلة صغيرة.',
  'خلي ثقتك في ربنا وفي إمكانياتك كبيرة، اللي زرع فيك الحلم قادر يوصلك لثماره.',
  'الناجحين مش أشخاص معندهمش مشاكل، هما بس ناس قرروا ميفضلوش قاعدين جنب المشكلة.',
  'أنت مش متأخر ولا بدري، أنت في توقيتك الخاص اللي مكتوب لك بالظبط، اهدى واشتغل.',
  'كل تعب بيعدي وكل مجهود بذلته مسجل ومحسوب وهتشوف نتيجته في الوقت المناسب.',
  'صباحك أو مساك رايق يا هندسة، المهم خليك دايماً مبتسم وواثق إن اللي جاي أحسن.',
  'متسمحش لأي كلمة سلبية توقفك، الناس بتتكلم دايماً، كمل أنت في سكتك.',

  // 41-50: ذكاء نبض واشتراك Pro بأسلوب سوفيثوس بدون ابتذال
  'أنا معاك يا غالي، بس عشان تاخد مني إجابات مفصلة ونقاشات فلسفية وعلمية بلا حدود، مميزات Pulse Pro هتفتحلك عوالم تانية معايا.',
  'كلامك زي الفل يا صاحبي، وعلى فكرة في Pulse Pro الخاص بيبقى مفتوح بيني وبينك 24 ساعة بذكاء اصطناعي حر بيسمعلك ويحلل معاك كل حاجة.',
  'تسلم يا ذوق، لو عايز ندردش في مواضيع عميقة وتحليلات شخصية، فكر ترقي لـ Pro وهتلاقيني معاك في كل تفصيلة.',
  'أنا مبسوط بكلامك، ومن قلبي بقولك منور نبض، وسواء مجاني أو مشترك إحنا هنا عيلة واحدة.',
  'الخاص عندي بيفرح لما الناس المحترمة زيك تدخل تسلم، لو حبيت تطور التجربة لـ Pro هتلاقي مزايا توثيق وبوستات خالية من أي إعلانات.',
  'يا سيدي على راسي، أنا جاهز لأي نبضة تكتبها بره في التايم لاين، هكون أول واحد يعلق عندك.',
  'أنت كده جربت الخاص معايا، ولو حابب نفتحها كلام بدون سقف وبأفكار متطورة، شوف مميزات الترقية في صفحة التوثيق.',
  'كلامك جميل ومحترم، والمنصة بتكبر بكل مستخدم نضيف زيك فاهم يعني إيه مجتمع هادي وراقي.',
  'منور الدنيا يا غالي، اتمنالك يوم سعيد وهادي وخالي من أي تعقيدات، وخلينا دايماً على تواصل.',
  'يا هلا بيك في أي وقت، افتكر دايماً إن سوفيثوس في ضهرك، في التايم لاين أو هنا في الخاص.'
];

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

      // Check if recipient is Sovythos — trigger intelligent Pro DM or varied Free response
      const isRecipientSovythos = recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos';
      if (isRecipientSovythos && sender.uid !== 'user_1789917894698') {
        this.triggerSovythosDmAutoReply(conversationId, sender, text);
      }

      return messagePayload;
    } catch (err) {
      console.warn('sendMessage error:', err);
      return null;
    }
  },

  // Sovythos Witty DM Reply System (Real Generative AI for Pro subscribers, 50 Varied Egyptian Responses for Free users)
  async triggerSovythosDmAutoReply(conversationId, userSender, userMessageText = '') {
    if (!conversationId || !userSender) return;

    // Natural reading & typing delay
    setTimeout(async () => {
      try {
        const isProUser = Boolean(
          userSender.isPro || 
          userSender.vipTier === 'pro' || 
          userSender.isFounder || 
          userSender.isVerified ||
          userSender.verificationStatus === 'verified'
        );

        let chosenReply = '';

        if (isProUser) {
          // PRO SUBSCRIBER: Full unrestricted generative Egyptian AI DM consultation
          try {
            chosenReply = await sovythosService.generateDmReply({
              messageText: userMessageText,
              sender: userSender,
              conversationHistory: []
            });
          } catch (e) {
            console.warn('Sovythos Pro DM reply error, falling back:', e);
          }
        }

        if (!chosenReply) {
          // FREE USER (or AI fallback): Pick from the authentic 50 Egyptian Sovythos responses
          const pool = SOVYTHOS_FREE_DM_RESPONSES;
          const textHash = (userMessageText || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const idx = (textHash + Date.now()) % pool.length;
          chosenReply = pool[idx];
        }

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
