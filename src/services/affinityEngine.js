/**
 * PULSE Behavioral Affinity & Recommendation Engine
 * Tracks user interaction telemetry, audio listening durations, and semantic topic weights.
 */

const AFFINITY_KEY_PREFIX = 'pulse_affinity_';

// Core semantic category ontology for intellectual topic detection
const TOPIC_ONTOLOGY = {
  'فلسفة': ['فلسف', 'فكر', 'وجود', 'منطق', 'معرف', 'حكم', 'تأمل', 'رواقي', 'نيتشه', 'ارسطو', 'سقراط', 'philosophy', 'ethics', 'wisdom'],
  'تكنولوجيا': ['تكنو', 'تقني', 'برمج', 'كود', 'مطور', 'سوفتوير', 'حاسوب', 'تقنية', 'tech', 'software', 'coding', 'developer', 'hardware'],
  'ذكاء_اصطناعي': ['ذكاء اصطناعي', 'ذكاء_اصطناعي', 'ai', 'نموذج لغوي', 'تعلم الاله', 'خوارزم', 'روبوت', 'llm', 'machine learning', 'gpt', 'deep learning'],
  'ريادة_أعمال': ['رياد', 'استثمار', 'ستارت اب', 'مشروع', 'راس مال', 'بيزنس', 'مؤسس', 'شرك', 'startup', 'founder', 'business', 'venture', 'growth'],
  'علم_نفس': ['علم نفس', 'نفسي', 'سلوك', 'وعي', 'عقل', 'تفكير', 'مشاعر', 'شخصي', 'psychology', 'mindset', 'behavior', 'cognition'],
  'أدب_وقراءة': ['كتاب', 'كتب', 'قراء', 'ادب', 'شعر', 'قصيد', 'رواي', 'نصوص', 'books', 'literature', 'poetry', 'reading'],
  'اقتصاد_ومال': ['اقتصاد', 'مال', 'اسواق', 'عمل', 'تضخم', 'اسهم', 'ثرو', 'economy', 'finance', 'markets', 'wealth', 'crypto'],
  'تصميم_وإبداع': ['تصميم', 'واجه', 'ابداع', 'فن', 'جمال', 'ux', 'ui', 'design', 'minimalism', 'creative', 'art']
};

export const affinityEngine = {
  // Extract explicit hashtags and implicit semantic topics from text
  extractTopics(text = '') {
    if (!text) return [];
    const topics = new Set();
    const clean = text.toLowerCase();

    // 1. Explicit hashtags (#topic)
    const hashtagMatches = clean.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];
    hashtagMatches.forEach((tag) => {
      topics.add(tag.replace('#', '').trim());
    });

    // 2. Semantic matching against ontology
    Object.entries(TOPIC_ONTOLOGY).forEach(([category, keywords]) => {
      for (const kw of keywords) {
        if (clean.includes(kw)) {
          topics.add(category);
          break;
        }
      }
    });

    return Array.from(topics);
  },

  // Get user profile telemetry
  getUserProfile(userId) {
    if (!userId) return null;
    try {
      const data = localStorage.getItem(`${AFFINITY_KEY_PREFIX}${userId}`);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }

    return {
      userId,
      topicWeights: {},
      authorWeights: {},
      audioListensCount: 0,
      textReadsCount: 0,
      lastActive: Date.now()
    };
  },

  // Save profile telemetry
  saveUserProfile(profile) {
    if (!profile?.userId) return;
    try {
      profile.lastActive = Date.now();
      localStorage.setItem(`${AFFINITY_KEY_PREFIX}${profile.userId}`, JSON.stringify(profile));
    } catch (err) {
      console.warn('Could not save affinity profile:', err);
    }
  },

  // Telemetry: Track audio listening (The strongest intellectual engagement signal in PULSE)
  trackAudioListen(userId, post, completionRatio = 1.0) {
    if (!userId || !post) return;
    const profile = this.getUserProfile(userId);

    // Audio completion multiplier: Full listen (1.0) gives full weight (e.g. 5.0 points)
    const weight = Math.max(1, Math.min(5, Math.round(completionRatio * 5)));
    profile.audioListensCount = (profile.audioListensCount || 0) + 1;

    // Track topics
    const topics = this.extractTopics(post.content);
    topics.forEach((t) => {
      profile.topicWeights[t] = (profile.topicWeights[t] || 0) + weight;
    });

    // Track author affinity
    if (post.authorId && post.authorId !== userId) {
      profile.authorWeights[post.authorId] = (profile.authorWeights[post.authorId] || 0) + (weight * 1.5);
    }

    this.saveUserProfile(profile);
  },

  // Telemetry: Track interaction (like, repost, bookmark, reply)
  trackEngagement(userId, post, type) {
    if (!userId || !post) return;
    const profile = this.getUserProfile(userId);

    const weightsByType = {
      bookmark: 4.5,
      repost: 4.0,
      reply: 3.5,
      like: 2.0
    };
    const weight = weightsByType[type] || 1.5;

    const topics = this.extractTopics(post.content);
    topics.forEach((t) => {
      profile.topicWeights[t] = (profile.topicWeights[t] || 0) + weight;
    });

    if (post.authorId && post.authorId !== userId) {
      profile.authorWeights[post.authorId] = (profile.authorWeights[post.authorId] || 0) + weight;
    }

    this.saveUserProfile(profile);
  },

  // Explicit User Interest Feedback ("مهتم" / "غير مهتم" like Threads)
  trackExplicitInterest(userId, post, isInterested) {
    if (!userId || !post) return;
    const profile = this.getUserProfile(userId);
    if (!profile.suppressedPostIds) profile.suppressedPostIds = [];
    if (!profile.interestedPostIds) profile.interestedPostIds = [];

    const sPostId = String(post.id);
    const topics = this.extractTopics(post.content);

    if (isInterested) {
      if (!profile.interestedPostIds.includes(sPostId)) {
        profile.interestedPostIds.push(sPostId);
      }
      profile.suppressedPostIds = profile.suppressedPostIds.filter((id) => id !== sPostId);

      // Heavy algorithmic boost
      topics.forEach((t) => {
        profile.topicWeights[t] = Math.min(100, (profile.topicWeights[t] || 0) + 8.0);
      });
      if (post.authorId && post.authorId !== userId) {
        profile.authorWeights[post.authorId] = Math.min(100, (profile.authorWeights[post.authorId] || 0) + 6.0);
      }
    } else {
      if (!profile.suppressedPostIds.includes(sPostId)) {
        profile.suppressedPostIds.push(sPostId);
      }
      profile.interestedPostIds = profile.interestedPostIds.filter((id) => id !== sPostId);

      // Algorithmic demotion & negative weights
      topics.forEach((t) => {
        profile.topicWeights[t] = Math.max(-20, (profile.topicWeights[t] || 0) - 10.0);
      });
      if (post.authorId && post.authorId !== userId) {
        profile.authorWeights[post.authorId] = Math.max(-25, (profile.authorWeights[post.authorId] || 0) - 12.0);
      }
    }

    this.saveUserProfile(profile);
  },

  // Check if a specific post was explicitly marked "Not Interested" (hidden)
  isPostSuppressed(userId, post) {
    if (!userId || !post) return false;
    const profile = this.getUserProfile(userId);
    return Boolean(profile?.suppressedPostIds?.includes(String(post.id)));
  },

  // Undo explicit interest action (when user clicks "تراجع")
  undoExplicitInterest(userId, post) {
    if (!userId || !post) return;
    const profile = this.getUserProfile(userId);
    const sPostId = String(post.id);

    if (profile?.suppressedPostIds?.includes(sPostId)) {
      profile.suppressedPostIds = profile.suppressedPostIds.filter((id) => id !== sPostId);
      const topics = this.extractTopics(post.content);
      topics.forEach((t) => {
        profile.topicWeights[t] = (profile.topicWeights[t] || 0) + 10.0;
      });
      if (post.authorId && post.authorId !== userId) {
        profile.authorWeights[post.authorId] = (profile.authorWeights[post.authorId] || 0) + 12.0;
      }
      this.saveUserProfile(profile);
    }
  },

  // Calculate personalized affinity multiplier for a given post
  calculateAffinity(userId, post) {
    if (!userId || !post) return { multiplier: 1.0, matchedTopic: null };
    const profile = this.getUserProfile(userId);
    if (!profile) return { multiplier: 1.0, matchedTopic: null };

    // If explicitly suppressed via "Not Interested", rank score is 0
    if (this.isPostSuppressed(userId, post)) {
      return { multiplier: 0, suppressed: true, matchedTopic: null };
    }

    let topicScore = 0;
    let topMatchedTopic = null;
    let highestWeight = 0;

    const postTopics = this.extractTopics(post.content);
    postTopics.forEach((t) => {
      const w = profile.topicWeights[t] || 0;
      if (w > 0) {
        topicScore += Math.log10(w + 1);
        if (w > highestWeight) {
          highestWeight = w;
          topMatchedTopic = t;
        }
      } else if (w < 0) {
        topicScore -= Math.log10(Math.abs(w) + 1);
      }
    });

    // Author Affinity
    let authorScore = 0;
    if (post.authorId && profile.authorWeights[post.authorId]) {
      const aw = profile.authorWeights[post.authorId];
      if (aw > 0) {
        authorScore = Math.log10(aw + 1);
      } else if (aw < 0) {
        authorScore = -Math.log10(Math.abs(aw) + 1);
      }
    }

    // Audio preference bonus: If user listens to lots of audio and post has audio
    let audioBonus = 0;
    if (post.hasVoice && profile.audioListensCount > 3) {
      audioBonus = 0.25;
    }

    // Combine into multiplier [0.1 min - 3.5x max]
    const rawBoost = 1.0 + (topicScore * 0.45) + (authorScore * 0.5) + audioBonus;
    const multiplier = Math.min(3.5, Math.max(0.1, rawBoost));

    return {
      multiplier,
      matchedTopic: highestWeight >= 3 ? topMatchedTopic : null
    };
  },

  // Get user top interests for UI pills and discovery
  getUserTopInterests(userId, limit = 5) {
    if (!userId) return [];
    const profile = this.getUserProfile(userId);
    if (!profile || !profile.topicWeights) return [];

    return Object.entries(profile.topicWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic, weight]) => ({
        topic,
        weight: Math.round(weight)
      }));
  }
};
