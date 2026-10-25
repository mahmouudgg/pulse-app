import React from 'react';
import { createPortal } from 'react-dom';
import { X, Bookmark, Compass, Users, Mic, MapPin, Check } from 'lucide-react';
import { hapticsService } from '../services/hapticsService';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export default function FeedsDrawerModal({
  isOpen,
  onClose,
  activeFilter,
  onSelectFilter,
  onOpenBookmarks,
  lang = 'ar'
}) {
  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const feedOptions = [
    {
      id: 'for_you',
      label: isAr ? 'لك (الموصى بها)' : 'For you',
      subtitle: isAr ? 'أحدث وأقوى النبضات الفكرية' : 'Recommended pulses',
      icon: Compass
    },
    {
      id: 'following',
      label: isAr ? 'المتابعون' : 'Following',
      subtitle: isAr ? 'نبضات الحسابات التي تتابعها فقط' : 'Pulses from accounts you follow',
      icon: Users
    },
    {
      id: 'voice',
      label: isAr ? 'الصوتيات والمجالس' : 'Voice & Spaces',
      subtitle: isAr ? 'النبضات والمشاركات الصوتية' : 'Voice notes and audio pulses',
      icon: Mic
    },
    {
      id: 'nearby',
      label: isAr ? 'بالقرب منك' : 'Nearby',
      subtitle: isAr ? 'نبضات مبنية على موقعك الجغرافي' : 'Pulses around your location',
      icon: MapPin
    }
  ];

  const handleSelect = (id) => {
    try { hapticsService.selection?.(); } catch {}
    onSelectFilter(id);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      style={backdropStyle}
      onClick={onClose}
    >
      <div
        {...containerProps}
        className="w-full max-w-[440px] bg-[#121214] border-t sm:border border-[#242428] rounded-t-[32px] sm:rounded-[32px] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-white shadow-2xl animate-sheet-up flex flex-col will-change-transform"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Drag Handle */}
        <div className="w-10 h-1 bg-[#333338] rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing"></div>

        {/* Header (PULSE Style: Feeds + Action Buttons) */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {isAr ? 'الخلاصات' : 'Feeds'}
          </h2>

          <div className="flex items-center gap-2">
            {/* Quick Bookmark Button */}
            <button
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                onClose();
                onOpenBookmarks?.();
              }}
              className="w-9 h-9 rounded-full bg-[#1C1C20] hover:bg-[#26262B] border border-white/5 flex items-center justify-center text-white card-press transition-colors"
              title={isAr ? 'المحفوظات' : 'Bookmarks'}
            >
              <Bookmark size={16} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#1C1C20] hover:bg-[#26262B] border border-white/5 flex items-center justify-center text-white card-press transition-colors"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Card Options Container */}
        <div className="bg-[#18181A] border border-[#242428] rounded-[24px] overflow-hidden divide-y divide-[#222226]">
          {feedOptions.map((item) => {
            const Icon = item.icon;
            const isSelected = activeFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between p-4 transition-colors card-press ${
                  isSelected ? 'bg-[#202025]' : 'hover:bg-[#1E1E22] active:bg-[#222226]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-white text-black'
                        : 'bg-[#242428] text-neutral-300'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="text-start">
                    <span
                      className={`text-sm block ${
                        isSelected ? 'font-bold text-white' : 'font-semibold text-neutral-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[11px] text-[#777777] block mt-0.5">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center animate-scale-in">
                    <Check size={12} className="stroke-[3.5]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
