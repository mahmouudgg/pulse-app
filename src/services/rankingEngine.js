/**
 * PULSE Official Next-Gen EdgeRank & Discovery Engine for PULSE
 * Features:
 * - Real-time personalized behavioral gravity ranking (Voice-weighted)
 * - Trending velocity formula (dV/dt with time-decay acceleration)
 * - Collaborative Creator Discovery Graph based on shared intellectual interests
 */

import { affinityEngine } from './affinityEngine';
import { moderationService } from './moderationService';
import { calculateDistance } from './locationService';
import { socialGraphService } from './socialGraphService';

export const rankingEngine = {
  // Calculate personalized EdgeRank gravity score for a single post
  calculatePostScore(post, currentUserId = null, userLocation = null) {
    if (!post) return { score: 0, matchedTopic: null, affinityMultiplier: 1.0 };

    const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
    const voiceListens = post.voiceListens || (post.hasVoice ? 4 : 0);
    const repostsCount = Array.isArray(post.reposts) ? post.reposts.length : 0;
    const repliesCount = post.repliesCount || 0;
    const bookmarksCount = post.bookmarksCount || 0;

    // 1. Multi-Action Intellectual Engagement Signals
    // Heavy attention investment (Listening, Bookmarking, Dialogue) weighted above passive taps
    const engagementScore =
      (voiceListens * 6.5) +   // Highest value signal (human ear time)
      (bookmarksCount * 5.2) + // Explicit intent to preserve & re-read
      (repostsCount * 4.2) +   // Community amplification
      (repliesCount * 3.8) +   // Dialectical conversation
      (likesCount * 1.5) +     // Simple nod of agreement
      (post.videoUrl ? 3.5 : 0) + // Rich media bonus
      (post.imageUrl ? 2.0 : 0) +
      (post.poll ? 2.5 : 0);   // Interactive poll bonus

    // 2. Dynamic Continuous Half-Life Decay with Saturation Velocity Cap
    // Audio thoughts have longer intellectual shelf-life (decay gamma = 1.12 vs 1.38 for quick text)
    const postTime = new Date(post.createdAt || Date.now()).getTime();
    const ageInHours = Math.max(0, (Date.now() - postTime) / (1000 * 60 * 60));
    const decayGamma = post.hasVoice ? 1.12 : 1.38;
    const gravityDenominator = Math.pow(ageInHours + 1.6, decayGamma);

    // Older posts (>96 hours / 4 days) receive an asymptotic freshness cap so new voices shine
    const agePenalty = ageInHours > 96 ? Math.min(0.35, 96 / ageInHours) : 1.0;

    // 3. Freshness / Cold-Start Discovery Booster (first 45 minutes)
    let coldStartBoost = 1.0;
    if (ageInHours < 0.75) {
      coldStartBoost = 1.45; // Immediate community visibility for brand-new thoughts
    } else if (ageInHours < 2.0) {
      coldStartBoost = 1.20;
    }

    // 4. Creator Authority & Platform Pillar Factor
    const authorBoost = post.author?.isFounder
      ? 1.40
      : post.author?.isVerified
        ? 1.20
        : post.author?.isPioneer
          ? 1.08
          : 1.0;

    // 5. Personalized Behavioral Affinity Multiplier
    let affinityMultiplier = 1.0;
    let matchedTopic = null;

    if (currentUserId) {
      const affinity = affinityEngine.calculateAffinity(currentUserId, post);
      affinityMultiplier = affinity.multiplier;
      matchedTopic = affinity.matchedTopic;
    }

    // 6. Anti-Echo-Chamber / Serendipity Discovery Injection (12% exploratory slot)
    const seed = (post.id ? post.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 1);
    const serendipityBoost = (seed % 100 < 14 && ageInHours < 16) ? 1.30 : 1.0;

    // 7. Location Proximity Multiplier (PULSE Official Hyper-Local Relevance)
    let locationBoost = 1.0;
    if (userLocation && post.location) {
      const pLat = post.location.lat;
      const pLng = post.location.lng;
      const uLat = userLocation.lat;
      const uLng = userLocation.lng;

      if (pLat && pLng && uLat && uLng) {
        const distKm = calculateDistance(uLat, uLng, pLat, pLng);
        if (distKm !== null) {
          if (distKm <= 20) {
            locationBoost = 1.45; // Same immediate neighborhood / district
          } else if (distKm <= 75) {
            locationBoost = 1.25; // Same metropolitan area
          } else if (distKm <= 250) {
            locationBoost = 1.10; // Regional proximity
          }
        }
      } else if (userLocation.city && post.location.city) {
        const uCity = String(userLocation.city).toLowerCase();
        const pCity = String(post.location.city).toLowerCase();
        if (uCity.includes(pCity) || pCity.includes(uCity)) {
          locationBoost = 1.30;
        }
      }
    }

    // 8. PULSE Core 1:1 Social Graph Affinity Multiplier
    let socialBoost = 1.0;
    let relationshipState = 'stranger';
    let mutualsCount = 0;

    const authorUid = post.authorId || post.author?.uid;
    if (currentUserId && authorUid && currentUserId !== authorUid) {
      const rel = socialGraphService.getRelationship(currentUserId, authorUid);
      relationshipState = rel.state;
      if (rel.isMutual) {
        socialBoost = 2.80; // Mutual connection: Highest priority in feed
      } else if (rel.isFollowing) {
        socialBoost = 1.80; // Followed creator
      } else if (rel.followsYou) {
        socialBoost = 1.35; // Followers you haven't followed back yet
      } else {
        const mutuals = socialGraphService.getMutualFollowers(currentUserId, authorUid);
        mutualsCount = mutuals.length;
        if (mutualsCount > 0) {
          socialBoost = Math.min(1.50, 1.15 + (mutualsCount * 0.08));
        }
      }
    }

    // Final Composite Gravity Formula with Freshness Preservation
    const baseGravity = (engagementScore + 1.2) / gravityDenominator;
    const finalScore = baseGravity * coldStartBoost * authorBoost * affinityMultiplier * serendipityBoost * agePenalty * locationBoost * socialBoost;

    return {
      score: finalScore,
      matchedTopic,
      affinityMultiplier,
      socialBoost,
      relationshipState,
      mutualsCount
    };
  },

  // Rank array of posts for the "For You" feed with Author Diversity Interleaving & Safety Shield
  rankPosts(posts, currentUser = null, userLocation = null) {
    if (!posts || posts.length === 0) return [];
    const currentUserId = currentUser?.uid || null;

    // Step 0: Filter out blocked or muted users and unapproved private accounts
    const userFollowing = Array.isArray(currentUser?.following)
      ? currentUser.following
      : (currentUser?.following ? Object.keys(currentUser.following) : []);

    const safePosts = moderationService.filterBlockedPosts(posts, currentUserId).filter((post) => {
      if (!post) return false;
      const authorId = post.authorId || post.author?.uid;
      const authorUsername = post.author?.username;
      if (!authorId && !authorUsername) return true;

      // Filter blocked relationships bidirectionally
      if (currentUserId && (
        moderationService.isUserBlocked(currentUserId, authorId) || 
        moderationService.isUserBlocked(authorId, currentUserId) ||
        (authorUsername && moderationService.isUserBlocked(currentUserId, authorUsername))
      )) {
        return false;
      }

      // Filter private accounts if not following and not own post
      const isPrivate = post.author?.isPrivate || post.author?.privacySettings?.isPrivateAccount || post.author?.isPrivateAccount;
      if (isPrivate && authorId !== currentUserId) {
        if (!userFollowing.includes(authorId)) {
          return false;
        }
      }
      return true;
    });

    if (!safePosts || safePosts.length === 0) return [];

    // Step 1: Score each post independently
    const scored = safePosts.map((post) => {
      const { score, matchedTopic, socialBoost, relationshipState, mutualsCount } = this.calculatePostScore(post, currentUserId, userLocation);
      return {
        ...post,
        _algorithmicScore: score,
        _affinityMatchTag: matchedTopic,
        _socialBoost: socialBoost,
        _relationshipState: relationshipState,
        _mutualsCount: mutualsCount
      };
    });

    // Step 2: Sort descending by algorithmic gravity
    const sorted = scored.sort((a, b) => b._algorithmicScore - a._algorithmicScore);

    // Step 3: PULSE Official Anti-Clustering Diversity Interleaver
    // Prevents any single author from monopolizing the user's feed consecutively
    const diverseFeed = [];
    const backlog = [];
    const authorCountInWindow = {};

    for (const post of sorted) {
      const authorId = post.authorId || post.author?.uid || post.author?.username || 'unknown';
      const recentAuthors = diverseFeed.slice(-2).map((p) => p.authorId || p.author?.uid || p.author?.username);

      // If the same author appeared in the immediately previous post, defer to backlog
      if (recentAuthors.includes(authorId) && sorted.length > 5) {
        backlog.push(post);
      } else {
        diverseFeed.push(post);
        // Interleave one deferred post if safe
        if (backlog.length > 0) {
          const nextSafeIdx = backlog.findIndex((bp) => {
            const bAuthor = bp.authorId || bp.author?.uid || bp.author?.username;
            return bAuthor !== authorId;
          });
          if (nextSafeIdx !== -1) {
            diverseFeed.push(backlog.splice(nextSafeIdx, 1)[0]);
          }
        }
      }
    }

    // Append any remaining deferred posts at the tail
    return [...diverseFeed, ...backlog];
  },

  // Calculate high-velocity trending hashtags & topics
  calculateTrends(posts) {
    if (!posts || !Array.isArray(posts)) return [];
    const now = Date.now();
    const tagStats = {};

    posts.forEach((post) => {
      if (!post || !post.content) return;
      const tags = post.content.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];
      const postTime = new Date(post.createdAt || now).getTime();
      const ageInHours = Math.max(0.1, (now - postTime) / (1000 * 60 * 60));

      const voiceBoost = post.hasVoice ? 2.5 : 1.0;
      const listens = post.voiceListens || 0;
      const replies = post.repliesCount || 0;

      tags.forEach((tag) => {
        const normalized = tag.trim();
        if (!tagStats[normalized]) {
          tagStats[normalized] = {
            count: 0,
            voiceCount: 0,
            totalListens: 0,
            totalReplies: 0,
            velocityNumerator: 0,
            latestTime: postTime
          };
        }

        tagStats[normalized].count += 1;
        if (post.hasVoice) tagStats[normalized].voiceCount += 1;
        tagStats[normalized].totalListens += listens;
        tagStats[normalized].totalReplies += replies;

        // Exponential decay velocity formula: dV/dt = (mentions * voiceBoost) / age^1.2
        const velocity = (1 * voiceBoost + (listens * 0.5)) / Math.pow(ageInHours + 1.2, 1.2);
        tagStats[normalized].velocityNumerator += velocity;
        if (postTime > tagStats[normalized].latestTime) {
          tagStats[normalized].latestTime = postTime;
        }
      });
    });

    const defaultTags = [
      { tag: '#سوفيثوس', count: 1 },
      { tag: '#تطوير_البرمجيات', count: 1 },
      { tag: '#نبض_مصر', count: 1 }
    ];

    defaultTags.forEach(dt => {
      if (!tagStats[dt.tag]) {
        tagStats[dt.tag] = {
          count: dt.count,
          voiceCount: 0,
          totalListens: 0,
          totalReplies: 0,
          velocityNumerator: dt.count * 0.9,
          latestTime: now - 3600000
        };
      }
    });

    const calculated = Object.entries(tagStats)
      .map(([tag, stats], idx) => {
        let badge = 'شائع في PULSE';
        let badgeIcon = 'trending';

        if (stats.velocityNumerator > 3.5) {
          badge = 'متسارع الآن';
          badgeIcon = 'bolt';
        } else if (stats.voiceCount >= 2 || stats.totalListens > 5) {
          badge = 'الأكثر استماعاً';
          badgeIcon = 'mic';
        } else if (stats.totalReplies >= 3) {
          badge = 'نقاش واسع';
          badgeIcon = 'fire';
        }

        return {
          id: idx + 1,
          tag,
          velocityScore: stats.velocityNumerator,
          badge,
          badgeIcon,
          count: `${stats.count} ${stats.count === 1 ? 'نبضة' : 'نبضات'}`,
          voiceCount: stats.voiceCount,
          totalListens: stats.totalListens
        };
      })
      .sort((a, b) => b.velocityScore - a.velocityScore);

    return calculated.slice(0, 10).map((item, idx) => ({
      ...item,
      category: idx === 0 ? 'الموضوع المتصدر الآن' : item.badge
    }));
  },

  // Collaborative Creator Discovery Graph
  // Signals: mutual connections, "follows you", shared interests, engagement,
  // recency & authority. Every suggestion carries a machine-readable reason so
  // the UI can localize it ("3 mutuals", "Follows you", ...).
  recommendCreators(currentUser, allUsers = [], allPosts = [], options = {}) {
    if (!currentUser || !Array.isArray(allUsers) || allUsers.length === 0) return [];

    const toIds = (raw) => {
      if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string' && v);
      if (raw && typeof raw === 'object') {
        const keys = Object.keys(raw);
        if (keys.length === 0) return [];
        if (keys.every((k) => /^\d+$/.test(k))) {
          return Object.values(raw).filter((v) => typeof v === 'string' && v);
        }
        return keys.filter((k) => raw[k]);
      }
      return [];
    };

    const limit = options.limit || 20;
    const excluded = new Set(options.excludeIds || []);
    excluded.add(currentUser.uid);

    const followingSet = new Set(toIds(currentUser.following));
    const userById = new Map();
    allUsers.forEach((u) => { if (u && u.uid) userById.set(u.uid, u); });

    // Index posts by author once (instead of filtering per user)
    const postsByAuthor = new Map();
    (allPosts || []).forEach((p) => {
      if (!p || p.isAd) return;
      const authorId = p.authorId || p.author?.uid;
      if (!authorId) return;
      if (!postsByAuthor.has(authorId)) postsByAuthor.set(authorId, []);
      postsByAuthor.get(authorId).push(p);
    });

    const userInterests = affinityEngine.getUserTopInterests(currentUser.uid, 4);
    const interestTags = new Set(userInterests.map((i) => i.topic.toLowerCase()));

    const now = Date.now();
    const dayKey = Math.floor(now / 86400000);
    const stableJitter = (uid) => {
      let h = dayKey;
      for (let i = 0; i < uid.length; i += 1) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
      return (h % 700) / 100; // 0 - 7 points, stable for the whole day
    };

    const candidates = [];

    allUsers.forEach((u) => {
      if (!u || !u.uid) return;
      if (excluded.has(u.uid) || followingSet.has(u.uid)) return;
      if (u.isBanned) return;
      if (!u.username && !u.displayName) return;

      const followerIds = toIds(u.followers);
      const theirFollowing = toIds(u.following);
      const followerCount = followerIds.length;

      // 1. Real mutual connections: people I follow who follow this account
      const mutualIds = followerIds.filter((id) => followingSet.has(id) && id !== currentUser.uid);
      const mutualUsers = mutualIds
        .map((id) => userById.get(id))
        .filter(Boolean)
        .slice(0, 3);
      const followsMe = theirFollowing.includes(currentUser.uid);

      // 2. Content signals from the latest posts only (bounded cost)
      const authorPosts = (postsByAuthor.get(u.uid) || [])
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10);

      let matchedInterests = 0;
      let matchedTopicName = '';
      let engagement = 0;
      let voicePosts = 0;
      authorPosts.forEach((post) => {
        affinityEngine.extractTopics(post.content).forEach((topic) => {
          if (interestTags.has(topic.toLowerCase())) {
            matchedInterests += 1;
            matchedTopicName = topic;
          }
        });
        const likes = Array.isArray(post.likes) ? post.likes.length : (post.likesCount || 0);
        const reposts = Array.isArray(post.reposts) ? post.reposts.length : (post.repostsCount || 0);
        engagement += likes + reposts * 2 + (post.repliesCount || 0);
        if (post.hasVoice) voicePosts += 1;
      });

      const lastPostAt = authorPosts.length ? new Date(authorPosts[0].createdAt || 0).getTime() : 0;
      const isActiveRecently = lastPostAt && now - lastPostAt < 14 * 86400000;

      // 3. Score
      let score = 0;
      score += Math.min(mutualIds.length, 6) * 14;
      if (followsMe) score += 22;
      score += Math.min(matchedInterests, 5) * 12;
      score += Math.log10(1 + engagement) * 8;
      score += Math.log10(1 + followerCount) * 6;
      score += voicePosts * 3;
      if (isActiveRecently) score += 10;
      if (u.isFounder || u.username === 'my') score += 40;
      else if (u.isVerified) score += 22;
      if (u.isPioneer || u.pioneerNumber) score += 12;
      if (u.avatar) score += 4;
      if (u.bio && u.bio.trim()) score += 3;
      score += stableJitter(u.uid);

      // 4. Reason (machine key + Arabic fallback text for legacy callers)
      let reasonKey = 'new';
      let reasonText = 'انضم إلى مجتمع PULSE';
      let reasonData = null;
      if (mutualIds.length > 0) {
        reasonKey = 'mutuals';
        reasonData = mutualIds.length;
        reasonText = `${mutualIds.length} متابع مشترك`;
      } else if (followsMe) {
        reasonKey = 'follows_you';
        reasonText = 'يتابعك';
      } else if (matchedInterests > 0) {
        reasonKey = 'interest';
        reasonData = matchedTopicName;
        reasonText = `يشاركك الاهتمام في #${matchedTopicName}`;
      } else if (u.isFounder || u.username === 'my') {
        reasonKey = 'founder';
        reasonText = 'مؤسس ومطور منصة PULSE';
      } else if (u.pioneerNumber) {
        reasonKey = 'pioneer';
        reasonData = u.pioneerNumber;
        reasonText = `رائد فكري رقم #${u.pioneerNumber}`;
      } else if (u.isVerified) {
        reasonKey = 'verified';
        reasonText = 'صوت فكري موثق';
      } else if (followerCount > 0) {
        reasonKey = 'followers';
        reasonData = followerCount;
        reasonText = `${followerCount} متابع`;
      }

      candidates.push({
        user: u,
        score,
        reasonKey,
        reasonData,
        reasonText,
        followerCount,
        mutualUsers,
        mutualCount: mutualIds.length,
        followsMe
      });
    });

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...item.user,
        followerCount: item.followerCount,
        recommendationReason: item.reasonText,
        reasonKey: item.reasonKey,
        reasonData: item.reasonData,
        mutualUsers: item.mutualUsers,
        mutualCount: item.mutualCount,
        followsMe: item.followsMe
      }));
  }
};
