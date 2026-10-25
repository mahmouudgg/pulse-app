/**
 * Algorithmic Recommendation Notification Engine
 * Inspired by PULSE Official Behavioral Graph (Threads & X)
 * Dispatches personalized follow suggestions & high-gravity post recommendations
 * based on true intellectual affinity and engagement history without spam.
 */

import { storageService, OFFICIAL_SOVYTHOS } from './storageService';
import { affinityEngine } from './affinityEngine';
import { rankingEngine } from './rankingEngine';
import { notificationService } from './notificationService';
import { moderationService } from './moderationService';

const LAST_RECOMMENDATION_CHECK_KEY = 'pulse_last_rec_eval_time';
const SUGGESTED_CREATORS_HISTORY_KEY = 'pulse_suggested_creators_history';
const SUGGESTED_POSTS_HISTORY_KEY = 'pulse_suggested_posts_history';

// 8 hours cooldown between automated recommendations to prevent spam
const RECOMMENDATION_COOLDOWN_MS = 8 * 60 * 60 * 1000;

export const recommendationNotificationEngine = {
  getSuggestedHistory(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },

  recordSuggestedHistory(key, id) {
    try {
      const history = this.getSuggestedHistory(key);
      if (!history.includes(id)) {
        history.unshift(id);
        // Keep last 30
        localStorage.setItem(key, JSON.stringify(history.slice(0, 30)));
      }
    } catch (e) {
      console.warn('History save notice:', e);
    }
  },

  /**
   * Evaluates and dispatches personalized suggestions
   * Called on app startup or feed engagement
   */
  evaluateRecommendations(currentUser) {
    if (!currentUser || !currentUser.uid) return null;

    // Check frequency cooldown
    const lastCheck = parseInt(localStorage.getItem(LAST_RECOMMENDATION_CHECK_KEY) || '0', 10);
    const now = Date.now();
    if (now - lastCheck < RECOMMENDATION_COOLDOWN_MS) {
      return null; // Silent cooldown
    }

    try {
      localStorage.setItem(LAST_RECOMMENDATION_CHECK_KEY, String(now));
      const users = storageService.getUsers();
      const posts = storageService.getPosts();

      // Alternate between follow suggestion and post suggestion
      const rand = Math.random();
      if (rand > 0.45) {
        return this.generateFollowSuggestion(currentUser, users, posts);
      } else {
        return this.generatePostSuggestion(currentUser, posts);
      }
    } catch (err) {
      console.warn('Recommendation evaluation notice:', err);
      return null;
    }
  },

  /**
   * Generates a high-affinity follow recommendation
   */
  generateFollowSuggestion(currentUser, users = [], posts = []) {
    const followingSet = new Set(storageService._resolveEngagementArray(currentUser.following));
    followingSet.add(currentUser.uid);

    const pastSuggested = new Set(this.getSuggestedHistory(SUGGESTED_CREATORS_HISTORY_KEY));

    // Priority 1: If user hasn't followed Sovythos yet, suggest Sovythos!
    if (!followingSet.has(OFFICIAL_SOVYTHOS.uid) && !pastSuggested.has(OFFICIAL_SOVYTHOS.uid)) {
      this.recordSuggestedHistory(SUGGESTED_CREATORS_HISTORY_KEY, OFFICIAL_SOVYTHOS.uid);
      return notificationService.addNotification({
        targetUserId: currentUser.uid,
        type: 'follow_suggestion',
        actor: OFFICIAL_SOVYTHOS,
        text: 'اقترحنا لك متابعة Sovythos · صاحبك ورفيقك على منصة PULSE',
        preview: OFFICIAL_SOVYTHOS.bio || 'اسأله في أي وقت وهزر معاه بنقرة زر',
        link: null
      });
    }

    // Priority 2: Algorithmic match from rankingEngine
    const recommended = rankingEngine.recommendCreators(currentUser, users, posts);
    const candidate = recommended.find(
      (c) => !followingSet.has(c.uid) && !pastSuggested.has(c.uid)
    );

    if (candidate) {
      this.recordSuggestedHistory(SUGGESTED_CREATORS_HISTORY_KEY, candidate.uid);
      const reasonText = candidate.recommendationReason || 'صانع محتوى فكري متميز في المنصة';

      return notificationService.addNotification({
        targetUserId: currentUser.uid,
        type: 'follow_suggestion',
        actor: {
          uid: candidate.uid,
          displayName: candidate.displayName,
          username: candidate.username,
          avatar: candidate.avatar,
          isVerified: candidate.isVerified,
          isFounder: candidate.isFounder,
          isAI: candidate.isAI
        },
        text: `حساب قد يهمك: ${reasonText}`,
        preview: candidate.bio || `اطلع على أحدث نبضات @${candidate.username}`,
        link: null
      });
    }

    return null;
  },

  /**
   * Generates a high-gravity post suggestion aligned with user interests
   */
  generatePostSuggestion(currentUser, posts = []) {
    if (!posts || posts.length === 0) return null;

    const userLikes = new Set(storageService._resolveEngagementArray(currentUser.likes));
    const userBookmarks = new Set(storageService._resolveEngagementArray(currentUser.bookmarks));
    const pastSuggestedPosts = new Set(this.getSuggestedHistory(SUGGESTED_POSTS_HISTORY_KEY));

    // Get user top topics
    const userInterests = affinityEngine.getUserTopInterests(currentUser.uid, 3);
    const topTopicSet = new Set(userInterests.map((i) => i.topic.toLowerCase()));

    // Filter candidate posts from last 72 hours not by current user and not engaged yet
    const now = Date.now();
    const candidatePosts = posts.filter((p) => {
      if (!p || p.authorId === currentUser.uid || p.author?.uid === currentUser.uid) return false;
      const authorId = p.authorId || p.author?.uid;
      if (authorId && (moderationService.isUserBlocked(currentUser.uid, authorId) || moderationService.isUserBlocked(authorId, currentUser.uid))) {
        return false;
      }
      const isPrivate = p.author?.isPrivate || p.author?.privacySettings?.isPrivateAccount || p.author?.isPrivateAccount;
      if (isPrivate) {
        const userFollowing = storageService._resolveEngagementArray(currentUser.following);
        if (!userFollowing.includes(authorId)) return false;
      }
      if (userLikes.has(p.id) || userBookmarks.has(p.id) || pastSuggestedPosts.has(p.id)) return false;
      const pTime = new Date(p.createdAt || 0).getTime();
      return now - pTime < 72 * 60 * 60 * 1000;
    });

    if (candidatePosts.length === 0) return null;

    // Score candidates with rankingEngine
    const scoredCandidates = candidatePosts.map((p) => {
      const { score, matchedTopic } = rankingEngine.calculatePostScore(p, currentUser.uid);
      let boost = 1.0;
      if (matchedTopic && topTopicSet.has(matchedTopic.toLowerCase())) {
        boost += 1.5;
      }
      if (p.hasVoice) boost += 0.8;
      return { post: p, finalScore: score * boost, matchedTopic };
    });

    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);
    const topCandidate = scoredCandidates[0];

    if (topCandidate && topCandidate.post) {
      const p = topCandidate.post;
      this.recordSuggestedHistory(SUGGESTED_POSTS_HISTORY_KEY, p.id);

      const topicMention = topCandidate.matchedTopic ? ` في #${topCandidate.matchedTopic}` : '';
      const text = p.hasVoice
        ? `نبضة صوتية مقترحة لك تستحق الاستماع${topicMention}`
        : `نبضة فكرية متصدرة تناسب اهتماماتك${topicMention}`;

      return notificationService.addNotification({
        targetUserId: currentUser.uid,
        type: 'post_suggestion',
        actor: p.author || { uid: p.authorId, displayName: 'مفكر في PULSE' },
        text,
        preview: p.content ? (p.content.substring(0, 80) + '...') : '',
        postId: p.id,
        audioUrl: p.audioUrl || null,
        hasVoice: Boolean(p.hasVoice)
      });
    }

    return null;
  }
};
