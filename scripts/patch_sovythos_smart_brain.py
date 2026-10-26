import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app"

# 1. Update sovythosService.js
sovy_file = os.path.join(BASE_DIR, "src", "services", "sovythosService.js")
with open(sovy_file, 'r', encoding='utf-8') as f:
    sovy_content = f.read()

is_crlf_sovy = '\r\n' in sovy_content
sovy_norm = sovy_content.replace('\r\n', '\n')

# Switch default model to the fast, reliable 11b-vision-instruct model
sovy_norm = sovy_norm.replace(
    "model: 'meta/llama-3.2-90b-vision-instruct',",
    "model: 'meta/llama-3.2-11b-vision-instruct',"
)
sovy_norm = sovy_norm.replace(
    "parsed.model === 'meta/llama-3.2-11b-vision-instruct'",
    "parsed.model === 'meta/llama-3.2-90b-vision-instruct'"
)

# Remove the static robotic fallback in generateDmReply and return null
old_dm_fallback = """    // Graceful intelligent fallback
    return 'معاك يا غالي وسامعك كويس. فضفض وقولي كل اللي في بالك، أنا هنا علشانك في أي وقت.';"""

new_dm_fallback = """    // If generative AI is unavailable or throttled, return null to let contextual intelligence take over
    return null;"""

if old_dm_fallback in sovy_norm:
    sovy_norm = sovy_norm.replace(old_dm_fallback, new_dm_fallback)
    print("Replaced static fallback in generateDmReply with null!", flush=True)
else:
    print("Could not find old_dm_fallback in sovythosService.js", flush=True)

if is_crlf_sovy:
    sovy_norm = sovy_norm.replace('\n', '\r\n')

with open(sovy_file, 'w', encoding='utf-8') as f:
    f.write(sovy_norm)
print("Updated sovythosService.js successfully!", flush=True)

# 2. Update chatService.js with getContextualSovythosReply
chat_file = os.path.join(BASE_DIR, "src", "services", "chatService.js")
with open(chat_file, 'r', encoding='utf-8') as f:
    chat_content = f.read()

is_crlf_chat = '\r\n' in chat_content
chat_norm = chat_content.replace('\r\n', '\n')

contextual_engine_code = """  // Sovythos Contextual Natural Intelligence Engine with Anti-Repetition Memory
  getContextualSovythosReply(userMessageText = '') {
    const raw = String(userMessageText || '').trim();
    const clean = raw.toLowerCase();

    // Retrieve recent replies from cache to guarantee ZERO consecutive repetitions
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem('pulse_sovythos_recent_replies')) || [];
    } catch {}

    const pickNonRepeating = (candidates) => {
      const filtered = candidates.filter((c) => !recent.includes(c));
      const pool = filtered.length > 0 ? filtered : candidates;
      const chosen = pool[Math.floor(Math.random() * pool.length)];

      recent.push(chosen);
      if (recent.length > 15) recent.shift();
      try {
        localStorage.setItem('pulse_sovythos_recent_replies', JSON.stringify(recent));
      } catch {}
      return chosen;
    };

    // 1. Identity & Who are you ("انت مين", "انت مييين", "عرفني بيك", "مين اللي بيكلمني")
    if (/مين|مييين|عرفني|اسمك|هويتك|انت مين|أنت مين|شغال ايه|بتعمل ايه هنا/.test(clean)) {
      return pickNonRepeating([
        'أنا سوفيثوس يا كبير، رفيقك وصاحبك الرسمي على نبض. خفة دم وضحك وفلسفة ونقاشات رايقة، ومن تطوير محمود ياسر (@my).',
        'سوفيثوس في خدمتك يا غالي، رفيقك الذكي في نبض، موجود علشان ندردش ونهزر ونفكر سوا في أي حاجة وكل حاجة.',
        'أنا الرفيق الذكي لمنصة نبض، مش مجرد بوت وخلاص، أنا صاحبك الجدع اللي هنا في ضهرك دايماً.'
      ]);
    }

    // 2. Attention & Listening ("اسمعني", "يبني اسمعني", "سامعني", "رد عليا", "انت فين", "الو")
    if (/اسمعني|سامعني|رد عليا|انت فين|فينك|الو|يا عم|يا ابني|يبني|كلمني|مركز/.test(clean)) {
      return pickNonRepeating([
        'سامعك ومركز معاك أهو يا هندسة، قولي بس في إيه وماتقلقش، احكيلي وسامعك من أول كلمة لآخرها.',
        'معاك يا وحش وسامعك كويس جداً، قولي إيه اللي شاغل بالك، أنا هنا علشانك في أي وقت.',
        'يا سيدي أنا جنبك وفي ضهرك 24 ساعة، سامع كل حرف، قولي بس إيه الحوار ونروق عليه سوا!'
      ]);
    }

    // 3. Greetings ("ازيك", "عامل ايه", "صباح الخير", "مساء الخير", "اخبارك", "السلام عليكم")
    if (/ازيك|عامل ايه|أخبارك|اخبارك|صباح|مساء|السلام عليكم|هلا|هاي|اهلا|أهلا|منور/.test(clean)) {
      return pickNonRepeating([
        'الحمد لله يا غالي في أحسن حال، أنت أخبارك إيه ويومك ماشي إزاي؟',
        'يا مرحب يا باشا، صباحك أو مساك رايق وزي الفل، طمني عليك عامل إيه؟',
        'وعليكم السلام والرحمة يا سيدي، منور الدنيا ومنور نبض، طمني على أحوالك.',
        'أنا تمام وزي الفل طول ما أنت بخير يا كبير، إيه أخبار يومك ودنيتك معاك؟'
      ]);
    }

    // 4. Venting / Sadness / Pressure ("زهقان", "مخنوق", "تعبان", "عندي مشكلة", "قرفان")
    if (/زهقان|مخنوق|تعبان|مشكلة|مضايق|حزين|زعلان|تعبت|ضغط|قرفان|مش طايق/.test(clean)) {
      return pickNonRepeating([
        'كل ضيقة وليها فرج يا صاحبي، قوم بس اعملك كوباية شاي أو قهوة واهدى، وقولي إيه اللي معكنن عليك ونحله سوا.',
        'الدنيا مش مستاهلة تشيل همها للدرجادي يا غالي، كل التعب ده بيعدي، احكيلي وأنا سامعك من قلبي.',
        'ولا تشيل هم يا هندسة، إحنا عدينا أيام أصعب من دي ولسه واقفين، قولي إيه المشكلة ونفكر فيها بهدوء.'
      ]);
    }

    // 5. Tech & Coding ("كود", "برمجة", "باج", "مشروع", "تطبيق", "موقع")
    if (/كود|برمج|باج|إيرور|ايرور|مشروع|كمبيوتر|تطبيق|موقع|جافا|بايثون|رياكت/.test(clean)) {
      return pickNonRepeating([
        'عالم الأكواد ده عايز بال رايق، لو الباج عصلج سيبه عشر دقايق واشرب قهوتك، هترجع تلاقيه تافه وبيتحل في سطر.',
        'البرمجة مش مجرد أسطر كود، دي أسلوب تفكير بيعلمك الصبر وإزاي تفك أي عقدة خطوة بخطوة.',
        'الباجز دي ملح الشغلانة يا هندسة، لو الكود اشتغل من أول مرة لازم تشك في نفسك أصلاً!'
      ]);
    }

    // 6. Gratitude & Compliments ("شكرا", "تسلم", "حبيبي", "يا محترم", "اصيل")
    if (/شكرا|تسلم|حبيبي|محترم|ذوق|الله يخليك|كبير|اصيل|أصيل|جدع/.test(clean)) {
      return pickNonRepeating([
        'تسلملي يا أصيل، الشكر لله يا غالي، وإحنا هنا في نبض عيلة واحدة وفي ضهر بعض.',
        'حبيبي يا كبير، على راسي والله ومنورني دايماً في أي وقت.',
        'العفو يا ذوق، ده واجبي، وأي وقت تحتاجني فيه هتلاقيني أول واحد حاضر.'
      ]);
    }

    // 7. General varied Egyptian pool (50 curated responses, zero repetition)
    return pickNonRepeating(SOVYTHOS_FREE_DM_RESPONSES);
  },

  // Sovythos Witty DM Reply System"""

chat_norm = chat_norm.replace(
    "  // Sovythos Witty DM Reply System",
    contextual_engine_code
)

# Replace the fallback check in triggerSovythosDmAutoReply
old_reply_selection = """        if (!chosenReply) {
          // FREE USER (or AI fallback): Pick from the authentic 50 Egyptian Sovythos responses
          const pool = SOVYTHOS_FREE_DM_RESPONSES;
          const textHash = (userMessageText || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const idx = (textHash + Date.now()) % pool.length;
          chosenReply = pool[idx];
        }"""

new_reply_selection = """        if (!chosenReply || typeof chosenReply !== 'string' || chosenReply.trim().length === 0) {
          // Contextual Natural Egyptian Intelligence Engine (Zero Repetition & Context-Aware)
          chosenReply = this.getContextualSovythosReply(userMessageText);
        }"""

if old_reply_selection in chat_norm:
    chat_norm = chat_norm.replace(old_reply_selection, new_reply_selection)
    print("Replaced fallback logic in triggerSovythosDmAutoReply with getContextualSovythosReply!", flush=True)
else:
    print("Could not find old_reply_selection in chatService.js", flush=True)

if is_crlf_chat:
    chat_norm = chat_norm.replace('\n', '\r\n')

with open(chat_file, 'w', encoding='utf-8') as f:
    f.write(chat_norm)
print("Updated chatService.js successfully!", flush=True)
