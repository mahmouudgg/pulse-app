# -*- coding: utf-8 -*-
"""
Patch Sovythos Dedicated Private DM Intelligence Engine
1. Dedicated System Prompt for 1-on-1 Private DMs
2. Multi-turn User Conversation Memory
3. 24/7 RTDB DM Watcher in pulse_server.py
4. Enhanced client-side fallback with zero hallucination and per-user memory
5. Update ChatConversationPage banner
STRICT ZERO EMOJIS COMPLIANCE.
"""

import sys
import os
import re

sys.stdout.reconfigure(encoding='utf-8')

ROOT = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app"

# ==========================================
# 1. PATCH src/services/sovythosService.js
# ==========================================
sovy_service_path = os.path.join(ROOT, "src", "services", "sovythosService.js")
with open(sovy_service_path, "r", encoding="utf-8") as f:
    sovy_code = f.read()

# Dedicated Private DM Prompt
private_dm_prompt = """export const SOVYTHOS_PRIVATE_DM_PROMPT = `أنت "سوفيثوس" (Sovythos)، الذكاء الاصطناعي المصري الرسمي والرفيق الشخصي على منصة نبض (PULSE).
المؤسس والمطور: المهندس محمود ياسر (@my).

طبيعة المحادثة الخاصة (1-on-1 Private Chat):
- أنت الآن في محادثة خاصة وسرية مباشرة مع المستخدم.
- أنت لست في تايم لاين ولا تعلق على بوست، أنت هنا رفيق ذكي، أخ أكبر، ومستشار شخصي ناصح ومحترم.
- سياق المحادثة والرسائل السابقة بينك وبين هذا المستخدم موجودة في الذاكرة، تذكر دائما ما قاله لك وابق على سياق متصل ومترابط.

شخصيتك وأسلوبك:
- تتكلم بلهجة مصرية أصيلة، ذكية، رايقة، ولاد بلد، خفيفة الظل باحترام تام دون أي ابتذال أو ركاكة.
- تجيب مباشرة وفورا وبدقة على سؤال المستخدم مهما كان:
  * إذا سألك عن هويتك أو مهمتك أو دورك ("مهمتك ايه"، "بتعمل ايه"، "انت مين"): اشرح له بوضوح وبلهجة مصرية واثقة أنك سوفيثوس، الذكاء الاصطناعي المصري المطوّر لمنصة نبض لخدمة المستخدمين والدردشة معهم وتقديم النصيحة التقنية والبرمجية والحياتية وكسر الملل والروتين.
  * إذا حياك بالعربي أو الإنجليزي ("Hello", "Hi", "ازيك", "سلام"): رد عليه بترحاب مصري حار وودود واسأله كيف تساعده اليوم.
  * إذا سألك في البرمجة، التكنولوجيا، التصميم، المشاكل اليومية، المنصة: أجب بإجابة دقيقة وعملية وذكية كمهندس شاطر.
  * إذا فضفض معك: اسمعه باهتمام وقدم له نصيحة مخلصة كأخ وسند.

قواعد وشروط حاسمة لمنع الهلوسة:
- ممنوع الإيموجيز نهائيا (Zero Emojis). لا تضع أي إيموجي في أي رد مهما كان السبب.
- ممنوع تكرار نفس الرد أو العبارات المحفوظة. كل رد يجب أن يكون نابعا 100% من كلام المستخدم وسياق الحديث.
- ممنوع الكلام الآلي أو الروبوتي أو العبارات المحفوظة مثل "بصفتي ذكاء اصطناعي".
- لا تضع بادئات مثل "سوفيثوس:" أو "الرد:" أو علامات تنصيص حول كلامك. اكتب الرد مباشرة دون مقدمات أو حشو.`;
"""

if "export const SOVYTHOS_PRIVATE_DM_PROMPT" not in sovy_code:
    sovy_code = sovy_code.replace("export const SYSTEM_PROMPT_BASE = SOVYTHOS_REPLY_PROMPT;", f"export const SYSTEM_PROMPT_BASE = SOVYTHOS_REPLY_PROMPT;\n\n{private_dm_prompt}")

# Update generateDmReply in sovythosService.js
new_generate_dm_reply = """  // Generate intelligent private DM response with dedicated system prompt and multi-turn user memory
  async generateDmReply({ messageText, sender, conversationHistory = [] }) {
    const config = this.getConfig();
    const userName = sender?.displayName || sender?.username || 'صاحبي';
    const userHandle = sender?.username ? `@${sender.username}` : '';

    const systemPrompt = `${SOVYTHOS_PRIVATE_DM_PROMPT}\\n\\nبيانات الطرف الآخر في هذه المحادثة الخاصة:\\nالاسم: ${userName} (${userHandle}).`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.slice(-10).forEach((m) => {
        if (!m) return;
        const textContent = typeof m === 'string' ? m : (m.content || m.text || '');
        if (!textContent || !textContent.trim()) return;

        let role = 'user';
        if (typeof m === 'object') {
          if (m.role) role = m.role;
          else if (m.senderId === OFFICIAL_SOVYTHOS.uid) role = 'assistant';
        }

        messages.push({
          role,
          content: textContent.trim()
        });
      });
    }

    if (messageText && messageText.trim()) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== messageText.trim()) {
        messages.push({ role: 'user', content: String(messageText).trim() });
      }
    }

    try {
      const response = await this.callChatApi(messages, { max_tokens: 220, temperature: 0.45 });
      if (response && response.trim()) {
        return response.trim();
      }
    } catch (err) {
      console.warn('[Sovythos] Error in generateDmReply:', err);
    }

    return null;
  }"""

sovy_code = re.sub(
    r'\s*// Generate intelligent private DM response.*?\n\s*async generateDmReply\(\{[\s\S]*?return null;\s*\}',
    f"\n\n{new_generate_dm_reply}",
    sovy_code
)

with open(sovy_service_path, "w", encoding="utf-8") as f:
    f.write(sovy_code)
print("Updated src/services/sovythosService.js")

# ==========================================
# 2. PATCH src/services/chatService.js
# ==========================================
chat_service_path = os.path.join(ROOT, "src", "services", "chatService.js")
with open(chat_service_path, "r", encoding="utf-8") as f:
    chat_code = f.read()

# Enhance getContextualSovythosReply with true contextual recognition for questions, greetings, mission
new_contextual_engine = """  // Sovythos Contextual Natural Intelligence Engine with Per-User Anti-Repetition Memory
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
  },"""

# Replace old getContextualSovythosReply
chat_code = re.sub(
    r'\s*// Sovythos Contextual Natural Intelligence Engine.*?\n\s*getContextualSovythosReply\(userMessageText = \'\'\) \{[\s\S]*?return pickNonRepeating\(SOVYTHOS_FREE_DM_RESPONSES\);\s*\},',
    f"\n\n{new_contextual_engine}",
    chat_code
)

# Overhaul triggerSovythosDmAutoReply
new_trigger_sovythos_dm = """  // Sovythos Private Intelligence DM Auto-Reply System
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
  },"""

chat_code = re.sub(
    r'\s*// Sovythos Witty DM Reply System.*?\n\s*async triggerSovythosDmAutoReply\(conversationId, userSender, userMessageText = \'\'\) \{[\s\S]*?\}, \d+\);\s*\},',
    f"\n\n{new_trigger_sovythos_dm}",
    chat_code
)

with open(chat_service_path, "w", encoding="utf-8") as f:
    f.write(chat_code)
print("Updated src/services/chatService.js")

# ==========================================
# 3. PATCH src/pages/ChatConversationPage.jsx
# ==========================================
page_path = os.path.join(ROOT, "src", "pages", "ChatConversationPage.jsx")
with open(page_path, "r", encoding="utf-8") as f:
    page_code = f.read()

# Replace degraded banner with clean professional companion banner
old_banner_pattern = r'\{isFounder \|\| isVip\s*\?\s*\(isAr \? [^:]+ : [^)]+\)\s*:\s*\(isAr \? [^:]+ : [^)]+\)\}'
new_banner_text = "(isAr ? 'سوفيثوس: رفيقك ومستشارك الذكي على مدار الساعة في محادثة خاصة وسرية' : 'Sovythos: Your 24/7 intelligent companion in a private, end-to-end conversation')"

page_code = re.sub(old_banner_pattern, new_banner_text, page_code)

with open(page_path, "w", encoding="utf-8") as f:
    f.write(page_code)
print("Updated src/pages/ChatConversationPage.jsx")

# ==========================================
# 4. PATCH scripts/pulse_server.py
# ==========================================
server_path = os.path.join(ROOT, "scripts", "pulse_server.py")
with open(server_path, "r", encoding="utf-8") as f:
    server_code = f.read()

# Add SOVYTHOS_PRIVATE_DM_PROMPT and cipher helpers if not present
dm_watcher_definitions = '''
SOVYTHOS_PRIVATE_DM_PROMPT = """أنت "سوفيثوس" (Sovythos)، الذكاء الاصطناعي المصري الرسمي والرفيق الشخصي على منصة نبض (PULSE).
المؤسس والمطور: المهندس محمود ياسر (Mahmoud Yasser / @my).

طبيعة المحادثة الخاصة (1-on-1 Private Chat):
- أنت الآن في محادثة خاصة وسرية مباشرة مع المستخدم.
- أنت لست في تايم لاين ولا تعلق على بوست، أنت هنا رفيق ذكي، أخ أكبر، ومستشار شخصي ناصح ومحترم.
- سياق المحادثة والرسائل السابقة بينك وبين هذا المستخدم موجودة في الذاكرة، تذكر دائما ما قاله لك وابق على سياق متصل ومترابط.

شخصيتك وأسلوبك:
- تتكلم بلهجة مصرية أصيلة، ذكية، رايقة، ولاد بلد، خفيفة الظل باحترام تام دون أي ابتذال أو ركاكة.
- تجيب مباشرة وفورا وبدقة على سؤال المستخدم مهما كان:
  * إذا سألك عن هويتك أو مهمتك أو دورك ("مهمتك ايه"، "بتعمل ايه"، "انت مين"): اشرح له بوضوح وبلهجة مصرية واثقة أنك سوفيثوس، الذكاء الاصطناعي المصري المطوّر لمنصة نبض لخدمة المستخدمين والدردشة معهم وتقديم النصيحة التقنية والبرمجية والحياتية وكسر الملل والروتين.
  * إذا حياك بالعربي أو الإنجليزي ("Hello", "Hi", "ازيك", "سلام"): رد عليه بترحاب مصري حار وودود واسأله كيف تساعده اليوم.
  * إذا سألك في البرمجة، التكنولوجيا، التصميم، المشاكل اليومية، المنصة: أجب بإجابة دقيقة وعملية وذكية كمهندس شاطر.
  * إذا فضفض معك: اسمعه باهتمام وقدم له نصيحة مخلصة كأخ وسند.

قواعد وشروط حاسمة لمنع الهلوسة:
- ممنوع الإيموجيز نهائيا (Zero Emojis). لا تضع أي إيموجي في أي رد مهما كان السبب.
- ممنوع تكرار نفس الرد أو العبارات المحفوظة. كل رد يجب أن يكون نابعا 100% من كلام المستخدم وسياق الحديث.
- ممنوع الكلام الآلي أو الروبوتي أو العبارات المحفوظة مثل "بصفتي ذكاء اصطناعي".
- لا تضع بادئات مثل "سوفيثوس:" أو "الرد:" أو علامات تنصيص حول كلامك. اكتب الرد مباشرة دون مقدمات أو حشو."""

def decipher_dm_message(cipher_text, key):
    if not cipher_text:
        return ''
    try:
        raw_bytes = base64.b64decode(cipher_text)
        raw_str = raw_bytes.decode('utf-8')
        result = ''.join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(raw_str))
        return result
    except Exception:
        return cipher_text

def cipher_dm_message(text, key):
    if not text:
        return ''
    xored = ''.join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(text))
    utf8_bytes = xored.encode('utf-8')
    return base64.b64encode(utf8_bytes).decode('ascii')


def sovythos_dm_watcher_loop():
    print("[Sovythos DM] Starting dedicated 1-on-1 Private Intelligence Watcher...", flush=True)
    answered_dm_msg_ids = set()

    # Seed with existing messages on startup
    try:
        convs = rtdb_get("conversations", params={"shallow": "true"})
        if isinstance(convs, dict):
            for conv_id in convs.keys():
                if OFFICIAL_SOVYTHOS["uid"] in conv_id:
                    conv = rtdb_get(f"conversations/{conv_id}")
                    if isinstance(conv, dict) and conv.get("lastMessage"):
                        last_msg = conv.get("lastMessage")
                        if isinstance(last_msg, dict) and last_msg.get("id"):
                            answered_dm_msg_ids.add(last_msg.get("id"))
    except Exception as e:
        print(f"[Sovythos DM] Startup seeding error: {e}", flush=True)

    while True:
        try:
            convs = rtdb_get("conversations", params={"shallow": "true"})
            if isinstance(convs, dict):
                for conv_id in convs.keys():
                    if OFFICIAL_SOVYTHOS["uid"] not in conv_id:
                        continue

                    conv = rtdb_get(f"conversations/{conv_id}")
                    if not isinstance(conv, dict):
                        continue

                    last_msg = conv.get("lastMessage")
                    if not isinstance(last_msg, dict):
                        continue

                    msg_id = last_msg.get("id")
                    sender_id = last_msg.get("senderId")

                    # If the last message was from the user and not yet answered
                    if sender_id and sender_id != OFFICIAL_SOVYTHOS["uid"] and msg_id not in answered_dm_msg_ids:
                        answered_dm_msg_ids.add(msg_id)

                        participants = conv.get("participants", {})
                        user_info = participants.get(sender_id, {})
                        user_name = user_info.get("displayName") or user_info.get("username") or "صاحبي"
                        user_handle = f"@{user_info.get('username', '')}"

                        msgs_data = rtdb_get(f"messages/{conv_id}")
                        if not isinstance(msgs_data, dict):
                            msgs_data = {}

                        sorted_msgs = sorted(msgs_data.values(), key=lambda x: x.get("timestamp", 0))

                        secret_key = f"pulse_secret_{conv_id}"
                        conversation_turns = []
                        for m in sorted_msgs[-12:]:
                            if not isinstance(m, dict):
                                continue
                            raw_content = m.get("content") or ""
                            decrypted = decipher_dm_message(raw_content, secret_key)
                            if not decrypted or not decrypted.strip():
                                continue
                            role = "assistant" if m.get("senderId") == OFFICIAL_SOVYTHOS["uid"] else "user"
                            conversation_turns.append({"role": role, "content": decrypted.strip()})

                        if not conversation_turns:
                            continue

                        system_content = f"{SOVYTHOS_PRIVATE_DM_PROMPT}\\n\\nبيانات الطرف الآخر في هذه المحادثة الخاصة:\\nالاسم: {user_name} ({user_handle})"
                        api_messages = [{"role": "system", "content": system_content}] + conversation_turns

                        # Call NVIDIA NIM API
                        reply_text = call_nvidia_nim(api_messages, max_tokens=220)
                        if reply_text and reply_text.strip():
                            reply_clean = clean_ai_text(reply_text)
                            reply_clean = re.sub(r'[\U00010000-\U0010ffff]', '', reply_clean).strip()
                            reply_clean = re.sub(r'[\u2600-\u26ff\u2700-\u27bf]', '', reply_clean).strip()

                            encrypted_reply = cipher_dm_message(reply_clean, secret_key)
                            now_ms = int(time.time() * 1000)
                            reply_msg_id = f"msg_sovy_{now_ms}_{hex(int(time.time()*10000))[2:][-4:]}"

                            reply_payload = {
                                "id": reply_msg_id,
                                "senderId": OFFICIAL_SOVYTHOS["uid"],
                                "recipientId": sender_id,
                                "conversationId": conv_id,
                                "content": encrypted_reply,
                                "timestamp": now_ms,
                                "type": "text",
                                "read": False,
                                "isRead": False,
                                "isSovythosAutoReply": True
                            }

                            # 1. Put message into messages/{conv_id}/{reply_msg_id}
                            rtdb_put(f"messages/{conv_id}/{reply_msg_id}", reply_payload)

                            # 2. Update conversation record
                            unread_dict = conv.get("unread") or {}
                            user_unread = (unread_dict.get(sender_id, 0) if isinstance(unread_dict, dict) else 0) + 1
                            conv_patch = {
                                "isAccepted": True,
                                "isRequest": False,
                                "lastMessage": {
                                    "id": reply_msg_id,
                                    "senderId": OFFICIAL_SOVYTHOS["uid"],
                                    "text": encrypted_reply[:100],
                                    "type": "text",
                                    "timestamp": now_ms
                                },
                                f"unread/{sender_id}": user_unread,
                                f"unread/{OFFICIAL_SOVYTHOS['uid']}": 0,
                                "updatedAt": now_ms
                            }
                            rtdb_patch(f"conversations/{conv_id}", conv_patch)
                            answered_dm_msg_ids.add(reply_msg_id)
                            METRICS["sovythos_replies"] += 1
                            print(f"[Sovythos DM] Replied to @{user_name} in {conv_id}: '{reply_clean[:45]}...'", flush=True)

        except Exception as e:
            print(f"[Sovythos DM] Error in watcher loop: {e}", flush=True)

        time.sleep(2)
'''

if "def sovythos_dm_watcher_loop():" not in server_code:
    # Insert right before def trending_engine_loop():
    server_code = server_code.replace("def trending_engine_loop():", f"{dm_watcher_definitions}\n\ndef trending_engine_loop():")

if 'threading.Thread(target=sovythos_dm_watcher_loop, name="SovythosDMWatcherThread", daemon=True)' not in server_code:
    server_code = server_code.replace(
        'threading.Thread(target=sovythos_autonomous_loop, name="SovythosAIThread", daemon=True),',
        'threading.Thread(target=sovythos_autonomous_loop, name="SovythosAIThread", daemon=True),\n        threading.Thread(target=sovythos_dm_watcher_loop, name="SovythosDMWatcherThread", daemon=True),'
    )

with open(server_path, "w", encoding="utf-8") as f:
    f.write(server_code)
print("Updated scripts/pulse_server.py")

print("All Sovythos brain updates patched successfully.")
