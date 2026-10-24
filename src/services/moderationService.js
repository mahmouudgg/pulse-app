/**
 * PULSE Official Anti-Abuse, Moderation & Rate Limiting Service
 * - Enforces anti-spam posting & commenting cooldowns
 * - Multi-language profanity & hate-speech detection with diacritic normalization
 * - Direct Realtime Firebase synchronization for community reports (reports/ node)
 * - Persistent local & cloud blocking filters
 * - Real Muted users filter, Custom hidden words, Sensitivity modes & Political limiter
 */

import { database } from './firebase';
import { ref, set } from 'firebase/database';

const STORAGE_KEYS = {
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
];

// Profanity / Abuse dictionary (Arabic & English common slurs and spam patterns)
const BLOCKED_WORDS = [
  // Spam / Scam patterns
  'ربح فوري', 'اربح آلاف', 'توزيع جوائز', 'hack', 'free money', 'crypto scam', 'click here for free',
  // Common abusive terms
  'شتيمة', 'قذر', 'حقير', 'لعنة', 'سافل', 'حيوان', 'حمار', 'كلب', 'stupid', 'idiot', 'scam', 'bitch', 'asshole'
];

export const moderationService = {
  // 1. Post Rate Limiting (Default 10s cooldown)
  checkRateLimit(cooldownSeconds = 10) {
    const lastTimeStr = localStorage.getItem(STORAGE_KEYS.LAST_POST_TIME);
    if (!lastTimeStr) return { allowed: true };

    const lastTime = parseInt(lastTimeStr, 10);
    const elapsedSeconds = Math.floor((Date.now() - lastTime) / 1000);

    if (elapsedSeconds < cooldownSeconds) {
      const waitTime = cooldownSeconds - elapsedSeconds;
      return {
        allowed: false,
        waitTime,
        message: `تم تفعيل حماية السبام (Rate Limit). يرجى الانتظار ${waitTime} ثانية قبل نشر نبضة جديدة.`
      };
    }

    return { allowed: true };
  },

  recordPostTimestamp() {
    localStorage.setItem(STORAGE_KEYS.LAST_POST_TIME, Date.now().toString());
  },

  // 1.0 Duplicate Content Shield (Prevents spam flooding within 60s)
  checkDuplicateContent(text, windowSeconds = 60) {
    if (!text || !text.trim()) return { allowed: true };
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LAST_POST_CONTENT);
      if (!saved) return { allowed: true };
      const parsed = JSON.parse(saved);
      const elapsed = Math.floor((Date.now() - (parsed.timestamp || 0)) / 1000);
      if (elapsed < windowSeconds && parsed.text?.trim().toLowerCase() === text.trim().toLowerCase()) {
        const waitTime = windowSeconds - elapsed;
        return {
          allowed: false,
          waitTime,
          message: `تم رصد محتوى مكرر. يرجى التمهل (${waitTime} ثانية) أو تغيير صياغة النبضة قبل إعادة النشر.`
        };
      }
    } catch {
      return { allowed: true };
    }
    return { allowed: true };
  },

  recordPostContent(text) {
    if (!text || !text.trim()) return;
    try {
      localStorage.setItem(
        STORAGE_KEYS.LAST_POST_CONTENT,
        JSON.stringify({ text: text.trim(), timestamp: Date.now() })
      );
    } catch {}
  },

  // 1.1 Comment Rate Limiting (Minimum 3s between comments to prevent bot flooding)
  checkCommentRateLimit(cooldownSeconds = 3) {
    const lastTimeStr = localStorage.getItem(STORAGE_KEYS.LAST_COMMENT_TIME);
    if (!lastTimeStr) return { allowed: true };

    const lastTime = parseInt(lastTimeStr, 10);
    const elapsedSeconds = Math.floor((Date.now() - lastTime) / 1000);

    if (elapsedSeconds < cooldownSeconds) {
      const waitTime = cooldownSeconds - elapsedSeconds;
      return {
        allowed: false,
        waitTime,
        message: `يرجى التمهل قليلاً (${waitTime} ثانية) قبل إرسال تعليق آخر منعاً للإغراق.`
      };
    }

    return { allowed: true };
  },

  recordCommentTimestamp() {
    localStorage.setItem(STORAGE_KEYS.LAST_COMMENT_TIME, Date.now().toString());
  },

  // 2. Profanity & Hate-Speech Filter with diacritics stripping
  checkProfanity(text) {
    if (!text) return { clean: true };

    // Strip Arabic diacritics, tatweel, and normalize spaces
    const normalized = text
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/\s+/g, ' ');

    for (const word of BLOCKED_WORDS) {
      if (normalized.includes(word.toLowerCase())) {
        return {
          clean: false,
          flaggedWord: word,
          message: 'تم حظر المنشور: يحتوي على كلمات غير ملائمة أو نمط سبام يخالف سياسة مجتمع Pulse النظيف.'
        };
      }
    }

    return { clean: true };
  },

  // 3. Reporting System (Local + Firebase RTDB Cloud Sync)
  async reportContent(reportData) {
    try {
      const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
      const newReport = {
        id: 'rep_' + Date.now(),
        postId: reportData.postId || null,
        targetUserId: reportData.targetUserId || null,
        reporterId: reportData.reporterId || 'anonymous',
        reason: reportData.reason || 'unspecified',
        additionalNotes: reportData.notes || '',
        createdAt: new Date().toISOString(),
        status: 'pending_review'
      };

      reports.push(newReport);
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

      // Direct Firebase RTDB Cloud Dispatch for platform administrators
      try {
        const reportRef = ref(database, `reports/${newReport.id}`);
        await set(reportRef, newReport);
      } catch (cloudErr) {
        console.warn('Firebase Realtime report sync notice:', cloudErr);
      }

      return newReport;
    } catch (e) {
      console.error('Error reporting:', e);
    }
  },

  // 4. PULSE Official Carrier-Grade Bidirectional Block System
  getBlockedUsers(currentUserId = null) {
    try {
      const set = new Set();
      // 1. From local storage general cache
      const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED);
      if (raw) {
        JSON.parse(raw).forEach((id) => set.add(id));
      }
      // 2. From current user session if available
      if (currentUserId) {
        const userRaw = localStorage.getItem('pulse_current_user');
        if (userRaw) {
          const u = JSON.parse(userRaw);
          if (u.uid === currentUserId && u.blockedUsers) {
            if (Array.isArray(u.blockedUsers)) {
              u.blockedUsers.forEach((id) => set.add(id));
            } else if (typeof u.blockedUsers === 'object') {
              Object.keys(u.blockedUsers).forEach((id) => set.add(id));
            }
          }
        }
      }
      return Array.from(set);
    } catch {
      return [];
    }
  },

  getBlockedByUsers(currentUserId) {
    if (!currentUserId) return [];
    try {
      const userRaw = localStorage.getItem('pulse_current_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.uid === currentUserId && u.blockedBy) {
          if (Array.isArray(u.blockedBy)) return u.blockedBy;
          if (typeof u.blockedBy === 'object') return Object.keys(u.blockedBy);
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async blockUser(targetUserId, currentUser = null) {
    if (!targetUserId) return;
    const currentUid = currentUser?.uid || 'anon';
    if (targetUserId === currentUid) return;

    // 1. Update local cache
    const blocked = this.getBlockedUsers(currentUid);
    if (!blocked.includes(targetUserId)) {
      blocked.push(targetUserId);
      localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(blocked));
    }

    // 2. Update currentUser document in localStorage
    try {
      const userRaw = localStorage.getItem('pulse_current_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.uid === currentUid) {
          u.blockedUsers = u.blockedUsers || {};
          if (Array.isArray(u.blockedUsers)) {
            if (!u.blockedUsers.includes(targetUserId)) u.blockedUsers.push(targetUserId);
          } else {
            u.blockedUsers[targetUserId] = true;
          }
          localStorage.setItem('pulse_current_user', JSON.stringify(u));
        }
      }
    } catch {}

    // 3. Sever follow relationships bidirectionally in storageService
    try {
      const { storageService } = await import('./storageService.js');
      if (storageService && typeof storageService.severRelationship === 'function') {
        storageService.severRelationship(currentUid, targetUserId);
      }
    } catch (e) {
      console.warn('Error severing relationship:', e);
    }

    // 4. Cloud sync to Firebase RTDB (Both blocker and blocked nodes)
    try {
      if (currentUid && currentUid !== 'anon') {
        const blockerRef = ref(database, `users/${currentUid}/blockedUsers/${targetUserId}`);
        const blockedRef = ref(database, `users/${targetUserId}/blockedBy/${currentUid}`);
        await Promise.allSettled([
          set(blockerRef, true),
          set(blockedRef, true)
        ]);
      }
    } catch (cloudErr) {
      console.warn('Firebase RTDB block sync notice:', cloudErr);
    }
  },

  async unblockUser(targetUserId, currentUser = null) {
    if (!targetUserId) return;
    const currentUid = currentUser?.uid || 'anon';

    // 1. Update local cache
    const blocked = this.getBlockedUsers(currentUid).filter((id) => id !== targetUserId);
    localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(blocked));

    // 2. Update currentUser document in localStorage
    try {
      const userRaw = localStorage.getItem('pulse_current_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u.uid === currentUid) {
          if (Array.isArray(u.blockedUsers)) {
            u.blockedUsers = u.blockedUsers.filter((id) => id !== targetUserId);
          } else if (u.blockedUsers && typeof u.blockedUsers === 'object') {
            delete u.blockedUsers[targetUserId];
          }
          localStorage.setItem('pulse_current_user', JSON.stringify(u));
        }
      }
    } catch {}

    // 3. Cloud removal from Firebase RTDB
    try {
      if (currentUid && currentUid !== 'anon') {
        const { remove } = await import('firebase/database');
        const blockerRef = ref(database, `users/${currentUid}/blockedUsers/${targetUserId}`);
        const blockedRef = ref(database, `users/${targetUserId}/blockedBy/${currentUid}`);
        await Promise.allSettled([
          remove(blockerRef),
          remove(blockedRef)
        ]);
      }
    } catch (cloudErr) {
      console.warn('Firebase RTDB unblock sync notice:', cloudErr);
    }
  },

  // Check if userA blocked userB OR userB blocked userA (True Bidirectional Shield)
  isUserBlocked(userAId, userBId = null) {
    if (!userAId) return false;
    
    // Single-argument legacy compatibility: check against local blocked list
    if (!userBId) {
      return this.getBlockedUsers().includes(userAId);
    }

    if (userAId === userBId) return false;

    // 1. Did userA block userB?
    const userABlocked = this.getBlockedUsers(userAId);
    if (userABlocked.includes(userBId)) return true;

    // 2. Did userB block userA?
    const userBBlocked = this.getBlockedUsers(userBId);
    if (userBBlocked.includes(userAId)) return true;

    // 3. Check blockedBy lists
    const userABlockedBy = this.getBlockedByUsers(userAId);
    if (userABlockedBy.includes(userBId)) return true;

    const userBBlockedBy = this.getBlockedByUsers(userBId);
    if (userBBlockedBy.includes(userAId)) return true;

    return false;
  },

  // Did targetUserId specifically block currentUserId?
  isBlockedBy(targetUserId, currentUserId) {
    if (!targetUserId || !currentUserId || targetUserId === currentUserId) return false;
    const blockedBy = this.getBlockedByUsers(currentUserId);
    if (blockedBy.includes(targetUserId)) return true;

    // Also check if target's blocked list has currentUserId
    const targetBlocked = this.getBlockedUsers(targetUserId);
    if (targetBlocked.includes(currentUserId)) return true;

    return false;
  },

  // 5. PULSE Carrier-Grade Muted Users System
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
    return list.map((item) => (typeof item === 'string' ? item : item.uid || item.id)).filter(Boolean);
  },

  muteUser(targetUser, currentUser = null) {
    if (!targetUser) return;
    const uid = typeof targetUser === 'string' ? targetUser : (targetUser.uid || targetUser.id);
    if (!uid) return;
    const currentUid = currentUser?.uid || 'anon';
    if (uid === currentUid) return;

    const list = this.getMutedUsers(currentUid);
    const exists = list.some((item) => (typeof item === 'string' ? item === uid : item.uid === uid));
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
    const updated = list.filter((item) => (typeof item === 'string' ? item !== targetUid : item.uid !== targetUid));
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
    const cleaned = Array.from(new Set(wordsList.map((w) => String(w).trim().toLowerCase()).filter(Boolean)));
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
    this.setHiddenWords(words.filter((w) => w !== cleanWord));
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
        ? followingList.map((item) => (typeof item === 'string' ? item : item.uid || item.id)).filter(Boolean)
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
  },

  // 9. Real Account Standing & Moderation Health Check
  getAccountStanding(currentUser = null) {
    const defaultStanding = {
      isGoodStanding: true,
      hasRemovedContent: false,
      removedItems: [],
      isFeedLowered: false,
      feedLoweredReason: null,
      hasRestrictedFeatures: false,
      restrictedFeatures: []
    };

    if (!currentUser) return defaultStanding;

    try {
      const strikesRaw = localStorage.getItem('pulse_account_strikes');
      const strikes = strikesRaw ? JSON.parse(strikesRaw) : (currentUser.strikes || []);
      const hasStrikes = Array.isArray(strikes) && strikes.length > 0;
      const isMuted = Boolean(currentUser.isMuted);
      const isBanned = Boolean(currentUser.isBanned);
      const reachPenalty = Boolean(currentUser.reachPenalty);

      return {
        isGoodStanding: !hasStrikes && !isMuted && !isBanned && !reachPenalty,
        hasRemovedContent: hasStrikes,
        removedItems: Array.isArray(strikes) ? strikes : [],
        isFeedLowered: reachPenalty,
        feedLoweredReason: reachPenalty ? 'Algorithmic spam mitigation' : null,
        hasRestrictedFeatures: isMuted || isBanned,
        restrictedFeatures: isMuted ? ['Direct Messages'] : isBanned ? ['All Features'] : []
      };
    } catch {
      return defaultStanding;
    }
  }
};
