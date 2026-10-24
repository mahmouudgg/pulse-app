import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Check, Smartphone, Layers 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { appIconService, APP_ICONS } from '../services/appIconService';
import { hapticsService } from '../services/hapticsService';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function AppIconPage({ onBack }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const [activeIconId, setActiveIconId] = useState(() => appIconService.getActiveIconId());
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    setActiveIconId(appIconService.getActiveIconId());
  }, []);

  const handleSelectIcon = async (icon) => {
    if (icon.id === activeIconId) return;

    try { hapticsService.selection?.(); } catch {}
    setIsApplying(true);
    setActiveIconId(icon.id);

    const success = await appIconService.setAppIcon(icon.id);
    setIsApplying(false);

    if (success) {
      showToast(
        isAr 
          ? `تم تطبيق أيقونة ${icon.nameAr} بنجاح` 
          : `App icon updated to ${icon.name}`,
        'success'
      );
    } else {
      showToast(
        isAr 
          ? 'تم حفظ اختيار الأيقونة بنجاح' 
          : 'App icon preference saved',
        'info'
      );
    }
  };

  // Helper to render high-contrast monochrome waveform preview matching each theme
  const renderIconPreview = (icon) => {
    const isSelected = activeIconId === icon.id;
    return (
      <div 
        className={`w-16 h-16 rounded-2xl flex items-center justify-center p-3 relative shadow-xl overflow-hidden transition-all ${
          isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'border border-zinc-800'
        }`}
        style={{ backgroundColor: icon.bg }}
      >
        {/* Subtle texture overlay for Carbon / Eclipse */}
        {icon.id === 'cyber' && (
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
        )}
        {icon.id === 'crimson' && (
          <div className="absolute inset-0 rounded-2xl border border-zinc-600/30" />
        )}
        
        {/* Acoustic Waveform Icon Mark */}
        <div className="flex items-center justify-center gap-1 z-10 w-full h-full">
          <div className="w-1.5 h-4 rounded-full bg-white transition-all" />
          <div className="w-1.5 h-8 rounded-full bg-white transition-all" />
          <div className="w-1.5 h-6 rounded-full bg-white transition-all" />
          <div className="w-1.5 h-3 rounded-full bg-white transition-all" />
        </div>

        {isSelected && (
          <div className="absolute top-1 end-1 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow-md">
            <Check size={11} className="stroke-[3]" />
          </div>
        )}
      </div>
    );
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div 
        className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none font-sans"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Header */}
        <div className="sticky top-0 z-30 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3 border-b border-zinc-900/60">
          <button
            type="button"
            onClick={() => {
              try { hapticsService.light?.(); } catch {}
              onBack();
            }}
            className="p-1 -ms-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"
            title={isAr ? 'رجوع' : 'Back'}
          >
            <BackIcon size={24} strokeWidth={2} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? 'أيقونة التطبيق' : 'App icon'}
            </h1>
          </div>
        </div>

        {/* Subhead Description */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm text-zinc-400 font-normal leading-relaxed">
            {isAr
              ? 'اختر مظهر أيقونة PULSE المفضل لهاتفك مجاناً وبكل حرية، ليتناسب مع شاشتك الرئيسية.'
              : 'Choose your favorite PULSE app icon appearance freely to match your home screen.'}
          </p>
        </div>

        {/* Icons Grid / List */}
        <div className="px-4 pt-3 space-y-3">
          {APP_ICONS.map((icon) => {
            const isSelected = activeIconId === icon.id;
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => handleSelectIcon(icon)}
                className={`w-full p-4 rounded-3xl flex items-center justify-between text-start transition-all tap-press ${
                  isSelected 
                    ? 'bg-[#141418] border-2 border-white shadow-lg shadow-white/5' 
                    : 'bg-[#101012] border border-[#222226] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {renderIconPreview(icon)}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-bold text-white truncate">
                        {isAr ? icon.nameAr : icon.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-mono text-zinc-300 font-semibold flex-shrink-0">
                        {isAr ? icon.badgeTextAr : icon.badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-normal line-clamp-2 leading-relaxed">
                      {isAr ? icon.descAr : icon.desc}
                    </p>
                  </div>
                </div>

                <div className="ms-3 flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isSelected ? 'bg-white text-black border-white' : 'border-zinc-700 bg-transparent'
                  }`}>
                    {isSelected && <Check size={14} className="stroke-[3]" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pro Tip Note */}
        <div className="mt-8 px-5">
          <div className="p-4 rounded-2xl bg-[#0D0D0F] border border-zinc-900 text-center">
            <p className="text-xs text-zinc-500 leading-relaxed">
              {isAr
                ? 'يتم تطبيق مظهر الأيقونة فور اختيارها، ويتم الاحتفاظ بها كتفضيل دائم لحسابك.'
                : 'App icon appearance applies immediately and is preserved across all your sessions.'}
            </p>
          </div>
        </div>
      </div>
    </SwipeBackWrapper>
  );
}