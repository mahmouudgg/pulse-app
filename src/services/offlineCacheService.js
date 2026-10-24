/**
 * PULSE Offline Cache Service (IndexedDB Cache-First Architecture)
 * - Persists the latest feed posts locally in IndexedDB for 0ms startup time.
 * - Provides offline detection & auto-reconnect listeners.
 * - Handles quota-safe storage without localStorage 5MB size limits.
 */

const DB_NAME = 'pulse_offline_db_v1';
const DB_VERSION = 1;
const STORE_POSTS = 'feed_posts';
const STORE_META = 'sync_meta';
const MAX_CACHED_POSTS = 50;

class OfflineCacheService {
  constructor() {
    this._db = null;
    this._initPromise = null;
    this._listeners = new Set();
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._handleNetworkChange(true));
      window.addEventListener('offline', () => this._handleNetworkChange(false));
    }
  }

  _handleNetworkChange(status) {
    this._isOnline = status;
    this._listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.warn('Network listener error:', e);
      }
    });
  }

  onNetworkChange(callback) {
    if (typeof callback !== 'function') return () => {};
    this._listeners.add(callback);
    callback(this._isOnline);
    return () => this._listeners.delete(callback);
  }

  isOnline() {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return this._isOnline;
  }

  async _openDb() {
    if (this._db) return this._db;
    if (this._initPromise) return this._initPromise;

    if (typeof indexedDB === 'undefined') {
      return null;
    }

    this._initPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_POSTS)) {
            const postStore = db.createObjectStore(STORE_POSTS, { keyPath: 'id' });
            postStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META, { keyPath: 'key' });
          }
        };

        req.onsuccess = (e) => {
          this._db = e.target.result;
          resolve(this._db);
        };

        req.onerror = (err) => {
          console.warn('IndexedDB open error, falling back:', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization failed:', err);
        resolve(null);
      }
    });

    return this._initPromise;
  }

  /**
   * Save fresh posts into IndexedDB (Limited to latest MAX_CACHED_POSTS)
   */
  async cacheFeedPosts(posts) {
    if (!Array.isArray(posts) || posts.length === 0) return;

    try {
      const db = await this._openDb();
      if (!db) {
        // Fallback to light localStorage cache
        try {
          const slice = posts.slice(0, 25);
          localStorage.setItem('pulse_cached_feed_v1', JSON.stringify(slice));
        } catch {}
        return;
      }

      const tx = db.transaction([STORE_POSTS, STORE_META], 'readwrite');
      const postStore = tx.objectStore(STORE_POSTS);
      const metaStore = tx.objectStore(STORE_META);

      // Save top posts
      const limitedPosts = posts.slice(0, MAX_CACHED_POSTS);
      for (const p of limitedPosts) {
        if (p && p.id) {
          postStore.put(p);
        }
      }

      metaStore.put({
        key: 'last_feed_sync',
        timestamp: Date.now(),
        count: limitedPosts.length
      });

      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('cacheFeedPosts error:', e);
    }
  }

  /**
   * Retrieve cached feed posts instantly (0ms load)
   */
  async getCachedFeedPosts() {
    try {
      const db = await this._openDb();
      if (!db) {
        try {
          const raw = localStorage.getItem('pulse_cached_feed_v1');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      }

      return new Promise((resolve) => {
        const tx = db.transaction([STORE_POSTS], 'readonly');
        const store = tx.objectStore(STORE_POSTS);
        const req = store.getAll();

        req.onsuccess = () => {
          const items = req.result || [];
          items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          resolve(items.slice(0, MAX_CACHED_POSTS));
        };

        req.onerror = () => {
          resolve([]);
        };
      });
    } catch (err) {
      console.warn('getCachedFeedPosts error:', err);
      return [];
    }
  }
}

export const offlineCacheService = new OfflineCacheService();
