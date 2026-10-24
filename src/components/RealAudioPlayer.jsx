import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { hapticsService } from '../services/hapticsService';

export default function RealAudioPlayer({ 
  audioSrc, 
  fallbackDuration = '0:18',
  title = 'نبضة صوتية',
  author = 'PULSE',
  transcript = '',
  onAudioEnded = null
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [animTick, setAnimTick] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef(null);
  const animRef = useRef(null);
  const waveformRef = useRef(null);
  const playerId = useRef('player_' + Math.random().toString(36).substring(2, 9));

  // Handle single-playback coordinator & global mini player commands
  useEffect(() => {
    const handleStopOthers = (e) => {
      if (e.detail?.id !== playerId.current && isPlaying) {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    const handleAudioCommand = (e) => {
      if (e.detail?.id === playerId.current) {
        if (e.detail.command === 'toggle') {
          if (audioRef.current) {
            if (isPlaying) {
              audioRef.current.pause();
              setIsPlaying(false);
              window.dispatchEvent(new CustomEvent('pulse_global_audio_pause', { detail: { id: playerId.current } }));
            } else {
              audioRef.current.play().then(() => {
                setIsPlaying(true);
                window.dispatchEvent(new CustomEvent('pulse_global_audio_play', {
                  detail: {
                    id: playerId.current,
                    title,
                    author,
                    audioSrc,
                    duration: duration || audioRef.current.duration || 0,
                    currentTime: audioRef.current.currentTime
                  }
                }));
              }).catch(console.warn);
            }
          }
        } else if (e.detail.command === 'pause') {
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        } else if (e.detail.command === 'speed') {
          const next = e.detail.speed;
          if (next && audioRef.current) {
            audioRef.current.playbackRate = next;
            setPlaybackSpeed(next);
          }
        }
      }
    };

    window.addEventListener('pulse_stop_other_audios', handleStopOthers);
    window.addEventListener('pulse_global_audio_command', handleAudioCommand);
    return () => {
      window.removeEventListener('pulse_stop_other_audios', handleStopOthers);
      window.removeEventListener('pulse_global_audio_command', handleAudioCommand);
    };
  }, [isPlaying, title, author, audioSrc, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      window.dispatchEvent(
        new CustomEvent('pulse_global_audio_time', {
          detail: { id: playerId.current, currentTime: audio.currentTime, duration: audio.duration || duration }
        })
      );
      // Media session position state
      if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime, duration)
          });
        } catch {}
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      window.dispatchEvent(
        new CustomEvent('pulse_global_audio_ended', { detail: { id: playerId.current } })
      );
      if (onAudioEnded) onAudioEnded();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioSrc, duration, onAudioEnded]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Smooth animation frame loop for dancing waveform
  useEffect(() => {
    if (isPlaying) {
      const updateWave = () => {
        setAnimTick((t) => (t + 1) % 1000);
        animRef.current = requestAnimationFrame(updateWave);
      };
      animRef.current = requestAnimationFrame(updateWave);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  // Media Session API for Lockscreen
  const setupMediaSession = () => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'نبضة صوتية',
        artist: author || 'PULSE',
        album: 'PULSE Voice Network',
        artwork: [
          { src: '/pulse_logo_clean.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    }
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    hapticsService.light();

    if (!audioRef.current && !audioSrc) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      window.dispatchEvent(
        new CustomEvent('pulse_global_audio_pause', { detail: { id: playerId.current } })
      );
    } else {
      window.dispatchEvent(new CustomEvent('pulse_stop_other_audios', { detail: { id: playerId.current } }));
      setupMediaSession();
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeed;
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        window.dispatchEvent(
          new CustomEvent('pulse_global_audio_play', {
            detail: {
              id: playerId.current,
              title,
              author,
              audioSrc,
              duration: duration || audioRef.current?.duration || 0,
              currentTime: audioRef.current?.currentTime || 0,
              speed: playbackSpeed
            }
          })
        );
      }).catch((err) => {
        console.error("Audio playback error:", err);
      });
    }
  };

  // Speed toggle: 1x -> 1.5x -> 2x -> 1x
  const cycleSpeed = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    hapticsService.selection();
    setPlaybackSpeed((prev) => {
      const next = prev === 1 ? 1.5 : (prev === 1.5 ? 2 : 1);
      if (audioRef.current) {
        audioRef.current.playbackRate = next;
      }
      window.dispatchEvent(
        new CustomEvent('pulse_global_audio_speed', {
          detail: { id: playerId.current, speed: next }
        })
      );
      return next;
    });
  };

  // Interactive Waveform Scrubbing
  const handleSeek = (clientX) => {
    if (!waveformRef.current || (!duration && !audioRef.current?.duration)) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    const targetDuration = duration || audioRef.current.duration || 18;
    const targetTime = percent * targetDuration;

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      hapticsService.selection();
    }
  };

  const handleWaveformClick = (e) => {
    e.stopPropagation();
    handleSeek(e.clientX);
  };

  const handleWaveformTouch = (e) => {
    e.stopPropagation();
    if (e.touches && e.touches[0]) {
      handleSeek(e.touches[0].clientX);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 24 Pro audio bars
  const baseBars = [25, 45, 75, 95, 60, 100, 80, 50, 85, 70, 95, 55, 75, 45, 90, 65, 95, 70, 50, 85, 60, 40, 75, 45];

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className={`my-3 p-3.5 bg-[#0D0D0F] rounded-2xl border transition-all ${
        isPlaying ? 'border-white/40 shadow-[0_0_24px_rgba(255,255,255,0.06)]' : 'border-[#202024] hover:border-[#303036]'
      }`}
    >
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" />}

      <div className="flex items-center justify-between gap-3">
        {/* Play / Pause button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 tap-press transition-all ${
            isPlaying
              ? 'bg-white text-black shadow-[0_0_14px_rgba(255,255,255,0.5)]'
              : 'bg-white text-black hover:bg-neutral-200'
          }`}
          aria-label={isPlaying ? 'إيقاف' : 'تشغيل النبضة'}
        >
          {isPlaying ? (
            <Pause size={17} className="fill-black stroke-black" />
          ) : (
            <Play size={17} className="fill-black stroke-black translate-x-[-1px]" />
          )}
        </button>

        {/* Interactive Scrubbing Waveform */}
        <div 
          ref={waveformRef}
          onClick={handleWaveformClick}
          onTouchMove={handleWaveformTouch}
          onTouchStart={handleWaveformTouch}
          className="flex-1 flex items-center justify-center gap-[3px] h-9 px-1 cursor-pointer select-none"
          title="اسحب أو اضغط لتقديم وتأخير الصوت"
        >
          {baseBars.map((baseH, i) => {
            const barProgress = (i / baseBars.length) * 100;
            const isPassed = barProgress <= progressPercent;

            const dynamicH = isPlaying
              ? Math.max(16, Math.sin(animTick * 0.18 + i * 0.6) * 36 + baseH * 0.65)
              : baseH;

            return (
              <span
                key={i}
                style={{
                  height: `${dynamicH}%`,
                  transition: isPlaying ? 'height 0.08s ease' : 'height 0.25s ease'
                }}
                className={`w-[3px] rounded-full pointer-events-none transition-colors ${
                  isPassed
                    ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                    : 'bg-[#2E2E32]'
                }`}
              />
            );
          })}
        </div>

        {/* Controls Column: Speed + Time */}
        <div className="flex flex-col items-end flex-shrink-0 gap-1 select-none">
          <div className="flex items-center gap-1.5">
            {/* Speed Toggle Pill */}
            <button
              onClick={cycleSpeed}
              className="px-1.5 py-0.5 rounded-md bg-[#18181C] hover:bg-[#222226] border border-[#28282C] text-[10px] font-mono font-bold text-neutral-300 tap-press"
              title="تغيير سرعة الاستماع"
            >
              {playbackSpeed}x
            </button>

            <span className="font-mono text-[11px] text-white tracking-tight">
              {duration > 0 ? formatTime(currentTime) : fallbackDuration}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Mic size={10} className={isPlaying ? "text-white" : "text-neutral-500"} />
            <span className="text-[9px] text-neutral-400 font-mono tracking-wider">VOICE</span>
          </div>
        </div>
      </div>

      {/* Transcript / Caption Toggle (if transcript available) */}
      {transcript && (
        <div className="mt-2.5 pt-2 border-t border-[#1C1C20]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTranscript(!showTranscript);
            }}
            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors tap-press"
          >
            <FileText size={11} />
            <span>{showTranscript ? 'إخفاء النص المكتوب' : 'عرض تفريغ النبضة (Transcript)'}</span>
            {showTranscript ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showTranscript && (
            <div dir="auto" className="mt-2 p-2.5 rounded-xl bg-[#141416] border border-[#242428] text-xs text-neutral-200 leading-relaxed font-normal bidi-plain">
              {transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
