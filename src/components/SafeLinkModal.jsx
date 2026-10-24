import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Globe,
  ExternalLink, 
  AlertTriangle, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  X,
  ArrowUpRight
} from 'lucide-react';
import { analyzeUrl, openInSafeBrowser } from '../utils/linkSafetyEngine';
import { hapticsService } from '../services/hapticsService';

/**
 * World-Class Minimalist Safe Link Interstitial Modal
 * Clean, frictionless, Apple/Threads-grade UX
 * Strictly ZERO EMOJIS, zero AI kickers, zero visual clutter.
 */
export default function SafeLinkModal({
  isOpen,
  url,
  onClose,
  lang = 'ar'
}) {
  const [copied, setCopied] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const isAr = lang === 'ar';

  const audit = useMemo(() => {
    if (!url) return null;
    return analyzeUrl(url);
  }, [url]);

  if (!isOpen || !audit) return null;

  const handleCopy = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(audit.url);
      setCopied(true);
      hapticsService.light?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  const handleProceed = async () => {
    try {
      setIsOpening(true);
      hapticsService.medium?.();
      await openInSafeBrowser(audit.url);
      setIsOpening(false);
      onClose();
    } catch (err) {
      console.error('Failed to open external link:', err);
      setIsOpening(false);
    }
  };

  const isDangerous = audit.riskLevel === 'DANGER';
  const isWarning = audit.riskLevel === 'WARNING';
  const hasRisk = isDangerous || isWarning;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-all select-none animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-md bg-[#121214] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 sm:p-7 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_25px_60px_rgba(0,0,0,0.9)] z-10 space-y-5 animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Header: Icon + Title + Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isDangerous 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                : isWarning 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-white/[0.05] border-white/10 text-white'
            }`}>
              {isDangerous ? (
                <ShieldAlert size={22} />
              ) : isWarning ? (
                <AlertTriangle size={22} />
              ) : (
                <Globe size={22} className="text-white" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isDangerous
                  ? (isAr ? 'رابط مشبوه أو غير آمن' : 'Suspicious Link')
                  : isWarning
                    ? (isAr ? 'رابط غير مشفر' : 'Unencrypted Link')
                    : (isAr ? 'فتح رابط خارجي' : 'External Link')}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 font-normal">
                {isAr ? 'أنت على وشك مغادرة PULSE إلى المتصفح' : "You are leaving PULSE to open this in your browser"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center tap-press transition-colors"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Clean Link / Domain Box */}
        <div className="bg-[#18181B] border border-white/10 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 me-2">
              {audit.isHttps ? (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium" title="HTTPS Secure">
                  <Lock size={12} className="flex-shrink-0" />
                  <span className="font-mono text-[11px]">HTTPS</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400 text-xs font-medium" title="HTTP Unencrypted">
                  <Unlock size={12} className="flex-shrink-0" />
                  <span className="font-mono text-[11px]">{isAr ? 'غير مشفر' : 'HTTP'}</span>
                </div>
              )}
              <span className="text-neutral-600">·</span>
              <span className="text-xs font-bold text-white truncate font-mono">
                {audit.domain}
              </span>
            </div>

            <button
              onClick={handleCopy}
              type="button"
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium tap-press transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>

          <div className="pt-0.5">
            <p className="text-neutral-400 text-[11.5px] font-mono break-all line-clamp-2 leading-relaxed" dir="ltr">
              {audit.url}
            </p>
          </div>
        </div>

        {/* Warning chip ONLY shown if there is real risk */}
        {hasRisk && (
          <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            isDangerous 
              ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
              : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
          }`}>
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-current" />
            <span className="font-medium">
              {isAr ? audit.riskDescriptionAr : audit.riskDescriptionEn}
            </span>
          </div>
        )}

        {/* Action Buttons (Threads/Apple Stacking) */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleProceed}
            disabled={isOpening}
            className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-press transition-all ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white shadow-lg shadow-rose-900/30'
                : 'bg-white hover:bg-neutral-200 active:scale-[0.99] text-black shadow-lg shadow-white/5'
            }`}
          >
            {isOpening ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {isDangerous
                    ? (isAr ? 'متابعة رغم التحذير' : 'Proceed Anyway')
                    : (isAr ? 'متابعة إلى الموقع' : 'Continue to Website')}
                </span>
                <ArrowUpRight size={16} className={isAr ? '-scale-x-100' : ''} />
              </>
            )}
          </button>

          <button
            onClick={onClose}
            type="button"
            className="w-full h-11 rounded-2xl bg-transparent hover:bg-white/5 active:bg-white/10 text-neutral-400 hover:text-white text-sm font-semibold tap-press transition-colors text-center"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
