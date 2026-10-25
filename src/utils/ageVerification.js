/**
 * PULSE Carrier-Grade Age Verification & Sensitive Content Protection Engine
 * - Complies with App Store & Google Play Safety Guidelines for +17 / +18 Content
 * - Handles age verification, sensitive content warnings, and feed filtering
 * - Zero emoji policy enforced across all return strings and logs
 */

export const SENSITIVE_PREFERENCES = {
  WARN: 'warn', // Default: Blur media with adult warning card & reveal button
  SHOW: 'show', // Auto-show media without warning (strictly restricted to verified 18+ users)
  HIDE: 'hide'  // Block & completely filter out sensitive posts from feeds
};

const STORAGE_KEYS = {
  PREFERENCE: 'pulse_sensitive_content_pref',
  REVEALED_POSTS: 'pulse_revealed_sensitive_posts'
};

/**
 * Calculates user age in full years from birth date string (YYYY-MM-DD)
 */
export function calculateAge(birthDateString) {
  if (!birthDateString) return null;
  const birth = new Date(birthDateString);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Verifies if user is at least 18 years of age based on registered birthdate
 */
export function isUserAdult(user) {
  if (!user) return false;
  const bdate = user.birthDate || user.birthdate;
  if (!bdate) return false;
  const age = calculateAge(bdate);
  return age !== null && age >= 18;
}

/**
 * Gets the current sensitive content preference with automatic minor protection
 */
export function getSensitiveContentPref(currentUser = null) {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCE);
    const valid = [SENSITIVE_PREFERENCES.WARN, SENSITIVE_PREFERENCES.SHOW, SENSITIVE_PREFERENCES.HIDE];
    const pref = valid.includes(saved) ? saved : SENSITIVE_PREFERENCES.WARN;

    // Hard Gate: If user is not confirmed 18+, never allow 'show' mode
    if (pref === SENSITIVE_PREFERENCES.SHOW && !isUserAdult(currentUser)) {
      return SENSITIVE_PREFERENCES.WARN;
    }

    return pref;
  } catch {
    return SENSITIVE_PREFERENCES.WARN;
  }
}

/**
 * Sets user sensitive content preference and broadcasts system event
 */
export function setSensitiveContentPref(pref, currentUser = null) {
  const valid = [SENSITIVE_PREFERENCES.WARN, SENSITIVE_PREFERENCES.SHOW, SENSITIVE_PREFERENCES.HIDE];
  const targetPref = valid.includes(pref) ? pref : SENSITIVE_PREFERENCES.WARN;

  // Strict age gate check for auto-show mode
  if (targetPref === SENSITIVE_PREFERENCES.SHOW && !isUserAdult(currentUser)) {
    throw new Error('عذراً، خيار الإظهار التلقائي متاح حصرياً للمستخدمين الذين تبلغ أعمارهم 18 عاماً أو أكثر.');
  }

  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCE, targetPref);
    window.dispatchEvent(
      new CustomEvent('pulse_preference_changed', {
        detail: { type: 'sensitive_pref', value: targetPref }
      })
    );
  } catch (e) {
    console.warn('Failed to save sensitive preference:', e);
  }
  return targetPref;
}

/**
 * Checks whether a post is marked as sensitive or contains adult media tags
 */
export function isPostSensitive(post) {
  if (!post) return false;
  return Boolean(
    post.isSensitive ||
    post.sensitive ||
    post.sensitiveType === 'adult' ||
    post.contentWarning ||
    (Array.isArray(post.tags) && (post.tags.includes('18+') || post.tags.includes('nsfw')))
  );
}

/**
 * Determines whether media within a post must be blurred with warning overlay
 */
export function shouldBlurMedia(post, currentUser = null, isExplicitlyRevealed = false) {
  if (!isPostSensitive(post)) return false;
  if (isExplicitlyRevealed) return false;

  const pref = getSensitiveContentPref(currentUser);

  // If user is 18+ and chose 'show', do not blur
  if (pref === SENSITIVE_PREFERENCES.SHOW && isUserAdult(currentUser)) {
    return false;
  }

  // Otherwise, default to safe blur mode
  return true;
}
