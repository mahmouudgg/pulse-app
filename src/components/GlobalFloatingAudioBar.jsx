import React, { useState, useEffect } from 'react';
import { Play, Pause, X, Music2 } from 'lucide-react';
import { soundService } from '../services/soundService';
import { hapticsService } from '../services/hapticsService';

/**
 * Global Persistent Floating Audio Mini-Player Bar
 * Solves the persistent background audio issue:
 * Provides immediate in-app controls to pause, resume, and completely close/stop audio playback.
 */
export default function GlobalFloatingAudioBar({ onOpenMusicPage }) {
  const [playbackState, setPlaybackState] = useState({
    playingId: null,
    isPlaying: false,
    isPaused: false,
    sound: null
  });

  useEffect(() => {
    const unsub = soundService.subscribe((state) => {
      setPlaybackState((prev) => ({
        ...prev,
        ...state
      }));
    });
    return unsub;
  }, []);

  const { sound, isPlaying } = playbackState;

  if (!sound) return null;

  const handleToggle = (e) => {
    e.stopPropagation();
    try { hapticsService.light?.(); } catch {}
    soundService.togglePlay();
  };

  const handleClose = (e) => {
    e.stopPropagation();
    try { hapticsService.medium?.(); } catch {}
    soundService.stopPreview();
  };

  const handleBarClick = () => {
    try { hapticsService.light?.(); } catch {}
    if (onOpenMusicPage) {
      onOpenMusicPage();
    }
  };

  return (
    <div className="fixed z-[9990] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 px-3 sm:px-4 pointer-events-none flex justify-center">
      <div
        onClick={handleBarClick}
        className="pointer-events-auto w-full max-w-md bg-[#101014]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 animate-sheet-up select-none cursor-pointer tap-press transition-transform active:scale-[0.99]"
      >
        {/* Cover Thumbnail & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0 flex items-center justify-center">
            {sound.coverUrl ? (
              <img
                src={sound.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Music2 size={18} className="text-white/60" />
            )}

            {/* Live equalizer wave overlay */}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                <span className="w-0.5 h-3 bg-white rounded-full animate-equalizer-1" />
                <span className="w-0.5 h-4 bg-white rounded-full animate-equalizer-2" />
                <span className="w-0.5 h-2.5 bg-white rounded-full animate-equalizer-3" />
                <span className="w-0.5 h-3.5 bg-white rounded-full animate-equalizer-4" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate leading-tight">
              {sound.title || 'PULSE Audio'}
            </h4>
            <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-mono">
              {sound.artist || 'PULSE'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={handleToggle}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 active:scale-95 tap-press transition-transform shadow-md"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isPlaying ? (
              <Pause size={16} className="fill-black" />
            ) : (
              <Play size={16} className="fill-black translate-x-0.5" />
            )}
          </button>

          {/* Dedicated Close / Stop Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20 active:scale-95 flex items-center justify-center tap-press transition-colors"
            title="إغلاق الصوت"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
