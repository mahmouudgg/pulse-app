import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowRight, ArrowLeft, Send, Check, Trash2, Heart, MessageCircle, 
  X, Repeat2, MoreHorizontal, Eye, Bell, BellOff, Image as ImageIcon, 
  Loader2, Share2, Bookmark, ChevronDown, ChevronRight, ChevronLeft, ChevronUp,
  Volume2, VolumeX, Play, Pause, BarChart2, ShieldCheck, Flag, Copy, Link2, Languages
} from 'lucide-react';
import PulseMediaViewer from '../components/PulseMediaViewer';
import PulseVideoPlayer from '../components/PulseVideoPlayer';
import MentionAutocomplete from '../components/MentionAutocomplete';
import GifPickerModal from '../components/GifPickerModal';
import ConfirmModal from '../components/ConfirmModal';
import RichTextRenderer from '../components/RichTextRenderer';
import AnimatedCounter from '../components/AnimatedCounter';
import PioneerBadge from '../components/PioneerBadge';
import VerifiedBadge from '../components/VerifiedBadge';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { storageService } from '../services/storageService';
import { analyticsService } from '../services/analyticsService';
import { database } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import { moderationService } from '../services/moderationService';
import { sanitizeInput } from '../utils/securityCrypto';
import { compressImageToBase64 } from '../utils/imageCompressor';
import { translationService } from '../services/translationService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';
import { hapticsService } from '../services/hapticsService';
import { sovythosService } from '../services/sovythosService';

export default function PostDetailPage({
  post,
  currentUser,
  onBack,
  onLike,
  onRepost,
  onOpenShare,
  onOpenReport,
  onBlockUser,
  onDeletePost,
  onEditPost,
  onToggleBookmark,
  onOpenUserProfile
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const [comments, setComments] = useState([]);
  const [hideLikeCounts, setHideLikeCounts] = useState(() => localStorage.getItem('pulse_hide_likes_counts') === 'true');

  useEffect(() => {
    const handlePref = () => {
      setHideLikeCounts(localStorage.getItem('pulse_hide_likes_counts') === 'true');
    };
    window.addEventListener('pulse_preference_changed', handlePref);
    return () => window.removeEventListener('pulse_preference_changed', handlePref);
  }, []);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [attachedCommentGif, setAttachedCommentGif] = useState(null);
  const [attachedCommentImage, setAttachedCommentImage] = useState(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [isSubscribedToThread, setIsSubscribedToThread] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showActivitySheet, setShowActivitySheet] = useState(false);
  const [commentSort, setCommentSort] = useState('top'); // 'top' | 'newest'
  const [expandedThreads, setExpandedThreads] = useState({});
  const [commentOptionsTarget, setCommentOptionsTarget] = useState(null);

  // Real Translation State
  const [isTranslatingPost, setIsTranslatingPost] = useState(false);
  const [postTranslatedData, setPostTranslatedData] = useState(null);
  const [showPostTranslation, setShowPostTranslation] = useState(false);

  const handleTranslatePost = async () => {
    setShowOptionsSheet(false);
    if (!post?.content || !post.content.trim()) {
      showToast(isAr ? 'لا يوجد نص للترجمة في هذه النبضة' : 'No text to translate', 'info');
      return;
    }

    if (postTranslatedData && postTranslatedData.translatedText) {
      setShowPostTranslation((prev) => !prev);
      hapticsService.selection?.();
      return;
    }

    try {
      setIsTranslatingPost(true);
      hapticsService.light?.();
      const res = await translationService.translate(post.content);
      if (res && res.success && res.translatedText) {
        setPostTranslatedData(res);
        setShowPostTranslation(true);
        hapticsService.success?.();
        showToast(
          isAr
            ? `تمت الترجمة من ${res.sourceLabel || 'اللغة الأصلية'}`
            : `Translated from ${res.sourceLang === 'ar' ? 'Arabic' : 'English'}`,
          'success'
        );
      } else {
        showToast(isAr ? 'تعذر إتمام الترجمة حالياً' : 'Translation failed', 'error');
      }
    } catch (err) {
      console.error('Translation error:', err);
      showToast(isAr ? 'حدث خطأ أثناء الترجمة' : 'Error during translation', 'error');
    } finally {
      setIsTranslatingPost(false);
    }
  };

  const postAuthorUid = post?.authorId || post?.author?.uid;
  const postAuthorUsername = post?.author?.username?.toLowerCase();

  const isAuthorComment = (comm) => {
    if (!comm) return false;
    const commUid = comm.authorId || comm.author?.uid;
    if (postAuthorUid && commUid && commUid === postAuthorUid) return true;
    if (postAuthorUsername && comm.author?.username && comm.author.username.toLowerCase() === postAuthorUsername) return true;
    return false;
  };

  const isLikedByPostAuthor = (comm) => {
    if (!comm || !postAuthorUid) return false;
    const likesArr = storageService._resolveEngagementArray(comm.likes);
    return likesArr.includes(postAuthorUid);
  };

  const formatCommentTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const diff = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return isAr ? 'الآن' : 'now';
      if (diff < 3600) return `${Math.floor(diff / 60)}${isAr ? ' د' : 'm'}`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}${isAr ? ' س' : 'h'}`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}${isAr ? ' ي' : 'd'}`;
      return `${Math.floor(diff / 604800)}${isAr ? ' أ' : 'w'}`;
    } catch {
      return '';
    }
  };

  const toggleThread = (rootId) => {
    hapticsService.selection?.();
    setExpandedThreads((prev) => ({
      ...prev,
      [rootId]: prev[rootId] === false ? true : false
    }));
  };

  const handleRepostComment = (comm) => {
    hapticsService.light?.();
    showToast(isAr ? 'تمت مشاركة الرد في ملفك' : 'Reply reposted', 'info');
  };

  const handleShareComment = (comm) => {
    hapticsService.light?.();
    if (navigator.share) {
      navigator.share({
        title: `${comm.author?.displayName || comm.author?.username} on Pulse`,
        text: comm.content,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(comm.content);
      showToast(isAr ? 'تم نسخ نص الرد' : 'Reply copied to clipboard', 'success');
    }
  };

  // Audio note playback state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);

  const inputRef = useRef(null);
  const commentImageInputRef = useRef(null);

  // Engagement arrays helper
  const getArr = (val) => {
    if (Array.isArray(val)) return val.filter((v) => typeof v === 'string');
    if (typeof val === 'object' && val !== null) {
      const keys = Object.keys(val);
      if (keys.length === 0) return [];
      const isNumeric = keys.every((k) => /^\d+$/.test(k));
      if (isNumeric) return Object.values(val).filter((v) => typeof v === 'string' && v);
      return keys.filter((k) => val[k]);
    }
    return [];
  };

  // Live Mirror Engagement States
  const currentUid = currentUser?.uid;
  const [localLiked, setLocalLiked] = useState(() => currentUid ? getArr(post?.likes).includes(currentUid) : false);
  const [localLikesCount, setLocalLikesCount] = useState(() => post?.likesCount || getArr(post?.likes).length || 0);
  const [localReposted, setLocalReposted] = useState(() => currentUid ? getArr(post?.reposts).includes(currentUid) : false);
  const [localRepostsCount, setLocalRepostsCount] = useState(() => post?.repostsCount || getArr(post?.reposts).length || 0);
  const [localSaved, setLocalSaved] = useState(() => currentUid ? getArr(post?.bookmarks).includes(currentUid) : false);

  // Follow State
  const isAuthorSelf = currentUid && (post?.authorId === currentUid || post?.author?.uid === currentUid);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(() => {
    if (!currentUser || isAuthorSelf) return false;
    const authorId = post?.authorId || post?.author?.uid;
    const following = getArr(currentUser.following);
    return following.includes(authorId);
  });

  // Authentic real view count (zero artificial inflation)
  const [realViewsCount, setRealViewsCount] = useState(() => {
    return Math.max(0, Number(post?.viewsCount || post?.views || 0));
  });

  useEffect(() => {
    if (post?.id) {
      // 1. Authentically track post view in analyticsService & Firebase
      analyticsService.trackPostView(post.id, currentUid);

      // 2. Fetch fresh real post to get updated view count
      const posts = storageService.getPosts();
      const freshPost = posts.find((p) => p.id === post.id);
      if (freshPost) {
        setRealViewsCount(Math.max(0, Number(freshPost.viewsCount || freshPost.views || 0)));
      }

      // 3. Real-time Firebase view listener
      try {
        const viewsRef = ref(database, `posts/${post.id}/viewsCount`);
        const unsubViews = onValue(viewsRef, (snap) => {
          const val = snap.val();
          if (typeof val === 'number') {
            setRealViewsCount(val);
          }
        });
        return () => {
          try { unsubViews(); } catch {}
        };
      } catch {}
    }
  }, [post?.id, currentUid]);

  const viewsCount = realViewsCount;

  // Authentic format date helper (Threads relative + detailed)
  const formatPostHeaderTime = (timestamp) => {
    if (!timestamp) return isAr ? 'الآن' : 'now';
    const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    if (isNaN(time)) return isAr ? 'الآن' : 'now';
    const now = Date.now();
    const diff = Math.max(0, now - time);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return isAr ? 'الآن' : 'now';
    if (minutes < 60) return `${minutes}${isAr ? ' د' : 'm'}`;
    if (hours < 24) return `${hours}${isAr ? ' س' : 'h'}`;
    if (days < 7) return `${days}${isAr ? ' ي' : 'd'}`;
    return new Date(time).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    if (post?.id) {
      setComments(storageService.getComments(post.id));
      const unsubscribe = storageService.subscribeToComments(post.id, (liveComments) => {
        setComments(liveComments);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, [post?.id]);

  const handleToggleLike = () => {
    if (!currentUser) return;
    hapticsService.like?.();
    const nextState = !localLiked;
    setLocalLiked(nextState);
    setLocalLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    if (onLike) onLike(post.id);
  };

  const handleToggleRepost = () => {
    if (!currentUser) return;
    hapticsService.counter?.();
    const nextState = !localReposted;
    setLocalReposted(nextState);
    setLocalRepostsCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    if (onRepost) onRepost(post.id);
  };

  const handleToggleBookmark = () => {
    if (!currentUser) return;
    hapticsService.light?.();
    const nextState = !localSaved;
    setLocalSaved(nextState);
    if (onToggleBookmark) onToggleBookmark(post.id);
    showToast(
      nextState 
        ? (isAr ? 'تم حفظ النبضة في محفوظاتك' : 'Saved to bookmarks') 
        : (isAr ? 'تمت إزالة النبضة من المحفوظات' : 'Removed from bookmarks'),
      'success'
    );
  };

  const handleToggleFollow = () => {
    if (!currentUser || isAuthorSelf) return;
    hapticsService.medium?.();
    const nextState = !isFollowingAuthor;
    setIsFollowingAuthor(nextState);
    const authorId = post?.authorId || post?.author?.uid;
    storageService.toggleFollow(currentUid, authorId);
    showToast(
      nextState
        ? (isAr ? `أنت تتابع @${post?.author?.username}` : `Following @${post?.author?.username}`)
        : (isAr ? `تم إلغاء متابعة @${post?.author?.username}` : `Unfollowed @${post?.author?.username}`)
    );
  };

  const handleToggleSubscribeThread = () => {
    hapticsService.selection?.();
    const nextState = !isSubscribedToThread;
    setIsSubscribedToThread(nextState);
    showToast(
      nextState
        ? (isAr ? 'تم تفعيل إشعارات هذه النبضة' : 'Pulse notifications turned on')
        : (isAr ? 'تم كتم إشعارات هذه النبضة' : 'Pulse notifications muted'),
      'info'
    );
  };

  // Image attach to comment
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingImage(true);
      const compressed = await compressImageToBase64(file, 900, 900, 0.72);
      setAttachedCommentImage(compressed);
    } catch (err) {
      showToast(isAr ? 'تعذر تحميل الصورة' : 'Failed to load image', 'error');
    } finally {
      setIsCompressingImage(false);
      if (commentImageInputRef.current) commentImageInputRef.current.value = '';
    }
  };

  const handleReplyChange = (e) => {
    const val = e.target.value;
    setReplyText(val);
    const selStart = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, selStart);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\u0600-\u06FF]*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (user) => {
    const input = inputRef.current;
    const selStart = input ? input.selectionStart : replyText.length;
    const textBeforeCursor = replyText.slice(0, selStart);
    const textAfterCursor = replyText.slice(selStart);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\u0600-\u06FF]*)$/);
    if (match) {
      const replaceStart = match.index;
      const newText = replyText.slice(0, replaceStart) + `@${user.username} ` + textAfterCursor;
      setReplyText(newText);
    } else {
      setReplyText((prev) => `${prev} @${user.username} `);
    }
    setMentionQuery(null);
    if (input) input.focus();
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() && !attachedCommentGif && !attachedCommentImage) return;
    if (!currentUser) return;

    const rateCheck = moderationService.checkCommentRateLimit(3);
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'warning');
      return;
    }

    const profanity = moderationService.checkProfanity(replyText);
    if (!profanity.clean) {
      showToast(profanity.message, 'warning');
      return;
    }

    const sanitized = sanitizeInput(replyText, 1000).trim();
    if (!sanitized && !attachedCommentGif && !attachedCommentImage) return;

    const newComment = {
      id: 'comm-' + Date.now(),
      authorId: currentUser.uid,
      author: {
        displayName: currentUser.displayName,
        username: currentUser.username,
        avatar: currentUser.avatar,
        isVerified: currentUser.isVerified || false,
        isFounder: currentUser.isFounder || false
      },
      content: sanitized,
      gifUrl: attachedCommentGif || null,
      imageUrl: attachedCommentImage || null,
      parentId: replyingTo ? (replyingTo.parentId || replyingTo.id) : null,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        username: replyingTo.author?.username,
        displayName: replyingTo.author?.displayName
      } : null,
      likes: [],
      createdAt: new Date().toISOString()
    };

    hapticsService.like?.();
    if (replyingTo) {
      const threadRootId = replyingTo.parentId || replyingTo.id;
      setExpandedThreads((prev) => ({ ...prev, [threadRootId]: true }));
    }
    setComments((prev) => [...prev, newComment]);
    setReplyText('');
    setAttachedCommentGif(null);
    setAttachedCommentImage(null);
    setReplyingTo(null);
    moderationService.recordCommentTimestamp();

    try {
      storageService.addComment(post.id, newComment, currentUser);
    } catch (err) {
      console.warn('[PostDetailPage] addComment warning:', err);
    }

    try {
      setTimeout(() => {
        sovythosService.processMentionTrigger({
          post,
          comment: newComment,
          actor: currentUser,
          onReplyGenerated: (aiReply) => {
            setComments((prev) => {
              if (prev.some((c) => c.id === aiReply.id)) return prev;
              return [...prev, aiReply];
            });
            if (aiReply.parentId) {
              setExpandedThreads((prev) => ({ ...prev, [aiReply.parentId]: true }));
            }
          }
        });
      }, 1200);
    } catch {}
  };

  const handleToggleLikeComment = (commId) => {
    if (!currentUser) return;
    hapticsService.counter?.();

    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commId) return c;
        const currentLikes = storageService._resolveEngagementArray(c.likes);
        const hasLiked = currentLikes.includes(currentUser.uid);
        const nextLikes = hasLiked
          ? currentLikes.filter((uid) => uid !== currentUser.uid)
          : [...currentLikes, currentUser.uid];
        return { ...c, likes: nextLikes };
      })
    );

    try {
      storageService.toggleLikeComment(post.id, commId, currentUser);
    } catch {}
  };

  // Build comment tree with sort
  const commentTree = useMemo(() => {
    if (!Array.isArray(comments) || comments.length === 0) return [];
    const map = new Map();
    comments.forEach((c) => {
      if (c && c.id) map.set(c.id, { ...c, replies: [] });
    });

    const roots = [];
    comments.forEach((c) => {
      if (!c || !c.id) return;
      const item = map.get(c.id);
      const parentId = c.parentId || (c.replyTo?.id && map.has(c.replyTo.id) ? c.replyTo.id : null);
      if (parentId && map.has(parentId) && parentId !== c.id) {
        map.get(parentId).replies.push(item);
      } else {
        roots.push(item);
      }
    });

    if (commentSort === 'top') {
      roots.sort((a, b) => (getArr(b.likes).length || 0) - (getArr(a.likes).length || 0));
    } else {
      roots.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return roots;
  }, [comments, commentSort]);

  // Audio Playback handler
  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    hapticsService.light?.();
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  const canReply = (() => {
    if (!post?.replyPermission || post.replyPermission === 'anyone') return true;
    const authorId = post.authorId || post.author?.uid;
    if (currentUser?.uid === authorId || currentUser?.username === post.author?.username) return true;
    if (post.replyPermission === 'followers') {
      const authorFollowers = storageService._resolveEngagementArray(post.author?.followers);
      return authorFollowers.includes(currentUser?.uid);
    }
    return true;
  })();

  if (!post) return null;

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-28 max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* ======================================================== */}
        {/* 1. TOP HEADER (PULSE Official Matching Screenshot 2)        */}
        {/* ======================================================== */}
        <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-[#18181C] px-3.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          {/* Left: Back Button + Author Info + Views (Screenshot 2 exact) */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => {
                hapticsService.dismiss?.();
                onBack();
              }}
              className="p-1 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-900 tap-press transition-colors"
              aria-label={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={22} />
            </button>

            <div 
              onClick={() => onOpenUserProfile?.(post.author)}
              className="flex items-center gap-2.5 cursor-pointer tap-press min-w-0"
            >
              <img
                src={resolveAvatar(post.author?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
              />
              <div className="flex flex-col min-w-0 leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[14.5px] text-white truncate max-w-[150px]" dir="ltr">
                    {post.author?.username || post.author?.displayName}
                  </span>
                  {post.author?.isVerified && <VerifiedBadge size={13} />}
                </div>
                <span className="text-[11px] text-neutral-400 font-normal mt-0.5">
                  {viewsCount.toLocaleString()} {isAr ? 'مشاهدة' : 'views'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Bell & Circular Options (...) (Screenshot 2 exact) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleToggleSubscribeThread}
              className={`p-1.5 rounded-full tap-press transition-colors ${
                isSubscribedToThread 
                  ? 'text-white bg-white/10' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
              title={isSubscribedToThread ? (isAr ? 'كتم الإشعارات' : 'Mute notifications') : (isAr ? 'تفعيل الإشعارات' : 'Get notifications')}
            >
              {isSubscribedToThread ? <Bell size={20} className="fill-white" /> : <Bell size={20} />}
            </button>

            <button
              onClick={() => {
                hapticsService.light?.();
                setShowOptionsSheet(true);
              }}
              className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-900 tap-press transition-colors"
              title={isAr ? 'المزيد من الخيارات' : 'More options'}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. MAIN POST CONTAINER (Full Width Threads Layout)       */}
        {/* ======================================================== */}
        <div className="px-4 pt-3.5 pb-2">
          
          {/* Post Header: Avatar, Name, Badge, Time, Follow Button */}
          <div className="flex items-center justify-between">
            <div 
              onClick={() => onOpenUserProfile && onOpenUserProfile(post.author)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <img
                src={resolveAvatar(post.author?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                alt={post.author?.displayName}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[15px] text-white truncate group-hover:underline">
                    {post.author?.displayName || post.author?.username}
                  </span>
                  <Chevron size={14} className="text-neutral-500" />
                  {post.author?.isVerified && (
                    <VerifiedBadge size={14} />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-neutral-400">
                  <span className="text-neutral-400 truncate">
                    {post.author?.badgeTitle || (isAr ? 'عضو PULSE' : 'PULSE Member')}
                  </span>
                  <span className="text-neutral-600 font-bold">•</span>
                  <span className="text-neutral-400 font-mono">
                    {formatPostHeaderTime(post.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Follow / Following Button */}
            {!isAuthorSelf && (
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all tap-press ${
                  isFollowingAuthor
                    ? 'border border-neutral-700 text-neutral-300 hover:border-neutral-500 bg-transparent'
                    : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
                }`}
              >
                {isFollowingAuthor ? (isAr ? 'يتابع' : 'Following') : (isAr ? 'متابعة' : 'Follow')}
              </button>
            )}
          </div>

          {/* Post Text Body with Translation */}
          <div className="my-3 space-y-2">
            <div className="text-[15.5px] text-white leading-relaxed select-text font-normal">
              <RichTextRenderer
                text={showPostTranslation && postTranslatedData?.translatedText ? postTranslatedData.translatedText : post.content}
                onOpenUserProfile={onOpenUserProfile}
              />
            </div>

            {/* Translation attribution & original toggle */}
            {showPostTranslation && postTranslatedData?.translatedText && (
              <div 
                className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs text-neutral-300 animate-fade-in select-none"
              >
                <div className="flex items-center gap-2">
                  <Languages size={14} className="text-white flex-shrink-0" />
                  <span>
                    {isAr
                      ? `مترجم من ${postTranslatedData.sourceLabel || 'اللغة الأصلية'}`
                      : `Translated from ${postTranslatedData.sourceLang === 'ar' ? 'Arabic' : 'English'}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPostTranslation(false);
                    hapticsService.light?.();
                  }}
                  className="text-xs text-white underline hover:text-neutral-300 tap-press font-semibold"
                >
                  {isAr ? 'عرض الأصل' : 'Show original'}
                </button>
              </div>
            )}

            {/* Toggle back to translation if cached */}
            {!showPostTranslation && postTranslatedData?.translatedText && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPostTranslation(true);
                    hapticsService.light?.();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white tap-press transition-colors font-medium"
                >
                  <Languages size={13} />
                  <span>{isAr ? 'عرض الترجمة' : 'Show translation'}</span>
                </button>
              </div>
            )}

            {/* Translating in-flight indicator */}
            {isTranslatingPost && (
              <div className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse">
                <Loader2 size={13} className="animate-spin text-white" />
                <span>{isAr ? 'جاري الترجمة...' : 'Translating pulse...'}</span>
              </div>
            )}
          </div>

          {/* Attached Audio Note */}
          {(post.hasVoice || post.audioUrl) && (
            <div className="my-3 p-3.5 rounded-2xl bg-[#111114] border border-[#222228] flex items-center justify-between">
              <audio
                ref={audioRef}
                src={post.audioUrl}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 tap-press shadow"
                >
                  {isPlayingAudio ? <Pause size={18} className="fill-black" /> : <Play size={18} className="fill-black ml-0.5" />}
                </button>
                <div>
                  <div className="text-xs font-bold text-white">
                    {isAr ? 'ملاحظة صوتية' : 'Voice note'}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    {post.audioDuration || '0:30'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-1 rounded-full bg-white/70 ${isPlayingAudio ? 'equalizer-bar-1' : 'h-3'}`} />
                <div className={`w-1 rounded-full bg-white ${isPlayingAudio ? 'equalizer-bar-2' : 'h-5'}`} />
                <div className={`w-1 rounded-full bg-white ${isPlayingAudio ? 'equalizer-bar-3' : 'h-6'}`} />
                <div className={`w-1 rounded-full bg-white/80 ${isPlayingAudio ? 'equalizer-bar-2' : 'h-4'}`} />
                <div className={`w-1 rounded-full bg-white/60 ${isPlayingAudio ? 'equalizer-bar-1' : 'h-2'}`} />
              </div>
            </div>
          )}

          {/* Attached Image / Media (Clickable to open full screen MediaViewer) */}
          {post.imageUrl && (
            <div 
              onClick={() => setViewerImage({ url: post.imageUrl, title: post.content, mediaType: 'image' })}
              className="my-3 rounded-2xl overflow-hidden border border-[#222226] bg-[#0A0A0C] max-h-[520px] w-full flex items-center justify-center cursor-pointer group relative shadow-lg"
            >
              <img
                src={post.imageUrl}
                alt="Post attachment"
                className="w-full h-auto max-h-[520px] object-cover transition-transform duration-200 group-hover:scale-[1.01]"
              />
            </div>
          )}

          {/* Attached Video with Seamless In-Feed Player & Cloudinary Poster */}
          {post.videoUrl && (
            <div className="my-3 w-full max-w-full overflow-hidden rounded-2xl">
              <PulseVideoPlayer
                src={post.videoUrl}
                poster={post.videoPoster}
                onOpenViewer={() => setViewerImage({ url: post.videoUrl, title: post.content, mediaType: 'video' })}
              />
            </div>
          )}

          {/* Quoted Post Embed Preview */}
          {post.quotePost && (
            <div className="my-3 p-3.5 rounded-2xl bg-[#111114] border border-[#222228] text-xs text-neutral-300">
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={post.quotePost.author?.avatar || DEFAULT_AVATAR}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="font-bold text-white font-mono" dir="ltr">
                  @{post.quotePost.author?.username}
                </span>
              </div>
              <p className="line-clamp-2 text-neutral-200 leading-relaxed">
                {post.quotePost.content}
              </p>
            </div>
          )}

          {/* Detailed Timestamp & Real Views */}
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono mt-3 select-none">
            <span>
              {post.createdAt ? new Date(post.createdAt).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            <span>·</span>
            <span>
              {post.createdAt ? new Date(post.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
            </span>
            <span>·</span>
            <span className="text-neutral-400 font-semibold">
              {realViewsCount.toLocaleString()} {isAr ? 'مشاهدة' : 'Views'}
            </span>
          </div>

          {/* ======================================================== */}
          {/* 3. POST ACTION BAR (Threads Exact 1:1 matching Image 5)  */}
          {/* ======================================================== */}
          <div className="flex items-center gap-6 mt-3 pt-1 text-neutral-400 select-none">
            
            {/* 1. Like */}
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-2 tap-press transition-colors ${
                localLiked ? 'text-[#FF3040]' : 'hover:text-white'
              }`}
            >
              <Heart
                size={21}
                strokeWidth={1.8}
                className={localLiked ? 'fill-[#FF3040] text-[#FF3040]' : ''}
              />
              {!hideLikeCounts && <AnimatedCounter value={localLikesCount} className="text-xs font-semibold" />}
            </button>

            {/* 2. Comment */}
            <button
              onClick={() => inputRef.current?.focus()}
              className="flex items-center gap-2 hover:text-white tap-press transition-colors"
            >
              <MessageCircle size={21} strokeWidth={1.8} />
              <AnimatedCounter value={comments.length} className="text-xs font-semibold" />
            </button>

            {/* 3. Repost */}
            <button
              onClick={handleToggleRepost}
              className={`flex items-center gap-2 tap-press transition-colors ${
                localReposted ? 'text-white' : 'hover:text-white'
              }`}
            >
              <Repeat2
                size={21}
                strokeWidth={1.8}
                className={localReposted ? 'text-white' : ''}
              />
              {!hideLikeCounts && <AnimatedCounter value={localRepostsCount} className="text-xs font-semibold" />}
            </button>

            {/* 4. Share */}
            <button
              onClick={() => onOpenShare?.(post)}
              className="flex items-center gap-2 hover:text-white tap-press transition-colors"
            >
              <Send size={21} strokeWidth={1.8} className="-rotate-12" />
              {!hideLikeCounts && <AnimatedCounter value={Number(post.sharesCount) || 0} className="text-xs font-semibold" />}
            </button>

            {/* 5. Bookmark (Right aligned) */}
            <button
              onClick={handleToggleBookmark}
              className={`ms-auto tap-press transition-colors ${
                localSaved ? 'text-white' : 'hover:text-white'
              }`}
            >
              <Bookmark
                size={21}
                strokeWidth={1.8}
                className={localSaved ? 'fill-white text-white' : ''}
              />
            </button>
          </div>

          {/* ======================================================== */}
          {/* 4. SEPARATOR: TOP SORT & VIEW ACTIVITY (Image 5 exact)   */}
          {/* ======================================================== */}
          <div className="border-t border-[#1C1C20] mt-3.5 pt-3 pb-1 flex items-center justify-between text-xs text-neutral-400">
            {/* Left: Sort Filter Dropdown */}
            <button
              onClick={() => {
                hapticsService.selection?.();
                setCommentSort((prev) => (prev === 'top' ? 'newest' : 'top'));
              }}
              className="flex items-center gap-1 text-neutral-300 hover:text-white font-medium tap-press"
            >
              <span>{commentSort === 'top' ? (isAr ? 'الأفضل' : 'Top') : (isAr ? 'الأحدث' : 'Newest')}</span>
              <ChevronDown size={14} />
            </button>

            {/* Right: View Activity Link */}
            <button
              onClick={() => {
                hapticsService.light?.();
                setShowActivitySheet(true);
              }}
              className="flex items-center gap-1 text-neutral-400 hover:text-white tap-press"
            >
              <span>{isAr ? 'عرض النشاط' : 'View activity'}</span>
              <Chevron size={14} />
            </button>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="h-[1px] bg-[#18181C] mb-2" />

        {/* ======================================================== */}
        {/* 5. REPLIES LIST (Threads Connecting Line Layout)         */}
        {/* ======================================================== */}
        <div className="divide-y divide-[#18181A]">
          {commentTree.length > 0 ? (
            commentTree.map((rootComm) => {
              const rootLikesArr = storageService._resolveEngagementArray(rootComm.likes);
              const isRootLiked = currentUid ? rootLikesArr.includes(currentUid) : false;
              const hasReplies = rootComm.replies && rootComm.replies.length > 0;
              const isExpanded = expandedThreads[rootComm.id] !== false;
              const isRootAuthor = isAuthorComment(rootComm);
              const isRootLikedByAuthor = isLikedByPostAuthor(rootComm);

              return (
                <div key={rootComm.id} className="p-4 hover:bg-[#08080A] transition-colors relative">
                  
                  {/* Root Comment Container */}
                  <div className="flex items-start gap-3">
                    
                    {/* Left: Avatar with vertical connecting line */}
                    <div className="flex flex-col items-center flex-shrink-0 relative">
                      <img
                        onClick={() => onOpenUserProfile && onOpenUserProfile(rootComm.author)}
                        src={resolveAvatar(rootComm.author?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                        alt={rootComm.author?.displayName || rootComm.author?.username}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 cursor-pointer tap-press z-10 bg-black flex-shrink-0"
                      />
                      {/* Vertical trunk connecting line down to replies or expand toggle */}
                      {hasReplies && (
                        <div className="w-[1.5px] bg-[#2A2A2E] flex-1 my-1.5 min-h-[16px]" />
                      )}
                    </div>

                    {/* Right: Content & Action Row */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Header: Name, Verified, Author Badge, Time, Author-Liked Heart Badge, ... */}
                      <div className="flex items-center justify-between">
                        <div 
                          onClick={() => onOpenUserProfile && onOpenUserProfile(rootComm.author)}
                          className="flex items-center gap-1.5 cursor-pointer group min-w-0 flex-wrap"
                        >
                          <span className="font-bold text-xs text-white group-hover:underline truncate max-w-[140px]" dir="ltr">
                            {rootComm.author?.username || rootComm.author?.displayName}
                          </span>
                          {rootComm.author?.isVerified && (
                            <VerifiedBadge size={12} />
                          )}
                          {isRootAuthor && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#222226] text-neutral-300 border border-neutral-700/60 leading-none flex-shrink-0">
                              {isAr ? 'الكاتب' : 'Author'}
                            </span>
                          )}
                          <span className="text-[11px] text-neutral-500 font-mono">
                            {formatCommentTime(rootComm.createdAt)}
                          </span>
                        </div>

                        {/* Right side: Author Liked Badge + More Options (...) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isRootLikedByAuthor && (
                            <div 
                              className="relative flex-shrink-0" 
                              title={isAr ? `أعجب به الكاتب (@${post.author?.username})` : `Liked by author (@${post.author?.username})`}
                            >
                              <img
                                src={resolveAvatar(post.author?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover ring-1 ring-white/20"
                              />
                              <div className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-black flex items-center justify-center">
                                <Heart size={6.5} className="fill-[#FF3040] text-[#FF3040]" />
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => setCommentOptionsTarget(rootComm)}
                            className="p-1 rounded-full text-neutral-500 hover:text-white tap-press transition-colors"
                            title={isAr ? 'خيارات' : 'Options'}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Comment text */}
                      <div className="text-[13.5px] text-neutral-200 mt-1 leading-relaxed break-words">
                        <RichTextRenderer
                          text={rootComm.content}
                          onOpenUserProfile={onOpenUserProfile}
                        />
                      </div>

                      {/* Attached Media */}
                      {rootComm.imageUrl && (
                        <div 
                          onClick={() => setViewerImage({ url: rootComm.imageUrl, title: rootComm.content, mediaType: 'image' })}
                          className="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-56 cursor-pointer"
                        >
                          <img src={rootComm.imageUrl} alt="" className="w-full h-auto max-h-56 object-cover" />
                        </div>
                      )}
                      {rootComm.gifUrl && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-56">
                          <img src={rootComm.gifUrl} alt="" className="w-full h-auto max-h-56 object-contain" />
                        </div>
                      )}

                      {/* 4-Action Row: Heart, Reply, Repost, Share */}
                      <div className="flex items-center gap-4 mt-2.5 text-neutral-400 text-xs">
                        <button
                          onClick={() => handleToggleLikeComment(rootComm.id)}
                          className={`flex items-center gap-1 tap-press transition-colors ${
                            isRootLiked ? 'text-[#FF3040]' : 'hover:text-white'
                          }`}
                        >
                          <Heart size={16} strokeWidth={1.8} className={isRootLiked ? 'fill-[#FF3040] text-[#FF3040]' : ''} />
                          {rootLikesArr.length > 0 && <span className="font-mono text-[11px]">{rootLikesArr.length}</span>}
                        </button>

                        <button
                          onClick={() => {
                            setReplyingTo({
                              id: rootComm.id,
                              parentId: rootComm.id,
                              author: rootComm.author
                            });
                            setExpandedThreads((prev) => ({ ...prev, [rootComm.id]: true }));
                            inputRef.current?.focus();
                          }}
                          className="flex items-center gap-1 hover:text-white tap-press transition-colors"
                          title={isAr ? 'رد' : 'Reply'}
                        >
                          <MessageCircle size={16} strokeWidth={1.8} />
                          {hasReplies && <span className="font-mono text-[11px]">{rootComm.replies.length}</span>}
                        </button>

                        <button 
                          onClick={() => handleRepostComment(rootComm)}
                          className="hover:text-white tap-press transition-colors"
                          title={isAr ? 'إعادة نشر' : 'Repost'}
                        >
                          <Repeat2 size={16} strokeWidth={1.8} />
                        </button>

                        <button 
                          onClick={() => handleShareComment(rootComm)}
                          className="hover:text-white tap-press transition-colors"
                          title={isAr ? 'مشاركة' : 'Share'}
                        >
                          <Send size={16} strokeWidth={1.8} className="-rotate-12" />
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Nested Replies Section */}
                  {hasReplies && (
                    <>
                      {/* If collapsed: Show replies toggle button with mini overlapping avatars */}
                      {!isExpanded ? (
                        <button
                          onClick={() => toggleThread(rootComm.id)}
                          className="flex items-center gap-2 mt-2.5 ms-12 text-neutral-400 hover:text-white tap-press group"
                        >
                          <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                            {rootComm.replies.slice(0, 2).map((r, idx) => (
                              <img
                                key={idx}
                                src={resolveAvatar(r.author?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover ring-1 ring-black"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-neutral-400 group-hover:text-neutral-200">
                            {isAr 
                              ? `عرض الردود (${rootComm.replies.length})` 
                              : `Show replies (${rootComm.replies.length})`}
                          </span>
                          <ChevronDown size={13} className="text-neutral-400 group-hover:text-white" />
                        </button>
                      ) : (
                        /* If expanded: Render child replies with curved connector lines */
                        <div className="relative ms-4 ps-6 mt-3 space-y-3.5">
                          {rootComm.replies.map((nested, nIdx) => {
                            const isLastChild = nIdx === rootComm.replies.length - 1;
                            const nLikesArr = storageService._resolveEngagementArray(nested.likes);
                            const isNLiked = currentUid ? nLikesArr.includes(currentUid) : false;
                            const isNAuthor = isAuthorComment(nested);
                            const isNLikedByAuthor = isLikedByPostAuthor(nested);

                            return (
                              <div key={nested.id} className="relative flex items-start gap-2.5 group">
                                
                                {/* Curved Branch Connector Lines */}
                                {!isLastChild && (
                                  <div className="absolute -start-6 top-0 bottom-[-14px] w-[1.5px] bg-[#2A2A2E]" />
                                )}
                                <div className="absolute -start-6 top-0 w-6 h-3.5 border-s-[1.5px] border-b-[1.5px] border-[#2A2A2E] rounded-bl-xl rtl:rounded-bl-none rtl:rounded-br-xl" />

                                {/* Child Avatar */}
                                <img
                                  onClick={() => onOpenUserProfile && onOpenUserProfile(nested.author)}
                                  src={resolveAvatar(nested.author?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                  alt={nested.author?.displayName || nested.author?.username}
                                  className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 cursor-pointer tap-press z-10 bg-black flex-shrink-0"
                                />

                                {/* Child Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <div 
                                      onClick={() => onOpenUserProfile && onOpenUserProfile(nested.author)}
                                      className="flex items-center gap-1.5 cursor-pointer min-w-0 flex-wrap"
                                    >
                                      <span className="font-bold text-xs text-white hover:underline truncate max-w-[130px]" dir="ltr">
                                        {nested.author?.username || nested.author?.displayName}
                                      </span>
                                      {nested.author?.isVerified && (
                                        <VerifiedBadge size={11} />
                                      )}
                                      {isNAuthor && (
                                        <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold bg-[#222226] text-neutral-300 border border-neutral-700/60 leading-none flex-shrink-0">
                                          {isAr ? 'الكاتب' : 'Author'}
                                        </span>
                                      )}
                                      <span className="text-[10.5px] text-neutral-500 font-mono">
                                        {formatCommentTime(nested.createdAt)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {isNLikedByAuthor && (
                                        <div 
                                          className="relative flex-shrink-0" 
                                          title={isAr ? `أعجب به الكاتب (@${post.author?.username})` : `Liked by author (@${post.author?.username})`}
                                        >
                                          <img
                                            src={resolveAvatar(post.author?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                                            alt=""
                                            className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-white/20"
                                          />
                                          <div className="absolute -bottom-0.5 -end-0.5 w-2 h-2 rounded-full bg-black flex items-center justify-center">
                                            <Heart size={5.5} className="fill-[#FF3040] text-[#FF3040]" />
                                          </div>
                                        </div>
                                      )}

                                      <button
                                        onClick={() => setCommentOptionsTarget(nested)}
                                        className="p-1 rounded-full text-neutral-500 hover:text-white tap-press transition-colors"
                                        title={isAr ? 'خيارات' : 'Options'}
                                      >
                                        <MoreHorizontal size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Child Text (with replyingTo mention if exists) */}
                                  <div className="text-[12.5px] text-neutral-200 mt-0.5 leading-relaxed break-words">
                                    {nested.replyTo?.username && (
                                      <span 
                                        onClick={() => onOpenUserProfile && onOpenUserProfile({ username: nested.replyTo.username })}
                                        className="text-[#0095F6] font-medium me-1.5 cursor-pointer hover:underline" 
                                        dir="ltr"
                                      >
                                        @{nested.replyTo.username}
                                      </span>
                                    )}
                                    <RichTextRenderer text={nested.content} onOpenUserProfile={onOpenUserProfile} />
                                  </div>

                                  {/* Child Media */}
                                  {nested.imageUrl && (
                                    <div 
                                      onClick={() => setViewerImage({ url: nested.imageUrl, title: nested.content, mediaType: 'image' })}
                                      className="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-48 cursor-pointer"
                                    >
                                      <img src={nested.imageUrl} alt="" className="w-full h-auto max-h-48 object-cover" />
                                    </div>
                                  )}
                                  {nested.gifUrl && (
                                    <div className="mt-2 rounded-xl overflow-hidden border border-white/10 max-h-48">
                                      <img src={nested.gifUrl} alt="" className="w-full h-auto max-h-48 object-contain" />
                                    </div>
                                  )}

                                  {/* Child 4-Action Row */}
                                  <div className="flex items-center gap-3.5 mt-2 text-neutral-400 text-xs">
                                    <button
                                      onClick={() => handleToggleLikeComment(nested.id)}
                                      className={`flex items-center gap-1 tap-press transition-colors ${
                                        isNLiked ? 'text-[#FF3040]' : 'hover:text-white'
                                      }`}
                                    >
                                      <Heart size={14} strokeWidth={1.8} className={isNLiked ? 'fill-[#FF3040] text-[#FF3040]' : ''} />
                                      {nLikesArr.length > 0 && <span className="font-mono text-[10.5px]">{nLikesArr.length}</span>}
                                    </button>

                                    <button
                                      onClick={() => {
                                        setReplyingTo({
                                          id: nested.id,
                                          parentId: rootComm.id,
                                          author: nested.author
                                        });
                                        setExpandedThreads((prev) => ({ ...prev, [rootComm.id]: true }));
                                        inputRef.current?.focus();
                                      }}
                                      className="hover:text-white tap-press transition-colors"
                                      title={isAr ? 'رد' : 'Reply'}
                                    >
                                      <MessageCircle size={14} strokeWidth={1.8} />
                                    </button>

                                    <button 
                                      onClick={() => handleRepostComment(nested)}
                                      className="hover:text-white tap-press transition-colors"
                                      title={isAr ? 'إعادة نشر' : 'Repost'}
                                    >
                                      <Repeat2 size={14} strokeWidth={1.8} />
                                    </button>

                                    <button 
                                      onClick={() => handleShareComment(nested)}
                                      className="hover:text-white tap-press transition-colors"
                                      title={isAr ? 'مشاركة' : 'Share'}
                                    >
                                      <Send size={14} strokeWidth={1.8} className="-rotate-12" />
                                    </button>
                                  </div>
                                </div>

                              </div>
                            );
                          })}

                          {/* Hide replies collapse button */}
                          <button
                            onClick={() => toggleThread(rootComm.id)}
                            className="flex items-center gap-1.5 pt-1 text-[11.5px] text-neutral-400 hover:text-neutral-200 tap-press"
                          >
                            <span>{isAr ? 'إخفاء الردود' : 'Hide replies'}</span>
                            <ChevronUp size={13} />
                          </button>
                        </div>
                      )}
                    </>
                  )}

                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-xs text-neutral-500">
              <MessageCircle size={28} className="mx-auto mb-2 text-neutral-600 stroke-[1.5]" />
              <div>{isAr ? 'كن أول من يعلق على هذه النبضة' : 'Be the first to reply'}</div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 6. STICKY BOTTOM REPLY BAR (PULSE Official Layout)          */}
        {/* Rendered directly via createPortal to document.body to    */}
        {/* permanently stick to phone screen edge without scrolling */}
        {/* ======================================================== */}
        {typeof document !== 'undefined' && createPortal(
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#000000]/95 backdrop-blur-xl border-t border-[#1C1C20] select-none" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="max-w-xl mx-auto">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-1.5 bg-[#121214] border-b border-[#202024] text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <span>{isAr ? 'الرد على:' : 'Replying to:'}</span>
                    <strong className="text-white font-mono" dir="ltr">@{replyingTo.author?.username}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                    className="p-1 text-neutral-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Attached Image or GIF Previews */}
              {(attachedCommentImage || attachedCommentGif) && (
                <div className="px-4 pt-2.5 flex items-center gap-2">
                  {attachedCommentImage && (
                    <div className="relative rounded-xl overflow-hidden border border-white/20 max-h-16 bg-black">
                      <img src={attachedCommentImage} alt="" className="h-14 object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={() => setAttachedCommentImage(null)}
                        className="absolute top-1 end-1 p-0.5 rounded-full bg-black/80 text-white"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  {attachedCommentGif && (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-16 bg-black">
                      <img src={attachedCommentGif} alt="" className="h-14 object-contain" />
                      <button
                        type="button"
                        onClick={() => setAttachedCommentGif(null)}
                        className="absolute top-1 end-1 p-0.5 rounded-full bg-black/80 text-white"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form
                onSubmit={handleSendReply}
                className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2.5"
              >
                {mentionQuery !== null && (
                  <MentionAutocomplete
                    query={mentionQuery}
                    onSelect={handleSelectMention}
                    isOpen={true}
                    placement="top"
                  />
                )}

                <input
                  type="file"
                  ref={commentImageInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />

                {/* Current user avatar */}
                <img
                  src={resolveAvatar(currentUser?.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                />

                {/* Input pill */}
                <div className="flex-1 relative flex items-center bg-[#141416] border border-[#242428] focus-within:border-white/40 rounded-full px-3.5 py-1.5 transition-colors gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={replyText}
                    onChange={handleReplyChange}
                    placeholder={replyingTo ? (isAr ? `الرد على @${replyingTo.author?.username}...` : `Reply to @${replyingTo.author?.username}...`) : (isAr ? `الرد على ${post.author?.username}...` : `Reply to ${post.author?.username}...`)}
                    className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-neutral-500 outline-none"
                  />

                  {/* Attach Image Button */}
                  <button
                    type="button"
                    onClick={() => commentImageInputRef.current?.click()}
                    disabled={isCompressingImage}
                    className="p-1 rounded text-neutral-400 hover:text-white tap-press transition-colors flex-shrink-0"
                    title={isAr ? 'إرفاق صورة' : 'Photo'}
                  >
                    {isCompressingImage ? <Loader2 size={16} className="animate-spin text-white" /> : <ImageIcon size={16} />}
                  </button>

                  {/* GIF Button */}
                  <button
                    type="button"
                    onClick={() => setIsGifPickerOpen(true)}
                    className="px-1.5 py-0.5 rounded border border-white/20 hover:border-white text-[10px] font-extrabold text-neutral-300 hover:text-white tap-press transition-colors flex-shrink-0"
                  >
                    GIF
                  </button>
                </div>

                {/* Submit Send Button */}
                <button
                  type="submit"
                  disabled={(!replyText.trim() && !attachedCommentGif && !attachedCommentImage) || isCompressingImage}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 tap-press ${
                    (replyText.trim() || attachedCommentGif || attachedCommentImage) && !isCompressingImage
                      ? 'bg-white text-black shadow-md hover:scale-105 active:scale-95'
                      : 'bg-[#1C1C20] text-neutral-600 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Send size={14} className={(replyText.trim() || attachedCommentGif || attachedCommentImage) ? "fill-black stroke-black -rotate-12" : "-rotate-12"} />
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ======================================================== */}
        {/* 7. THREAD ACTIVITY BOTTOM SHEET                          */}
        {/* ======================================================== */}
        {showActivitySheet && typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-end justify-center select-none animate-in fade-in duration-200"
            onClick={() => setShowActivitySheet(false)}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div 
              className="w-full max-w-lg bg-[#121214] border-t border-[#26262B] rounded-t-[32px] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-white space-y-4 shadow-2xl animate-sheet-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-neutral-700/80 rounded-full mx-auto mb-2" />
              
              <div className="flex items-center justify-between border-b border-[#222226] pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 size={18} className="text-white" />
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'نشاط النبضة' : 'Pulse Activity'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowActivitySheet(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#26262B]">
                  <div className="text-[11px] text-neutral-400 font-medium">{isAr ? 'إجمالي المشاهدات الحقيقية' : 'Real Impressions'}</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">{viewsCount.toLocaleString()}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#26262B]">
                  <div className="text-[11px] text-neutral-400 font-medium">{isAr ? 'الإعجابات' : 'Likes'}</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">{localLikesCount}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#26262B]">
                  <div className="text-[11px] text-neutral-400 font-medium">{isAr ? 'الردود' : 'Replies'}</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">{comments.length}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#26262B]">
                  <div className="text-[11px] text-neutral-400 font-medium">{isAr ? 'إعادات النشر' : 'Reposts'}</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">{localRepostsCount}</div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ======================================================== */}
        {/* 8. OPTIONS BOTTOM SHEET (Unified PULSE Official Layout)     */}
        {/* ======================================================== */}
        {showOptionsSheet && typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-end justify-center select-none animate-in fade-in duration-200"
            onClick={() => setShowOptionsSheet(false)}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div 
              className="w-full max-w-lg bg-[#121214] border-t border-[#26262B] rounded-t-[32px] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-white space-y-2.5 shadow-2xl animate-sheet-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-neutral-700/80 rounded-full mx-auto mb-3" />
              
              <div className="space-y-1.5">
                {/* Translate Pulse Option */}
                <button
                  onClick={handleTranslatePost}
                  disabled={isTranslatingPost}
                  className="w-full p-3.5 rounded-2xl bg-[#18181B] hover:bg-[#202024] border border-[#26262B] flex items-center justify-between text-sm text-neutral-200 hover:text-white tap-press transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      {isTranslatingPost ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                    </div>
                    <span className="font-semibold">
                      {isTranslatingPost
                        ? (isAr ? 'جاري الترجمة...' : 'Translating...')
                        : showPostTranslation
                          ? (isAr ? 'عرض النص الأصلي' : 'Show original')
                          : (isAr ? 'ترجمة النبضة' : 'Translate pulse')}
                    </span>
                  </div>
                  <Chevron size={16} className="text-neutral-500" />
                </button>

                <button
                  onClick={() => {
                    setShowOptionsSheet(false);
                    onOpenShare?.(post);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[#18181B] hover:bg-[#202024] border border-[#26262B] flex items-center justify-between text-sm text-neutral-200 hover:text-white tap-press transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Share2 size={16} />
                    </div>
                    <span className="font-semibold">{isAr ? 'مشاركة النبضة' : 'Share pulse'}</span>
                  </div>
                  <Chevron size={16} className="text-neutral-500" />
                </button>

                <button
                  onClick={() => {
                    setShowOptionsSheet(false);
                    const postUrl = `https://pulseeg.wuaze.com/p/${post.id}`;
                    navigator.clipboard?.writeText(postUrl);
                    showToast(isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied successfully', 'success');
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[#18181B] hover:bg-[#202024] border border-[#26262B] flex items-center justify-between text-sm text-neutral-200 hover:text-white tap-press transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Link2 size={16} />
                    </div>
                    <span className="font-semibold">{isAr ? 'نسخ الرابط' : 'Copy link'}</span>
                  </div>
                  <Chevron size={16} className="text-neutral-500" />
                </button>

                <button
                  onClick={() => {
                    setShowOptionsSheet(false);
                    handleToggleBookmark();
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[#18181B] hover:bg-[#202024] border border-[#26262B] flex items-center justify-between text-sm text-neutral-200 hover:text-white tap-press transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Bookmark size={16} className={localSaved ? "fill-white text-white" : ""} />
                    </div>
                    <span className="font-semibold">
                      {localSaved 
                        ? (isAr ? 'إزالة من المحفوظات' : 'Remove from bookmarks') 
                        : (isAr ? 'حفظ في المحفوظات' : 'Save to bookmarks')}
                    </span>
                  </div>
                  <Chevron size={16} className="text-neutral-500" />
                </button>

                {isAuthorSelf ? (
                  <button
                    onClick={() => {
                      setShowOptionsSheet(false);
                      if (onDeletePost) onDeletePost(post.id);
                      onBack();
                    }}
                    className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/30 flex items-center justify-between text-sm text-rose-400 hover:text-rose-300 tap-press transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <Trash2 size={16} />
                      </div>
                      <span className="font-semibold">{isAr ? 'حذف النبضة' : 'Delete pulse'}</span>
                    </div>
                    <Chevron size={16} className="text-rose-500/60" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowOptionsSheet(false);
                      onOpenReport?.(post);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/30 flex items-center justify-between text-sm text-rose-400 hover:text-rose-300 tap-press transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <Flag size={16} />
                      </div>
                      <span className="font-semibold">{isAr ? 'إبلاغ عن محتوى غير لائق' : 'Report pulse'}</span>
                    </div>
                    <Chevron size={16} className="text-rose-500/60" />
                  </button>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOptionsSheet(false)}
                  className="w-full py-3.5 rounded-2xl bg-[#18181B] hover:bg-[#202024] border border-[#26262B] text-neutral-300 hover:text-white text-xs font-bold tap-press transition-colors text-center"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Image / Media Viewer Modal (PULSE Official) */}
        {viewerImage && (
          <PulseMediaViewer
            isOpen={true}
            onClose={() => setViewerImage(null)}
            mediaUrl={viewerImage.url}
            mediaType={viewerImage.mediaType || 'image'}
            post={post}
            currentUserId={currentUid}
            onLike={handleToggleLike}
            onRepost={handleToggleRepost}
            onReply={() => inputRef.current?.focus()}
            onToggleBookmark={handleToggleBookmark}
            onOpenShare={onOpenShare}
            onOpenUserProfile={onOpenUserProfile}
          />
        )}

        {/* GIF Picker Modal */}
        {isGifPickerOpen && (
          <GifPickerModal
            isOpen={true}
            onClose={() => setIsGifPickerOpen(false)}
            onSelectGif={(gifUrl) => {
              setAttachedCommentGif(gifUrl);
              setIsGifPickerOpen(false);
            }}
          />
        )}

        {/* Comment Options Bottom Sheet */}
        {commentOptionsTarget && typeof document !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-end justify-center select-none animate-in fade-in duration-200"
            onClick={() => setCommentOptionsTarget(null)}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div 
              className="w-full max-w-lg bg-[#121214] border-t border-[#26262B] rounded-t-[32px] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-white space-y-2.5 shadow-2xl animate-sheet-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-neutral-700/80 rounded-full mx-auto mb-3" />
              
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(commentOptionsTarget.content);
                    showToast(isAr ? 'تم نسخ نص الرد بنجاح' : 'Reply text copied', 'success');
                    setCommentOptionsTarget(null);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-[#18181B] hover:bg-[#202024] border border-[#26262B] flex items-center justify-between text-sm text-neutral-200 hover:text-white tap-press transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                      <Copy size={16} />
                    </div>
                    <span className="font-semibold">{isAr ? 'نسخ النص' : 'Copy text'}</span>
                  </div>
                  <Chevron size={16} className="text-neutral-500" />
                </button>

                {(currentUid && (
                  commentOptionsTarget.authorId === currentUid || 
                  commentOptionsTarget.author?.username === currentUser?.username || 
                  currentUid === postAuthorUid || 
                  currentUser?.isFounder
                )) ? (
                  <button
                    onClick={() => {
                      const targetId = commentOptionsTarget.id;
                      setCommentOptionsTarget(null);
                      setDeleteCommentId(targetId);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/30 flex items-center justify-between text-sm text-rose-400 hover:text-rose-300 tap-press transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <Trash2 size={16} />
                      </div>
                      <span className="font-semibold">{isAr ? 'حذف الرد' : 'Delete reply'}</span>
                    </div>
                    <Chevron size={16} className="text-rose-500/60" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCommentOptionsTarget(null);
                      showToast(isAr ? 'تم إرسال البلاغ لمراجعته' : 'Report submitted', 'info');
                    }}
                    className="w-full p-3.5 rounded-2xl bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/30 flex items-center justify-between text-sm text-rose-400 hover:text-rose-300 tap-press transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <Flag size={16} />
                      </div>
                      <span className="font-semibold">{isAr ? 'إبلاغ عن محتوى غير لائق' : 'Report reply'}</span>
                    </div>
                    <Chevron size={16} className="text-rose-500/60" />
                  </button>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCommentOptionsTarget(null)}
                  className="w-full py-3.5 rounded-2xl bg-[#18181B] hover:bg-[#202024] border border-[#26262B] text-neutral-300 hover:text-white text-xs font-bold tap-press transition-colors text-center"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Delete Comment Confirm Modal */}
        {deleteCommentId && (
          <ConfirmModal
            isOpen={true}
            title={isAr ? 'حذف الرد؟' : 'Delete reply?'}
            message={isAr ? 'هل أنت متأكد من رغبتك في حذف هذا الرد نهائياً؟' : 'Are you sure you want to permanently delete this reply?'}
            confirmText={isAr ? 'حذف' : 'Delete'}
            cancelText={isAr ? 'إلغاء' : 'Cancel'}
            isDanger={true}
            onConfirm={() => {
              setComments((prev) => prev.filter((c) => c.id !== deleteCommentId));
              storageService.deleteComment(post.id, deleteCommentId);
              setDeleteCommentId(null);
              showToast(isAr ? 'تم حذف الرد' : 'Reply deleted');
            }}
            onCancel={() => setDeleteCommentId(null)}
          />
        )}

      </div>
    </SwipeBackWrapper>
  );
}
