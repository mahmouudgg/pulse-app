import os

path = r'src/services/moderationService.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace STORAGE_KEYS
old_keys = """const STORAGE_KEYS = {
  REPORTS: 'pulse_reports_v1',
  BLOCKED: 'pulse_blocked_users_v1',
  LAST_POST_TIME: 'pulse_last_post_ts',
  LAST_COMMENT_TIME: 'pulse_last_comment_ts',
  LAST_POST_CONTENT: 'pulse_last_post_content'
};"""

new_keys = """const STORAGE_KEYS = {
  REPORTS: 'pulse_reports_v1',
  BLOCKED: 'pulse_blocked_users_v1',
  MUTED: 'pulse_muted_users_v1',
  HIDDEN_WORDS: 'pulse_hidden_words_v1',
  SENSITIVE_LEVEL: 'pulse_sensitive_level',
  LIMIT_POLITICAL: 'pulse_limit_political',
  HIDE_LIKES: 'pulse_hide_likes_counts',
  AUTO_OFFENSIVE: 'pulse_autofilter_offensive',
  LAST_POST_TIME: 'pulse_last_post_ts',
  LAST_COMMENT_TIME: 'pulse_last_comment_ts',
  LAST_POST_CONTENT: 'pulse_last_post_content'
};

// Sensitive & adult keywords detection
const SENSITIVE_KEYWORDS = [
  'nsfw', '18+', 'adult', 'violence', 'blood', 'gore', 'sex', 'kill',
  'إباحي', 'عنف', 'دموي', 'سلاح', 'قتل', 'مخدرات', 'جريمة', 'تحذير محتوى', 'حساس'
];

// Political keywords detection
const POLITICAL_KEYWORDS = [
  'انتخابات', 'رئاسة', 'برلمان', 'حكومة', 'سياسة', 'حزب', 'دستور', 'مرشح', 'مجلس النواب',
  'election', 'politics', 'parliament', 'senate', 'democrat', 'republican', 'regime', 'government'
];"""

# Normalize CRLF
content_norm = content.replace('\r\n', '\n')
old_keys_norm = old_keys.replace('\r\n', '\n')

if old_keys_norm in content_norm:
    content_norm = content_norm.replace(old_keys_norm, new_keys.replace('\r\n', '\n'), 1)
    print("Replaced STORAGE_KEYS")
else:
    print("Could not find old_keys")

# Add Muted & Preferences Methods and enhanced filterBlockedPosts
old_filter = """  filterBlockedPosts(posts, currentUserId = null) {
    if (!Array.isArray(posts) || posts.length === 0) return [];
    const blocked = this.getBlockedUsers(currentUserId);
    const blockedBy = currentUserId ? this.getBlockedByUsers(currentUserId) : [];
    const allBlockedIds = new Set([...blocked, ...blockedBy]);

    if (allBlockedIds.size === 0) return posts;

    return posts.filter((p) => {
      const authorId = p.authorId || p.author?.uid;
      const authorUsername = p.author?.username;
      const repostedByUid = p.repostedBy?.uid;

      if (authorId && allBlockedIds.has(authorId)) return false;
      if (authorUsername && allBlockedIds.has(authorUsername)) return false;
      if (repostedByUid && allBlockedIds.has(repostedByUid)) return false;
      return true;
    });
  }"""

new_methods = """  // 5. PULSE Muted Users System
  getMutedUsers(currentUserId = null) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MUTED);
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      return list;
    } catch {
      return [];
    }
  },

  getMutedUserIds(currentUserId = null) {
    const list = this.getMutedUsers(currentUserId);
    return list.map(item => (typeof item === 'string' ? item : item.uid || item.id)).filter(Boolean);
  },

  muteUser(targetUser, currentUser = null) {
    if (!targetUser) return;
    const uid = typeof targetUser === 'string' ? targetUser : (targetUser.uid || targetUser.id);
    if (!uid) return;
    const currentUid = currentUser?.uid || 'anon';
    if (uid === currentUid) return;

    const list = this.getMutedUsers(currentUid);
    const exists = list.some(item => (typeof item === 'string' ? item === uid : item.uid === uid));
    if (!exists) {
      const userObj = typeof targetUser === 'object' ? {
        uid: targetUser.uid || targetUser.id,
        username: targetUser.username || '',
        displayName: targetUser.displayName || targetUser.username || 'PULSE User',
        avatar: targetUser.avatar || ''
      } : { uid };
      list.push(userObj);
      localStorage.setItem(STORAGE_KEYS.MUTED, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('pulse_preference_changed', { detail: { type: 'muted' } }));
      window.dispatchEvent(new CustomEvent('pulse_muted_users_changed', { detail: { list } }));
    }
  },

  unmuteUser(targetUid, currentUser = null) {
    if (!targetUid) return;
    const currentUid = currentUser?.uid || 'anon';
    const list = this.getMutedUsers(currentUid);
    const updated = list.filter(item => (typeof item === 'string' ? item !== targetUid : item.uid !== targetUid));
    localStorage.setItem(STORAGE_KEYS.MUTED, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('pulse_preference_changed', { detail: { type: 'muted' } }));
    window.dispatchEvent(new CustomEvent('pulse_muted_users_changed', { detail: { list: updated } }));
  },

  isUserMuted(targetUid, currentUserId = null) {
    if (!targetUid) return false;
    const ids = this.getMutedUserIds(currentUserId);
    return ids.includes(targetUid);
  },

  // 6. Custom Hidden Words System
  getHiddenWords(currentUserId = null) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HIDDEN_WORDS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  },

  setHiddenWords(wordsList) {
    if (!Array.isArray(wordsList)) return;
    const cleaned = Array.from(new Set(wordsList.map(w => String(w).trim().toLowerCase()).filter(Boolean)));
    localStorage.setItem(STORAGE_KEYS.HIDDEN_WORDS, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent('pulse_preference_changed', { detail: { type: 'hidden_words', list: cleaned } }));
  },

  addHiddenWord(word) {
    if (!word || !word.trim()) return;
    const words = this.getHiddenWords();
    const cleanWord = word.trim().toLowerCase();
    if (!words.includes(cleanWord)) {
      this.setHiddenWords([...words, cleanWord]);
    }
  },

  removeHiddenWord(word) {
    const words = this.getHiddenWords();
    const cleanWord = word.trim().toLowerCase();
    this.setHiddenWords(words.filter(w => w !== cleanWord));
  },

  // 7. Sensitivity, Political Limiter & Like Count Preferences
  getSensitiveLevel() {
    return localStorage.getItem(STORAGE_KEYS.SENSITIVE_LEVEL) || 'standard';
  },

  setSensitiveLevel(level) {
    localStorage.setItem(STORAGE_KEYS.SENSITIVE_LEVEL, level);
    window.dispatchEvent(new CustomEvent('pulse_preference_changed', { detail: { type: 'sensitive', level } }));
  },

  getPoliticalLimit() {
    return localStorage.getItem(STORAGE_KEYS.LIMIT_POLITICAL) !== 'false';
  },

  setPoliticalLimit(limit) {
    localStorage.setItem(STORAGE_KEYS.LIMIT_POLITICAL, limit ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('pulse_preference_changed', { detail: { type: 'political', limit } }));
  },

  getHideLikeCounts() {
    return localStorage.getItem(STORAGE_KEYS.HIDE_LIKES) === 'true';
  },

  setHideLikeCounts(hide) {
    localStorage.setItem(STORAGE_KEYS.HIDE_LIKES, hide ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('pulse_preference_changed', { detail: { type: 'hide_likes', hide } }));
  },

  // 8. Comprehensive Feed Content Filter (Blocks + Mutes + Hidden Words + Sensitive + Political)
  filterBlockedPosts(posts, currentUserId = null, followingList = []) {
    if (!Array.isArray(posts) || posts.length === 0) return [];

    // Blocked users set
    const blocked = this.getBlockedUsers(currentUserId);
    const blockedBy = currentUserId ? this.getBlockedByUsers(currentUserId) : [];
    const allBlockedIds = new Set([...blocked, ...blockedBy]);

    // Muted users set
    const mutedIds = new Set(this.getMutedUserIds(currentUserId));

    // Custom hidden words
    const hiddenWords = this.getHiddenWords(currentUserId);

    // Auto offensive shield
    const autoOffensive = localStorage.getItem(STORAGE_KEYS.AUTO_OFFENSIVE) !== 'false';

    // Sensitive content mode ('less' | 'standard' | 'more')
    const sensitiveLevel = this.getSensitiveLevel();

    // Political limiter (boolean)
    const limitPolitical = this.getPoliticalLimit();

    // Following IDs set for bypassing sensitive/political filters
    const followingSet = new Set(
      Array.isArray(followingList)
        ? followingList.map(item => (typeof item === 'string' ? item : item.uid || item.id)).filter(Boolean)
        : []
    );

    return posts.filter((p) => {
      const authorId = p.authorId || p.author?.uid;
      const authorUsername = p.author?.username;
      const repostedByUid = p.repostedBy?.uid;

      // Filter blocked
      if (authorId && allBlockedIds.has(authorId)) return false;
      if (authorUsername && allBlockedIds.has(authorUsername)) return false;
      if (repostedByUid && allBlockedIds.has(repostedByUid)) return false;

      // Filter muted
      if (authorId && mutedIds.has(authorId)) return false;
      if (repostedByUid && mutedIds.has(repostedByUid)) return false;

      // Text normalization
      const contentText = (p.content || '').toLowerCase();
      const altText = (p.altText || '').toLowerCase();
      const fullText = `${contentText} ${altText}`;

      // Filter custom hidden words
      if (hiddenWords.length > 0) {
        for (const hw of hiddenWords) {
          if (hw && fullText.includes(hw)) return false;
        }
      }

      // Filter offensive words if shield enabled
      if (autoOffensive) {
        for (const bw of BLOCKED_WORDS) {
          if (fullText.includes(bw.toLowerCase())) return false;
        }
      }

      // Followed accounts bypass sensitive & political filters (Threads spec)
      const isAuthorFollowed = authorId ? (authorId === currentUserId || followingSet.has(authorId)) : false;

      if (!isAuthorFollowed) {
        // Sensitive content filtering
        if (sensitiveLevel === 'less') {
          const isFlaggedSensitive = Boolean(p.isSensitive || p.sensitive || p.contentWarning);
          if (isFlaggedSensitive) return false;
          for (const kw of SENSITIVE_KEYWORDS) {
            if (fullText.includes(kw)) return false;
          }
        }

        // Political content limiter
        if (limitPolitical) {
          const isFlaggedPolitical = Boolean(p.isPolitical || p.topic === 'سياسة' || p.topic === 'politics');
          if (isFlaggedPolitical) return false;
          for (const pk of POLITICAL_KEYWORDS) {
            if (fullText.includes(pk)) return false;
          }
        }
      }

      return true;
    });
  }"""

old_filter_norm = old_filter.replace('\r\n', '\n')
if old_filter_norm in content_norm:
    content_norm = content_norm.replace(old_filter_norm, new_methods.replace('\r\n', '\n'), 1)
    print("Replaced filterBlockedPosts with enhanced methods")
else:
    print("Could not find old_filter")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content_norm)

print("Saved", path)
