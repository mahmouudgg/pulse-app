/**
 * PULSE Subscription & Access Control Engine (subscriptionService)
 * Centralizes all membership tiers, perks, feature-gating, and expiration checks.
 * 
 * STRICT ZERO EMOJIS IN CODE, STRINGS, AND LOGS.
 */

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_annual',
  FOUNDER: 'founder'
};

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    maxPulseChars: 500,
    maxVoiceSeconds: 30,
    maxPinnedPulses: 0,
    sovythosDmLimit: 5,
    adFree: false,
    verifiedBadge: false,
    priorityFeed: false
  },
  PRO: {
    maxPulseChars: 4000,
    maxVoiceSeconds: 120,
    maxPinnedPulses: 3,
    sovythosDmLimit: Infinity,
    adFree: true,
    verifiedBadge: true,
    priorityFeed: true
  }
};

export const subscriptionService = {
  /**
   * Primary check: determines if a user possesses an active Pro / Founder subscription
   */
  isPro(user) {
    if (!user || typeof user !== 'object') return false;

    // Special official accounts are always Pro
    if (user.isFounder || user.uid === 'user_1789917894698' || user.username === 'sovythos' || user.username === 'pulse') {
      return true;
    }

    // Check expiration if set
    if (user.proExpiresAt && typeof user.proExpiresAt === 'number') {
      if (Date.now() > user.proExpiresAt) {
        return false;
      }
    }

    return Boolean(
      user.isPro === true ||
      user.isVerified === true ||
      user.verificationStatus === 'verified' ||
      user.proStatus === 'active' ||
      user.subscriptionStatus === 'active'
    );
  },

  /**
   * Get maximum allowed characters for a pulse
   */
  getMaxPulseLength(user) {
    return this.isPro(user) ? SUBSCRIPTION_LIMITS.PRO.maxPulseChars : SUBSCRIPTION_LIMITS.FREE.maxPulseChars;
  },

  /**
   * Get maximum allowed voice recording seconds
   */
  getMaxVoiceDuration(user) {
    return this.isPro(user) ? SUBSCRIPTION_LIMITS.PRO.maxVoiceSeconds : SUBSCRIPTION_LIMITS.FREE.maxVoiceSeconds;
  },

  /**
   * Get maximum pinned pulses allowed in profile
   */
  getMaxPinnedPulses(user) {
    return this.isPro(user) ? SUBSCRIPTION_LIMITS.PRO.maxPinnedPulses : SUBSCRIPTION_LIMITS.FREE.maxPinnedPulses;
  },

  /**
   * Check if user should experience 100% ad-free feeds
   */
  isAdFree(user) {
    return this.isPro(user);
  },

  /**
   * Check if user has verified royal badge
   */
  hasVerifiedBadge(user) {
    return this.isPro(user);
  },

  /**
   * Check if user can send unlimited multi-turn DMs to Sovythos
   */
  canSendUnlimitedSovythosDMs(user) {
    return this.isPro(user);
  },

  /**
   * Formatted plan title in Arabic and English
   */
  getPlanDetails(user, isAr = true) {
    const isProUser = this.isPro(user);
    if (!isProUser) {
      return {
        tier: SUBSCRIPTION_TIERS.FREE,
        label: isAr ? 'حساب مجاني' : 'Free Account',
        badgeColor: 'text-zinc-400',
        limits: SUBSCRIPTION_LIMITS.FREE
      };
    }

    if (user?.isFounder) {
      return {
        tier: SUBSCRIPTION_TIERS.FOUNDER,
        label: isAr ? 'مؤسس المنصة' : 'Founder',
        badgeColor: 'text-amber-400',
        limits: SUBSCRIPTION_LIMITS.PRO
      };
    }

    const plan = user?.proPlan === 'annual' ? SUBSCRIPTION_TIERS.PRO_ANNUAL : SUBSCRIPTION_TIERS.PRO_MONTHLY;
    const isAnnual = user?.proPlan === 'annual';

    return {
      tier: plan,
      label: isAr 
        ? (isAnnual ? 'اشتراك سنوي Pulse Pro' : 'اشتراك شهري Pulse Pro') 
        : (isAnnual ? 'Pulse Pro Annual' : 'Pulse Pro Monthly'),
      badgeColor: 'text-blue-400',
      limits: SUBSCRIPTION_LIMITS.PRO
    };
  }
};
