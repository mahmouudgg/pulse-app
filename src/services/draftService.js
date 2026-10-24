/**
 * PULSE Drafts Engine
 * -------------------------------------------------------------------------
 * - Persistent per-account drafts stored in IndexedDB (large capacity, so
 *   photos / GIFs / short videos / voice notes survive intact).
 * - Automatic transparent fallback to localStorage when IndexedDB is not
 *   available (private mode, locked-down WebViews).
 * - In-memory cache + subscription API so the UI badge / list update live.
 * - Crash-safe: the composer auto-saves into a "working" draft, so even a
 *   killed app never loses text.
 */

const DB_NAME = 'pulse_drafts_db';
const DB_VERSION = 1;
const STORE = 'drafts';
const LS_PREFIX = 'pulse_drafts_ls_v1:';
export const MAX_DRAFTS = 50;

let dbPromise = null;
const cache = new Map(); // uid -> Draft[] (sorted newest first)
const loaded = new Set(); // uids whose cache is hydrated
const listeners = new Set();

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('uid', 'uid', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function sortDrafts(list) {
  return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function emit(uid) {
  const snapshot = cache.get(uid) || [];
  listeners.forEach((fn) => {
    try { fn(uid, snapshot); } catch { /* listener errors must never break storage */ }
  });
}

/* ---------------- localStorage fallback ---------------- */
function lsRead(uid) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + uid);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsWrite(uid, list) {
  try {
    localStorage.setItem(LS_PREFIX + uid, JSON.stringify(list));
    return true;
  } catch {
    // Quota exceeded: retry without heavy media so the text is never lost.
    try {
      const lean = list.map((d) => ({
        ...d,
        media: { ...(d.media || {}), image: null, video: null, audio: null },
        mediaStripped: true
      }));
      localStorage.setItem(LS_PREFIX + uid, JSON.stringify(lean));
      return true;
    } catch {
      return false;
    }
  }
}

/* ---------------- Public API ---------------- */
function hasMeaningfulContent(draft) {
  if (!draft) return false;
  const m = draft.media || {};
  const pollFilled = (draft.poll?.options || []).filter((o) => String(o || '').trim()).length;
  return Boolean(
    String(draft.content || '').trim() ||
    m.image || m.video || m.gif || m.audio ||
    pollFilled > 0 ||
    draft.location
  );
}

export const draftService = {
  hasMeaningfulContent,

  generateId() {
    return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  },

  async load(uid) {
    if (!uid) return [];
    if (loaded.has(uid)) return cache.get(uid) || [];
    let list = [];
    const db = await openDb();
    if (db) {
      try {
        const tx = db.transaction(STORE, 'readonly');
        list = await idbRequest(tx.objectStore(STORE).index('uid').getAll(uid));
      } catch {
        list = lsRead(uid);
      }
    } else {
      list = lsRead(uid);
    }
    cache.set(uid, sortDrafts(list || []));
    loaded.add(uid);
    emit(uid);
    return cache.get(uid);
  },

  /** Synchronous snapshot (empty until `load` resolved once). */
  peek(uid) {
    return cache.get(uid) || [];
  },

  count(uid) {
    return (cache.get(uid) || []).length;
  },

  async get(uid, id) {
    const list = await this.load(uid);
    return list.find((d) => d.id === id) || null;
  },

  /**
   * Insert or update a draft. Returns the stored draft (or null if the
   * payload carries no meaningful content).
   */
  async save(uid, draft) {
    if (!uid || !draft || !draft.id) return null;
    if (!hasMeaningfulContent(draft)) {
      await this.remove(uid, draft.id, { silent: true });
      return null;
    }

    const list = await this.load(uid);
    const existing = list.find((d) => d.id === draft.id);
    const record = {
      ...draft,
      uid,
      createdAt: existing?.createdAt || draft.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    let next = [record, ...list.filter((d) => d.id !== record.id)];
    // Enforce cap (drop oldest)
    const overflow = next.slice(MAX_DRAFTS);
    next = next.slice(0, MAX_DRAFTS);
    cache.set(uid, sortDrafts(next));

    const db = await openDb();
    if (db) {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(record);
        overflow.forEach((d) => store.delete(d.id));
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } catch {
        lsWrite(uid, cache.get(uid));
      }
    } else {
      lsWrite(uid, cache.get(uid));
    }
    emit(uid);
    return record;
  },

  async remove(uid, id, options = {}) {
    if (!uid || !id) return;
    const list = await this.load(uid);
    if (!list.some((d) => d.id === id)) return;
    cache.set(uid, list.filter((d) => d.id !== id));

    const db = await openDb();
    if (db) {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        lsWrite(uid, cache.get(uid));
      }
    } else {
      lsWrite(uid, cache.get(uid));
    }
    emit(uid);
  },

  async removeMany(uid, ids = []) {
    const removed = [];
    const list = await this.load(uid);
    for (const id of ids) {
      const found = list.find((d) => d.id === id);
      if (found) removed.push(found);
      await this.remove(uid, id);
    }
    return removed;
  },

  /** Restore previously-removed drafts (Undo). */
  async restore(uid, drafts = []) {
    for (const d of drafts) {
      // Preserve original timestamps for natural ordering
      const list = await this.load(uid);
      if (list.some((x) => x.id === d.id)) continue;
      const next = [d, ...list].slice(0, MAX_DRAFTS);
      cache.set(uid, sortDrafts(next));
      const db = await openDb();
      if (db) {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(d);
          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });
        } catch {
          lsWrite(uid, cache.get(uid));
        }
      } else {
        lsWrite(uid, cache.get(uid));
      }
    }
    emit(uid);
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
