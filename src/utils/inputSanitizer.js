/**
 * PULSE Input Sanitization & Integrity Guard
 * Protects Firebase RTDB writes from malformed payloads, injection vectors,
 * and prototype pollution.
 * 
 * STRICT ZERO EMOJIS IN INTERNAL STRINGS.
 */

export const inputSanitizer = {
  /**
   * Basic string sanitization: strips null bytes, trims, and enforces max length
   */
  sanitizeText(str, maxLength = 4000) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/\0/g, '') // strip null bytes
      .replace(/[\u202A-\u202E\u2066-\u2069]/g, '') // strip invisible direction overrides that can spoof text
      .trim()
      .slice(0, maxLength);
  },

  /**
   * Sanitize username: lowercase, letters, numbers, underscores only (max 30 chars)
   */
  sanitizeUsername(username) {
    if (typeof username !== 'string') return '';
    return username
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30);
  },

  /**
   * Sanitize display name (max 50 chars, no HTML tags)
   */
  sanitizeDisplayName(name) {
    if (typeof name !== 'string') return '';
    return name
      .replace(/<[^>]*>?/gm, '') // strip HTML tags
      .trim()
      .slice(0, 50);
  },

  /**
   * Sanitize bio (max 160 chars)
   */
  sanitizeBio(bio) {
    return this.sanitizeText(bio, 160);
  },

  /**
   * Deep sanitize an object to strip dangerous keys (__proto__, constructor, undefined)
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (value === undefined) continue;

      if (value !== null && typeof value === 'object') {
        clean[key] = this.sanitizeObject(value);
      } else if (typeof value === 'string') {
        clean[key] = value.replace(/\0/g, '');
      } else {
        clean[key] = value;
      }
    }
    return clean;
  },

  /**
   * Validate post before saving
   */
  validatePost(post, isPro = false) {
    if (!post || typeof post !== 'object') {
      throw new Error('Invalid post payload');
    }

    const maxLen = isPro ? 4000 : 500;
    const content = this.sanitizeText(post.content || '', maxLen);

    const clean = {
      ...this.sanitizeObject(post),
      content
    };

    return clean;
  },

  /**
   * Validate comment before saving
   */
  validateComment(comment) {
    if (!comment || typeof comment !== 'object') {
      throw new Error('Invalid comment payload');
    }

    const content = this.sanitizeText(comment.content || '', 1000);
    return {
      ...this.sanitizeObject(comment),
      content
    };
  }
};
