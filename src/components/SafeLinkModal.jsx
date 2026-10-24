import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldCheck, 
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
 * Threads-Grade Safe Link Interstitial & Phishing Guard Modal
 * Warns users before leaving PULSE, displays domain reputation,
 * and launches external URLs safely via Chrome Custom Tabs.
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(audit.url);
      setCopied(true);
      try { hapticsService.light?.(); } catch {}
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleProceed = async () => {
    try {
      setIsOpening(true);
      try { hapticsService.medium?.(); } catch {}
      await openInSafeBrowser(audit.url);
      setIsOpening(false);
      onClose();
    } catch (err) {
      console.error('Failed to open safe browser:', err);
      setIsOpening(false);
    }
  };

  // Visual risk styles
  const getRiskBadge = () => {
    switch (audit.riskLevel) {
      case 'SAFE':
        return {
          icon: <ShieldCheck size={28} className="text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          title: isAr ? audit.riskTitleAr : audit.riskTitleEn
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle size={28} className="text-amber-400" />,
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          title: isAr ? audit.riskTitleAr : audit.riskTitleEn
        };
      case 'DANGER':
        return {
          icon: <ShieldAlert size={28} className="text-rose-500" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          title: isAr ? audit.riskTitleAr : audit.riskTitleEn
        };
      case 'STANDARD':
      default:
        return {
          icon: <ExternalLink size={26} className="text-neutral-300" />,
          bgColor: 'bg-neutral-800 border-neutral-700 text-neutral-300',
          title: isAr ? audit.riskTitleAr : audit.riskTitleEn
        };
    }
  };

  const badge = getRiskBadge();

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-all">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div 
        className="relative w-full max-w-lg bg-[#101012] border-t sm:border border-[#26262A] rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl z-10 space-y-5 animate-sheet-up"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header Close & Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${badge.bgColor}`}>
              {badge.icon}
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-400 block">
                {isAr ? 'فاحص الروابط الخارجي' : 'External Link Guard'}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {badge.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center tap-press transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Domain & URL Box */}
        <div className="bg-[#18181C] border border-[#2A2A30] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              {audit.isHttps ? (
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium" title="HTTPS Encrypted">
                  <Lock size={13} />
                  <span>HTTPS</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400 text-xs font-medium" title="Unencrypted HTTP">
                  <Unlock size={13} />
                  <span>HTTP غير مشفر</span>
                </div>
              )}
              <span className="text-neutral-600">•</span>
              <span className="text-xs text-neutral-400 font-mono">
                {isAr ? 'النطاق المستهدف' : 'Target Host'}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold tap-press transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>

          <div className="pt-1">
            <p className="text-white text-base sm:text-lg font-bold font-mono tracking-tight truncate">
              {audit.domain}
            </p>
            <p className="text-neutral-500 text-xs font-mono break-all line-clamp-2 mt-0.5">
              {audit.url}
            </p>
          </div>
        </div>

        {/* Warning / Informative Guidance */}
        <div className={`p-3.5 rounded-xl border text-xs sm:text-[13px] leading-relaxed ${
          audit.riskLevel === 'DANGER' 
            ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
            : audit.riskLevel === 'WARNING'
            ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
        }`}>
          <p className="font-medium">
            {isAr ? audit.riskDescriptionAr : audit.riskDescriptionEn}
          </p>
          <p className="text-neutral-400 text-[11px] mt-1.5 flex items-center gap-1">
            <span className="text-rose-400 font-bold">{isAr ? 'تذكير أمني:' : 'Security Note:'}</span>
            <span>{isAr ? 'لا تشارك أبداً كلمة مرور حسابك أو رموز التحقق مع أي موقع خارجي.' : 'Never enter your PULSE password or 2FA codes on external sites.'}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            onClick={handleProceed}
            disabled={isOpening}
            className={`w-full sm:flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 tap-press transition-all ${
              audit.riskLevel === 'DANGER'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40'
                : 'bg-white hover:bg-neutral-200 text-black shadow-lg shadow-white/5'
            }`}
          >
            {isOpening ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {audit.riskLevel === 'DANGER' 
                    ? (isAr ? 'متابعة رغم التحذير' : 'Proceed Anyway') 
                    : (isAr ? 'متابعة وفتح الرابط' : 'Continue & Open')}
                </span>
                <ArrowUpRight size={17} className={isAr ? '-scale-x-100' : ''} />
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 h-12 rounded-xl bg-neutral-900 hover:bg-[#1A1A1E] border border-neutral-800 text-neutral-300 text-sm font-semibold tap-press transition-colors"
          >
            {isAr ? 'إلغاء والعودة' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
