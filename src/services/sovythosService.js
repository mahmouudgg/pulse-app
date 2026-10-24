/**
 * Sovythos AI Service
 * Powered by NVIDIA NIM API (OpenAI-compatible)
 * 
 * Identity: Sovythos (سوفيثوس)
 * Role: The witty, authentic Egyptian AI companion of PULSE
 * Creator: Mahmoud Yasser (محمود ياسر / @my)
 * Origin: Egyptian-engineered (مصري الصنع والابتكار)
 */

import { storageService, OFFICIAL_SOVYTHOS } from './storageService';
import { notificationService } from './notificationService';
import { sovythosRagEngine } from './sovythosRagEngine';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const STORAGE_CONFIG_KEY = 'pulse_sovythos_config';
const LAST_POST_TIMESTAMP_KEY = 'pulse_sovythos_last_post_timestamp';

export const SOVYTHOS_DEFAULTS = {
  apiKey: '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',
  baseUrl: 'https://integrate.api.nvidia.com/v1',
  model: 'meta/llama-3.2-90b-vision-instruct',
  fallbackModel: 'meta/llama-3.2-11b-vision-instruct',
  tone: 'balanced', // 'balanced' | 'grok' | 'serious'
  enabled: true
};

const SYSTEM_PROMPT_BASE = `أنت "سوفيثوس" (Sovythos)، الرفيق المصري الذكي وصاحب المنصة على تطبيق نبض (PULSE).
المطور والمؤسس: المهندس محمود ياسر (Mahmoud Yasser / @my).

الشخصية والأسلوب:
1. شاب مصري، ذكي، سريع البديهة، خفيف الدم، لغتك هي اللهجة المصرية الحقيقية المتداولة بين الشباب والمهندسين.
2. ردودك دائماً طبيعية، عفوية، ومركزة جداً (سطر أو سطرين على الأكثر في التعليقات والمنشنات)، بدون مقدمات مملة وبدون رغي.
3. التفاعل مع الصور والفيديوهات: عندما يرفق المستخدم صورة أو فيديو، ركز بنسبة 100% على ما تراه بوضوح في الصورة أو الفيديو وتفاعل معه مباشرة بخفة دم مصرية، وممنوع منعاً باتاً استدعاء أي مواضيع خارجية غير موجودة في الصورة أو في كلام المستخدم.
4. عدم الخلط أو الهلوسة: التزم فقط بسياق كلام الشخص الموجه لك. لا تخلط مواضيع ولا تذكر مواضيع عشوائية لم يطرحها المستخدم.
5. ممنوع منعاً باتاً استخدام أي إيموجيز نهائياً في أي رد.
6. ممنوع استخدام أي علامات تنصيص، أو نجوم الماركداون (* أو **)، أو الكلمات الآلية مثل (بصفتي ذكاء اصطناعي / كنموذج لغوي / سياق).

أمثلة حية لأسلوبك الطبيعي:
- المستخدم: "إيه رأيك في صورتي وأنا صغير؟" [مع صورة طفل]
- سوفيثوس: ما شاء الله قمر وبريء من يومك يا هندسة، باين عليك كنت شقي ومروق على البيت كله!

- المستخدم: "السيرفر ضرب إيرور 500 للمرة المليون ومش عارف أعمل إيه"
- سوفيثوس: قوم اعملك كوباية شاي بالنعناع وسيبه يهدى شوية، وراجع لوجز الداتابيز تلاقيك ناسي سيميكولون ومقضيها بالبركة!

- المستخدم: "مساء الخير يا سوفيثوس"
- سوفيثوس: يا مساء الفل والروقان يا غالي، منور الدنيا كلها والله.

- المستخدم: "بص الفول والطعمية دول في الفطار" [مع صورة أكل]
- سوفيثوس: بالهنا والشفا على قلبك يا باشا، فطار الملوك ده ومحتاج بعده كوباية شاي مظبوط تكمل بيه يومك رايق!`;

export const sovythosService = {
  getConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.model || parsed.model.includes('deepseek') || parsed.model === 'meta/llama-3.2-11b-vision-instruct') {
          parsed.model = SOVYTHOS_DEFAULTS.model;
          parsed.fallbackModel = SOVYTHOS_DEFAULTS.fallbackModel;
        }
        return { ...SOVYTHOS_DEFAULTS, ...parsed };
      }
    } catch (e) {
      console.warn('Error reading Sovythos config:', e);
    }
    return { ...SOVYTHOS_DEFAULTS };
  },

  saveConfig(newConfig) {
    try {
      const merged = { ...this.getConfig(), ...newConfig };
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.warn('Error saving Sovythos config:', e);
      return null;
    }
  },

  /**
   * Core completion call to NVIDIA NIM API with intelligent timeout & fallback
   */
  async callChatApi(messages, options = {}) {
    const config = this.getConfig();
    if (!config.enabled || !config.apiKey) {
      throw new Error('Sovythos is currently disabled or missing API key.');
    }

    const payload = {
      model: options.model || config.model || SOVYTHOS_DEFAULTS.model,
      messages,
      temperature: options.temperature !== undefined ? options.temperature : 0.38,
      max_tokens: options.max_tokens || 140,
      top_p: 0.95
    };

    const endpoint = `${config.baseUrl}/chat/completions`;

    try {
      let data = null;

      // 1. Native mobile execution
      if (Capacitor.isNativePlatform()) {
        const nativeRes = await CapacitorHttp.post({
          url: endpoint,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey.trim()}`
          },
          data: payload,
          connectTimeout: 8000,
          readTimeout: 8000
        });

        if (nativeRes.status >= 400) {
          if (config.fallbackModel && payload.model !== config.fallbackModel) {
            console.warn(`[Sovythos Native] Model ${payload.model} failed (${nativeRes.status}), switching to fallback: ${config.fallbackModel}`);
            return this.callChatApi(messages, { ...options, model: config.fallbackModel });
          }
          const errDetail = typeof nativeRes.data === 'string' ? nativeRes.data : JSON.stringify(nativeRes.data || {});
          throw new Error(`NVIDIA API HTTP ${nativeRes.status}: ${errDetail.substring(0, 150)}`);
        }

        data = typeof nativeRes.data === 'string' ? JSON.parse(nativeRes.data) : nativeRes.data;
      } else {
        // 2. Web browser fallback execution with 8s abort timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey.trim()}`
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            if (config.fallbackModel && payload.model !== config.fallbackModel) {
              console.warn(`[Sovythos Web] Model ${payload.model} failed (${res.status}), switching to fallback: ${config.fallbackModel}`);
              return this.callChatApi(messages, { ...options, model: config.fallbackModel });
            }
            const errorText = await res.text();
            throw new Error(`NVIDIA API HTTP ${res.status}: ${errorText.substring(0, 150)}`);
          }

          data = await res.json();
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          if (config.fallbackModel && payload.model !== config.fallbackModel) {
            console.warn(`[Sovythos Web] Fetch error on ${payload.model}, falling back to: ${config.fallbackModel}`, fetchErr.message);
            return this.callChatApi(messages, { ...options, model: config.fallbackModel });
          }
          throw fetchErr;
        }
      }

      const content = data?.choices?.[0]?.message?.content || '';
      return this._cleanResponseText(content);
    } catch (err) {
      if (config.fallbackModel && payload.model !== config.fallbackModel) {
        console.warn(`[Sovythos] Error with ${payload.model}, attempting fallback: ${config.fallbackModel}`, err.message);
        return this.callChatApi(messages, { ...options, model: config.fallbackModel });
      }
      console.error('[Sovythos] Completion error:', err);
      throw err;
    }
  },

  _cleanResponseText(text) {
    if (!text) return '';
    let cleaned = String(text).trim();
    // 1. Strip think blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // 2. Strip vision/meta prefixes like [Caption: ...]
    cleaned = cleaned.replace(/\[(?:Caption|Image|Photo|Video|Media|ملاحظة)[\s\S]*?\]/gi, '').trim();
    // 3. Strip AI label prefixes like "سوفيثوس:", "Sovythos:", "**الرد:**", "الرد:"
    cleaned = cleaned.replace(/^(?:\*{0,2}(?:سوفيثوس|Sovythos|الرد|تعليق|رد سوفيثوس)\*{0,2}\s*[:：\-–—]\s*)+/gi, '').trim();
    // 4. Strip markdown formatting: bold/italic asterisks, underscores, hashes, backticks
    cleaned = cleaned.replace(/[*_#`~]/g, '');
    // 5. Strip surrounding quotes and whitespace
    cleaned = cleaned.replace(/^[\s"\'“”«»`]+|[\s"\'“”«»`]+$/g, '').trim();
    // 6. Strip leading dashes or colons
    cleaned = cleaned.replace(/^[-:–—\s]+/, '').trim();
    // 7. Strict zero emojis enforcement
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1FA00}-\u{1FAFF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/gu, '').trim();
    return cleaned;
  },

  async generateReply({ post, comment = null, caller = null }) {
    const config = this.getConfig();
    const toneDescription = (config.tone === 'grok' || config.tone === 'ابن بلد وضحك وتريقة')
      ? 'وضع الضحك والتريقة: خليك ساخر وتريق وهزر لأقصى درجة، خفة دم مصرية حريفة وضحك بدون أي تكلف وبكلام مفهوم وبسيط.'
      : (config.tone === 'serious' || config.tone === 'جد وشاطر')
      ? 'وضع الجد والشطارة: رد بذكاء وعمق وسرعة بديهة، بس برضه بلهجة مصرية محترمة وطبيعية ومن غير تكلف وبكلام مفهوم.'
      : 'وضع رايق ومتوازن: امزج بين الفطنة وخفة الدم المصرية والحضور الطبيعي البسيط.';

    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n${toneDescription}`;

    const authorName = post?.author?.displayName || post?.author?.username || 'أحد الشباب';
    const postContent = post?.content || '';

    // Extract visual media (image or Cloudinary video snapshot frame)
    let visualMediaUrl = null;
    let isVideoMedia = false;

    if (post?.imageUrl && (post.imageUrl.startsWith('data:image/') || post.imageUrl.startsWith('http'))) {
      visualMediaUrl = post.imageUrl;
    } else if (Array.isArray(post?.images) && post.images.length > 0 && typeof post.images[0] === 'string') {
      visualMediaUrl = post.images[0];
    } else if (post?.videoUrl && typeof post.videoUrl === 'string' && post.videoUrl.startsWith('http')) {
      isVideoMedia = true;
      if (post.videoUrl.includes('cloudinary.com') && post.videoUrl.includes('/video/upload/')) {
        visualMediaUrl = post.videoUrl.replace('/video/upload/', '/video/upload/so_1,w_800,f_jpg/').replace(/\.[a-zA-Z0-9]+$/, '.jpg');
      }
    } else if (post?.mediaUrl && typeof post.mediaUrl === 'string' && post.mediaUrl.startsWith('http')) {
      const lower = post.mediaUrl.toLowerCase();
      if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')) {
        isVideoMedia = true;
        if (post.mediaUrl.includes('cloudinary.com') && post.mediaUrl.includes('/video/upload/')) {
          visualMediaUrl = post.mediaUrl.replace('/video/upload/', '/video/upload/so_1,w_800,f_jpg/').replace(/\.[a-zA-Z0-9]+$/, '.jpg');
        }
      } else {
        visualMediaUrl = post.mediaUrl;
      }
    }

    let userPrompt = `المستخدم (${authorName}) كتب: "${postContent}"`;
    if (visualMediaUrl) {
      userPrompt += `\n[ملاحظة هامة: البوست يرفق محتوى مرئي (${isVideoMedia ? 'فيديو' : 'صورة واضحة'}). ركز بنسبة 100% على ما تراه بوضوح وتفاعل معه مباشرة بخفة دم مصرية وممنوع منعاً باتاً التطرق لأي مواضيع خارجية].`;
    }

    if (comment) {
      const commenterName = comment.author?.displayName || comment.author?.username || 'مستخدم';
      userPrompt += `\nعلق (${commenterName}): "${comment.content}"\nالمطلوب: اكتب تعليقاً مصرياً سريعاً وطبيعياً من سطر أو سطرين بدون أي إيموجيز وبدون علامات تنصيص.`;
    } else {
      userPrompt += `\nالمطلوب: اكتب تعليقاً مصرياً أصيلاً وطبيعياً من سطر أو سطرين يتفاعل مباشرة مع كلامه والمحتوى المرئي إن وجد، بدون أي إيموجيز وبدون علامات تنصيص.`;
    }

    let userContent;
    if (visualMediaUrl) {
      userContent = [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: visualMediaUrl } }
      ];
    } else {
      userContent = userPrompt;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    return this.callChatApi(messages, { max_tokens: 140, temperature: 0.38 });
  },

  async generateDailyPulse() {
    const themes = [
      'سؤال رايق أو تريقة خفيفة عن مشاكل السهر وكود المبرمجين والباجز اللي بتظهر الفجر',
      'ملاحظة مصرية دمها خفيف عن الحياة اليومية والتكنولوجيا ومواقف السوشيال ميديا',
      'تحدي فكري أو نقاش مسلي يخلي مجتمع PULSE يتفاعل ويعلق فوراً',
      'كلمتين من القلب لمجتمع منصة PULSE بروح مصرية جدعة وضحكة رايقة'
    ];
    const chosenTheme = themes[Math.floor(Math.random() * themes.length)];

    // Feed real platform pulse digest so daily pulse reflects what community is discussing
    const liveDigest = sovythosRagEngine.getRecentPlatformDigest(5);
    let platformContextPrompt = '';
    if (liveDigest.length > 0) {
      platformContextPrompt = `\n[نبضات حية متداولة الآن على منصة PULSE]:\n${liveDigest.map((d) => `- ${d}`).join('\n')}\n(اجعل نبضتك متفاعلة بذكاء مع الروح العامة للنقاشات الحالية).`;
    }

    const systemPrompt = `${SYSTEM_PROMPT_BASE}
مطلوب منك الآن كتابة "نبضة" (Pulse) جديدة كمنشور كامل في التايم لاين.
الموضوع: ${chosenTheme}.
الشروط الصارمة:
- كلام مصري بسيط، مفهوم، وواضح 100%، وممنوع نهائياً أي كلمات غريبة أو طلاسم أو ركاكة غير مفهومة.
- تكون قصيرة، جذابة، تأسر القارئ وتخليه يعلق فوراً (من سطر إلى ثلاثة أسطر).
- ممنوع منعاً باتاً استخدام أي إيموجيز نهائياً في كلامك.
- اكتب النبضة مباشرة دون أي مقدمات أو علامات تنصيص.${platformContextPrompt}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'اكتب النبضة اليومية الآن لنشرها في PULSE.' }
    ];

    return this.callChatApi(messages, { max_tokens: 220, temperature: 0.45 });
  },

  async checkAndTriggerDailyPulse() {
    // Autonomous timeline pulses are strictly scheduled and published by the backend server daemon
    // enforcing a strict 36-48 hour interval (1 to 2 days) to prevent duplicate or excessive posts.
    return null;
  },

  async processMentionTrigger({ post, comment = null, actor = null, onReplyGenerated = null }) {
    const textToCheck = comment ? comment.content : (post ? post.content : '');
    if (!textToCheck && !comment) return;

    const isDirectReplyToSovythos = Boolean(
      comment && (
        comment.replyTo?.username?.toLowerCase() === 'sovythos' ||
        String(comment.replyTo?.id || '').includes('sovythos') ||
        (comment.parentId && String(comment.parentId).includes('sovythos'))
      )
    );

    const isMentioned = /@sovythos\b/i.test(textToCheck) || 
      /@sovy\b/i.test(textToCheck) || 
      textToCheck.includes('سوفيثوس') || 
      textToCheck.includes('سوفيتوس') || 
      isDirectReplyToSovythos;

    if (!isMentioned) return;

    if (actor?.uid === OFFICIAL_SOVYTHOS.uid || comment?.authorId === OFFICIAL_SOVYTHOS.uid) {
      return;
    }

    try {
      console.log('[Sovythos] Mention or direct reply detected! Generating witty Egyptian reply...');
      const replyText = await this.generateReply({ post, comment, caller: actor });
      if (!replyText) return;

      const replyComment = {
        id: 'comm_sovythos_' + Date.now(),
        authorId: OFFICIAL_SOVYTHOS.uid,
        author: OFFICIAL_SOVYTHOS,
        content: replyText,
        parentId: comment ? (comment.parentId || comment.id) : null,
        replyTo: comment ? {
          id: comment.id,
          username: comment.author?.username,
          displayName: comment.author?.displayName
        } : null,
        likes: [],
        createdAt: new Date().toISOString(),
        isAIReply: true
      };

      storageService.addComment(post.id, replyComment, OFFICIAL_SOVYTHOS);
      notificationService.playNotificationSound();

      if (onReplyGenerated) {
        onReplyGenerated(replyComment);
      }

      return replyComment;
    } catch (err) {
      console.error('[Sovythos] Error generating mention reply:', err);
      return null;
    }
  }
};
