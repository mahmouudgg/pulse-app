import { database } from './firebase';
import { ref, get, set, update } from 'firebase/database';

/**
 * PULSE Notification Preferences Service
 * Comprehensive Granular Push & Activity Notification Engine
 * 
 * STRICT COMPLIANCE: ZERO EMOJIS across all code, logs, and UI strings.
 */

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  // Push Notifications Master Pause
  pauseAll: false,
  pauseUntil: null, // timestamp in ms or null

  // Threads & Replies (Pulses & Replies)
  likes: 'everyone', // 'everyone' | 'following' | 'off'
  replies: 'everyone', // 'everyone' | 'following' | 'off'
  mentions: 'everyone', // 'everyone' | 'following' | 'off'
  reposts: 'everyone', // 'everyone' | 'following' | 'off'
  voicePlays: 'everyone', // 'everyone' | 'following' | 'off'

  // Following & Followers
  newFollowers: true, // boolean
  acceptedFollowRequests: true, // boolean
  followSuggestions: true, // boolean

  // Custom Feeds
  addedToCustomFeed: true, // boolean

  // From PULSE
  suggestedPulses: true, // boolean
  reminders: true, // boolean
  productAnnouncements: true, // boolean
  periodicFollowSuggestions: true, // boolean

  // Direct Messages
  messageRequests: 'everyone', // 'everyone' | 'following' | 'off'
  directMessages: true, // boolean

  // Email Notifications
  emailFeedback: false,
  emailReminders: true,
  emailProductNews: true,
  emailSecurityAlerts: true // always on for security
};

const STORAGE_PREFIX = 'pulse_notification_prefs_';

export const notificationPreferencesService = {
  /**
   * Retrieve notification preferences for a specific user.
   * Loads from localStorage cache and falls back to default settings.
   */
  getPreferences(userId) {
    if (!userId) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

    try {
      const cached = localStorage.getItem(STORAGE_PREFIX + userId);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
      }
    } catch (e) {
      console.warn('Error reading notification preferences from cache:', e);
    }

    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  },

  /**
   * Asynchronously sync preferences from Firebase RTDB.
   */
  async syncFromCloud(userId) {
    if (!userId) return null;

    try {
      const snap = await get(ref(database, `users/${userId}/notificationPreferences`));
      if (snap.exists()) {
        const cloudPrefs = snap.val();
        const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...cloudPrefs };
        localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('pulse_notification_prefs_changed', { detail: merged }));
        return merged;
      }
    } catch (e) {
      console.warn('Error syncing notification preferences from cloud:', e);
    }

    return this.getPreferences(userId);
  },

  /**
   * Save partial updates to user preferences.
   * Persists to localStorage immediately and pushes to Firebase RTDB in background.
   */
  savePreferences(userId, partialUpdates) {
    if (!userId) return;

    try {
      const current = this.getPreferences(userId);
      const updated = { ...current, ...partialUpdates };

      // Check if pauseUntil has expired
      if (updated.pauseAll && updated.pauseUntil && Date.now() > updated.pauseUntil) {
        updated.pauseAll = false;
        updated.pauseUntil = null;
      }

      localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(updated));

      // Also update legacy pause key for backward compatibility
      if (typeof partialUpdates.pauseAll !== 'undefined') {
        localStorage.setItem('pulse_notifs_paused', updated.pauseAll ? 'true' : 'false');
      }

      // Sync to Firebase RTDB
      try {
        update(ref(database, `users/${userId}/notificationPreferences`), updated).catch((err) => {
          console.warn('Cloud sync error for notification preferences:', err);
        });
      } catch (cloudErr) {
        console.warn('Firebase RTDB update error:', cloudErr);
      }

      window.dispatchEvent(new CustomEvent('pulse_notification_prefs_changed', { detail: updated }));
      return updated;
    } catch (e) {
      console.error('Error saving notification preferences:', e);
      return null;
    }
  },

  /**
   * Check if notifications are currently paused.
   */
  isMasterPaused(userId) {
    const prefs = this.getPreferences(userId);
    if (!prefs.pauseAll) return false;

    // Check temporary timer if set
    if (prefs.pauseUntil) {
      if (Date.now() > prefs.pauseUntil) {
        // Timer expired, auto-resume
        this.savePreferences(userId, { pauseAll: false, pauseUntil: null });
        return false;
      }
      return true;
    }

    return Boolean(prefs.pauseAll);
  },

  /**
   * Core Rule Evaluator: Determines whether an event should trigger a notification.
   * 
   * @param {string} targetUserId - The recipient user UID.
   * @param {string} notifType - Notification type ('like', 'reply', 'mention', 'repost', 'follow', etc.).
   * @param {boolean} isActorFollowed - Whether target user follows the actor.
   */
  shouldDeliverNotification(targetUserId, notifType, isActorFollowed = false) {
    if (!targetUserId) return false;

    // 1. Master pause check (security alerts always bypass master pause)
    if (notifType !== 'security_login_alert' && notifType !== 'weak_password_alert') {
      if (this.isMasterPaused(targetUserId)) {
        return false;
      }
    }

    const prefs = this.getPreferences(targetUserId);

    // 2. Granular type routing
    switch (notifType) {
      case 'like': {
        const setting = prefs.likes || 'everyone';
        if (setting === 'off') return false;
        if (setting === 'following' && !isActorFollowed) return false;
        return true;
      }

      case 'reply':
      case 'comment': {
        const setting = prefs.replies || 'everyone';
        if (setting === 'off') return false;
        if (setting === 'following' && !isActorFollowed) return false;
        return true;
      }

      case 'mention': {
        const setting = prefs.mentions || 'everyone';
        if (setting === 'off') return false;
        if (setting === 'following' && !isActorFollowed) return false;
        return true;
      }

      case 'repost':
      case 'quote': {
        const setting = prefs.reposts || 'everyone';
        if (setting === 'off') return false;
        if (setting === 'following' && !isActorFollowed) return false;
        return true;
      }

      case 'voice':
      case 'voice_listen': {
        const setting = prefs.voicePlays || 'everyone';
        if (setting === 'off') return false;
        if (setting === 'following' && !isActorFollowed) return false;
        return true;
      }

      case 'follow':
      case 'mutual_follow': {
        return Boolean(prefs.newFollowers);
      }

      case 'follow_request':
      case 'accepted_follow_request': {
        return Boolean(prefs.acceptedFollowRequests);
      }

      case 'follow_suggestion': {
        return Boolean(prefs.followSuggestions);
      }

      case 'custom_feed_add': {
        return Boolean(prefs.addedToCustomFeed);
      }

      case 'post_suggestion':
      case 'pulse_suggestion': {
        return Boolean(prefs.suggestedPulses);
      }

      case 'reminder': {
        return Boolean(prefs.reminders);
      }

      case 'system':
      case 'official':
      case 'product_announcement': {
        return Boolean(prefs.productAnnouncements);
      }

      case 'chat_message':
      case 'direct_message': {
        return Boolean(prefs.directMessages);
      }

      case 'message_request': {
        const setting = prefs.messageRequests || 'everyone';
        if (setting === 'off') return false;
        if (setting === 'following' && !isActorFollowed) return false;
        return true;
      }

      case 'security_login_alert':
      case 'weak_password_alert': {
        // High-priority security alerts are never suppressed
        return true;
      }

      default:
        return true;
    }
  }
};
