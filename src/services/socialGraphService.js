/**
 * PULSE Official Next-Gen Social Graph & Relationship Engine for PULSE
 * PULSE Core 1:1 Relationship State Machine:
 * - States: 'self' | 'mutual' | 'following' | 'follows_you' | 'requested' | 'stranger'
 * - Mutual Connections graph calculation (intersecting sets)
 * - Human-readable social proof summaries (e.g. "يتابعه @sara و @ali و 4 آخرون")
 * - Silent follower removal (Remove Follower without blocking)
 */

import { storageService } from './storageService';
import { database } from './firebase';
import { ref, set, remove } from 'firebase/database';

export const socialGraphService = {
  /**
   * Determine exact relationship between currentUser and targetUser
   * @param {string} currentUid - Active logged in user UID
   * @param {string} targetUid - Target user UID
   * @returns {Object} Relationship descriptor
   */
  getRelationship(currentUid, targetUid) {
    if (!currentUid || !targetUid) {
      return {
        state: 'stranger',
        isSelf: false,
        isFollowing: false,
        followsYou: false,
        isMutual: false,
        isRequested: false
      };
    }

    if (currentUid === targetUid) {
      return {
        state: 'self',
        isSelf: true,
        isFollowing: false,
        followsYou: false,
        isMutual: false,
        isRequested: false
      };
    }

    const currentUser = storageService.getUser(currentUid);
    const targetUser = storageService.getUser(targetUid);

    if (!targetUser) {
      return {
        state: 'stranger',
        isSelf: false,
        isFollowing: false,
        followsYou: false,
        isMutual: false,
        isRequested: false
      };
    }

    const myFollowing = storageService._resolveEngagementArray(currentUser?.following);
    const targetFollowing = storageService._resolveEngagementArray(targetUser?.following);

    const isFollowing = myFollowing.includes(targetUid);
    const followsYou = targetFollowing.includes(currentUid);
    const isMutual = isFollowing && followsYou;
    const isRequested = !isFollowing && storageService.hasPendingFollowRequest(targetUid, currentUid);

    let state = 'stranger';
    if (isMutual) {
      state = 'mutual';
    } else if (isFollowing) {
      state = 'following';
    } else if (isRequested) {
      state = 'requested';
    } else if (followsYou) {
      state = 'follows_you';
    }

    return {
      state,
      isSelf: false,
      isFollowing,
      followsYou,
      isMutual,
      isRequested
    };
  },

  /**
   * Get list of mutual connections (Users followed by currentUser who also follow targetUser)
   * @param {string} currentUid
   * @param {string} targetUid
   * @returns {Array<Object>} List of mutual user objects
   */
  getMutualFollowers(currentUid, targetUid) {
    if (!currentUid || !targetUid || currentUid === targetUid) return [];

    const currentUser = storageService.getUser(currentUid);
    const targetUser = storageService.getUser(targetUid);
    if (!currentUser || !targetUser) return [];

    const myFollowing = storageService._resolveEngagementArray(currentUser.following);
    const targetFollowers = storageService._resolveEngagementArray(targetUser.followers);

    // Mutuals = people YOU follow who also follow THIS person
    const mutualUids = myFollowing.filter((uid) => targetFollowers.includes(uid) && uid !== currentUid);
    if (mutualUids.length === 0) return [];

    const allUsers = storageService.getUsers();
    return allUsers.filter((u) => mutualUids.includes(u.uid));
  },

  /**
   * Human-readable social proof summary formatted like Threads
   * e.g. "يتابعه @sara و @ali و 4 آخرون تتابعهم"
   * @param {string} currentUid
   * @param {string} targetUid
   * @param {string} lang ('ar' | 'en')
   * @returns {Object|null} { count, sampleUsers, text }
   */
  getMutualSummary(currentUid, targetUid, lang = 'ar') {
    const mutuals = this.getMutualFollowers(currentUid, targetUid);
    if (!mutuals || mutuals.length === 0) return null;

    const count = mutuals.length;
    const sampleUsers = mutuals.slice(0, 2);

    let text = '';
    if (lang === 'ar') {
      if (count === 1) {
        text = `يتابعه @${sampleUsers[0]?.username || sampleUsers[0]?.displayName}`;
      } else if (count === 2) {
        text = `يتابعه @${sampleUsers[0]?.username} و @${sampleUsers[1]?.username}`;
      } else {
        const remaining = count - 2;
        text = `يتابعه @${sampleUsers[0]?.username} و @${sampleUsers[1]?.username} و ${remaining} آخرون تتابعهم`;
      }
    } else {
      if (count === 1) {
        text = `Followed by @${sampleUsers[0]?.username || sampleUsers[0]?.displayName}`;
      } else if (count === 2) {
        text = `Followed by @${sampleUsers[0]?.username} and @${sampleUsers[1]?.username}`;
      } else {
        const remaining = count - 2;
        text = `Followed by @${sampleUsers[0]?.username}, @${sampleUsers[1]?.username} and ${remaining} others you follow`;
      }
    }

    return {
      count,
      sampleUsers,
      text
    };
  },

  /**
   * Silent Remove Follower (PULSE Native Style):
   * Removes followerUid from currentUid's followers without blocking or notifying.
   * @param {string} followerUid - The follower to remove
   * @param {string} currentUid - The account owner
   * @returns {boolean} Success status
   */
  removeFollower(followerUid, currentUid) {
    if (!followerUid || !currentUid || followerUid === currentUid) return false;

    try {
      const users = storageService.getUsers();
      const me = users.find((u) => u.uid === currentUid);
      const follower = users.find((u) => u.uid === followerUid);

      if (!me) return false;

      // 1. Remove follower from my followers
      me.followers = storageService._resolveEngagementArray(me.followers).filter((id) => id !== followerUid);
      me.followersCount = me.followers.length;
      storageService.saveUser(me);

      // 2. Remove me from follower's following
      if (follower) {
        follower.following = storageService._resolveEngagementArray(follower.following).filter((id) => id !== currentUid);
        follower.followingCount = follower.following.length;
        storageService.saveUser(follower);
      }

      // 3. Realtime database sync
      try {
        set(ref(database, `users/${currentUid}/followers`), me.followers).catch(console.warn);
        if (follower) {
          set(ref(database, `users/${followerUid}/following`), follower.following).catch(console.warn);
        }
      } catch (e) {
        console.warn('Realtime removeFollower sync error:', e);
      }

      return true;
    } catch (err) {
      console.error('removeFollower failed:', err);
      return false;
    }
  }
};
