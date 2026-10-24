# -*- coding: utf-8 -*-
import sys

FILE_PATH = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\ProfilePage.jsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update React import
if "import React, { useState, useEffect } from 'react';" in content:
    content = content.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect, useMemo } from 'react';",
        1
    )
elif "import React, { useState, useEffect, useMemo } from 'react';" not in content:
    content = content.replace(
        "import React,",
        "import React, { useMemo },",
        1
    )

# 2. Add profile posts auto-sync state and useMemo before STRICT RULE OF HOOKS
hooks_marker = "  // STRICT RULE OF HOOKS: All hooks above this line. Conditional returns below:"
if hooks_marker not in content:
    print("Error: Could not find hooks marker!")
    sys.exit(1)

sync_hooks = """  // Realtime & low-bandwidth auto-sync for full author pulse history
  const [syncedUserPosts, setSyncedUserPosts] = useState(() => {
    return storageService.getCachedUserPosts(profileUser?.uid, profileUser?.username);
  });
  const [isSyncingPosts, setIsSyncingPosts] = useState(false);

  useEffect(() => {
    const targetUid = profileUser?.uid;
    const targetUsername = profileUser?.username;
    if (!targetUid && !targetUsername) return;

    let isMounted = true;
    setIsSyncingPosts(true);

    storageService.fetchUserPosts(targetUid, targetUsername)
      .then((posts) => {
        if (isMounted && Array.isArray(posts)) {
          setSyncedUserPosts(posts);
        }
      })
      .catch((err) => {
        console.warn('Profile posts sync notice:', err);
      })
      .finally(() => {
        if (isMounted) setIsSyncingPosts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profileUser?.uid, profileUser?.username]);

  // Merge live feed posts (userPosts prop) with author's synced pulses
  const allMergedPosts = useMemo(() => {
    const postMap = new Map();
    (syncedUserPosts || []).forEach((p) => {
      if (p && p.id) postMap.set(String(p.id), p);
    });
    (userPosts || []).forEach((p) => {
      if (p && p.id) {
        if (postMap.has(String(p.id))) {
          postMap.set(String(p.id), { ...postMap.get(String(p.id)), ...p });
        } else {
          postMap.set(String(p.id), p);
        }
      }
    });
    return Array.from(postMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [userPosts, syncedUserPosts]);

"""

content = content.replace(hooks_marker, sync_hooks + hooks_marker, 1)

# 3. Update authorPosts filter to use allMergedPosts and add delete/edit internal handlers
old_filter = "  // Filter posts written or reposted by this profile's user (Defensive multi-format matching)\n  const authorPosts = userPosts.filter((p) => {"
if old_filter not in content:
    # Try CRLF
    old_filter = "  // Filter posts written or reposted by this profile's user (Defensive multi-format matching)\r\n  const authorPosts = userPosts.filter((p) => {"

if old_filter in content:
    new_filter = """  // Delete / Edit handlers that immediately update author's synced pulse state
  const handleDeletePostInternal = (postId) => {
    setSyncedUserPosts((prev) => (prev || []).filter((p) => String(p.id) !== String(postId)));
    const cacheKey = `pulse_user_posts_${profileUser?.uid || profileUser?.username}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const filtered = JSON.parse(raw).filter((p) => String(p.id) !== String(postId));
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      }
    } catch {}
    if (onDeletePost) onDeletePost(postId);
  };

  const handleEditPostInternal = (postId, newContent) => {
    setSyncedUserPosts((prev) => (prev || []).map((p) => String(p.id) === String(postId) ? { ...p, content: newContent, text: newContent, isEdited: true } : p));
    if (onEditPost) onEditPost(postId, newContent);
  };

  // Filter posts written or reposted by this profile's user (Defensive multi-format matching)
  const authorPosts = allMergedPosts.filter((p) => {"""
    content = content.replace(old_filter, new_filter, 1)
else:
    print("Warning: old_filter not matched directly, checking alternative replacement...")
    target_needle = "const authorPosts = userPosts.filter((p) => {"
    replacement_needle = """  // Delete / Edit handlers that immediately update author's synced pulse state
  const handleDeletePostInternal = (postId) => {
    setSyncedUserPosts((prev) => (prev || []).filter((p) => String(p.id) !== String(postId)));
    const cacheKey = `pulse_user_posts_${profileUser?.uid || profileUser?.username}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const filtered = JSON.parse(raw).filter((p) => String(p.id) !== String(postId));
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      }
    } catch {}
    if (onDeletePost) onDeletePost(postId);
  };

  const handleEditPostInternal = (postId, newContent) => {
    setSyncedUserPosts((prev) => (prev || []).map((p) => String(p.id) === String(postId) ? { ...p, content: newContent, text: newContent, isEdited: true } : p));
    if (onEditPost) onEditPost(postId, newContent);
  };

  const authorPosts = allMergedPosts.filter((p) => {"""
    content = content.replace(target_needle, replacement_needle, 1)

# 4. Update PostCard handlers in ProfilePage
old_post_handlers = """                onDeletePost={onDeletePost}
                onEditPost={onEditPost}"""
new_post_handlers = """                onDeletePost={handleDeletePostInternal}
                onEditPost={handleEditPostInternal}"""

if old_post_handlers in content:
    content = content.replace(old_post_handlers, new_post_handlers, 1)
else:
    old_post_handlers_crlf = old_post_handlers.replace('\n', '\r\n')
    if old_post_handlers_crlf in content:
        content = content.replace(old_post_handlers_crlf, new_post_handlers, 1)

# 5. Add syncing spinner state when empty and syncing
old_empty = """          ) : (
            <div className=\"p-12 text-center text-xs text-neutral-500 leading-relaxed\">"""
new_empty = """          ) : isSyncingPosts ? (
            <div className=\"p-16 text-center space-y-3\">
              <div className=\"w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto\" />
              <div className=\"text-xs text-neutral-500\">
                {lang === 'ar' ? 'جارٍ مزامنة النبضات...' : 'Syncing pulses...'}
              </div>
            </div>
          ) : (
            <div className=\"p-12 text-center text-xs text-neutral-500 leading-relaxed\">"""

if old_empty in content:
    content = content.replace(old_empty, new_empty, 1)
else:
    old_empty_crlf = old_empty.replace('\n', '\r\n')
    if old_empty_crlf in content:
        content = content.replace(old_empty_crlf, new_empty, 1)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched ProfilePage.jsx!")
