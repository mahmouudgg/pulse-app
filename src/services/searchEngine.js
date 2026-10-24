/**
 * PULSE Official Next-Gen Search & Discovery Engine for PULSE
 * Features:
 * - Multi-token semantic & fuzzy string matching (Levenshtein + Trigram)
 * - Deep Arabic & English morphology normalization (Al- prefix stripping, diacritics, transliteration)
 * - Dynamic relevance scoring with creator authority & engagement velocity
 * - Multi-category indexing: Top, People, Voice Pulses, Media, Discussions, Hashtags
 * - Intelligent Query Autocomplete & Typeahead Suggestions
 * - Persistent Search History Cache
 */

import { affinityEngine } from './affinityEngine';
import { moderationService } from './moderationService';

// Common Arabic/English phonetics & transliteration map
const TRANSLITERATION_MAP = {
  'pulse': ['بولس', 'بلس', 'نبض', 'نبضة'],
  'mahmoud': ['محمود', 'حودة'],
  'yasser': ['ياسر'],
  'dev': ['مطور', 'برمجة', 'كود'],
  'tech': ['تقنية', 'تكنولوجيا', 'برمجة'],
  'voice': ['صوت', 'صوتية', 'نبضة صوتية', 'بودكاست'],
  'podcast': ['بودكاست', 'صوتية', 'حوار'],
  'ai': ['ذكاء', 'اصطناعي', 'ذكاء اصطناعي'],
  'egypt': ['مصر', 'القاهرة', 'الاسكندرية'],
  'saudi': ['السعودية', 'الرياض', 'ksa'],
  'dubai': ['دبي', 'الامارات', 'uae']
};

export const searchEngine = {
  // Enhanced Normalization
  normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Remove Arabic harakat & tatweel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي')
      .replace(/[كک]/g, 'ك')
      .replace(/(.)\1{2,}/g, '$1') // Collapse repeated elongated letters (e.g. رووووعه -> روعه)
      .replace(/[\.\-_#@\/\\!?,،;:()\[\]{}"']/g, ' ')
      .trim();
  },

  // Strip common Arabic prefixes (الـ، بالـ، فالـ، كالـ، للـ، و)
  stripArabicPrefixes(token) {
    if (!token || token.length <= 3) return token;
    if (token.startsWith('ال')) return token.slice(2);
    if (token.startsWith('بال')) return token.slice(3);
    if (token.startsWith('فال')) return token.slice(3);
    if (token.startsWith('كال')) return token.slice(3);
    if (token.startsWith('لل')) return token.slice(2);
    if (token.startsWith('و') && token.length > 3) return token.slice(1);
    return token;
  },

  // Fast Levenshtein distance for fuzzy typo matching (max tolerance: 2)
  levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    if (Math.abs(a.length - b.length) > 2) return 99;

    const row = [];
    for (let i = 0; i <= b.length; i++) row[i] = i;

    for (let i = 1; i <= a.length; i++) {
      let prev = i;
      for (let j = 1; j <= b.length; j++) {
        let val;
        if (a[i - 1] === b[j - 1]) {
          val = row[j - 1];
        } else {
          val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
        }
        row[j - 1] = prev;
        prev = val;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  },

  // Check if token matches target with exact, prefix, or fuzzy tolerance
  matchToken(token, target) {
    if (!token || !target) return 0;
    const cleanToken = this.stripArabicPrefixes(token);
    const cleanTarget = this.stripArabicPrefixes(target);

    // Exact equality
    if (token === target || cleanToken === cleanTarget) return 100;
    // Prefix match
    if (target.startsWith(token) || cleanTarget.startsWith(cleanToken)) return 75;
    // Substring match
    if (target.includes(token) || cleanTarget.includes(cleanToken)) return 50;

    // Fuzzy typo match for longer tokens
    if (cleanToken.length >= 4 && cleanTarget.length >= 4) {
      const dist = this.levenshtein(cleanToken, cleanTarget);
      if (dist === 1) return 40;
      if (dist === 2 && cleanToken.length >= 6) return 25;
    }

    return 0;
  },

  // Main Multi-Faceted Search Method
  search({ query, users = [], posts = [], category = 'all', currentUser = null }) {
    if (!query || !query.trim()) {
      return { users: [], posts: [], hashtags: [], topMedia: [] };
    }

    const cleanQuery = this.normalizeText(query);
    const rawQueryLower = query.toLowerCase().trim();
    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

    // Expand search query with semantic synonyms / transliterations
    const expandedTokens = new Set(queryTokens);
    queryTokens.forEach((token) => {
      expandedTokens.add(this.stripArabicPrefixes(token));
      // Check transliteration mappings
      for (const [key, synonyms] of Object.entries(TRANSLITERATION_MAP)) {
        if (key.includes(token) || token.includes(key)) {
          synonyms.forEach((s) => expandedTokens.add(this.normalizeText(s)));
        }
        synonyms.forEach((s) => {
          const normS = this.normalizeText(s);
          if (normS.includes(token) || token.includes(normS)) {
            expandedTokens.add(this.normalizeText(key));
          }
        });
      }
    });

    const activeTokens = Array.from(expandedTokens);

    const userFollowing = Array.isArray(currentUser?.following)
      ? currentUser.following
      : (currentUser?.following ? Object.keys(currentUser.following) : []);

    // 1. MATCH USERS
    const safeUsers = users.filter((u) => {
      if (!u) return false;
      const uid = u.uid || u.id;
      if (currentUser?.uid && (moderationService.isUserBlocked(currentUser.uid, uid) || moderationService.isUserBlocked(uid, currentUser.uid))) {
        return false;
      }
      return true;
    });

    const scoredUsers = safeUsers
      .map((user) => {
        const normUsername = this.normalizeText(user.username || '');
        const normName = this.normalizeText(user.displayName || '');
        const normBio = this.normalizeText(user.bio || '');

        let score = 0;

        // Exact full query match
        if (normUsername === cleanQuery) score += 180;
        else if (normUsername.startsWith(cleanQuery)) score += 110;
        else if (normUsername.includes(cleanQuery)) score += 65;

        if (normName === cleanQuery) score += 95;
        else if (normName.startsWith(cleanQuery)) score += 60;
        else if (normName.includes(cleanQuery)) score += 40;

        if (normBio.includes(cleanQuery)) score += 25;

        // Token-level scoring
        activeTokens.forEach((tok) => {
          const userTokScore = Math.max(
            this.matchToken(tok, normUsername) * 1.2,
            this.matchToken(tok, normName),
            this.matchToken(tok, normBio) * 0.4
          );
          score += userTokScore;
        });

        // Authority & Creator Boosts
        if (user.isFounder || user.username === 'my') score += 50;
        if (user.isVerified) score += 30;
        if (user.isPioneer) score += 15;
        const followers = Array.isArray(user.followers) ? user.followers.length : (user.followersCount || 0);
        score += Math.min(25, Math.log10(followers + 1) * 10);

        return { ...user, matchScore: Math.round(score) };
      })
      .filter((u) => u.matchScore > 10)
      .sort((a, b) => b.matchScore - a.matchScore);

    // 2. MATCH POSTS
    const safePosts = moderationService.filterBlockedPosts(posts, currentUser?.uid).filter((post) => {
      if (!post) return false;
      const authorId = post.authorId || post.author?.uid;
      const authorUsername = post.author?.username;
      if (!authorId && !authorUsername) return true;
      if (currentUser?.uid && (
        moderationService.isUserBlocked(currentUser.uid, authorId) || 
        moderationService.isUserBlocked(authorId, currentUser.uid) ||
        (authorUsername && moderationService.isUserBlocked(currentUser.uid, authorUsername))
      )) {
        return false;
      }
      const authorUser = users.find((u) => u.uid === authorId || (authorUsername && u.username?.toLowerCase() === authorUsername.toLowerCase()));
      const isPrivate = authorUser?.isPrivate || post.author?.isPrivate || post.author?.privacySettings?.isPrivateAccount || false;
      if (isPrivate && authorId !== currentUser?.uid) {
        if (!userFollowing.includes(authorId)) {
          return false;
        }
      }
      return true;
    });
    const now = Date.now();
    const scoredPosts = safePosts
      .map((post) => {
        const normContent = this.normalizeText(post.content || '');
        const normAuthorName = this.normalizeText(post.author?.displayName || '');
        const normAuthorUser = this.normalizeText(post.author?.username || '');
        const normLocation = post.location 
          ? this.normalizeText(typeof post.location === 'object' ? `${post.location.name} ${post.location.city || ''}` : post.location)
          : '';
        const topics = affinityEngine.extractTopics(post.content || '');

        let score = 0;

        // Exact phrase match in content
        if (normContent.includes(cleanQuery)) score += 80;

        // Location match (Major boost for location searches)
        if (normLocation) {
          if (normLocation.includes(cleanQuery)) score += 85;
          activeTokens.forEach((tok) => {
            if (normLocation.includes(tok)) score += 40;
          });
        }

        // Topic matches
        topics.forEach((t) => {
          const normTopic = this.normalizeText(t);
          if (normTopic === cleanQuery) score += 70;
          else if (normTopic.includes(cleanQuery)) score += 45;
        });

        // Author name/handle hits
        if (normAuthorUser.includes(cleanQuery) || normAuthorName.includes(cleanQuery)) {
          score += 40;
        }

        // Token-level matches
        activeTokens.forEach((tok) => {
          if (normContent.includes(tok)) score += 20;
          topics.forEach((t) => {
            if (this.normalizeText(t).includes(tok)) score += 25;
          });
        });

        // Rich Media & Engagement Boosts
        if (post.hasVoice) score += 20;
        const listens = post.voiceListens || 0;
        score += Math.min(30, listens * 2);

        const likes = Array.isArray(post.likes) ? post.likes.length : 0;
        const replies = post.repliesCount || 0;
        score += Math.min(25, likes * 0.8 + replies * 2.5);

        if (post.author?.isFounder) score += 20;
        if (post.author?.isVerified) score += 12;

        // Recency Decay (Fresh posts get higher priority unless high historical engagement)
        const postTime = new Date(post.createdAt || now).getTime();
        const ageInDays = Math.max(0, (now - postTime) / (1000 * 60 * 60 * 24));
        const recencyMultiplier = 1 / (1 + ageInDays * 0.15);
        const finalScore = score * recencyMultiplier;

        return { ...post, matchScore: Math.round(finalScore) };
      })
      .filter((p) => p.matchScore > 12)
      .sort((a, b) => b.matchScore - a.matchScore);

    // 3. MATCH HASHTAGS
    const hashtagMap = {};
    posts.forEach((post) => {
      const tags = (post.content || '').match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];
      tags.forEach((tag) => {
        const normTag = this.normalizeText(tag);
        let tagMatches = normTag.includes(cleanQuery) || rawQueryLower.includes(normTag);
        if (!tagMatches) {
          activeTokens.forEach((tok) => {
            if (normTag.includes(tok)) tagMatches = true;
          });
        }

        if (tagMatches) {
          if (!hashtagMap[tag]) {
            hashtagMap[tag] = {
              tag,
              count: 0,
              voiceCount: 0,
              latestPostTime: post.createdAt
            };
          }
          hashtagMap[tag].count += 1;
          if (post.hasVoice) hashtagMap[tag].voiceCount += 1;
        }
      });
    });

    const matchingHashtags = Object.values(hashtagMap).sort((a, b) => b.count - a.count);

    // 4. MATCH PLACES
    const placeMap = {};
    safePosts.forEach((post) => {
      if (post.location) {
        const placeName = typeof post.location === 'object' ? post.location.name : post.location;
        const normPlace = this.normalizeText(placeName);
        if (normPlace.includes(cleanQuery)) {
          if (!placeMap[placeName]) {
            placeMap[placeName] = {
              name: placeName,
              count: 0,
              location: post.location
            };
          }
          placeMap[placeName].count++;
        }
      }
    });
    const matchingPlaces = Object.values(placeMap).sort((a, b) => b.count - a.count);

    // 5. CATEGORY FILTERING
    let filteredPosts = scoredPosts;
    if (category === 'voice') {
      filteredPosts = scoredPosts.filter((p) => p.hasVoice);
    } else if (category === 'media') {
      filteredPosts = scoredPosts.filter((p) => p.imageUrl || p.videoUrl || p.hasVoice);
    } else if (category === 'places') {
      filteredPosts = scoredPosts.filter((p) => {
        if (!p.location) return false;
        const pLoc = this.normalizeText(typeof p.location === 'object' ? p.location.name : p.location);
        return pLoc.includes(cleanQuery);
      });
    }

    return {
      users: category === 'posts' || category === 'voice' || category === 'media' || category === 'places' ? [] : scoredUsers,
      posts: category === 'people' || category === 'tags' ? [] : filteredPosts,
      hashtags: category === 'all' || category === 'tags' ? matchingHashtags : [],
      places: category === 'all' || category === 'places' ? matchingPlaces : [],
      topMedia: scoredPosts.filter((p) => p.imageUrl || p.videoUrl).slice(0, 8)
    };
  },

  // Instant Suggestions (Typeahead Autocomplete)
  getSuggestions(query, users = [], posts = []) {
    if (!query || query.trim().length < 1) return [];
    const clean = this.normalizeText(query);
    const suggestions = [];

    // Matching usernames
    users.forEach((u) => {
      const normU = this.normalizeText(u.username);
      const normD = this.normalizeText(u.displayName);
      if (normU.startsWith(clean) || normD.startsWith(clean)) {
        suggestions.push({
          type: 'user',
          label: `@${u.username}`,
          sublabel: u.displayName,
          avatar: u.avatar,
          item: u
        });
      }
    });

    // Matching hashtags
    const seenTags = new Set();
    posts.forEach((p) => {
      const tags = (p.content || '').match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];
      tags.forEach((tag) => {
        if (!seenTags.has(tag) && this.normalizeText(tag).includes(clean)) {
          seenTags.add(tag);
          suggestions.push({
            type: 'tag',
            label: tag,
            sublabel: 'هاشتاج متداول',
            item: tag
          });
        }
      });
    });

    return suggestions.slice(0, 6);
  },

  // PULSE Official Hybrid Autocomplete (Image 2)
  getAutocompleteHybrid(query, users = [], posts = []) {
    if (!query || !query.trim()) return { topUser: null, searchTerms: [], otherUsers: [] };
    const cleanQ = this.normalizeText(query);
    const rawQ = query.trim();

    // 1. Scored matching users
    const safeUsers = users.filter((u) => u && (u.username || u.displayName));
    const matchedUsers = [];
    safeUsers.forEach((u) => {
      const normU = this.normalizeText(u.username || '');
      const normD = this.normalizeText(u.displayName || '');
      let score = 0;
      if (normU === cleanQ) score += 200;
      else if (normU.startsWith(cleanQ)) score += 150;
      else if (normU.includes(cleanQ)) score += 80;

      if (normD === cleanQ) score += 120;
      else if (normD.startsWith(cleanQ)) score += 90;
      else if (normD.includes(cleanQ)) score += 50;

      if (u.isFounder || u.username === 'my') score += 40;
      if (u.isVerified) score += 30;
      const followers = Array.isArray(u.followers) ? u.followers.length : (u.followersCount || 0);
      score += Math.min(25, Math.log10(followers + 1) * 8);

      if (score > 30) {
        matchedUsers.push({ ...u, matchScore: score });
      }
    });

    matchedUsers.sort((a, b) => b.matchScore - a.matchScore);

    const topUser = matchedUsers.length > 0 ? matchedUsers[0] : null;
    const otherUsers = matchedUsers.slice(topUser ? 1 : 0, 15);

    // 2. Generate search query suggestions with magnifying glass icon
    const terms = new Set();
    terms.add(rawQ);

    // From recent searches
    const recents = this.getRecentSearches();
    recents.forEach((r) => {
      if (this.normalizeText(r).includes(cleanQ) && r.toLowerCase() !== rawQ.toLowerCase()) {
        terms.add(r);
      }
    });

    // From hashtags & post text snippets
    posts.forEach((p) => {
      const content = p.content || '';
      const tags = content.match(/#[a-zA-Z0-9_\u0600-\u06FF]+/g) || [];
      tags.forEach((t) => {
        const cleanT = t.replace('#', '').replace(/_/g, ' ');
        if (this.normalizeText(cleanT).includes(cleanQ) && cleanT.toLowerCase() !== rawQ.toLowerCase()) {
          terms.add(cleanT);
        }
      });

      const words = content.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        if (this.normalizeText(words[i]).startsWith(cleanQ)) {
          const phrase = words.slice(i, Math.min(words.length, i + 3)).join(' ').replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
          if (phrase && phrase.length > rawQ.length && phrase.length <= 25) {
            terms.add(phrase);
            if (terms.size >= 5) break;
          }
        }
      }
    });

    return {
      topUser,
      searchTerms: Array.from(terms).slice(0, 4),
      otherUsers
    };
  },

  // Persistent Recent Searches System
  getRecentSearches() {
    try {
      const saved = localStorage.getItem('pulse_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  saveRecentSearch(query) {
    if (!query || !query.trim()) return;
    try {
      const clean = query.trim();
      let list = this.getRecentSearches().filter((q) => q.toLowerCase() !== clean.toLowerCase());
      list.unshift(clean);
      if (list.length > 8) list = list.slice(0, 8);
      localStorage.setItem('pulse_recent_searches', JSON.stringify(list));
    } catch (e) {
      console.warn('Recent searches save notice:', e);
    }
  },

  clearRecentSearches() {
    try {
      localStorage.removeItem('pulse_recent_searches');
    } catch (e) {
      console.warn(e);
    }
  }
};

