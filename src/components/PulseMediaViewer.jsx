import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Share2, Heart, MessageCircle, Repeat2, Bookmark, 
  Play, Pause, Volume2, VolumeX, RotateCcw, FastForward, Rewind,
  ZoomIn, ZoomOut, ArrowRight, ArrowLeft, MoreHorizontal, Download,
  Edit3, Image as ImageIcon, Send, Upload
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { hapticsService } from '../services/hapticsService';
import PioneerBadge from './PioneerBadge';
import RichTextRenderer from './RichTextRenderer';
import AnimatedCounter from './AnimatedCounter';
import ImageEditorModal from './ImageEditorModal';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

/**
 * PULSE Official / Threads & Twitter (X) Dedicated Full-Screen Media Studio for PULSE
 * - Pure AMOLED Black (#000000) backdrop
 * - PULSE-Style Top Header with (X) and (...) More Options Bottom Sheet
 * - In-app Markup / Photo Editor (Crop, Rotate, Cinematic Filters, Text)
 * - Save image to device storage
 * - Spring Rubber-Band Swipe-to-Dismiss gesture
 * - Real-time animated rolling number engagement bar
 */
export default function PulseMediaViewer({
  isOpen,
  onClose,
  mediaType = 'image', // 'image' | 'video'
  mediaUrl,
  post = null,
  currentUserId = null,
  onLike,
  onRepost,
  onReply,
  onToggleBookmark,
  onOpenShare,
  onOpenUserProfile
}) {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  // Media source state (supports local markup edits)
  const [currentMediaSrc, setCurrentMediaSrc] = useState(mediaUrl);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [isMarkupEditorOpen, setIsMarkupEditorOpen] = useState(false);

  useEffect(() => {
    setCurrentMediaSrc(mediaUrl);
  }, [mediaUrl]);

  // UI state
  const [showChrome, setShowChrome] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [expandText, setExpandText] = useState(false);

  // Swipe to dismiss gesture hook with rubber-banding
  const { containerProps, handleProps, backdropStyle } = useSwipeDownDismiss({
    isOpen,
    onClose,
    dismissThreshold: 110,
    disabled: isZoomed,
  });

  // Video state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isEnded, setIsEnded] = useState(false);
  const [rippleAction, setRippleAction] = useState(null);

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

  // Local post engagement mirror for instant response
  const [isLiked, setIsLiked] = useState(
    currentUserId ? getArr(post?.likes).includes(currentUserId) : false
  );
  const [likesCount, setLikesCount] = useState(
    typeof post?.likes === 'number' ? post.likes : (post?.likesCount || getArr(post?.likes).length)
  );
  const [isSaved, setIsSaved] = useState(
    currentUserId ? getArr(post?.bookmarks).includes(currentUserId) : false
  );
  const [isReposted, setIsReposted] = useState(
    currentUserId ? getArr(post?.reposts).includes(currentUserId) : false
  );
  const [repostsCount, setRepostsCount] = useState(
    typeof post?.reposts === 'number' ? post.reposts : (post?.repostsCount || getArr(post?.reposts).length)
  );

  useEffect(() => {
    if (post) {
      const l = getArr(post.likes);
      const r = getArr(post.reposts);
      const b = getArr(post.bookmarks);
      setIsLiked(currentUserId ? l.includes(currentUserId) : false);
      setLikesCount(typeof post.likes === 'number' ? post.likes : (post.likesCount || l.length));
      setIsSaved(currentUserId ? b.includes(currentUserId) : false);
      setIsReposted(currentUserId ? r.includes(currentUserId) : false);
      setRepostsCount(typeof post.reposts === 'number' ? post.reposts : (post.repostsCount || r.length));
    }
  }, [post, currentUserId]);

  // Handle Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaType !== 'video') return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime || 0);
    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      video.play().catch(() => {});
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setIsEnded(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setIsEnded(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [mediaType, mediaUrl]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && mediaType === 'video') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight' && mediaType === 'video') {
        skipTime(5);
      } else if (e.key === 'ArrowLeft' && mediaType === 'video') {
        skipTime(-5);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mediaType, isPlaying, isMuted, duration]);

  if (!isOpen || !mediaUrl) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const triggerRipple = (type) => {
    setRippleAction(type);
    setTimeout(() => setRippleAction(null), 600);
  };

  const togglePlayPause = (e) => {
    e?.stopPropagation();
    hapticsService.light();
    const video = videoRef.current;
    if (!video) return;

    if (isEnded) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setIsEnded(false);
      setIsPlaying(true);
      triggerRipple('play');
    } else if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      triggerRipple('pause');
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
      triggerRipple('play');
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    hapticsService.light();
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const skipTime = (amount, e) => {
    e?.stopPropagation();
    hapticsService.light();
    const video = videoRef.current;
    if (!video || !duration) return;
    const nextTime = Math.max(0, Math.min(video.currentTime + amount, duration));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    triggerRipple(amount > 0 ? '+10s' : '-10s');
  };

  const handleCycleSpeed = (e) => {
    e?.stopPropagation();
    hapticsService.light();
    const video = videoRef.current;
    if (!video) return;
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
    showToast(isAr ? `سرعة التشغيل: ${nextRate}x` : `Playback speed: ${nextRate}x`, 'info');
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = Math.max(0, Math.min(pos * duration, duration));
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // Share media
  const handleShare = (e) => {
    e?.stopPropagation();
    hapticsService.light();
    if (onOpenShare && post) {
      onOpenShare(post);
      return;
    }
    if (navigator.share) {
      navigator.share({
        title: post?.author?.displayName || 'PULSE Media',
        text: post?.content || (isAr ? 'شاهد هذه الوسائط على PULSE' : 'Check out this media on PULSE'),
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(mediaUrl);
      showToast(isAr ? 'تم نسخ رابط الوسائط بنجاح' : 'Media link copied successfully', 'success');
    }
  };

  // Interactive Engagement Handlers
  const handleLikeClick = (e) => {
    e?.stopPropagation();
    if (!post || !currentUserId) return;
    hapticsService.medium();
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    if (onLike) onLike(post.id);
  };

  const handleRepostClick = (e) => {
    e?.stopPropagation();
    if (!post || !currentUserId) return;
    hapticsService.medium();
    const nextReposted = !isReposted;
    setIsReposted(nextReposted);
    setRepostsCount((prev) => (nextReposted ? prev + 1 : Math.max(0, prev - 1)));
    if (onRepost) onRepost(post);
  };

  const handleBookmarkClick = (e) => {
    e?.stopPropagation();
    if (!post || !currentUserId) return;
    hapticsService.light();
    setIsSaved(!isSaved);
    if (onToggleBookmark) onToggleBookmark(post.id);
  };

  const handleReplyClick = (e) => {
    e?.stopPropagation();
    onClose();
    if (onReply && post) {
      onReply(post);
    }
  };

  // Direct Device Media Download (Zero Cloudinary / External Redirects)
  const handleSaveMedia = async () => {
    hapticsService.medium();
    setShowMoreSheet(false);
    const isVideo = mediaType === 'video';
    showToast(
      isAr ? 'جاري بدء تنزيل الملف...' : 'Downloading file...',
      'info'
    );

    try {
      const ext = isVideo ? 'mp4' : (currentMediaSrc.includes('.png') ? 'png' : 'jpg');
      const filename = `pulse_${Date.now()}.${ext}`;

      // 1. Fetch file as binary Blob to bypass browser URL navigation
      const response = await fetch(currentMediaSrc, { mode: 'cors' });
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();

      // 2. Check if running inside Capacitor Android app
      const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
      if (isNative) {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Data = await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const res = reader.result;
            const base64 = typeof res === 'string' ? res.split(',')[1] : '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        try {
          await Filesystem.writeFile({
            path: `Download/${filename}`,
            data: base64Data,
            directory: Directory.ExternalStorage || Directory.Documents,
            recursive: true
          });
        } catch {
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
        }

        showToast(
          isVideo 
            ? (isAr ? 'تم حفظ الفيديو بنجاح في جهازك' : 'Video saved successfully to device') 
            : (isAr ? 'تم حفظ الصورة بنجاح في جهازك' : 'Image saved successfully to device'), 
          'success'
        );
        return;
      }

      // 3. Web & In-App WebView direct blob download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      showToast(
        isVideo 
          ? (isAr ? 'تم تنزيل الفيديو إلى جهازك' : 'Video downloaded to device') 
          : (isAr ? 'تم تنزيل الصورة إلى جهازك' : 'Image downloaded to device'), 
        'success'
      );
    } catch (err) {
      console.warn('Direct media download fallback:', err);
      try {
        const fallbackLink = document.createElement('a');
        fallbackLink.href = currentMediaSrc;
        fallbackLink.target = '_blank';
        fallbackLink.setAttribute('download', `pulse_media_${Date.now()}`);
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
      } catch {
        showToast(isAr ? 'تعذر تنزيل الملف' : 'Failed to download media', 'error');
      }
    }
  };

  const handleOpenMarkup = () => {
    hapticsService.light();
    setShowMoreSheet(false);
    setIsMarkupEditorOpen(true);
  };

  const handleUseMedia = () => {
    hapticsService.light();
    setShowMoreSheet(false);
    onClose();
    window.dispatchEvent(new CustomEvent('pulse:compose_media', { detail: { image: currentMediaSrc } }));
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const viewerContent = (
    <div
      {...containerProps}
      style={{
        ...backdropStyle,
        backgroundColor: '#000000'
      }}
      className="fixed inset-0 w-screen h-[100dvh] max-h-screen z-[99999] bg-black text-white flex flex-col justify-between select-none animate-in fade-in duration-200 overflow-hidden"
    >
      {/* TOP HEADER BAR (PULSE Official Matching Screenshot 1) */}
      <div
        className={`pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 flex items-center justify-between z-30 transition-opacity duration-300 ${
          showChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Close Button (Threads circular translucent X) */}
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-black/60 hover:bg-neutral-800/80 text-white flex items-center justify-center tap-press transition-colors shadow-2xl border border-white/10 backdrop-blur-md"
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X size={20} strokeWidth={2} />
        </button>

        {/* Right: Threads More Options Button (...) */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              hapticsService.light?.();
              setShowMoreSheet(true);
            }}
            className="w-11 h-11 rounded-full bg-black/60 hover:bg-neutral-800/80 backdrop-blur-md border border-white/10 text-white tap-press transition-colors shadow-2xl flex items-center justify-center"
            title={isAr ? 'المزيد من الخيارات' : 'More options'}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* CENTER MEDIA CONTAINER */}
      <div
        onClick={() => setShowChrome(!showChrome)}
        className="flex-1 relative flex items-center justify-center overflow-hidden w-full h-full cursor-pointer select-none"
      >
        {/* Ripple Indicator on Play/Pause/Skip */}
        {rippleAction && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center text-white text-sm font-bold animate-scale-up">
              {rippleAction === 'play' && <Play size={24} className="fill-white" />}
              {rippleAction === 'pause' && <Pause size={24} className="fill-white" />}
              {rippleAction === '+10s' && <span>+10s</span>}
              {rippleAction === '-10s' && <span>-10s</span>}
            </div>
          </div>
        )}

        {/* IMAGE RENDERER */}
        {mediaType === 'image' && (
          <div
            className={`max-w-full max-h-full flex items-center justify-center p-2 transition-transform duration-300 ${
              isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
            }`}
          >
            <img
              src={currentMediaSrc}
              alt={post?.content || "PULSE Fullscreen Image"}
              className="max-w-full max-h-[82vh] object-contain shadow-2xl rounded-sm select-none pointer-events-auto"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )}

        {/* VIDEO RENDERER */}
        {mediaType === 'video' && (
          <div
            onClick={(e) => {
              // Tapping on video toggles play/pause
              togglePlayPause(e);
            }}
            className="relative w-full h-full flex items-center justify-center bg-black max-h-[82vh]"
          >
            <video
              ref={videoRef}
              src={currentMediaSrc}
              playsInline
              muted={isMuted}
              preload="auto"
              controlsList="nodownload nofullscreen noplaybackrate"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              className="max-w-full max-h-[82vh] object-contain bg-black"
            />

            {/* Center Big Play Icon when Paused */}
            {(!isPlaying || isEnded) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-16 h-16 rounded-full bg-black/70 border border-white/25 backdrop-blur-md flex items-center justify-center text-white shadow-2xl p-4">
                  {isEnded ? (
                    <RotateCcw size={28} />
                  ) : (
                    <Play size={32} className="fill-white translate-x-0.5" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS & POST ENGAGEMENT BAR (PULSE Style matching Image 3 & 4) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent z-30 flex flex-col gap-2.5 transition-opacity duration-300 ${
          showChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* If Video: Full Scrubber Bar with 10s skips and controls */}
        {mediaType === 'video' && (
          <div className="flex flex-col gap-1.5 w-full bg-black/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
            {/* Scrubber Line */}
            <div
              onClick={handleSeek}
              className="w-full h-3 flex items-center cursor-pointer group/bar relative"
            >
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden relative group-hover/bar:h-2 transition-all">
                <div
                  className="h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Video Controls Strip */}
            <div className="flex items-center justify-between text-xs text-white pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayPause}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white tap-press transition-colors"
                  title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                >
                  {isPlaying ? <Pause size={17} className="fill-white" /> : <Play size={17} className="fill-white" />}
                </button>

                {/* Skip -10s */}
                <button
                  onClick={(e) => skipTime(-10, e)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white tap-press transition-colors"
                  title="تأخير 10 ثواني"
                >
                  <Rewind size={16} />
                </button>

                {/* Skip +10s */}
                <button
                  onClick={(e) => skipTime(10, e)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white tap-press transition-colors"
                  title="تقديم 10 ثواني"
                >
                  <FastForward size={16} />
                </button>

                {/* Time Display */}
                <span className="font-mono text-xs text-white/90 ml-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Playback speed toggle */}
                <button
                  onClick={handleCycleSpeed}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-mono font-bold text-white tap-press transition-colors"
                  title="سرعة التشغيل"
                >
                  {playbackRate}x
                </button>

                {/* Mute/Unmute */}
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white tap-press transition-colors"
                  title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
                >
                  {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post Text snippet (if post exists) */}
        {post?.content && (
          <div className="text-xs text-neutral-200 leading-relaxed max-h-20 overflow-y-auto px-1">
            <RichTextRenderer
              text={expandText || post.content.length <= 120 ? post.content : post.content.substring(0, 120) + '...'}
              onOpenUserProfile={onOpenUserProfile}
            />
            {post.content.length > 120 && (
              <button
                onClick={() => setExpandText(!expandText)}
                className="text-neutral-400 hover:text-white font-medium ml-1 text-[11px]"
              >
                {expandText ? 'أقل' : 'المزيد'}
              </button>
            )}
          </div>
        )}

        {/* PULSE Official Engagement Row matching Screenshot 1 (Heart 202, Comment 14, Repost 3, Share 5) */}
        {post && (
          <div className="flex items-center justify-around py-3 px-6 border-t border-white/10" dir="ltr">
            {/* 1. Like */}
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-2 tap-press group ${
                isLiked ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="إعجاب"
            >
              <Heart size={20} className={`${isLiked ? 'fill-[#FF3040] text-[#FF3040] stroke-[#FF3040]' : ''} stroke-[2]`} />
              <AnimatedCounter value={likesCount} className="text-sm font-semibold" />
            </button>

            {/* 2. Reply */}
            <button
              onClick={handleReplyClick}
              className="flex items-center gap-2 text-neutral-400 hover:text-white tap-press group"
              title="رد"
            >
              <MessageCircle size={20} className="stroke-[2]" />
              <AnimatedCounter value={post.repliesCount || 0} className="text-sm font-semibold" />
            </button>

            {/* 3. Repost */}
            <button
              onClick={handleRepostClick}
              className={`flex items-center gap-2 tap-press group ${
                isReposted ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="إعادة نشر"
            >
              <Repeat2 size={20} className={`stroke-[2] ${isReposted ? 'text-white' : ''}`} />
              <AnimatedCounter value={repostsCount} className="text-sm font-semibold" />
            </button>

            {/* 4. Share */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-neutral-400 hover:text-white tap-press group"
              title="مشاركة"
            >
              <Send size={20} className="stroke-[2] -rotate-12" />
              <AnimatedCounter value={typeof post.sharesCount === 'number' ? post.sharesCount : 5} className="text-sm font-semibold" />
            </button>
          </div>
        )}
      </div>

      {/* THREADS BOTTOM SHEET (Matching Image 2: media_1792089608075.png) */}
      {showMoreSheet && (
        <div 
          className="fixed inset-0 z-[100000] flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowMoreSheet(false)}
        >
          <div 
            className="w-full max-w-lg mx-auto bg-[#161618] border-t border-neutral-800 rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2.5 px-4 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-neutral-600/70 rounded-full mx-auto mb-4 mt-1" />

            <div className="divide-y divide-neutral-800/80 text-sm">
              {/* Share via... */}
              <button
                onClick={(e) => {
                  setShowMoreSheet(false);
                  handleShare(e);
                }}
                className="w-full py-3.5 px-2 flex items-center justify-between text-white hover:bg-white/5 active:bg-white/10 rounded-xl tap-press transition-colors"
              >
                <span className="font-semibold text-[15px]">{isAr ? 'مشاركة عبر...' : 'Share via...'}</span>
                <Upload size={18} className="text-neutral-400" />
              </button>

              {/* Save media directly */}
              <button
                onClick={handleSaveMedia}
                className="w-full py-3.5 px-2 flex items-center justify-between text-white hover:bg-white/5 active:bg-white/10 rounded-xl tap-press transition-colors"
              >
                <span className="font-semibold text-[15px]">
                  {mediaType === 'video'
                    ? (isAr ? 'حفظ الفيديو في الجهاز' : 'Save video to device')
                    : (isAr ? 'حفظ الصورة في الجهاز' : 'Save image to device')}
                </span>
                <Download size={18} className="text-neutral-400" />
              </button>

              {/* Markup / Edit */}
              {mediaType === 'image' && (
                <button
                  onClick={handleOpenMarkup}
                  className="w-full py-3.5 px-2 flex items-center justify-between text-white hover:bg-white/5 active:bg-white/10 rounded-xl tap-press transition-colors"
                >
                  <span className="font-semibold text-[15px]">{isAr ? 'تعديل / Markup' : 'Markup'}</span>
                  <Edit3 size={18} className="text-neutral-400" />
                </button>
              )}

              {/* Use media */}
              <button
                onClick={handleUseMedia}
                className="w-full py-3.5 px-2 flex items-center justify-between text-white hover:bg-white/5 active:bg-white/10 rounded-xl tap-press transition-colors"
              >
                <span className="font-semibold text-[15px]">{isAr ? 'استخدام الصورة في منشور' : 'Use media'}</span>
                <ImageIcon size={18} className="text-neutral-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Image Editor (Markup) */}
      <ImageEditorModal
        isOpen={isMarkupEditorOpen}
        onClose={() => setIsMarkupEditorOpen(false)}
        imageSrc={currentMediaSrc}
        onSave={(edited) => {
          setCurrentMediaSrc(edited);
          setIsMarkupEditorOpen(false);
          showToast(isAr ? 'تم حفظ التعديلات بنجاح' : 'Markup applied successfully', 'success');
        }}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(viewerContent, document.body) : viewerContent;
}
