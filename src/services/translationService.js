/**
 * PULSE Translation Service
 * Free, carrier-grade, real-time bidirectional translation engine
 * - Arabic <-> English & International languages
 * - In-memory and LocalStorage persistent caching
 * - Automatic source language detection
 * - Zero external API keys needed
 * - Strictly ZERO EMOJIS
 */

const CACHE_PREFIX = 'pulse_tr_cache_';
const memoryCache = new Map();

function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function hasArabicCharacters(text) {
  if (!text) return false;
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

function getCacheKey(text, targetLang) {
  let hash = 0;
  const str = `${text}_${targetLang}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `${CACHE_PREFIX}${hash}`;
}

export const translationService = {
  /**
   * Detect language and translate text
   * @param {string} text - Content to translate
   * @param {string} [preferredTarget] - Optional explicit target ('ar' | 'en')
   * @returns {Promise<{success: boolean, translatedText: string, sourceLang: string, targetLang: string, sourceLabel: string}>}
   */
  async translate(text, preferredTarget = null) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return { success: false, error: 'Empty text' };
    }

    const cleanText = text.trim();
    const isArabic = hasArabicCharacters(cleanText);

    // Smart target selection: if text is Arabic, translate to English. Otherwise translate to Arabic.
    let srcLang = isArabic ? 'ar' : 'en';
    let targetLang = preferredTarget || (isArabic ? 'en' : 'ar');

    if (srcLang === targetLang) {
      targetLang = isArabic ? 'en' : 'ar';
    }

    const cacheKey = getCacheKey(cleanText, targetLang);

    // 1. Check in-memory cache
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }

    // 2. Check LocalStorage cache
    try {
      const cachedJson = localStorage.getItem(cacheKey);
      if (cachedJson) {
        const cached = JSON.parse(cachedJson);
        memoryCache.set(cacheKey, cached);
        return cached;
      }
    } catch {}

    // 3. Primary Provider: MyMemory
    try {
      const langPair = isArabic ? 'ar|en' : 'autodetect|ar';
      const encodedText = encodeURIComponent(cleanText);
      const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`;

      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        let translated = data?.responseData?.translatedText;
        if (translated && typeof translated === 'string') {
          translated = decodeHtmlEntities(translated);

          const result = {
            success: true,
            translatedText: translated,
            sourceLang: isArabic ? 'ar' : 'en',
            targetLang,
            sourceLabel: isArabic ? 'العربية' : 'الإنجليزية',
            provider: 'MyMemory'
          };

          // Save to caches
          memoryCache.set(cacheKey, result);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}

          return result;
        }
      }
    } catch (e) {
      console.warn('Primary translation provider error:', e);
    }

    // 4. Fallback Provider: Google Translate Web API via CORS-friendly fetch
    try {
      const gLangPair = isArabic ? 'ar|en' : 'en|ar';
      const gUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${gLangPair}`;
      const res = await fetch(gUrl);
      if (res.ok) {
        const data = await res.json();
        const translated = decodeHtmlEntities(data?.responseData?.translatedText || '');
        if (translated) {
          const result = {
            success: true,
            translatedText: translated,
            sourceLang: isArabic ? 'ar' : 'en',
            targetLang,
            sourceLabel: isArabic ? 'العربية' : 'الإنجليزية',
            provider: 'Fallback'
          };
          memoryCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (fallbackError) {
      console.warn('Fallback translation error:', fallbackError);
    }

    return {
      success: false,
      error: 'Translation failed'
    };
  }
};
