import React, { useState, useEffect, useRef } from 'react';

import { AuthProvider, useAuth } from './context/AuthContext';

import { LanguageProvider, useLanguage } from './context/LanguageContext';

import { ToastProvider, useToast } from './context/ToastContext';

import { SafeLinkProvider } from './context/SafeLinkContext';

import { storageService } from './services/storageService';

import { moderationService } from './services/moderationService';

import { chatService } from './services/chatService';

import { hapticsService } from './services/hapticsService';

import { sovythosService } from './services/sovythosService';

import { soundService } from './services/soundService';

import { App as CapApp } from '@capacitor/app';

import { Wifi, WifiOff } from 'lucide-react';

import { watchConnectionStatus } from './services/firebase';

import { DEFAULT_AVATAR, resolveAvatar } from './utils/defaultAvatar';

import AuthPage from './pages/AuthPage';

import FeedPage from './pages/FeedPage';

import PostDetailPage from './pages/PostDetailPage';

import ExplorePage from './pages/ExplorePage';

import NotificationsPage from './pages/NotificationsPage';

import ProfilePage from './pages/ProfilePage';

import EditProfilePage from './pages/EditProfilePage';

import FollowListPage from './pages/FollowListPage';

import BannedPage from './pages/BannedPage';

import DeviceBanScreen from './components/DeviceBanScreen';

import AppLockScreen from './components/AppLockScreen';

import { antiAbuseEngine } from './services/antiAbuseEngine';

import { biometricLockService } from './services/biometricLockService';

import { screenSecurity } from './utils/screenSecurity';

import SettingsPage from './pages/SettingsPage';

import TermsOfServicePage from './pages/TermsOfServicePage';

import PrivacyPolicyPage from './pages/PrivacyPolicyPage';

import VerificationPage from './pages/VerificationPage';

import LiveSpaceRoom from './pages/LiveSpaceRoom';

import MessagesPage from './pages/MessagesPage';

import ChatConversationPage from './pages/ChatConversationPage';

import PioneersPage from './pages/PioneersPage';

import AccountCenterPage from './pages/AccountCenterPage';

import { InsightsPage } from './pages/InsightsPage';

import AdsManagerPage from './pages/AdsManagerPage';

import AccountsManagerPage from './pages/AccountsManagerPage';

import ChangePasswordPage from './pages/ChangePasswordPage';

import MusicPage from './pages/MusicPage';

import Navbar from './components/Navbar';

import AccountSwitcherBottomSheet from './components/AccountSwitcherBottomSheet';

import ComposeModal from './components/ComposeModal';

import SharePreviewModal from './components/SharePreviewModal';

import ReportModal from './components/ReportModal';

import CreateSpaceModal from './components/CreateSpaceModal';

import MiniSpacePlayer from './components/MiniSpacePlayer';

import MiniAudioPlayer from './components/MiniAudioPlayer';

import UpdateModal from './components/UpdateModal';

import ErrorBoundary from './components/ErrorBoundary';

import { fcmService } from './services/fcmService';

import { notificationService } from './services/notificationService';

import { updateService } from './services/updateService';

import { recommendationNotificationEngine } from './services/recommendationNotificationEngine';

import { offlineCacheService } from './services/offlineCacheService';

import { liveSyncEngine } from './services/liveSyncEngine';

function MainApp() {

  const { currentUser, toggleBookmark, toggleFollow, savedAccounts = [] } = useAuth();

  const { t, lang } = useLanguage();

  const { showToast } = useToast();

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [isGuestMode, setIsGuestMode] = useState(() => {

    try {

      return localStorage.getItem('pulse_guest_mode') === 'true';

    } catch {

      return false;

    }

  });

  const handleToggleFollow = (targetUid) => {

    if (!currentUser) {

      setShowAuthModal(true);

      return;

    }

    if (!targetUid) return;

    toggleFollow(targetUid);

  };

  const [posts, setPosts] = useState([]);

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'explore' | 'activity' | 'profile'

  const [currentScreen, setCurrentScreen] = useState(null);
  const [settingsInitialSubView, setSettingsInitialSubView] = useState(null);

  useEffect(() => {
    const handleOpenSettingsEvent = (e) => {
      const subview = e.detail?.subview || null;
      setSettingsInitialSubView(subview);
      setCurrentScreen('settings');
    };
    window.addEventListener('pulse:open-settings', handleOpenSettingsEvent);
    return () => window.removeEventListener('pulse:open-settings', handleOpenSettingsEvent);
  }, []); // null | 'settings' | 'verification' | 'post-detail' | 'user-profile' | 'follow-list' | 'messages' | 'chat' | 'pioneers'

  const [previousScreen, setPreviousScreen] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);

  const [viewedUserProfile, setViewedUserProfile] = useState(null);

  const [followListConfig, setFollowListConfig] = useState(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [composeInitialMusic, setComposeInitialMusic] = useState(null);

  const [composeInitialMedia, setComposeInitialMedia] = useState(null);

  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  // Direct Messages & Activity Unread Notifications State (PULSE Dot Pattern)

  const [activeChatRecipient, setActiveChatRecipient] = useState(null);

  const [unreadDmCount, setUnreadDmCount] = useState(0);

  const [unreadNotifCount, setUnreadNotifCount] = useState(() => {

    return currentUser?.uid ? notificationService.getUnreadCount(currentUser.uid) : 0;

  });

  useEffect(() => {

    if (currentUser) {

      setIsGuestMode(false);

      setShowAuthModal(false);

    }

  }, [currentUser]);

  // Modals for Share & Report

  const [sharePost, setSharePost] = useState(null);

  const [reportPost, setReportPost] = useState(null);

  // In-App Auto Updater State

  const [updateInfo, setUpdateInfo] = useState(null);

  // Feed Pagination & Infinite Scroll State

  const [hasMorePosts, setHasMorePosts] = useState(true);

  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Live Spaces State (Clubhouse / Twitter Spaces style)

  const [activeSpace, setActiveSpace] = useState(null);

  const [isSpaceMinimized, setIsSpaceMinimized] = useState(false);

  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);

  // Smart Offline / Reconnect Banner State

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [showReconnected, setShowReconnected] = useState(false);

  // 6-Month Hardware Device Ban State (Strict zero-trust hardware lockout)

  const [deviceBanInfo, setDeviceBanInfo] = useState(() => antiAbuseEngine.getFastLocalDeviceBan());

  // Biometric & Passcode App Lock State

  const [isAppLocked, setIsAppLocked] = useState(() => biometricLockService.isLockEnabled());

  // App Lock & Screen Capture Protection Lifecycle Watcher

  useEffect(() => {

    screenSecurity.init();

    const handleVisibility = () => {

      if (document.visibilityState === 'hidden') {

        biometricLockService.recordBackgroundTime();

      } else if (document.visibilityState === 'visible') {

        if (biometricLockService.shouldLockOnResume()) {

          setIsAppLocked(true);

        }

      }

    };

    const handleAppLockToggled = () => {

      setIsAppLocked(biometricLockService.isLockEnabled());

    };

    document.addEventListener('visibilitychange', handleVisibility);

    window.addEventListener('pulse_app_lock_changed', handleAppLockToggled);

    return () => {

      document.removeEventListener('visibilitychange', handleVisibility);

      window.removeEventListener('pulse_app_lock_changed', handleAppLockToggled);

    };

  }, []);

  // Deep cloud check for 6-Month Device Ban

  useEffect(() => {

    let isMounted = true;

    antiAbuseEngine.checkDeviceBan().then((status) => {

      if (isMounted && status) setDeviceBanInfo(status);

    });

    const handleDeviceBannedEvent = (e) => {

      if (e.detail) {

        setDeviceBanInfo(e.detail);

      }

    };

    window.addEventListener('pulse_device_banned', handleDeviceBannedEvent);

    return () => {

      isMounted = false;

      window.removeEventListener('pulse_device_banned', handleDeviceBannedEvent);

    };

  }, []);

  // Seamless Startup Boot Splash Screen Dissolve (Zero black-screen flash)

  useEffect(() => {

    const splash = document.getElementById('pulse-boot-splash');

    if (splash) {

      const timer = setTimeout(() => {

        splash.style.opacity = '0';

        splash.style.pointerEvents = 'none';

        setTimeout(() => {

          try { splash.remove(); } catch {}

        }, 400);

      }, 160);

      return () => clearTimeout(timer);

    }

  }, []);

  // In-App Auto Updater startup check

  useEffect(() => {

    const timer = setTimeout(async () => {

      try {

        const res = await updateService.checkForUpdates();

        if (res && res.hasUpdate) {

          setUpdateInfo(res);

        }

      } catch (e) {

        console.warn('Auto-update check notice:', e);

      }

    }, 2500);

    return () => clearTimeout(timer);

  }, []);

  // PULSE Official Grade Debounced Offline & Reconnection Watcher

  useEffect(() => {

    let offlineTimer = null;

    let wasActuallyOffline = false;

    const handleOnline = () => {

      if (offlineTimer) {

        clearTimeout(offlineTimer);

        offlineTimer = null;

      }

      if (wasActuallyOffline) {

        setIsOffline(false);

        wasActuallyOffline = false;

        setShowReconnected(true);

        try {

          const fresh = storageService.getPosts();

          setPosts(fresh);

          setHasMorePosts(true);

        } catch (e) {}

        setTimeout(() => setShowReconnected(false), 2200);

      } else {

        setIsOffline(false);

      }

    };

    const handleOffline = () => {

      // Don't trigger if the app is hidden in the background

      if (typeof document !== 'undefined' && document.hidden) return;

      if (offlineTimer) clearTimeout(offlineTimer);

      // Debounce: only declare offline if network is down for > 4.5 seconds

      offlineTimer = setTimeout(() => {

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {

          setIsOffline(true);

          wasActuallyOffline = true;

          setShowReconnected(false);

        }

      }, 4500);

    };

    const handleVisibility = () => {

      if (!document.hidden && typeof navigator !== 'undefined' && navigator.onLine) {

        // App resumed and device is online — cancel any false offline states

        if (offlineTimer) {

          clearTimeout(offlineTimer);

          offlineTimer = null;

        }

      }

    };

    window.addEventListener('online', handleOnline);

    window.addEventListener('offline', handleOffline);

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {

      if (offlineTimer) clearTimeout(offlineTimer);

      window.removeEventListener('online', handleOnline);

      window.removeEventListener('offline', handleOffline);

      document.removeEventListener('visibilitychange', handleVisibility);

    };

  }, []);

  // Listen for 'pulse:compose_media' to open compose modal with media attached

  useEffect(() => {

    const handleComposeWithMedia = (e) => {

      if (e.detail?.image) {

        setComposeInitialMedia(e.detail.image);

        setIsComposeOpen(true);

      }

    };

    window.addEventListener('pulse:compose_media', handleComposeWithMedia);

    return () => window.removeEventListener('pulse:compose_media', handleComposeWithMedia);

  }, []);

  // Listen for 'pulse_compose_with_sound' to open compose modal with sound attached

  useEffect(() => {

    const handleComposeWithSound = (e) => {

      if (e.detail?.sound) {

        setComposeInitialMusic(e.detail.sound);

        setIsComposeOpen(true);

      }

    };

    window.addEventListener('pulse_compose_with_sound', handleComposeWithSound);

    return () => window.removeEventListener('pulse_compose_with_sound', handleComposeWithSound);

  }, []);

  // Initialize and load posts with Live Firebase Realtime Sync & Offline Cache

  useEffect(() => {

    storageService.init();

    const localPosts = storageService.getPosts();

    if (localPosts && localPosts.length > 0) {

      setPosts(localPosts);

      offlineCacheService.cacheFeedPosts(localPosts).catch(() => {});

    } else {

      offlineCacheService.getCachedFeedPosts().then((cached) => {

        if (cached && cached.length > 0) {

          setPosts(cached);

        }

      }).catch(() => {});

    }

    const unsubscribePosts = storageService.subscribeToPosts((livePosts) => {

      setPosts(livePosts);

      offlineCacheService.cacheFeedPosts(livePosts).catch(() => {});

    }, 25);

    // Reconnection synchronization: when coming back online, force fetch live posts from cloud

    const handleOnline = () => {

      setIsOffline(false);

      storageService.fetchLivePosts().then((fresh) => {

        if (fresh && fresh.length > 0) {

          setPosts(fresh);

          offlineCacheService.cacheFeedPosts(fresh).catch(() => {});

        }

      }).catch(console.warn);

    };

    window.addEventListener('online', handleOnline);

    // Check and trigger autonomous daily pulse by Sovythos

    const pulseTimer = setTimeout(() => {

      sovythosService.checkAndTriggerDailyPulse().then((pulse) => {

        if (pulse) {

          setPosts((prev) => [pulse, ...prev]);

        }

      }).catch(console.warn);

    }, 2500);

    return () => {

      clearTimeout(pulseTimer);

      window.removeEventListener('online', handleOnline);

      if (typeof unsubscribePosts === 'function') unsubscribePosts();

    };

  }, []);

  // Universal Live Cloud Sync Engine (Continuous Real-Time Reconciliation)

  useEffect(() => {

    if (currentUser?.uid) {

      liveSyncEngine.start(currentUser.uid);

      const handleNotifsSynced = (e) => {

        if (typeof e.detail?.unreadCount === 'number') {

          setUnreadNotifCount(e.detail.unreadCount);

        }

      };

      const handleDmsSynced = (e) => {

        if (typeof e.detail?.totalUnread === 'number') {

          setUnreadDmCount(e.detail.totalUnread);

        }

      };

      window.addEventListener('pulse_notifications_synced', handleNotifsSynced);

      window.addEventListener('pulse_dms_synced', handleDmsSynced);

      return () => {

        liveSyncEngine.stop();

        window.removeEventListener('pulse_notifications_synced', handleNotifsSynced);

        window.removeEventListener('pulse_dms_synced', handleDmsSynced);

      };

    } else {

      liveSyncEngine.stop();

    }

  }, [currentUser?.uid]);

  // Unread DMs subscription

  useEffect(() => {

    if (currentUser?.uid) {

      const unsubscribe = chatService.subscribeToTotalUnreadCount(currentUser.uid, (total) => {

        setUnreadDmCount(total);

      });

      return () => {

        if (typeof unsubscribe === 'function') unsubscribe();

      };

    }

  }, [currentUser?.uid]);

  // Unread Activity Notifications subscription (PULSE Dot Pattern)

  useEffect(() => {

    if (currentUser?.uid) {

      const unsubscribe = notificationService.subscribeToUnreadCount(currentUser.uid, (count) => {

        setUnreadNotifCount(count);

      });

      return () => {

        if (typeof unsubscribe === 'function') unsubscribe();

      };

    } else {

      setUnreadNotifCount(0);

    }

  }, [currentUser?.uid]);

 

  // Algorithmic recommendations engine evaluation (Follow & Post suggestions)

  useEffect(() => {

    if (currentUser?.uid) {

      const timer = setTimeout(() => {

        recommendationNotificationEngine.evaluateRecommendations(currentUser);

      }, 3500);

      return () => clearTimeout(timer);

    }

  }, [currentUser?.uid]);

  // Cleanly reset screen states when logging out

  useEffect(() => {

    if (!currentUser) {

      setCurrentScreen(null);

      setSelectedPost(null);

      setViewedUserProfile(null);

      setFollowListConfig(null);

      setIsComposeOpen(false);

      setSharePost(null);

      setReportPost(null);

      setActiveSpace(null);

      setIsSpaceMinimized(false);

      setIsCreateSpaceOpen(false);

      setActiveChatRecipient(null);

      setUnreadDmCount(0);

      setActiveTab('feed');

      setIsGuestMode(false);

    }

  }, [currentUser]);

  // Real Native Firebase Cloud Messaging (FCM) & System Notification Channels

  useEffect(() => {

    if (currentUser?.uid) {

      fcmService.init(currentUser);

      notificationService.initSystemNotifications();

      const unsubscribe = notificationService.subscribeToCloudNotifications(currentUser.uid);

      return () => {

        if (typeof unsubscribe === 'function') unsubscribe();

      };

    }

  }, [currentUser?.uid]);

  // Deep-link navigation when user taps a notification on lock screen or status bar

  useEffect(() => {

    const handleOpenPostEvent = async (e) => {

      if (e.detail?.postId) {

        let found = posts.find((p) => p.id === e.detail.postId);

        if (!found) {

          try {

            found = await storageService.getPostById(e.detail.postId);

          } catch {}

        }

        if (found) {

          setSelectedPost(found);

          setCurrentScreen('post-detail');

        }

      }

    };

    const handleOpenChatEvent = (e) => {

      if (e.detail?.conversationId || e.detail?.recipientUser) {

        if (e.detail?.recipientUser) {

          setActiveChatRecipient(e.detail.recipientUser);

          setCurrentScreen('chat');

        } else {

          setCurrentScreen('messages');

        }

      }

    };

    const handleOpenAdsEvent = () => {

      setCurrentScreen('ads_manager');

    };

    window.addEventListener('pulse_open_post', handleOpenPostEvent);

    window.addEventListener('pulse_open_chat', handleOpenChatEvent);

    window.addEventListener('pulse_open_ads_manager', handleOpenAdsEvent);

    return () => {

      window.removeEventListener('pulse_open_post', handleOpenPostEvent);

      window.removeEventListener('pulse_open_chat', handleOpenChatEvent);

      window.removeEventListener('pulse_open_ads_manager', handleOpenAdsEvent);

    };

  }, [posts]);

  // Deep linking handler (pulse://post/123, pulse://user/john, or https://pulseeg.wuaze.com/?post=123)

  useEffect(() => {

    const handleDeepLinkUrl = (rawUrl) => {

      if (!rawUrl) return;

      try {

        let path = '';

        let queryParams = {};

        if (rawUrl.startsWith('pulse://')) {

          const stripped = rawUrl.replace('pulse://', '');

          const parts = stripped.split('?');

          path = parts[0] || '';

          if (parts[1]) {

            const searchParams = new URLSearchParams(parts[1]);

            searchParams.forEach((v, k) => { queryParams[k] = v; });

          }

        } else {

          const urlObj = new URL(rawUrl);

          path = urlObj.pathname.replace(/^\/+/, '');

          urlObj.searchParams.forEach((v, k) => { queryParams[k] = v; });

        }

        // 1. Post deep link

        const postId = queryParams.post || (path.startsWith('p/') ? path.replace('p/', '') : (path.startsWith('post/') ? path.replace('post/', '') : null));

        if (postId) {

          const found = posts.find((p) => p.id === postId) || { id: postId, content: '...', author: { displayName: 'PULSE' } };

          setSelectedPost(found);

          setCurrentScreen('post-detail');

          return;

        }

        // 2. User profile deep link (support /my, /@my, /user/my, ?user=my)

        let username = queryParams.user || (path.startsWith('user/') ? path.replace('user/', '') : null);

        if (!username && path && !path.includes('/') && !path.includes('.') && !['pioneers', 'settings', 'search', 'notifications'].includes(path)) {

          username = path.startsWith('@') ? path.slice(1) : path;

        }

        if (username) {

          const target = storageService.getUserByUsername(username);

          setViewedUserProfile(target || { username, displayName: username });

          setCurrentScreen('user-profile');

          return;

        }

        // 3. Invite deep link

        if (queryParams.invite || path.startsWith('invite')) {

          setCurrentScreen('pioneers');

          return;

        }

      } catch (e) {

        console.warn('Deep link parse error:', e);

      }

    };

    // Check window location on web launch

    if (typeof window !== 'undefined') {

      const p = window.location.pathname;

      const s = window.location.search;

      if (s || (p && p.length > 1 && !p.endsWith('.html') && !p.endsWith('.apk') && !p.endsWith('.js') && !p.endsWith('.css') && !p.endsWith('.json'))) {

        handleDeepLinkUrl(window.location.href);

      }

    }

    // Listen to native Capacitor App URL open

    let appUrlSub = null;

    try {

      CapApp.addListener('appUrlOpen', (event) => {

        handleDeepLinkUrl(event.url);

      }).then((sub) => {

        appUrlSub = sub;

      }).catch(console.warn);

    } catch (e) {

      console.warn('Capacitor App listener error:', e);

    }

    return () => {

      if (appUrlSub && typeof appUrlSub.remove === 'function') {

        appUrlSub.remove();

      }

    };

  }, [posts]);

  // Android Native Hardware / Gesture Back Button Handler

  const lastBackPressTime = useRef(0);

  const backStateRef = useRef({

    updateInfo,

    isComposeOpen,

    sharePost,

    reportPost,

    isCreateSpaceOpen,

    activeSpace,

    isSpaceMinimized,

    currentScreen,

    activeTab

  });

  useEffect(() => {

    backStateRef.current = {

      updateInfo,

      isComposeOpen,

      sharePost,

      reportPost,

      isCreateSpaceOpen,

      activeSpace,

      isSpaceMinimized,

      currentScreen,

      activeTab

    };

  }, [

    updateInfo,

    isComposeOpen,

    sharePost,

    reportPost,

    isCreateSpaceOpen,

    activeSpace,

    isSpaceMinimized,

    currentScreen,

    activeTab

  ]);

  useEffect(() => {

    let backSub = null;

    try {

      CapApp.addListener('backButton', () => {

        const s = backStateRef.current;

        // 1. Dismiss any open modal first

        if (s.updateInfo) {

          setUpdateInfo(null);

          return;

        }

        if (s.isComposeOpen) {

          // Let the composer resolve nested layers / save-draft prompt first

          const backEvent = new CustomEvent('pulse:compose-back', { cancelable: true });

          window.dispatchEvent(backEvent);

          if (!backEvent.defaultPrevented) setIsComposeOpen(false);

          return;

        }

        if (s.sharePost) {

          setSharePost(null);

          return;

        }

        if (s.reportPost) {

          setReportPost(null);

          return;

        }

        if (s.isCreateSpaceOpen) {

          setIsCreateSpaceOpen(false);

          return;

        }

        if (s.activeSpace && !s.isSpaceMinimized) {

          setIsSpaceMinimized(true);

          return;

        }

        // 2. Subscreen back navigation

        if (s.currentScreen === 'chat') {

          setCurrentScreen('messages');

          return;

        }

        if (s.currentScreen === 'account_center' || s.currentScreen === 'terms' || s.currentScreen === 'privacy') {

          setCurrentScreen('settings');

          return;

        }

        if (s.currentScreen) {

          if (s.currentScreen === 'music') {

            soundService.stopPreview();

          }

          setCurrentScreen(null);

          return;

        }

        // 3. Tab back navigation (back to feed)

        if (s.activeTab !== 'feed') {

          setActiveTab('feed');

          return;

        }

        // 4. Double tap back to exit on Feed

        const now = Date.now();

        if (now - lastBackPressTime.current < 2000) {

          CapApp.exitApp();

        } else {

          lastBackPressTime.current = now;

          showToast('اضغط مرة أخرى للخروج من التطبيق');

        }

      }).then((sub) => {

        backSub = sub;

      }).catch(console.warn);

    } catch (e) {

      console.warn('Back button listener error:', e);

    }

    return () => {

      if (backSub && typeof backSub.remove === 'function') {

        backSub.remove();

      }

    };

  }, [showToast]);

  // 0ms Optimistic Like handler

  const handleLike = (postId) => {

    if (!currentUser) {

      setShowAuthModal(true);

      return;

    }

    hapticsService.medium();

    // 1. Instant 0ms local mutation

    setPosts((prev) =>

      prev.map((p) => {

        if (p.id !== postId) return p;

        const currentLikes = storageService._resolveEngagementArray(p.likes);

        const hasLiked = Array.isArray(currentLikes) && currentUser?.uid ? currentLikes.includes(currentUser.uid) : false;

        const nextLikes = hasLiked

          ? currentLikes.filter((id) => id !== currentUser.uid)

          : [...(Array.isArray(currentLikes) ? currentLikes : []), currentUser.uid];

        const updated = { ...p, likes: nextLikes };

        delete updated.likesCount;

        return updated;

      })

    );

    if (selectedPost && selectedPost.id === postId) {

      setSelectedPost((prev) => {

        const currentLikes = storageService._resolveEngagementArray(prev.likes);

        const hasLiked = Array.isArray(currentLikes) && currentUser?.uid ? currentLikes.includes(currentUser.uid) : false;

        const nextLikes = hasLiked

          ? currentLikes.filter((id) => id !== currentUser.uid)

          : [...(Array.isArray(currentLikes) ? currentLikes : []), currentUser.uid];

        const updated = { ...prev, likes: nextLikes };

        delete updated.likesCount;

        return updated;

      });

    }

    // 2. Background sync

    try {

      storageService.toggleLikePost(postId, currentUser);

    } catch (err) {

      console.warn('Optimistic like rollback:', err);

      setPosts(storageService.getPosts());

    }

  };

  // 0ms Optimistic Repost handler with real timeline entry

  const handleRepost = (postId) => {

    if (!currentUser) {

      setShowAuthModal(true);

      return;

    }

    hapticsService.medium();

    try {

      const result = storageService.toggleRepost(postId, currentUser) || {};

      const { repostEntry, isRepostedNow } = result;

      setPosts((prev) => {

        let next = prev.map((p) => {

          if (p.id !== postId) return p;

          const currentReposts = storageService._resolveEngagementArray(p.reposts);

          const hasReposted = Array.isArray(currentReposts) && currentUser?.uid ? currentReposts.includes(currentUser.uid) : false;

          const nextReposts = isRepostedNow

            ? (hasReposted ? currentReposts : [...(Array.isArray(currentReposts) ? currentReposts : []), currentUser.uid])

            : currentReposts.filter((id) => id !== currentUser.uid);

          const updated = { ...p, reposts: nextReposts };

          delete updated.repostsCount;

          return updated;

        });

        if (isRepostedNow && repostEntry) {

          next = [repostEntry, ...next];

        } else if (!isRepostedNow) {

          next = next.filter(

            (p) => !(p.isRepost && p.originalPostId === postId && (p.repostedBy?.uid === currentUser.uid || p.authorId === currentUser.uid))

          );

        }

        return next;

      });

      if (selectedPost && selectedPost.id === postId) {

        setSelectedPost((prev) => {

          const currentReposts = storageService._resolveEngagementArray(prev.reposts);

          const hasReposted = Array.isArray(currentReposts) && currentUser?.uid ? currentReposts.includes(currentUser.uid) : false;

          const nextReposts = isRepostedNow

            ? (hasReposted ? currentReposts : [...(Array.isArray(currentReposts) ? currentReposts : []), currentUser.uid])

            : currentReposts.filter((id) => id !== currentUser.uid);

          const updated = { ...prev, reposts: nextReposts };

          delete updated.repostsCount;

          return updated;

        });

      }

    } catch (err) {

      console.warn('Optimistic repost rollback:', err);

      setPosts(storageService.getPosts());

    }

  };

  // 0ms Optimistic Publish new post

  const handlePublish = (newPost) => {

    if (!currentUser) {

      setShowAuthModal(true);

      return;

    }

    hapticsService.success();

    // 1. Insert immediately in 0ms to local feed head

    setPosts((prev) => [newPost, ...prev]);

    setActiveTab('feed');

    setCurrentScreen(null);

    // 2. Background sync

    try {

      storageService.savePost(newPost);

    } catch (err) {

      console.warn('Publish error:', err);

    }

    // 3. Sovythos AI Mention Trigger

    try {

      setTimeout(() => {

        sovythosService.processMentionTrigger({ post: newPost, actor: currentUser });

      }, 1500);

    } catch (e) {

      console.warn('Sovythos mention trigger notice:', e);

    }

  };

  // Delete post handler

  const handleDeletePost = (postId) => {

    try {

      hapticsService.medium?.();

      storageService.deletePost(postId, currentUser);

      setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId) && (!p.isRepost || String(p.originalPostId) !== String(postId))));

      if (selectedPost && String(selectedPost.id) === String(postId)) {

        setSelectedPost(null);

        setCurrentScreen(null);

      }

      showToast('تم حذف النبضة بنجاح');

    } catch (err) {

      showToast(err.message || 'فشل حذف النبضة', 'error');

    }

  };

  // Edit post handler

  const handleEditPost = (postId, newContent) => {

    try {

      const updated = storageService.updatePost(postId, newContent, currentUser);

      if (updated) {

        setPosts((prev) =>

          prev.map((p) => (String(p.id) === String(postId) ? { ...p, content: newContent, isEdited: true, editedAt: updated.editedAt } : p))

        );

        if (selectedPost && String(selectedPost.id) === String(postId)) {

          setSelectedPost((prev) => ({ ...prev, content: newContent, isEdited: true, editedAt: updated.editedAt }));

        }

        showToast('تم تعديل النبضة بنجاح');

      }

    } catch (err) {

      showToast(err.message || 'فشل تعديل النبضة', 'error');

    }

  };

  // 0ms Optimistic Toggle bookmark handler

  const handleToggleBookmark = (postId) => {

    if (!currentUser) {

      setShowAuthModal(true);

      return;

    }

    hapticsService.medium();

    // Single call — AuthContext.toggleBookmark handles storage + state update

    // DO NOT call storageService.toggleBookmark here (causes double-toggle bug)

    if (toggleBookmark) {

      toggleBookmark(postId);

    }

  };

  // Block user handler (Instant client-side filter)

  const handleBlockUser = (targetUserId) => {

    const success = moderationService.blockUser(targetUserId, currentUser);

    if (success) {

      setPosts((prev) => prev.filter((p) => p.authorId !== targetUserId && p.author?.uid !== targetUserId));

      if (selectedPost && (selectedPost.authorId === targetUserId || selectedPost.author?.uid === targetUserId)) {

        setSelectedPost(null);

        setCurrentScreen(null);

      }

      showToast('تم حظر المستخدم بنجاح ولن تظهر نبضاته لك.');

    }

  };

  // Immediate Client-Side Moderation & Post Hiding upon reporting

  const handleReportSubmitted = (reportedPostId) => {

    setPosts((prev) => prev.filter((p) => p.id !== reportedPostId));

    if (selectedPost && selectedPost.id === reportedPostId) {

      setSelectedPost(null);

      setCurrentScreen(null);

    }

    showToast('تم إخفاء النبضة وإرسال البلاغ لفريق المراجعة بنجاح.');

  };

  // Load older posts with database protection & pagination

  const handleLoadOlderPosts = async () => {

    if (isLoadingOlder || !hasMorePosts || posts.length === 0) return;

    setIsLoadingOlder(true);

    try {

      const earliestKey = posts[posts.length - 1].id;

      const older = await storageService.loadOlderPosts(earliestKey, 25);

      if (!older || older.length === 0) {

        setHasMorePosts(false);

      } else {

        setPosts((prev) => {

          const existingIds = new Set(prev.map((p) => p.id));

          const fresh = older.filter((p) => !existingIds.has(p.id));

          if (fresh.length === 0) setHasMorePosts(false);

          return [...prev, ...fresh];

        });

      }

    } catch (err) {

      console.warn('Load older error:', err);

    } finally {

      setIsLoadingOlder(false);

    }

  };

  // Open user profile (Strict guard against ghost/empty profiles)

  const handleOpenUserProfile = (user) => {

    if (!user) return;

    const authorUid = user.uid || user.authorId;

    const authorUsername = user.username;

    if (!authorUid && !authorUsername) return;

    const fullUser = (authorUid && storageService.getUser(authorUid)) ||

      (authorUsername && storageService.getUserByUsername(authorUsername)) ||

      user;

    setViewedUserProfile(fullUser);

    setCurrentScreen('user-profile');

  };

  // Dedicated open post detail handler

  const handleOpenDetail = (post) => {

    if (!post) return;

    setPreviousScreen(currentScreen);

    setSelectedPost(post);

    setCurrentScreen('post-detail');

  };

  // Open follow/followers dedicated list page

  const handleOpenFollowList = ({ user, initialType = 'followers' }) => {

    setFollowListConfig({ user, initialType });

    setCurrentScreen('follow-list');

  };

  // Open chat with user

  const handleOpenChat = (recipientUser) => {

    if (!currentUser) {

      setShowAuthModal(true);

      return;

    }

    if (!recipientUser) return;

    setActiveChatRecipient(recipientUser);

    setCurrentScreen('chat');

  };

  // Open messages inbox

  const handleOpenMessages = () => {

    if (!currentUser) {

      setShowAuthModal(true);

      return;

    }

    setCurrentScreen('messages');

  };

  // Open pioneers standalone page

  const handleOpenPioneers = () => {

    setCurrentScreen('pioneers');

  };

  // Conditional early returns for banned devices, non-logged in, or banned users AFTER all hooks

  if (deviceBanInfo?.isBanned) {

    return <DeviceBanScreen banInfo={deviceBanInfo} onUnban={() => setDeviceBanInfo({ isBanned: false })} />;

  }

  if (isAppLocked) {

    return <AppLockScreen onUnlock={() => setIsAppLocked(false)} lang={lang} />;

  }

  if (!currentUser && !isGuestMode) {

    return (

      <AuthPage 

        onContinueAsGuest={() => {

          try { localStorage.setItem('pulse_guest_mode', 'true'); } catch {}

          setIsGuestMode(true);

        }} 

      />

    );

  }

  if (currentUser?.isBanned) {

    return <BannedPage user={currentUser} />;

  }

  return (

    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">

      {/* Offline / Reconnect Banner */}

      {(((isOffline && (activeTab !== 'feed' || currentScreen !== null))) || showReconnected) && (

        <div 

          className={`sticky top-0 z-[100] px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold select-none transition-all ${

            isOffline 

              ? 'bg-[#18181D] text-neutral-300 border-b border-neutral-700/80 shadow-md' 

              : 'bg-neutral-900 text-white border-b border-neutral-700 shadow-md animate-fade-in'

          }`}

        >

          {isOffline ? (

            <>

              <WifiOff size={14} className="text-neutral-400 flex-shrink-0" />

              <span>أنت غير متصل بالإنترنت · يتم عرض النبضات المحفوظة محلياً</span>

            </>

          ) : (

            <>

              <Wifi size={14} className="text-white flex-shrink-0" />

              <span>تمت استعادة الاتصال بالإنترنت بنجاح</span>

            </>

          )}

        </div>

      )}

      {/* Main Content Area */}

      <main className="app-viewport-shell">

        <div key={currentScreen ? `scr-${currentScreen}` : `tab-${activeTab}`} className="screen-transition min-h-screen">

          {currentScreen === 'follow-list' && followListConfig ? (

          <FollowListPage

            user={followListConfig.user}

            initialType={followListConfig.initialType}

            currentUser={currentUser}

            onBack={() => setCurrentScreen(null)}

            onOpenUserProfile={handleOpenUserProfile}

            onToggleFollow={handleToggleFollow}

          />

        ) : currentScreen === 'user-profile' && viewedUserProfile ? (

          <ProfilePage

            user={viewedUserProfile}

            userPosts={posts}

            onBack={() => setCurrentScreen(null)}

            onLike={handleLike}

            onRepost={handleRepost}

            onOpenDetail={(post) => {

              setSelectedPost(post);

              setCurrentScreen('post-detail');

            }}

            onOpenSettings={() => setCurrentScreen('settings')}

            onOpenVerification={() => setCurrentScreen('verification')}

            onOpenShare={(p) => setSharePost(p)}

            onOpenReport={(p) => setReportPost(p)}

            onBlockUser={handleBlockUser}

            onDeletePost={handleDeletePost}

            onEditPost={handleEditPost}

            onToggleBookmark={handleToggleBookmark}

            onOpenFollowList={handleOpenFollowList}

            onOpenUserProfile={handleOpenUserProfile}

            onOpenContactsSync={handleOpenPioneers}

                onOpenMusic={() => setCurrentScreen('music')}

            onOpenChat={handleOpenChat}

            onOpenInsights={() => setCurrentScreen('insights')}

            onOpenAccountSwitcher={() => setShowAccountSwitcher(true)}

          />

        ) : currentScreen === 'post-detail' && selectedPost ? (

          <PostDetailPage

            post={selectedPost}

            currentUser={currentUser}

            onBack={() => {

              setCurrentScreen(previousScreen || null);

              setPreviousScreen(null);

            }}

            onLike={handleLike}

            onRepost={handleRepost}

            onOpenShare={(p) => setSharePost(p)}

            onOpenReport={(p) => setReportPost(p)}

            onBlockUser={handleBlockUser}

            onDeletePost={handleDeletePost}

            onEditPost={handleEditPost}

            onToggleBookmark={handleToggleBookmark}

            onOpenUserProfile={handleOpenUserProfile}

          />

        ) : currentScreen === 'settings' ? (

          <SettingsPage

            onBack={() => {
              setCurrentScreen(null);
              setSettingsInitialSubView(null);
            }}
            initialSubView={settingsInitialSubView}

            onOpenVerification={() => setCurrentScreen('verification')}

            onOpenTerms={() => setCurrentScreen('terms')}

            onOpenPrivacy={() => setCurrentScreen('privacy')}

            onOpenPioneers={handleOpenPioneers}

            onOpenAccountCenter={() => setCurrentScreen('account_center')}

            onOpenAccountsManager={() => setCurrentScreen('accounts_manager')}

            onOpenAdsManager={() => setCurrentScreen('ads_manager')}

            onOpenInsights={() => setCurrentScreen('insights')}

            onUpdateFound={(info) => setUpdateInfo(info)}

          />

        ) : currentScreen === 'ads_manager' ? (

          <AdsManagerPage

            onBack={() => setCurrentScreen('settings')}

            onOpenInsights={() => setCurrentScreen('insights')}

          />

        ) : currentScreen === 'account_center' ? (

          <AccountCenterPage

            onBack={() => setCurrentScreen('settings')}

          />

        ) : currentScreen === 'accounts_manager' ? (

          <AccountsManagerPage

            onBack={() => setCurrentScreen('settings')}

          />

        ) : currentScreen === 'terms' ? (

          <TermsOfServicePage

            onBack={() => setCurrentScreen('settings')}

          />

        ) : currentScreen === 'privacy' ? (

          <PrivacyPolicyPage

            onBack={() => setCurrentScreen('settings')}

          />

        ) : currentScreen === 'change_password' ? (

          <ChangePasswordPage

            onBack={() => setCurrentScreen(null)}

          />

        ) : currentScreen === 'edit_profile' ? (

          <EditProfilePage

            onBack={() => setCurrentScreen(null)}

          />

        ) : currentScreen === 'verification' ? (

          <VerificationPage

            onBack={() => setCurrentScreen(null)}

            onOpenCompose={() => setIsComposeOpen(true)}

          />

        ) : currentScreen === 'messages' ? (

          <MessagesPage

            currentUser={currentUser}

            onBack={() => setCurrentScreen(null)}

            onOpenChat={handleOpenChat}

            onOpenUserProfile={handleOpenUserProfile}

          />

        ) : currentScreen === 'chat' && activeChatRecipient ? (

          <ChatConversationPage

            recipient={activeChatRecipient}

            currentUser={currentUser}

            onBack={() => setCurrentScreen('messages')}

            onOpenUserProfile={handleOpenUserProfile}

            onOpenDetail={handleOpenDetail}

            onBlockUser={handleBlockUser}

          />

        ) : currentScreen === 'pioneers' ? (

          <PioneersPage

            currentUser={currentUser}

            onBack={() => setCurrentScreen(null)}

            onOpenUserProfile={handleOpenUserProfile}

          />

        ) : currentScreen === 'music' ? (

          <MusicPage

            currentUser={currentUser}

            onBack={() => {

              soundService.stopPreview();

              setCurrentScreen(previousScreen || null);

            }}

            onSelectMusicForCompose={(track) => {

              soundService.stopPreview();

              setComposeInitialMusic(track);

              setCurrentScreen(null);

              setIsComposeOpen(true);

            }}

          />

        ) : currentScreen === 'insights' ? (

          <InsightsPage

            currentUser={currentUser}

            userPosts={posts}

            onBack={() => setCurrentScreen(null)}

          />

        ) : (

          /* Normal Tab Content */

          <>

            {activeTab === 'feed' && (

              <FeedPage

                posts={posts}

                currentUser={currentUser}

                onLike={handleLike}

                onRepost={handleRepost}

                onOpenDetail={(post) => {

                  setSelectedPost(post);

                  setCurrentScreen('post-detail');

                }}

                onOpenCompose={() => setIsComposeOpen(true)}

                onOpenSettings={() => setCurrentScreen('settings')}

                onOpenVerification={() => setCurrentScreen('verification')}

                onOpenShare={(p) => setSharePost(p)}

                onOpenReport={(p) => setReportPost(p)}

                onBlockUser={handleBlockUser}

                onDeletePost={handleDeletePost}

                onEditPost={handleEditPost}

                onToggleBookmark={handleToggleBookmark}

                onOpenUserProfile={handleOpenUserProfile}

                onOpenContactsSync={handleOpenPioneers}

                onOpenCreateSpace={() => setIsCreateSpaceOpen(true)}

                onOpenSpace={(sp) => {

                  setActiveSpace(sp);

                  setIsSpaceMinimized(false);

                }}

                activeSpaceId={activeSpace?.id}

                onOpenMessages={handleOpenMessages}

                unreadDmCount={unreadDmCount}

                onLoadOlderPosts={handleLoadOlderPosts}

                hasMorePosts={hasMorePosts}

                isLoadingOlder={isLoadingOlder}

                onRefresh={async () => {

                  try {

                    let fresh = [];

                    if (navigator.onLine) {

                      fresh = await storageService.fetchLivePosts();

                    }

                    if (!fresh || fresh.length === 0) {

                      fresh = storageService.getPosts();

                    }

                    if (fresh && fresh.length > 0) {

                      setPosts(fresh);

                      await offlineCacheService.cacheFeedPosts(fresh);

                    }

                    setHasMorePosts(true);

                  } catch (e) {

                    console.warn('Refresh error:', e);

                  }

                }}

              />

            )}

            {activeTab === 'explore' && (

              <ExplorePage

                currentUserId={currentUser.uid}

                currentUser={currentUser}

                onLike={handleLike}

                onRepost={handleRepost}

                onOpenDetail={(post) => {

                  setSelectedPost(post);

                  setCurrentScreen('post-detail');

                }}

                onOpenShare={(p) => setSharePost(p)}

                onOpenReport={(p) => setReportPost(p)}

                onBlockUser={handleBlockUser}

                onDeletePost={handleDeletePost}

                onEditPost={handleEditPost}

                onToggleBookmark={handleToggleBookmark}

                onOpenUserProfile={handleOpenUserProfile}

              />

            )}

            {activeTab === 'activity' && (

              <NotificationsPage

                onOpenDetail={(post) => {

                  setSelectedPost(post);

                  setCurrentScreen('post-detail');

                }}

                onOpenUserProfile={handleOpenUserProfile}

                onOpenChangePassword={() => setCurrentScreen('change_password')}

              />

            )}

            {activeTab === 'profile' && (

              <ProfilePage

                userPosts={posts}

                onLike={handleLike}

                onRepost={handleRepost}

                onOpenDetail={(post) => {

                  setSelectedPost(post);

                  setCurrentScreen('post-detail');

                }}

                onOpenSettings={() => setCurrentScreen('settings')}

                onOpenVerification={() => setCurrentScreen('verification')}

                onOpenShare={(p) => setSharePost(p)}

                onOpenReport={(p) => setReportPost(p)}

                onBlockUser={handleBlockUser}

                onDeletePost={handleDeletePost}

                onEditPost={handleEditPost}

                onToggleBookmark={handleToggleBookmark}

                onOpenFollowList={handleOpenFollowList}

                onOpenUserProfile={handleOpenUserProfile}

                onOpenContactsSync={handleOpenPioneers}

                onOpenChat={handleOpenChat}

                onOpenInsights={() => setCurrentScreen('insights')}

                onOpenAccountSwitcher={() => setShowAccountSwitcher(true)}

              />

            )}

          </>

        )}

        </div>

      </main>

      {/* Bottom Navigation (shown when no deep subscreen is active) */}

      {!currentScreen && (

        <Navbar

          activeTab={activeTab}

          hasUnreadNotifications={unreadNotifCount > 0}

          currentUserAvatar={currentUser ? resolveAvatar(currentUser?.avatar) : null}

          currentUser={currentUser}

          onOpenAuth={() => setShowAuthModal(true)}

          hasOtherAccountUnread={savedAccounts.some((a) => a.uid !== currentUser?.uid && ((a.unreadNotifications || 0) + (a.unreadMessages || 0) > 0))}

          onOpenAccountSwitcher={() => {

            if (!currentUser) setShowAuthModal(true);

            else setShowAccountSwitcher(true);

          }}

          onTabChange={(tab) => {

            if (!currentUser && (tab === 'activity' || tab === 'profile')) {

              setShowAuthModal(true);

              return;

            }

            if (tab === 'activity' && currentUser?.uid) {

              notificationService.markAllAsRead(currentUser.uid);

              setUnreadNotifCount(0);

            }

            setActiveTab(tab);

            setCurrentScreen(null);

          }}

          onOpenCompose={() => {

            if (!currentUser) {

              setShowAuthModal(true);

              return;

            }

            setIsComposeOpen(true);

          }}

        />

      )}

      {/* Global Quick Account Switcher Bottom Sheet (PULSE Native Style) */}

      <AccountSwitcherBottomSheet

        isOpen={showAccountSwitcher}

        onClose={() => setShowAccountSwitcher(false)}

        onOpenAccountsManager={() => {

          setShowAccountSwitcher(false);

          setCurrentScreen('accounts_manager');

        }}

      />

      {/* Floating Mini Space Player when room is minimized */}

      {activeSpace && isSpaceMinimized && (

        <MiniSpacePlayer

          space={activeSpace}

          currentUser={currentUser}

          onExpand={() => setIsSpaceMinimized(false)}

          onLeave={() => {

            setActiveSpace(null);

            setIsSpaceMinimized(false);

          }}

        />

      )}

      {/* Live Space Full Screen Interactive Room */}

      {activeSpace && !isSpaceMinimized && (

        <LiveSpaceRoom

          space={activeSpace}

          currentUser={currentUser}

          onMinimize={() => setIsSpaceMinimized(true)}

          onClose={() => {

            setActiveSpace(null);

            setIsSpaceMinimized(false);

          }}

          onSpaceEnded={(post) => {

            if (post) setPosts((prev) => [post, ...prev]);

          }}

        />

      )}

      {/* Real Compose Modal */}

      <ComposeModal

        isOpen={isComposeOpen}

        onClose={() => {

          setIsComposeOpen(false);

          setComposeInitialMusic(null);

          setComposeInitialMedia(null);

        }}

        currentUser={currentUser}

        onPublish={handlePublish}

        initialMusic={composeInitialMusic}

        initialMedia={composeInitialMedia}

      />

      {/* Deep Link Share Preview Modal */}

      <SharePreviewModal

        isOpen={!!sharePost}

        onClose={() => setSharePost(null)}

        post={sharePost}

        currentUser={currentUser}

      />

      {/* Content Reporting Modal with instant client-side moderation */}

      <ReportModal

        isOpen={!!reportPost}

        onClose={() => setReportPost(null)}

        post={reportPost}

        currentUser={currentUser}

        onReportSubmitted={handleReportSubmitted}

      />

      {/* Floating Mini Audio Player (Global dock above navbar) */}

      <MiniAudioPlayer isSpaceActive={Boolean(activeSpace)} />

      {/* In-App Auto Updater Modal */}

      <UpdateModal

        updateInfo={updateInfo}

        onClose={() => setUpdateInfo(null)}

      />

      {/* Create Live Space Modal */}

      <CreateSpaceModal

        isOpen={isCreateSpaceOpen}

        onClose={() => setIsCreateSpaceOpen(false)}

        currentUser={currentUser}

        onSpaceCreated={(space) => {

          setActiveSpace(space);

          setIsSpaceMinimized(false);

        }}

      />

      {/* Guest Auth Modal */}

      {showAuthModal && (

        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">

          <div className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto bg-black border border-[#26262A] rounded-3xl p-4 sm:p-6 shadow-2xl animate-scale-up">

            <AuthPage 

              isModal={true} 

              onClose={() => setShowAuthModal(false)} 

              onContinueAsGuest={() => setShowAuthModal(false)}

            />

          </div>

        </div>

      )}

    </div>

  );

}

function AppContent() {

  const { language } = useLanguage();

  return (

    <SafeLinkProvider lang={language}>

      <MainApp />

    </SafeLinkProvider>

  );

}

export default function App() {

  return (

    <ErrorBoundary>

      <LanguageProvider>

        <AuthProvider>

          <ToastProvider>

            <AppContent />

          </ToastProvider>

        </AuthProvider>

      </LanguageProvider>

    </ErrorBoundary>

  );

}

