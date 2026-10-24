import os, sys

def patch_file(file_path, old_text, new_text):
    with open(file_path, 'rb') as f:
        data = f.read()
    
    is_crlf = b'\r\n' in data
    old_bytes = old_text.replace('\r\n', '\n').encode('utf-8')
    new_bytes = new_text.replace('\r\n', '\n').encode('utf-8')
    data_norm = data.replace(b'\r\n', b'\n')
    
    if old_bytes not in data_norm:
        print(f"FAILED: old_text not found in {file_path}")
        return False
        
    count = data_norm.count(old_bytes)
    data_replaced = data_norm.replace(old_bytes, new_bytes, 1)
    
    if is_crlf:
        data_final = data_replaced.replace(b'\n', b'\r\n')
    else:
        data_final = data_replaced
        
    with open(file_path, 'wb') as f:
        f.write(data_final)
        
    print(f"SUCCESS: Patched {file_path}")
    return True

print("Starting patching...")

# =====================================================================
# 1. FeedPage.jsx
# =====================================================================
feed_path = r'src/pages/FeedPage.jsx'

feed_old_1 = """  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [bootGrace, setBootGrace] = useState(true);
  const [poolNonce, setPoolNonce] = useState(0);"""

feed_new_1 = """  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [bootGrace, setBootGrace] = useState(true);
  const [poolNonce, setPoolNonce] = useState(0);
  const [prefNonce, setPrefNonce] = useState(0);

  useEffect(() => {
    const handlePrefChange = () => setPrefNonce((n) => n + 1);
    window.addEventListener('pulse_preference_changed', handlePrefChange);
    return () => window.removeEventListener('pulse_preference_changed', handlePrefChange);
  }, []);"""

patch_file(feed_path, feed_old_1, feed_new_1)

feed_old_2 = """  const visiblePosts = useMemo(
    () => moderationService.filterBlockedPosts(posts, currentUser?.uid),
    [posts, currentUser?.uid]
  );"""

feed_new_2 = """  const visiblePosts = useMemo(
    () => moderationService.filterBlockedPosts(posts, currentUser?.uid, followingArr),
    [posts, currentUser?.uid, followingArr, prefNonce]
  );"""

patch_file(feed_path, feed_old_2, feed_new_2)

# =====================================================================
# 2. PostCard.jsx
# =====================================================================
postcard_path = r'src/components/PostCard.jsx'

# Import moderationService
pc_old_import = """import { affinityEngine } from '../services/affinityEngine';"""
pc_new_import = """import { affinityEngine } from '../services/affinityEngine';
import { moderationService } from '../services/moderationService';"""

patch_file(postcard_path, pc_old_import, pc_new_import)

# Add hideLikeCounts state
pc_old_state = """  const [isSuppressed, setIsSuppressed] = useState(() => {
    return affinityEngine.isPostSuppressed(currentUserId, post);
  });"""

pc_new_state = """  const [isSuppressed, setIsSuppressed] = useState(() => {
    return affinityEngine.isPostSuppressed(currentUserId, post);
  });
  const [hideLikeCounts, setHideLikeCounts] = useState(() => localStorage.getItem('pulse_hide_likes_counts') === 'true');

  useEffect(() => {
    const handlePref = () => {
      setHideLikeCounts(localStorage.getItem('pulse_hide_likes_counts') === 'true');
    };
    window.addEventListener('pulse_preference_changed', handlePref);
    return () => window.removeEventListener('pulse_preference_changed', handlePref);
  }, []);"""

patch_file(postcard_path, pc_old_state, pc_new_state)

# Wire actual mute functionality in PostCard
pc_old_mute = """                          {/* Mute */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              showToast(lang === 'ar' ? `تم كتم @${displayAuthor.username}` : `Muted @${displayAuthor.username}`);
                            }}"""

pc_new_mute = """                          {/* Mute */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              moderationService.muteUser(displayAuthor, currentUser);
                              showToast(lang === 'ar' ? `تم كتم @${displayAuthor.username}` : `Muted @${displayAuthor.username}`);
                            }}"""

patch_file(postcard_path, pc_old_mute, pc_new_mute)

# Hide counters in PostCard
pc_old_likes_cnt = """{likesCount > 0 && <AnimatedCounter value={likesCount} className="text-xs" />}"""
pc_new_likes_cnt = """{!hideLikeCounts && likesCount > 0 && <AnimatedCounter value={likesCount} className="text-xs" />}"""
patch_file(postcard_path, pc_old_likes_cnt, pc_new_likes_cnt)

pc_old_reposts_cnt = """{repostsCount > 0 && <AnimatedCounter value={repostsCount} className="text-xs" />}"""
pc_new_reposts_cnt = """{!hideLikeCounts && repostsCount > 0 && <AnimatedCounter value={repostsCount} className="text-xs" />}"""
patch_file(postcard_path, pc_old_reposts_cnt, pc_new_reposts_cnt)

# =====================================================================
# 3. PostDetailPage.jsx
# =====================================================================
postdetail_path = r'src/pages/PostDetailPage.jsx'

# Add hideLikeCounts state
pd_old_state = """  const [comments, setComments] = useState([]);"""
pd_new_state = """  const [comments, setComments] = useState([]);
  const [hideLikeCounts, setHideLikeCounts] = useState(() => localStorage.getItem('pulse_hide_likes_counts') === 'true');

  useEffect(() => {
    const handlePref = () => {
      setHideLikeCounts(localStorage.getItem('pulse_hide_likes_counts') === 'true');
    };
    window.addEventListener('pulse_preference_changed', handlePref);
    return () => window.removeEventListener('pulse_preference_changed', handlePref);
  }, []);"""

patch_file(postdetail_path, pd_old_state, pd_new_state)

# Hide counters in PostDetailPage
pd_old_like = """              <AnimatedCounter value={localLikesCount} className="text-xs font-semibold" />"""
pd_new_like = """              {!hideLikeCounts && <AnimatedCounter value={localLikesCount} className="text-xs font-semibold" />}"""
patch_file(postdetail_path, pd_old_like, pd_new_like)

pd_old_repost = """              <AnimatedCounter value={localRepostsCount} className="text-xs font-semibold" />"""
pd_new_repost = """              {!hideLikeCounts && <AnimatedCounter value={localRepostsCount} className="text-xs font-semibold" />}"""
patch_file(postdetail_path, pd_old_repost, pd_new_repost)

pd_old_share = """              <AnimatedCounter value={Number(post.sharesCount) || 0} className="text-xs font-semibold" />"""
pd_new_share = """              {!hideLikeCounts && <AnimatedCounter value={Number(post.sharesCount) || 0} className="text-xs font-semibold" />}"""
patch_file(postdetail_path, pd_old_share, pd_new_share)

print("Finished FeedPage, PostCard, PostDetailPage!")
