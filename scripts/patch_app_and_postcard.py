import os
import re

# 1. Patch src/App.jsx
app_path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\App.jsx'
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

handle_repost_pattern = re.compile(r'  const handleRepost = \(postId\) => \{[\s\S]*?\n  \};\n\n  // 0ms Optimistic Publish')
m_app = handle_repost_pattern.search(app_content)
assert m_app is not None, 'handleRepost in App.jsx not matched'

new_handle_repost = '''  const handleRepost = (postOrId, postObj = null) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    let postId = postOrId;
    let postData = postObj;
    if (typeof postOrId === 'object' && postOrId !== null) {
      postData = postOrId;
      postId = postOrId.id;
    }

    hapticsService.medium();

    try {
      const result = storageService.toggleRepost(postId, currentUser, postData) || {};
      const { repostEntry, isRepostedNow, actualOriginalId = postId } = result;

      setPosts((prev) => {
        let next = prev.map((p) => {
          const isTarget = p.id === postId || p.id === actualOriginalId || (p.isRepost && (p.originalPostId === postId || p.originalPostId === actualOriginalId));
          if (!isTarget) return p;

          const currentReposts = storageService._resolveEngagementArray(p.reposts);
          const hasReposted = Array.isArray(currentReposts) && currentUser?.uid ? currentReposts.includes(currentUser.uid) : false;
          const nextReposts = isRepostedNow
            ? (hasReposted ? currentReposts : [...(Array.isArray(currentReposts) ? currentReposts : []), currentUser.uid])
            : currentReposts.filter((id) => id !== currentUser.uid);

          const updated = { ...p, reposts: nextReposts };
          delete updated.repostsCount;
          return updated;
        });

        if (isRepostedNow && repostEntry) {
          next = [repostEntry, ...next];
        } else if (!isRepostedNow) {
          next = next.filter(
            (p) => !(p.isRepost && (p.originalPostId === postId || p.originalPostId === actualOriginalId) && (p.repostedBy?.uid === currentUser.uid || p.authorId === currentUser.uid))
          );
        }
        return next;
      });

      if (selectedPost) {
        const isSelectedTarget = selectedPost.id === postId || selectedPost.id === actualOriginalId || (selectedPost.isRepost && (selectedPost.originalPostId === postId || selectedPost.originalPostId === actualOriginalId));
        if (isSelectedTarget) {
          setSelectedPost((prev) => {
            if (!prev) return prev;
            const currentReposts = storageService._resolveEngagementArray(prev.reposts);
            const hasReposted = Array.isArray(currentReposts) && currentUser?.uid ? currentReposts.includes(currentUser.uid) : false;
            const nextReposts = isRepostedNow
              ? (hasReposted ? currentReposts : [...(Array.isArray(currentReposts) ? currentReposts : []), currentUser.uid])
              : currentReposts.filter((id) => id !== currentUser.uid);

            const updated = { ...prev, reposts: nextReposts };
            delete updated.repostsCount;
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn('Optimistic repost rollback:', err);
      setPosts(storageService.getPosts());
    }
  };

  // 0ms Optimistic Publish'''

app_content = app_content[:m_app.start()] + new_handle_repost + app_content[m_app.end():]
with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app_content)
print('App.jsx patched successfully')

# 2. Patch src/components/PostCard.jsx
card_path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\components\PostCard.jsx'
with open(card_path, 'r', encoding='utf-8') as f:
    card_content = f.read()

# Replace resolveEngagementList in PostCard
resolve_list_pattern = re.compile(r'  const resolveEngagementList = \(raw\) => \{[\s\S]*?\n  \};')
m_card_resolve = resolve_list_pattern.search(card_content)
assert m_card_resolve is not None, 'resolveEngagementList in PostCard not matched'

new_card_resolve = '''  const resolveEngagementList = (raw) => {
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
  };'''

card_content = card_content[:m_card_resolve.start()] + new_card_resolve + card_content[m_card_resolve.end():]

# Update isReposted definition
old_is_reposted = 'const isReposted = currentUserId ? repostsArr.includes(currentUserId) : false;'
new_is_reposted = '''const isReposted = Boolean(
    currentUserId && (
      repostsArr.includes(currentUserId) ||
      (post.isRepost && post.repostedBy?.uid === currentUserId)
    )
  );'''
assert old_is_reposted in card_content, 'old_is_reposted not found in PostCard'
card_content = card_content.replace(old_is_reposted, new_is_reposted, 1)

# Update handleRepostClick
old_repost_click = '''  const handleRepostClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) return;
    hapticsService.medium();
    setRepostAnimating(true);
    setTimeout(() => setRepostAnimating(false), 500);
    affinityEngine.trackEngagement(currentUser.uid, post, 'repost');
    if (onRepost) onRepost(targetPostId);
  };'''

new_repost_click = '''  const handleRepostClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) return;
    hapticsService.medium();
    setRepostAnimating(true);
    setTimeout(() => setRepostAnimating(false), 500);
    affinityEngine.trackEngagement(currentUser.uid, post, 'repost');
    if (onRepost) onRepost(targetPostId, post);
  };'''

assert old_repost_click in card_content, 'old_repost_click not found in PostCard'
card_content = card_content.replace(old_repost_click, new_repost_click, 1)

with open(card_path, 'w', encoding='utf-8') as f:
    f.write(card_content)
print('PostCard.jsx patched successfully')

# 3. Patch src/components/PulseMediaViewer.jsx
media_path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\components\PulseMediaViewer.jsx'
with open(media_path, 'r', encoding='utf-8') as f:
    media_content = f.read()

old_media_repost = 'if (onRepost) onRepost(post);'
new_media_repost = 'if (onRepost) onRepost(post.id, post);'
if old_media_repost in media_content:
    media_content = media_content.replace(old_media_repost, new_media_repost, 1)
    with open(media_path, 'w', encoding='utf-8') as f:
        f.write(media_content)
    print('PulseMediaViewer.jsx patched successfully')

# 4. Patch src/pages/PostDetailPage.jsx
detail_path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\PostDetailPage.jsx'
with open(detail_path, 'r', encoding='utf-8') as f:
    detail_content = f.read()

old_detail_repost = 'if (onRepost) onRepost(post.id);'
new_detail_repost = 'if (onRepost) onRepost(post.id, post);'
if old_detail_repost in detail_content:
    detail_content = detail_content.replace(old_detail_repost, new_detail_repost, 1)
    with open(detail_path, 'w', encoding='utf-8') as f:
        f.write(detail_content)
    print('PostDetailPage.jsx patched successfully')

# 5. Patch src/pages/ProfilePage.jsx
profile_path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\ProfilePage.jsx'
with open(profile_path, 'r', encoding='utf-8') as f:
    profile_content = f.read()

old_prof_repost = 'if (onRepost && parent.id) onRepost(parent.id);'
new_prof_repost = 'if (onRepost && parent.id) onRepost(parent.id, parent);'
if old_prof_repost in profile_content:
    profile_content = profile_content.replace(old_prof_repost, new_prof_repost)
    with open(profile_path, 'w', encoding='utf-8') as f:
        f.write(profile_content)
    print('ProfilePage.jsx patched successfully')

print('ALL PATCHES COMPLETE')
