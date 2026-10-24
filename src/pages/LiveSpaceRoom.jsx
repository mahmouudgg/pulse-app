import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Hand, Radio, ChevronDown, Share2, 
  Users, Square, Volume2, Zap, Terminal, Check,
  Flame, Heart, ThumbsUp, Lightbulb, Brain, X
} from 'lucide-react';
import PioneerBadge from '../components/PioneerBadge';
import { spaceService, audioStreamManager } from '../services/spaceService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

const SPACE_REACTIONS = [
  { id: 'thumbs', Icon: ThumbsUp, label: 'Thumbs Up' },
  { id: 'light', Icon: Lightbulb, label: 'Idea' },
  { id: 'flame', Icon: Flame, label: 'Fire' },
  { id: 'heart', Icon: Heart, label: 'Love' },
  { id: 'brain', Icon: Brain, label: 'Deep' },
  { id: 'zap', Icon: Zap, label: 'Fast' }
];

export default function LiveSpaceRoom({
  space: initialSpace,
  currentUser,
  onMinimize,
  onClose,
  onSpaceEnded
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();
  const [space, setSpace] = useState(initialSpace);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showHandQueue, setShowHandQueue] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);

  const isHost = space?.host?.uid === currentUser?.uid;
  const isSpeaker = isHost || (space?.speakers && !!space?.speakers[currentUser?.uid]);
  const handRaisedCount = space?.handRaises ? Object.keys(space.handRaises).length : 0;

  // Real-time synchronization for this specific space
  useEffect(() => {
    if (!initialSpace?.id) return;
    const unsubscribe = spaceService.subscribeToSpace(initialSpace.id, (freshSpace) => {
      if (!freshSpace || freshSpace.status === 'ended') {
        if (!isHost) {
          showToast(isAr ? 'انتهى هذا المجلس الصوتي وتمت أرشفته كنبضة صوتية.' : 'This live space has ended and was archived as a voice pulse.', 'info');
          onClose();
        }
        return;
      }
      setSpace(freshSpace);

      // Check current user's speaker/hand raise status
      if (currentUser?.uid) {
        if (freshSpace.handRaises && freshSpace.handRaises[currentUser.uid]) {
          setIsHandRaised(true);
        } else {
          setIsHandRaised(false);
        }
        if (freshSpace.speakers && freshSpace.speakers[currentUser.uid]) {
          setIsMuted(!!freshSpace.speakers[currentUser.uid].isMuted);
        }
      }
    });

    // Auto-join as listener if not host
    if (currentUser && !isHost) {
      spaceService.joinSpace(initialSpace.id, currentUser);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (currentUser && !isHost) {
        spaceService.leaveSpace(initialSpace.id, currentUser);
      }
    };
  }, [initialSpace?.id, currentUser?.uid]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio microphone listener when unmuted speaker
  useEffect(() => {
    if (isSpeaker && !isMuted) {
      audioStreamManager.start({
        onSpeakingChange: (speaking) => {
          if (space?.id && currentUser?.uid) {
            spaceService.setSpeaking(space.id, currentUser.uid, speaking);
          }
        }
      });
    } else {
      audioStreamManager.stop();
      if (space?.id && currentUser?.uid) {
        spaceService.setSpeaking(space.id, currentUser.uid, false);
      }
    }

    return () => {
      audioStreamManager.stop();
    };
  }, [isSpeaker, isMuted, space?.id, currentUser?.uid]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const handleToggleMute = async () => {
    if (!isSpeaker || !space?.id || !currentUser?.uid) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    await spaceService.setMute(space.id, currentUser.uid, nextMuted);
  };

  const handleToggleHandRaise = async () => {
    if (!space?.id || !currentUser) return;
    const nextRaised = !isHandRaised;
    setIsHandRaised(nextRaised);
    await spaceService.toggleHandRaise(space.id, currentUser, nextRaised);
  };

  const handlePromoteSpeaker = async (user) => {
    if (!space?.id || !isHost) return;
    await spaceService.promoteToSpeaker(space.id, user);
  };

  const handleDemoteSpeaker = async (user) => {
    if (!space?.id || !isHost) return;
    await spaceService.demoteToListener(space.id, user);
  };

  const handleEndSpace = async () => {
    if (!space || !isHost || isEnding) return;
    const confirmEnd = window.confirm(
      'هل تريد إنهاء المجلس الصوتي وأرشفة التسجيل تلقائياً كنبضة صوتية على التايملاين لمتابعيك؟'
    );
    if (!confirmEnd) return;

    setIsEnding(true);
    try {
      const audioUrl = audioStreamManager.stop();
      const archivePost = await spaceService.endAndArchiveSpace(space, audioUrl, duration);
      if (onSpaceEnded) onSpaceEnded(archivePost);
      onClose();
      showToast(isAr ? 'تم إنهاء المجلس وأرشفة التسجيل بنجاح في الخط الزمني' : 'Space ended and archived to timeline successfully', 'success');
    } catch (err) {
      console.warn('Error ending space:', err);
      onClose();
    } finally {
      setIsEnding(false);
    }
  };

  const handleLeaveSpace = async () => {
    if (isHost) {
      handleEndSpace();
      return;
    }
    if (space?.id && currentUser) {
      await spaceService.leaveSpace(space.id, currentUser);
    }
    onClose();
  };

  const triggerReaction = (reaction) => {
    const id = Date.now() + Math.random();
    const newReaction = {
      id,
      reaction,
      left: Math.random() * 70 + 15
    };
    setFloatingEmojis((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: space?.title,
        text: isAr ? `انضم الآن إلى مجلس حي على PULSE: "${space?.title}"` : `Join live space on PULSE: "${space?.title}"`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast(isAr ? 'تم نسخ رابط المجلس بنجاح' : 'Space link copied successfully', 'success');
    }
  };

  const speakersList = space?.speakers ? Object.values(space.speakers) : [];
  const listenersList = space?.listeners ? Object.values(space.listeners) : [];
  const handRaisesList = space?.handRaises ? Object.values(space.handRaises) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Floating Reactions Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {floatingEmojis.map((r) => {
          const ReactIcon = r.reaction.Icon;
          return (
            <div
              key={r.id}
              style={{ left: `${r.left}%` }}
              className="absolute bottom-24 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white animate-floating-reaction select-none shadow-lg"
            >
              <ReactIcon size={22} className="text-white" />
            </div>
          );
        })}
      </div>
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-md border-b border-[#1C1C22] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <button
          onClick={onMinimize}
          className="p-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors tap-press"
          title="تصغير المجلس ومتابعة التصفح"
        >
          <ChevronDown size={20} />
        </button>

        {/* Live Pill, Beta tag, and Duration */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/40 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span className="text-[10px] font-extrabold text-rose-300 font-mono tracking-wider">LIVE</span>
          </div>
          <span className="text-[9px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">BETA</span>
          <span className="text-xs font-mono text-neutral-400">{formatTime(duration)}</span>
        </div>

        {/* End or Leave Button */}
        {isHost ? (
          <button
            onClick={handleEndSpace}
            disabled={isEnding}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors tap-press shadow-sm flex items-center gap-1"
          >
            <Square size={12} className="fill-white" />
            <span>إنهاء وأرشفة</span>
          </button>
        ) : (
          <button
            onClick={handleLeaveSpace}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-neutral-300 text-xs font-bold transition-colors tap-press border border-white/10"
          >
            مغادرة
          </button>
        )}
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-xl mx-auto w-full relative z-20">
        {/* Room Header Info */}
        <div className="text-center mb-6">
          <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/15 text-neutral-300 text-xs font-mono mb-2">
            #{space?.topic || 'عام'}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
            {space?.title}
          </h1>

          {/* Host Byline */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-neutral-400">بإدارة:</span>
            <span className="text-xs font-bold text-neutral-200">
              {space?.host?.displayName}
            </span>
            <PioneerBadge number={space?.host?.pioneerNumber || (space?.host?.isFounder ? 1 : null)} size="xs" />
          </div>
        </div>

        {/* Hand Raise Queue Alert for Host */}
        {isHost && handRaisedCount > 0 && (
          <div className="mb-6 p-3 rounded-2xl bg-white/5 border border-white/20 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-white text-xs font-bold">
                <Hand size={14} className="animate-bounce" />
                <span>طلبات الصعود للمنصة ({handRaisedCount})</span>
              </div>
              <button
                onClick={() => setShowHandQueue(!showHandQueue)}
                className="text-[11px] text-white hover:underline font-mono"
              >
                {showHandQueue ? 'إخفاء' : 'عرض الكل'}
              </button>
            </div>

            {showHandQueue && (
              <div className="space-y-2 mt-2 pt-2 border-t border-white/10">
                {handRaisesList.map((user) => (
                  <div key={user.uid} className="flex items-center justify-between bg-black/40 p-2 rounded-xl">
                    <div className="flex items-center gap-2">
                      <img src={user.avatar || DEFAULT_AVATAR} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-xs text-white font-bold">{user.displayName}</span>
                      <PioneerBadge number={user.pioneerNumber} size="xs" />
                    </div>
                    <button
                      onClick={() => handlePromoteSpeaker(user)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-extrabold tap-press transition-colors"
                    >
                      قبول كمتحدث
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STAGE: Speakers Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <Mic size={14} className="text-white" />
              <span>المتحدثون والمنصة ({speakersList.length})</span>
            </div>
            {isHost && <span className="text-[10px] text-neutral-500 font-mono">أنت المضيف</span>}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-4 rounded-3xl bg-[#0D0D11]/90 border border-[#1F1F28] shadow-inner">
            {speakersList.map((speaker) => {
              const isSpeakerHost = speaker.uid === space?.host?.uid;
              const isSpeaking = speaker.isSpeaking;
              const isMutedSpeaker = speaker.isMuted;

              return (
                <div key={speaker.uid} className="flex flex-col items-center text-center relative group">
                  {/* Avatar Container with Active Pulsing Ring */}
                  <div className="relative mb-2">
                    {/* Pulsing ring when speaking */}
                    {isSpeaking && (
                      <div className="absolute -inset-1 rounded-full border border-white/40 opacity-75"></div>
                    )}
                    <div className={`relative w-16 h-16 sm:w-20 sm:h-20 min-w-[64px] min-h-[64px] rounded-full p-0.5 border-2 transition-all ${
                      isSpeaking 
                        ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-105' 
                        : isSpeakerHost 
                          ? 'border-white/60 shadow-[0_0_12px_rgba(255,255,255,0.1)]' 
                          : 'border-[#2D2D3A]'
                    }`}>
                      <img
                        src={speaker.avatar || DEFAULT_AVATAR}
                        alt={speaker.displayName}
                        className="w-full h-full rounded-full object-cover aspect-square"
                      />
                    </div>

                    {/* Mic State Badge */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-black ${
                      isMutedSpeaker ? 'bg-neutral-800 text-neutral-400' : 'bg-white text-black'
                    }`}>
                      {isMutedSpeaker ? <MicOff size={11} /> : <Mic size={11} />}
                    </div>

                    {/* Host Star / Crown */}
                    {isSpeakerHost && (
                      <div className="absolute -top-1 -left-1 px-1.5 py-0.2 bg-white text-black text-[9px] font-black rounded-md font-mono shadow-sm">
                        HOST
                      </div>
                    )}
                  </div>

                  {/* Speaker Name & Badges */}
                  <span className="text-xs font-bold text-white truncate max-w-[90px]">
                    {speaker.displayName}
                  </span>
                  <div className="mt-0.5">
                    <PioneerBadge number={speaker.pioneerNumber || (speaker.isFounder ? 1 : null)} size="xs" />
                  </div>

                  {/* Host controls on non-host speakers */}
                  {isHost && !isSpeakerHost && (
                    <button
                      onClick={() => handleDemoteSpeaker(speaker)}
                      className="mt-1 text-[10px] text-neutral-400 hover:text-rose-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      إعادة كمستمع
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* LISTENERS: Grid */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-neutral-500" />
              <span>المستمعون ({listenersList.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 p-3 rounded-3xl bg-[#08080B] border border-[#18181E]">
            {listenersList.map((listener) => (
              <div key={listener.uid} className="flex flex-col items-center text-center">
                <div className="relative mb-1">
                  <img
                    src={listener.avatar || DEFAULT_AVATAR}
                    alt={listener.displayName}
                    className="w-11 h-11 rounded-full object-cover border border-[#25252E] aspect-square"
                  />
                  {space?.handRaises && space?.handRaises[listener.uid] && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-md animate-bounce">
                      <Hand size={10} />
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-neutral-300 truncate max-w-[70px]">
                  {listener.displayName}
                </span>
                <PioneerBadge number={listener.pioneerNumber || (listener.isFounder ? 1 : null)} size="xs" />
              </div>
            ))}

            {listenersList.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-neutral-500 font-mono">
                المجلس بدأ للتو، شارك الرابط لدعوة الأصدقاء!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Floating Bar Controls */}
      <div className="sticky bottom-0 z-40 bg-black/90 backdrop-blur-xl border-t border-[#1C1C22] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Reaction Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {SPACE_REACTIONS.map((item) => {
              const IconComp = item.Icon;
              return (
                <button
                  key={item.id}
                  onClick={() => triggerReaction(item)}
                  className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center tap-press transition-transform active:scale-125"
                  title={item.label}
                >
                  <IconComp size={16} />
                </button>
              );
            })}
          </div>
          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-3 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors tap-press"
              title="مشاركة رابط المجلس"
            >
              <Share2 size={18} />
            </button>

            {/* Hand Raise Button (for Listeners) */}
            {!isSpeaker && (
              <button
                onClick={handleToggleHandRaise}
                className={`flex items-center gap-1.5 px-3.5 py-3 rounded-2xl font-bold text-xs transition-all tap-press ${
                  isHandRaised
                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                    : 'bg-white/10 text-neutral-200 border border-white/15 hover:bg-white/20'
                }`}
              >
                <Hand size={16} />
                <span>{isHandRaised ? (isAr ? 'تم طلب الكلمة' : 'Hand raised') : (isAr ? 'طلب الكلمة' : 'Raise hand')}</span>
              </button>
            )}

            {/* Mic Toggle Button (for Speakers and Host) */}
            {isSpeaker && (
              <button
                onClick={handleToggleMute}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs shadow-lg transition-all tap-press ${
                  isMuted
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                    : 'bg-white hover:bg-neutral-200 text-black border border-white font-bold'
                }`}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isMuted ? (isAr ? 'إلغاء الكتم' : 'Unmute') : (isAr ? 'الميكروفون يعمل' : 'Mic active')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
