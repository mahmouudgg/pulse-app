/**

 * Production-Grade Storage Service with Firebase Realtime Database & Cloud Storage

 * Pre-seeded ONLY with the Official Developer / Founder Account:

 * Name: mahmoud yasser | Username: my | Password: Mahmoud.15

 */

import { notificationService } from './notificationService';

import { database } from './firebase';

import { ref, set, get, update, remove, onValue, query, orderByKey, limitToLast, endBefore, orderByChild, equalTo } from 'firebase/database';

import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';

import { SOVYTHOS_AVATAR } from '../assets/sovythosAvatar';

const STORAGE_KEYS = {

  USERS: 'pulse_users_v5',

  POSTS: 'pulse_posts_v5',

  COMMENTS: 'pulse_comments_v5',

  SESSION: 'pulse_session_user',

  FOLLOW_REQUESTS: 'pulse_follow_requests_v1'

};

// Official Founder & Lead Developer Account

const OFFICIAL_FOUNDER = {

  uid: 'dev_mahmoud_yasser',

  email: 'mahmoud@pulse.app',

  username: 'my',

  password: 'Mahmoud.15',

  displayName: 'Mahmoud Yasser',

  avatar: 'https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1790975396/pulse_avatars/n8mgz5cjlonjrcfyr4bo.jpg',

  bio: 'بيقولوا عليا صاحب البرنامج تقريبا.',

  website: '',

  location: 'CAIRO, EGYPT',

  isVerified: true,

  isFounder: true,

  isBanned: false,

  isPioneer: false,

  pioneerNumber: null,

  badgeTitle: 'FOUNDER & LEAD DEV',

  verificationStatus: 'verified',

  followersCount: 0,

  followingCount: 0,

  followers: [],

  following: [],

  bookmarks: [],

  usernameLastChangedAt: '2026-09-01T00:00:00Z',

  createdAt: '2026-09-01T00:00:00Z'

};

// Official Account: Sovythos

export const OFFICIAL_SOVYTHOS = {

  uid: 'user_1789917894698',

  email: 'sovythos@pulse.app',

  username: 'sovythos',

  displayName: 'Sovythos',

  avatar: SOVYTHOS_AVATAR,

  bio: 'صاحبك المصري على PULSE. خفة دم وضحك وحوار، موجود عشان أروق عليك وعلى نقاشاتك. من تطوير محمود ياسر (@my).',

  website: 'https://pulse.app',

  location: 'القاهرة، مصر',

  isVerified: true,

  isFounder: false,

  isAI: true,

  isBanned: false,

  isPioneer: false,

  pioneerNumber: null,

  badgeTitle: 'SOVYTHOS',

  verificationStatus: 'verified',

  followersCount: 0,

  followingCount: 1,

  followers: [],

  following: ['dev_mahmoud_yasser'],

  bookmarks: [],

  usernameLastChangedAt: '2026-09-01T00:00:00Z',

  createdAt: '2026-09-01T00:00:00Z'

};

// Official Platform Account: PULSE

export const OFFICIAL_PULSE_AVATAR = 'https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1790976187/pulse_avatars/xkcwnhipezmchkxil20v.png';

export const OFFICIAL_PULSE = {

  uid: 'user_1789828179039',

  email: 'my0919175@gmail.com',

  username: 'pulse',

  displayName: 'PULSE',

  avatar: OFFICIAL_PULSE_AVATAR,

  bio: 'الحساب الرسمي لمنصة PULSE. هنا تلتقي الأفكار وتنطلق النبضات.',

  website: 'https://pulse.app',

  location: 'CAIRO, EGYPT',

  isVerified: true,

  isFounder: false,

  isOfficial: true,

  isPioneer: false,

  pioneerNumber: null,

  badgeTitle: 'OFFICIAL PLATFORM',

  verificationStatus: 'verified',

  followersCount: 1,

  followingCount: 2,

  followers: ['dev_mahmoud_yasser'],

  following: ['dev_mahmoud_yasser', 'user_1789917894698'],

  bookmarks: [],

  createdAt: '2026-09-19T14:29:39.039Z'

};

export const storageService = {

  _inMemoryPosts: [],

  _inMemoryUsers: [],

  _isInitialized: false,

  _hasCleanedLegacy: false,

  _isCleaningDangling: false,

  _stripUndefined(obj, seen = new WeakSet()) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj instanceof Date || obj instanceof RegExp || (typeof Blob !== 'undefined' && obj instanceof Blob)) {
      return obj;
    }
    if (seen.has(obj)) {
      return Array.isArray(obj) ? [] : {};
    }
    seen.add(obj);
    if (Array.isArray(obj)) {
      return obj.map((i) => this._stripUndefined(i, seen)).filter((i) => i !== undefined);
    }
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (v === undefined) continue;
      clean[k] = (v !== null && typeof v === 'object') ? this._stripUndefined(v, seen) : v;
    }
    return clean;
  },

  cleanupDanglingData() {
    if (this._isCleaningDangling) return;
    this._isCleaningDangling = true;
    try {
      // Direct raw read from localStorage — NEVER call this.getPosts() here to prevent boot recursion
      const rawPosts = localStorage.getItem(STORAGE_KEYS.POSTS);
      let postIds = new Set();
      if (rawPosts) {
        try {
          const parsed = JSON.parse(rawPosts);
          if (Array.isArray(parsed)) {
            postIds = new Set(parsed.filter(Boolean).map((p) => p && p.id).filter(Boolean));
          }
        } catch {}
      }

      // Clean orphan notifications referencing deleted posts
      const notifKey = 'pulse_notifications_v1';
      const rawNotifs = localStorage.getItem(notifKey);
      if (rawNotifs) {
        try {
          const notifs = JSON.parse(rawNotifs);
          if (Array.isArray(notifs)) {
            const cleanedNotifs = notifs.filter((n) => !n.postId || postIds.has(n.postId));
            if (cleanedNotifs.length !== notifs.length) {
              localStorage.setItem(notifKey, JSON.stringify(cleanedNotifs));
            }
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[StorageService] cleanupDanglingData notice:', err);
    } finally {
      this._isCleaningDangling = false;
    }
  },

  cleanLegacyStorage() {
    if (this._hasCleanedLegacy) return;
    this._hasCleanedLegacy = true;
    const legacyKeys = [
      'pulse_users_v1', 'pulse_users_v2', 'pulse_users_v3', 'pulse_users_v4',
      'pulse_posts_v1', 'pulse_posts_v2', 'pulse_posts_v3', 'pulse_posts_v4',
      'pulse_comments_v1', 'pulse_comments_v2', 'pulse_comments_v3', 'pulse_comments_v4'
    ];
    legacyKeys.forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    try {
      this.cleanupDanglingData();
    } catch {}
  },

  safeSetItem(key, rawData) {

    try {

      const serialized = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);

      localStorage.setItem(key, serialized);

    } catch (err) {

      console.warn('[SafeStorage] Quota notice for key ' + key + ', executing LRU pruning...', err);

      this.cleanLegacyStorage();

      if (key === STORAGE_KEYS.POSTS && Array.isArray(rawData)) {

        try {

          const pruned = rawData.map((p, idx) => {

            if (idx >= 12) {

              const { audioUrl, videoUrl, imageUrl, ...safeRest } = p;

              return {

                ...safeRest,

                _mediaStrippedLocally: true,

                hasVoice: p.hasVoice,

                hasVideo: Boolean(p.videoUrl),

                hasImage: Boolean(p.imageUrl)

              };

            }

            return p;

          });

          localStorage.setItem(key, JSON.stringify(pruned));

          return;

        } catch (innerErr) {

          try {

            const minimal = rawData.slice(0, 8).map((p) => {

              const { audioUrl, videoUrl, imageUrl, ...safeRest } = p;

              return safeRest;

            });

            localStorage.setItem(key, JSON.stringify(minimal));

            return;

          } catch (e) {

            console.error('[SafeStorage] Critical storage limit reached:', e);

          }

        }

      }

      if (key === STORAGE_KEYS.USERS && Array.isArray(rawData)) {

        try {

          const prunedUsers = rawData.slice(0, 100).map((u) => ({

            ...u,

            avatar: u.avatar && u.avatar.length > 5000 ? DEFAULT_AVATAR : u.avatar

          }));

          localStorage.setItem(key, JSON.stringify(prunedUsers));

        } catch (uErr) {

          console.error('[SafeStorage] Unable to prune users:', uErr);

        }

      }

    }

  },

  init() {
    if (this._isInitialized) return;
    this._isInitialized = true;

    this.cleanLegacyStorage();

    const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);

    if (!existingUsers) {

      this.safeSetItem(STORAGE_KEYS.USERS, [OFFICIAL_FOUNDER, OFFICIAL_SOVYTHOS]);

    }

    if (!localStorage.getItem(STORAGE_KEYS.POSTS)) {

      this.safeSetItem(STORAGE_KEYS.POSTS, []);

    }

    if (!localStorage.getItem(STORAGE_KEYS.COMMENTS)) {

      this.safeSetItem(STORAGE_KEYS.COMMENTS, {});

    }

    if (!this._hasSyncedCloudUsers && typeof window !== 'undefined') {

      this._hasSyncedCloudUsers = true;

      setTimeout(() => {

        this.syncUsersFromCloud().catch(() => {});

      }, 500);

    }

  },

  async initCloud() {

    // Cloud seeding disabled — account is permanently created

  },

  // Safely resolve engagement data from any format (Array, Firebase Object, or Map)

  _resolveEngagementArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((v) => (typeof v === 'string' ? v.trim() : (v && v.uid ? String(v.uid).trim() : '')))
        .filter((v) => v.length > 0);
    }
    if (typeof raw === 'object') {
      const result = new Set();
      for (const [key, val] of Object.entries(raw)) {
        if (/^\d+$/.test(key)) {
          if (typeof val === 'string' && val.trim().length > 0) {
            result.add(val.trim());
          } else if (val && typeof val === 'object' && val.uid) {
            result.add(String(val.uid).trim());
          }
        } else {
          if (val && typeof key === 'string' && key.trim().length > 0) {
            result.add(key.trim());
          }
        }
      }
      return Array.from(result);
    }
    return [];
  },

  // POST NORMALIZER (PULSE Official High-Performance Architecture)

  _normalizePost(post, users = null, key = null) {

    if (!post || typeof post !== 'object') return null;

    // Strict validation: Reject phantom/corrupted/empty post nodes (like { viewsCount: 1 })

    const hasContent = Boolean(

      (typeof post.content === 'string' && post.content.trim()) ||

      (typeof post.text === 'string' && post.text.trim()) ||

      post.imageUrl || post.videoUrl || post.audioUrl || post.hasVoice

    );

    const hasAuthor = Boolean(

      post.authorId || post.userId ||

      (typeof post.author === 'string' && post.author.trim()) ||

      post.author?.uid || post.author?.username ||

      post.authorUsername ||

      (post.isRepost && post.repostedBy)

    );

    // If a post has neither content nor author, it's an orphaned/corrupted node

    if (!hasContent && !post.isRepost) return null;

    if (!hasAuthor) return null;

    const resolvedUsers = users || this.getUsers();

    const likes = this._resolveEngagementArray(post.likes);

    const reposts = this._resolveEngagementArray(post.reposts);

    const bookmarks = this._resolveEngagementArray(post.bookmarks);

    const id = post.id || key;

    const authorUid = post.authorId || post.userId || (typeof post.author === 'object' ? post.author?.uid : null);

    const authorUsername = (typeof post.author === 'string' ? post.author : (post.author?.username || post.authorUsername)) || '';

    const isPulseAuthor = authorUid === OFFICIAL_PULSE.uid || authorUsername?.toLowerCase() === 'pulse';

    const liveAuthor = (authorUid && resolvedUsers.find((u) => u.uid === authorUid)) ||

      (authorUsername && resolvedUsers.find((u) => u.username?.toLowerCase() === authorUsername.toLowerCase())) ||

      (authorUid === OFFICIAL_FOUNDER.uid || authorUsername?.toLowerCase() === 'my' || authorUid === 'dev_mahmoud_yasser' ? OFFICIAL_FOUNDER : null) ||

      (authorUid === OFFICIAL_SOVYTHOS.uid || authorUsername?.toLowerCase() === OFFICIAL_SOVYTHOS.username.toLowerCase() ? OFFICIAL_SOVYTHOS : null) ||

      (isPulseAuthor ? OFFICIAL_PULSE : null);

    const fallbackAuthor = post.author || {};

    const finalAuthor = {

      ...fallbackAuthor,

      uid: liveAuthor?.uid || authorUid || fallbackAuthor.uid || '',

      displayName: liveAuthor?.displayName || fallbackAuthor.displayName || fallbackAuthor.name || authorUsername || 'مستخدم',

      username: liveAuthor?.username || authorUsername || fallbackAuthor.username || '',

      avatar: isPulseAuthor ? OFFICIAL_PULSE_AVATAR : resolveAvatar(liveAuthor?.avatar || fallbackAuthor.avatar),

      isVerified: (isPulseAuthor || typeof liveAuthor?.isVerified === 'boolean') ? (isPulseAuthor || liveAuthor.isVerified) : Boolean(fallbackAuthor.isVerified),

      isFounder: typeof liveAuthor?.isFounder === 'boolean' ? liveAuthor.isFounder : Boolean(fallbackAuthor.isFounder),

      isPioneer: typeof liveAuthor?.isPioneer === 'boolean' ? liveAuthor.isPioneer : Boolean(fallbackAuthor.isPioneer),

      isAI: liveAuthor?.isAI || (liveAuthor?.uid === OFFICIAL_SOVYTHOS.uid) || Boolean(fallbackAuthor.isAI),

      pioneerNumber: liveAuthor?.pioneerNumber || fallbackAuthor.pioneerNumber || null,

      badgeTitle: liveAuthor?.badgeTitle || fallbackAuthor.badgeTitle

    };

    const isOfficialAuthor = finalAuthor.username === 'my' || finalAuthor.username === 'pulse' || finalAuthor.username === 'sovythos' || finalAuthor.uid === 'dev_mahmoud_yasser' || finalAuthor.uid === 'user_1789828179039' || finalAuthor.uid === 'user_1789917894698' || isPulseAuthor;

    if (isOfficialAuthor) {

      finalAuthor.isPioneer = false;

      finalAuthor.pioneerNumber = null;

    }

    const rawViews = post.viewsCount !== undefined ? post.viewsCount : post.views;

    const viewsCount = typeof rawViews === 'number'

      ? rawViews

      : (typeof rawViews === 'object' && rawViews !== null)

      ? Object.keys(rawViews).length

      : (Number(rawViews) || 0);

    const normalizedPost = {

      ...post,

      id,

      content: post.content || post.text || '',

      authorId: authorUid,

      author: finalAuthor,

      likes,

      reposts,

      bookmarks,

      viewsCount,

      isSensitive: Boolean(post.isSensitive || post.sensitive || post.sensitiveType === 'adult' || (Array.isArray(post.tags) && (post.tags.includes('18+') || post.tags.includes('nsfw')))),

      sensitiveType: post.sensitiveType || (post.isSensitive ? 'adult' : null),

      createdAt: post.createdAt || new Date().toISOString()

    };

    delete normalizedPost.likesCount;

    delete normalizedPost.repostsCount;

    return normalizedPost;

  },

  // Tombstone tracking for deleted posts to prevent zombie resurrection from stale cache or network delays

  _getDeletedPostIds() {

    try {

      const raw = localStorage.getItem('pulse_deleted_post_ids') || '[]';

      const arr = JSON.parse(raw);

      return new Set(Array.isArray(arr) ? arr : []);

    } catch {

      return new Set();

    }

  },

  _recordDeletedPostId(postId) {

    if (!postId) return;

    try {

      const deletedSet = this._getDeletedPostIds();

      deletedSet.add(String(postId));

      const arr = Array.from(deletedSet).slice(-300); // keep last 300 deleted IDs

      localStorage.setItem('pulse_deleted_post_ids', JSON.stringify(arr));

    } catch {}

  },

  // REALTIME LISTENERS WITH DATABASE PROTECTION & PAGINATION (limitCount: 200)

  subscribeToPosts(callback, limitCount = 25) {

    try {

      const postsQuery = query(ref(database, 'posts'), orderByKey(), limitToLast(limitCount));

      return onValue(postsQuery, (snapshot) => {

        const val = snapshot.val();

        const deletedSet = this._getDeletedPostIds();

        if (val) {

          const users = this.getUsers();

          const livePosts = Object.entries(val)

            .filter(([k]) => !deletedSet.has(String(k)))

            .map(([k, p]) => this._normalizePost(p, users, k))

            .filter(Boolean)

            .filter((p) => !deletedSet.has(String(p.id)) && (!p.isRepost || !deletedSet.has(String(p.originalPostId))))

            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          const rawKeysCount = Object.keys(val).length;

          let finalPosts = livePosts;

          // If the cloud query returned fewer items than the window limit,

          // then this is the 100% complete set of posts in existence.

          // Zero stale posts from local storage should be merged!

          if (rawKeysCount >= limitCount) {

            const existingPosts = this.getPosts().filter((p) => !deletedSet.has(String(p.id)));

            const livePostIds = new Set(livePosts.map((p) => String(p.id)));

            const earliestLiveTime = livePosts.length > 0 

              ? Math.min(...livePosts.map((p) => new Date(p.createdAt || 0).getTime()))

              : 0;

            const olderPosts = existingPosts.filter((p) => {

              const pTime = new Date(p.createdAt || 0).getTime();

              return !livePostIds.has(String(p.id)) && pTime < earliestLiveTime;

            });

            finalPosts = [...livePosts, ...olderPosts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          }

          this._inMemoryPosts = finalPosts;

          // Cloud-first: cache only light skeleton locally to free storage quota

          try {

            const lightCache = finalPosts.slice(0, 15).map(p => ({

              id: p.id,

              authorId: p.authorId,

              author: p.author,

              content: (p.content || '').slice(0, 180),

              createdAt: p.createdAt,

              likes: p.likes || [],

              reposts: p.reposts || [],

              bookmarks: p.bookmarks || []

            }));

            localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(lightCache));

          } catch {}

          if (callback) callback(finalPosts);

        } else {

          // Empty database — clear local cache

          this.safeSetItem(STORAGE_KEYS.POSTS, []);

          if (callback) callback([]);

        }

      }, (error) => {

        console.warn('Firebase Realtime posts error:', error);

      });

    } catch (err) {

      console.warn('Firebase subscribeToPosts error:', err);

    }

  },

  // Direct live pull from cloud (e.g. on pull-to-refresh or reconnect)

  async fetchLivePosts(limitCount = 200) {

    try {

      const postsQuery = query(ref(database, 'posts'), orderByKey(), limitToLast(limitCount));

      const snapshot = await get(postsQuery);

      if (!snapshot.exists()) {

        this.safeSetItem(STORAGE_KEYS.POSTS, []);

        return [];

      }

      const val = snapshot.val() || {};

      const users = this.getUsers();

      const deletedSet = this._getDeletedPostIds();

      const livePosts = Object.entries(val)

        .filter(([k]) => !deletedSet.has(String(k)))

        .map(([k, p]) => this._normalizePost(p, users, k))

        .filter(Boolean)

        .filter((p) => !deletedSet.has(String(p.id)) && (!p.isRepost || !deletedSet.has(String(p.originalPostId))))

        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      this.safeSetItem(STORAGE_KEYS.POSTS, livePosts);

      return livePosts;

    } catch (err) {

      console.warn('fetchLivePosts notice:', err);

      return this.getPosts();

    }

  },

  // Load older posts on demand (Infinite Scroll)

  async loadOlderPosts(earliestKey, limit = 25) {

    if (!earliestKey) return [];

    try {

      const olderQuery = query(

        ref(database, 'posts'),

        orderByKey(),

        endBefore(earliestKey),

        limitToLast(limit)

      );

      const snapshot = await get(olderQuery);

      if (!snapshot.exists()) return [];

      const val = snapshot.val();

      if (!val) return [];

      const users = this.getUsers();

      const deletedSet = this._getDeletedPostIds();

      const list = Object.entries(val)

        .filter(([k]) => !deletedSet.has(String(k)))

        .map(([k, p]) => this._normalizePost(p, users, k))

        .filter(Boolean)

        .filter((p) => !deletedSet.has(String(p.id)) && (!p.isRepost || !deletedSet.has(String(p.originalPostId))))

        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      return list;

    } catch (err) {

      console.warn('Firebase loadOlderPosts error:', err);

      return [];

    }

  },

  // Instant synchronous cache retrieval for profile posts (0ms latency on navigation)
  getCachedUserPosts(targetUid, targetUsername) {
    if (!targetUid && !targetUsername) return [];
    const cacheKey = `pulse_user_posts_${targetUid || targetUsername}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  },

  // Targeted Low-Bandwidth Profile Posts Synchronizer (Spark 10GB/mo optimized)
  // Directly queries only the author's posts via indexed 'authorId' without downloading the full timeline
  async fetchUserPosts(targetUid, targetUsername) {
    if (!targetUid && !targetUsername) return [];

    const cacheKey = `pulse_user_posts_${targetUid || targetUsername}`;
    const cached = this.getCachedUserPosts(targetUid, targetUsername);
    const users = this.getUsers();
    const deletedSet = this._getDeletedPostIds();

    const cleanUsername = (targetUsername || '').toLowerCase();
    const isFounder = (cleanUsername === 'my' || targetUid === 'dev_mahmoud_yasser' || targetUid === 'my');

    try {
      const uidsToQuery = new Set();
      if (targetUid) uidsToQuery.add(targetUid);
      if (isFounder) {
        uidsToQuery.add('dev_mahmoud_yasser');
        uidsToQuery.add('my');
      }
      if (cleanUsername === 'pulse' || targetUid === OFFICIAL_PULSE.uid) {
        uidsToQuery.add(OFFICIAL_PULSE.uid);
        uidsToQuery.add('pulse');
      }

      const combinedCloudPosts = {};

      // Execute targeted O(1) indexed queries on Firebase RTDB
      for (const uid of uidsToQuery) {
        try {
          const q = query(ref(database, 'posts'), orderByChild('authorId'), equalTo(uid));
          const snap = await get(q);
          if (snap.exists()) {
            const val = snap.val();
            if (val && typeof val === 'object') {
              Object.entries(val).forEach(([k, v]) => {
                combinedCloudPosts[k] = v;
              });
            }
          }
        } catch (qErr) {
          console.warn('Query by authorId notice:', qErr);
        }
      }

      // Check authorUsername fallback if needed
      if (cleanUsername && Object.keys(combinedCloudPosts).length === 0) {
        try {
          const uQuery = query(ref(database, 'posts'), orderByChild('authorUsername'), equalTo(cleanUsername));
          const uSnap = await get(uQuery);
          if (uSnap.exists()) {
            const val = uSnap.val();
            if (val && typeof val === 'object') {
              Object.entries(val).forEach(([k, v]) => {
                combinedCloudPosts[k] = v;
              });
            }
          }
        } catch (uErr) {
          console.warn('Query by authorUsername notice:', uErr);
        }
      }

      // Normalize fetched cloud posts
      const liveNormalized = Object.entries(combinedCloudPosts)
        .filter(([k]) => !deletedSet.has(String(k)))
        .map(([k, p]) => this._normalizePost(p, users, k))
        .filter(Boolean)
        .filter((p) => !deletedSet.has(String(p.id)) && (!p.isRepost || !deletedSet.has(String(p.originalPostId))));

      // Merge cloud posts with local cache
      const postMap = new Map();
      if (Array.isArray(cached)) {
        cached.forEach((p) => {
          if (p && p.id && !deletedSet.has(String(p.id))) {
            postMap.set(String(p.id), p);
          }
        });
      }
      liveNormalized.forEach((p) => {
        postMap.set(String(p.id), p);
      });

      const finalList = Array.from(postMap.values())
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      // Cache locally with quota safety (max 60 posts)
      try {
        localStorage.setItem(cacheKey, JSON.stringify(finalList.slice(0, 60)));
      } catch (cacheErr) {
        console.warn('Local user posts cache quota notice:', cacheErr);
      }

      return finalList;
    } catch (err) {
      console.warn('fetchUserPosts notice:', err);
      return cached;
    }
  },

  subscribeToUsers(callback) {

    try {

      const usersRef = ref(database, 'users');

      return onValue(usersRef, (snapshot) => {

        const val = snapshot.val();

        if (val) {

          const list = Object.entries(val)

            .map(([key, u]) => {

              if (!u || typeof u !== 'object') return null;

              if (key === 'app_release' || key === 'undefined' || u.uid === 'app_release' || u.uid === 'undefined') return null;

              if (u.apkUrl || u.versionCode || u.isMandatory) return null;

              if (!u.username || typeof u.username !== 'string' || !u.username.trim()) return null;

              return {

                ...u,

                uid: u.uid || key,

                displayName: u.displayName || u.name || u.username

              };

            })

            .filter(Boolean);

          this._inMemoryUsers = list;

          try {

            // Keep only tiny essential set locally

            const lightUsers = list.slice(0, 15).map(u => ({

              uid: u.uid,

              username: u.username,

              displayName: u.displayName,

              avatar: u.avatar && u.avatar.length < 500 ? u.avatar : null,

              isVerified: u.isVerified,

              isFounder: u.isFounder

            }));

            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(lightUsers));

          } catch (e) {}

          if (callback) callback(list);

        }

      }, (error) => {

        console.warn('Firebase Realtime users error:', error);

      });

    } catch (err) {

      console.warn('Firebase subscribeToUsers error:', err);

    }

  },

  subscribeToUser(uid, callback) {

    if (!uid || uid === 'app_release' || uid === 'undefined') return () => {};

    // 1. Immediate sync from local cache
    const cached = this.getUser(uid);
    if (cached && typeof callback === 'function') {
      try { callback(cached); } catch {}
    }

    try {

      const userRef = ref(database, `users/${uid}`);

      return onValue(userRef, (snapshot) => {

        const val = snapshot.val();

        if (val && typeof val === 'object' && (val.username || val.displayName)) {

          const isSovy = uid === OFFICIAL_SOVYTHOS.uid || val.username?.toLowerCase() === 'sovythos';
          const isFounder = uid === OFFICIAL_FOUNDER.uid || val.username?.toLowerCase() === 'my' || uid === 'dev_mahmoud_yasser';
          const isPulse = uid === OFFICIAL_PULSE.uid || val.username?.toLowerCase() === 'pulse';

          const followersList = this._resolveEngagementArray(val.followers);
          const followingList = this._resolveEngagementArray(val.following);

          const followersCount = typeof val.followersCount === 'number'
            ? val.followersCount
            : followersList.length;

          const followingCount = typeof val.followingCount === 'number'
            ? val.followingCount
            : followingList.length;

          const normalized = {
            ...val,
            uid: val.uid || uid,
            displayName: val.displayName || val.name || val.username,
            avatar: isSovy ? SOVYTHOS_AVATAR : isPulse ? OFFICIAL_PULSE_AVATAR : resolveAvatar(val.avatar),
            bio: val.bio ?? (isSovy ? OFFICIAL_SOVYTHOS.bio : isFounder ? OFFICIAL_FOUNDER.bio : ''),
            isFounder: isFounder ? true : Boolean(val.isFounder),
            isVerified: (isFounder || isSovy || isPulse) ? true : Boolean(val.isVerified || val.isPro || val.verificationStatus === 'verified'),
            verificationStatus: (isFounder || isSovy || isPulse) ? 'verified' : (val.verificationStatus || (val.isVerified ? 'verified' : 'none')),
            followers: followersList,
            following: followingList,
            followersCount: isSovy && followersCount === 0 ? 10 : followersCount,
            followingCount: followingCount,
            bookmarks: this._resolveEngagementArray(val.bookmarks)
          };

          const users = this.getUsers();

          const existingIndex = users.findIndex((u) => u.uid === uid);

          if (existingIndex >= 0) {

            users[existingIndex] = { ...users[existingIndex], ...normalized };

          } else {

            users.push(normalized);

          }

          try {

            this.safeSetItem(STORAGE_KEYS.USERS, users);

          } catch (e) {

            console.warn('Storage quota notice on subscribeToUser:', e);

          }

          if (typeof callback === 'function') callback(normalized);

        }

      }, (err) => {

        console.warn('Firebase subscribeToUser error:', err);

      });

    } catch (e) {

      console.warn('Firebase subscribeToUser error:', e);

      return () => {};

    }

  },

  saveFCMToken(uid, token) {

    if (!uid || !token || uid === 'undefined' || uid === 'app_release') return;

    try {

      set(ref(database, `users/${uid}/fcmToken`), token).catch(console.warn);

      const users = this.getUsers();

      const uIndex = users.findIndex((u) => u.uid === uid);

      if (uIndex >= 0) {

        users[uIndex].fcmToken = token;

        this.safeSetItem(STORAGE_KEYS.USERS, users);

      }

    } catch (e) {

      console.warn('Firebase saveFCMToken error:', e);

    }

  },

  // BASE64 IMAGE STORAGE (100% Free - Zero Cloud Storage Fees)

  async uploadImage(base64Data) {

    return base64Data;

  },

  // USERS (Defensive Filtering: Zero Ghost/Undefined Users)

  getUsers() {

    if (this._inMemoryUsers && this._inMemoryUsers.length > 0) {

      return this._inMemoryUsers;

    }

    this.init();

    try {

      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];

      const list = Array.isArray(raw) ? raw : Object.values(raw || {});

      const mapped = list.map((u) => {

        if (!u || typeof u !== 'object') return null;

        if (u.uid === 'app_release' || u.uid === 'undefined' || !u.username || typeof u.username !== 'string') return null;

        if (u.apkUrl || u.versionCode || u.isMandatory) return null;

        const isSovy = u.uid === OFFICIAL_SOVYTHOS.uid || u.username?.toLowerCase() === 'sovythos';

        const isFounder = u.uid === OFFICIAL_FOUNDER.uid || u.username?.toLowerCase() === 'my';

        const isPulse = u.uid === OFFICIAL_PULSE.uid || u.username?.toLowerCase() === 'pulse';

        const isOfficialAccount = isSovy || isFounder || isPulse;

        return {

          ...u,

          displayName: u.displayName || u.name || u.username,

          avatar: isSovy ? SOVYTHOS_AVATAR : isPulse ? OFFICIAL_PULSE_AVATAR : resolveAvatar(u.avatar),

          isFounder: isFounder ? true : Boolean(u.isFounder),

          isVerified: (isFounder || isSovy || isPulse) ? true : Boolean(u.isVerified),

          isPioneer: isOfficialAccount ? false : (typeof u.isPioneer === 'boolean' ? u.isPioneer : true),

          pioneerNumber: isOfficialAccount ? null : (u.pioneerNumber || null),

          following: this._resolveEngagementArray(u.following),

          followers: this._resolveEngagementArray(u.followers),

          bookmarks: this._resolveEngagementArray(u.bookmarks)

        };

      }).filter(Boolean);

      // Always guarantee official accounts are present

      if (!mapped.some((u) => u.username?.toLowerCase() === 'my')) {

        mapped.unshift(OFFICIAL_FOUNDER);

      }

      if (!mapped.some((u) => u.username?.toLowerCase() === 'pulse')) {

        mapped.push(OFFICIAL_PULSE);

      }

      if (!mapped.some((u) => u.username?.toLowerCase() === 'sovythos')) {

        mapped.push(OFFICIAL_SOVYTHOS);

      }

      return mapped;

    } catch {

      return [OFFICIAL_FOUNDER, OFFICIAL_PULSE, OFFICIAL_SOVYTHOS];

    }

  },

  getUser(uid) {

    if (!uid || uid === 'undefined' || uid === 'app_release') return null;

    const users = this.getUsers();

    const found = users.find((u) => u.uid === uid);

    if (found) return found;

    if (uid === OFFICIAL_FOUNDER.uid) return OFFICIAL_FOUNDER;

    if (uid === OFFICIAL_PULSE.uid) return OFFICIAL_PULSE;

    if (uid === OFFICIAL_SOVYTHOS.uid) return OFFICIAL_SOVYTHOS;

    return null;

  },

  getUserByUsername(username) {

    if (!username || username === 'undefined' || typeof username !== 'string') return null;

    const clean = username.trim().toLowerCase();

    const users = this.getUsers();

    const found = users.find((u) => u.username && u.username.toLowerCase() === clean);

    if (found) return found;

    if (clean === OFFICIAL_FOUNDER.username.toLowerCase()) return OFFICIAL_FOUNDER;

    if (clean === OFFICIAL_PULSE.username.toLowerCase()) return OFFICIAL_PULSE;

    if (clean === OFFICIAL_SOVYTHOS.username.toLowerCase()) return OFFICIAL_SOVYTHOS;

    return null;

  },

  getUserByEmail(email) {

    if (!email) return null;

    const clean = email.trim().toLowerCase();

    const users = this.getUsers();

    const found = users.find((u) => u.email && u.email.toLowerCase() === clean);

    if (found) return found;

    if (clean === OFFICIAL_FOUNDER.email.toLowerCase()) return OFFICIAL_FOUNDER;

    if (clean === OFFICIAL_SOVYTHOS.email.toLowerCase()) return OFFICIAL_SOVYTHOS;

    return null;

  },

  // Asynchronous Cloud & Cache Email Lookup for Google Auth & Conflict Prevention

  async findUserByEmailAsync(email) {

    if (!email) return null;

    const clean = email.trim().toLowerCase();

    // 1. Check local cache

    const local = this.getUserByEmail(clean);

    if (local) return local;

    // 2. Fast O(1) indexed query in Firebase RTDB

    try {

      const q = query(ref(database, 'users'), orderByChild('email'), equalTo(clean));

      const snap = await get(q);

      if (snap.exists()) {

        const val = snap.val();

        for (const [uid, u] of Object.entries(val)) {

          if (u && typeof u === 'object') {

            const normalized = {

              ...u,

              uid: u.uid || uid,

              displayName: u.displayName || u.name || u.username,

              avatar: resolveAvatar(u.avatar)

            };

            this.saveUser(normalized);

            return normalized;

          }

        }

      }

    } catch (e) {

      console.warn('Indexed findUserByEmailAsync error:', e);

    }

    // 3. Deep scan fallback across all users

    try {

      const snap = await get(ref(database, 'users'));

      const val = snap.val();

      if (val && typeof val === 'object') {

        for (const [uid, u] of Object.entries(val)) {

          if (u && typeof u === 'object' && u.email && u.email.trim().toLowerCase() === clean) {

            const normalized = {

              ...u,

              uid: u.uid || uid,

              displayName: u.displayName || u.name || u.username,

              avatar: resolveAvatar(u.avatar)

            };

            this.saveUser(normalized);

            return normalized;

          }

        }

      }

    } catch (e) {

      console.warn('findUserByEmailAsync error:', e);

    }

    return null;

  },

  // Derive unique, clean username from email (e.g. ahmed.yasser@gmail.com -> ahmed_yasser)

  async generateUniqueUsernameFromEmail(email) {

    if (!email) return 'user_' + Date.now().toString(36);

    const prefix = email.split('@')[0] || 'user';

    let clean = prefix.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    if (!clean || clean.length < 2) clean = 'pulse_user';

    if (clean.length > 25) clean = clean.substring(0, 25);

    let candidate = clean;

    let isAvailable = await this.checkUsernameAvailable(candidate);

    if (isAvailable) return candidate;

    for (let i = 1; i <= 99; i++) {

      candidate = `${clean}_${i}`;

      isAvailable = await this.checkUsernameAvailable(candidate);

      if (isAvailable) return candidate;

    }

    return `${clean}_${Math.floor(1000 + Math.random() * 9000)}`;

  },

  async getUserByPhone(phone) {

    if (!phone) return null;

    const clean = phone.replace(/[\s\-\(\)]/g, '');

    const users = this.getUsers();

    const found = users.find((u) => {

      if (!u.phone && !u.fullPhone) return false;

      const uClean = (u.phone || '').replace(/[\s\-\(\)]/g, '');

      const uFullClean = (u.fullPhone || '').replace(/[\s\-\(\)]/g, '');

      return uClean === clean || uFullClean === clean ||

        (clean.length >= 8 && uClean.endsWith(clean.slice(-8))) ||

        (clean.length >= 8 && uFullClean.endsWith(clean.slice(-8)));

    });

    if (found) return found;

    return await this.fetchUserFromCloud(phone);

  },

  // Live Cloud Users Synchronization

  async syncUsersFromCloud() {

    try {

      const snap = await get(ref(database, 'users'));

      const val = snap.val();

      if (!val || typeof val !== 'object') return this.getUsers();

      const cloudUsers = Object.entries(val).map(([k, u]) => {

        if (!u || typeof u !== 'object') return null;

        if (k === 'app_release' || k === 'undefined' || u.uid === 'app_release' || u.uid === 'undefined') return null;

        if (u.apkUrl || u.versionCode || u.isMandatory) return null;

        if (!u.username || typeof u.username !== 'string') return null;

        const uid = u.uid || k;

        const isSovy = uid === OFFICIAL_SOVYTHOS.uid || u.username?.toLowerCase() === 'sovythos';

        const isFounder = uid === OFFICIAL_FOUNDER.uid || u.username?.toLowerCase() === 'my';

        return {

          ...u,

          uid,

          displayName: u.displayName || u.name || u.username,

          avatar: isSovy ? SOVYTHOS_AVATAR : resolveAvatar(u.avatar),

          isFounder: isFounder ? true : Boolean(u.isFounder),

          isVerified: (isFounder || isSovy) ? true : Boolean(u.isVerified),

          following: this._resolveEngagementArray(u.following),

          followers: this._resolveEngagementArray(u.followers),

          bookmarks: this._resolveEngagementArray(u.bookmarks)

        };

      }).filter(Boolean);

      const localUsers = this.getUsers();

      const mergedMap = new Map();

      mergedMap.set(OFFICIAL_FOUNDER.uid, OFFICIAL_FOUNDER);

      mergedMap.set(OFFICIAL_SOVYTHOS.uid, OFFICIAL_SOVYTHOS);

      cloudUsers.forEach((u) => mergedMap.set(u.uid, u));

      localUsers.forEach((lu) => {

        if (!mergedMap.has(lu.uid)) {

          mergedMap.set(lu.uid, lu);

        } else {

          const cu = mergedMap.get(lu.uid);

          const cuTime = new Date(cu.updatedAt || cu.createdAt || 0).getTime();

          const luTime = new Date(lu.updatedAt || lu.createdAt || 0).getTime();

          if (luTime > cuTime) {

            mergedMap.set(lu.uid, { ...cu, ...lu });

          }

        }

      });

      const finalList = Array.from(mergedMap.values());

      this.safeSetItem(STORAGE_KEYS.USERS, finalList);

      return finalList;

    } catch (err) {

      console.warn('syncUsersFromCloud notice:', err);

      return this.getUsers();

    }

  },

  // Direct Realtime Cloud User Lookup by Username, Email, Phone, or UID

  async fetchUserFromCloud(identifier) {

    if (!identifier || typeof identifier !== 'string') return null;

    const raw = identifier.trim();

    const query = raw.toLowerCase();

    const cleanPhone = raw.replace(/[\s\-\(\)]/g, '');

    try {

      // 1. Direct UID node lookup if format matches

      if (raw.startsWith('user_') || raw.startsWith('dev_')) {

        const directSnap = await get(ref(database, `users/${raw}`));

        const directVal = directSnap.val();

        if (directVal && directVal.username) {

          const isSovy = raw === OFFICIAL_SOVYTHOS.uid || directVal.username?.toLowerCase() === 'sovythos';

          const isFounder = raw === OFFICIAL_FOUNDER.uid || directVal.username?.toLowerCase() === 'my';

          const normalized = {

            ...directVal,

            uid: directVal.uid || raw,

            displayName: directVal.displayName || directVal.username,

            avatar: isSovy ? SOVYTHOS_AVATAR : resolveAvatar(directVal.avatar),

            isFounder: isFounder ? true : Boolean(directVal.isFounder),

            isVerified: (isFounder || isSovy) ? true : Boolean(directVal.isVerified),

            following: this._resolveEngagementArray(directVal.following),

            followers: this._resolveEngagementArray(directVal.followers),

            bookmarks: this._resolveEngagementArray(directVal.bookmarks)

          };

          this.saveUser(normalized);

          return normalized;

        }

      }

      // 2. Scan cloud users node

      const snap = await get(ref(database, 'users'));

      const val = snap.val();

      if (!val || typeof val !== 'object') return null;

      let matchedUser = null;

      const allCloudUsers = [];

      for (const [k, u] of Object.entries(val)) {

        if (!u || typeof u !== 'object') continue;

        if (k === 'app_release' || k === 'undefined' || u.uid === 'app_release') continue;

        if (!u.username || typeof u.username !== 'string') continue;

        const uid = u.uid || k;

        const isSovy = uid === OFFICIAL_SOVYTHOS.uid || u.username?.toLowerCase() === 'sovythos';

        const isFounder = uid === OFFICIAL_FOUNDER.uid || u.username?.toLowerCase() === 'my';

        const normalized = {

          ...u,

          uid,

          displayName: u.displayName || u.username,

          avatar: isSovy ? SOVYTHOS_AVATAR : resolveAvatar(u.avatar),

          isFounder: isFounder ? true : Boolean(u.isFounder),

          isVerified: (isFounder || isSovy) ? true : Boolean(u.isVerified),

          following: this._resolveEngagementArray(u.following),

          followers: this._resolveEngagementArray(u.followers),

          bookmarks: this._resolveEngagementArray(u.bookmarks)

        };

        allCloudUsers.push(normalized);

        const uUsername = u.username.toLowerCase();

        const uEmail = u.email ? u.email.toLowerCase() : '';

        const uPhone = u.phone ? u.phone.replace(/[\s\-\(\)]/g, '') : '';

        const uFullPhone = u.fullPhone ? u.fullPhone.replace(/[\s\-\(\)]/g, '') : '';

        if (uUsername === query || uEmail === query || uid === raw) {

          matchedUser = normalized;

        } else if (cleanPhone.length >= 7) {

          if (uPhone && (uPhone === cleanPhone || (cleanPhone.length >= 8 && uPhone.endsWith(cleanPhone.slice(-8))))) {

            matchedUser = normalized;

          } else if (uFullPhone && (uFullPhone === cleanPhone || (cleanPhone.length >= 8 && uFullPhone.endsWith(cleanPhone.slice(-8))))) {

            matchedUser = normalized;

          }

        }

      }

      // Repopulate local storage cache with cloud snapshot

      if (allCloudUsers.length > 0) {

        try {

          this.safeSetItem(STORAGE_KEYS.USERS, allCloudUsers);

        } catch {}

      }

      if (matchedUser) {

        this.saveUser(matchedUser);

        return matchedUser;

      }

    } catch (err) {

      console.warn('fetchUserFromCloud notice:', err);

    }

    return null;

  },

  // Carrier-Grade Real-time Cloud Uniqueness Verification (Indexed O(1) + Deep Scan Fallback)

  async checkUsernameAvailable(username, excludeUid = null) {

    if (!username) return false;

    const clean = username.trim().toLowerCase();

    if (clean.length < 2) return false;

    // 1. Check local cache

    const localExisting = this.getUserByUsername(clean);

    if (localExisting && (!excludeUid || localExisting.uid !== excludeUid)) {

      return false;

    }

    // 2. Direct indexed Firebase RTDB query (O(1) indexed lookup)

    try {

      const q = query(ref(database, 'users'), orderByChild('username'), equalTo(clean));

      const snap = await get(q);

      if (snap.exists()) {

        const val = snap.val();

        for (const [uid] of Object.entries(val)) {

          if (excludeUid && uid === excludeUid) continue;

          return false;

        }

      }

    } catch (err) {

      console.warn('Indexed username query error:', err);

    }

    // 3. Fallback deep scan across cloud users node (guarantees case-insensitivity)

    try {

      const snap = await get(ref(database, 'users'));

      const val = snap.val();

      if (val && typeof val === 'object') {

        for (const [uid, u] of Object.entries(val)) {

          if (excludeUid && uid === excludeUid) continue;

          if (u && typeof u === 'object' && u.username && u.username.trim().toLowerCase() === clean) {

            return false;

          }

        }

      }

    } catch (err) {

      console.warn('Deep scan username check error:', err);

    }

    return true;

  },

  async checkEmailAvailable(email, excludeUid = null) {

    if (!email) return false;

    const clean = email.trim().toLowerCase();

    // 1. Check local cache

    const localExisting = this.getUserByEmail(clean);

    if (localExisting && (!excludeUid || localExisting.uid !== excludeUid)) {

      return false;

    }

    // 2. Direct indexed Firebase RTDB query

    try {

      const q = query(ref(database, 'users'), orderByChild('email'), equalTo(clean));

      const snap = await get(q);

      if (snap.exists()) {

        const val = snap.val();

        for (const [uid] of Object.entries(val)) {

          if (excludeUid && uid === excludeUid) continue;

          return false;

        }

      }

    } catch (err) {

      console.warn('Indexed email query error:', err);

    }

    // 3. Fallback deep scan across cloud users node

    try {

      const snap = await get(ref(database, 'users'));

      const val = snap.val();

      if (val && typeof val === 'object') {

        for (const [uid, u] of Object.entries(val)) {

          if (excludeUid && uid === excludeUid) continue;

          if (u && typeof u === 'object' && u.email && u.email.trim().toLowerCase() === clean) {

            return false;

          }

        }

      }

    } catch (err) {

      console.warn('Deep scan email check error:', err);

    }

    return true;

  },

  async checkPhoneAvailable(phone, excludeUid = null) {

    if (!phone) return true;

    const clean = phone.replace(/[\s\-\(\)\+]/g, '');

    if (clean.length < 7) return true;

    // 1. Local cache

    const users = this.getUsers();

    const localFound = users.find((u) => {

      if (excludeUid && u.uid === excludeUid) return false;

      const uPh = (u.phone || u.fullPhone || '').replace(/[\s\-\(\)\+]/g, '');

      return uPh === clean || (clean.length >= 9 && uPh.endsWith(clean.slice(-9)));

    });

    if (localFound) return false;

    // 2. Query indexed Firebase RTDB directly

    try {

      const q = query(ref(database, 'users'), orderByChild('phone'), equalTo(clean));

      const snap = await get(q);

      if (snap.exists()) {

        for (const [uid] of Object.entries(snap.val())) {

          if (excludeUid && uid === excludeUid) continue;

          return false;

        }

      }

    } catch (err) {

      console.warn('Indexed phone query error:', err);

    }

    // 3. Fallback deep scan across cloud users node

    try {

      const snap = await get(ref(database, 'users'));

      const val = snap.val();

      if (val && typeof val === 'object') {

        for (const [uid, u] of Object.entries(val)) {

          if (excludeUid && uid === excludeUid) continue;

          if (u && typeof u === 'object') {

            const uPh = (u.phone || u.fullPhone || '').replace(/[\s\-\(\)\+]/g, '');

            if (uPh === clean || (clean.length >= 9 && uPh.endsWith(clean.slice(-9)))) {

              return false;

            }

          }

        }

      }

    } catch (err) {

      console.warn('Deep scan phone check error:', err);

    }

    return true;

  },

  getNextPioneerNumber() {

    const users = this.getUsers().filter((u) => {

      const uname = u.username?.toLowerCase();

      return uname !== 'my' && uname !== 'pulse' && uname !== 'sovythos' && u.uid !== 'dev_mahmoud_yasser';

    });

    // Maximum 10,000 pioneers

    const numbers = users.map((u) => Number(u.pioneerNumber)).filter((n) => !isNaN(n) && n > 0);

    const currentMax = numbers.length > 0 ? Math.max(...numbers) : 1;

    const nextVal = Math.max(currentMax + 1, users.length + 1);

    if (nextVal <= 10000) {

      return nextVal;

    }

    return null;

  },

  getUserPioneerNumber(user) {

    if (!user) return null;

    const uname = user.username?.toLowerCase();

    if (uname === 'my' || uname === 'pulse' || uname === 'sovythos' || user.uid === 'dev_mahmoud_yasser' || user.isFounder) {

      return null;

    }

    if (user.pioneerNumber && Number(user.pioneerNumber) > 0) {

      return Number(user.pioneerNumber);

    }

    const nonOfficials = this.getUsers().filter((u) => {

      const uName = u.username?.toLowerCase();

      return uName !== 'my' && uName !== 'pulse' && uName !== 'sovythos' && u.uid !== 'dev_mahmoud_yasser';

    });

    nonOfficials.sort((a, b) => {

      const tA = new Date(a.createdAt || 0).getTime() || 0;

      const tB = new Date(b.createdAt || 0).getTime() || 0;

      return tA - tB;

    });

    const idx = nonOfficials.findIndex((u) => u.uid === user.uid || u.username?.toLowerCase() === uname);

    if (idx >= 0) {

      return idx + 2; // Real sequential order starting at #2, #3, #4...

    }

    return this.getNextPioneerNumber();

  },

  getPioneerCount() {

    const users = this.getUsers();

    const pioneers = users.filter((u) => u.isPioneer || u.pioneerNumber);

    return Math.max(users.length, pioneers.length, 1);

  },

  async getCloudPioneerCount() {

    try {

      const res = await fetch('https://sahra-f4ec6-default-rtdb.firebaseio.com/users.json?shallow=true');

      if (res.ok) {

        const data = await res.json();

        if (data && typeof data === 'object') {

          return Math.max(Object.keys(data).length, 1);

        }

      }

    } catch (e) {

      console.warn('getCloudPioneerCount error:', e);

    }

    return this.getPioneerCount();

  },

  saveUser(user) {

    const users = this.getUsers();

    const existingIndex = users.findIndex((u) => u.uid === user.uid);

    if (existingIndex >= 0) {

      users[existingIndex] = { ...users[existingIndex], ...user };

    } else {

      users.push(user);

    }

    try {

      this.safeSetItem(STORAGE_KEYS.USERS, users);

    } catch (quotaErr) {

      console.warn('Storage quota warning on saveUser, applying cache trimming:', quotaErr);

      try {

        // Strip heavy image fields of other users in local cache to free space

        const trimmed = users.map((u) => {

          if (u.uid === user.uid) return u;

          const { coverPhoto, ...rest } = u;

          return rest;

        });

        this.safeSetItem(STORAGE_KEYS.USERS, trimmed);

      } catch (innerErr) {

        console.warn('Fallback cache trimming failed:', innerErr);

      }

    }

    // Propagate updated user profile to all posts authored by this user

    try {

      const posts = this.getPosts();

      let changed = false;

      const updatedPosts = posts.map((post) => {

        const isAuthor = post.authorId === user.uid || post.author?.uid === user.uid || (post.author?.username && post.author.username.toLowerCase() === user.username?.toLowerCase());

        if (isAuthor) {

          changed = true;

          return {

            ...post,

            author: {

              ...post.author,

              displayName: user.displayName || post.author?.displayName,

              username: user.username || post.author?.username,

              avatar: user.avatar || post.author?.avatar,

              isVerified: typeof user.isVerified === 'boolean' ? user.isVerified : post.author?.isVerified,

              isFounder: typeof user.isFounder === 'boolean' ? user.isFounder : post.author?.isFounder,

              isPioneer: typeof user.isPioneer === 'boolean' ? user.isPioneer : post.author?.isPioneer,

              isPrivate: typeof user.isPrivate === 'boolean' ? user.isPrivate : Boolean(user.isPrivate),

              pioneerNumber: user.pioneerNumber || post.author?.pioneerNumber || null,

              badgeTitle: user.badgeTitle || post.author?.badgeTitle

            }

          };

        }

        return post;

      });

      if (changed) {

        this.safeSetItem(STORAGE_KEYS.POSTS, updatedPosts);

      }

    } catch (err) {

      console.warn('Propagate profile changes error:', err);

    }

    // Cloud Realtime sync

    try {

      set(ref(database, `users/${user.uid}`), user).catch((err) => {

        console.warn('Firebase user sync notice:', err);

      });

      // Explicitly write isPrivate flag directly to guarantee immediate RTDB indexing

      if (typeof user.isPrivate === 'boolean') {

        set(ref(database, `users/${user.uid}/isPrivate`), user.isPrivate).catch(() => {});

      }

    } catch (e) {

      console.warn(e);

    }

  },

  // Sever all follower/following connections between two users upon block

  severRelationship(userAId, userBId) {

    if (!userAId || !userBId || userAId === userBId) return;

    try {

      const users = this.getUsers();

      const userA = users.find((u) => u.uid === userAId);

      const userB = users.find((u) => u.uid === userBId);

      if (userA) {

        userA.following = this._resolveEngagementArray(userA.following).filter((id) => id !== userBId);

        userA.followers = this._resolveEngagementArray(userA.followers).filter((id) => id !== userBId);

        userA.followingCount = userA.following.length;

        userA.followersCount = userA.followers.length;

        this.saveUser(userA);

      }

      if (userB) {

        userB.following = this._resolveEngagementArray(userB.following).filter((id) => id !== userAId);

        userB.followers = this._resolveEngagementArray(userB.followers).filter((id) => id !== userAId);

        userB.followingCount = userB.following.length;

        userB.followersCount = userB.followers.length;

        this.saveUser(userB);

      }

      // Also clean up any pending follow requests

      this.cancelFollowRequest(userAId, userBId);

      this.cancelFollowRequest(userBId, userAId);

    } catch (e) {

      console.warn('severRelationship error:', e);

    }

  },

  // Ban / Suspend System (Firebase Realtime True/False)

  banUser(targetUserId, reason = 'مخالفة معايير الأمان وإرشادات مجتمع PULSE') {

    const users = this.getUsers();

    const user = users.find((u) => u.uid === targetUserId || u.username === targetUserId);

    if (!user) return null;

    user.isBanned = true;

    user.banReason = reason;

    user.bannedAt = new Date().toISOString();

    this.saveUser(user);

    try {

      set(ref(database, `users/${user.uid}/isBanned`), true);

      set(ref(database, `users/${user.uid}/banReason`), reason);

      set(ref(database, `users/${user.uid}/bannedAt`), user.bannedAt);

    } catch (e) {

      console.warn('Firebase ban sync notice:', e);

    }

    return user;

  },

  unbanUser(targetUserId) {

    const users = this.getUsers();

    const user = users.find((u) => u.uid === targetUserId || u.username === targetUserId);

    if (!user) return null;

    user.isBanned = false;

    delete user.banReason;

    delete user.bannedAt;

    this.saveUser(user);

    try {

      set(ref(database, `users/${user.uid}/isBanned`), false);

      set(ref(database, `users/${user.uid}/banReason`), null);

    } catch (e) {

      console.warn('Firebase unban sync notice:', e);

    }

    return user;

  },

  toggleVerification(targetUserId, status = true) {

    const users = this.getUsers();

    const user = users.find((u) => u.uid === targetUserId || u.username === targetUserId);

    if (!user) return null;

    user.isVerified = status;

    user.verificationStatus = status ? 'verified' : 'none';

    this.saveUser(user);

    try {

      set(ref(database, `users/${user.uid}/isVerified`), status);

      set(ref(database, `users/${user.uid}/verificationStatus`), user.verificationStatus);

    } catch (e) {

      console.warn('Firebase verification sync notice:', e);

    }

    return user;

  },

  // Follow Requests System for Private Accounts

  getFollowRequestsMap() {

    try {

      return JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOW_REQUESTS)) || {};

    } catch {

      return {};

    }

  },

  saveFollowRequestsMap(map) {

    try {

      localStorage.setItem(STORAGE_KEYS.FOLLOW_REQUESTS, JSON.stringify(map));

    } catch (e) {

      console.warn('Error saving follow requests:', e);

    }

  },

  hasPendingFollowRequest(targetUserId, requesterUid) {

    if (!targetUserId || !requesterUid) return false;

    const map = this.getFollowRequestsMap();

    const list = map[targetUserId] || [];

    return list.some((req) => req.requesterUid === requesterUid && req.status === 'pending');

  },

  getPendingFollowRequests(targetUserId) {

    if (!targetUserId) return [];

    const map = this.getFollowRequestsMap();

    return (map[targetUserId] || []).filter((req) => req.status === 'pending');

  },

  sendFollowRequest(targetUserId, currentUser) {

    if (!targetUserId || !currentUser || targetUserId === currentUser.uid) return false;

    const map = this.getFollowRequestsMap();

    if (!map[targetUserId]) map[targetUserId] = [];

    const existingIndex = map[targetUserId].findIndex((r) => r.requesterUid === currentUser.uid);

    if (existingIndex >= 0) {

      if (map[targetUserId][existingIndex].status === 'pending') {

        return true;

      }

      map[targetUserId].splice(existingIndex, 1);

    }

    const requestItem = {

      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,

      targetUserId,

      requesterUid: currentUser.uid,

      requester: {

        uid: currentUser.uid,

        displayName: currentUser.displayName,

        username: currentUser.username,

        avatar: currentUser.avatar,

        isVerified: currentUser.isVerified || false,

        isFounder: currentUser.isFounder || false

      },

      status: 'pending',

      createdAt: new Date().toISOString()

    };

    map[targetUserId].unshift(requestItem);

    this.saveFollowRequestsMap(map);

    try {

      set(ref(database, `follow_requests/${targetUserId}/${currentUser.uid}`), requestItem).catch(console.warn);

    } catch (e) {

      console.warn(e);

    }

    notificationService.addNotification({

      targetUserId,

      type: 'follow_request',

      status: 'pending',

      requestId: requestItem.id,

      actor: currentUser,

      text: 'طلب متابعة حسابك'

    });

    notificationService.playNotificationSound();

    return true;

  },

  cancelFollowRequest(targetUserId, requesterUid) {

    if (!targetUserId || !requesterUid) return false;

    const map = this.getFollowRequestsMap();

    if (map[targetUserId]) {

      map[targetUserId] = map[targetUserId].filter((r) => r.requesterUid !== requesterUid);

      this.saveFollowRequestsMap(map);

    }

    try {

      remove(ref(database, `follow_requests/${targetUserId}/${requesterUid}`)).catch(console.warn);

    } catch (e) {}

    return true;

  },

  acceptFollowRequest(requesterUid, currentUser) {

    if (!requesterUid || !currentUser) return false;

    const users = this.getUsers();

    const requester = users.find((u) => u.uid === requesterUid || u.username === requesterUid);

    const curr = users.find((u) => u.uid === currentUser.uid);

    if (!requester || !curr) return false;

    this.cancelFollowRequest(curr.uid, requester.uid);

    curr.followers = this._resolveEngagementArray(curr.followers);

    requester.following = this._resolveEngagementArray(requester.following);

    if (!curr.followers.includes(requester.uid)) {

      curr.followers.push(requester.uid);

    }

    if (!requester.following.includes(curr.uid)) {

      requester.following.push(curr.uid);

    }

    curr.followersCount = curr.followers.length;

    requester.followingCount = requester.following.length;

    this.saveUser(curr);

    this.saveUser(requester);

    notificationService.updateNotificationStatus(curr.uid, requester.uid, 'follow_request', 'accepted');

    notificationService.addNotification({

      targetUserId: requester.uid,

      type: 'follow',

      actor: curr,

      text: 'وافق على طلب متابعتك وبدأت بمتابعته'

    });

    notificationService.playNotificationSound();

    return true;

  },

  rejectFollowRequest(requesterUid, currentUser) {

    if (!requesterUid || !currentUser) return false;

    this.cancelFollowRequest(currentUser.uid, requesterUid);

    notificationService.updateNotificationStatus(currentUser.uid, requesterUid, 'follow_request', 'declined');

    return true;

  },

  // Follow / Unfollow System

  toggleFollow(targetUserId, currentUser) {

    const users = this.getUsers();

    const target = users.find((u) => u.uid === targetUserId || u.username === targetUserId);

    const curr = users.find((u) => u.uid === currentUser.uid);

    if (!target || !curr || target.uid === curr.uid) return false;

    curr.following = this._resolveEngagementArray(curr.following);

    target.followers = this._resolveEngagementArray(target.followers);

    const isFollowing = curr.following.includes(target.uid);

    // Private account check: if target is private and caller is not already following

    if (target.isPrivate && !isFollowing) {

      if (this.hasPendingFollowRequest(target.uid, curr.uid)) {

        this.cancelFollowRequest(target.uid, curr.uid);

        return false;

      } else {

        this.sendFollowRequest(target.uid, curr);

        return 'requested';

      }

    }

    if (isFollowing) {

      curr.following = curr.following.filter((id) => id !== target.uid);

      target.followers = target.followers.filter((id) => id !== curr.uid);

      curr.followingCount = curr.following.length;

      target.followersCount = target.followers.length;

    } else {

      curr.following = [...curr.following, target.uid];

      if (!target.followers.includes(curr.uid)) {

        target.followers = [...target.followers, curr.uid];

      }

      curr.followingCount = curr.following.length;

      target.followersCount = target.followers.length;

      // Check if this follow turns the relationship into a MUTUAL follow!

      const targetFollowing = this._resolveEngagementArray(target.following);

      const isMutualNow = targetFollowing.includes(curr.uid);

      if (isMutualNow) {

        // Send celebratory mutual notification

        notificationService.addNotification({

          targetUserId: target.uid,

          type: 'mutual_follow',

          actor: curr,

          text: 'أصبحتما الآن تتابعان بعضكما البعض.'

        });

      } else {

        // Regular follow notification

        notificationService.addNotification({

          targetUserId: target.uid,

          type: 'follow',

          actor: curr,

          text: 'بدأ بمتابعة حسابك'

        });

      }

      notificationService.playNotificationSound();

    }

    this.saveUser(curr);

    this.saveUser(target);

    // Sync follower/following arrays directly to Firebase RTDB for immediate indexing

    try {

      set(ref(database, `users/${curr.uid}/following`), curr.following).catch(console.warn);

      set(ref(database, `users/${target.uid}/followers`), target.followers).catch(console.warn);

    } catch (e) {}

    return !isFollowing;

  },

  getUserFollowers(userId) {

    if (!userId) return [];

    const users = this.getUsers();

    const user = this.getUser(userId) || this.getUserByUsername(userId);

    if (!user) return [];

    const followers = this._resolveEngagementArray(user.followers);

    return users.filter((u) => followers.includes(u.uid));

  },

  getUserFollowing(userId) {

    if (!userId) return [];

    const users = this.getUsers();

    const user = this.getUser(userId) || this.getUserByUsername(userId);

    if (!user) return [];

    const following = this._resolveEngagementArray(user.following);

    return users.filter((u) => following.includes(u.uid));

  },

  // Bookmarks System

  toggleBookmark(postId, currentUser) {

    const users = this.getUsers();

    const curr = users.find((u) => u.uid === currentUser.uid);

    if (!curr) return false;

    curr.bookmarks = this._resolveEngagementArray(curr.bookmarks);

    const index = curr.bookmarks.indexOf(postId);

    let isBookmarked = false;

    if (index >= 0) {

      curr.bookmarks.splice(index, 1);

    } else {

      curr.bookmarks.unshift(postId);

      isBookmarked = true;

    }

    // Save locally

    this.safeSetItem(STORAGE_KEYS.USERS, users);

    // Sync ONLY bookmarks to Firebase (not entire user document)

    try {

      set(ref(database, `users/${curr.uid}/bookmarks`), curr.bookmarks).catch(console.warn);

    } catch (e) {

      console.warn('Firebase bookmark sync error:', e);

    }

    return isBookmarked;

  },

  isBookmarked(postId, currentUser) {

    if (!currentUser || !postId) return false;

    const bookmarks = this._resolveEngagementArray(currentUser.bookmarks);

    return bookmarks.includes(postId);

  },

  getBookmarkedPosts(currentUser) {

    if (!currentUser) return [];

    const users = this.getUsers();

    const curr = users.find((u) => u.uid === currentUser.uid) || currentUser;

    if (!curr || !curr.bookmarks) return [];

    const bookmarks = this._resolveEngagementArray(curr.bookmarks);

    const posts = this.getPosts();

    return posts.filter((p) => bookmarks.includes(p.id));

  },

  getLikedPosts(currentUser) {

    if (!currentUser) return [];

    const posts = this.getPosts();

    return posts.filter((p) => {

      const likes = this._resolveEngagementArray(p.likes);

      return likes.includes(currentUser.uid);

    });

  },

  getArchivedPosts(currentUser) {

    if (!currentUser) return [];

    try {

      const raw = localStorage.getItem(`pulse_archived_${currentUser.uid}`);

      return raw ? JSON.parse(raw) : [];

    } catch {

      return [];

    }

  },

  archivePost(post, currentUser) {

    if (!currentUser || !post) return false;

    try {

      const key = `pulse_archived_${currentUser.uid}`;

      const existing = this.getArchivedPosts(currentUser);

      if (!existing.some((p) => p.id === post.id)) {

        existing.unshift(post);

        localStorage.setItem(key, JSON.stringify(existing));

      }

      return true;

    } catch {

      return false;

    }

  },

  unarchivePost(postId, currentUser) {

    if (!currentUser || !postId) return false;

    try {

      const key = `pulse_archived_${currentUser.uid}`;

      const existing = this.getArchivedPosts(currentUser).filter((p) => p.id !== postId);

      localStorage.setItem(key, JSON.stringify(existing));

      return true;

    } catch {

      return false;

    }

  },

  // Interactive Poll Voting

  votePoll(postId, optionIndex, userId) {

    if (!postId || optionIndex === undefined || !userId) return null;

    const posts = this.getPosts();

    const post = posts.find((p) => p.id === postId);

    if (!post || !post.poll || !Array.isArray(post.poll.options)) return null;

    // Remove user's previous vote from any option in this poll

    post.poll.options.forEach((opt) => {

      opt.votes = this._resolveEngagementArray(opt.votes).filter((id) => id !== userId);

    });

    // Add user vote to target option

    if (post.poll.options[optionIndex]) {

      post.poll.options[optionIndex].votes = [

        ...this._resolveEngagementArray(post.poll.options[optionIndex].votes),

        userId

      ];

    }

    // Recalculate total votes

    post.poll.totalVotes = post.poll.options.reduce(

      (sum, opt) => sum + (Array.isArray(opt.votes) ? opt.votes.length : 0),

      0

    );

    // Save locally

    this.safeSetItem(STORAGE_KEYS.POSTS, posts);

    // Sync poll to Firebase RTDB

    try {

      set(ref(database, `posts/${postId}/poll`), post.poll).catch(console.warn);

    } catch (e) {

      console.warn('Firebase poll sync error:', e);

    }

    return post.poll;

  },

  getContentFilters(currentUser) {

    try {

      const key = currentUser ? `pulse_content_filters_${currentUser.uid}` : 'pulse_content_filters';

      const raw = localStorage.getItem(key);

      return raw ? JSON.parse(raw) : { hiddenWords: [], sensitiveMode: 'standard', hideLikeCounts: false };

    } catch {

      return { hiddenWords: [], sensitiveMode: 'standard', hideLikeCounts: false };

    }

  },

  saveContentFilters(filters, currentUser) {

    try {

      const key = currentUser ? `pulse_content_filters_${currentUser.uid}` : 'pulse_content_filters';

      localStorage.setItem(key, JSON.stringify(filters));

      return true;

    } catch {

      return false;

    }

  },

  // POSTS

  getPosts() {

    if (this._inMemoryPosts && this._inMemoryPosts.length > 0) {

      return this._inMemoryPosts;

    }

    this.init();

    try {

      const rawPosts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS)) || [];

      const users = this.getUsers();

      const deletedSet = this._getDeletedPostIds();

      return rawPosts

        .filter((post) => post && !deletedSet.has(String(post.id)) && (!post.isRepost || !deletedSet.has(String(post.originalPostId))))

        .map((post) => this._normalizePost(post, users))

        .filter(Boolean);

    } catch {

      return [];

    }

  },

  async getPostById(postId) {

    if (!postId) return null;

    const posts = this.getPosts();

    let post = posts.find((p) => p.id === postId);

    if (post) return post;

    try {

      const snap = await get(ref(database, `posts/${postId}`));

      if (snap.exists()) {

        const val = snap.val();

        return this._normalizePost(val, this.getUsers(), postId);

      }

    } catch (e) {

      console.warn('getPostById fallback error:', e);

    }

    return null;

  },

  savePost(post) {
    const cleanPost = this._stripUndefined(post);
    const posts = this.getPosts();

    posts.unshift(post);

    this.safeSetItem(STORAGE_KEYS.POSTS, posts);

    // Cloud Realtime sync

    try {

      set(ref(database, `posts/${cleanPost.id}`), cleanPost).catch((err) => {

        console.warn('Firebase save post notice:', err);

      });

    } catch (e) {

      console.warn(e);

    }

    // Mention notification dispatch

    try {

      if (post.content) {

        const mentionMatches = post.content.match(/@([a-zA-Z0-9_]+)/g);

        if (mentionMatches) {

          const mentionedUsernames = [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))];

          const users = this.getUsers();

          const authorUid = post.authorId || post.author?.uid;

          mentionedUsernames.forEach((uname) => {

            const targetUser = users.find((u) => u.username?.toLowerCase() === uname);

            if (targetUser && targetUser.uid !== authorUid) {

              notificationService.addNotification({

                targetUserId: targetUser.uid,

                type: 'mention',

                actor: post.author || { uid: authorUid, displayName: 'مستخدم' },

                text: 'ذكرك في نبضة فكرية جديدة',

                preview: post.content.substring(0, 50) + '...',

                postId: post.id

              });

            }

          });

        }

      }

    } catch (err) {

      console.warn('Mention parse error:', err);

    }

  },

  deletePost(postId, userOrUid) {

    if (!postId) return false;

    const sPostId = String(postId);

    // 1. Tombstone ID immediately to avoid resurrection

    this._recordDeletedPostId(sPostId);

    const posts = this.getPosts();

    const post = posts.find((p) => String(p.id) === sPostId);

    const uid = typeof userOrUid === 'object' && userOrUid ? userOrUid.uid : userOrUid;

    const username = typeof userOrUid === 'object' && userOrUid ? userOrUid.username?.toLowerCase() : null;

    const isFounder = (typeof userOrUid === 'object' && userOrUid && (userOrUid.isFounder || userOrUid.username === 'my')) ||

      uid === 'dev_mahmoud_yasser';

    if (post) {

      const postAuthorUid = post.authorId || post.userId || post.author?.uid;

      const postAuthorUsername = post.author?.username?.toLowerCase();

      const isAuthor = (uid && (postAuthorUid === uid || post.authorId === uid)) ||

        (username && postAuthorUsername === username);

      if (!isAuthor && !isFounder) {

        throw new Error('لا تملك صلاحية حذف هذه النبضة.');

      }

    }

    // Filter out post and any reposts referencing it

    const filtered = posts.filter((p) => {

      if (String(p.id) === sPostId) return false;

      if (p.isRepost && (String(p.originalPostId) === sPostId || String(p.originalPost?.id) === sPostId)) return false;

      return true;

    });

    this.safeSetItem(STORAGE_KEYS.POSTS, filtered);

    // Also remove comments under this post from local cache

    try {

      const comments = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};

      if (comments[sPostId]) {

        delete comments[sPostId];

        this.safeSetItem(STORAGE_KEYS.COMMENTS, comments);

      }

    } catch {}

    // Cloud Realtime delete (post, comments)

    try {

      remove(ref(database, `posts/${sPostId}`)).catch((err) => {

        console.warn('Firebase delete post notice:', err);

      });

      remove(ref(database, `comments/${sPostId}`)).catch(() => {});

    } catch (e) {

      console.warn('Cloud delete error:', e);

    }

    return true;

  },

  updatePost(postId, newContent, userOrUid) {

    const sPostId = String(postId);

    const posts = this.getPosts();

    const postIndex = posts.findIndex((p) => String(p.id) === sPostId);

    if (postIndex === -1) return null;

    const post = posts[postIndex];

    const uid = typeof userOrUid === 'object' && userOrUid ? userOrUid.uid : userOrUid;

    const username = typeof userOrUid === 'object' && userOrUid ? userOrUid.username?.toLowerCase() : null;

    const isFounder = (typeof userOrUid === 'object' && userOrUid && (userOrUid.isFounder || userOrUid.username === 'my')) ||

      uid === 'dev_mahmoud_yasser';

    const postAuthorUid = post.authorId || post.userId || post.author?.uid;

    const postAuthorUsername = post.author?.username?.toLowerCase();

    const isAuthor = (uid && (postAuthorUid === uid || post.authorId === uid)) ||

      (username && postAuthorUsername === username);

    if (!isAuthor && !isFounder) {

      throw new Error('لا تملك صلاحية تعديل هذه النبضة.');

    }

    const editedAt = new Date().toISOString();

    const updatedPost = {

      ...post,

      content: newContent,

      text: newContent,

      isEdited: true,

      editedAt

    };

    posts[postIndex] = updatedPost;

    this.safeSetItem(STORAGE_KEYS.POSTS, posts);

    // Cloud Realtime sync

    try {

      update(ref(database, `posts/${sPostId}`), {

        content: newContent,

        text: newContent,

        isEdited: true,

        editedAt

      }).catch(console.warn);

    } catch (e) {

      console.warn(e);

    }

    return updatedPost;

  },

  incrementVoiceListens(postId, listenerUser) {

    const posts = this.getPosts();

    const post = posts.find((p) => p.id === postId);

    if (!post) return;

    post.voiceListens = (post.voiceListens || 0) + 1;

    this.safeSetItem(STORAGE_KEYS.POSTS, posts);

    // Cloud Realtime sync

    try {

      set(ref(database, `posts/${post.id}/voiceListens`), post.voiceListens).catch(console.warn);

    } catch (e) {

      console.warn(e);

    }

    if (listenerUser && post.authorId !== listenerUser.uid) {

      notificationService.addNotification({

        targetUserId: post.authorId,

        type: 'voice_listen',

        actor: listenerUser,

        text: 'استمع إلى نبضتك الصوتية الكاملة',

        preview: post.content.substring(0, 50) + '...',

        postId: post.id,

        audioUrl: post.voiceUrl || null,

        hasVoice: Boolean(post.hasVoice || post.voiceUrl)

      });

      notificationService.playNotificationSound();

    }

    return post;

  },

  toggleLikePost(postId, user) {

    const posts = this.getPosts();

    const post = posts.find((p) => p.id === postId);

    let isLikedNow = false;

    if (post) {

      const likes = this._resolveEngagementArray(post.likes);

      const index = likes.indexOf(user.uid);

      if (index >= 0) {

        likes.splice(index, 1);

      } else {

        likes.push(user.uid);

        isLikedNow = true;

      }

      post.likes = likes;

      delete post.likesCount; // Always derive from array

      this.safeSetItem(STORAGE_KEYS.POSTS, posts);

    } else {

      // Post not in local cache — assume like

      isLikedNow = true;

    }

    // Per-user atomic Firebase write (no race condition)

    try {

      const likeRef = ref(database, `posts/${postId}/likes/${user.uid}`);

      if (isLikedNow) {

        set(likeRef, true).catch(console.warn);

      } else {

        remove(likeRef).catch(console.warn);

      }

    } catch (e) {

      console.warn('Firebase like sync error:', e);

    }

    // Notification for post author

    if (isLikedNow && post) {

      const authorId = post.authorId || post.author?.uid;

      if (authorId && authorId !== user.uid) {

        notificationService.addNotification({

          targetUserId: authorId,

          type: 'like',

          actor: user,

          text: 'أعجب بنبضتك الفكرية',

          preview: (post.content || '').substring(0, 50)

        });

        notificationService.playNotificationSound();

      }

    }

    return post;

  },

  toggleRepost(postId, user, existingPostObj = null) {
    if (!user || !user.uid) return { post: null, repostEntry: null, isRepostedNow: false };

    this.init();
    const posts = this.getPosts();

    // 1. Resolve target post: from argument, or local storage, or in-memory cache
    let post = existingPostObj || null;
    if (!post) {
      post = posts.find((p) => p && (p.id === postId || (p.isRepost && p.originalPostId === postId)));
    }
    if (!post && Array.isArray(this._inMemoryPosts)) {
      post = this._inMemoryPosts.find((p) => p && (p.id === postId || (p.isRepost && p.originalPostId === postId)));
    }

    // 2. Identify the true original post ID and author
    const actualOriginalId = (post && post.isRepost && post.originalPostId) ? post.originalPostId : (post ? post.id : postId);

    // If still not found, construct a minimal post object so reposting still succeeds
    if (!post) {
      post = {
        id: actualOriginalId,
        content: '',
        authorId: '',
        reposts: []
      };
    }

    const reposts = this._resolveEngagementArray(post.reposts);
    const index = reposts.indexOf(user.uid);
    let isRepostedNow = false;
    let repostEntry = null;

    if (index >= 0) {
      // Un-repost: remove user from array
      reposts.splice(index, 1);

      // Remove any matching repost post from local cache
      const repostIdx = posts.findIndex(
        (p) => p && p.isRepost && (p.originalPostId === actualOriginalId || p.originalPostId === postId) && (p.repostedBy?.uid === user.uid || p.authorId === user.uid)
      );

      let removedRepostId = null;
      if (repostIdx >= 0) {
        removedRepostId = posts[repostIdx].id;
        posts.splice(repostIdx, 1);
      }

      // Delete repost post from Firebase RTDB
      try {
        if (removedRepostId) {
          remove(ref(database, `posts/${removedRepostId}`)).catch(console.warn);
        }
      } catch (e) {
        console.warn('Firebase remove repost post error:', e);
      }

      // Delete per-user atomic repost record
      try {
        remove(ref(database, `posts/${actualOriginalId}/reposts/${user.uid}`)).catch(console.warn);
      } catch (e) {
        console.warn('Firebase atomic un-repost sync error:', e);
      }
    } else {
      // Repost: add user to reposts array
      reposts.push(user.uid);
      isRepostedNow = true;

      const rawOriginalAuthor = (post.isRepost && post.originalAuthor) ? post.originalAuthor : (post.author || {});
      const cleanOriginalAuthor = {
        uid: rawOriginalAuthor.uid || post.authorId || '',
        username: rawOriginalAuthor.username || 'user',
        displayName: rawOriginalAuthor.displayName || rawOriginalAuthor.username || 'Pulse User',
        avatar: rawOriginalAuthor.avatar || null,
        isVerified: Boolean(rawOriginalAuthor.isVerified),
        isFounder: Boolean(rawOriginalAuthor.isFounder),
        isPioneer: Boolean(rawOriginalAuthor.isPioneer),
        pioneerNumber: rawOriginalAuthor.pioneerNumber || null,
        badgeTitle: rawOriginalAuthor.badgeTitle || null
      };

      const cleanUser = {
        uid: user.uid,
        username: user.username || 'user',
        displayName: user.displayName || user.username || 'Pulse User',
        avatar: user.avatar || null,
        isVerified: Boolean(user.isVerified),
        isFounder: Boolean(user.isFounder),
        isPioneer: Boolean(user.isPioneer),
        pioneerNumber: user.pioneerNumber || null,
        badgeTitle: user.badgeTitle || null
      };

      const newRepostId = 'repost_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

      repostEntry = {
        id: newRepostId,
        isRepost: true,
        originalPostId: actualOriginalId,
        content: post.content || '',
        originalAuthor: cleanOriginalAuthor,
        repostedBy: cleanUser,
        authorId: user.uid,
        author: cleanUser,
        hasVoice: Boolean(post.hasVoice),
        audioUrl: post.audioUrl || null,
        imageUrl: post.imageUrl || null,
        videoUrl: post.videoUrl || null,
        music: post.music || null,
        topic: post.topic || 'general',
        likes: [],
        reposts: [],
        bookmarks: [],
        createdAt: new Date().toISOString()
      };

      // Strip all undefined properties to ensure Firebase set() never throws
      const cleanPayload = this._stripUndefined(repostEntry);

      posts.unshift(cleanPayload);

      // Save repost post to Firebase
      try {
        set(ref(database, `posts/${newRepostId}`), cleanPayload).catch((err) => {
          console.warn('Firebase set repost post async error:', err);
        });
      } catch (e) {
        console.warn('Firebase set repost post sync error:', e);
      }

      // Per-user atomic Firebase write for repost flag
      try {
        set(ref(database, `posts/${actualOriginalId}/reposts/${user.uid}`), true).catch((err) => {
          console.warn('Firebase atomic repost write async error:', err);
        });
      } catch (e) {
        console.warn('Firebase atomic repost write sync error:', e);
      }

      // Notification
      const authorId = cleanOriginalAuthor.uid || post.authorId;
      if (authorId && authorId !== user.uid) {
        try {
          notificationService.addNotification({
            targetUserId: authorId,
            type: 'repost',
            actor: user,
            text: 'أعاد نشر نبضتك في التايم لاين',
            preview: (post.content || '').substring(0, 50)
          });
          notificationService.playNotificationSound();
        } catch (notifErr) {
          console.warn('Notification error on repost:', notifErr);
        }
      }
    }

    // Update the local post object's reposts list
    post.reposts = reposts;
    delete post.repostsCount;

    // Also update any matching post in the local posts array
    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (p && (p.id === actualOriginalId || (p.isRepost && p.originalPostId === actualOriginalId))) {
        p.reposts = reposts;
        delete p.repostsCount;
      }
    }

    this.safeSetItem(STORAGE_KEYS.POSTS, posts);

    return { post, repostEntry, isRepostedNow, actualOriginalId };
  },

  // COMMENTS

  getComments(postId) {
    this.init();
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
      let raw = all[postId] || [];
      if (!Array.isArray(raw)) {
        raw = typeof raw === 'object' && raw !== null ? Object.values(raw) : [];
      }
      const users = this.getUsers();

      return raw.map((comm) => {
        if (!comm || typeof comm !== 'object') return null;
        if (!comm.id && !comm.content && !comm.imageUrl && !comm.gifUrl) return null;

        const commId = comm.id || `comm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const normalizedLikes = this._resolveEngagementArray(comm.likes);
        const liveAuthor = users.find((u) => u.uid === comm.authorId || u.username === comm.author?.username);
        const isSovy = comm.authorId === OFFICIAL_SOVYTHOS.uid || comm.author?.username?.toLowerCase() === 'sovythos';

        const baseComm = {
          ...comm,
          id: commId,
          likes: normalizedLikes
        };

        if (liveAuthor || isSovy) {
          const authorRef = isSovy ? OFFICIAL_SOVYTHOS : liveAuthor;
          return {
            ...baseComm,
            author: {
              ...comm.author,
              displayName: authorRef.displayName || comm.author?.displayName || 'مستخدم PULSE',
              username: authorRef.username || comm.author?.username || 'user',
              avatar: authorRef.avatar || comm.author?.avatar || DEFAULT_AVATAR,
              isVerified: typeof authorRef.isVerified === 'boolean' ? authorRef.isVerified : Boolean(comm.author?.isVerified),
              isFounder: typeof authorRef.isFounder === 'boolean' ? authorRef.isFounder : Boolean(comm.author?.isFounder)
            }
          };
        }

        return baseComm;
      }).filter(Boolean);
    } catch (e) {
      console.warn('[StorageService] getComments exception:', e);
      return [];
    }
  },

  subscribeToComments(postId, callback) {
    if (!postId) return () => {};
    try {
      const commentsRef = ref(database, `comments/${postId}`);
      return onValue(commentsRef, (snapshot) => {
        const val = snapshot.val();
        const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
        let localList = all[postId] || [];
        if (!Array.isArray(localList)) {
          localList = typeof localList === 'object' && localList !== null ? Object.values(localList) : [];
        }

        const map = new Map();

        // 1. Seed with local comments (ensures optimistic in-flight comments are NEVER wiped)
        localList.forEach((c) => {
          if (c && c.id && (c.content || c.imageUrl || c.gifUrl)) {
            map.set(c.id, c);
          }
        });

        // 2. Merge cloud snapshot
        if (val && typeof val === 'object') {
          Object.entries(val).forEach(([k, item]) => {
            if (item && typeof item === 'object') {
              const fullComment = {
                id: item.id || k,
                ...item
              };
              if (fullComment.content || fullComment.imageUrl || fullComment.gifUrl) {
                const existing = map.get(fullComment.id);
                if (existing) {
                  map.set(fullComment.id, {
                    ...existing,
                    ...fullComment,
                    author: fullComment.author || existing.author,
                    likes: fullComment.likes || existing.likes
                  });
                } else {
                  map.set(fullComment.id, fullComment);
                }
              }
            }
          });
        }

        const finalList = Array.from(map.values());
        all[postId] = finalList;
        this.safeSetItem(STORAGE_KEYS.COMMENTS, all);
        if (callback) callback(this.getComments(postId));
      }, (err) => {
        console.warn('Firebase subscribeToComments error:', err);
      });
    } catch (e) {
      console.warn('Firebase subscribeToComments exception:', e);
      return () => {};
    }
  },

  getUserReplies(userId, username) {

    this.init();

    try {

      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};

      const posts = this.getPosts();

      const users = this.getUsers();

      const targetUid = userId;

      const targetUname = (username || '').toLowerCase();

      const isSovyTarget = targetUid === OFFICIAL_SOVYTHOS.uid || targetUname === 'sovythos';

      const results = [];
      const seenCommentIds = new Set();

      // Scan all stored comments by postId
      Object.entries(all).forEach(([postId, commentsList]) => {

        let actualList = commentsList;
        if (!Array.isArray(actualList)) {
          actualList = (actualList && typeof actualList === 'object') ? Object.values(actualList) : [];
        }
        if (actualList.length === 0) return;

        let parentPost = posts.find((p) => String(p.id) === String(postId)) || null;

        actualList.forEach((comm) => {

          if (!comm || typeof comm !== 'object') return;

          const commId = comm.id || `comm_${postId}_${comm.createdAt || Math.random()}`;
          if (seenCommentIds.has(commId)) return;

          const commAuthorUid = comm.authorId || comm.userId || comm.author?.uid;

          const commAuthorUname = (comm.author?.username || comm.authorUsername || '').toLowerCase();

          const isMatch = Boolean(

            (targetUid && (commAuthorUid === targetUid || comm.userId === targetUid)) ||

            (targetUname && (commAuthorUname === targetUname || comm.authorUsername?.toLowerCase() === targetUname)) ||

            ((targetUname === 'my' || targetUid === 'dev_mahmoud_yasser') && (commAuthorUname === 'my' || commAuthorUid === 'dev_mahmoud_yasser' || commAuthorUid === 'my')) ||

            (isSovyTarget && (commAuthorUname === 'sovythos' || commAuthorUid === OFFICIAL_SOVYTHOS.uid))

          );

          if (isMatch) {

            seenCommentIds.add(commId);

            const normalizedLikes = this._resolveEngagementArray(comm.likes);

            const liveAuthor = users.find((u) => u.uid === commAuthorUid || u.username?.toLowerCase() === commAuthorUname) || (isSovyTarget ? OFFICIAL_SOVYTHOS : null);

            // Determine parent post with full author profile
            const resolvedParent = parentPost || comm.parentPost || {
              id: postId,
              content: comm.parentPostContent || '',
              author: comm.parentPostAuthor || null,
              createdAt: comm.parentPostCreatedAt || comm.createdAt
            };

            // Enhance parent author if missing avatar or verification
            let enhancedParentAuthor = resolvedParent.author;
            if (enhancedParentAuthor) {
              const pAuthorUid = resolvedParent.authorId || resolvedParent.userId || (typeof enhancedParentAuthor === 'object' ? enhancedParentAuthor.uid : null);
              const pAuthorUname = typeof enhancedParentAuthor === 'string' ? enhancedParentAuthor : (enhancedParentAuthor.username || resolvedParent.authorUsername);
              const pAuthorObj = users.find((u) => (pAuthorUid && u.uid === pAuthorUid) || (pAuthorUname && u.username?.toLowerCase() === pAuthorUname?.toLowerCase()));
              if (pAuthorObj) {
                enhancedParentAuthor = {
                  ...(typeof enhancedParentAuthor === 'object' ? enhancedParentAuthor : {}),
                  displayName: pAuthorObj.displayName || pAuthorObj.username,
                  username: pAuthorObj.username,
                  avatar: pAuthorObj.avatar || DEFAULT_AVATAR,
                  isVerified: Boolean(pAuthorObj.isVerified || pAuthorObj.isPro || pAuthorObj.isFounder),
                  isFounder: Boolean(pAuthorObj.isFounder)
                };
              }
            }

            results.push({

              id: commId,

              postId,

              comment: {

                ...comm,

                id: commId,

                likes: normalizedLikes,

                author: liveAuthor ? { ...comm.author, ...liveAuthor } : (comm.author || (isSovyTarget ? OFFICIAL_SOVYTHOS : null))

              },

              parentPost: {
                ...resolvedParent,
                author: enhancedParentAuthor
              }

            });

          }

        });

      });

      return results.sort((a, b) => new Date(b.comment?.createdAt || 0) - new Date(a.comment?.createdAt || 0));

    } catch (err) {

      console.warn('getUserReplies error:', err);

      return [];

    }

  },

  subscribeToUserReplies(userId, username, callback) {

    if (!userId && !username) return () => {};

    // 1. Initial callback with current cached replies immediately (0ms)
    if (typeof callback === 'function') {
      try {
        callback(this.getUserReplies(userId, username));
      } catch {}
    }

    try {

      const commentsRef = ref(database, 'comments');

      return onValue(commentsRef, (snapshot) => {

        const val = snapshot.val();

        if (val && typeof val === 'object') {

          const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
          const targetUname = (username || '').toLowerCase();
          const targetUid = userId;
          const isSovy = targetUid === OFFICIAL_SOVYTHOS.uid || targetUname === 'sovythos';

          const matchingPostIds = [];

          Object.entries(val).forEach(([pId, commsMap]) => {

            if (commsMap && typeof commsMap === 'object') {

              const commList = Object.values(commsMap);
              all[pId] = commList;

              // Check if any comment in this post belongs to target user
              const hasUserComment = commList.some((c) => {
                if (!c) return false;
                const cUid = c.authorId || c.userId || c.author?.uid;
                const cUname = (c.author?.username || c.authorUsername || '').toLowerCase();
                return (targetUid && cUid === targetUid) ||
                  (targetUname && cUname === targetUname) ||
                  ((targetUname === 'my' || targetUid === 'dev_mahmoud_yasser') && (cUname === 'my' || cUid === 'dev_mahmoud_yasser')) ||
                  (isSovy && (cUname === 'sovythos' || cUid === OFFICIAL_SOVYTHOS.uid));
              });

              if (hasUserComment) {
                matchingPostIds.push(pId);
              }

            }

          });

          this.safeSetItem(STORAGE_KEYS.COMMENTS, all);

          // Deliver updated replies
          if (typeof callback === 'function') {
            callback(this.getUserReplies(userId, username));
          }

          // Asynchronously fetch any missing parent posts from RTDB
          const currentPosts = this.getPosts();
          const missingIds = matchingPostIds.filter((id) => !currentPosts.some((p) => String(p.id) === String(id)));

          if (missingIds.length > 0) {
            Promise.all(
              missingIds.map(async (mId) => {
                try {
                  const postSnap = await get(ref(database, `posts/${mId}`));
                  if (postSnap.exists()) {
                    const postVal = postSnap.val();
                    const normalized = this._normalizePost(postVal, this.getUsers(), mId);
                    return normalized;
                  }
                } catch {}
                return null;
              })
            ).then((fetchedPosts) => {
              const validPosts = fetchedPosts.filter(Boolean);
              if (validPosts.length > 0) {
                const refreshedPosts = this.getPosts();
                let added = false;
                validPosts.forEach((vp) => {
                  if (!refreshedPosts.some((p) => String(p.id) === String(vp.id))) {
                    refreshedPosts.unshift(vp);
                    added = true;
                  }
                });
                if (added) {
                  this.safeSetItem(STORAGE_KEYS.POSTS, refreshedPosts);
                  if (typeof callback === 'function') {
                    callback(this.getUserReplies(userId, username));
                  }
                }
              }
            }).catch(() => {});
          }

        }

      }, (err) => {

        console.warn('Firebase subscribeToUserReplies error:', err);

      });

    } catch (e) {

      console.warn('Firebase subscribeToUserReplies exception:', e);

      return () => {};

    }

  },

  addComment(postId, comment, currentUser) {

    this.init();

    try {

      const posts = this.getPosts();

      const post = posts.find((p) => p.id === postId);

      if (post) {

        comment.parentPost = {

          id: post.id,

          content: post.content || '',

          author: post.author || null,

          authorId: post.authorId || post.author?.uid || null,

          createdAt: post.createdAt,

          imageUrl: post.imageUrl || null,

          videoUrl: post.videoUrl || null,

          hasVoice: Boolean(post.hasVoice)

        };

        comment.parentPostAuthor = post.author || null;

        comment.parentPostContent = post.content || '';

      }

      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
      let list = all[postId] || [];
      if (!Array.isArray(list)) {
        list = typeof list === 'object' && list !== null ? Object.values(list) : [];
      }
      list = list.filter((c) => c && c.id !== comment.id);
      list.push(comment);
      all[postId] = list;
      this.safeSetItem(STORAGE_KEYS.COMMENTS, all);

      if (post) {
        post.repliesCount = (post.repliesCount || 0) + 1;
        this.safeSetItem(STORAGE_KEYS.POSTS, posts);

        // Strip any undefined properties to guarantee Firebase RTDB never rejects the write
        const cleanComment = JSON.parse(JSON.stringify(comment, (key, value) => {
          return value === undefined ? null : value;
        }));

        // Cloud Realtime sync
        try {
          set(ref(database, `comments/${postId}/${comment.id}`), cleanComment).catch((err) => {
            console.warn('[StorageService] Realtime comment sync warning:', err);
          });
          set(ref(database, `posts/${postId}/repliesCount`), post.repliesCount).catch(console.warn);
        } catch (e) {
          console.warn('[StorageService] Realtime comment sync exception:', e);
        }

        if (currentUser && post.authorId !== currentUser.uid) {

          notificationService.addNotification({

            targetUserId: post.authorId,

            type: 'reply',

            actor: currentUser,

            text: `رد على منشورك: "${comment.content.substring(0, 35)}..."`,

            preview: post.content.substring(0, 50) + '...',

            postId: post.id,

            audioUrl: comment.voiceUrl || post.voiceUrl || null,

            hasVoice: Boolean(comment.hasVoice || comment.voiceUrl || post.hasVoice)

          });

          notificationService.playNotificationSound();

        }

        // Mention notifications in comment

        try {

          if (comment.content) {

            const mentionMatches = comment.content.match(/@([a-zA-Z0-9_]+)/g);

            if (mentionMatches) {

              const mentionedUsernames = [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))];

              const users = this.getUsers();

              mentionedUsernames.forEach((uname) => {

                const targetUser = users.find((u) => u.username?.toLowerCase() === uname);

                if (targetUser && targetUser.uid !== currentUser?.uid && targetUser.uid !== post.authorId) {

                  notificationService.addNotification({

                    targetUserId: targetUser.uid,

                    type: 'mention',

                    actor: currentUser,

                    text: `ذكرك في تعليق: "${comment.content.substring(0, 35)}..."`,

                    preview: post.content.substring(0, 50) + '...',

                    postId: post.id

                  });

                }

              });

            }

          }

        } catch (err) {

          console.warn('Comment mention parse error:', err);

        }

      }

    } catch (e) {

      console.error(e);

    }

  },

  toggleLikeComment(postId, commentId, user) {
    if (!postId || !commentId || !user) return null;
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
      let list = all[postId];
      if (!Array.isArray(list)) {
        list = (list && typeof list === 'object' && list !== null) ? Object.values(list) : [];
      }
      const comment = list.find((c) => c && c.id === commentId);
      if (!comment) return null;

      comment.likes = this._resolveEngagementArray(comment.likes);

      const idx = comment.likes.indexOf(user.uid);

      let isLikedNow = false;

      if (idx >= 0) {

        comment.likes.splice(idx, 1);

      } else {

        comment.likes.push(user.uid);

        isLikedNow = true;

      }

      this.safeSetItem(STORAGE_KEYS.COMMENTS, all);

      // Cloud Realtime sync — atomic per-user write

      try {

        const commentLikeRef = ref(database, `comments/${postId}/${commentId}/likes/${user.uid}`);

        if (isLikedNow) {

          set(commentLikeRef, true).catch(console.warn);

        } else {

          remove(commentLikeRef).catch(console.warn);

        }

      } catch (e) {

        console.warn('Comment like sync error:', e);

      }

      if (isLikedNow && comment.authorId !== user.uid) {

        notificationService.addNotification({

          targetUserId: comment.authorId,

          type: 'like',

          actor: user,

          text: `أعجب بردك: "${comment.content.substring(0, 30)}..."`

        });

        notificationService.playNotificationSound();

      }

      return comment;

    } catch (e) {

      console.error(e);

      return null;

    }

  },

  deleteComment(postId, commentId, userId) {
    try {
      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
      let list = all[postId];
      if (!Array.isArray(list)) {
        list = (list && typeof list === 'object' && list !== null) ? Object.values(list) : [];
      }
      all[postId] = list.filter((c) => c && c.id !== commentId && (c.authorId === userId || userId === 'dev_mahmoud_yasser' || userId === OFFICIAL_FOUNDER.uid));
      this.safeSetItem(STORAGE_KEYS.COMMENTS, all);

      // Cloud Realtime sync

      try {

        remove(ref(database, `comments/${postId}/${commentId}`)).catch(console.warn);

      } catch (e) {

        console.warn(e);

      }

      const posts = this.getPosts();

      const post = posts.find((p) => p.id === postId);

      if (post && post.repliesCount > 0) {

        post.repliesCount -= 1;

        this.safeSetItem(STORAGE_KEYS.POSTS, posts);

        try {

          set(ref(database, `posts/${postId}/repliesCount`), post.repliesCount).catch(console.warn);

        } catch (e) {

          console.warn(e);

        }

      }

    } catch (e) {

      console.error(e);

    }

  },

  // VERIFICATIONS

  requestVerification(userId, notes = '', plan = 'monthly') {

    const user = this.getUsers().find((u) => u.uid === userId);

    if (user) {

      user.verificationStatus = 'pending';

      this.saveUser(user);

      // Cloud Realtime request

      try {

        set(ref(database, `verification_requests/${userId}`), {

          userId,

          username: user.username,

          displayName: user.displayName,

          notes,

          plan,

          requestedAt: new Date().toISOString()

        }).catch(console.warn);

      } catch (e) {

        console.warn(e);

      }

    }

  },

  approveVerification(userId) {

    const user = this.getUsers().find((u) => u.uid === userId);

    if (user) {

      user.isVerified = true;

      user.verificationStatus = 'verified';

      this.saveUser(user);

      try {

        remove(ref(database, `verification_requests/${userId}`)).catch(console.warn);

      } catch (e) {

        console.warn(e);

      }

    }

  }

};

