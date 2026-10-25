import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Heart, MessageCircle, Repeat2, Share2, Check, Bookmark, MoreHorizontal, ShieldAlert, UserX, Terminal, Trash2, Eye, Edit3, Link2, Maximize2, MapPin, Copy, Send, Plus, Languages, VolumeX, EyeOff, AlertCircle, Shield, BarChart2, ExternalLink, Play, Pause, Music2, Loader2 } from 'lucide-react';
import RealAudioPlayer from './RealAudioPlayer';
import ConfirmModal from './ConfirmModal';
import PulseMediaViewer from './PulseMediaViewer';
import PulseVideoPlayer from './PulseVideoPlayer';
import PulseMediaImage from './PulseMediaImage';
import SensitiveMediaGate from './SensitiveMediaGate';
import { isPostSensitive } from '../utils/ageVerification';
import RichTextRenderer from './RichTextRenderer';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { storageService } from '../services/storageService';
import { analyticsService } from '../services/analyticsService';
import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';
import PioneerBadge from './PioneerBadge';
import VerifiedBadge from './VerifiedBadge';
import AnimatedCounter from './AnimatedCounter';
import { affinityEngine } from '../services/affinityEngine';
import { moderationService } from '../services/moderationService';
import { socialGraphService } from '../services/socialGraphService';
import { hapticsService } from '../services/hapticsService';
import { soundService } from '../services/soundService';
import { translationService } from '../services/translationService';

export default function PostCard({
  post,
  currentUserId,
  currentUser,
  onLike,
  onRepost,
  onOpenDetail,
  onOpenShare,
  onOpenReport,
  onBlockUser,
  onDeletePost,
  onEditPost,
  onToggleBookmark,
  onOpenUserProfile,
  onFilterByLocation,
  animationIndex = 0
}) {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [repostAnimating, setRepostAnimating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewerMedia, setViewerMedia] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const [isSuppressed, setIsSuppressed] = useState(() => {
    return affinityEngine.isPostSuppressed(currentUserId, post);
  });
  const [hideLikeCounts, setHideLikeCounts] = useState(() => localStorage.getItem('pulse_hide_likes_counts') === 'true');

  // Real Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedData, setTranslatedData] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setShowMenu(false);

    if (!post?.content || !post.content.trim()) {
      showToast(lang === 'ar' ? 'لا يوجد نص للترجمة في هذه النبضة' : 'No text to translate');
      return;
    }

    if (translatedData && translatedData.translatedText) {
      setShowTranslation((prev) => !prev);
      hapticsService.selection?.();
      return;
    }

    try {
      setIsTranslating(true);
      hapticsService.light?.();
      const res = await translationService.translate(post.content);
      if (res && res.success && res.translatedText) {
        setTranslatedData(res);
        setShowTranslation(true);
        hapticsService.success?.();
        showToast(
          lang === 'ar'
            ? `تمت الترجمة من ${res.sourceLabel || 'اللغة الأصلية'}`
            : `Translated from ${res.sourceLang === 'ar' ? 'Arabic' : 'English'}`
        );
      } else {
        showToast(lang === 'ar' ? 'تعذر إتمام الترجمة حالياً' : 'Translation failed');
      }
    } catch (err) {
      console.error('Translation error:', err);
      showToast(lang === 'ar' ? 'حدث خطأ أثناء الترجمة' : 'Error during translation');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const handlePref = () => {
      setHideLikeCounts(localStorage.getItem('pulse_hide_likes_counts') === 'true');
    };
    window.addEventListener('pulse_preference_changed', handlePref);
    return () => window.removeEventListener('pulse_preference_changed', handlePref);
  }, []);

  const handleInterested = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    hapticsService.success?.();
    affinityEngine.trackExplicitInterest(currentUserId, post, true);
    showToast(lang === 'ar' ? 'تم تسجيل اهتمامك · سنقترح المزيد من هذا المحتوى' : 'Noted as interested · Showing more like this');
  };

  const handleNotInterested = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    hapticsService.warning?.();
    affinityEngine.trackExplicitInterest(currentUserId, post, false);
    setIsSuppressed(true);
  };

  const handleUndoSuppression = (e) => {
    e.stopPropagation();
    hapticsService.light?.();
    affinityEngine.undoExplicitInterest(currentUserId, post);
    setIsSuppressed(false);
    showToast(lang === 'ar' ? 'تم التراجع عن إخفاء النبضة' : 'Action undone');
  };

  // Double-tap to like state
  const lastTapRef = useRef(0);
  const clickTimerRef = useRef(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Music playback sync state
  const [soundPlayingId, setSoundPlayingId] = useState(null);
  useEffect(() => {
    if (!post?.music) return;
    const unsub = soundService.subscribe((state) => {
      setSoundPlayingId(state.playingId);
    });
    return () => unsub();
  }, [post?.music]);
  const [burstCoords, setBurstCoords] = useState({ x: 50, y: 50 });

  // Long-press context sheet state
  const longPressTimerRef = useRef(null);
  const isLongPressTriggered = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Track authentic post view
  useEffect(() => {
    if (post?.id) {
      analyticsService.trackPostView(post.id, currentUserId);
    }
  }, [post?.id, currentUserId]);

  const resolveEngagementList = (raw) => {
    if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string');
    if (typeof raw === 'object' && raw !== null) {
      const keys = Object.keys(raw);
      if (keys.length === 0) return [];
      const isNumeric = keys.every((k) => /^\d+$/.test(k));
      if (isNumeric) return Object.values(raw).filter((v) => typeof v === 'string' && v);
      return keys.filter((k) => raw[k]);
    }
    return [];
  };

  const targetPostId = post.isRepost && post.originalPostId ? post.originalPostId : post.id;
  const userBookmarks = resolveEngagementList(currentUser?.bookmarks);
  const isSaved = userBookmarks.includes(targetPostId);
  const likesArr = resolveEngagementList(post.likes);
  const repostsArr = resolveEngagementList(post.reposts);
  const isLiked = currentUserId ? likesArr.includes(currentUserId) : false;
  const isReposted = currentUserId ? repostsArr.includes(currentUserId) : false;
  // Always derive count dynamically from the resolved list to prevent UI freeze
  const likesCount = likesArr.length;
  const repostsCount = repostsArr.length;
  const repliesCount = post.repliesCount || 0;
  const voiceListensCount = post.voiceListens || 0;

  // Real interactive Poll state
  const [localPoll, setLocalPoll] = useState(post.poll || null);
  useEffect(() => {
    if (post.poll) setLocalPoll(post.poll);
  }, [post.poll]);

  const pollTotalVotes = localPoll?.options?.reduce(
    (sum, opt) => sum + (Array.isArray(opt.votes) ? opt.votes.length : 0),
    0
  ) || localPoll?.totalVotes || 0;

  const hasUserVoted = Boolean(
    currentUserId &&
    localPoll?.options?.some((opt) => Array.isArray(opt.votes) && opt.votes.includes(currentUserId))
  );

  const handleVotePoll = (optIdx) => {
    if (!currentUserId || !localPoll) return;
    hapticsService.selection?.();
    const updated = storageService.votePoll(post.id, optIdx, currentUserId);
    if (updated) {
      setLocalPoll(updated);
    }
  };

  const handleLikeClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) return;
    hapticsService.like();
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 500);
    affinityEngine.trackEngagement(currentUser.uid, post, 'like');
    if (onLike) onLike(targetPostId);
  };

  const handleRepostClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) return;
    hapticsService.medium();
    setRepostAnimating(true);
    setTimeout(() => setRepostAnimating(false), 500);
    affinityEngine.trackEngagement(currentUser.uid, post, 'repost');
    if (onRepost) onRepost(targetPostId);
  };

  const handleBookmarkClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!currentUser) return;
    hapticsService.medium();
    affinityEngine.trackEngagement(currentUser.uid, post, 'bookmark');
    if (onToggleBookmark) onToggleBookmark(targetPostId);
  };

  const handleAudioPlay = () => {
    hapticsService.light();
    if (currentUser) {
      storageService.incrementVoiceListens(post.id, currentUser);
      affinityEngine.trackAudioListen(currentUser.uid, post, 1.0);
    }
  };

  const handleCardClick = (e) => {
    // If long press, menu, delete modal, or editing is active, consume click without opening details
    if (isLongPressTriggered.current || showMenu || showDeleteConfirm || isEditing) {
      isLongPressTriggered.current = false;
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_GAP = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_GAP) {
      // Double tap detected!
      clearTimeout(clickTimerRef.current);
      lastTapRef.current = 0;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;
      setBurstCoords({ x, y });
      setShowHeartBurst(true);
      hapticsService.medium();

      if (!isLiked && onLike) {
        handleLikeClick(e);
      }
      setTimeout(() => setShowHeartBurst(false), 850);
    } else {
      lastTapRef.current = now;
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        if (!showMenu && !showDeleteConfirm && !isEditing && onOpenDetail) {
          onOpenDetail(post);
        }
      }, DOUBLE_TAP_GAP);
    }
  };

  const handleCardTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    isLongPressTriggered.current = false;
    clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      hapticsService.heavy();
      setShowMenu(true);
    }, 550);
  };

  const handleCardTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimerRef.current);
      }
    }
  };

  const handleCardTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    if (isNaN(time)) return '';
    const now = Date.now();
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return lang === 'ar' ? 'الآن' : 'now';
    if (minutes < 60) return `${minutes}${lang === 'ar' ? 'د' : 'm'}`;
    if (hours < 24) return `${hours}${lang === 'ar' ? 'س' : 'h'}`;
    return `${days}${lang === 'ar' ? 'ي' : 'd'}`;
  };

  const displayAuthor = post.isRepost && post.originalAuthor ? post.originalAuthor : (post.author || {});
  const displayAuthorUid = displayAuthor.uid || post.authorId || post.author?.uid;
  const isFounder = displayAuthor.isFounder || displayAuthor.username === 'my' || displayAuthor.uid === 'dev_mahmoud_yasser';
  const userFollowingList = resolveEngagementList(currentUser?.following);
  const isFollowingAuthor = displayAuthorUid ? userFollowingList.includes(displayAuthorUid) : false;
  const isSelf = currentUserId && (currentUserId === displayAuthorUid || currentUserId === post.authorId);

  const authorRelationship = currentUserId && displayAuthorUid && !isSelf
    ? socialGraphService.getRelationship(currentUserId, displayAuthorUid)
    : null;
  const isAuthorFollowsYou = Boolean(authorRelationship?.followsYou && !authorRelationship?.isMutual);
  const isAuthorMutual = Boolean(authorRelationship?.isMutual);

  // Guard against corrupt/empty orphaned posts
  if (!post || (!post.content && !post.imageUrl && !post.videoUrl && !post.hasVoice && !post.isRepost)) {
    return null;
  }

  // PULSE Official "Not Interested" collapsed card
  if (isSuppressed) {
    return (
      <div className="py-3 px-4 mx-3 my-2 rounded-2xl bg-[#121214] border border-[#222226] flex items-center justify-between animate-fade-in select-none">
        <div className="flex items-center gap-2.5 text-xs text-neutral-300">
          <EyeOff size={16} className="text-neutral-400 flex-shrink-0" />
          <span>{lang === 'ar' ? 'تم إخفاء النبضة · سنقلل اقتراح نبضات مشابهة' : 'Pulse hidden · We will show fewer pulses like this'}</span>
        </div>
        <button
          type="button"
          onClick={handleUndoSuppression}
          className="text-xs font-bold text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 tap-press transition-colors flex-shrink-0"
        >
          {lang === 'ar' ? 'تراجع' : 'Undo'}
        </button>
      </div>
    );
  }

  const authorDisplayName = displayAuthor.displayName || displayAuthor.name || displayAuthor.username || 'مستخدم';
  const authorUsername = displayAuthor.username || (displayAuthorUid ? String(displayAuthorUid).slice(0, 10) : '');

  return (
    <article
      onClick={handleCardClick}
      onTouchStart={handleCardTouchStart}
      onTouchMove={handleCardTouchMove}
      onTouchEnd={handleCardTouchEnd}
      style={{ animationDelay: `${Math.min(animationIndex * 0.04, 0.25)}s` }}
      className="border-b border-[#181818] py-4 px-4 hover:bg-[#070707] active:bg-[#0C0C0C] transition-colors cursor-pointer select-none animate-fade-in-up relative overflow-hidden card-press gpu-accelerated"
    >
      {/* Repost Header Banner - Monochrome */}
      {post.isRepost && post.repostedBy && (
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium mb-2.5 px-1">
          <Repeat2 size={13} className="text-white/80" />
          <span className="truncate">
            {post.repostedBy.uid === currentUserId
              ? (lang === 'ar' ? 'أنت أعدت نشر هذا' : 'You reposted')
              : (lang === 'ar' ? `أعاد ${post.repostedBy.displayName || post.repostedBy.username} النشر` : `${post.repostedBy.displayName || post.repostedBy.username} reposted`)}
          </span>
        </div>
      )}

      {/* Floating Heart Burst on Double Tap */}
      {showHeartBurst && (
        <div 
          className="absolute pointer-events-none z-40 animate-heart-burst"
          style={{
            left: `${burstCoords.x}px`,
            top: `${burstCoords.y}px`
          }}
        >
          <div className="w-16 h-16 -ml-8 -mt-8 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(255,48,64,0.6)] border border-[#FF3040]/40">
            <Heart size={36} className="fill-[#FF3040] text-[#FF3040] drop-shadow-[0_0_12px_rgba(255,48,64,0.9)]" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* User Avatar with PULSE '+' Follow Badge */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenUserProfile && displayAuthor) {
              onOpenUserProfile({
                ...displayAuthor,
                uid: displayAuthorUid
              });
            }
          }}
          className="relative flex-shrink-0 tap-press cursor-pointer"
        >
          <img
            src={resolveAvatar(displayAuthor.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
            alt={displayAuthor.displayName}
            className={`w-10 h-10 rounded-full aspect-square object-cover border flex-shrink-0 block ${
              isFounder ? 'border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.12)]' : 'border-[#222222]'
            }`}
            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', maxWidth: '40px', maxHeight: '40px' }}
          />
          {isFounder && (
            <div 
              title="المطور ومؤسس المنصة الرسمي"
              className="absolute -bottom-1 -right-1 bg-black rounded-full p-[1.5px]"
            >
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-md">
                <Terminal size={10} className="text-black stroke-[3]" />
              </div>
            </div>
          )}
          {/* PULSE Signature '+' follow button on avatar if not following and not self */}
          {!isSelf && !isFollowingAuthor && displayAuthorUid && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!currentUser) return;
                hapticsService.medium();
                storageService.toggleFollow(displayAuthorUid, currentUser);
                if (isAuthorFollowsYou) {
                  showToast(lang === 'ar' ? `أصبحتما الآن تتابعان بعضكما البعض.` : `You are now mutually connected.`);
                } else {
                  showToast(lang === 'ar' ? `تمت متابعة @${displayAuthor.username}` : `Following @${displayAuthor.username}`);
                }
              }}
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center border-2 border-black tap-press shadow-sm hover:scale-110 active:scale-90 transition-transform"
              title={isAuthorFollowsYou ? (lang === 'ar' ? 'رد المتابعة' : 'Follow back') : (lang === 'ar' ? 'متابعة' : 'Follow')}
            >
              <Plus size={10} className="stroke-[3.5]" />
            </button>
          )}
        </div>

        {/* Post Content */}
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          {/* Author Header */}
          <div className="flex items-center justify-between">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenUserProfile && displayAuthor) {
                  onOpenUserProfile({
                    ...displayAuthor,
                    uid: displayAuthorUid
                  });
                }
              }}
              className="flex items-center gap-1.5 flex-wrap cursor-pointer group/author"
            >
              <span className="font-semibold text-[14.5px] text-white transition-opacity group-hover/author:opacity-85 flex items-center gap-1">
                <span>{authorDisplayName}</span>
                {displayAuthor.isVerified && !isFounder && (
                  <VerifiedBadge size={14} />
                )}
              </span>

              {authorUsername && (
                <span className="text-xs text-neutral-500 font-mono hidden sm:inline" dir="ltr">
                  @{authorUsername}
                </span>
              )}

              <span className="text-xs text-neutral-600">·</span>
              <span className="text-xs text-neutral-500 font-normal">
                {formatDate(post.createdAt)}
              </span>
              {post.isEdited && (
                <span className="text-[11px] text-neutral-400 font-normal">
                  {lang === 'ar' ? ' · (معدل)' : ' · (Edited)'}
                </span>
              )}
              {(post.isSponsored || post.isOfficialPromo) && (
                <>
                  <span className="text-xs text-neutral-600">·</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 text-[10px] font-medium border border-white/10">

                    <span>{post.sponsorLabel || (lang === 'ar' ? 'مروّج' : 'Sponsored')}</span>
                  </span>
                </>
              )}
            </div>

            {/* More Options Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded-full text-neutral-500 hover:text-white tap-press"
              >
                <MoreHorizontal size={16} />
              </button>

              {showMenu && typeof document !== 'undefined' && createPortal(
                <div 
                  className="fixed inset-0 z-[99999] flex flex-col justify-end items-center bg-black/80 backdrop-blur-md animate-fade-in p-3 select-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }} 
                >
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-[#121214] border border-[#242428] rounded-[28px] p-3.5 shadow-[0_-16px_60px_rgba(0,0,0,0.95)] animate-slide-up space-y-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                  >
                    {/* Drag pill for mobile */}
                    <div className="w-10 h-1 bg-[#3A3A40] rounded-full mx-auto mb-2" />

                    {/* Group 1: Exploration & Saved (PULSE Standard) */}
                    <div className="bg-[#18181B] rounded-2xl border border-[#242428] divide-y divide-[#222226] overflow-hidden">
                      {/* Real Translation Trigger */}
                      <button
                        onClick={handleTranslate}
                        disabled={isTranslating}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                      >
                        <span className="font-semibold">
                          {isTranslating
                            ? (lang === 'ar' ? 'جاري الترجمة...' : 'Translating...')
                            : showTranslation
                              ? (lang === 'ar' ? 'عرض النص الأصلي' : 'Show original')
                              : (lang === 'ar' ? 'ترجمة النبضة' : 'Translate')}
                        </span>
                        {isTranslating ? (
                          <Loader2 size={18} className="text-white animate-spin" />
                        ) : (
                          <Languages size={18} className={showTranslation ? "text-white" : "text-neutral-400"} />
                        )}
                      </button>

                      {/* Save */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          handleBookmarkClick(e);
                        }}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                      >
                        <span className="font-semibold">{isSaved ? (lang === 'ar' ? 'إلغاء الحفظ' : 'Saved') : (lang === 'ar' ? 'حفظ' : 'Save')}</span>
                        <Bookmark size={18} className={isSaved ? "fill-white text-white" : "text-neutral-400"} />
                      </button>

                      {/* Copy Pulse Link */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          const url = `https://pulseeg.wuaze.com/p/${post.id}`;
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(url);
                            showToast(lang === 'ar' ? 'تم نسخ رابط النبضة' : 'Pulse link copied');
                            hapticsService.light();
                          }
                        }}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                      >
                        <span className="font-semibold">{lang === 'ar' ? 'نسخ رابط النبضة' : 'Copy link'}</span>
                        <Link2 size={18} className="text-neutral-400" />
                      </button>

                      {/* Copy Text */}
                      {post.content && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(post.content);
                              showToast(lang === 'ar' ? 'تم نسخ النص' : 'Copied to clipboard');
                              hapticsService.light();
                            }
                          }}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                        >
                          <span className="font-semibold">{lang === 'ar' ? 'نسخ النص' : 'Copy'}</span>
                          <Copy size={18} className="text-neutral-400" />
                        </button>
                      )}

                      {/* Interested */}
                      <button
                        onClick={handleInterested}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                      >
                        <span className="font-semibold">{lang === 'ar' ? 'مهتم' : 'Interested'}</span>
                        <Eye size={18} className="text-neutral-400" />
                      </button>

                      {/* Not interested */}
                      <button
                        onClick={handleNotInterested}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                      >
                        <span className="font-semibold">{lang === 'ar' ? 'غير مهتم' : 'Not interested'}</span>
                        <EyeOff size={18} className="text-neutral-400" />
                      </button>
                    </div>

                    {/* Group 2: Moderation & Control (PULSE Standard) */}
                    <div className="bg-[#18181B] rounded-2xl border border-[#242428] divide-y divide-[#222226] overflow-hidden">
                      {!isSelf && (
                        <>
                          {/* Mute */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              moderationService.muteUser(displayAuthor, currentUser);
                              showToast(lang === 'ar' ? `تم كتم @${displayAuthor.username}` : `Muted @${displayAuthor.username}`);
                            }}
                            className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                          >
                            <span className="font-semibold">{lang === 'ar' ? 'كتم الحساب' : 'Mute'}</span>
                            <VolumeX size={18} className="text-neutral-400" />
                          </button>

                          {/* Restrict */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              showToast(lang === 'ar' ? `تم تقييد التفاعل مع @${displayAuthor.username}` : `Restricted @${displayAuthor.username}`);
                            }}
                            className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                          >
                            <span className="font-semibold">{lang === 'ar' ? 'تقييد الحساب' : 'Restrict'}</span>
                            <Shield size={18} className="text-neutral-400" />
                          </button>

                          {/* Block */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              if (onBlockUser && displayAuthorUid) onBlockUser(displayAuthorUid);
                            }}
                            className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 active:bg-white/10 transition-colors tap-press"
                          >
                            <span className="font-semibold">{lang === 'ar' ? 'حظر الحساب' : 'Block'}</span>
                            <UserX size={18} className="text-neutral-400" />
                          </button>
                        </>
                      )}

                      {/* Report (Image 2 Red Highlight) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          if (onOpenReport) onOpenReport(post);
                        }}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/15 transition-colors tap-press"
                      >
                        <span className="font-semibold">{lang === 'ar' ? 'إبلاغ' : 'Report'}</span>
                        <AlertCircle size={18} className="text-rose-500" />
                      </button>
                    </div>

                    {/* Group 3: Post Author Ops (Edit / Delete) */}
                    {(isSelf || currentUser?.isFounder || currentUser?.username === 'my') && (
                      <div className="bg-[#18181B] rounded-2xl border border-[#242428] divide-y divide-[#222226] overflow-hidden">
                        <button
                          onClick={(e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            clearTimeout(clickTimerRef.current);
                            setShowMenu(false);
                            setEditContent(post.content || '');
                            setIsEditing(true);
                          }}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-neutral-100 hover:bg-white/5 transition-colors tap-press"
                        >
                          <span className="font-semibold">{lang === 'ar' ? 'تعديل النبضة' : 'Edit Pulse'}</span>
                          <Edit3 size={18} className="text-neutral-400" />
                        </button>

                        <button
                          onClick={(e) => {
                            if (e && e.stopPropagation) e.stopPropagation();
                            clearTimeout(clickTimerRef.current);
                            setShowMenu(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-rose-500 hover:bg-rose-500/10 transition-colors tap-press"
                        >
                          <span className="font-semibold">{lang === 'ar' ? 'حذف النبضة' : 'Delete Pulse'}</span>
                          <Trash2 size={18} className="text-rose-500" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                      }}
                      className="w-full py-3.5 rounded-2xl bg-[#1C1C20] hover:bg-[#25252A] active:bg-[#2A2A30] text-sm font-bold text-white tap-press transition-all text-center"
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Topic & Location Badges */}
          {(post.topic || post.location) && (
            <div className="mt-1 flex items-center flex-wrap gap-1.5">
              {isPostSensitive(post) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-[10px] font-bold text-amber-300">
                  <ShieldAlert size={10} />
                  <span>+18</span>
                </span>
              )}
              {post.topic && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white">
                  <span className="text-neutral-400 font-mono">#</span>
                  <span>{post.topic}</span>
                </span>
              )}
              {post.location && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFilterByLocation) onFilterByLocation(post.location);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 text-[11px] text-neutral-300 hover:text-white transition-colors tap-press"
                  title={lang === 'ar' ? 'استعراض نبضات هذا المكان' : 'Explore pulses from this location'}
                >
                  <MapPin size={11} className="text-neutral-400 flex-shrink-0" />
                  <span className="truncate max-w-[220px]">
                    {typeof post.location === 'object' ? post.location.name : post.location}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Text content or Inline Editor */}
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()} className="mt-2.5 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                dir="auto"
                className="w-full bg-[#141414] text-[14.5px] text-white rounded-xl p-3 border border-[#333333] focus:border-white focus:outline-none leading-relaxed bidi-plain"
                placeholder={lang === 'ar' ? 'تعديل نص النبضة...' : 'Edit pulse content...'}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content || '');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-[#2A2A2A] text-xs font-semibold text-neutral-400 hover:text-white tap-press"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editContent.trim()) return;
                    if (onEditPost) {
                      onEditPost(post.id, editContent.trim());
                    } else {
                      storageService.updatePost(post.id, editContent.trim(), currentUser?.uid);
                    }
                    setIsEditing(false);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press shadow-sm"
                >
                  {lang === 'ar' ? 'حفظ التعديل' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <div 
                dir="auto"
                className="text-[14.5px] leading-relaxed text-neutral-100 whitespace-pre-line font-normal tracking-wide bidi-plain break-words select-text"
              >
                <RichTextRenderer 
                  text={showTranslation && translatedData?.translatedText ? translatedData.translatedText : post.content} 
                  onOpenUserProfile={onOpenUserProfile} 
                />
              </div>

              {/* Translation attribution & original toggle */}
              {showTranslation && translatedData?.translatedText && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs text-neutral-300 animate-fade-in select-none"
                >
                  <div className="flex items-center gap-2">
                    <Languages size={14} className="text-white flex-shrink-0" />
                    <span>
                      {lang === 'ar'
                        ? `مترجم من ${translatedData.sourceLabel || 'اللغة الأصلية'}`
                        : `Translated from ${translatedData.sourceLang === 'ar' ? 'Arabic' : 'English'}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTranslation(false);
                      hapticsService.light?.();
                    }}
                    className="text-xs text-white underline hover:text-neutral-300 tap-press font-semibold"
                  >
                    {lang === 'ar' ? 'عرض الأصل' : 'Show original'}
                  </button>
                </div>
              )}

              {/* Toggle back to translation if cached */}
              {!showTranslation && translatedData?.translatedText && (
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTranslation(true);
                      hapticsService.light?.();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white tap-press transition-colors font-medium"
                  >
                    <Languages size={13} />
                    <span>{lang === 'ar' ? 'عرض الترجمة' : 'Show translation'}</span>
                  </button>
                </div>
              )}

              {/* Translating in-flight indicator */}
              {isTranslating && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse">
                  <Loader2 size={13} className="animate-spin text-white" />
                  <span>{lang === 'ar' ? 'جاري الترجمة...' : 'Translating pulse...'}</span>
                </div>
              )}
            </div>
          )}

          {/* Quoted Post Embed (PULSE Official) */}
          {post.quotePost && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDetail) onOpenDetail(post.quotePost);
              }}
              className="mt-3 p-3.5 rounded-2xl bg-[#121214] border border-white/10 hover:border-white/20 transition-all cursor-pointer tap-press"
            >
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={resolveAvatar(post.quotePost.author?.avatar)}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }} 
                  alt="" 
                  className="w-4 h-4 rounded-full object-cover" 
                />
                <span className="text-xs font-semibold text-white font-mono" dir="ltr">
                  @{post.quotePost.author?.username}
                </span>
              </div>
              <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed whitespace-pre-line">
                {post.quotePost.content}
              </p>
              {post.quotePost.imageUrl && (
                <PulseMediaImage
                  src={post.quotePost.imageUrl}
                  className="mt-2 max-h-40"
                  onOpenViewer={() => onOpenDetail && onOpenDetail(post.quotePost)}
                />
              )}
            </div>
          )}

          {/* Real Interactive Poll (PULSE Official) */}
          {localPoll && Array.isArray(localPoll.options) && (
            <div onClick={(e) => e.stopPropagation()} className="mt-3 p-3.5 rounded-2xl bg-[#121214] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                <span className="font-semibold flex items-center gap-1.5 text-neutral-300">
                  <BarChart2 size={13} className="text-[#0095F6]" />
                  {lang === 'ar' ? 'استطلاع رأي' : 'Poll'}
                </span>
                <span className="font-mono">{pollTotalVotes} {lang === 'ar' ? 'صوت' : 'votes'}</span>
              </div>

              {localPoll.options.map((opt, optIdx) => {
                const optVotes = Array.isArray(opt.votes) ? opt.votes : [];
                const hasVotedForThis = currentUserId ? optVotes.includes(currentUserId) : false;
                const pct = pollTotalVotes > 0 ? Math.round((optVotes.length / pollTotalVotes) * 100) : 0;

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleVotePoll(optIdx)}
                    className={`w-full relative overflow-hidden rounded-xl border p-2.5 text-xs text-start transition-all tap-press flex items-center justify-between ${
                      hasVotedForThis 
                        ? 'border-[#0095F6]/60 bg-[#0095F6]/10 font-bold text-white' 
                        : hasUserVoted 
                          ? 'border-white/5 bg-white/[0.02] text-neutral-300' 
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200'
                    }`}
                  >
                    {/* Percentage Fill Bar */}
                    {hasUserVoted && (
                      <div
                        className={`absolute top-0 bottom-0 start-0 transition-all duration-500 rounded-xl ${
                          hasVotedForThis ? 'bg-[#0095F6]/25' : 'bg-white/10'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    )}

                    <span className="relative z-10 flex items-center gap-1.5 truncate">
                      {hasVotedForThis && <Check size={13} className="text-[#0095F6] flex-shrink-0" />}
                      <span className="truncate">{opt.text}</span>
                    </span>

                    {hasUserVoted && (
                      <span className="relative z-10 font-mono text-[11px] text-neutral-400 ms-2">
                        {pct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Attached Image or Animated GIF with Carrier-Grade Sensitive Media Gate */}
          {post.imageUrl && (
            <SensitiveMediaGate
              post={post}
              currentUser={currentUser}
              mediaType="image"
              src={post.imageUrl}
              isGif={Boolean(post.isGif)}
              onOpenViewer={() => setViewerMedia({ type: 'image', url: post.imageUrl, post })}
            />
          )}

          {/* Attached Video with Carrier-Grade Sensitive Media Gate */}
          {post.videoUrl && (
            <SensitiveMediaGate
              post={post}
              currentUser={currentUser}
              mediaType="video"
              src={post.videoUrl}
              poster={post.videoPoster}
              onOpenViewer={() => setViewerMedia({ type: 'video', url: post.videoUrl, post })}
            />
          )}

          {/* Real Audio Player with Listen Count Hook */}
          {post.hasVoice && (
            <div onClick={handleAudioPlay}>
              <RealAudioPlayer
                audioSrc={post.audioUrl}
                fallbackDuration={post.audioDuration || '0:18'}
                title={post.content ? post.content.substring(0, 45) + '...' : 'نبضة صوتية'}
                author={post.author?.displayName || 'PULSE'}
                transcript={post.transcript || (post.content && post.content.length > 30 ? post.content : '')}
              />
            </div>
          )}

          {/* PULSE Music & Audio Card */}
          {post.music && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="mt-2.5 p-3 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between group hover:border-white/20 transition-all select-none"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 me-2">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0">
                  <img src={post.music.coverUrl || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }} />
                  {soundPlayingId === post.music.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-0.5">
                      <span className="w-1 bg-white rounded-full equalizer-bar-1" />
                      <span className="w-1 bg-white rounded-full equalizer-bar-2" />
                      <span className="w-1 bg-white rounded-full equalizer-bar-3" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-white truncate leading-snug">
                    {post.music.title}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5 flex items-center gap-1.5">
                    <span className="truncate">{post.music.artist}</span>
                    <span>·</span>
                    <span className="font-mono">{post.music.duration}</span>
                    {post.music.isCustom && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 font-sans">
                        {lang === 'ar' ? 'أصلي' : 'Original'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    hapticsService.light?.();
                    soundService.playPreview(post.music);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all tap-press ${
                    soundPlayingId === post.music.id ? 'bg-white text-black shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title="Play music"
                >
                  {soundPlayingId === post.music.id ? (
                    <Pause size={13} className="fill-current" />
                  ) : (
                    <Play size={13} className="fill-current translate-x-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticsService.selection?.();
                    window.dispatchEvent(new CustomEvent('pulse_compose_with_sound', { detail: { sound: post.music } }));
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-medium text-neutral-300 hover:text-white tap-press transition-all"
                  title="Use sound"
                >
                  {lang === 'ar' ? 'استخدام الصوت' : 'Use sound'}
                </button>
              </div>
            </div>
          )}



          {/* Sponsored Call to Action Button */}
          {post.isSponsored && (
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (post.ctaAction === 'ads_manager' || post.ctaLink === 'ads_manager' || !post.ctaLink) {
                    window.dispatchEvent(new CustomEvent('pulse_open_ads_manager'));
                  } else if (post.ctaLink && post.ctaLink.startsWith('http')) {
                    window.open(post.ctaLink, '_blank', 'noopener,noreferrer');
                  } else {
                    window.dispatchEvent(new CustomEvent('pulse_open_ads_manager'));
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.99] transition-all font-bold text-xs flex items-center justify-center gap-2 tap-press shadow-sm"
              >
                <span>{post.ctaText || (lang === 'ar' ? 'روّج لنبضاتك الآن على PULSE' : 'Promote Your Pulses Now')}</span>
                <ExternalLink size={13} className="text-black" />
              </button>
            </div>
          )}

          {/* PULSE Signature 4 Action Bar: Heart -> Comment -> Repost -> Share */}
          <div className="flex items-center gap-7 mt-3.5 text-neutral-400 text-xs select-none">
            {/* 1. Like (PULSE Signature Red Pop + Concentric Ripple) */}
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-1.5 tap-press group p-1 -m-1 transition-colors relative ${
                isLiked ? 'text-[#FF3040] font-bold' : 'hover:text-white'
              }`}
              aria-label="إعجاب"
            >
              <div className="relative flex items-center justify-center">
                <Heart
                  size={18}
                  className={`transition-all duration-150 ${
                    isLiked ? 'fill-[#FF3040] text-[#FF3040] stroke-[#FF3040]' : 'stroke-[1.75]'
                  } ${likeAnimating ? 'animate-heart-pop' : ''}`}
                />
                {likeAnimating && (
                  <span className="absolute -inset-1 rounded-full border border-[#FF3040]/60 animate-heart-ripple pointer-events-none" />
                )}
              </div>
              {!hideLikeCounts && likesCount > 0 && <AnimatedCounter value={likesCount} className="text-xs" />}
            </button>

            {/* 2. Comment */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenDetail) onOpenDetail(post);
              }}
              className="flex items-center gap-1.5 hover:text-white tap-press group p-1 -m-1 transition-colors"
              aria-label="رد"
            >
              <MessageCircle size={18} className="stroke-[1.75]" />
              {repliesCount > 0 && <AnimatedCounter value={repliesCount} className="text-xs" />}
            </button>

            {/* 3. Repost (360 Elastic Twist) */}
            <button
              onClick={handleRepostClick}
              className={`flex items-center gap-1.5 tap-press group p-1 -m-1 transition-colors ${
                isReposted ? 'text-white font-bold' : 'hover:text-white'
              }`}
              aria-label="إعادة نشر"
            >
              <Repeat2
                size={18}
                className={`transition-all duration-150 ${
                  isReposted ? 'stroke-[2.5] text-white' : 'stroke-[1.75]'
                } ${repostAnimating ? 'animate-repost-twist text-white' : ''}`}
              />
              {!hideLikeCounts && repostsCount > 0 && <AnimatedCounter value={repostsCount} className="text-xs" />}
            </button>

            {/* 4. Share (PULSE Signature Paper Airplane) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenShare) onOpenShare(post);
              }}
              className="flex items-center gap-1.5 hover:text-white tap-press group p-1 -m-1 transition-colors"
              aria-label="مشاركة"
            >
              <Send size={17} className="stroke-[1.75] -rotate-12" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={(e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          clearTimeout(clickTimerRef.current);
          setShowDeleteConfirm(false);
        }}
        onConfirm={(e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          clearTimeout(clickTimerRef.current);
          setShowDeleteConfirm(false);
          if (onDeletePost) onDeletePost(post.id);
        }}
        title={lang === 'ar' ? 'حذف النبضة نهائياً' : 'Delete Pulse'}
        message={lang === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذه النبضة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to permanently delete this pulse? This action cannot be undone.'}
        confirmText={lang === 'ar' ? 'حذف النبضة' : 'Delete Pulse'}
        cancelText={t('cancel')}
        isDestructive={true}
      />

      <PulseMediaViewer
        isOpen={!!viewerMedia}
        onClose={() => setViewerMedia(null)}
        mediaType={viewerMedia?.type || 'image'}
        mediaUrl={viewerMedia?.url}
        post={viewerMedia?.post || post}
        currentUserId={currentUserId}
        onLike={onLike}
        onRepost={onRepost}
        onReply={onOpenDetail}
        onToggleBookmark={onToggleBookmark}
        onOpenShare={onOpenShare}
        onOpenUserProfile={onOpenUserProfile}
      />
    </article>
  );
}
