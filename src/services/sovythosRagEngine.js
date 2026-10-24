/**
 * Sovythos RAG Engine (Real-Time Timeline Grounding & Context Retrieval)
 * 
 * Provides Sovythos with Grok-level situational awareness across PULSE:
 * - Real-time digest of active public pulses (Platform Pulse Feed Context)
 * - Semantic keyword & entity retrieval to ground queries in platform discussions
 * - Author timeline memory (recent pulses from the person speaking to Sovythos)
 * - Strict privacy enforcement: Zero indexing of private accounts or DMs
 */

import { storageService, OFFICIAL_SOVYTHOS } from './storageService';

// Common Arabic stop words to ignore during keyword extraction
const ARABIC_STOP_WORDS = new Set([
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي',
  'الذي', 'الذين', 'هو', 'هي', 'هم', 'هن', 'أنا', 'أنت', 'أنتم', 'نحن', 'كان',
  'كانت', 'يكون', 'تكون', 'ده', 'دي', 'دول', 'إيه', 'ايه', 'ليه', 'فين', 'مين',
  'ازاي', 'عشان', 'بس', 'يا', 'لو', 'كل', 'بعد', 'قبل', 'عند', 'حتى', 'أن', 'ان',
  'إن', 'هل', 'لا', 'ما', 'مش', 'لم', 'لن', 'قد', 'ثم', 'أو', 'و', 'اللي', 'اللى'
]);

function normalizeArabic(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[؟?.,!،:;()"'«»\-_/\\#@\[\]]/g, ' ') // explicitly strip Arabic and Latin punctuation
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .trim();
}

function extractKeywords(text) {
  if (!text) return [];
  const normalized = normalizeArabic(text);
  const words = normalized.split(/\s+/).filter((w) => w.length > 2 && !ARABIC_STOP_WORDS.has(w));
  return [...new Set(words)];
}

export const sovythosRagEngine = {
  /**
   * Get public organic pulses, filtering out private/banned accounts and Sovythos itself
   */
  getPublicPulses() {
    try {
      const posts = storageService.getPosts();
      return posts.filter((p) => {
        if (!p || !p.content || typeof p.content !== 'string') return false;
        // Never index private accounts
        if (p.author?.isPrivate || p.isPrivate) return false;
        if (p.author?.isBanned) return false;
        // Don't index Sovythos's own pulses for query grounding to avoid echo chamber
        if (p.authorId === OFFICIAL_SOVYTHOS.uid || p.author?.username?.toLowerCase() === 'sovythos') return false;
        return true;
      });
    } catch (err) {
      console.warn('[SovythosRagEngine] Error fetching public pulses:', err);
      return [];
    }
  },

  /**
   * 1. Get compact timeline digest (latest 6-8 public pulses)
   */
  getRecentPlatformDigest(limit = 7) {
    const pulses = this.getPublicPulses();
    return pulses.slice(0, limit).map((p) => {
      const author = p.author?.username ? `@${p.author.username}` : p.author?.displayName || 'مستخدم';
      const cleanContent = p.content.replace(/\n+/g, ' ').substring(0, 110).trim();
      return `${author}: "${cleanContent}"`;
    });
  },

  /**
   * 2. Search relevant pulses based on query keywords or mentioned users
   */
  searchRelevantPulses(queryText, options = {}) {
    const { limit = 3, excludePostId = null } = options;
    if (!queryText) return [];

    const pulses = this.getPublicPulses().filter((p) => p.id !== excludePostId);
    const keywords = extractKeywords(queryText);
    const mentionedUsernames = (queryText.match(/@([a-zA-Z0-9_]+)/g) || []).map((m) => m.slice(1).toLowerCase());

    const scored = pulses.map((p) => {
      let score = 0;
      const normalizedContent = normalizeArabic(p.content);
      const postAuthor = (p.author?.username || '').toLowerCase();

      // Check author match if query asks about a specific person
      if (mentionedUsernames.includes(postAuthor)) {
        score += 8;
      }

      // Check keyword overlap
      keywords.forEach((kw) => {
        if (normalizedContent.includes(kw)) {
          score += 3;
        }
      });

      // Topic match
      if (p.topic && keywords.some((kw) => normalizeArabic(p.topic).includes(kw))) {
        score += 4;
      }

      return { post: p, score };
    });

    return scored
      .filter((item) => item.score > 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => {
        const p = item.post;
        const author = p.author?.username ? `@${p.author.username}` : p.author?.displayName;
        const cleanContent = p.content.replace(/\n+/g, ' ').substring(0, 130).trim();
        return `${author}: "${cleanContent}"`;
      });
  },

  /**
   * 3. Get recent pulses from the person speaking to Sovythos
   */
  getUserRecentContext(userUidOrUsername, limit = 2) {
    if (!userUidOrUsername) return [];
    const pulses = this.getPublicPulses();
    return pulses
      .filter((p) => p.authorId === userUidOrUsername || p.author?.username?.toLowerCase() === String(userUidOrUsername).toLowerCase())
      .slice(0, limit)
      .map((p) => p.content.replace(/\n+/g, ' ').substring(0, 100).trim());
  },

  /**
   * 4. Orchestrate all layers into a clean structured RAG prompt block
   */
  buildSovythosContext({ post = null, comment = null, caller = null }) {
    const query = comment ? comment.content : (post ? post.content : '');
    const excludePostId = post?.id || null;

    // A. Relevant pulses to the specific topic/question
    const relevant = this.searchRelevantPulses(query, { limit: 3, excludePostId });

    // B. General recent timeline digest
    const digest = this.getRecentPlatformDigest(5);

    // C. Recent vibe of the author
    const authorId = caller?.uid || post?.authorId || post?.author?.uid;
    const authorPulses = authorId ? this.getUserRecentContext(authorId, 2) : [];

    let contextText = '';

    if (relevant.length > 0) {
      contextText += '\n[نبضات سابقة ذات صلة بالموضوع مطروحة على PULSE]:\n' + relevant.map((r) => `- ${r}`).join('\n') + '\n';
    }

    if (digest.length > 0) {
      contextText += '\n[نبضات حية متداولة الآن على تايم لاين PULSE]:\n' + digest.map((d) => `- ${d}`).join('\n') + '\n';
    }

    if (authorPulses.length > 0) {
      contextText += '\n[آخر ما نشره صاحب هذا المنشور سابقاً]:\n' + authorPulses.map((ap) => `- "${ap}"`).join('\n') + '\n';
    }

    return contextText.trim();
  }
};
