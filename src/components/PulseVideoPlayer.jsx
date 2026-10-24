import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw } from 'lucide-react';
import { hapticsService } from '../services/hapticsService';

/**
 * PULSE High-Performance In-Feed Video Player
 * - Autoplay muted when scrolled into view (IntersectionObserver, threshold: 0.5)
 * - Auto-pauses when scrolled out of view
 * - Auto-generates Cloudinary / Video thumbnail poster
 * - Loop enabled for continuous seamless feed playback
 * - Tap to unmute or expand into dedicated full screen viewer
 * - Zero emojis
 */
export default function PulseVideoPlayer({
  src,
  poster,
  onOpenViewer,
  className = ""
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // Compute smart poster fallback (Cloudinary image frame extraction)
  const effectivePoster = poster || (() => {
    if (!src || typeof src !== 'string') return null;
    if (src.includes('cloudinary.com') && src.includes('/video/upload/')) {
      return src.replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, '.jpg$2');
    }
    return null;
  })();

  // Autoplay muted when scrolled into viewport (Threads / Instagram UX)
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (video.paused && !video.ended) {
              video.muted = true;
              setIsMuted(true);
              video.play().then(() => {
                setIsPlaying(true);
              }).catch(() => {});
            }
          } else {
            if (!video.paused) {
              video.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      {
        threshold: [0, 0.5, 0.8]
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
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
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePlay = (e) => {
    e?.stopPropagation();
    try { hapticsService.light?.(); } catch {}
    const video = videoRef.current;
    if (!video) return;

    if (isEnded) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setIsEnded(false);
      setIsPlaying(true);
    } else if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
    triggerControlsVisibility();
  };

  const handleToggleMute = (e) => {
    e?.stopPropagation();
    try { hapticsService.light?.(); } catch {}
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    triggerControlsVisibility();
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

  const triggerControlsVisibility = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2800);
  };

  const handleVideoClick = (e) => {
    e.stopPropagation();
    if (onOpenViewer) {
      onOpenViewer();
    } else {
      handleTogglePlay(e);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handleVideoClick}
      className={`relative group w-full max-w-full box-border rounded-2xl overflow-hidden bg-black border border-[#222228] select-none cursor-pointer max-h-[480px] flex items-center justify-center ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={effectivePoster}
        playsInline
        muted={isMuted}
        loop
        preload="metadata"
        className="w-full max-w-full block box-border h-auto max-h-[480px] object-contain bg-black rounded-2xl"
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <div className="w-9 h-9 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Center Big Play / Replay Button when paused and not buffering */}
      {!isPlaying && !isBuffering && (
        <div
          onClick={handleTogglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] transition-opacity z-10"
        >
          <div className="w-14 h-14 rounded-full bg-black/80 border border-white/25 flex items-center justify-center text-white shadow-2xl tap-press transform group-hover:scale-105 transition-transform">
            {isEnded ? (
              <RotateCcw size={22} className="text-white" />
            ) : (
              <Play size={24} className="fill-white translate-x-0.5" />
            )}
          </div>
        </div>
      )}

      {/* Floating Badges (Expand & Quick Mute) */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenViewer) onOpenViewer();
          }}
          className="p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white/90 hover:text-white hover:bg-black/90 tap-press transition-colors shadow-lg"
          title="عرض كامل الشاشة"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Quick Audio Pill on Bottom Right when controls are hidden */}
      {!showControls && (
        <div className="absolute bottom-3 right-3 z-20">
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-white/90 hover:text-white hover:bg-black/90 tap-press transition-transform shadow-lg"
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      )}

      {/* Bottom Floating Control Strip (Shows on Hover / Tap) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-7 pb-2 px-3 flex flex-col gap-1.5 transition-opacity duration-200 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seekable Progress Bar */}
        <div
          onClick={handleSeek}
          className="w-full h-2 flex items-center cursor-pointer group/bar relative"
        >
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative group-hover/bar:h-1.5 transition-all">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-1 rounded-full hover:bg-white/10 text-white tap-press transition-colors"
            >
              {isPlaying ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white" />}
            </button>

            {/* Time Stamp */}
            <span className="font-mono text-[11px] text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mute / Unmute Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1 rounded-full hover:bg-white/10 text-white tap-press transition-colors"
              title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Open Dedicated Media Studio */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenViewer) onOpenViewer();
              }}
              className="p-1 rounded-full hover:bg-white/10 text-white tap-press transition-colors"
              title="توسيع"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
