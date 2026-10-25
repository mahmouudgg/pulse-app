import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Check, MapPin, Link as LinkIcon, Calendar, Edit3, Mic, Bookmark, Terminal, ArrowRight, ArrowLeft, Share2, UserPlus, UserCheck, ShieldAlert, ShieldCheck, Compass, MessageCircle, BarChart2, Share, Plus, Lock, MoreHorizontal, Ban, X, UserX, ChevronDown, Heart, Repeat2 } from 'lucide-react';
import PostCard from '../components/PostCard';
import EditProfilePage from './EditProfilePage';
import PioneerBadge from '../components/PioneerBadge';
import VerifiedBadge from '../components/VerifiedBadge';
import { ProfileQrShareModal } from '../components/ProfileQrShareModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { storageService } from '../services/storageService';
import { socialGraphService } from '../services/socialGraphService';
import { analyticsService } from '../services/analyticsService';
import { moderationService } from '../services/moderationService';
import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { hapticsService } from '../services/hapticsService';
import { useSafeLink } from '../context/SafeLinkContext';
import RichTextRenderer from '../components/RichTextRenderer';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export default function ProfilePage({
  user: propUser,
  userPosts,
  onBack,
  onLike,
  onRepost,
  onOpenDetail,
  onOpenSettings,
  onOpenVerification,
  onOpenShare,
  onOpenReport,
  onBlockUser,
  onDeletePost,
  onEditPost,
  onToggleBookmark,
  onOpenFollowList,
  onOpenUserProfile,
  onOpenContactsSync,
  onOpenChat,
  onOpenInsights,
  onOpenAccountSwitcher
}) {
  const { currentUser, toggleFollow } = useAuth();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const { openSafeLink } = useSafeLink();
  const [activeTab, setActiveTab] = useState('pulses'); // 'pulses' | 'replies' | 'media' | 'reposts'
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [viewerAvatar, setViewerAvatar] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [liveUser, setLiveUser] = useState(propUser || null);

  const { 
    containerProps: avatarContainerProps, 
    handleProps: avatarHandleProps, 
    backdropStyle: avatarBackdropStyle 
  } = useSwipeDownDismiss({
    isOpen: Boolean(viewerAvatar),
    onClose: () => setViewerAvatar(null),
    dismissThreshold: 100,
  });

  // Derived user representation with live privacy & verification cache
  const cachedUser = propUser?.uid ? storageService.getUser(propUser.uid) : null;
  const profileUser = propUser ? { ...(cachedUser || {}), ...(propUser || {}), ...(liveUser || {}) } : currentUser;
  const isOwnProfile = !propUser || (currentUser?.uid && profileUser?.uid === currentUser.uid);
  const isFounder = profileUser?.isFounder || profileUser?.username === 'my';
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const [isBlocked, setIsBlocked] = useState(() =>
    profileUser?.uid && currentUser?.uid
      ? moderationService.isUserBlocked(currentUser.uid, profileUser.uid)
      : (profileUser?.uid ? moderationService.isUserBlocked(profileUser.uid) : false)
  );

  const [isBlockedByTarget, setIsBlockedByTarget] = useState(() =>
    profileUser?.uid && currentUser?.uid
      ? moderationService.isBlockedBy(profileUser.uid, currentUser.uid)
      : false
  );

  const relationship = profileUser?.uid && currentUser?.uid
    ? socialGraphService.getRelationship(currentUser.uid, profileUser.uid)
    : { isFollowing: false, followsYou: false, isMutual: false, isRequested: false, state: 'stranger' };

  const isFollowing = relationship.isFollowing;
  const isMutual = relationship.isMutual;
  const followsYou = relationship.followsYou;

  const [isRequested, setIsRequested] = useState(() => relationship.isRequested);

  const mutualSummary = !isOwnProfile && currentUser?.uid && profileUser?.uid
    ? socialGraphService.getMutualSummary(currentUser.uid, profileUser.uid, lang)
    : null;

  // Realtime subscription to target user updates
  useEffect(() => {
    if (propUser?.uid) {
      setLiveUser(propUser);
      const unsubscribe = storageService.subscribeToUser(propUser.uid, (fresh) => {
        if (fresh) setLiveUser(fresh);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [propUser?.uid]);

  // Track authentic profile view and sync live block states
  useEffect(() => {
    if (profileUser?.uid && currentUser?.uid) {
      analyticsService.trackProfileView(profileUser.uid, currentUser.uid);
      setIsBlocked(moderationService.isUserBlocked(currentUser.uid, profileUser.uid));
      setIsBlockedByTarget(moderationService.isBlockedBy(profileUser.uid, currentUser.uid));
    }
  }, [profileUser?.uid, currentUser?.uid]);

  // Sync follow request status
  useEffect(() => {
    if (profileUser?.uid && currentUser?.uid) {
      setIsRequested(storageService.hasPendingFollowRequest(profileUser.uid, currentUser.uid));
    }
  }, [profileUser?.uid, currentUser?.uid]);

  // Realtime subscription to authentic user replies across the platform
  const [userReplies, setUserReplies] = useState([]);
  useEffect(() => {
    if (!profileUser?.uid && !profileUser?.username) return;
    const unsub = storageService.subscribeToUserReplies(
      profileUser.uid,
      profileUser.username,
      (list) => {
        setUserReplies(list || []);
      }
    );
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [profileUser?.uid, profileUser?.username]);

  // Realtime & low-bandwidth auto-sync for full author pulse history
  const [syncedUserPosts, setSyncedUserPosts] = useState(() => {
    return storageService.getCachedUserPosts(profileUser?.uid, profileUser?.username);
  });
  const [isSyncingPosts, setIsSyncingPosts] = useState(false);

  useEffect(() => {
    const targetUid = profileUser?.uid;
    const targetUsername = profileUser?.username;
    if (!targetUid && !targetUsername) return;

    let isMounted = true;
    setIsSyncingPosts(true);

    storageService.fetchUserPosts(targetUid, targetUsername)
      .then((posts) => {
        if (isMounted && Array.isArray(posts)) {
          setSyncedUserPosts(posts);
        }
      })
      .catch((err) => {
        console.warn('Profile posts sync notice:', err);
      })
      .finally(() => {
        if (isMounted) setIsSyncingPosts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profileUser?.uid, profileUser?.username]);

  // Merge live feed posts (userPosts prop) with author's synced pulses
  const allMergedPosts = useMemo(() => {
    const postMap = new Map();
    (syncedUserPosts || []).forEach((p) => {
      if (p && p.id) postMap.set(String(p.id), p);
    });
    (userPosts || []).forEach((p) => {
      if (p && p.id) {
        if (postMap.has(String(p.id))) {
          postMap.set(String(p.id), { ...postMap.get(String(p.id)), ...p });
        } else {
          postMap.set(String(p.id), p);
        }
      }
    });
    return Array.from(postMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [userPosts, syncedUserPosts]);

  // STRICT RULE OF HOOKS: All hooks above this line. Conditional returns below:
  if (!profileUser || (!profileUser.uid && !profileUser.username)) {
    if (onBack) onBack();
    return null;
  }

  if (isOwnProfile && isEditOpen) {
    return <EditProfilePage onBack={() => setIsEditOpen(false)} />;
  }

  const handleFollowAction = () => {
    if (!toggleFollow || !profileUser?.uid) return;
    const res = toggleFollow(profileUser.uid);
    if (res === 'requested') {
      setIsRequested(true);
    } else {
      setIsRequested(false);
    }
  };

  const handleToggleBlock = () => {
    if (!profileUser?.uid) return;
    hapticsService.medium?.();
    if (isBlocked) {
      moderationService.unblockUser(profileUser.uid, currentUser);
      setIsBlocked(false);
      showToast(lang === 'ar' ? 'تم إلغاء الحظر' : 'User unblocked');
    } else {
      moderationService.blockUser(profileUser.uid, currentUser);
      setIsBlocked(true);
      setShowMoreMenu(false);
      showToast(lang === 'ar' ? 'تم حظر المستخدم بنجاح' : 'User blocked');
      if (onBlockUser) onBlockUser(profileUser.uid);
    }
  };

  // Delete / Edit handlers that immediately update author's synced pulse state
  const handleDeletePostInternal = (postId) => {
    setSyncedUserPosts((prev) => (prev || []).filter((p) => String(p.id) !== String(postId)));
    const cacheKey = `pulse_user_posts_${profileUser?.uid || profileUser?.username}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const filtered = JSON.parse(raw).filter((p) => String(p.id) !== String(postId));
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      }
    } catch {}
    if (onDeletePost) onDeletePost(postId);
  };

  const handleEditPostInternal = (postId, newContent) => {
    setSyncedUserPosts((prev) => (prev || []).map((p) => String(p.id) === String(postId) ? { ...p, content: newContent, text: newContent, isEdited: true } : p));
    if (onEditPost) onEditPost(postId, newContent);
  };

  // Filter posts written or reposted by this profile's user (Defensive multi-format matching)
  const authorPosts = allMergedPosts.filter((p) => {
    if (!profileUser?.uid && !profileUser?.username) return false;
    const pAuthorName = (typeof p.author === 'string' ? p.author : (p.author?.username || p.authorUsername || ''))?.toLowerCase();
    const pAuthorUid = p.authorId || p.userId || (typeof p.author === 'object' ? p.author?.uid : null);
    
    const targetUsername = (profileUser.username || '').toLowerCase();
    const targetUid = profileUser.uid;

    const isAuthorUsername = Boolean(targetUsername && pAuthorName === targetUsername);
    const isAuthorUid = Boolean(targetUid && pAuthorUid === targetUid);
    const isFounderPost = Boolean(
      (targetUsername === 'my' || targetUid === 'dev_mahmoud_yasser') &&
      (pAuthorName === 'my' || pAuthorUid === 'dev_mahmoud_yasser' || pAuthorUid === 'my')
    );
    const isReposted = Boolean(targetUid && (
      (p.repostedBy?.uid && p.repostedBy.uid === targetUid) ||
      (p.repostedBy?.username && p.repostedBy.username.toLowerCase() === targetUsername) ||
      (Array.isArray(p.reposts) && p.reposts.includes(targetUid))
    ));
    
    return isAuthorUsername || isAuthorUid || isFounderPost || isReposted;
  });

  const displayedPosts = activeTab === 'reposts'
    ? authorPosts.filter((p) => (p.isRepost && p.repostedBy?.uid && p.repostedBy.uid === profileUser?.uid) || (p.reposts && Array.isArray(p.reposts) && profileUser?.uid && p.reposts.includes(profileUser.uid)))
    : activeTab === 'media'
      ? authorPosts.filter((p) => p.imageUrl || p.videoUrl || p.hasVoice)
      : activeTab === 'replies'
        ? authorPosts.filter((p) => p.replyTo || p.isReply)
        : authorPosts.filter((p) => !p.isRepost || (profileUser?.uid && p.authorId === profileUser.uid) || ((profileUser?.username === 'my' || profileUser?.uid === 'dev_mahmoud_yasser') && (p.authorId === 'dev_mahmoud_yasser' || p.authorId === 'my')));

  const formatReplyDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffHours = Math.floor((now - d) / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMins = Math.max(1, Math.floor((now - d) / (1000 * 60)));
        return `${diffMins}m`;
      }
      if (diffHours < 24) return `${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;
      return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleToggleReplyLike = (postId, commentId) => {
    if (!currentUser) return;
    try { hapticsService.light?.(); } catch {}
    storageService.toggleLikeComment(postId, commentId, currentUser);
    setUserReplies((prev) => prev.map((item) => {
      const cId = item.comment?.id || item.id;
      if (cId === commentId) {
        const likes = Array.isArray(item.comment?.likes) ? [...item.comment.likes] : [];
        const idx = likes.indexOf(currentUser.uid);
        if (idx >= 0) {
          likes.splice(idx, 1);
        } else {
          likes.push(currentUser.uid);
        }
        return {
          ...item,
          comment: {
            ...item.comment,
            likes
          }
        };
      }
      return item;
    }));
  };

  const handleShareProfile = async () => {
    setIsQrModalOpen(true);
  };

  const pageContent = (
    <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
      {/* Profile Top Bar (Image 5) */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOwnProfile ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenAccountSwitcher) {
                  try { hapticsService.light?.(); } catch {}
                  onOpenAccountSwitcher();
                }
              }}
              className="flex items-center gap-1.5 py-1 px-2.5 -ms-2 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors tap-press group"
              title={lang === 'ar' ? 'تبديل الحساب' : 'Switch account'}
            >
              <span className="text-sm font-bold text-white font-mono" dir="ltr">
                @{profileUser?.username || 'user'}
              </span>
              <ChevronDown size={14} className="text-neutral-400 group-hover:text-white transition-colors" />
            </button>
          ) : onBack ? (
            <button
              onClick={onBack}
              className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 tap-press transition-colors"
              aria-label="رجوع"
            >
              <BackIcon size={20} />
            </button>
          ) : profileUser?.isPrivate ? (
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10" title="حساب خاص">
              <Lock size={12} className="text-neutral-300" />
              <span className="text-[11px] font-medium">{lang === 'ar' ? 'حساب خاص' : 'Private'}</span>
            </div>
          ) : (
            <div className="w-5" />
          )}
        </div>

        <div className="flex items-center gap-2 relative">
          {isOwnProfile ? (
            onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 tap-press transition-colors"
                title={t('settings')}
              >
                <Settings size={18} />
              </button>
            )
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu((prev) => !prev)}
                className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 tap-press transition-colors"
                aria-label="المزيد"
              >
                <MoreHorizontal size={18} />
              </button>

              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute end-0 top-full mt-1.5 w-48 rounded-2xl bg-[#1c1c1e] border border-white/10 shadow-2xl py-1 z-50 overflow-hidden divide-y divide-white/5 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleShareProfile();
                      }}
                      className="w-full px-4 py-2.5 text-xs text-start text-neutral-200 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                    >
                      <Share2 size={14} className="text-neutral-400" />
                      <span>{lang === 'ar' ? 'مشاركة الملف الشخصي' : 'Share profile'}</span>
                    </button>
                    <button
                      onClick={handleToggleBlock}
                      className="w-full px-4 py-2.5 text-xs text-start text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <Ban size={14} />
                      <span>{isBlocked ? (lang === 'ar' ? 'إلغاء حظر الحساب' : 'Unblock') : (lang === 'ar' ? 'حظر هذا الحساب' : 'Block account')}</span>
                    </button>
                    {onOpenReport && (
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenReport({ targetUserId: profileUser.uid });
                        }}
                        className="w-full px-4 py-2.5 text-xs text-start text-neutral-400 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                      >
                        <ShieldAlert size={14} />
                        <span>{lang === 'ar' ? 'إبلاغ عن الحساب' : 'Report'}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Threads Profile Hero Block (Image 5 - Pure OLED Black) */}
      <div className="p-4 sm:p-5 border-b border-[#18181A]">
        {/* Top Row: User Details on Start side, Circular Avatar on End side */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Display Name and Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
                {profileUser?.displayName}
              </h1>
              {profileUser?.isVerified && (
                <VerifiedBadge size={17} />
              )}
              {isFounder && (
                <div 
                  title="المطور ومؤسس المنصة الرسمي"
                  className="flex items-center gap-1 bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-md shadow-sm"
                >
                  <Terminal size={10} className="stroke-[3]" />
                  <span className="text-[9px] font-extrabold font-mono tracking-wider">FOUNDER</span>
                </div>
              )}
              {!isFounder && profileUser?.username !== 'my' && profileUser?.username !== 'pulse' && profileUser?.username !== 'sovythos' && profileUser?.pioneerNumber && (
                <PioneerBadge 
                  number={profileUser.pioneerNumber} 
                  size="sm" 
                  username={profileUser?.username}
                  uid={profileUser?.uid}
                />
              )}
            </div>

            {/* Username / Handle with Mutual / Follows You Badges */}
            <div className="flex items-center flex-wrap gap-2 mt-0.5">
              <p className="text-[13px] text-neutral-400 font-mono" dir="ltr">
                @{profileUser?.username}
              </p>
              {!isOwnProfile && isMutual && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-neutral-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/15 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  {lang === 'ar' ? 'متابعة متبادلة' : 'Mutual'}
                </span>
              )}
              {!isOwnProfile && followsYou && !isMutual && (
                <span className="inline-flex items-center text-[10.5px] font-medium text-neutral-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {lang === 'ar' ? 'يتابعك' : 'Follows you'}
                </span>
              )}
            </div>

            {/* Followers count with mini overlapping avatar (Image 5) */}
            <button
              onClick={() => onOpenFollowList && onOpenFollowList({ user: profileUser, initialType: 'followers' })}
              className="flex items-center gap-1.5 mt-3 text-[13px] text-neutral-400 hover:text-neutral-200 tap-press cursor-pointer"
            >
              <div className="flex -space-x-1.5 overflow-hidden flex-shrink-0">
                <img 
                  className="inline-block rounded-full ring-2 ring-black object-cover flex-shrink-0" 
                  src={resolveAvatar(profileUser?.avatar)}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }} 
                  alt="" 
                  style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px' }}
                />
              </div>
              <span className="font-medium text-neutral-400 hover:underline">
                {profileUser?.followersCount || (profileUser?.followers?.length || 0)} {lang === 'ar' ? 'متابع' : 'follower'}
              </span>
            </button>

            {/* Mutual followers row (PULSE Official) */}
            {mutualSummary && (
              <button
                type="button"
                onClick={() => onOpenFollowList && onOpenFollowList({ user: profileUser, initialType: 'mutual' })}
                className="flex items-center gap-2 mt-2 text-xs text-neutral-400 hover:text-neutral-200 tap-press text-start group/mutual"
              >
                <div className="flex -space-x-2 rtl:space-x-reverse overflow-hidden flex-shrink-0">
                  {mutualSummary.sampleUsers.map((mu, i) => (
                    <img
                      key={mu.uid || i}
                      src={mu.avatar || DEFAULT_AVATAR}
                      alt={mu.displayName}
                      className="w-4 h-4 rounded-full ring-1.5 ring-black object-cover"
                      style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px' }}
                    />
                  ))}
                </div>
                <span className="text-[11.5px] text-neutral-400 group-hover/mutual:underline leading-tight line-clamp-1">
                  {mutualSummary.text}
                </span>
              </button>
            )}
          </div>

          {/* Large Circular Avatar with PULSE '+' Badge (Image 5) */}
          <div className="relative flex-shrink-0" style={{ width: '68px', height: '68px', minWidth: '68px', minHeight: '68px' }}>
            <div 
              onClick={() => setViewerAvatar(profileUser?.avatar || DEFAULT_AVATAR)}
              className="rounded-full overflow-hidden border border-[#28282D] bg-[#111111] cursor-pointer tap-press select-none"
              style={{ width: '68px', height: '68px', minWidth: '68px', minHeight: '68px', maxWidth: '68px', maxHeight: '68px' }}
            >
              <img
                src={resolveAvatar(profileUser?.avatar)}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                alt={profileUser?.displayName}
                className="w-full h-full object-cover rounded-full block pointer-events-none select-none"
                style={{ width: '68px', height: '68px', minWidth: '68px', minHeight: '68px', maxWidth: '68px', maxHeight: '68px' }}
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            </div>
            {/* Small circular badge attached to avatar (Image 5) */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (isOwnProfile) {
                  setIsEditOpen(true);
                } else {
                  toggleFollow && toggleFollow(profileUser?.uid);
                }
              }}
              className="absolute -bottom-1 -start-1 w-5 h-5 rounded-full bg-[#18181A] border-2 border-black text-white flex items-center justify-center shadow-md cursor-pointer tap-press"
              title={isOwnProfile ? (lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile') : (lang === 'ar' ? 'متابعة' : 'Follow')}
            >
              <Plus size={11} className="stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Bio with RichTextRenderer (clickable mentions, hashtags, and safe links) */}
        {profileUser?.bio && (
          <div 
            dir="auto"
            className="text-[13.5px] text-neutral-200 mt-3 leading-relaxed bidi-plain whitespace-pre-line break-words"
          >
            <RichTextRenderer
              text={profileUser.bio}
              onOpenUserProfile={(u) => {
                if (onOpenUserProfile) onOpenUserProfile(u);
              }}
            />
          </div>
        )}

        {/* Metadata row (Location, Website) */}
        {((profileUser?.showLocation && profileUser?.location) || profileUser?.website) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-neutral-400">
            {profileUser?.showLocation && profileUser?.location && (
              <div className="flex items-center gap-1 text-neutral-300">
                <MapPin size={12} className="text-neutral-500" />
                <span>{profileUser.location}</span>
              </div>
            )}
            {profileUser?.website && (
              <div className="flex items-center gap-1.5">
                <LinkIcon size={12} className="text-neutral-500 flex-shrink-0" />
                <button 
                  type="button"
                  onClick={() => openSafeLink(profileUser.website)}
                  className="text-white hover:underline truncate max-w-[200px] text-start tap-press inline-flex items-center gap-1"
                  title={profileUser.website}
                >
                  <span className="truncate">{profileUser.website.replace(/^https?:\/\//i, '')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Row (PULSE Style 1:1 Pixel-Perfect) */}
        <div className="flex items-center gap-2 mt-4">
          {isOwnProfile ? (
            <>
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex-1 h-[38px] min-h-[38px] max-h-[38px] px-2 rounded-xl bg-black hover:bg-[#141416] active:bg-[#1C1C20] border border-[#2E2E32] text-xs sm:text-[13px] font-bold text-white flex items-center justify-center tap-press transition-colors whitespace-nowrap truncate"
              >
                {lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit profile'}
              </button>
              <button
                onClick={() => onOpenInsights && onOpenInsights()}
                className="flex-1 h-[38px] min-h-[38px] max-h-[38px] px-2 rounded-xl bg-black hover:bg-[#141416] active:bg-[#1C1C20] border border-[#2E2E32] text-xs sm:text-[13px] font-bold text-white flex items-center justify-center tap-press transition-colors whitespace-nowrap truncate"
              >
                {lang === 'ar' ? 'عرض الرؤى' : 'View insights'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFollowAction}
                className={`flex-1 h-[38px] min-h-[38px] max-h-[38px] px-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all tap-press flex items-center justify-center whitespace-nowrap truncate ${
                  isFollowing
                    ? 'bg-black hover:bg-[#141416] text-neutral-300 border border-[#2E2E32]'
                    : isRequested
                    ? 'bg-black text-neutral-400 border border-[#3E3E42]'
                    : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
                }`}
              >
                {isFollowing
                  ? (lang === 'ar' ? 'متابع' : 'Following')
                  : isRequested
                  ? (lang === 'ar' ? 'تم الطلب' : 'Requested')
                  : followsYou
                  ? (lang === 'ar' ? 'رد المتابعة' : 'Follow back')
                  : (lang === 'ar' ? 'متابعة' : 'Follow')}
              </button>

              <button
                onClick={() => onOpenChat && onOpenChat(profileUser)}
                className="flex-1 h-[38px] min-h-[38px] max-h-[38px] px-2 rounded-xl bg-black hover:bg-[#141416] border border-[#2E2E32] text-white text-xs sm:text-[13px] font-bold tap-press transition-colors flex items-center justify-center whitespace-nowrap truncate"
              >
                {lang === 'ar' ? 'مراسلة' : 'Message'}
              </button>

              {/* Founder Superpowers */}
              {(currentUser?.isFounder || currentUser?.username === 'my') && (
                <button
                  onClick={() => {
                    const next = !profileUser.isVerified;
                    storageService.toggleVerification(profileUser.uid, next);
                    showToast(next ? 'تم التوثيق' : 'تم إلغاء التوثيق');
                  }}
                  className="h-[38px] min-h-[38px] max-h-[38px] px-3 rounded-xl border border-white/20 text-xs font-semibold text-white hover:bg-white/10 tap-press whitespace-nowrap flex items-center justify-center"
                >
                  {profileUser.isVerified ? 'إلغاء التوثيق' : 'توثيق'}
                </button>
              )}
            </>
          )}

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="w-[38px] h-[38px] min-w-[38px] min-h-[38px] rounded-xl bg-black hover:bg-[#141416] active:bg-[#1C1C20] border border-[#2E2E32] text-white tap-press transition-colors flex-shrink-0 flex items-center justify-center"
            title={lang === 'ar' ? 'مشاركة الحساب والـ QR' : 'Share & QR'}
          >
            <Share size={15} />
          </button>
        </div>
      </div>

      {/* PULSE Profile Sub-tabs (Pulses, Replies, Media, Reposts) */}
      <div className="flex border-b border-[#18181A] bg-black/95 backdrop-blur-md sticky top-[48px] z-20">
        {[
          { id: 'pulses', label: lang === 'ar' ? 'النبضات' : 'Pulses' },
          { id: 'replies', label: lang === 'ar' ? 'الردود' : 'Replies' },
          { id: 'media', label: lang === 'ar' ? 'الوسائط' : 'Media' },
          { id: 'reposts', label: lang === 'ar' ? 'إعادات النشر' : 'Reposts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-[13.5px] font-semibold transition-all relative tap-press text-center ${
              activeTab === tab.id ? 'text-white font-bold' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Posts Feed or Private Account Screen or Blocked Screen */}
      {isBlockedByTarget ? (
        <div className="py-24 px-6 text-center flex flex-col items-center justify-center border-t border-[#18181A]">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mb-4">
            <UserX size={28} />
          </div>
          <h3 className="text-white font-bold text-base mb-1">
            {lang === 'ar' ? 'هذا الحساب غير متوفر' : 'This profile is not available'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
            {lang === 'ar'
              ? 'قد يكون الرابط الذي اتبعته غير صالح، أو ربما قام صاحب الحساب بحظر الوصول إليه.'
              : 'The link you followed may be broken, or the account owner may have restricted access.'}
          </p>
        </div>
      ) : isBlocked ? (
        <div className="py-20 px-6 text-center flex flex-col items-center justify-center border-t border-[#18181A]">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <Ban size={28} />
          </div>
          <h3 className="text-white font-bold text-base mb-1">
            {lang === 'ar' ? 'لقد قمت بحظر هذا الحساب' : 'You blocked this account'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-4">
            {lang === 'ar'
              ? 'لن يتمكن هذا الحساب من رؤية منشوراتك أو التفاعل معك، ولن تظهر منشوراته لديك.'
              : 'This account cannot see your posts or interact with you, and their posts are hidden.'}
          </p>
          <button
            onClick={handleToggleBlock}
            className="px-5 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press transition-colors"
          >
            {lang === 'ar' ? 'إلغاء الحظر' : 'Unblock'}
          </button>
        </div>
      ) : profileUser?.isPrivate && !isFollowing && !isOwnProfile ? (
        <div className="py-20 px-6 text-center flex flex-col items-center justify-center border-t border-[#18181A]">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4">
            <Lock size={28} />
          </div>
          <h3 className="text-white font-bold text-base mb-1">
            {lang === 'ar' ? 'هذا الحساب خاص' : 'This account is private'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
            {lang === 'ar'
              ? 'قم بمتابعة هذا الحساب للاطلاع على منشوراته وصوره وتفاعلاته.'
              : 'Follow this account to see their posts, media, and interactions.'}
          </p>
          {isRequested && (
            <p className="text-xs text-[#0095F6] mt-3 font-medium">
              {lang === 'ar' ? 'طلب المتابعة معلق بانتظار موافقة صاحب الحساب' : 'Follow request pending approval'}
            </p>
          )}
        </div>
      ) : activeTab === 'replies' ? (
        <div className="divide-y divide-[#18181A]">
          {userReplies.length > 0 ? (
            userReplies.map((item) => {
              const parent = item.parentPost || {};
              const reply = item.comment || {};
              const parentAuthor = parent.author || {};
              const replyAuthor = reply.author || profileUser || {};
              const isReplyLiked = Array.isArray(reply.likes) && currentUser?.uid && reply.likes.includes(currentUser.uid);
              const replyLikesCount = Array.isArray(reply.likes) ? reply.likes.length : 0;

              return (
                <div key={item.id} className="p-4 hover:bg-white/[0.015] transition-colors">
                  {/* 1. Parent Post Block */}
                  <div 
                    onClick={() => onOpenDetail && parent.id && onOpenDetail(parent)}
                    className="flex gap-3 cursor-pointer group"
                  >
                    {/* Left Column: Parent Avatar + Signature Connector Line */}
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenUserProfile && (parentAuthor.uid || parentAuthor.username)) {
                            onOpenUserProfile(parentAuthor);
                          }
                        }}
                        className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0 tap-press"
                      >
                        <img
                          src={parentAuthor.avatar || DEFAULT_AVATAR}
                          alt={parentAuthor.displayName || 'Author'}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      {/* PULSE Signature Vertical Connector Line */}
                      <div className="w-[2px] bg-[#2A2A2E] flex-1 my-1.5 rounded-full" />
                    </div>

                    {/* Right Column: Parent Content */}
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="font-bold text-white text-sm truncate">
                            {parentAuthor.displayName || parentAuthor.username || 'Pulse Pioneer'}
                          </span>
                          {parentAuthor.isVerified && <VerifiedBadge size={14} />}
                          <span className="text-xs text-neutral-500 font-mono" dir="ltr">
                            @{parentAuthor.username}
                          </span>
                          <span className="text-neutral-600 text-xs">•</span>
                          <span className="text-xs text-neutral-500">
                            {formatReplyDate(parent.createdAt)}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => e.stopPropagation()} 
                          className="p-1 text-neutral-500 hover:text-white"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      <div className="text-[11.5px] text-neutral-400 mt-0.5">
                        {lang === 'ar' ? 'رداً على' : 'Replying to'}{' '}
                        <span className="text-neutral-300 font-mono" dir="ltr">
                          @{parentAuthor.username || 'post'}
                        </span>
                      </div>

                      {parent.content && (
                        <p className="text-[14px] text-neutral-200 mt-1.5 leading-relaxed break-words line-clamp-3">
                          {parent.content}
                        </p>
                      )}

                      {/* Parent Post Actions */}
                      <div className="flex items-center gap-5 mt-2.5 text-neutral-400">
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onLike && parent.id) onLike(parent.id);
                          }}
                          className="hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Heart size={16} className={parent.likes?.includes(currentUser?.uid) ? 'fill-red-500 text-red-500' : ''} />
                          {Array.isArray(parent.likes) && parent.likes.length > 0 && (
                            <span>{parent.likes.length}</span>
                          )}
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenDetail && parent.id) onOpenDetail(parent);
                          }}
                          className="hover:text-white transition-colors flex items-center gap-1 text-xs"
                        >
                          <MessageCircle size={16} />
                          {parent.repliesCount > 0 && <span>{parent.repliesCount}</span>}
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRepost && parent.id) onRepost(parent.id);
                          }}
                          className="hover:text-blue-400 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Repeat2 size={16} />
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenShare && parent.id) onOpenShare(parent);
                          }}
                          className="hover:text-white transition-colors"
                        >
                          <Share2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Connected User Reply Block */}
                  <div 
                    onClick={() => onOpenDetail && parent.id && onOpenDetail(parent)}
                    className="flex gap-3 cursor-pointer pt-1"
                  >
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenUserProfile) onOpenUserProfile(profileUser);
                        }}
                        className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0 tap-press"
                      >
                        <img
                          src={replyAuthor.avatar || profileUser?.avatar || DEFAULT_AVATAR}
                          alt={profileUser?.displayName}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="font-bold text-white text-sm truncate">
                            {profileUser?.displayName}
                          </span>
                          {profileUser?.isVerified && <VerifiedBadge size={14} />}
                          <span className="text-xs text-neutral-500 font-mono" dir="ltr">
                            @{profileUser?.username}
                          </span>
                          <span className="text-neutral-600 text-xs">•</span>
                          <span className="text-xs text-neutral-500">
                            {formatReplyDate(reply.createdAt)}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => e.stopPropagation()} 
                          className="p-1 text-neutral-500 hover:text-white"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      <div className="text-[14px] text-white mt-1.5 leading-relaxed break-words font-normal">
                        <RichTextRenderer text={reply.content || ''} />
                      </div>

                      {/* Reply Media (Voice or Image) */}
                      {reply.voiceUrl && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-[#141416] border border-[#26262A] flex items-center gap-2">
                          <audio src={reply.voiceUrl} controls className="w-full h-8" />
                        </div>
                      )}
                      {reply.imageUrl && (
                        <div className="mt-2.5 rounded-2xl overflow-hidden border border-white/10 max-h-72">
                          <img src={reply.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Reply Action Row */}
                      <div className="flex items-center gap-5 mt-2.5 text-neutral-400">
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReplyLike(item.postId, item.comment?.id || item.id);
                          }}
                          className="hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Heart size={16} className={isReplyLiked ? 'fill-red-500 text-red-500' : ''} />
                          {replyLikesCount > 0 && <span>{replyLikesCount}</span>}
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenDetail && parent.id) onOpenDetail(parent);
                          }}
                          className="hover:text-white transition-colors flex items-center gap-1 text-xs"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRepost && parent.id) onRepost(parent.id);
                          }}
                          className="hover:text-blue-400 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Repeat2 size={16} />
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenShare && parent.id) onOpenShare(parent);
                          }}
                          className="hover:text-white transition-colors"
                        >
                          <Share2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-16 text-center text-xs text-neutral-500 leading-relaxed">
              {lang === 'ar' ? 'لا توجد ردود حتى الآن.' : 'No replies yet.'}
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#181818]">
          {displayedPosts.length > 0 ? (
            displayedPosts.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                animationIndex={idx}
                currentUserId={currentUser?.uid}
                currentUser={currentUser}
                onLike={onLike}
                onRepost={onRepost}
                onOpenDetail={onOpenDetail}
                onOpenShare={onOpenShare}
                onOpenReport={onOpenReport}
                onBlockUser={onBlockUser}
                onDeletePost={handleDeletePostInternal}
                onEditPost={handleEditPostInternal}
                onToggleBookmark={onToggleBookmark}
                onOpenUserProfile={onOpenUserProfile}
              />
            ))
          ) : isSyncingPosts ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto" />
              <div className="text-xs text-neutral-500">
                {lang === 'ar' ? 'جارٍ مزامنة النبضات...' : 'Syncing pulses...'}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-neutral-500 leading-relaxed">
              {activeTab === 'bookmarks' 
                ? (lang === 'ar' ? 'لم تقم بحفظ أي إشارات مرجعية بعد.' : 'No bookmarks saved yet.')
                : t('noPostsYet')}
            </div>
          )}
        </div>
      )}

      {/* PULSE Official Blurred Backdrop Avatar Modal (Portal Outside Any Transformed Containers) */}
      {viewerAvatar && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 w-screen h-[100dvh] max-h-screen z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl p-4 overflow-hidden select-none"
          style={avatarBackdropStyle}
          onClick={() => setViewerAvatar(null)}
        >
          {/* Top Bar with safe area */}
          <div 
            className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 right-4 flex items-center justify-between text-white z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setViewerAvatar(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white tap-press transition-colors"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
            <div className="text-sm font-semibold tracking-tight font-mono text-neutral-200" dir="ltr">
              @{profileUser?.username}
            </div>
            <div className="w-10" />
          </div>

          {/* Centered Circular Avatar Card with Spring Pull-to-Dismiss */}
          <div 
            {...avatarContainerProps}
            className="relative flex flex-col items-center tap-press cursor-grab active:cursor-grabbing max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle indicator */}
            <div {...avatarHandleProps} className="w-12 h-1 rounded-full bg-white/30 mb-6" />

            <div className="w-[72vw] h-[72vw] max-w-[300px] max-h-[300px] rounded-full overflow-hidden ring-4 ring-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] bg-neutral-900 select-none">
              <img 
                src={resolveAvatar(viewerAvatar)}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }} 
                alt={profileUser?.displayName || 'Avatar'} 
                className="w-full h-full object-cover rounded-full pointer-events-none select-none"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            </div>

            <div className="text-center mt-5">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="text-white text-lg font-bold tracking-tight">
                  {profileUser?.displayName}
                </h3>
                {isFounder && (
                  <span className="px-1.5 py-0.5 rounded bg-white text-black text-[9px] font-black font-mono">
                    FOUNDER
                  </span>
                )}
                {profileUser?.isVerified && !isFounder && <VerifiedBadge size={16} />}
              </div>
              <p className="text-neutral-400 text-xs font-mono mt-0.5" dir="ltr">
                @{profileUser?.username}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ProfileQrShareModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        user={profileUser}
        onOpenUserProfile={onOpenUserProfile}
      />
    </div>
  );

  return onBack ? (
    <SwipeBackWrapper onBack={onBack}>{pageContent}</SwipeBackWrapper>
  ) : (
    pageContent
  );
}
