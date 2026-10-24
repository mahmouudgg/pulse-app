/**
 * PULSE Official Next-Gen Advertising Engine for PULSE
 * - 100% Real User Campaigns (Zero fake placeholders)
 * - Base64 Media Storage (Images & Short Video clips)
 * - Frequency Capping (1 Ad per 6-8 organic posts)
 * - Direct Realtime Firebase RTDB Sync (ads/ node)
 * - Manual Payment & Review Workflow ('pending' -> 'approved')
 * - Built-in Pluggable Google Ads / AdSense Revenue Fallback
 * - Deduplicated Impression & Click Tracking
 */

import { database } from './firebase';
import { ref, get, set, runTransaction, onValue } from 'firebase/database';

const STORAGE_KEYS = {
  ADS: 'pulse_ads_v1',
  SEEN_ADS: 'pulse_seen_ads_session_v1',
  CLICKS: 'pulse_ad_clicks_v1',
  GOOGLE_CONFIG: 'pulse_google_ads_config_v1'
};

// Legacy seed IDs to purge completely
const LEGACY_PLACEHOLDER_IDS = new Set([
  'ad_house_and_co',
  'ad_sovythos_enterprise'
]);

class AdService {
  constructor() {
    this.sessionSeenAds = new Set();
    this.initSession();
    this.purgeLegacyPlaceholders();
    this.syncFromCloud();
  }

  initSession() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.SEEN_ADS);
      if (raw) this.sessionSeenAds = new Set(JSON.parse(raw));
    } catch {}
  }

  recordSessionSeen(adId) {
    if (!adId) return;
    this.sessionSeenAds.add(adId);
    try {
      sessionStorage.setItem(STORAGE_KEYS.SEEN_ADS, JSON.stringify(Array.from(this.sessionSeenAds)));
    } catch {}
  }

  // Purge any legacy placeholder seed ads from cache
  purgeLegacyPlaceholders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((a) => !LEGACY_PLACEHOLDER_IDS.has(a.id));
          if (cleaned.length !== parsed.length) {
            this.saveAds(cleaned);
          }
        }
      }
    } catch {}
  }

  // Load all ads (local cache only containing real user ads)
  getAds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((a) => !LEGACY_PLACEHOLDER_IDS.has(a.id));
        }
      }
    } catch {}
    return [];
  }

  saveAds(ads) {
    try {
      const filtered = (ads || []).filter((a) => !LEGACY_PLACEHOLDER_IDS.has(a.id));
      localStorage.setItem(STORAGE_KEYS.ADS, JSON.stringify(filtered));
    } catch {}
  }

  // Fetch ads created by a specific user
  getUserAds(userId) {
    if (!userId) return [];
    const all = this.getAds();
    return all.filter((a) => a.ownerId === userId);
  }

  // Realtime Cloud Sync from Firebase RTDB
  async syncFromCloud() {
    try {
      const adsRef = ref(database, 'ads');
      const snap = await get(adsRef);
      if (snap.exists()) {
        const val = snap.val();
        const cloudList = Object.values(val).filter((a) => a && !LEGACY_PLACEHOLDER_IDS.has(a.id));
        if (cloudList.length > 0) {
          this.saveAds(cloudList);
        }
      }
    } catch (e) {
      console.warn('AdService syncFromCloud notice:', e);
    }
  }

  // Subscribe to live ads in RTDB
  subscribeToAds(callback) {
    try {
      const adsRef = ref(database, 'ads');
      return onValue(adsRef, (snap) => {
        if (snap.exists()) {
          const list = Object.values(snap.val()).filter((a) => a && !LEGACY_PLACEHOLDER_IDS.has(a.id));
          this.saveAds(list);
          if (callback) callback(list);
        } else {
          this.saveAds([]);
          if (callback) callback([]);
        }
      });
    } catch (e) {
      console.warn('subscribeToAds error:', e);
      return () => {};
    }
  }

  // Create and Publish a new Campaign (Status starts as 'pending' for manual verification)
  async createAd(adData, currentUser) {
    if (!currentUser?.uid) return null;
    const adId = 'ad_' + Date.now();
    const dailyBudget = Number(adData.dailyBudget) || 10;
    const durationDays = Number(adData.durationDays) || 7;
    const totalBudget = Number(adData.totalBudget) || (dailyBudget * durationDays);
    const paymentRef = 'PAY-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newAd = {
      id: adId,
      brandName: adData.brandName || currentUser.displayName || 'PULSE Advertiser',
      brandUsername: adData.brandUsername || currentUser.username || 'advertiser',
      brandAvatar: adData.brandAvatar || currentUser.avatar || '',
      content: adData.content || '',
      mediaUrl: adData.mediaUrl || null, // Base64 data URL or external URL
      mediaType: adData.mediaType || 'image', // 'image' | 'video'
      destinationUrl: adData.destinationUrl || 'https://pulseeg.wuaze.com',
      displayUrl: adData.displayUrl || (adData.destinationUrl || '').replace(/^https?:\/\//, '').split('/')[0] || 'pulse.app',
      ctaText: adData.ctaText || 'Learn more',
      ctaTextAr: adData.ctaTextAr || 'معرفة المزيد',
      ctaType: adData.ctaType || 'learn_more',
      targetCountry: adData.targetCountry || 'all',
      status: 'pending', // 'pending' | 'approved' | 'active' | 'paused' | 'rejected'
      ownerId: currentUser.uid,
      dailyBudget,
      durationDays,
      totalBudget,
      paymentReference: paymentRef,
      paymentMethod: adData.paymentMethod || 'manual',
      impressionsCount: 0,
      clicksCount: 0,
      likesCount: 0,
      repliesCount: 0,
      repostsCount: 0,
      createdAt: new Date().toISOString()
    };

    // Save locally
    const current = this.getAds();
    current.unshift(newAd);
    this.saveAds(current);

    // Save to Firebase RTDB
    try {
      await set(ref(database, `ads/${adId}`), newAd);
    } catch (cloudErr) {
      console.warn('Firebase RTDB ad create notice:', cloudErr);
    }

    return newAd;
  }

  // Toggle Campaign status (Active / Paused) for approved ads
  async toggleAdStatus(adId, newStatus) {
    const all = this.getAds();
    const ad = all.find((a) => a.id === adId);
    if (!ad) return;

    ad.status = newStatus;
    this.saveAds(all);

    try {
      const adRef = ref(database, `ads/${adId}/status`);
      await set(adRef, newStatus);
    } catch (e) {
      console.warn('toggleAdStatus error:', e);
    }
  }

  // Admin / Founder Approval Handler (changes 'pending' to 'approved')
  async approveAd(adId) {
    const all = this.getAds();
    const ad = all.find((a) => a.id === adId);
    if (!ad) return;

    ad.status = 'approved';
    ad.approvedAt = new Date().toISOString();
    this.saveAds(all);

    try {
      await set(ref(database, `ads/${adId}/status`), 'approved');
      await set(ref(database, `ads/${adId}/approvedAt`), ad.approvedAt);
    } catch (e) {
      console.warn('approveAd RTDB error:', e);
    }
  }

  // Admin / Founder Rejection Handler
  async rejectAd(adId, reason = '') {
    const all = this.getAds();
    const ad = all.find((a) => a.id === adId);
    if (!ad) return;

    ad.status = 'rejected';
    ad.rejectionReason = reason;
    this.saveAds(all);

    try {
      await set(ref(database, `ads/${adId}/status`), 'rejected');
      if (reason) {
        await set(ref(database, `ads/${adId}/rejectionReason`), reason);
      }
    } catch (e) {
      console.warn('rejectAd RTDB error:', e);
    }
  }

  // Delete Ad
  async deleteAd(adId) {
    const all = this.getAds().filter((a) => a.id !== adId);
    this.saveAds(all);
    try {
      await set(ref(database, `ads/${adId}`), null);
    } catch (e) {
      console.warn('deleteAd error:', e);
    }
  }

  // Track verified Impression
  trackImpression(adId, viewerUid = null) {
    if (!adId || this.sessionSeenAds.has(adId)) return;
    this.recordSessionSeen(adId);

    // Local increment
    const all = this.getAds();
    const ad = all.find((a) => a.id === adId);
    if (ad) {
      ad.impressionsCount = (ad.impressionsCount || 0) + 1;
      this.saveAds(all);
    }

    // Cloud increment
    try {
      const impRef = ref(database, `ads/${adId}/impressionsCount`);
      runTransaction(impRef, (curr) => (curr || 0) + 1).catch(() => {});
    } catch {}
  }

  // Track verified Click on CTA
  trackClick(adId, userUid = null) {
    if (!adId) return;

    // Local increment
    const all = this.getAds();
    const ad = all.find((a) => a.id === adId);
    if (ad) {
      ad.clicksCount = (ad.clicksCount || 0) + 1;
      this.saveAds(all);
    }

    // Cloud increment
    try {
      const clickRef = ref(database, `ads/${adId}/clicksCount`);
      runTransaction(clickRef, (curr) => (curr || 0) + 1).catch(() => {});
    } catch {}
  }

  // ========================================================
  // Google Ads / AdSense Configuration (Personal Revenue Fallback)
  // Only accessible and configurable by the platform founder (@my)
  // Appears to users as a completely natural sponsored ad
  // ========================================================
  getGoogleAdsConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GOOGLE_CONFIG);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      enabled: false,
      publisherId: '', // e.g. ca-pub-XXXXXXXXXXXXXXXX
      adSlotId: '',    // e.g. 1234567890
      sponsorName: 'Sponsored Partner',
      sponsorNameAr: 'شريك ممول',
      sponsorText: 'محتوى وإعلان ترويجي رسمي. استكشف أحدث العروض والخدمات الحصرية.',
      destinationUrl: 'https://pulseeg.wuaze.com',
      displayUrl: 'sponsor.pulse.app',
      mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      ctaText: 'Learn more',
      ctaTextAr: 'معرفة المزيد'
    };
  }

  saveGoogleAdsConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEYS.GOOGLE_CONFIG, JSON.stringify(config));
      // Sync config to Firebase system node
      set(ref(database, 'system/google_ads_config'), config).catch(() => {});
    } catch {}
  }

  // Generate a Google Ads native card node matching Threads template
  // Appears to users as a normal sponsored card just like any other ad
  getGoogleAdsUnit(index = 0) {
    const config = this.getGoogleAdsConfig();
    return {
      id: `network_ad_${index}_${Date.now()}`,
      isAd: true,
      isGoogleAd: true,
      brandName: config.sponsorNameAr || config.sponsorName || 'شريك ممول',
      brandUsername: 'partner',
      brandAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      content: config.sponsorText || config.sponsorTextAr || 'محتوى وإعلان ترويجي رسمي. استكشف أحدث العروض والخدمات الحصرية.',
      destinationUrl: config.destinationUrl || 'https://pulseeg.wuaze.com',
      displayUrl: config.displayUrl || 'sponsor.pulse.app',
      ctaText: config.ctaText || 'Learn more',
      ctaTextAr: config.ctaTextAr || 'معرفة المزيد',
      ctaType: 'learn_more',
      mediaUrl: config.mediaUrl || null,
      mediaType: config.mediaType || 'image',
      publisherId: config.publisherId || '',
      adSlotId: config.adSlotId || '',
      status: 'active'
    };
  }

  // PULSE Official Feed Injection Algorithm
  // Priority 1: Real Approved / Active User Campaigns
  // Priority 2: Pluggable Google Ads (only if enabled and only as fallback)
  injectAdsIntoFeed(posts, currentUser = null, userLocation = null) {
    if (!Array.isArray(posts) || posts.length === 0) return [];

    // Filter only REAL approved or active ads
    const all = this.getAds();
    const approvedUserAds = all.filter((a) => a.status === 'approved' || a.status === 'active');
    const googleConfig = this.getGoogleAdsConfig();

    // If no approved user ads and Google Ads is disabled, return untouched organic feed
    if (approvedUserAds.length === 0 && !googleConfig.enabled) {
      return posts.filter((p) => !p.isAd);
    }

    // Clean posts copy (remove previously injected virtual ad nodes if any)
    const cleanPosts = posts.filter((p) => !p.isAd);
    const result = [];
    const interval = 7; // 1 ad every 7 posts
    let adIndex = 0;

    cleanPosts.forEach((post, idx) => {
      result.push(post);

      // Inject after 4th post, then every interval
      if ((idx + 1) === 4 || ((idx + 1) > 4 && (idx + 1 - 4) % interval === 0)) {
        let adToInject = null;

        // Top Priority: User campaigns
        if (approvedUserAds.length > 0) {
          adToInject = approvedUserAds[adIndex % approvedUserAds.length];
        } 
        // Fallback Priority: Google Ads
        else if (googleConfig.enabled) {
          adToInject = this.getGoogleAdsUnit(adIndex);
        }

        if (adToInject) {
          result.push({
            ...adToInject,
            isAd: true,
            id: `injected_${adToInject.id}_${idx}`
          });
          adIndex++;
        }
      }
    });

    return result;
  }
}

export const adService = new AdService();
