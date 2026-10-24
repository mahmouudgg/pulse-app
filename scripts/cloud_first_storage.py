import os

file_path = os.path.join('src', 'services', 'storageService.js')
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add in-memory caches to storageService
target_class = "export const storageService = {"
replacement_class = """export const storageService = {
  _inMemoryPosts: [],
  _inMemoryUsers: [],
"""

if target_class in c:
    c = c.replace(target_class, replacement_class, 1)

# 2. Update cleanLegacyStorage to clear bloat
old_clean = """  cleanLegacyStorage() {
    try {
      const keysToRemove = ["""

new_clean = """  cleanLegacyStorage() {
    try {
      // Clean oversized cache blobs per cloud-first policy
      try {
        const rawP = localStorage.getItem(STORAGE_KEYS.POSTS);
        if (rawP && rawP.length > 20000) {
          localStorage.setItem(STORAGE_KEYS.POSTS, '[]');
        }
        const rawU = localStorage.getItem(STORAGE_KEYS.USERS);
        if (rawU && rawU.length > 20000) {
          localStorage.setItem(STORAGE_KEYS.USERS, '[]');
        }
      } catch {}
      const keysToRemove = ["""

if old_clean in c:
    c = c.replace(old_clean, new_clean, 1)

# 3. In subscribeToPosts, save to _inMemoryPosts
old_sub_save = """          this.safeSetItem(STORAGE_KEYS.POSTS, finalPosts);
          if (callback) callback(finalPosts);"""
new_sub_save = """          this._inMemoryPosts = finalPosts;
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
          if (callback) callback(finalPosts);"""

if old_sub_save in c:
    c = c.replace(old_sub_save, new_sub_save, 1)

# 4. In getPosts, return _inMemoryPosts if populated
old_get_posts = """  // POSTS
  getPosts() {
    this.init();
    try {
      const rawPosts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS)) || [];"""

new_get_posts = """  // POSTS
  getPosts() {
    if (this._inMemoryPosts && this._inMemoryPosts.length > 0) {
      return this._inMemoryPosts;
    }
    this.init();
    try {
      const rawPosts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS)) || [];"""

if old_get_posts in c:
    c = c.replace(old_get_posts, new_get_posts, 1)

# 5. In subscribeToUsers, save to _inMemoryUsers
old_sub_users = """          try {
            this.safeSetItem(STORAGE_KEYS.USERS, list);
          } catch (e) {
            console.warn('Storage quota notice on subscribeToUsers:', e);
          }
          if (callback) callback(list);"""

new_sub_users = """          this._inMemoryUsers = list;
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
          if (callback) callback(list);"""

if old_sub_users in c:
    c = c.replace(old_sub_users, new_sub_users, 1)

# 6. In getUsers, return _inMemoryUsers if populated
old_get_users = """  // USERS (Defensive Filtering: Zero Ghost/Undefined Users)
  getUsers() {
    this.init();
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];"""

new_get_users = """  // USERS (Defensive Filtering: Zero Ghost/Undefined Users)
  getUsers() {
    if (this._inMemoryUsers && this._inMemoryUsers.length > 0) {
      return this._inMemoryUsers;
    }
    this.init();
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];"""

if old_get_users in c:
    c = c.replace(old_get_users, new_get_users, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Successfully optimized storageService.js for cloud-first synchronization')
