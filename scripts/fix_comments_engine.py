import os

storage_path = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\storageService.js"
post_detail_path = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\PostDetailPage.jsx"

# 1. Update storageService.js
with open(storage_path, "r", encoding="utf-8") as f:
    storage_code = f.read()

# Replace getComments & subscribeToComments
old_get_subscribe = """  getComments(postId) {

    this.init();

    try {

      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};

      const raw = all[postId] || [];

      const users = this.getUsers();

      return raw.map((comm) => {

        if (!comm) return null;

        const normalizedLikes = this._resolveEngagementArray(comm.likes);

        const liveAuthor = users.find((u) => u.uid === comm.authorId || u.username === comm.author?.username);

        const isSovy = comm.authorId === OFFICIAL_SOVYTHOS.uid || comm.author?.username?.toLowerCase() === 'sovythos';

        const baseComm = {

          ...comm,

          likes: normalizedLikes

        };

        if (liveAuthor || isSovy) {

          const authorRef = isSovy ? OFFICIAL_SOVYTHOS : liveAuthor;

          return {

            ...baseComm,

            author: {

              ...comm.author,

              displayName: authorRef.displayName || comm.author?.displayName,

              username: authorRef.username || comm.author?.username,

              avatar: authorRef.avatar || comm.author?.avatar,

              isVerified: typeof authorRef.isVerified === 'boolean' ? authorRef.isVerified : comm.author?.isVerified,

              isFounder: typeof authorRef.isFounder === 'boolean' ? authorRef.isFounder : comm.author?.isFounder

            }

          };

        }

        return baseComm;

      }).filter(Boolean);

    } catch {

      return [];

    }

  },



  subscribeToComments(postId, callback) {

    if (!postId) return () => {};

    try {

      const commentsRef = ref(database, `comments/${postId}`);

      return onValue(commentsRef, (snapshot) => {

        const val = snapshot.val();

        if (val) {

          const list = Object.values(val);

          const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};

          all[postId] = list;

          this.safeSetItem(STORAGE_KEYS.COMMENTS, all);

          if (callback) callback(this.getComments(postId));

        }

      }, (err) => {

        console.warn('Firebase subscribeToComments error:', err);

      });

    } catch (e) {

      console.warn('Firebase subscribeToComments exception:', e);

      return () => {};

    }

  },"""

new_get_subscribe = """  getComments(postId) {
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
  },"""

if old_get_subscribe in storage_code:
    storage_code = storage_code.replace(old_get_subscribe, new_get_subscribe)
    print("Replaced getComments & subscribeToComments successfully!")
else:
    print("Could not find old_get_subscribe in storageService.js")

# Replace addComment
old_add_comment = """      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};

      if (!all[postId]) all[postId] = [];

      all[postId].push(comment);

      this.safeSetItem(STORAGE_KEYS.COMMENTS, all);



      if (post) {

        post.repliesCount = (post.repliesCount || 0) + 1;

        this.safeSetItem(STORAGE_KEYS.POSTS, posts);



        // Cloud Realtime sync

        try {

          set(ref(database, `comments/${postId}/${comment.id}`), comment).catch(console.warn);

          set(ref(database, `posts/${postId}/repliesCount`), post.repliesCount).catch(console.warn);

        } catch (e) {

          console.warn(e);

        }"""

new_add_comment = """      const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMMENTS)) || {};
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
        }"""

if old_add_comment in storage_code:
    storage_code = storage_code.replace(old_add_comment, new_add_comment)
    print("Replaced addComment successfully!")
else:
    print("Could not find old_add_comment in storageService.js")

with open(storage_path, "w", encoding="utf-8") as f:
    f.write(storage_code)

# 2. Update PostDetailPage.jsx
with open(post_detail_path, "r", encoding="utf-8") as f:
    detail_code = f.read()

# Prevent deleting comment on catch
old_catch = """    try {
      storageService.addComment(post.id, newComment, currentUser);
    } catch (err) {
      setComments((prev) => prev.filter((c) => c.id !== newComment.id));
    }"""

new_catch = """    try {
      storageService.addComment(post.id, newComment, currentUser);
    } catch (err) {
      console.warn('[PostDetailPage] addComment warning:', err);
    }"""

if old_catch in detail_code:
    detail_code = detail_code.replace(old_catch, new_catch)
    print("Replaced old_catch in PostDetailPage.jsx successfully!")
else:
    print("Could not find old_catch in PostDetailPage.jsx")

# Update commentTree in PostDetailPage.jsx
old_tree = """  // Build comment tree with sort
  const commentTree = useMemo(() => {
    if (!comments || comments.length === 0) return [];
    const map = new Map();
    comments.forEach((c) => {
      if (c && c.id) map.set(c.id, { ...c, replies: [] });
    });

    const roots = [];
    comments.forEach((c) => {
      if (!c || !c.id) return;
      const item = map.get(c.id);
      const parentId = c.parentId || (c.replyTo?.id && map.has(c.replyTo.id) ? c.replyTo.id : null);
      if (parentId && map.has(parentId) && parentId !== c.id) {
        map.get(parentId).replies.push(item);
      } else {
        roots.push(item);
      }
    });

    if (commentSort === 'top') {
      roots.sort((a, b) => (getArr(b.likes).length || 0) - (getArr(a.likes).length || 0));
    } else {
      roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return roots;
  }, [comments, commentSort]);"""

new_tree = """  // Build comment tree with sort
  const commentTree = useMemo(() => {
    if (!Array.isArray(comments) || comments.length === 0) return [];
    const map = new Map();
    comments.forEach((c) => {
      if (c && c.id) map.set(c.id, { ...c, replies: [] });
    });

    const roots = [];
    comments.forEach((c) => {
      if (!c || !c.id) return;
      const item = map.get(c.id);
      const parentId = c.parentId || (c.replyTo?.id && map.has(c.replyTo.id) ? c.replyTo.id : null);
      if (parentId && map.has(parentId) && parentId !== c.id) {
        map.get(parentId).replies.push(item);
      } else {
        roots.push(item);
      }
    });

    if (commentSort === 'top') {
      roots.sort((a, b) => (getArr(b.likes).length || 0) - (getArr(a.likes).length || 0));
    } else {
      roots.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return roots;
  }, [comments, commentSort]);"""

if old_tree in detail_code:
    detail_code = detail_code.replace(old_tree, new_tree)
    print("Replaced commentTree in PostDetailPage.jsx successfully!")
else:
    print("Could not find old_tree in PostDetailPage.jsx")

with open(post_detail_path, "w", encoding="utf-8") as f:
    f.write(detail_code)

print("All updates written successfully!")
