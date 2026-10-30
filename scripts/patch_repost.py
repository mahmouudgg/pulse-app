import os
import re

path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\storageService.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace _resolveEngagementArray
# Look for _resolveEngagementArray(raw) { ... },
resolve_pattern = re.compile(r'  _resolveEngagementArray\(raw\)\s*\{[\s\S]*?\n  \},')
m_resolve = resolve_pattern.search(content)
assert m_resolve is not None, '_resolveEngagementArray pattern not matched'

new_resolve = '''  _resolveEngagementArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((v) => (typeof v === 'string' ? v.trim() : (v && v.uid ? String(v.uid).trim() : '')))
        .filter((v) => v.length > 0);
    }
    if (typeof raw === 'object') {
      const result = new Set();
      for (const [key, val] of Object.entries(raw)) {
        if (/^\\d+$/.test(key)) {
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
  },'''

content = content[:m_resolve.start()] + new_resolve + content[m_resolve.end():]

# 2. Replace toggleRepost
toggle_pattern = re.compile(r'  toggleRepost\(postId,\s*user\)\s*\{[\s\S]*?\n  \},(?=\s*\n\s*// COMMENTS)')
m_toggle = toggle_pattern.search(content)
assert m_toggle is not None, 'toggleRepost pattern not matched'

new_toggle = '''  toggleRepost(postId, user, existingPostObj = null) {
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
  },'''

content = content[:m_toggle.start()] + new_toggle + content[m_toggle.end():]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS')
