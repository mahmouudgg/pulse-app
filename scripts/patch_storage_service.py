# -*- coding: utf-8 -*-
import sys

FILE_PATH = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\storageService.js'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

target = "      return list;\n    } catch (err) {\n      console.warn('Firebase loadOlderPosts error:', err);\n      return [];\n    }\n  },"
if target not in content:
    target = "      return list;\r\n    } catch (err) {\r\n      console.warn('Firebase loadOlderPosts error:', err);\r\n      return [];\r\n    }\r\n  },"

if target not in content:
    print("Error: Target not found in content!")
    sys.exit(1)

new_code = target + """

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
  },"""

updated_content = content.replace(target, new_code, 1)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("Successfully patched storageService.js!")
