import React, { useState, useEffect } from 'react';
import { Play, Pause, X, Music2 } from 'lucide-react';
import { hapticsService } from '../services/hapticsService';
import { soundService } from '../services/soundService';

/**
 * Unified Global Audio Floating Player
 * Handles both Voice Notes and Real Music/Audio Tracks (soundService)
 * Provides permanent, accessible play/pause and dismiss/stop controls everywhere.
 */
export default function MiniAudioPlayer({ isSpaceActive = false }) {
  const [audioState, setAudioState] = useState(null);

  // 1. Listen for Post Voice Notes
  useEffect(() => {
    const handleGlobalPlay = (e) => {
      if (!e.detail) return;
      // Stop soundService music if voice note plays
      try { soundService.stopPreview(); } catch {}

      setAudioState({
        type: 'voice_note',
        id: e.detail.id,
        title: e.detail.title || 'نبضة صوتية',
        author: e.detail.author || 'PULSE',
        duration: e.detail.duration || 0,
        currentTime: e.detail.currentTime || 0,
        speed: e.detail.speed || 1,
        isPlaying: true,
        authorAvatar: e.detail.authorAvatar || null
      });
    };

    const handleGlobalPause = () => {
      setAudioState((prev) => (prev && prev.type === 'voice_note' ? { ...prev, isPlaying: false } : prev));
    };

    const handleGlobalTime = (e) => {
      if (!e.detail) return;
      setAudioState((prev) => {
        if (!prev || prev.type !== 'voice_note') return prev;
        return {
          ...prev,
          currentTime: e.detail.currentTime,
          duration: e.detail.duration || prev.duration
        };
      });
    };

    const handleGlobalSpeed = (e) => {
      if (!e.detail) return;
      setAudioState((prev) => (prev && prev.type === 'voice_note' ? { ...prev, speed: e.detail.speed || 1 } : prev));
    };

    const handleGlobalEnded = () => {
      setAudioState((prev) => (prev && prev.type === 'voice_note' ? { ...prev, isPlaying: false, currentTime: 0 } : null));
    };

    window.addEventListener('pulse_global_audio_play', handleGlobalPlay);
    window.addEventListener('pulse_global_audio_pause', handleGlobalPause);
    window.addEventListener('pulse_global_audio_time', handleGlobalTime);
    window.addEventListener('pulse_global_audio_speed', handleGlobalSpeed);
    window.addEventListener('pulse_global_audio_ended', handleGlobalEnded);

    return () => {
      window.removeEventListener('pulse_global_audio_play', handleGlobalPlay);
      window.removeEventListener('pulse_global_audio_pause', handleGlobalPause);
      window.removeEventListener('pulse_global_audio_time', handleGlobalTime);
      window.removeEventListener('pulse_global_audio_speed', handleGlobalSpeed);
      window.removeEventListener('pulse_global_audio_ended', handleGlobalEnded);
    };
  }, []);

  // 2. Subscribe to Real Music/Sound Tracks (soundService)
  useEffect(() => {
    const unsub = soundService.subscribe((state) => {
      if (state.sound) {
        setAudioState({
          type: 'sound_service',
          id: state.sound.id,
          title: state.sound.title || 'مقطع صوتي',
          author: state.sound.artist || 'PULSE Originals',
          duration: 30,
          currentTime: 0,
          speed: 1,
          isPlaying: state.isPlaying,
          coverUrl: state.sound.coverUrl || null,
          sound: state.sound
        });
      } else if (!state.sound && audioState?.type === 'sound_service') {
        setAudioState(null);
      }
    });

    return unsub;
  }, [audioState?.type]);

  if (!audioState || isSpaceActive) return null;

  const handleCycleSpeed = (e) => {
    e.stopPropagation();
    try { hapticsService.selection?.(); } catch {}
    if (audioState.type === 'voice_note') {
      const currentSpeed = audioState.speed || 1;
      const nextSpeed = currentSpeed === 1 ? 1.5 : (currentSpeed === 1.5 ? 2 : 1);
      setAudioState((prev) => (prev ? { ...prev, speed: nextSpeed } : null));
      window.dispatchEvent(
        new CustomEvent('pulse_global_audio_command', {
          detail: { id: audioState.id, command: 'speed', speed: nextSpeed }
        })
      );
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    try { hapticsService.light?.(); } catch {}
    if (audioState.type === 'sound_service') {
      soundService.togglePlay();
    } else {
      window.dispatchEvent(
        new CustomEvent('pulse_global_audio_command', {
          detail: { id: audioState.id, command: 'toggle' }
        })
      );
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    try { hapticsService.medium?.(); } catch {}
    if (audioState.type === 'sound_service') {
      soundService.stopPreview();
    } else {
      window.dispatchEvent(
        new CustomEvent('pulse_global_audio_command', {
          detail: { id: audioState.id, command: 'pause' }
        })
      );
    }
    setAudioState(null);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = audioState.duration > 0
    ? Math.min(100, Math.max(0, (audioState.currentTime / audioState.duration) * 100))
    : 0;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-auto sm:w-full sm:max-w-md z-[9990] mx-auto select-none pointer-events-auto animate-sheet-up">
      <div className="relative overflow-hidden bg-[#0E0E12]/95 border border-white/15 rounded-2xl p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl flex items-center justify-between gap-3 text-white">
        
        {/* Top Slim Progress Indicator (for voice notes) */}
        {audioState.type === 'voice_note' && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
            <div
              className="h-full bg-white transition-[width] duration-150 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Left: Artwork / Thumbnail & Play Button */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {audioState.coverUrl ? (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0">
              <img
                src={audioState.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              {audioState.isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                  <span className="w-0.5 h-3 bg-white rounded-full animate-equalizer-1" />
                  <span className="w-0.5 h-4 bg-white rounded-full animate-equalizer-2" />
                  <span className="w-0.5 h-2.5 bg-white rounded-full animate-equalizer-3" />
                  <span className="w-0.5 h-3.5 bg-white rounded-full animate-equalizer-4" />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleToggle}
              className="w-10 h-10 rounded-xl bg-white hover:bg-neutral-200 text-black flex items-center justify-center flex-shrink-0 transition-transform tap-press shadow-md"
              title={audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {audioState.isPlaying ? (
                <Pause size={17} className="fill-black stroke-black" />
              ) : (
                <Play size={17} className="fill-black stroke-black ml-0.5" />
              )}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[220px]">
                {audioState.title}
              </span>
              {audioState.isPlaying && !audioState.coverUrl && (
                <div className="flex items-end gap-[1.5px] h-3">
                  <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-2.5 bg-white rounded-full animate-bounce" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-neutral-400 font-mono mt-0.5">
              <span className="truncate max-w-[110px] text-neutral-300">
                {audioState.author}
              </span>
              {audioState.type === 'voice_note' && (
                <>
                  <span>·</span>
                  <span>
                    {formatTime(audioState.currentTime)} / {formatTime(audioState.duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Controls & Dismiss */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {audioState.coverUrl && (
            <button
              type="button"
              onClick={handleToggle}
              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 tap-press transition-transform shadow-md"
              title={audioState.isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {audioState.isPlaying ? (
                <Pause size={14} className="fill-black" />
              ) : (
                <Play size={14} className="fill-black translate-x-0.5" />
              )}
            </button>
          )}

          {audioState.type === 'voice_note' && (
            <button
              type="button"
              onClick={handleCycleSpeed}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-mono font-bold text-white tap-press transition-colors"
              title="سرعة الاستماع"
            >
              {audioState.speed || 1}x
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20 transition-colors tap-press flex items-center justify-center"
            title="إغلاق وإيقاف الصوت"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
