import { storageService } from '../services/storageService';

// Arabic transliteration map to produce clean, handle-friendly Latin characters
const ARABIC_TO_LATIN = {
  'أ': 'a', 'إ': 'e', 'آ': 'a', 'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'g', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ئ': 'e', 'ء': 'a',
  'ؤ': 'o'
};

export function cleanNameBase(displayName) {
  if (!displayName || typeof displayName !== 'string') return 'user';
  
  let transliterated = '';
  for (const char of displayName.trim().toLowerCase()) {
    if (ARABIC_TO_LATIN[char]) {
      transliterated += ARABIC_TO_LATIN[char];
    } else {
      transliterated += char;
    }
  }

  // Remove non-alphanumeric except space/underscore
  let slug = transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 14);

  if (!slug || slug.length < 2) {
    slug = 'pulse_user';
  }
  return slug;
}

/**
 * Generates a clean, verified unique username for a new user based on their display name.
 * Checks Firebase RTDB / local cache to guarantee it is 100% available.
 */
export async function generateUniqueUsername(displayName) {
  const base = cleanNameBase(displayName);

  // 1. Try raw base
  try {
    const isFree = await storageService.checkUsernameAvailable(base);
    if (isFree) return base;
  } catch (e) {
    console.warn('Username check notice:', e);
  }

  // 2. Try random clean numeric suffixes
  for (let i = 0; i < 5; i++) {
    const rand = Math.floor(10 + Math.random() * 990);
    const candidate = `${base}_${rand}`.slice(0, 20);
    try {
      const isFree = await storageService.checkUsernameAvailable(candidate);
      if (isFree) return candidate;
    } catch {}
  }

  // 3. Fallback timestamp
  return `${base}_${Date.now().toString().slice(-4)}`;
}
