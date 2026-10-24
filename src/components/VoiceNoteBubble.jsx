import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Check, CheckCheck } from 'lucide-react';

const WAVE_BARS = [35, 60, 40, 85, 55, 95, 45, 70, 30, 90, 65, 40, 75, 50, 80, 60];

export default function VoiceNoteBubble({
  audioUrl,
  duration = 0,
  isSender = false,
  timestamp,
  isRead = false
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [totalDuration, setTotalDuration] = useState(duration);

  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio play error:', err);
      });
    }
  };

  const handleScrub = (barIndex) => {
    if (!audioRef.current || totalDuration === 0) return;
    const targetPercent = barIndex / (WAVE_BARS.length - 1);
    const targetTime = targetPercent * totalDuration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const cycleSpeed = (e) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatSecs = (sec) => {
    const s = Math.round(sec);
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const currentPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`p-3 rounded-2xl max-w-xs sm:max-w-sm select-none ${
      isSender 
        ? 'bg-[#1A1A1F] border border-white/15 text-white rounded-br-none shadow-[0_4px_20px_rgba(255,255,255,0.04)]' 
        : 'bg-[#15151B] border border-[#262633] text-neutral-200 rounded-bl-none shadow-md'
    }`}>
      <div className="flex items-center gap-3">
        {/* Play / Pause Circular Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 tap-press transition-transform active:scale-90 shadow-md ${
            isSender
              ? 'bg-white hover:bg-neutral-200 text-black'
              : 'bg-white hover:bg-neutral-200 text-black'
          }`}
        >
          {isPlaying ? (
            <Pause size={17} className="fill-current" />
          ) : (
            <Play size={17} className="fill-current ml-0.5" />
          )}
        </button>

        {/* Interactive Waveform Scrubber */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[3px] h-7 cursor-pointer py-1">
            {WAVE_BARS.map((barHeight, idx) => {
              const barPercent = (idx / (WAVE_BARS.length - 1)) * 100;
              const isPlayed = barPercent <= currentPercent;

              return (
                <div
                  key={idx}
                  onClick={() => handleScrub(idx)}
                  style={{ height: `${barHeight}%` }}
                  className={`flex-1 rounded-full transition-colors duration-150 ${
                    isPlayed
                      ? isSender ? 'bg-white' : 'bg-white'
                      : isSender ? 'bg-neutral-700 hover:bg-neutral-600' : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                />
              );
            })}
          </div>

          {/* Timing and Speed indicator row */}
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1 font-mono">
            <span>{isPlaying ? formatSecs(currentTime) : formatSecs(totalDuration)}</span>

            <div className="flex items-center gap-2">
              {/* Playback speed toggle */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="px-1.5 py-0.2 rounded-md bg-white/10 hover:bg-white/20 text-[9px] font-bold text-neutral-300 tap-press transition-colors"
                title="سرعة التشغيل"
              >
                {playbackSpeed}x
              </button>

              {/* Read Receipt */}
              {isSender && (
                <span className="flex items-center" title={isRead ? "تم الاستماع" : "تم الإرسال"}>
                  {isRead ? (
                    <CheckCheck size={13} className="text-white stroke-[2.5]" />
                  ) : (
                    <Check size={12} className="text-neutral-500" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
