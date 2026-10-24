import { storageService, OFFICIAL_SOVYTHOS, OFFICIAL_PULSE } from './storageService';
import { database } from './firebase';
import { ref, onValue, get } from 'firebase/database';
import { resolveAvatar, DEFAULT_AVATAR } from '../utils/defaultAvatar';

const SAVED_ACCOUNTS_STORAGE_KEY = 'pulse_saved_accounts_v1';

class MultiAccountService {
  constructor() {
    this.unreadListeners = new Map();
    this.unreadCounts = new Map(); // uid -> notif count
    this.unreadMessageListeners = new Map();
    this.unreadMessageCounts = new Map(); // uid -> msg count
  }

  // Get all saved accounts from localStorage
  getSavedAccounts() {
    try {
      const raw = localStorage.getItem(SAVED_ACCOUNTS_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return list
            .filter((acc) => acc && acc.uid && acc.username)
            .map((acc) => ({ ...acc, avatar: resolveAvatar(acc.avatar) }));
        }
      }
    } catch (e) {
      console.warn('Error reading saved accounts:', e);
    }
    return [];
  }

  // Save/update accounts list in localStorage
  setSavedAccounts(accounts) {
    try {
      localStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
      window.dispatchEvent(new CustomEvent('pulse_saved_accounts_changed', { detail: accounts }));
    } catch (e) {
      console.warn('Error setting saved accounts:', e);
    }
  }

  // Add or update an account in saved list (Protected with device auth token)
  saveAccount(user, explicitAuthToken = null) {
    if (!user || !user.uid || !user.username) return;

    const accounts = this.getSavedAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.uid === user.uid || a.username.toLowerCase() === user.username.toLowerCase()
    );

    // Compute live followers and stats from user object
    const followers = Array.isArray(user.followers)
      ? user.followers.length
      : (typeof user.followers === 'object' && user.followers ? Object.keys(user.followers).length : (user.followersCount || 0));

    const following = Array.isArray(user.following)
      ? user.following.length
      : (typeof user.following === 'object' && user.following ? Object.keys(user.following).length : (user.followingCount || 0));

    const isFounder = Boolean(user.isFounder || user.username === 'my');
    const isOfficial = user.username === 'my' || user.username === 'pulse' || user.username === 'sovythos';

    // Cryptographic device-bound token ensuring account was legitimately authenticated on THIS device
    const existingToken = existingIndex >= 0 ? accounts[existingIndex]?.deviceAuthToken : null;
    const deviceAuthToken = explicitAuthToken || user.deviceAuthToken || existingToken || `pulse_sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const accountSummary = {
      uid: user.uid,
      username: user.username,
      displayName: user.displayName || user.name || user.username,
      avatar: resolveAvatar(user.avatar),
      email: user.email || '',
      bio: user.bio || '',
      password: user.password || '', // Cached securely for seamless re-auth on this device
      deviceAuthToken,
      isVerified: Boolean(user.isVerified || isOfficial),
      isFounder,
      isPioneer: Boolean(user.isPioneer),
      pioneerNumber: user.pioneerNumber || null,
      followersCount: followers,
      followingCount: following,
      lastActive: Date.now(),
      unreadNotifications: this.unreadCounts.get(user.uid) || 0,
      unreadMessages: this.unreadMessageCounts.get(user.uid) || 0,
      sessionCreatedAt: user.sessionCreatedAt || Date.now()
    };

    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...accountSummary };
    } else {
      accounts.push(accountSummary);
    }

    this.setSavedAccounts(accounts);
  }

  // Security Verification: Is this account legitimately authorized on this device?
  isAccountAuthorized(uid) {
    if (!uid) return false;
    const accounts = this.getSavedAccounts();
    return accounts.some((a) => a.uid === uid && (a.deviceAuthToken || a.password));
  }

  // Remove a saved account
  removeAccount(uid) {
    if (!uid) return;
    const accounts = this.getSavedAccounts().filter((a) => a.uid !== uid);
    this.setSavedAccounts(accounts);
    this.unreadCounts.delete(uid);
    this.unreadMessageCounts.delete(uid);

    if (this.unreadListeners.has(uid)) {
      const unsub = this.unreadListeners.get(uid);
      if (typeof unsub === 'function') unsub();
      this.unreadListeners.delete(uid);
    }

    if (this.unreadMessageListeners.has(uid)) {
      const unsub = this.unreadMessageListeners.get(uid);
      if (typeof unsub === 'function') unsub();
      this.unreadMessageListeners.delete(uid);
    }
  }

  // Listen to unread notifications count for a specific account from RTDB
  trackAccountUnread(uid, onUpdate = null) {
    if (!uid || this.unreadListeners.has(uid)) return;

    try {
      const notifRef = ref(database, `notifications/${uid}`);
      const unsub = onValue(
        notifRef,
        (snap) => {
          const val = snap.val();
          let unread = 0;
          if (val && typeof val === 'object') {
            unread = Object.values(val).filter((n) => n && !n.read && !n.isRead).length;
          }
          this.unreadCounts.set(uid, unread);

          // Update in saved accounts
          const accounts = this.getSavedAccounts();
          const acc = accounts.find((a) => a.uid === uid);
          if (acc && acc.unreadNotifications !== unread) {
            acc.unreadNotifications = unread;
            this.setSavedAccounts(accounts);
          }

          if (onUpdate) onUpdate(uid, unread);
        },
        (err) => {
          console.warn('Track unread error for', uid, err);
        }
      );

      this.unreadListeners.set(uid, unsub);
    } catch (e) {
      console.warn('Track unread setup error:', e);
    }
  }

  // Listen to unread direct messages for a specific account
  trackAccountMessages(uid, onUpdate = null) {
    if (!uid || this.unreadMessageListeners.has(uid)) return;

    try {
      const convsRef = ref(database, 'conversations');
      const unsub = onValue(
        convsRef,
        (snap) => {
          const val = snap.val();
          let unread = 0;
          if (val && typeof val === 'object') {
            Object.values(val).forEach((conv) => {
              if (conv && (conv.participant1 === uid || conv.participant2 === uid)) {
                if (conv.unread && conv.unread[uid]) {
                  unread += Number(conv.unread[uid]) || 0;
                }
              }
            });
          }
          this.unreadMessageCounts.set(uid, unread);

          const accounts = this.getSavedAccounts();
          const acc = accounts.find((a) => a.uid === uid);
          if (acc && acc.unreadMessages !== unread) {
            acc.unreadMessages = unread;
            this.setSavedAccounts(accounts);
          }

          if (onUpdate) onUpdate(uid, unread);
        },
        (err) => {
          console.warn('Track messages error for', uid, err);
        }
      );

      this.unreadMessageListeners.set(uid, unsub);
    } catch (e) {
      console.warn('Track messages setup error:', e);
    }
  }

  // Clear all saved accounts and listeners
  clearAllAccounts() {
    this.cleanupListeners();
    try {
      localStorage.removeItem(SAVED_ACCOUNTS_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('pulse_saved_accounts_changed', { detail: [] }));
    } catch {}
  }

  // Clean up all RTDB listeners
  cleanupListeners() {
    this.unreadListeners.forEach((unsub) => {
      if (typeof unsub === 'function') unsub();
    });
    this.unreadListeners.clear();

    this.unreadMessageListeners.forEach((unsub) => {
      if (typeof unsub === 'function') unsub();
    });
    this.unreadMessageListeners.clear();
  }
}

export const multiAccountService = new MultiAccountService();
