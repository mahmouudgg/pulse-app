import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app"
target_file = os.path.join(BASE_DIR, "src", "services", "storageService.js")

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

is_crlf = '\r\n' in content
c_norm = content.replace('\r\n', '\n')

# 1. Update subscribeToUser
new_sub_user = """  subscribeToUser(uid, callback) {

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

  },"""

idx_start = c_norm.find("  subscribeToUser(uid, callback) {")
if idx_start != -1:
    idx_end = c_norm.find("  saveFCMToken(uid, token) {", idx_start)
    if idx_end != -1:
        c_norm = c_norm[:idx_start] + new_sub_user + "\n\n" + c_norm[idx_end:]
        print("Updated subscribeToUser successfully!", flush=True)
    else:
        print("Could not find saveFCMToken anchor", flush=True)
else:
    print("Could not find subscribeToUser anchor", flush=True)

# 2. Update getUserReplies and subscribeToUserReplies
new_user_replies_code = """  getUserReplies(userId, username) {

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

  },"""

idx_replies_start = c_norm.find("  getUserReplies(userId, username) {")
if idx_replies_start != -1:
    idx_replies_end = c_norm.find("  addComment(postId, comment, currentUser) {", idx_replies_start)
    if idx_replies_end != -1:
        c_norm = c_norm[:idx_replies_start] + new_user_replies_code + "\n\n" + c_norm[idx_replies_end:]
        print("Updated getUserReplies and subscribeToUserReplies successfully!", flush=True)
    else:
        print("Could not find addComment anchor", flush=True)
else:
    print("Could not find getUserReplies anchor", flush=True)

if is_crlf:
    c_norm = c_norm.replace('\n', '\r\n')

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(c_norm)

print("Finished patch_storage_service.py successfully!", flush=True)
