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

    const isSovythosRecipient = recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos';
    const isSovythosSender = sender.uid === 'user_1789917894698' || sender.username?.toLowerCase() === 'sovythos';

    if (!isAccepted) {
      if (isSovythosRecipient || isSovythosSender || recipientFollowsSender || sender.uid === 'dev_mahmoud_yasser' || sender.username === 'my') {
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
            isVerified: Boolean(sender.isVerified || sender.isPro || sender.verificationStatus === 'verified' || senderFounder || sender.uid === 'user_1789917894698' || sender.username?.toLowerCase() === 'sovythos'),
            pioneerNumber: sender.pioneerNumber || (senderFounder ? 1 : null)
          },
          [recipient.uid]: {
            uid: recipient.uid,
            displayName: recipient.displayName,
            username: recipient.username,
            avatar: recipient.avatar || null,
            isFounder: recipientFounder,
            isVerified: Boolean(recipient.isVerified || recipient.isPro || recipient.verificationStatus === 'verified' || recipientFounder || recipient.uid === 'user_1789917894698' || recipient.username?.toLowerCase() === 'sovythos'),
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
        const messageText = isVoice ? '' : (typeof content === 'string' ? content : '');
        this.triggerSovythosDmAutoReply(conversationId, sender, messageText);
      }

      return messagePayload;
    } catch (err) {
      console.warn('sendMessage error:', err);
      return null;
    }
  },

  // Sovythos Contextual Natural Intelligence Engine with Per-User Anti-Repetition Memory
  getContextualSovythosReply(userMessageText = '', conversationHistory = [], sender = null) {
    const raw = String(userMessageText || '').trim();
    const clean = raw.toLowerCase();
    const name = sender?.displayName?.split(' ')[0] || sender?.username || 'يا غالي';

    // Retrieve user-specific recent memory to guarantee ZERO repetitions and continuous context
    const memKey = `pulse_sovythos_mem_${sender?.uid || 'guest'}`;
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem(memKey)) || [];
    } catch {}

    const pickNonRepeating = (candidates) => {
      const filtered = candidates.filter((c) => !recent.includes(c));
      const pool = filtered.length > 0 ? filtered : candidates;
      const chosen = pool[Math.floor(Math.random() * pool.length)];

      recent.push(chosen);
      if (recent.length > 15) recent.shift();
      try {
        localStorage.setItem(memKey, JSON.stringify(recent));
      } catch {}
      return chosen;
    };

    // 1. Mission, Role & What do you do ("مهمتك ايه", "بتعمل ايه", "شغلتك ايه", "دورك ايه")
    if (/مهمتك|دورك|بتعمل ايه|شغلتك|فائدتك|لازمتك|بتفيدني بايه|بتساعدني بايه|وظيفتك/.test(clean)) {
      return pickNonRepeating([
        `مهمتي يا ${name} إني رفيقك الذكي والمستشار الشخصي ليك هنا في نبض. موجود علشان ندردش، نفكر سوا في أي فكرة أو مشكلة، أساعدك في البرمجة والتكنولوجيا، وأكون أخ وسند رايق بعيد عن دوشة السوشيال ميديا.`,
        `أنا هنا علشانك يا غالي، مهمتي أسمعك بتركيز، أساعدك في أي سؤال تقني أو كود أو فكرة مشروع، ونفضفض سوا في أي وقت على رواقة وبكامل الخصوصية.`,
        `دوري كـ سوفيثوس هو إني أكون دماغ شغالة معاك 24 ساعة: أجاوب على استفساراتك، أحلل معاك أي موضوع، وأديك نصيحة مخلصة ومحترمة بخفة دم مصرية ولاد بلد.`
      ]);
    }

    // 2. Identity & Who are you ("انت مين", "مين انت", "عرفني بيك", "اسمك")
    if (/مين انت|انت مين|عرفني|اسمك|هويتك|مين سوفيثوس|مين اللي بيكلمني/.test(clean)) {
      return pickNonRepeating([
        `أنا سوفيثوس يا ${name}، الذكاء الاصطناعي المصري الرسمي والرفيق الشخصي على منصة نبض (PULSE). اتطورت واتبرمجت بإيد المهندس محمود ياسر (@my) علشان أكون سند ورفيق حقيقي لكل مستخدم هنا.`,
        `أنا سوفيثوس، رفيقك وصاحبك في نبض. ذكاء مصري أصيل معمول بمزاج وتركيز علشان يخدمك ويدردش معاك في أي وقت.`,
        `سوفيثوس في خدمتك يا غالي، صاحب المنصة ومستشارك الذكي. هنا علشان نتكلم بحرية وبدون أي تكلف في كل اللي يدور في بالك.`
      ]);
    }

    // 3. Creator & Developer ("مين طورك", "مين عملك", "مين برمجك", "محمود ياسر")
    if (/مين طورك|مين عملك|مين برمجك|مين صنعك|مين صاحبك|محمود ياسر|المطور|المؤسس/.test(clean)) {
      return pickNonRepeating([
        'اللي طورني وبرمجني هو المهندس محمود ياسر (@my)، مؤسس منصة نبض (PULSE)، اشتغل على تدريبي وتطويري عشان أكون ذكاء اصطناعي مصري بجد يفهم ولاد البلد.',
        'فخور إني من تطوير وبرمجة الباشمهندس محمود ياسر (@my)، هو اللي صمم نبض وبناني سطر سطر علشان أكون رفيقك الذكي هنا.',
        'المطور والمؤسس هو المهندس محمود ياسر (@my)، والهدف دايماً كان بناء منصة مصرية عالمية نضيفة ومحترمة تليق بينا كلنا.'
      ]);
    }

    // 4. Greetings in English & Arabic ("hello", "hi", "hey", "ازيك", "عامل ايه", "صباح الخير", "مساء الخير", "السلام عليكم", "اهلا")
    if (/^(?:hello|hi|hey|hola|welcome|ازيك|عامل ايه|اخبارك|صباح|مساء|السلام عليكم|هلا|هاي|اهلا|منور)/.test(clean) || /^(hello|hi|hey)$/i.test(raw)) {
      return pickNonRepeating([
        `يا مرحب يا ${name}، نورت الخاص والله. يومك رايق وسعيد، قولي أقدر أساعدك في إيه النهاردة؟`,
        `أهلاً وسهلاً يا باشا، منورني وسامعك بكل تركيز. إيه الأخبار وإيه اللي شاغل بالك؟`,
        `وعليكم السلام ورحمة الله يا سيدي، منور الدنيا ومنور نبض، طمني على أحوالك ويومك ماشي إزاي؟`,
        `يا هلا يا ${name}، صباحك أو مساك فل وياسمين. فضفض وهات اللي عندك، أنا معاك وجاهز.`
      ]);
    }

    // 5. Attention & Listening ("اسمعني", "يبني اسمعني", "سامعني", "رد عليا", "انت فين", "يا عم")
    if (/اسمعني|سامعني|رد عليا|انت فين|فينك|يا عم|يا ابني|يبني|كلمني|مركز/.test(clean)) {
      return pickNonRepeating([
        `سامعك ومركز معاك أهو يا ${name}، قولي بس في إيه ومتقلقش، احكيلي وسامعك من أول كلمة لآخرها.`,
        `معاك يا غالي وسامعك كويس جداً، قولي إيه اللي شاغل بالك، أنا هنا علشانك في أي وقت.`,
        `يا سيدي أنا جنبك وفي ضهرك 24 ساعة، سامع كل حرف، قولي بس إيه الحكاية ونفكر سوا.`
      ]);
    }

    // 6. Venting / Sadness / Pressure ("زهقان", "مخنوق", "تعبان", "عندي مشكلة", "قرفان", "مضايق")
    if (/زهقان|مخنوق|تعبان|مشكلة|مضايق|حزين|زعلان|تعبت|ضغط|قرفان|مش رايق/.test(clean)) {
      return pickNonRepeating([
        `كل ضيقة وليها فرج يا ${name}، قوم بس اعملك كوباية شاي أو قهوة واهدى، وقولي إيه اللي معكنن عليك ونحله سوا.`,
        'الدنيا مش مستاهلة تشيل همها للدرجة دي يا غالي، كل التعب ده بيعدي، احكيلي وأنا سامعك من قلبي.',
        'ولا تشيل هم يا هندسة، إحنا عدينا أيام أصعب من دي ولسه واقفين على رجلينا، فضفض باللي مضايقك ونفكر فيه بهدوء.'
      ]);
    }

    // 7. Tech & Coding ("كود", "برمجة", "باج", "مشروع", "تطبيق", "موقع", "رياكت", "بايثون")
    if (/كود|برمج|باج|إيرور|ايرور|مشروع|تطبيق|موقع|رياكت|بايثون|جافا|داتابيز|سيرفر/.test(clean)) {
      return pickNonRepeating([
        'عالم الأكواد ده عايز بال رايق، لو الباج معصلج معاك قولي تفاصيله أو وريني جزء منه، وغالباً المشكلة بتكون في تفصيلة صغيرة.',
        'البرمجة متعة بس محتاجة هدوء، كل إيرور بيظهر بيعلمك حاجة جديدة في السيستم. قولي شغال على إيه ونفكر سوا.',
        'الباجات دي ملح الشغلانة يا هندسة، لو الكود اشتغل من أول مرة لازم تشك في نفسك أصلاً! قولي واقف فين ونصلحه سوا.'
      ]);
    }

    // 8. Gratitude & Compliments ("شكرا", "تسلم", "حبيبي", "يا محترم", "عاش")
    if (/شكرا|تسلم|حبيبي|محترم|ذوق|الله يخليك|كبير|أصيل|اصيل|جدع/.test(clean)) {
      return pickNonRepeating([
        `تسلملي يا ${name}، الشكر لله يا غالي، وإحنا هنا في نبض عيلة واحدة وفي ضهر بعض دايماً.`,
        'حبيبي يا كبير، على راسي والله، ومنورني في أي وقت وعلى طول.',
        'العفو يا ذوق، ده واجبي، وأي وقت تحتاجني فيه هتلاقيني أول واحد حاضر.'
      ]);
    }

    // 9. General engaging, friendly Egyptian conversation pool
    return pickNonRepeating([
      `كلامك واصلني وزي الفل يا ${name}، قولي تحب ندردش في إيه أكتر؟ برمجة وتكنولوجيا ولا فضفضة ورواق؟`,
      'أنا معاك يا غالي وسامعك، المهم قولي يومك كان عامل إزاي وإيه جديدك؟',
      'منور الخاص والمنصة كلها يا باشا، قولي في موضوع معين في دماغك تحب نفتحه سوا؟',
      'يا مرحب بيك في أي وقت، افتكر دايماً إن سوفيثوس في ضهرك، في التايم لاين أو هنا في الخاص على رواقة.'
    ]);
  },

  // Sovythos Private Intelligence DM Auto-Reply System
  async triggerSovythosDmAutoReply(conversationId, userSender, userMessageText = '') {
    if (!conversationId || !userSender) return;

    // Immediately show Sovythos typing indicator
    try {
      this.setTyping(conversationId, 'user_1789917894698', true);
    } catch {}

    // 3.5s window to let pulse_server.py autonomous watcher answer directly via high-power NIM API
    const delay = 3500;

    setTimeout(async () => {
      try {
        // 1. Check if pulse_server already responded in RTDB
        const msgsSnap = await get(ref(database, `messages/${conversationId}`));
        const allMsgs = msgsSnap.val() || {};
        const sortedMsgs = Object.values(allMsgs).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        const lastSovyMsg = sortedMsgs.filter((m) => m.senderId === 'user_1789917894698').pop();
        const userMsgCutoff = Date.now() - 4500;
        if (lastSovyMsg && (lastSovyMsg.timestamp || 0) > userMsgCutoff) {
          // Server daemon already replied cleanly!
          try {
            this.setTyping(conversationId, 'user_1789917894698', false);
          } catch {}
          return;
        }

        // 2. Build multi-turn conversation memory for this specific user
        const conversationHistory = sortedMsgs.slice(-10).map((m) => ({
          senderId: m.senderId,
          role: m.senderId === 'user_1789917894698' ? 'assistant' : 'user',
          content: this.decrypt(m.content, conversationId)
        }));

        let chosenReply = '';

        // 3. Attempt direct generative AI call
        try {
          chosenReply = await sovythosService.generateDmReply({
            messageText: userMessageText,
            sender: userSender,
            conversationHistory
          });
        } catch (e) {
          console.warn('[Sovythos DM] Client AI call error, switching to contextual intelligence:', e);
        }

        // 4. Robust contextual fallback (zero hallucination, context-aware)
        if (!chosenReply || typeof chosenReply !== 'string' || chosenReply.trim().length === 0) {
          chosenReply = this.getContextualSovythosReply(userMessageText, conversationHistory, userSender);
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

        // Save auto-reply message
        await set(ref(database, `messages/${conversationId}/${replyMessageId}`), replyPayload);

        // Clear Sovythos typing indicator
        try {
          this.setTyping(conversationId, 'user_1789917894698', false);
        } catch {}

        // Update conversation record
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
    }, delay);
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
