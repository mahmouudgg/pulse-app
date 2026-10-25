import React, { useState, useEffect } from 'react';
import { ShieldAlert, Eye, EyeOff, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { hapticsService } from '../services/hapticsService';
import { isPostSensitive, isUserAdult, getSensitiveContentPref } from '../utils/ageVerification';
import PulseMediaImage from './PulseMediaImage';
import PulseVideoPlayer from './PulseVideoPlayer';

export default function SensitiveMediaGate({
  post,
  currentUser = null,
  mediaType = 'image', // 'image' | 'video'
  src,
  poster = null,
  isGif = false,
  onOpenViewer = null,
  className = ''
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const isSensitive = isPostSensitive(post);
  const isAdult = isUserAdult(currentUser);

  const [revealedByUser, setRevealedByUser] = useState(false);
  const [sensitivePref, setSensitivePref] = useState(() => getSensitiveContentPref(currentUser));

  // Sync with real-time preference updates
  useEffect(() => {
    const handlePrefChange = (e) => {
      if (e.detail?.type === 'sensitive_pref') {
        setSensitivePref(e.detail.value);
      }
    };
    window.addEventListener('pulse_preference_changed', handlePrefChange);
    return () => window.removeEventListener('pulse_preference_changed', handlePrefChange);
  }, []);

  const isBlurred = isSensitive && !revealedByUser && !(sensitivePref === 'show' && isAdult);

  const handleOpenPreferences = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try { hapticsService.light?.(); } catch {}
    window.dispatchEvent(
      new CustomEvent('pulse:open-settings', { detail: { subview: 'content_sensitive' } })
    );
  };

  const handleReveal = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try { hapticsService.selection?.(); } catch {}
    setRevealedByUser(true);
  };

  const handleReblur = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try { hapticsService.light?.(); } catch {}
    setRevealedByUser(false);
  };

  // If not sensitive, render regular media container
  if (!isSensitive) {
    if (mediaType === 'video') {
      return (
        <div className={`relative w-full max-w-full overflow-hidden rounded-2xl ${className}`}>
          <PulseVideoPlayer src={src} poster={poster} onOpenViewer={onOpenViewer} />
        </div>
      );
    }
    return (
      <div className={`relative w-full max-w-full overflow-hidden rounded-2xl ${className}`}>
        <PulseMediaImage src={src} isGif={isGif} onOpenViewer={onOpenViewer} />
      </div>
    );
  }

  // If sensitive and blurred: Render heavy blur filter and solid adult warning overlay card
  if (isBlurred) {
    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`relative mt-2.5 w-full max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/80 select-none ${className}`}
      >
        {/* Heavily Blurred Background Media Container */}
        <div className="relative filter blur-[32px] scale-110 pointer-events-none opacity-30 select-none overflow-hidden max-h-80">
          {mediaType === 'video' ? (
            <PulseVideoPlayer src={src} poster={poster} />
          ) : (
            <PulseMediaImage src={src} isGif={isGif} />
          )}
        </div>

        {/* Solid Content Warning (+18) Overlay Card */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-md">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-3 shadow-lg">
            <ShieldAlert size={22} className="text-amber-400" />
          </div>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-bold text-white">
              {isAr ? 'محتوى مخصص للبالغين (+18)' : 'Adult Content (+18)'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              +18
            </span>
          </div>

          <p className="text-xs text-neutral-300 max-w-xs mb-4 leading-relaxed">
            {isAr
              ? 'قام الناشر بتعليم هذه الوسائط بأنها تتضمن محتوى حساساً يتطلب التحقق من السن.'
              : 'The author marked this media as adult content (+18) requiring age verification.'}
          </p>

          {isAdult ? (
            <div className="flex items-center gap-2.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={handleReveal}
                className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-all shadow-md flex items-center gap-1.5"
              >
                <Eye size={14} />
                <span>{isAr ? 'عرض المحتوى' : 'Show Media'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPreferences}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 font-semibold text-xs border border-white/10 tap-press transition-colors"
              >
                <span>{isAr ? 'تفضيلات المحتوى' : 'Preferences'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
                <Lock size={12} />
                <span>{isAr ? 'غير متاح للحسابات دون سن 18 عاماً' : 'Restricted for accounts under 18'}</span>
              </div>
              <button
                type="button"
                onClick={handleOpenPreferences}
                className="text-xs text-neutral-400 hover:text-white underline mt-1 tap-press"
              >
                {isAr ? 'إدارة تفضيلات المحتوى' : 'Manage Content Preferences'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If sensitive but revealed: Render media clearly with re-blur pill button
  return (
    <div className={`relative mt-2.5 w-full max-w-full overflow-hidden rounded-2xl group ${className}`}>
      {/* Floating Re-blur and Badge Pill in top corner */}
      <div className="absolute top-2.5 end-2.5 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleReblur}
          className="px-2.5 py-1 rounded-full bg-black/80 hover:bg-black text-neutral-200 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-white/20 backdrop-blur-md tap-press transition-all shadow-md"
          title={isAr ? 'إعادة التعتيم' : 'Re-blur'}
        >
          <EyeOff size={12} />
          <span>{isAr ? 'تعتيم' : 'Blur'}</span>
        </button>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
          +18
        </span>
      </div>

      {mediaType === 'video' ? (
        <PulseVideoPlayer src={src} poster={poster} onOpenViewer={onOpenViewer} />
      ) : (
        <PulseMediaImage src={src} isGif={isGif} onOpenViewer={onOpenViewer} />
      )}
    </div>
  );
}
