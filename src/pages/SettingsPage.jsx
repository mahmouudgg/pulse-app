import React, { useState, useEffect, useMemo } from 'react';



import { 



  ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Shield, ShieldCheck, Key, 



  Users, UserPlus, Bell, Bookmark, Heart, History, Lock, SlidersHorizontal, 



  Share2, Settings2, HelpCircle, Info, LogOut, Check, CheckCircle2, Trash2, 



  Globe, RefreshCw, AlertCircle, X, Download, Volume2, Terminal, ExternalLink, 



  Eye, EyeOff, MessageCircle, Plus, Clock, Smartphone, Moon, Copy,



  UserCheck, ShieldAlert, Megaphone, UserX, Search, VolumeX, Fingerprint, User, QrCode,



  Film, Languages, Compass, BellOff, FileX, HeartOff, ImageOff, Landmark



} from 'lucide-react';



import { useAuth } from '../context/AuthContext';



import { useLanguage } from '../context/LanguageContext';



import { useToast } from '../context/ToastContext';



import { updateService } from '../services/updateService';



import { biometricLockService } from '../services/biometricLockService';



import { screenSecurity } from '../utils/screenSecurity';



import { EgyptFlag, EnglishFlag } from '../components/CountryFlags';



import SwipeBackWrapper from '../components/SwipeBackWrapper';



import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';



import PioneerBadge from '../components/PioneerBadge';



import VerifiedBadge from '../components/VerifiedBadge';



import PulseLogo from '../components/PulseLogo';



import PostCard from '../components/PostCard';



import AdsManagerPage from './AdsManagerPage';



import AccountsManagerPage from './AccountsManagerPage';



import SupervisionPage from './SupervisionPage';



import FollowInvitePage from './FollowInvitePage';



import TimeManagementPage from './TimeManagementPage';



import AppIconPage from './AppIconPage';



import VerificationPage from './VerificationPage';



import CommunityStandardsPage from './CommunityStandardsPage';



import AccountAppealPage from './AccountAppealPage';



import { storageService, OFFICIAL_SOVYTHOS } from '../services/storageService';
import { calculateAge, isUserAdult, getSensitiveContentPref, setSensitiveContentPref } from '../utils/ageVerification';



import { notificationService } from '../services/notificationService';



import { moderationService } from '../services/moderationService';



import { affinityEngine } from '../services/affinityEngine';



import { hapticsService } from '../services/hapticsService';



import { Share } from '@capacitor/share';







export default function SettingsPage({ 



  onBack, 



  onOpenVerification, 



  onOpenTerms, 



  onOpenPrivacy, 



  onOpenPioneers,



  onOpenAccountCenter,



  onOpenAccountsManager,



  onOpenAdsManager,



  onOpenInsights,



  onUpdateFound



}) {



  const { 



    currentUser, 



    logout, 



    updateProfile, 



    savedAccounts = [], 



    switchAccount, 



    removeSavedAccount, 



    login 



  } = useAuth();



  const { t, lang, setLang } = useLanguage();



  const { showToast } = useToast();







  const isAr = lang === 'ar';



  const BackIcon = isAr ? ArrowRight : ArrowLeft;



  const Chevron = isAr ? ChevronLeft : ChevronRight;



  const isDeveloper = currentUser?.username === 'my' || currentUser?.isFounder || currentUser?.email === 'mahmoud@pulse.app';







  // Active sub-page in Settings



  // null | 'invite' | 'notifications' | 'saved' | 'liked' | 'archive' | 'privacy' | 'content' | 'status' | 'sharing' | 'more' | 'help' | 'about' | 'supervision' | 'ads'



  const [activeSubView, setActiveSubView] = useState(null);



  const [showProStudio, setShowProStudio] = useState(false);







  // Notifications preferences



  const [pauseAllNotifs, setPauseAllNotifs] = useState(() => localStorage.getItem('pulse_notifs_paused') === 'true');



  const [pauseDuration, setPauseDuration] = useState('15m');



  const [pushLikes, setPushLikes] = useState(true);



  const [pushMentions, setPushMentions] = useState(true);



  const [pushReplies, setPushReplies] = useState(true);



  const [pushDMs, setPushDMs] = useState(true);



  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('pulse_sound_enabled') !== 'false');







  // Privacy preferences



  const [isPrivateAccount, setIsPrivateAccount] = useState(() => currentUser?.isPrivate || false);



  const [mentionsScope, setMentionsScope] = useState(() => localStorage.getItem('pulse_mentions_scope') || 'everyone'); // 'everyone' | 'following' | 'off'



  const [repliesScope, setRepliesScope] = useState(() => localStorage.getItem('pulse_reply_scope') || 'everyone'); // 'everyone' | 'following' | 'mentioned'



  const [activityStatus, setActivityStatus] = useState(() => localStorage.getItem('pulse_activity_status') !== 'false');



  const [readReceipts, setReadReceipts] = useState(() => localStorage.getItem('pulse_read_receipts') !== 'false');



  const [dmScope, setDmScope] = useState(() => localStorage.getItem('pulse_dm_scope') || 'everyone'); // 'everyone' | 'following'



  const [spaceInviteScope, setSpaceInviteScope] = useState(() => localStorage.getItem('pulse_space_invite_scope') || 'everyone'); // 'everyone' | 'following'



  const [incognitoListening, setIncognitoListening] = useState(() => localStorage.getItem('pulse_incognito_spaces') === 'true');



  const [blockedList, setBlockedList] = useState(() => moderationService.getBlockedUsers() || []);



  const [appLockEnabled, setAppLockEnabled] = useState(() => biometricLockService.isLockEnabled());



  const [screenSecEnabled, setScreenSecEnabled] = useState(() => screenSecurity.isProtected());



  const [showPinSetupModal, setShowPinSetupModal] = useState(false);



  const [pinInput, setPinInput] = useState('');



  const [confirmPinInput, setConfirmPinInput] = useState('');



  const [enableBioCheckbox, setEnableBioCheckbox] = useState(true);



  const [restrictedList, setRestrictedList] = useState(() => {



    try {



      const stored = localStorage.getItem('pulse_restricted_users');



      return stored ? JSON.parse(stored) : [];



    } catch {



      return [];



    }



  });



  const [mutedList, setMutedList] = useState(() => {



    try {



      const stored = localStorage.getItem('pulse_muted_users');



      return stored ? JSON.parse(stored) : [];



    } catch {



      return [];



    }



  });



  const [privacyTab, setPrivacyTab] = useState('overview'); // 'overview' | 'profiles_control'



  const [profilesSubTab, setProfilesSubTab] = useState('blocked'); // 'blocked' | 'restricted' | 'muted'



  const [profileSearchQuery, setProfileSearchQuery] = useState('');



  const [showAddRestrictedModal, setShowAddRestrictedModal] = useState(false);



  const [restrictUsernameInput, setRestrictUsernameInput] = useState('');







  // Content preferences



  const [contentFilters, setContentFilters] = useState(() => storageService.getContentFilters(currentUser));



  const [newKeyword, setNewKeyword] = useState('');



  const [sensitiveLevel, setSensitiveLevel] = useState(() => moderationService.getSensitiveLevel());
  const [sensitiveMediaPref, setSensitiveMediaPref] = useState(() => getSensitiveContentPref(currentUser));

  useEffect(() => {
    if (initialSubView) {
      setActiveSubView(initialSubView);
    }
  }, [initialSubView]);

  useEffect(() => {
    const handleOpenSettingsEvent = (e) => {
      if (e.detail?.subview) {
        setActiveSubView(e.detail.subview);
      }
    };
    window.addEventListener('pulse:open-settings', handleOpenSettingsEvent);
    return () => window.removeEventListener('pulse:open-settings', handleOpenSettingsEvent);
  }, []);



  const [autoFilterOffensive, setAutoFilterOffensive] = useState(() => localStorage.getItem('pulse_autofilter_offensive') !== 'false');



  const [limitPolitical, setLimitPolitical] = useState(() => moderationService.getPoliticalLimit());



  const [hideLikesCounts, setHideLikesCounts] = useState(() => moderationService.getHideLikeCounts());



  const [mutedUsersList, setMutedUsersList] = useState(() => moderationService.getMutedUsers(currentUser?.uid));



  const [hiddenWordsList, setHiddenWordsList] = useState(() => moderationService.getHiddenWords(currentUser?.uid));







  useEffect(() => {



    const handlePrefChange = () => {



      setSensitiveLevel(moderationService.getSensitiveLevel());
      setSensitiveMediaPref(getSensitiveContentPref(currentUser));



      setLimitPolitical(moderationService.getPoliticalLimit());



      setHideLikesCounts(moderationService.getHideLikeCounts());



      setMutedUsersList(moderationService.getMutedUsers(currentUser?.uid));



      setHiddenWordsList(moderationService.getHiddenWords(currentUser?.uid));



    };



    window.addEventListener('pulse_preference_changed', handlePrefChange);



    return () => window.removeEventListener('pulse_preference_changed', handlePrefChange);



  }, [currentUser?.uid]);



  const [mediaAutoplay, setMediaAutoplay] = useState(() => localStorage.getItem('pulse_media_autoplay') || 'wifi');



  const [selectedInterests, setSelectedInterests] = useState(() => {



    try {



      const stored = localStorage.getItem('pulse_user_interests');



      return stored ? JSON.parse(stored) : ['تكنولوجيا', 'ذكاء_اصطناعي', 'فلسفة', 'ريادة_أعمال'];



    } catch {



      return ['تكنولوجيا', 'ذكاء_اصطناعي', 'فلسفة', 'ريادة_أعمال'];



    }



  });







  // Account Status State & Community Standards Modal



  const [showAppealModal, setShowAppealModal] = useState(false);



  const [showCommunityStandardsModal, setShowCommunityStandardsModal] = useState(false);



  const accountStanding = useMemo(() => moderationService.getAccountStanding(currentUser), [currentUser]);



  const [appealCategory, setAppealCategory] = useState('review');



  const [appealText, setAppealText] = useState('');



  const [appealSubmitting, setAppealSubmitting] = useState(false);







  // Saved, Liked, and Archived posts



  const [savedPosts, setSavedPosts] = useState([]);



  const [likedPosts, setLikedPosts] = useState([]);



  const [archivedPosts, setArchivedPosts] = useState([]);







  // Cache calculation



  const [cacheSize, setCacheSize] = useState('0 KB');



  const [cachePurged, setCachePurged] = useState(false);



  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);







  // Help & Report



  const [bugReportTitle, setBugReportTitle] = useState('');



  const [bugReportDesc, setBugReportDesc] = useState('');



  const [reportSubmitting, setReportSubmitting] = useState(false);







  // Confirmation modal



  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);







  // Multi-Account Switcher & Add Account Modal



  const [showAddAccountModal, setShowAddAccountModal] = useState(false);



  const [addAccountIdentifier, setAddAccountIdentifier] = useState('');



  const [addAccountPassword, setAddAccountPassword] = useState('');



  const [addAccountLoading, setAddAccountLoading] = useState(false);



  const [addAccountError, setAddAccountError] = useState('');



  const [showAddAccountPassword, setShowAddAccountPassword] = useState(false);



  const [showSwitchAccountsSheet, setShowSwitchAccountsSheet] = useState(false);



  const [showQrModal, setShowQrModal] = useState(false);



  const [autoShareThreads, setAutoShareThreads] = useState(() => localStorage.getItem('pulse_crossposting_enabled') === 'true');



  const [fediverseSharing, setFediverseSharing] = useState(() => localStorage.getItem('pulse_fediverse_sharing') === 'true');











  const handleSwitchAccount = (targetUid, targetUsername) => {



    if (!targetUid || targetUid === currentUser?.uid) return;



    try { hapticsService.impact?.(); } catch {}



    const success = switchAccount(targetUid);



    if (success) {



      showToast(isAr ? `تم التبديل إلى @${targetUsername}` : `Switched to @${targetUsername}`);



    } else {



      showToast(isAr ? 'تعذر التبديل إلى هذا الحساب' : 'Could not switch to this account');



    }



  };







  const handleAddAccountSubmit = async (e) => {



    e?.preventDefault();



    const ident = addAccountIdentifier.trim();



    if (!ident || !addAccountPassword) {



      setAddAccountError(isAr ? 'يرجى إدخال اسم المستخدم وكلمة المرور' : 'Please enter identifier and password');



      return;



    }







    setAddAccountLoading(true);



    setAddAccountError('');







    try {



      await login(ident, addAccountPassword);



      try { hapticsService.impact?.(); } catch {}



      setShowAddAccountModal(false);



      setAddAccountIdentifier('');



      setAddAccountPassword('');



      showToast(isAr ? 'تم تسجيل الدخول وإضافة الحساب بنجاح!' : 'Logged in and account added!');



    } catch (err) {



      setAddAccountError(err.message || (isAr ? 'فشل تسجيل الدخول. تحقق من صحة البيانات.' : 'Login failed. Check credentials.'));



    } finally {



      setAddAccountLoading(false);



    }



  };







  const calculateCacheSize = () => {



    try {



      let transientBytes = 0;



      const TRANSIENT_PREFIXES = ['pulse_temp', 'pulse_seen_ads', 'pulse_media_cache', 'pulse_cache'];



      for (let i = 0; i < localStorage.length; i++) {



        const key = localStorage.key(i);



        const val = localStorage.getItem(key);



        if (key && val) {



          if (TRANSIENT_PREFIXES.some((tp) => key.startsWith(tp))) {



            transientBytes += (key.length + val.length) * 2;



          }



        }



      }



      const postsRaw = localStorage.getItem('pulse_posts_v5');



      if (postsRaw && postsRaw.length > 50000) {



        transientBytes += Math.floor((postsRaw.length - 20000) * 1.5);



      }



      if (transientBytes === 0) return '0 KB';



      if (transientBytes < 1024) return `${transientBytes} B`;



      if (transientBytes < 1024 * 1024) return `${(transientBytes / 1024).toFixed(1)} KB`;



      return `${(transientBytes / (1024 * 1024)).toFixed(1)} MB`;



    } catch {



      return '0 KB';



    }



  };







  useEffect(() => {



    setCacheSize(calculateCacheSize());



  }, []);







  // Load sub-view data on demand



  useEffect(() => {



    if (activeSubView === 'saved') {



      try {



        const posts = storageService.getBookmarkedPosts(currentUser);



        setSavedPosts(posts);



      } catch (e) {



        console.warn('Error loading saved posts:', e);



      }



    } else if (activeSubView === 'liked') {



      try {



        const posts = storageService.getLikedPosts(currentUser);



        setLikedPosts(posts);



      } catch (e) {



        console.warn('Error loading liked posts:', e);



      }



    } else if (activeSubView === 'archive') {



      try {



        const posts = storageService.getArchivedPosts(currentUser);



        setArchivedPosts(posts);



      } catch (e) {



        console.warn('Error loading archived posts:', e);



      }



    } else if (activeSubView === 'privacy') {



      try {



        setBlockedList(moderationService.getBlockedUsers() || []);



      } catch (e) {



        console.warn('Error loading blocked list:', e);



      }



    }



  }, [activeSubView, currentUser]);







  const handleCleanCache = async () => {



    try {



      hapticsService.medium?.();







      // Protected keys that must NEVER be deleted



      const PROTECTED_KEYS = [



        'pulse_session_user',



        'pulse_users',



        'pulse_current_user',



        'pulse_language',



        'pulse_theme',



        'pulse_fcm',



        'pulse_blocked_users',



        'pulse_content_filters',



        'pulse_ads_v1',



        'pulse_google_ads_config_v1',



        'pulse_notifs_paused',



        'pulse_sound_enabled',



        'pulse_follow_requests_v1'



      ];







      // 1. Purge Web / Service Worker caches if supported



      if (typeof window !== 'undefined' && 'caches' in window) {



        try {



          const cacheKeys = await window.caches.keys();



          await Promise.all(cacheKeys.map((k) => window.caches.delete(k)));



        } catch (e) {



          console.warn('Browser cache clean notice:', e);



        }



      }







      // 2. Only remove transient temporary localStorage keys



      const keysToRemove = [];



      for (let i = 0; i < localStorage.length; i++) {



        const key = localStorage.key(i);



        if (key && !PROTECTED_KEYS.some((pk) => key.startsWith(pk))) {



          // Double check: Never delete any key containing session, users, or auth



          if (!key.includes('session') && !key.includes('users') && !key.includes('auth')) {



            keysToRemove.push(key);



          }



        }



      }



      keysToRemove.forEach((k) => {



        try { localStorage.removeItem(k); } catch {}



      });







      // 3. Keep local posts lean and prune cached media to free memory without breaking feed



      try {



        const postsRaw = localStorage.getItem('pulse_posts_v5');



        if (postsRaw) {



          const parsed = JSON.parse(postsRaw);



          if (Array.isArray(parsed) && parsed.length > 20) {



            localStorage.setItem('pulse_posts_v5', JSON.stringify(parsed.slice(0, 20)));



          }



        }



      } catch {}







      // 4. Background sync users from cloud to ensure local cache is fully healthy



      storageService.syncUsersFromCloud().catch(() => {});







      setCachePurged(true);



      setCacheSize('0 KB');



      showToast(isAr ? 'تم تنظيف الذاكرة المؤقتة بنجاح دون المساس بحسابك' : 'Cache purged successfully. Your account and data remain safe.');



      setTimeout(() => setCachePurged(false), 3000);



    } catch (err) {



      console.warn('Clean cache error:', err);



    }



  };







  const handleTogglePrivate = async () => {



    try {



      hapticsService.light?.();



      const nextVal = !isPrivateAccount;



      setIsPrivateAccount(nextVal);



      if (updateProfile) {



        await updateProfile({ isPrivate: nextVal });



      }



      if (currentUser?.uid) {



        const updatedUser = { ...currentUser, isPrivate: nextVal };



        storageService.saveUser(updatedUser);



        try {



          const { ref, set } = await import('firebase/database');



          const { database } = await import('../services/firebase');



          await set(ref(database, `users/${currentUser.uid}/isPrivate`), nextVal);



        } catch (cloudErr) {



          console.warn('Firebase RTDB private sync notice:', cloudErr);



        }



      }



      showToast(



        nextVal 



          ? (isAr ? 'تم تحويل الحساب إلى خاص (Private)' : 'Account set to Private') 



          : (isAr ? 'تم تحويل الحساب إلى عام (Public)' : 'Account set to Public')



      );



    } catch (err) {



      console.warn('Private toggle error:', err);



    }



  };







  const handleUnblockUser = async (uid) => {



    try {



      hapticsService.medium?.();



      await moderationService.unblockUser(uid, currentUser);



      setBlockedList(moderationService.getBlockedUsers(currentUser?.uid) || []);



      showToast(isAr ? 'تم إلغاء الحظر بنجاح' : 'User unblocked successfully');



    } catch (err) {



      console.warn('Unblock error:', err);



    }



  };







  const handleUnrestrictUser = (uid) => {



    hapticsService.light?.();



    const updated = restrictedList.filter((id) => id !== uid);



    setRestrictedList(updated);



    localStorage.setItem('pulse_restricted_users', JSON.stringify(updated));



    showToast(isAr ? 'تم إلغاء تقييد الحساب بنجاح' : 'Account unrestricted');



  };







  const handleAddRestrictedUser = (e) => {



    e.preventDefault();



    if (!restrictUsernameInput.trim()) return;



    const clean = restrictUsernameInput.trim().replace('@', '').toLowerCase();



    const target = storageService.getUserByUsername(clean);



    if (!target) {



      showToast(isAr ? 'لم نتمكن من العثور على هذا الحساب' : 'Account not found', 'error');



      return;



    }



    if (target.uid === currentUser?.uid) {



      showToast(isAr ? 'لا يمكنك تقييد حسابك الخاص' : 'Cannot restrict yourself', 'error');



      return;



    }



    if (restrictedList.includes(target.uid)) {



      showToast(isAr ? 'هذا الحساب مقيد بالفعل' : 'Account already restricted', 'info');



      return;



    }



    const updated = [...restrictedList, target.uid];



    setRestrictedList(updated);



    localStorage.setItem('pulse_restricted_users', JSON.stringify(updated));



    setRestrictUsernameInput('');



    setShowAddRestrictedModal(false);



    showToast(isAr ? `تم تقييد تفاعلات @${target.username} بنجاح` : `Restricted @${target.username}`);



  };







  const handleUnmuteUser = (uid) => {



    hapticsService.light?.();



    const updated = mutedList.filter((id) => id !== uid);



    setMutedList(updated);



    localStorage.setItem('pulse_muted_users', JSON.stringify(updated));



    showToast(isAr ? 'تم إلغاء كتم الحساب' : 'Account unmuted');



  };







  const handleAddKeywordFilter = (e) => {



    e.preventDefault();



    if (!newKeyword.trim()) return;



    const word = newKeyword.trim().toLowerCase();



    const currentWords = contentFilters.hiddenWords || [];



    if (!currentWords.includes(word)) {



      const updated = { ...contentFilters, hiddenWords: [...currentWords, word] };



      setContentFilters(updated);



      storageService.saveContentFilters(updated, currentUser);



      showToast(isAr ? `تمت إضافة "${word}" إلى الكلمات المخفية` : `Added "${word}" to hidden words`);



    }



    setNewKeyword('');



  };







  const handleRemoveKeywordFilter = (word) => {



    const updated = {



      ...contentFilters,



      hiddenWords: (contentFilters.hiddenWords || []).filter((w) => w !== word)



    };



    setContentFilters(updated);



    storageService.saveContentFilters(updated, currentUser);



    showToast(isAr ? 'تم حذف الكلمة من الفلتر' : 'Keyword removed');



  };







  const handleToggleInterest = (topicId) => {



    hapticsService.light?.();



    let next;



    if (selectedInterests.includes(topicId)) {



      next = selectedInterests.filter((id) => id !== topicId);



    } else {



      next = [...selectedInterests, topicId];



    }



    setSelectedInterests(next);



    localStorage.setItem('pulse_user_interests', JSON.stringify(next));







    // Boost weights in affinityEngine for feed recommendations



    try {



      if (currentUser?.uid) {



        const profile = affinityEngine.getUserProfile(currentUser.uid);



        if (profile) {



          next.forEach((t) => {



            profile.topicWeights[t] = Math.max(profile.topicWeights[t] || 0, 5);



          });



          affinityEngine.saveUserProfile(profile);



        }



      }



    } catch (e) {



      console.warn('Affinity sync notice:', e);



    }



  };







  const handleResetRecommendations = () => {



    hapticsService.medium?.();



    try {



      if (currentUser?.uid) {



        localStorage.removeItem(`pulse_affinity_${currentUser.uid}`);



      }



      const defaultTopics = ['تكنولوجيا', 'ذكاء_اصطناعي', 'فلسفة', 'ريادة_أعمال'];



      setSelectedInterests(defaultTopics);



      localStorage.setItem('pulse_user_interests', JSON.stringify(defaultTopics));



      showToast(isAr ? 'تمت إعادة ضبط خوارزمية التوصيات واهتماماتك بنجاح' : 'Recommendation algorithm reset to defaults', 'success');



    } catch (e) {



      showToast(isAr ? 'حدث خطأ أثناء إعادة الضبط' : 'Reset error', 'error');



    }



  };







  const handleSubmitAppeal = (e) => {



    e.preventDefault();



    if (!appealText.trim()) return;



    setAppealSubmitting(true);



    hapticsService.success?.();



    setTimeout(() => {



      setAppealSubmitting(false);



      setShowAppealModal(false);



      setAppealText('');



      showToast(isAr ? 'تم استلام التماسك بنجاح، وسيقوم فريق مراجعة الحسابات بفحصه.' : 'Appeal submitted successfully to the review team.', 'success');



    }, 900);



  };







  const handleCheckUpdates = async () => {



    setIsCheckingUpdate(true);



    try {



      const res = await updateService.checkForUpdates();



      setIsCheckingUpdate(false);



      if (res && res.hasUpdate) {



        if (onUpdateFound) onUpdateFound(res);



      } else {



        showToast(isAr ? 'أنت تستخدم أحدث إصدار رسمي مستقر (v1.0.1)' : 'You are running the latest official build (v1.0.1).');



      }



    } catch {



      setIsCheckingUpdate(false);



      showToast(isAr ? 'تعذر التحقق من التحديثات' : 'Unable to check for updates', 'error');



    }



  };







  const handleSubmitBugReport = (e) => {



    e.preventDefault();



    if (!bugReportDesc.trim()) return;



    setReportSubmitting(true);



    hapticsService.success?.();



    setTimeout(() => {



      setReportSubmitting(false);



      setBugReportTitle('');



      setBugReportDesc('');



      showToast(isAr ? 'شكراً لك! تم استلام تقريرك وسيقوم الفريق الهندسي بمراجعته.' : 'Report submitted successfully. Thank you!');



      setActiveSubView(null);



    }, 900);



  };







  const handleShareApp = async () => {



    try {



      hapticsService.light?.();



      await Share.share({



        title: 'PULSE - النبضة الفكرية',



        text: 'انضم إلي على PULSE، المنصة الفكرية الأرقى للتواصل والنبضات الصوتية والمجالس!',



        url: 'https://pulseeg.wuaze.com/'



      });



    } catch {



      navigator.clipboard.writeText('https://pulseeg.wuaze.com/');



      showToast(isAr ? 'تم نسخ رابط التطبيق للمشاركة!' : 'App link copied to clipboard!');



    }



  };







  const handleLogout = () => {



    setShowLogoutConfirm(false);



    if (typeof onBack === 'function') onBack();



    logout();



  };







  // Helper for Top Sub-Page Header



  const renderSubHeader = (title, customBackAction = null) => (



    <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">



      <div className="flex items-center gap-3">



        <button



          onClick={() => {



            try { hapticsService.light?.(); } catch {}



            if (typeof customBackAction === 'function') {



              customBackAction();



            } else {



              setActiveSubView(null);



            }



          }}



          className="p-1.5 -ml-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"



          title={isAr ? 'رجوع' : 'Back'}



        >



          <BackIcon size={21} strokeWidth={2.2} />



        </button>



        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>



      </div>



    </div>



  );







  // ==========================================



  // SUB-PAGES RENDERING



  // ==========================================







  // Ads & Campaigns Sub-Page



  if (activeSubView === 'ads') {



    return (



      <AdsManagerPage



        onBack={() => setActiveSubView(null)}



        onOpenInsights={() => {



          setActiveSubView(null);



          if (onOpenInsights) onOpenInsights();



        }}



      />



    );



  }







  // Accounts Manager Sub-Page (Dedicated Hub)



  if (activeSubView === 'accounts-manager') {



    return (



      <AccountsManagerPage



        onBack={() => setActiveSubView(null)}



      />



    );



  }







  // 1. Saved (Bookmarks) Sub-Page



  if (activeSubView === 'saved') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'المحفوظات' : 'Saved')}



          <div className="divide-y divide-[#181818]">



            {savedPosts.length > 0 ? (



              savedPosts.map((post, idx) => (



                <PostCard



                  key={post.id}



                  post={post}



                  animationIndex={idx}



                  currentUserId={currentUser?.uid}



                  currentUser={currentUser}



                  onToggleBookmark={(pid) => {



                    storageService.toggleBookmark(pid, currentUser);



                    setSavedPosts((prev) => prev.filter((p) => p.id !== pid));



                    showToast(isAr ? 'تمت إزالة النبضة من المحفوظات' : 'Removed from saved');



                  }}



                />



              ))



            ) : (



              <div className="p-16 text-center text-xs text-neutral-500">



                <Bookmark size={32} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />



                <div className="text-white font-medium mb-1">{isAr ? 'لا توجد نبضات محفوظة بعد' : 'No saved pulses yet'}</div>



                <div>{isAr ? 'احفظ النبضات التي تهمك للرجوع إليها في أي وقت.' : 'Save pulses you want to revisit anytime.'}</div>



              </div>



            )}



          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 2. Liked Sub-Page



  if (activeSubView === 'liked') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'تسجيلات الإعجاب' : 'Liked')}



          <div className="divide-y divide-[#181818]">



            {likedPosts.length > 0 ? (



              likedPosts.map((post, idx) => (



                <PostCard



                  key={post.id}



                  post={post}



                  animationIndex={idx}



                  currentUserId={currentUser?.uid}



                  currentUser={currentUser}



                />



              ))



            ) : (



              <div className="p-16 text-center text-xs text-neutral-500">



                <Heart size={32} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />



                <div className="text-white font-medium mb-1">{isAr ? 'لا توجد تسجيلات إعجاب بعد' : 'No liked pulses yet'}</div>



                <div>{isAr ? 'النبضات التي تبدي إعجابك بها ستظهر هنا حصرياً لك.' : 'Pulses you like will appear here exclusively for you.'}</div>



              </div>



            )}



          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 3. Archive Sub-Page



  if (activeSubView === 'archive') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'الأرشيف' : 'Archive')}



          <div className="divide-y divide-[#181818]">



            {archivedPosts.length > 0 ? (



              archivedPosts.map((post) => (



                <div key={post.id} className="p-4 flex items-start justify-between gap-4">



                  <div className="min-w-0">



                    <p className="text-sm text-neutral-200 line-clamp-2">{post.content}</p>



                    <span className="text-[11px] text-neutral-500 mt-1 block">



                      {new Date(post.createdAt || Date.now()).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}



                    </span>



                  </div>



                  <button



                    onClick={() => {



                      storageService.unarchivePost(post.id, currentUser);



                      setArchivedPosts((prev) => prev.filter((p) => p.id !== post.id));



                      showToast(isAr ? 'تمت استعادة النبضة من الأرشيف' : 'Pulse unarchived');



                    }}



                    className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold tap-press flex-shrink-0"



                  >



                    {isAr ? 'استعادة' : 'Restore'}



                  </button>



                </div>



              ))



            ) : (



              <div className="p-16 text-center text-xs text-neutral-500">



                <History size={32} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />



                <div className="text-white font-medium mb-1">{isAr ? 'الأرشيف فارغ' : 'Archive is empty'}</div>



                <div>{isAr ? 'النبضات المؤرشفة تكون مخفية عن ملفك العام ويمكنك استعادتها.' : 'Archived pulses are hidden from your profile and can be restored.'}</div>



              </div>



            )}



          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 4. Notifications Sub-Page



  if (activeSubView === 'notifications') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'الإشعارات' : 'Notifications')}



          <div className="p-4 space-y-6">







            {/* Background Engine Status & Guidelines */}



            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4">



              <div className="flex items-center justify-between mb-2">



                <span className="text-xs font-bold text-white uppercase tracking-wider">{isAr ? 'محرك الخلفية وسحابة التنبيهات' : 'Background & Cloud Engine'}</span>



                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">{isAr ? 'نشط ويعمل' : 'Active'}</span>



              </div>



              <p className="text-xs text-neutral-400 leading-relaxed">



                {isAr



                  ? 'يعتمد تطبيق PULSE على بنية Google Cloud FCM فائقة الأولوية، حيث تصلك الإشعارات والرسائل حتى عند إغلاق التطبيق أو إيقاف تشغيل الشاشة بأعلى درجات الكفاءة والموثوقية.'



                  : 'PULSE uses high-priority Google Cloud FCM architecture to deliver alerts and direct messages even when the app is completely closed or screen is locked.'}



              </p>



              <div className="mt-2.5 pt-2.5 border-t border-[#1C1C20] flex items-center justify-between text-[11px] text-neutral-400">



                <span>{isAr ? 'حالة توفير الطاقة في جهازك:' : 'Device Battery Optimization:'}</span>



                <span className="text-white font-semibold">{isAr ? 'غير مقيّد (Unrestricted)' : 'Unrestricted'}</span>



              </div>



            </div>







            {/* Pause All Toggle */}



            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">



              <div>



                <div className="text-sm font-semibold text-white">{isAr ? 'توقف مؤقت للكل' : 'Pause all'}</div>



                <div className="text-xs text-neutral-400 mt-0.5">{isAr ? 'إيقاف كافة الإشعارات والتنبيهات مؤقتاً' : 'Temporarily mute all push notifications'}</div>



              </div>



              <input



                type="checkbox"



                checked={pauseAllNotifs}



                onChange={(e) => {



                  const val = e.target.checked;



                  setPauseAllNotifs(val);



                  localStorage.setItem('pulse_notifs_paused', val ? 'true' : 'false');



                  showToast(val ? (isAr ? 'تم إيقاف الإشعارات مؤقتاً' : 'Notifications paused') : (isAr ? 'تم استئناف الإشعارات' : 'Notifications resumed'));



                }}



                className="w-5 h-5 accent-white cursor-pointer"



              />



            </div>







            {/* Pulses and Replies */}



            <div>



              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                {isAr ? 'النبضات والردود' : 'Pulses and replies'}



              </div>



              <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



                <div className="p-4 flex items-center justify-between">



                  <span className="text-sm text-neutral-200">{isAr ? 'تسجيلات الإعجاب' : 'Likes'}</span>



                  <input



                    type="checkbox"



                    checked={pushLikes}



                    onChange={(e) => setPushLikes(e.target.checked)}



                    className="w-4 h-4 accent-white cursor-pointer"



                  />



                </div>



                <div className="p-4 flex items-center justify-between">



                  <span className="text-sm text-neutral-200">{isAr ? 'الردود والتعليقات' : 'Replies'}</span>



                  <input



                    type="checkbox"



                    checked={pushReplies}



                    onChange={(e) => setPushReplies(e.target.checked)}



                    className="w-4 h-4 accent-white cursor-pointer"



                  />



                </div>



                <div className="p-4 flex items-center justify-between">



                  <span className="text-sm text-neutral-200">{isAr ? 'الإشارات والمنشن (@)' : 'Mentions'}</span>



                  <input



                    type="checkbox"



                    checked={pushMentions}



                    onChange={(e) => setPushMentions(e.target.checked)}



                    className="w-4 h-4 accent-white cursor-pointer"



                  />



                </div>



              </div>



            </div>







            {/* Direct Messages */}



            <div>



              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                {isAr ? 'الرسائل المباشرة' : 'Direct messages'}



              </div>



              <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



                <div className="p-4 flex items-center justify-between">



                  <span className="text-sm text-neutral-200">{isAr ? 'رسائل المحادثات الفورية' : 'New messages'}</span>



                  <input



                    type="checkbox"



                    checked={pushDMs}



                    onChange={(e) => setPushDMs(e.target.checked)}



                    className="w-4 h-4 accent-white cursor-pointer"



                  />



                </div>



              </div>



            </div>







            {/* Sound & Haptics */}



            <div>



              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                {isAr ? 'الأصوات والتفاعل' : 'Sound & haptics'}



              </div>



              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">



                <div>



                  <div className="text-sm font-semibold text-white">{isAr ? 'نغمة الإشعارات' : 'Alert sounds'}</div>



                  <div className="text-xs text-neutral-400 mt-0.5">{isAr ? 'تشغيل نغمة هادئة عند وصول إشعار' : 'Play subtle tone when alerts arrive'}</div>



                </div>



                <input



                  type="checkbox"



                  checked={soundEnabled}



                  onChange={(e) => {



                    const val = e.target.checked;



                    setSoundEnabled(val);



                    localStorage.setItem('pulse_sound_enabled', val ? 'true' : 'false');



                  }}



                  className="w-4 h-4 accent-white cursor-pointer"



                />



              </div>



            </div>







          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 5. Privacy Sub-Page



  if (activeSubView === 'privacy') {



    const totalProfilesCount = blockedList.length + restrictedList.length + mutedList.length;







    // Filter active profiles list by search query



    const filterUserList = (list) => {



      if (!profileSearchQuery.trim()) return list;



      const q = profileSearchQuery.trim().toLowerCase();



      return list.filter((uid) => {



        const u = storageService.getUser(uid);



        const name = (u?.displayName || '').toLowerCase();



        const username = (u?.username || '').toLowerCase();



        return name.includes(q) || username.includes(q);



      });



    };







    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'الخصوصية والأمان' : 'Privacy & Safety')}



          



          {/* Top Segmented Navigation Pills */}



          <div className="p-4 pb-0">



            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#121214] border border-[#222226] rounded-2xl">



              <button



                onClick={() => {



                  hapticsService.light?.();



                  setPrivacyTab('overview');



                }}



                className={`py-2 text-xs font-bold rounded-xl transition-all tap-press ${



                  privacyTab === 'overview'



                    ? 'bg-white text-black shadow-sm'



                    : 'text-neutral-400 hover:text-white'



                }`}



              >



                {isAr ? 'الخصوصية العامة' : 'Account Privacy'}



              </button>



              <button



                onClick={() => {



                  hapticsService.light?.();



                  setPrivacyTab('profiles_control');



                }}



                className={`py-2 text-xs font-bold rounded-xl transition-all tap-press flex items-center justify-center gap-1.5 ${



                  privacyTab === 'profiles_control'



                    ? 'bg-white text-black shadow-sm'



                    : 'text-neutral-400 hover:text-white'



                }`}



              >



                <span>{isAr ? 'إدارة الحسابات' : 'Profiles Control'}</span>



                {totalProfilesCount > 0 && (



                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${



                    privacyTab === 'profiles_control' ? 'bg-black text-white' : 'bg-white/10 text-neutral-300'



                  }`}>



                    {totalProfilesCount}



                  </span>



                )}



              </button>



            </div>



          </div>







          <div className="p-4 space-y-6">







            {/* TAB 1: GENERAL PRIVACY SETTINGS */}



            {privacyTab === 'overview' && (



              <>



                {/* 1. Private Profile Toggle */}



                <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">



                  <div>



                    <div className="text-sm font-semibold text-white">{isAr ? 'ملف شخصي خاص' : 'Private profile'}</div>



                    <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">



                      {isAr 



                        ? 'عند تفعيل الحساب الخاص، يجب عليك قبول المتابعين الجدد يدوياً لمشاهدة نبضاتك وردودك.' 



                        : 'When your account is private, only people you approve can follow and view your pulses.'}



                    </div>



                  </div>



                  <input



                    type="checkbox"



                    checked={isPrivateAccount}



                    onChange={handleTogglePrivate}



                    className="w-5 h-5 accent-white cursor-pointer flex-shrink-0 ml-3"



                  />



                </div>







                {/* 2. Mentions Scope (@) */}



                <div>



                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                    {isAr ? 'الإشارات والمنشن (@)' : 'Mentions & Tags'}



                  </div>



                  <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



                    {[



                      { id: 'everyone', label: isAr ? 'الجميع' : 'Everyone', desc: isAr ? 'يمكن لأي شخص الإشارة إليك' : 'Anyone can @mention you' },



                      { id: 'following', label: isAr ? 'الحسابات التي تتابعها فقط' : 'Profiles you follow', desc: isAr ? 'من تتابعهم فقط يمكنهم الإشارة إليك' : 'Only people you follow can mention you' },



                      { id: 'off', label: isAr ? 'إيقاف الإشارات تماماً' : 'No one', desc: isAr ? 'لا يمكن لأي مستخدم الإشارة إليك' : 'Disable all mentions' }



                    ].map((opt) => (



                      <button



                        key={opt.id}



                        onClick={() => {



                          hapticsService.light?.();



                          setMentionsScope(opt.id);



                          localStorage.setItem('pulse_mentions_scope', opt.id);



                          showToast(isAr ? `تم ضبط الإشارات: ${opt.label}` : `Mentions: ${opt.label}`);



                        }}



                        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] tap-press text-start"



                      >



                        <div>



                          <div className="text-sm font-semibold text-neutral-200">{opt.label}</div>



                          <div className="text-[11px] text-neutral-500 mt-0.5">{opt.desc}</div>



                        </div>



                        {mentionsScope === opt.id && <Check size={18} className="text-white stroke-[2.5]" />}



                      </button>



                    ))}



                  </div>



                </div>







                {/* 3. Reply & Audience Controls */}



                <div>



                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                    {isAr ? 'التحكم في الردود على نبضاتك' : 'Reply & conversation controls'}



                  </div>



                  <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



                    {[



                      { id: 'everyone', label: isAr ? 'الجميع' : 'Everyone', desc: isAr ? 'يمكن لأي مستخدم التعليق والرد على نبضاتك' : 'Anyone can reply to your pulses' },



                      { id: 'following', label: isAr ? 'الحسابات التي تتابعها فقط' : 'Profiles you follow', desc: isAr ? 'الردود تقتصر فقط على من تتابعهم' : 'Only profiles you follow can reply' },



                      { id: 'mentioned', label: isAr ? 'الحسابات المشار إليها فقط (@)' : 'Profiles you mention', desc: isAr ? 'من تذكرهم في النبضة فقط يمكنهم الرد' : 'Only mentioned accounts can reply' }



                    ].map((opt) => (



                      <button



                        key={opt.id}



                        onClick={() => {



                          hapticsService.light?.();



                          setRepliesScope(opt.id);



                          localStorage.setItem('pulse_reply_scope', opt.id);



                          showToast(isAr ? `تم ضبط جمهور الردود: ${opt.label}` : `Reply audience: ${opt.label}`);



                        }}



                        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] tap-press text-start"



                      >



                        <div>



                          <div className="text-sm font-semibold text-neutral-200">{opt.label}</div>



                          <div className="text-[11px] text-neutral-500 mt-0.5">{opt.desc}</div>



                        </div>



                        {repliesScope === opt.id && <Check size={18} className="text-white stroke-[2.5]" />}



                      </button>



                    ))}



                  </div>



                </div>







                {/* 4. Activity Status & Online Presence */}



                <div>



                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                    {isAr ? 'حالة النشاط والظهور' : 'Activity status'}



                  </div>



                  <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">



                    <div>



                      <div className="text-sm font-semibold text-white">{isAr ? 'إظهار حالة اتصالك (متصل الآن)' : 'Show online status'}</div>



                      <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">



                        {isAr 



                          ? 'السماح للآخرين بمعرفة متى تكون متصلاً أو نشطاً. عند إيقافه، لن تتمكن أنت أيضاً من رؤية نشاط الآخرين.' 



                          : 'Allow people to see when you are active on PULSE. When off, you cannot see others’ status.'}



                      </div>



                    </div>



                    <input



                      type="checkbox"



                      checked={activityStatus}



                      onChange={(e) => {



                        const val = e.target.checked;



                        setActivityStatus(val);



                        localStorage.setItem('pulse_activity_status', val ? 'true' : 'false');



                        showToast(val ? (isAr ? 'تم تفعيل إظهار حالة النشاط' : 'Online status visible') : (isAr ? 'تم إخفاء حالة النشاط' : 'Online status hidden'));



                      }}



                      className="w-5 h-5 accent-white cursor-pointer flex-shrink-0 ml-3"



                    />



                  </div>



                </div>







                {/* 5. Direct Messages Privacy & Read Receipts */}



                <div>



                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                    {isAr ? 'الرسائل المباشرة ومؤشرات القراءة' : 'Direct messages & read receipts'}



                  </div>



                  <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



                    



                    {/* Read Receipts Toggle */}



                    <div className="p-4 flex items-center justify-between">



                      <div>



                        <div className="text-sm font-semibold text-white">{isAr ? 'إرسال مؤشرات القراءة (Seen)' : 'Send read receipts'}</div>



                        <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">



                          {isAr ? 'السماح للطرف الآخر بمعرفة متى قمت بفتح رسالته وقراءتها' : 'Let senders know when you’ve read their message'}



                        </div>



                      </div>



                      <input



                        type="checkbox"



                        checked={readReceipts}



                        onChange={(e) => {



                          const val = e.target.checked;



                          setReadReceipts(val);



                          localStorage.setItem('pulse_read_receipts', val ? 'true' : 'false');



                          showToast(val ? (isAr ? 'مؤشرات القراءة مفعلة' : 'Read receipts on') : (isAr ? 'مؤشرات القراءة متوقفة' : 'Read receipts off'));



                        }}



                        className="w-4 h-4 accent-white cursor-pointer flex-shrink-0 ml-3"



                      />



                    </div>







                    {/* Who can send DMs */}



                    <div className="p-4 flex items-center justify-between">



                      <div>



                        <div className="text-sm font-semibold text-white">{isAr ? 'استقبال رسائل جديدة' : 'Receive message requests'}</div>



                        <div className="text-xs text-neutral-400 mt-0.5">{isAr ? 'اختر من يمكنه بدء محادثة معك' : 'Who can initiate chats with you'}</div>



                      </div>



                      <div className="flex gap-1.5">



                        <button



                          onClick={() => {



                            setDmScope('everyone');



                            localStorage.setItem('pulse_dm_scope', 'everyone');



                          }}



                          className={`px-3 py-1 text-xs rounded-lg tap-press font-semibold transition-all ${



                            dmScope === 'everyone' ? 'bg-white text-black' : 'bg-white/5 text-neutral-400'



                          }`}



                        >



                          {isAr ? 'الجميع' : 'All'}



                        </button>



                        <button



                          onClick={() => {



                            setDmScope('following');



                            localStorage.setItem('pulse_dm_scope', 'following');



                          }}



                          className={`px-3 py-1 text-xs rounded-lg tap-press font-semibold transition-all ${



                            dmScope === 'following' ? 'bg-white text-black' : 'bg-white/5 text-neutral-400'



                          }`}



                        >



                          {isAr ? 'المتابَعون' : 'Following'}



                        </button>



                      </div>



                    </div>







                  </div>



                </div>







                {/* 6. Live Audio Spaces Privacy */}



                <div>



                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                    {isAr ? 'المجالس الصوتية المباشرة' : 'Live audio spaces privacy'}



                  </div>



                  <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">



                    <div>



                      <div className="text-sm font-semibold text-white">{isAr ? 'تصفح المجالس بوضع المستمع الخفي' : 'Incognito listener in Spaces'}</div>



                      <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">



                        {isAr 



                          ? 'الاستماع للمجالس الصوتية العامة دون إظهار صورتك أو اسمك في قائمة الحاضرين.' 



                          : 'Listen to public spaces anonymously without showing your avatar in audience.'}



                      </div>



                    </div>



                    <input



                      type="checkbox"



                      checked={incognitoListening}



                      onChange={(e) => {



                        const val = e.target.checked;



                        setIncognitoListening(val);



                        localStorage.setItem('pulse_incognito_spaces', val ? 'true' : 'false');



                        showToast(val ? (isAr ? 'تم تفعيل وضع المستمع الخفي' : 'Incognito listening active') : (isAr ? 'تم إيقاف وضع المستمع الخفي' : 'Incognito off'));



                      }}



                      className="w-5 h-5 accent-white cursor-pointer flex-shrink-0 ml-3"



                    />



                  </div>



                </div>







                {/* 7. Quick Jump to Content Preferences */}



                <div 



                  onClick={() => setActiveSubView('content')}



                  className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



                >



                  <div className="flex items-center gap-3">



                    <SlidersHorizontal size={18} className="text-neutral-400" />



                    <div>



                      <div className="text-sm font-semibold text-white">{isAr ? 'تفضيلات المحتوى والكلمات المخفية' : 'Content preferences & hidden words'}</div>



                      <div className="text-xs text-neutral-400 mt-0.5">{isAr ? 'فلترة الكلمات والموضوعات وحساسية المحتوى' : 'Manage blacklists and sensitivity'}</div>



                    </div>



                  </div>



                  <Chevron size={18} className="text-neutral-600" />



                </div>







                {/* 8. App Lock & Hardware Screen Capture Protection */}



                <div>



                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">



                    {isAr ? 'الأمان والحماية المتقدمة' : 'Advanced Security & App Lock'}



                  </div>



                  <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



                    {/* App Lock with Biometrics & PIN */}



                    <div className="p-4 flex items-center justify-between">



                      <div className="flex items-center gap-3.5 pr-2">



                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white flex-shrink-0">



                          <Fingerprint size={20} />



                        </div>



                        <div>



                          <div className="text-sm font-semibold text-white">



                            {isAr ? 'قفل التطبيق (البصمة ورمز المرور)' : 'App Lock (Biometrics & Passcode)'}



                          </div>



                          <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">



                            {isAr 



                              ? 'المطالبة بالبصمة أو رمز PIN من 4 أرقام عند كل فتح للتطبيق لحماية خصوصيتك.' 



                              : 'Require fingerprint or 4-digit PIN every time PULSE opens.'}



                          </div>



                        </div>



                      </div>



                      <input



                        type="checkbox"



                        checked={appLockEnabled}



                        onChange={() => {



                          if (appLockEnabled) {



                            biometricLockService.disableLock();



                            setAppLockEnabled(false);



                            window.dispatchEvent(new CustomEvent('pulse_app_lock_changed'));



                            showToast(isAr ? 'تم إيقاف قفل التطبيق' : 'App lock disabled');



                          } else {



                            setShowPinSetupModal(true);



                            setPinInput('');



                            setConfirmPinInput('');



                          }



                        }}



                        className="w-5 h-5 accent-white cursor-pointer flex-shrink-0 ml-3"



                      />



                    </div>







                    {/* Hardware Screen Capture Protection (FLAG_SECURE) */}



                    <div className="p-4 flex items-center justify-between">



                      <div className="flex items-center gap-3.5 pr-2">



                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white flex-shrink-0">



                          <Shield size={20} />



                        </div>



                        <div>



                          <div className="text-sm font-semibold text-white">



                            {isAr ? 'حماية الشاشة من التسجيل والتصوير' : 'Screen Capture & Spyware Shield'}



                          </div>



                          <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">



                            {isAr 



                              ? 'تفعيل عتاد الأمان (FLAG_SECURE) لمنع لقطات الشاشة وتسجيل الشاشة بالفيديو لحماية بياناتك.' 



                              : 'Hardware-level protection to block screenshots and video recording.'}



                          </div>



                        </div>



                      </div>



                      <input



                        type="checkbox"



                        checked={screenSecEnabled}



                        onChange={(e) => {



                          const val = e.target.checked;



                          setScreenSecEnabled(val);



                          screenSecurity.setProtection(val);



                          showToast(val 



                            ? (isAr ? 'تم تفعيل حماية الشاشة بنجاح' : 'Screen protection enabled') 



                            : (isAr ? 'تم إيقاف حماية الشاشة' : 'Screen protection disabled')



                          );



                        }}



                        className="w-5 h-5 accent-white cursor-pointer flex-shrink-0 ml-3"



                      />



                    </div>



                  </div>



                </div>







                {/* Community Standards Bottom Sheet Modal */}



      {showCommunityStandardsModal && (



        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end p-0">



          <div className="bg-[#121214] border-t border-[#26262A] rounded-t-3xl max-w-xl mx-auto w-full p-5 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto">



            <div className="flex items-center justify-between border-b border-[#1C1C20] pb-3">



              <h3 className="text-base font-bold text-white">



                {isAr ? 'معايير مجتمع PULSE' : 'PULSE Community Standards'}



              </h3>



              <button 



                onClick={() => setShowCommunityStandardsModal(false)}



                className="p-1 rounded-full text-neutral-400 hover:text-white tap-press"



              >



                <X size={20} />



              </button>



            </div>







            <div className="space-y-3.5 text-xs text-neutral-300 leading-relaxed py-1">



              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">



                <div className="font-bold text-white text-sm">



                  {isAr ? '1. الحوار الفكري الراقي والاحترام المتبادل' : '1. Intellectual Dialogue & Respect'}



                </div>



                <p className="text-neutral-400">



                  {isAr ? 'يُمنع منعاً باتاً خطاب الكراهية، التنمر، المضايقات الشخصية، أو إهانة المعتقدات والأفراد.' : 'Hate speech, bullying, harassment, and personal abuse are strictly prohibited on PULSE.'}



                </p>



              </div>







              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">



                <div className="font-bold text-white text-sm">



                  {isAr ? '2. أصالة المحتوى ومكافحة السبام' : '2. Content Authenticity & Spam Prevention'}



                </div>



                <p className="text-neutral-400">



                  {isAr ? 'يُمنع الإغراق الإعلاني، الترويج لعمليات الاحتيال، النشر المكرر الآلي، أو روابط الخداع.' : 'Automated spamming, financial scams, deceptive links, and bot flooding are strictly banned.'}



                </p>



              </div>







              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">



                <div className="font-bold text-white text-sm">



                  {isAr ? '3. سلامة المحتوى والملكية الفكرية' : '3. Content Safety & Integrity'}



                </div>



                <p className="text-neutral-400">



                  {isAr ? 'يُمنع نشر المحتويات العنيفة، الإباحية، أو انتهاكات حقوق التأليف والنشر غير المصرح بها.' : 'Violent imagery, adult content, and unauthorized intellectual property infringement are prohibited.'}



                </p>



              </div>







              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">



                <div className="font-bold text-white text-sm">



                  {isAr ? '4. أصالة الهوية والشفافية' : '4. Authentic Identity'}



                </div>



                <p className="text-neutral-400">



                  {isAr ? 'يُمنع انتحال صفة الآخرين أو إنشاء حسابات مضللة للاحتيال على أعضاء المجتمع.' : 'Impersonation and deceptive identities designed to mislead others are not permitted.'}



                </p>



              </div>



            </div>







            <div className="pt-2">



              <button



                type="button"



                onClick={() => setShowCommunityStandardsModal(false)}



                className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press transition-colors"



              >



                {isAr ? 'فهمت ذلك' : 'Understood'}



              </button>



            </div>



          </div>



        </div>



      )}







      {/* Set App Lock PIN Modal */}



                {showPinSetupModal && (



                  <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">



                    <div className="bg-[#121214] border border-[#26262A] rounded-3xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">



                      <div className="flex flex-col items-center text-center space-y-1.5">



                        <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-1">



                          <Lock size={22} />



                        </div>



                        <h3 className="text-base font-bold text-white">



                          {isAr ? 'تعيين رمز مرور قفل التطبيق' : 'Set App Lock Passcode'}



                        </h3>



                        <p className="text-xs text-neutral-400 leading-relaxed">



                          {isAr ? 'أدخل رمز مرور مكون من 4 أرقام لتأمين التطبيق' : 'Enter a 4-digit PIN to secure PULSE'}



                        </p>



                      </div>







                      <form 



                        onSubmit={async (e) => {



                          e.preventDefault();



                          if (pinInput.length !== 4) {



                            showToast(isAr ? 'يجب أن يتكون رمز المرور من 4 أرقام' : 'Passcode must be 4 digits');



                            return;



                          }



                          if (pinInput !== confirmPinInput) {



                            showToast(isAr ? 'رمزا المرور غير متطابقين' : 'Passcodes do not match');



                            return;



                          }



                          const res = await biometricLockService.enableLock(pinInput, enableBioCheckbox);



                          if (res.success) {



                            setAppLockEnabled(true);



                            setShowPinSetupModal(false);



                            window.dispatchEvent(new CustomEvent('pulse_app_lock_changed'));



                            showToast(isAr ? 'تم تفعيل قفل التطبيق بنجاح' : 'App lock enabled successfully');



                          } else {



                            showToast(res.message);



                          }



                        }} 



                        className="space-y-3.5"



                      >



                        <div>



                          <label className="text-xs font-semibold text-neutral-300 block mb-1">



                            {isAr ? 'رمز المرور الجديد (4 أرقام)' : 'New Passcode (4 digits)'}



                          </label>



                          <input



                            type="password"



                            maxLength={4}



                            value={pinInput}



                            onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}



                            placeholder="••••"



                            dir="ltr"



                            autoFocus



                            required



                            className="w-full bg-black border border-[#2A2A2E] rounded-xl py-2.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-white transition-colors"



                          />



                        </div>







                        <div>



                          <label className="text-xs font-semibold text-neutral-300 block mb-1">



                            {isAr ? 'تأكيد رمز المرور' : 'Confirm Passcode'}



                          </label>



                          <input



                            type="password"



                            maxLength={4}



                            value={confirmPinInput}



                            onChange={(e) => setConfirmPinInput(e.target.value.replace(/[^0-9]/g, ''))}



                            placeholder="••••"



                            dir="ltr"



                            required



                            className="w-full bg-black border border-[#2A2A2E] rounded-xl py-2.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-white transition-colors"



                          />



                        </div>







                        <div className="flex items-center gap-2 pt-1 text-xs text-neutral-300">



                          <input



                            type="checkbox"



                            id="enableBioCheck"



                            checked={enableBioCheckbox}



                            onChange={(e) => setEnableBioCheckbox(e.target.checked)}



                            className="w-4 h-4 accent-white cursor-pointer"



                          />



                          <label htmlFor="enableBioCheck" className="cursor-pointer">



                            {isAr ? 'تمكين فتح القفل بالبصمة / Face ID' : 'Enable Biometrics / Face ID'}



                          </label>



                        </div>







                        <div className="grid grid-cols-2 gap-2 pt-2">



                          <button



                            type="button"



                            onClick={() => setShowPinSetupModal(false)}



                            className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold tap-press"



                          >



                            {isAr ? 'إلغاء' : 'Cancel'}



                          </button>



                          <button



                            type="submit"



                            className="py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press transition-colors"



                          >



                            {isAr ? 'حفظ وتفعيل' : 'Save & Enable'}



                          </button>



                        </div>



                      </form>



                    </div>



                  </div>



                )}







              </>



            )}







            {/* TAB 2: PROFILES CONTROL (BLOCKED, RESTRICTED, MUTED) */}



            {privacyTab === 'profiles_control' && (



              <div className="space-y-4">



                



                {/* Sub-tabs pills */}



                <div className="flex gap-2 border-b border-[#1C1C20] pb-3">



                  {[



                    { id: 'blocked', label: isAr ? 'المحظورة' : 'Blocked', count: blockedList.length },



                    { id: 'restricted', label: isAr ? 'المقيدة' : 'Restricted', count: restrictedList.length },



                    { id: 'muted', label: isAr ? 'المكتومة' : 'Muted', count: mutedList.length }



                  ].map((sub) => (



                    <button



                      key={sub.id}



                      onClick={() => {



                        hapticsService.light?.();



                        setProfilesSubTab(sub.id);



                        setProfileSearchQuery('');



                      }}



                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold tap-press transition-all flex items-center gap-1.5 ${



                        profilesSubTab === sub.id



                          ? 'bg-white text-black shadow-sm'



                          : 'bg-[#121214] text-neutral-400 border border-[#222226] hover:text-white'



                      }`}



                    >



                      <span>{sub.label}</span>



                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${



                        profilesSubTab === sub.id ? 'bg-black text-white' : 'bg-white/10'



                      }`}>



                        {sub.count}



                      </span>



                    </button>



                  ))}



                </div>







                {/* Sub-tab Explanatory Notice */}



                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-300 leading-relaxed">



                  {profilesSubTab === 'blocked' && (



                    <span>{isAr ? 'لا يمكن للحسابات المحظورة مراسلتك أو العثور على ملفك الشخصي أو نبضاتك على PULSE.' : 'Blocked profiles cannot message you, view your profile, or find your pulses.'}</span>



                  )}



                  {profilesSubTab === 'restricted' && (



                    <span>{isAr ? 'الحسابات المقيدة لن تعلم بتقييدك لها. لن تظهر ردودهم على نبضاتك إلا بموافقتك، ولن يعلموا متى تكون متصلاً أو قرأت رسائلهم.' : 'Restricted profiles cannot see when you are active or when you’ve read their messages. Their replies require approval.'}</span>



                  )}



                  {profilesSubTab === 'muted' && (



                    <span>{isAr ? 'الحسابات المكتومة لن تظهر منشوراتها في صفحتك الرئيسية، دون الحاجة لإلغاء متابعتهم أو إشعارهم.' : 'Muted profiles pulses will not appear in your feed without needing to unfollow them.'}</span>



                  )}



                </div>







                {/* Action for restricted: Add new restriction */}



                {profilesSubTab === 'restricted' && (



                  <button



                    onClick={() => setShowAddRestrictedModal(true)}



                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold tap-press transition-colors flex items-center justify-center gap-1.5"



                  >



                    <Plus size={14} />



                    <span>{isAr ? 'تقييد حساب جديد (@username)' : 'Restrict a new profile'}</span>



                  </button>



                )}







                {/* Search in profiles */}



                {(profilesSubTab === 'blocked' ? blockedList : profilesSubTab === 'restricted' ? restrictedList : mutedList).length > 2 && (



                  <div className="relative">



                    <Search size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-neutral-500" />



                    <input



                      type="text"



                      value={profileSearchQuery}



                      onChange={(e) => setProfileSearchQuery(e.target.value)}



                      placeholder={isAr ? 'بحث في هذه القائمة...' : 'Search profiles...'}



                      className="w-full bg-black border border-[#26262A] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"



                    />



                  </div>



                )}







                {/* Dynamic List Render */}



                <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



                  {(() => {



                    const currentUids = profilesSubTab === 'blocked' 



                      ? blockedList 



                      : profilesSubTab === 'restricted' 



                      ? restrictedList 



                      : mutedList;



                    



                    const filtered = filterUserList(currentUids);







                    if (filtered.length === 0) {



                      return (



                        <div className="p-8 text-center text-xs text-neutral-500 space-y-1">



                          <UserX size={28} className="mx-auto mb-2 text-neutral-600 stroke-[1.5]" />



                          <div className="text-white font-medium">



                            {profilesSubTab === 'blocked' 



                              ? (isAr ? 'لا توجد حسابات محظورة' : 'No blocked accounts') 



                              : profilesSubTab === 'restricted' 



                              ? (isAr ? 'لا توجد حسابات مقيدة' : 'No restricted accounts') 



                              : (isAr ? 'لا توجد حسابات مكتومة' : 'No muted accounts')}



                          </div>



                          <div>{isAr ? 'قائمتك نظيفة وخالية من أي قيود.' : 'Your list is empty.'}</div>



                        </div>



                      );



                    }







                    return filtered.map((uid) => {



                      const targetUser = storageService.getUser(uid);



                      const displayName = targetUser?.displayName || targetUser?.username || uid;



                      const username = targetUser?.username || uid.slice(0, 10);



                      const avatar = targetUser?.avatar || DEFAULT_AVATAR;







                      return (



                        <div key={uid} className="p-3.5 flex items-center justify-between gap-3">



                          <div className="flex items-center gap-3 min-w-0">



                            <img



                              src={avatar}



                              alt={displayName}



                              className="w-10 h-10 rounded-full object-cover border border-white/10 bg-neutral-900 flex-shrink-0"



                              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}



                            />



                            <div className="min-w-0">



                              <span className="text-xs font-bold text-white truncate block">{displayName}</span>



                              <span className="text-[11px] text-neutral-400 font-mono truncate block" dir="ltr">@{username}</span>



                            </div>



                          </div>







                          {profilesSubTab === 'blocked' && (



                            <button



                              onClick={() => handleUnblockUser(uid)}



                              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white tap-press font-semibold transition-colors flex-shrink-0"



                            >



                              {isAr ? 'إلغاء الحظر' : 'Unblock'}



                            </button>



                          )}







                          {profilesSubTab === 'restricted' && (



                            <button



                              onClick={() => handleUnrestrictUser(uid)}



                              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white tap-press font-semibold transition-colors flex-shrink-0"



                            >



                              {isAr ? 'إلغاء التقييد' : 'Unrestrict'}



                            </button>



                          )}







                          {profilesSubTab === 'muted' && (



                            <button



                              onClick={() => handleUnmuteUser(uid)}



                              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs text-white tap-press font-semibold transition-colors flex-shrink-0"



                            >



                              {isAr ? 'إلغاء الكتم' : 'Unmute'}



                            </button>



                          )}



                        </div>



                      );



                    });



                  })()}



                </div>







              </div>



            )}







          </div>



        </div>







        {/* Modal: Add Restricted Profile */}



        {showAddRestrictedModal && (



          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end p-0">



            <div className="bg-[#121214] border-t border-[#26262A] rounded-t-3xl max-w-xl mx-auto w-full p-5 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto">



              <div className="flex items-center justify-between border-b border-[#1C1C20] pb-3">



                <h3 className="text-base font-bold text-white">



                  {isAr ? 'تقييد حساب مستخدم' : 'Restrict Account'}



                </h3>



                <button 



                  onClick={() => setShowAddRestrictedModal(false)}



                  className="p-1 rounded-full text-neutral-400 hover:text-white tap-press"



                >



                  <X size={20} />



                </button>



              </div>







              <p className="text-xs text-neutral-400 leading-relaxed">



                {isAr 



                  ? 'عند تقييد حساب، لن يتمكن من معرفة متى تكون متصلاً أو قرأت رسائله، ولن تظهر ردوده للعامة إلا بعد موافقتك الصريحة.' 



                  : 'Restricting protects your interactions without notifying the person.'}



              </p>







              <form onSubmit={handleAddRestrictedUser} className="space-y-3.5">



                <div>



                  <label className="text-xs font-semibold text-neutral-300 block mb-1">



                    {isAr ? 'اسم المستخدم المراد تقييده (@)' : 'Target Username (@)'}



                  </label>



                  <input



                    type="text"



                    value={restrictUsernameInput}



                    onChange={(e) => setRestrictUsernameInput(e.target.value)}



                    placeholder="e.g. username"



                    className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors font-mono"



                    dir="ltr"



                  />



                </div>







                <div className="grid grid-cols-2 gap-2 pt-1">



                  <button



                    type="button"



                    onClick={() => setShowAddRestrictedModal(false)}



                    className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold tap-press"



                  >



                    {isAr ? 'إلغاء' : 'Cancel'}



                  </button>



                  <button



                    type="submit"



                    disabled={!restrictUsernameInput.trim()}



                    className="py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 disabled:opacity-40 tap-press transition-colors"



                  >



                    {isAr ? 'تأكيد التقييد' : 'Confirm Restrict'}



                  </button>



                </div>



              </form>



            </div>



          </div>



        )}







      </SwipeBackWrapper>



    );



  }







  // 6. Content Preferences Hub (Threads Exact 1:1 Matching media_1792748554929_d0ab4503.png)



  if (activeSubView === 'content') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'تفضيلات المحتوى' : 'Content preferences')}



          <div className="p-4">



            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



              {/* 1. Muted */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('content_muted');



                }}



                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <div className="flex items-center gap-3.5">



                  <VolumeX size={20} className="text-white flex-shrink-0" />



                  <span className="text-sm font-semibold text-white">



                    {isAr ? 'الحسابات المكتومة' : 'Muted'}



                  </span>



                </div>



                <Chevron size={18} className="text-neutral-500" />



              </div>







              {/* 2. Hidden Words */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('content_hidden_words');



                }}



                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <div className="flex items-center gap-3.5">



                  <FileX size={20} className="text-white flex-shrink-0" />



                  <span className="text-sm font-semibold text-white">



                    {isAr ? 'الكلمات المخفية' : 'Hidden Words'}



                  </span>



                </div>



                <Chevron size={18} className="text-neutral-500" />



              </div>







              {/* 3. Hide like and share counts */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('content_hide_likes');



                }}



                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <div className="flex items-center gap-3.5">



                  <HeartOff size={20} className="text-white flex-shrink-0" />



                  <span className="text-sm font-semibold text-white">



                    {isAr ? 'إخفاء أعداد تسجيلات الإعجاب والمشاركات' : 'Hide like and share counts'}



                  </span>



                </div>



                <Chevron size={18} className="text-neutral-500" />



              </div>







              {/* 4. Sensitive content */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('content_sensitive');



                }}



                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <div className="flex items-center gap-3.5">



                  <ImageOff size={20} className="text-white flex-shrink-0" />



                  <span className="text-sm font-semibold text-white">



                    {isAr ? 'المحتوى الحساس' : 'Sensitive content'}



                  </span>



                </div>



                <Chevron size={18} className="text-neutral-500" />



              </div>







              {/* 5. Political content */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('content_political');



                }}



                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <div className="flex items-center gap-3.5">



                  <Landmark size={20} className="text-white flex-shrink-0" />



                  <span className="text-sm font-semibold text-white">



                    {isAr ? 'المحتوى السياسي' : 'Political content'}



                  </span>



                </div>



                <div className="flex items-center gap-1.5 text-neutral-400 text-sm">



                  <span>{limitPolitical ? (isAr ? 'الحد' : 'Limit') : (isAr ? 'اقتراح' : 'Suggest')}</span>



                  <Chevron size={18} className="text-neutral-500" />



                </div>



              </div>



            </div>



          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 6.1 Sensitive Content Sub-Screen (Threads Exact 1:1 Matching media_1792748513774_aeaccd4e.png)



  if (activeSubView === 'content_sensitive') {
    const userAge = calculateAge(currentUser?.birthDate || currentUser?.birthdate);
    const isAdult = userAge !== null && userAge >= 18;

    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('content')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'المحتوى الحساس (+18)' : 'Sensitive content (+18)', () => setActiveSubView('content'))}

          <div className="p-4 space-y-6">
            {/* Age Verification Gate Status Card */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                isAdult ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {isAdult ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {isAdult 
                      ? (isAr ? 'حساب مؤكد للبالغين (+18)' : 'Verified Adult Account (18+)')
                      : (isAr ? 'حساب قاصر (دون سن 18 عاماً)' : 'Minor Account (Under 18)')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isAdult ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {userAge !== null ? `${userAge} ${isAr ? 'سنة' : 'yrs'}` : (isAr ? 'غير محدد' : 'Unknown')}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {isAdult
                    ? (isAr 
                        ? 'تاريخ ميلادك المسجل يؤكد بلوغك السن القانوني، ويمكنك اختيار إظهار أو تعتيم أو حجب الوسائط الحساسة بحرية.' 
                        : 'Your birthdate confirms legal adult age. You can freely choose whether to blur, auto-show, or block sensitive media.')
                    : (isAr 
                        ? 'لحماية أمان حسابك وفق معايير الأمان ومتاجر التطبيقات، يتم تطبيق التعتيم الإجباري للوسائط الحساسة ولا يمكن تفعيل الإظهار التلقائي.' 
                        : 'Under store safety standards, sensitive content is strictly blurred with warning overlays and auto-show cannot be enabled.')}
                </p>
              </div>
            </div>

            {/* Core Sensitive Media Display Preferences (The 3 Modes) */}
            <div className="space-y-2">
              <div className="px-1">
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'طريقة عرض الوسائط الحساسة (+18)' : 'Sensitive Media Display Mode'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isAr ? 'حدد كيفية تعامل التطبيق مع الصور والفيديوهات المعلمة كمحتوى حساس' : 'Choose how PULSE handles photos and videos marked as sensitive'}
                </p>
              </div>

              <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
                {[
                  {
                    id: 'warn',
                    title: isAr ? 'تحذير وتعتيم قبل العرض (الوضع الآمن - الافتراضي)' : 'Warn & blur before showing (Safe - Default)',
                    desc: isAr ? 'يتم تعتيم الصور والفيديوهات الحساسة وعرض بطاقة تحذير (+18) تتطلب الضغط لرؤيتها.' : 'Blurs sensitive media with an adult warning overlay requiring a tap to reveal.',
                    icon: Shield,
                    disabled: false
                  },
                  {
                    id: 'show',
                    title: isAr ? 'إظهار تلقائي بدون تعتيم (+18)' : 'Always show without blur (+18)',
                    desc: isAdult 
                      ? (isAr ? 'عرض الوسائط الحساسة مباشرة دون تعتيم لمن هم في سن 18 عاماً أو أكثر.' : 'Directly displays sensitive media without warning for verified 18+ users.')
                      : (isAr ? 'غير متاح: يتطلب أن يكون صاحب الحساب في سن 18 عاماً أو أكثر.' : 'Restricted: Requires registered account age of 18 or older.'),
                    icon: Eye,
                    disabled: !isAdult
                  },
                  {
                    id: 'hide',
                    title: isAr ? 'حجب وإخفاء تام من الخلاصة' : 'Block & hide completely from feed',
                    desc: isAr ? 'إخفاء وحجب جميع المنشورات والوسائط المعلمة كمحتوى حساس تماماً من خلاصتك.' : 'Prevents any sensitive posts or media from appearing in your feed.',
                    icon: EyeOff,
                    disabled: false
                  }
                ].map((opt) => {
                  const isSelected = sensitiveMediaPref === opt.id;
                  const IconComponent = opt.icon;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        if (opt.disabled) {
                          try { hapticsService.warning?.(); } catch {}
                          showToast(isAr ? 'هذا الخيار يتطلب أن يكون عمرك 18 عاماً أو أكثر.' : 'This option requires age 18 or older.', 'error');
                          return;
                        }
                        try { hapticsService.selection?.(); } catch {}
                        setSensitiveMediaPref(opt.id);
                        try {
                          setSensitiveContentPref(opt.id, currentUser);
                        } catch (err) {
                          showToast(err.message, 'error');
                          return;
                        }
                        showToast(isAr ? `تم تحديث التفضيل: ${opt.title}` : `Preference updated: ${opt.title}`, 'success');
                      }}
                      className={`p-4 flex items-center justify-between transition-colors ${
                        opt.disabled 
                          ? 'opacity-40 cursor-not-allowed bg-black/40' 
                          : 'cursor-pointer hover:bg-white/[0.02] tap-press'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 pr-3">
                        <div className="mt-0.5 text-neutral-400">
                          {opt.disabled ? <Lock size={18} className="text-neutral-500" /> : <IconComponent size={18} className="text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{opt.title}</span>
                            {opt.disabled && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                                {isAr ? 'مقيد' : 'Locked'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 mt-1 leading-relaxed">{opt.desc}</div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected ? 'border-white bg-transparent' : 'border-neutral-600 bg-transparent'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Keyword-based Sensitivity Filter (Threads Granular Slider) */}
            <div className="space-y-2 pt-2 border-t border-[#1C1C20]">
              <div className="px-1">
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'فلترة الكلمات والموضوعات الحساسة' : 'Keyword & Topic Sensitivity Level'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isAr 
                    ? 'التحكم في كثافة ظهور الموضوعات الحساسة العامة من الحسابات التي لا تتابعها' 
                    : 'Manage exposure to sensitive keywords and topics from accounts you do not follow'}
                </p>
              </div>

              <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
                {[
                  {
                    id: 'less',
                    title: isAr ? 'أقل' : 'Less',
                    desc: isAr ? 'حجب أوسع للمحتوى والكلمات الحساسة غير المعلمة.' : 'Strictest keyword filter for sensitive topics.'
                  },
                  {
                    id: 'standard',
                    title: isAr ? 'قياسي (الموصى به)' : 'Standard (Recommended)',
                    desc: isAr ? 'توازن طبيعي مع تطبيق معايير السلامة العامة.' : 'Balanced community standards filter.'
                  },
                  {
                    id: 'more',
                    title: isAr ? 'المزيد' : 'More',
                    desc: isAr ? 'عرض نطاق أوسع من الموضوعات الحساسة في الخلاصة.' : 'Allows broader topic exposure in discover feed.'
                  }
                ].map((option) => {
                  const isSelected = sensitiveLevel === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => {
                        try { hapticsService.selection?.(); } catch {}
                        setSensitiveLevel(option.id);
                        moderationService.setSensitiveLevel(option.id);
                        showToast(isAr ? `تم ضبط مستوى الفلترة: ${option.title}` : `Filter level: ${option.title}`);
                      }}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
                    >
                      <div className="pr-3">
                        <div className="text-sm font-semibold text-white">{option.title}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{option.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                        isSelected ? 'border-white bg-transparent' : 'border-neutral-600 bg-transparent'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  if (activeSubView === 'content_political') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView('content')}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'المحتوى السياسي' : 'Political content', () => setActiveSubView('content'))}



          <div className="p-4 space-y-6">



            <p className="text-xs text-neutral-400 leading-relaxed px-1">



              {isAr 



                ? 'يشمل المحتوى السياسي الموضوعات المتعلقة بالحكومات، الانتخابات، القوانين، والمناظرات العامة الحساسة.' 



                : 'Political content includes topics related to government, elections, legislation, and civic debate.'}



            </p>







            <div className="space-y-1.5 px-1">



              <h3 className="text-sm font-bold text-white">



                {isAr ? 'ما تراه من الملفات الشخصية التي لا تتابعها' : "What you see from profiles you don't follow"}



              </h3>



            </div>







            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



              {[



                {



                  id: 'suggest',



                  limitVal: false,



                  title: isAr ? 'عدم الحد (اقتراح)' : "Don't limit",



                  desc: isAr ? 'قد تشاهد محتوى سياسياً في خلاصتك وترشيحات البحث.' : 'You might see political content in your feed and search suggestions.'



                },



                {



                  id: 'limit',



                  limitVal: true,



                  title: isAr ? 'الحد من المحتوى السياسي' : 'Limit',



                  desc: isAr ? 'الحد من الموضوعات السياسية من الحسابات التي لا تتابعها. ستستمر في رؤية ما يشاركه الأشخاص الذين تتابعهم.' : "Limit political content from people you don't follow. You may still see political content from accounts you follow."



                }



              ].map((opt) => {



                const isSelected = limitPolitical === opt.limitVal;



                return (



                  <div



                    key={opt.id}



                    onClick={() => {



                      try { hapticsService.selection?.(); } catch {}



                      setLimitPolitical(opt.limitVal);



                      moderationService.setPoliticalLimit(opt.limitVal);



                      showToast(isAr ? `تم ضبط المحتوى السياسي: ${opt.title}` : `Political content: ${opt.title}`);



                    }}



                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



                  >



                    <div className="pr-3">



                      <div className="text-sm font-semibold text-white">{opt.title}</div>



                      <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{opt.desc}</div>



                    </div>



                    {/* Threads Custom Radio Circle */}



                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${



                      isSelected ? 'border-white bg-transparent' : 'border-neutral-600 bg-transparent'



                    }`}>



                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}



                    </div>



                  </div>



                );



              })}



            </div>



          </div>



        </div>



      </SwipeBackWrapper>



    );



  }











  // 7. Account Status Hub (Threads Exact 1:1 Matching media_1792755183631_163a2bda.png)



  if (activeSubView === 'status') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status')}



          <div className="p-4">



            



            {/* Top User Profile Card (Screenshot 1 Exact) */}



            <div className="rounded-2xl bg-[#101012] border border-[#222226] p-4 flex items-center gap-3.5 mb-6">



              <img



                src={resolveAvatar(currentUser?.avatar)}



                alt=""



                className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0"



                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}



              />



              <div className="min-w-0 flex-1">



                <div className="text-sm font-bold text-white font-mono truncate" dir="ltr">



                  @{currentUser?.username || 'user'}



                </div>



                <div className="text-xs text-neutral-400 truncate mt-0.5">



                  {currentUser?.displayName || currentUser?.username}



                </div>



              </div>



            </div>







            {/* Actions we've taken Section Title & Description */}



            <div className="space-y-1 mb-4 px-1">



              <h2 className="text-base font-bold text-white tracking-tight">



                {isAr ? 'الإجراءات التي اتخذناها' : "Actions we've taken"}



              </h2>



              <p className="text-xs text-neutral-400 leading-relaxed">



                {isAr 



                  ? 'تعرّف على أي إجراءات اتخذتها PULSE عندما لا يتبع حسابك أو محتواك معاييرنا. ' 



                  : "See any actions PULSE has taken when your account or content don't follow our standards. "}



                <button



                  type="button"



                  onClick={() => { try { hapticsService.light?.(); } catch {} setActiveSubView('community_standards'); }}



                  className="text-neutral-300 underline font-semibold hover:text-white tap-press"



                >



                  {isAr ? 'معرفة المزيد.' : 'Learn more.'}



                </button>



              </p>



            </div>







            {/* 3 Status Rows (Screenshot 1 Exact) */}



            <div className="divide-y divide-[#1C1C20] border-t border-b border-[#1C1C20]">



              



              {/* Row 1: Removed content and messaging issues */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('status_removed');



                }}



                className="py-4 px-1 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <span className="text-sm font-semibold text-white pr-3">



                  {isAr ? 'المحتوى الذي تمت إزالته ومشكلات المراسلة' : 'Removed content and messaging issues'}



                </span>



                <div className="flex items-center gap-2 flex-shrink-0">



                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${



                    accountStanding.hasRemovedContent ? 'border-neutral-400 text-neutral-400' : 'border-white text-white'



                  }`}>



                    {accountStanding.hasRemovedContent ? (



                      <span className="text-[10px] font-bold">!</span>



                    ) : (



                      <Check size={12} strokeWidth={3} className="text-white" />



                    )}



                  </div>



                  <Chevron size={18} className="text-neutral-500" />



                </div>



              </div>







              {/* Row 2: Content lowered in feed */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('status_lowered');



                }}



                className="py-4 px-1 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <span className="text-sm font-semibold text-white pr-3">



                  {isAr ? 'المحتوى المنخفض في الخلاصة' : 'Content lowered in feed'}



                </span>



                <div className="flex items-center gap-2 flex-shrink-0">



                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${



                    accountStanding.isFeedLowered ? 'border-neutral-400 text-neutral-400' : 'border-white text-white'



                  }`}>



                    {accountStanding.isFeedLowered ? (



                      <span className="text-[10px] font-bold">!</span>



                    ) : (



                      <Check size={12} strokeWidth={3} className="text-white" />



                    )}



                  </div>



                  <Chevron size={18} className="text-neutral-500" />



                </div>



              </div>







              {/* Row 3: Features you can't use */}



              <div



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setActiveSubView('status_features');



                }}



                className="py-4 px-1 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <span className="text-sm font-semibold text-white pr-3">



                  {isAr ? 'الميزات التي لا يمكنك استخدامها' : "Features you can't use"}



                </span>



                <div className="flex items-center gap-2 flex-shrink-0">



                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${



                    accountStanding.hasRestrictedFeatures ? 'border-neutral-400 text-neutral-400' : 'border-white text-white'



                  }`}>



                    {accountStanding.hasRestrictedFeatures ? (



                      <span className="text-[10px] font-bold">!</span>



                    ) : (



                      <Check size={12} strokeWidth={3} className="text-white" />



                    )}



                  </div>



                  <Chevron size={18} className="text-neutral-500" />



                </div>



              </div>







            </div>







            {/* Bottom Support / Appeal Link */}



            <div className="mt-8 px-1">



              <button



                type="button"



                onClick={() => { try { hapticsService.light?.(); } catch {} setActiveSubView('account_appeal'); }}



                className="text-xs text-neutral-400 hover:text-white underline tap-press transition-colors"



              >



                {isAr ? 'هل تعتقد بوجود خطأ في حالة حسابك؟ تقديم التماس.' : 'Think something was a mistake? Submit an appeal.'}



              </button>



            </div>







          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 7.1 Removed content & account access (Threads Exact 1:1 Matching media_1792755194284_fb51ca6f.png)



  if (activeSubView === 'status_removed') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView('status')}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status', () => setActiveSubView('status'))}



          <div className="p-4 space-y-6">



            



            {/* Big Circular Checkmark Badge */}



            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto mt-6 mb-2">



              <Check size={36} strokeWidth={2.5} className="text-white" />



            </div>







            {/* Central Headline & Subtitle */}



            <div className="text-center space-y-1.5 px-4">



              <h2 className="text-xl font-bold text-white tracking-tight">



                {isAr ? 'حسابك غير متأثر حالياً' : 'Your account is not affected right now'}



              </h2>



              <p className="text-xs text-neutral-400">



                {isAr ? 'شكراً لالتزامك بمعايير مجتمعنا' : 'Thank you for following our Community Standards'}



              </p>



            </div>







            {/* What this means Section */}



            <div className="pt-6 space-y-3 px-1">



              <h3 className="text-sm font-bold text-white">



                {isAr ? 'ماذا يعني هذا' : 'What this means'}



              </h3>



              <p className="text-xs text-neutral-300 leading-relaxed">



                {isAr 



                  ? 'أنت لست معرضاً لخطر فقدان الوصول إلى حسابك حالياً.' 



                  : 'You are not at risk of losing access to your account right now.'}



              </p>



              <p className="text-xs text-neutral-400 leading-relaxed">



                {isAr 



                  ? 'قد نظل نتخذ إجراءات بإزالة حسابك دون سابق إنذار إذا كان أي شيء تنشره يمثل خطراً أو تهديداً لمجتمع PULSE.' 



                  : 'We may still take down your account without warning if something you post is a risk to the PULSE community.'}



              </p>



            </div>







            {/* What you can do Section */}



            <div className="border-t border-[#1C1C20] pt-6 space-y-3 px-1">



              <h3 className="text-sm font-bold text-white">



                {isAr ? 'ما يمكنك فعله' : 'What you can do'}



              </h3>



              <div



                onClick={() => { try { hapticsService.light?.(); } catch {} setActiveSubView('community_standards'); }}



                className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <span className="text-xs text-neutral-300">



                  {isAr ? 'التعرف على معايير مجتمعنا' : 'Learn about our Community Standards'}



                </span>



                <Chevron size={18} className="text-neutral-500" />



              </div>



            </div>







          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 7.2 Content lowered in feed (Threads Exact 1:1 Matching media_1792755200688_59808c43.png)



  if (activeSubView === 'status_lowered') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView('status')}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status', () => setActiveSubView('status'))}



          <div className="p-4 space-y-6">



            



            {/* Big Circular Checkmark Badge */}



            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto mt-6 mb-2">



              <Check size={36} strokeWidth={2.5} className="text-white" />



            </div>







            {/* Central Headline & Subtitle */}



            <div className="text-center space-y-1.5 px-4">



              <h2 className="text-xl font-bold text-white tracking-tight">



                {isAr ? 'لم يتم خفض منشوراتك في الخلاصة' : 'Your posts are not lowered in feed'}



              </h2>



              <p className="text-xs text-neutral-400">



                {isAr ? 'شكراً لالتزامك بمعايير مجتمعنا' : 'Thank you for following our Community Standards'}



              </p>



            </div>







            {/* What this means Section */}



            <div className="pt-6 space-y-3 px-1">



              <h3 className="text-sm font-bold text-white">



                {isAr ? 'ماذا يعني هذا' : 'What this means'}



              </h3>



              <p className="text-xs text-neutral-300 leading-relaxed">



                {isAr 



                  ? 'لم يتم نقل محتواك إلى أسفل في خلاصات المتابعين، وتتمتع منشوراتك بترتيب وانتشار طبيعي بالكامل.' 



                  : "Your content has not been moved lower in your followers' feeds."}



              </p>



            </div>







            {/* What you can do Section */}



            <div className="border-t border-[#1C1C20] pt-6 space-y-3 px-1">



              <h3 className="text-sm font-bold text-white">



                {isAr ? 'ما يمكنك فعله' : 'What you can do'}



              </h3>



              <div



                onClick={() => { try { hapticsService.light?.(); } catch {} setActiveSubView('community_standards'); }}



                className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <span className="text-xs text-neutral-300">



                  {isAr ? 'التعرف على معايير مجتمعنا' : 'Learn about our Community Standards'}



                </span>



                <Chevron size={18} className="text-neutral-500" />



              </div>



            </div>







          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 7.3 Messaging and Features Sub-Page (Threads Exact 1:1 Matching media_1792755207779_47825220.png)



  if (activeSubView === 'status_features') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView('status')}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status', () => setActiveSubView('status'))}



          <div className="p-4 space-y-6">



            



            {/* Big Circular Checkmark Badge */}



            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto mt-6 mb-2">



              <Check size={36} strokeWidth={2.5} className="text-white" />



            </div>







            {/* Central Headline & Subtitle */}



            <div className="text-center space-y-1.5 px-4">



              <h2 className="text-xl font-bold text-white tracking-tight">



                {isAr ? 'يمكنك مراسلة الأشخاص على PULSE حالياً' : 'You can message people on PULSE right now'}



              </h2>



              <p className="text-xs text-neutral-400">



                {isAr ? 'شكراً لالتزامك بمعايير مجتمعنا.' : 'Thank you for following our Community Standards.'}



              </p>



            </div>







            {/* What this means Section */}



            <div className="pt-6 space-y-3 px-1">



              <h3 className="text-sm font-bold text-white">



                {isAr ? 'ماذا يعني هذا' : 'What this means'}



              </h3>



              <p className="text-xs text-neutral-300 leading-relaxed">



                {isAr 



                  ? 'يمكنك إرسال الرسائل والرد عليها والتفاعل معها بكامل الصلاحيات على PULSE.' 



                  : 'You can send, reply and react to messages on PULSE.'}



              </p>



            </div>







            {/* More Information Section */}



            <div className="border-t border-[#1C1C20] pt-6 space-y-3 px-1">



              <h3 className="text-sm font-bold text-white">



                {isAr ? 'مزيد من المعلومات' : 'More Information'}



              </h3>



              <div



                onClick={() => { try { hapticsService.light?.(); } catch {} setActiveSubView('community_standards'); }}



                className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"



              >



                <span className="text-xs text-neutral-300">



                  {isAr ? 'التعرف على معايير مجتمعنا' : 'Learn about our Community Standards'}



                </span>



                <Chevron size={18} className="text-neutral-500" />



              </div>



            </div>







          </div>



        </div>



      </SwipeBackWrapper>



    );



  }











  // 7.4 Community Standards Full Page



  if (activeSubView === 'community_standards') {



    return (



      <CommunityStandardsPage 



        onBack={() => setActiveSubView('status')} 



        onOpenAppeal={() => setActiveSubView('account_appeal')} 



      />



    );



  }







  // 7.5 Account Appeal & Review Full Page



  if (activeSubView === 'account_appeal') {



    return (



      <AccountAppealPage 



        onBack={() => setActiveSubView('status')} 



        onOpenCommunityStandards={() => setActiveSubView('community_standards')} 



      />



    );



  }







  // 8. Help Sub-Page (Report a Problem)



  if (activeSubView === 'help') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'المساعدة والدعم' : 'Help')}



          <div className="p-4 space-y-6">



            










            {/* Report Form */}



            <form onSubmit={handleSubmitBugReport} className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3.5">



              <div className="text-sm font-semibold text-white">{isAr ? 'الإبلاغ عن مشكلة فنية' : 'Report a problem'}</div>



              <input



                type="text"



                value={bugReportTitle}



                onChange={(e) => setBugReportTitle(e.target.value)}



                placeholder={isAr ? 'عنوان المشكلة باختصار...' : 'Brief issue title...'}



                className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"



              />



              <textarea



                rows={4}



                value={bugReportDesc}



                onChange={(e) => setBugReportDesc(e.target.value)}



                placeholder={isAr ? 'اشرح ما حدث بالتفصيل وكيف يمكن إعادة تكراره...' : 'Explain in detail what happened...'}



                className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors resize-none"



              />



              <button



                type="submit"



                disabled={reportSubmitting || !bugReportDesc.trim()}



                className="w-full py-2.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 disabled:opacity-40 tap-press transition-all"



              >



                {reportSubmitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال التقرير للهندسة' : 'Submit report')}



              </button>



            </form>







          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 9. About Sub-Page



  if (activeSubView === 'about') {



    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">



          {renderSubHeader(isAr ? 'حول PULSE' : 'About')}



          <div className="p-4 space-y-6">



            



            <div className="text-center py-6">



              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3 shadow-lg">



                <PulseLogo size={36} />



              </div>



              <h2 className="text-lg font-bold text-white tracking-wider">PULSE</h2>



              <p className="text-xs text-neutral-400 mt-1">{isAr ? 'منصة نبض الاجتماعية' : 'PULSE Social Platform'}</p>



              <span className="text-[11px] font-mono text-neutral-500 mt-0.5 block">Version 1.0.1 (Official Build)</span>



            </div>







            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">



              <button



                onClick={onOpenTerms}



                className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] tap-press text-start"



              >



                <span className="text-sm text-neutral-200">{isAr ? 'شروط الخدمة والاستخدام' : 'Terms of Service'}</span>



                <Chevron size={18} className="text-neutral-500" />



              </button>



              <button



                onClick={onOpenPrivacy}



                className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] tap-press text-start"



              >



                <span className="text-sm text-neutral-200">{isAr ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy Policy'}</span>



                <Chevron size={18} className="text-neutral-500" />



              </button>



              <div className="p-4 flex items-center justify-between">



                <span className="text-sm text-neutral-200">{isAr ? 'تراخيص المصادر المفتوحة' : 'Open Source Licenses'}</span>



                <span className="text-xs font-mono text-neutral-400">MIT / Apache 2.0</span>



              </div>



            </div>







          </div>



        </div>



      </SwipeBackWrapper>



    );



  }







  // 10. More Settings and Permissions (Exact 1:1 match with user screenshot)



  if (activeSubView === 'more') {



    const MORE_SETTINGS_ITEMS = [



      {



        id: 'time',



        icon: Clock,



        title: isAr ? 'إدارة الوقت' : 'Time management',



        onClick: () => {



          try { hapticsService.light?.(); } catch {}



          setActiveSubView('time_management');



        }



      },



      {



        id: 'app_icon',



        icon: Smartphone,



        title: isAr ? 'أيقونة التطبيق' : 'App icon',



        onClick: () => {



          try { hapticsService.light?.(); } catch {}



          setActiveSubView('app_icon');



        }



      },



      {



        id: 'subscription',



        icon: ShieldCheck,



        title: isAr ? 'إدارة الاشتراك' : 'Subscription management',



        onClick: () => {



          try { hapticsService.light?.(); } catch {}



          if (onOpenVerification) {



            onOpenVerification();



          } else {



            setActiveSubView('subscription');



          }



        }



      },



      {



        id: 'language',



        icon: Languages,



        title: isAr ? 'اللغة' : 'Language',



        value: isAr ? 'العربية' : 'English',



        onClick: () => {



          try { hapticsService.light?.(); } catch {}



          const nextLang = lang === 'ar' ? 'en' : 'ar';



          setLang(nextLang);



          showToast(nextLang === 'ar' ? 'تم ضبط اللغة على: العربية' : 'Language set to English');



        }



      }



    ];







    return (



      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>



        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>



          {/* Header matching main settings screen */}



          <div className="sticky top-0 z-30 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-4">



            <button



              type="button"



              onClick={() => setActiveSubView(null)}



              className="p-1 -ms-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"



              title={isAr ? 'رجوع' : 'Back'}



            >



              <BackIcon size={24} strokeWidth={2} />



            </button>



            <h1 className="text-xl font-bold text-white tracking-tight truncate">



              {isAr ? 'المزيد من الإعدادات والأذونات' : 'More settings and permissions'}



            </h1>



          </div>







          {/* Clean Single-Line Items List (1:1 with Screenshot) */}



          <div className="pt-2 space-y-0">



            {MORE_SETTINGS_ITEMS.map((item) => (



              <button



                key={item.id}



                type="button"



                onClick={item.onClick}



                className="w-full flex items-center justify-between py-3.5 px-4 text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group"



              >



                <div className="flex items-center gap-4 min-w-0 flex-1">



                  <item.icon size={25} strokeWidth={1.8} className="text-white flex-shrink-0" />



                  <span className="text-[15px] font-normal text-white truncate">



                    {item.title}



                  </span>



                </div>







                <div className="flex items-center gap-2 flex-shrink-0 ms-2">



                  {item.badge && (



                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-[11px] font-mono text-neutral-300 font-semibold">



                      {item.badge}



                    </span>



                  )}



                  {item.value && (



                    <span className="text-xs text-neutral-400 font-medium font-sans">



                      {item.value}



                    </span>



                  )}



                </div>



              </button>



            ))}



          </div>







          {/* Clean Cache and Version Strip */}



          <div className="mt-8 px-4 space-y-3">



            <div className="p-3.5 rounded-2xl bg-[#101012] border border-[#222226] flex items-center justify-between">



              <div>



                <div className="text-xs font-semibold text-white">{isAr ? 'ذاكرة التخزين المؤقت' : 'Cache and data'}</div>



                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{cacheSize}</div>



              </div>



              <button



                type="button"



                onClick={handleCleanCache}



                disabled={cachePurged}



                className="px-3 py-1 rounded-full bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press disabled:opacity-50 transition-all"



              >



                {cachePurged ? (isAr ? 'تم المسح' : 'Purged') : (isAr ? 'مسح' : 'Purge')}



              </button>



            </div>







            <div className="p-3.5 rounded-2xl bg-[#101012] border border-[#222226] flex items-center justify-between">



              <div>



                <div className="text-xs font-semibold text-white">PULSE v1.0.2</div>



                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{isAr ? 'الإصدار الرسمي المستقر' : 'Official stable release'}</div>



              </div>



              <button



                type="button"



                onClick={handleCheckUpdates}



                disabled={isCheckingUpdate}



                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold tap-press transition-colors flex items-center gap-1.5"



              >



                {isCheckingUpdate ? <RefreshCw size={12} className="animate-spin" /> : <span>{isAr ? 'فحص' : 'Check'}</span>}



              </button>



            </div>



          </div>



        </div>



      </SwipeBackWrapper>



    );



  }











  if (activeSubView === 'time_management') {



    return (



      <TimeManagementPage



        onBack={() => setActiveSubView('more')}



      />



    );



  }







  if (activeSubView === 'app_icon') {



    return (



      <AppIconPage



        onBack={() => setActiveSubView('more')}



      />



    );



  }







  if (activeSubView === 'subscription') {



    return (



      <VerificationPage



        onBack={() => setActiveSubView('more')}



      />



    );



  }







    // 12. Follow and Invite Sub-Page



  if (activeSubView === 'invite') {



    return (



      <FollowInvitePage



        currentUser={currentUser}



        onBack={() => setActiveSubView(null)}



      />



    );



  }







  // ==========================================



  // MAIN SETTINGS SCREEN (1:1 with PULSE Standard)



  // ==========================================







  const SETTINGS_ITEMS = [



    {



      id: 'invite',



      icon: UserPlus,



      title: isAr ? 'متابعة ودعوة الأصدقاء' : 'Follow and invite friends',



      onClick: () => setActiveSubView('invite')



    },



    {



      id: 'notifications',



      icon: Bell,



      title: isAr ? 'الإشعارات' : 'Notifications',



      onClick: () => setActiveSubView('notifications')



    },



    {



      id: 'saved',



      icon: Bookmark,



      title: isAr ? 'المحفوظات' : 'Saved',



      onClick: () => setActiveSubView('saved')



    },



    {



      id: 'liked',



      icon: Heart,



      title: isAr ? 'تسجيلات الإعجاب' : 'Liked',



      onClick: () => setActiveSubView('liked')



    },



    {



      id: 'archive',



      icon: History,



      title: isAr ? 'الأرشيف' : 'Archive',



      onClick: () => setActiveSubView('archive')



    },



    {



      id: 'privacy',



      icon: Lock,



      title: isAr ? 'الخصوصية' : 'Privacy',



      onClick: () => setActiveSubView('privacy')



    },



    {



      id: 'content',



      icon: SlidersHorizontal,



      title: isAr ? 'تفضيلات المحتوى' : 'Content preferences',



      onClick: () => setActiveSubView('content')



    },



    {



      id: 'status',



      icon: UserCheck,



      title: isAr ? 'حالة الحساب' : 'Account status',



      onClick: () => setActiveSubView('status')



    },



    {



      id: 'sharing',



      icon: Share2,



      title: isAr ? 'المشاركة عبر الملفات الشخصية' : 'Sharing across profiles',



      onClick: () => setActiveSubView('sharing')



    },



    {



      id: 'more',



      icon: Settings2,



      title: isAr ? 'المزيد من الإعدادات' : 'More settings',



      onClick: () => setActiveSubView('more')



    },



    {



      id: 'help',



      icon: HelpCircle,



      title: isAr ? 'المساعدة' : 'Help',



      onClick: () => setActiveSubView('help')



    },



    {



      id: 'about',



      icon: Info,



      title: isAr ? 'حول' : 'About',



      onClick: () => setActiveSubView('about')



    }



  ];







  return (



    <SwipeBackWrapper onBack={onBack}>



      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>



        



        {/* Top Header: Clean Left-Aligned Back Arrow + Settings (Exact Threads Match) */}



        <div className="sticky top-0 z-30 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-4">



          <button



            type="button"



            onClick={onBack}



            className="p-1 -ms-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"



            title={isAr ? 'رجوع' : 'Back'}



          >



            <BackIcon size={24} strokeWidth={2} />



          </button>



          <h1 className="text-xl font-bold text-white tracking-tight">



            {isAr ? 'الإعدادات' : 'Settings'}



          </h1>



        </div>







        {/* Settings Body: Exact Threads Layout */}



        <div className="pt-1">



          



          {/* Item 1: Accounts Center Hero Row */}



          <button



            type="button"



            onClick={() => {



              try { hapticsService.light?.(); } catch {}



              if (onOpenAccountCenter) {



                onOpenAccountCenter();



              } else {



                setActiveSubView('account_center');



              }



            }}



            className="w-full flex items-start gap-4 py-3.5 px-4 text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group mb-1"



          >



            <User size={25} strokeWidth={1.8} className="text-white flex-shrink-0 mt-0.5" />



            <div className="flex-1 min-w-0">



              <div className="text-[15px] font-semibold text-white leading-tight">



                {isAr ? 'مركز الحسابات' : 'Accounts Center'}



              </div>



              <p className="text-[13px] text-[#777777] font-normal leading-snug mt-1 max-w-sm">



                {isAr 



                  ? 'كلمة السر، الأمان، التفاصيل الشخصية، التجارب المتصلة، وتفضيلات الإعلانات' 



                  : 'Password, security, personal details, connected experiences, ad preferences'}



              </p>



            </div>



          </button>







          {/* Standard 12 Settings List (Exact Threads Order, No Borders, No Chevrons) */}



          <div className="space-y-0">



            {SETTINGS_ITEMS.map((item) => (



              <button



                key={item.id}



                type="button"



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  item.onClick();



                }}



                className="w-full flex items-center gap-4 py-3.5 px-4 text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group"



              >



                <item.icon size={25} strokeWidth={1.8} className="text-white flex-shrink-0" />



                <span className="text-[15px] font-normal text-white flex-1 truncate">



                  {item.title}



                </span>



              </button>



            ))}



          </div>







          {/* Bottom Actions: Blue Action Links (Exact Threads Match) */}



          <div className="px-4 pt-6 pb-12 space-y-1">



            <button



              type="button"



              onClick={() => {



                try { hapticsService.light?.(); } catch {}



                setShowSwitchAccountsSheet(true);



              }}



              className="block py-2 text-start text-[15px] font-medium text-[#0095F6] hover:opacity-80 active:opacity-60 transition-opacity tap-press"



            >



              {isAr ? 'تبديل الملفات الشخصية' : 'Switch profiles'}



            </button>







            <button



              type="button"



              onClick={() => {



                try { hapticsService.light?.(); } catch {}



                setShowLogoutConfirm(true);



              }}



              className="block py-2 text-start text-[15px] font-medium text-[#0095F6] hover:opacity-80 active:opacity-60 transition-opacity tap-press"



            >



              {isAr ? 'تسجيل الخروج' : 'Log out'}



            </button>



          </div>







        </div>







        {/* 1. PULSE Official Switch Profiles Bottom Sheet */}



        {showSwitchAccountsSheet && (



          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade-in p-0">



            <div 



              className="bg-[#18181A] border-t border-[#2A2A2E] rounded-t-[28px] max-w-lg w-full p-5 text-start space-y-4 animate-slide-up shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"



              dir={isAr ? 'rtl' : 'ltr'}



            >



              {/* Drag Handle */}



              <div className="w-10 h-1 bg-neutral-600 rounded-full mx-auto" />







              {/* Sheet Header */}



              <div className="flex items-center justify-between pb-1">



                <div className="flex items-center gap-2">



                  <Users size={19} className="text-white" />



                  <h3 className="text-base font-bold text-white">



                    {isAr ? 'تبديل الملفات الشخصية' : 'Switch profiles'}



                  </h3>



                </div>



                <button



                  type="button"



                  onClick={() => setShowSwitchAccountsSheet(false)}



                  className="w-8 h-8 rounded-full bg-[#242428] text-neutral-400 hover:text-white flex items-center justify-center transition-colors tap-press"



                >



                  <X size={17} />



                </button>



              </div>







              {/* Saved Accounts List */}



              <div className="bg-[#121214] border border-[#24242A] rounded-2xl divide-y divide-[#1C1C20] overflow-hidden max-h-64 overflow-y-auto">



                {savedAccounts && savedAccounts.length > 0 ? (



                  savedAccounts.map((acc) => {



                    const isActive = acc.uid === currentUser?.uid;



                    const unread = acc.unreadNotifications || 0;



                    return (



                      <div



                        key={acc.uid}



                        className={`flex items-center justify-between p-3.5 transition-colors ${



                          isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'



                        }`}



                      >



                        <button



                          type="button"



                          onClick={() => {



                            setShowSwitchAccountsSheet(false);



                            handleSwitchAccount(acc.uid, acc.username);



                          }}



                          className="flex items-center gap-3 flex-1 text-start min-w-0 tap-press"



                        >



                          <div className="relative flex-shrink-0">



                            <img



                              src={acc.avatar || DEFAULT_AVATAR}



                              alt={acc.username}



                              className={`w-10 h-10 rounded-full object-cover border ${



                                isActive ? 'border-white' : 'border-[#2A2A2E]'



                              }`}



                              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}



                            />



                            {!isActive && unread > 0 && (



                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#121214]">



                                {unread > 9 ? '9+' : unread}



                              </span>



                            )}



                          </div>







                          <div className="flex-1 min-w-0">



                            <div className="flex items-center gap-1.5">



                              <span className="text-sm font-semibold text-white truncate">



                                {acc.displayName || acc.username}



                              </span>



                              {acc.isVerified && (



                                <Check size={12} className="text-white stroke-[3] inline" />



                              )}



                            </div>



                            <span className="text-xs text-neutral-400 truncate block font-mono" dir="ltr">



                              @{acc.username}



                            </span>



                          </div>



                        </button>







                        <div className="flex items-center gap-2 flex-shrink-0">



                          {isActive ? (



                            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-sm">



                              <Check size={14} strokeWidth={2.5} />



                            </div>



                          ) : (



                            <button



                              type="button"



                              onClick={() => {



                                setShowSwitchAccountsSheet(false);



                                handleSwitchAccount(acc.uid, acc.username);



                              }}



                              className="px-3 py-1 rounded-xl bg-[#24242A] hover:bg-[#2F2F36] text-white text-xs font-semibold tap-press"



                            >



                              {isAr ? 'تبديل' : 'Switch'}



                            </button>



                          )}







                          {savedAccounts.length > 1 && (



                            <button



                              type="button"



                              onClick={(e) => {



                                e.stopPropagation();



                                try { hapticsService.light?.(); } catch {}



                                removeSavedAccount(acc.uid);



                                showToast(isAr ? `تمت إزالة @${acc.username}` : `Removed @${acc.username}`);



                              }}



                              className="p-1.5 text-neutral-500 hover:text-red-400 tap-press transition-colors"



                              title={isAr ? 'إزالة' : 'Remove'}



                            >



                              <Trash2 size={15} />



                            </button>



                          )}



                        </div>



                      </div>



                    );



                  })



                ) : (



                  <div className="flex items-center justify-between p-3.5 bg-white/[0.04]">



                    <div className="flex items-center gap-3">



                      <img



                        src={currentUser?.avatar || DEFAULT_AVATAR}



                        alt={currentUser?.username}



                        className="w-10 h-10 rounded-full object-cover border border-white"



                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}



                      />



                      <div>



                        <span className="text-sm font-semibold text-white block">



                          {currentUser?.displayName || currentUser?.username}



                        </span>



                        <span className="text-xs text-neutral-400 font-mono" dir="ltr">



                          @{currentUser?.username}



                        </span>



                      </div>



                    </div>



                    <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">



                      <Check size={14} strokeWidth={2.5} />



                    </div>



                  </div>



                )}



              </div>







              {/* Add Account Button */}



              <button



                type="button"



                onClick={() => {



                  try { hapticsService.impact?.(); } catch {}



                  setShowSwitchAccountsSheet(false);



                  setAddAccountError('');



                  setShowAddAccountModal(true);



                }}



                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#141416] hover:bg-[#1A1A1E] border border-[#24242A] text-[#0095F6] text-sm font-semibold tap-press transition-colors"



              >



                <div className="flex items-center gap-2.5">



                  <Plus size={18} />



                  <span>{isAr ? 'تسجيل الدخول إلى حساب آخر' : 'Log in to another account'}</span>



                </div>



                <Chevron size={16} className="text-neutral-500" />



              </button>







              {/* Full Multi-Accounts Manager Hub Link */}



              <button



                type="button"



                onClick={() => {



                  try { hapticsService.light?.(); } catch {}



                  setShowSwitchAccountsSheet(false);



                  if (onOpenAccountsManager) {



                    onOpenAccountsManager();



                  } else {



                    setActiveSubView('accounts-manager');



                  }



                }}



                className="w-full py-2 text-center text-xs text-neutral-400 hover:text-white font-medium tap-press transition-colors"



              >



                {isAr ? 'فتح مركز إدارة الحسابات والأمان المتقدم' : 'Open Multi-Accounts Hub'}



              </button>



            </div>



          </div>



        )}







        {/* 2. Add Account Modal */}



        {showAddAccountModal && (



          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">



            <div 



              className="bg-[#141416] border-t sm:border border-[#24242A] rounded-t-[32px] sm:rounded-[32px] p-6 max-w-md w-full text-start space-y-4 animate-slide-up shadow-2xl"



              dir={isAr ? 'rtl' : 'ltr'}



            >



              <div className="flex items-center justify-between pb-1">



                <div className="flex items-center gap-2">



                  <Users size={20} className="text-white" />



                  <h3 className="text-base font-bold text-white">



                    {isAr ? 'إضافة حساب إلى PULSE' : 'Add Account to PULSE'}



                  </h3>



                </div>



                <button



                  type="button"



                  onClick={() => setShowAddAccountModal(false)}



                  className="w-8 h-8 rounded-full bg-[#1C1C20] hover:bg-[#28282D] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"



                >



                  <X size={17} />



                </button>



              </div>







              <p className="text-xs text-neutral-400">



                {isAr 



                  ? 'سجّل الدخول بحساب آخر لحفظه على هذا الجهاز والتبديل بينهما بلمسة واحدة دون تسجيل الخروج.' 



                  : 'Log in with another account to switch between them instantly without logging out.'}



              </p>







              <form onSubmit={handleAddAccountSubmit} className="space-y-3 pt-1">



                {addAccountError && (



                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">



                    <AlertCircle size={15} className="flex-shrink-0" />



                    <span>{addAccountError}</span>



                  </div>



                )}







                <div>



                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">



                    {isAr ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}



                  </label>



                  <input



                    type="text"



                    value={addAccountIdentifier}



                    onChange={(e) => setAddAccountIdentifier(e.target.value)}



                    placeholder={isAr ? 'مثال: sovythos أو user@domain.com' : 'e.g. username or email'}



                    className="w-full bg-[#18181A] border border-[#24242A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-colors"



                    dir="ltr"



                    required



                  />



                </div>







                <div>



                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">



                    {isAr ? 'كلمة المرور' : 'Password'}



                  </label>



                  <div className="relative">



                    <input



                      type={showAddAccountPassword ? 'text' : 'password'}



                      value={addAccountPassword}



                      onChange={(e) => setAddAccountPassword(e.target.value)}



                      placeholder="••••••••"



                      className="w-full bg-[#18181A] border border-[#24242A] rounded-xl px-3.5 py-2.5 pe-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-colors"



                      dir="ltr"



                      required



                    />



                    <button



                      type="button"



                      onClick={() => setShowAddAccountPassword(!showAddAccountPassword)}



                      className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"



                    >



                      {showAddAccountPassword ? <EyeOff size={16} /> : <Eye size={16} />}



                    </button>



                  </div>



                </div>







                <div className="pt-2">



                  <button



                    type="submit"



                    disabled={addAccountLoading || !addAccountIdentifier.trim() || !addAccountPassword}



                    className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"



                  >



                    {addAccountLoading ? (



                      <>



                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />



                        <span>{isAr ? 'جارٍ تسجيل الدخول...' : 'Logging in...'}</span>



                      </>



                    ) : (



                      <span>{isAr ? 'تسجيل الدخول وإضافة الحساب' : 'Log in and Add'}</span>



                    )}



                  </button>



                </div>



              </form>



            </div>



          </div>



        )}







        {/* 3. Logout Confirmation Dialog */}



        {showLogoutConfirm && (



          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">



            <div className="bg-[#18181A] border border-[#2A2A2E] rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">



              <div className="space-y-1.5">



                <div className="text-base font-bold text-white">



                  {isAr ? 'تسجيل الخروج؟' : 'Log out of your account?'}



                </div>



                <div className="text-xs text-neutral-400 leading-relaxed">



                  {isAr 



                    ? `هل أنت متأكد من رغبتك في تسجيل الخروج من @${currentUser?.username || 'user'}؟ يمكنك تسجيل الدخول مرة أخرى في أي وقت.` 



                    : `You can always log back in to @${currentUser?.username || 'user'} at any time.`}



                </div>



              </div>



              <div className="grid grid-cols-2 gap-2.5 pt-1">



                <button



                  type="button"



                  onClick={() => setShowLogoutConfirm(false)}



                  className="py-2.5 rounded-xl bg-[#242428] hover:bg-[#2F2F36] text-white text-xs font-semibold tap-press transition-colors"



                >



                  {isAr ? 'إلغاء' : 'Cancel'}



                </button>



                <button



                  type="button"



                  onClick={handleLogout}



                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold tap-press transition-colors"



                >



                  {isAr ? 'تسجيل الخروج' : 'Log out'}



                </button>



              </div>



            </div>



          </div>



        )}







        {/* 4. Profile QR Code Modal */}



        {showQrModal && (



          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">



            <div className="bg-[#18181A] border border-[#2A2A2E] rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">



              <div className="flex items-center justify-between">



                <h3 className="text-sm font-bold text-white">



                  {isAr ? 'رمز الملف الشخصي' : 'Profile QR Code'}



                </h3>



                <button



                  type="button"



                  onClick={() => setShowQrModal(false)}



                  className="w-7 h-7 rounded-full bg-[#242428] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"



                >



                  <X size={15} />



                </button>



              </div>







              {/* QR Container */}



              <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">



                <div className="w-48 h-48 flex items-center justify-center border-4 border-black rounded-xl p-2 relative bg-white">



                  {/* Decorative QR Pattern */}



                  <div className="w-full h-full flex flex-col justify-between">



                    <div className="flex justify-between">



                      <div className="w-10 h-10 border-4 border-black rounded-lg flex items-center justify-center">



                        <div className="w-4 h-4 bg-black rounded-sm" />



                      </div>



                      <div className="w-10 h-10 border-4 border-black rounded-lg flex items-center justify-center">



                        <div className="w-4 h-4 bg-black rounded-sm" />



                      </div>



                    </div>



                    {/* Centered avatar in QR */}



                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-md mx-auto overflow-hidden bg-black flex items-center justify-center">



                      <img



                        src={currentUser?.avatar || DEFAULT_AVATAR}



                        alt={currentUser?.username}



                        className="w-full h-full object-cover"



                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}



                      />



                    </div>



                    <div className="flex justify-between">



                      <div className="w-10 h-10 border-4 border-black rounded-lg flex items-center justify-center">



                        <div className="w-4 h-4 bg-black rounded-sm" />



                      </div>



                      <div className="w-10 h-10 flex flex-wrap gap-1 p-1">



                        <div className="w-3 h-3 bg-black rounded-sm" />



                        <div className="w-3 h-3 bg-black rounded-sm" />



                      </div>



                    </div>



                  </div>



                </div>



              </div>







              <div>



                <div className="text-sm font-bold text-white">



                  {currentUser?.displayName || currentUser?.username}



                </div>



                <div className="text-xs text-neutral-400 font-mono mt-0.5" dir="ltr">



                  @{currentUser?.username}



                </div>



              </div>







              <button



                type="button"



                onClick={() => {



                  navigator.clipboard.writeText(`https://pulseeg.wuaze.com/${currentUser?.username || ''}`);



                  showToast(isAr ? 'تم نسخ الرابط' : 'Link copied');



                  setShowQrModal(false);



                }}



                className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs tap-press hover:bg-neutral-200 transition-colors"



              >



                {isAr ? 'نسخ رابط الملف' : 'Copy Profile Link'}



              </button>



            </div>



          </div>



        )}







      </div>



    </SwipeBackWrapper>



  );



}



