import React from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, Settings, Users, Bell, X, ChevronRight, ChevronLeft, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import VerifiedBadge from './VerifiedBadge';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export default function AccountSwitcherBottomSheet({ 
  isOpen, 
  onClose, 
  onOpenAccountsManager 
}) {
  const { currentUser, savedAccounts = [], switchAccount } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isAr = lang === 'ar';
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  if (!isOpen) return null;

  const handleSelectAccount = (targetUid, targetUsername) => {
    if (targetUid === currentUser?.uid) {
      onClose();
      return;
    }

    try { hapticsService.impact?.(); } catch {}
    const success = switchAccount(targetUid);
    onClose();

    if (success) {
      showToast(isAr ? `تم التبديل بنجاح إلى @${targetUsername}` : `Switched to @${targetUsername}`);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-end justify-center p-0 animate-fade-in select-none"
      style={backdropStyle}
      onClick={onClose}
    >
      <div
        {...containerProps}
        className="w-full max-w-[440px] bg-[#121214] border-t border-[#222226] rounded-t-[36px] p-6 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl animate-slide-up flex flex-col items-center will-change-transform"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Pull Handle */}
        <div className="w-10 h-1 bg-[#333338] rounded-full mb-5 cursor-grab active:cursor-grabbing" />

        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-white" />
            <h3 className="text-base font-bold text-white tracking-wide">
              {isAr ? 'تبديل الحسابات' : 'Switch Accounts'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A1A1E] hover:bg-[#25252A] text-neutral-400 hover:text-white flex items-center justify-center transition-colors tap-press"
          >
            <X size={17} />
          </button>
        </div>

        {/* Saved Accounts List */}
        <div className="w-full bg-[#18181A] border border-[#242428] rounded-3xl divide-y divide-[#202024] overflow-hidden shadow-lg">
          {savedAccounts && savedAccounts.length > 0 ? (
            savedAccounts.map((acc) => {
              const isActive = acc.uid === currentUser?.uid;
              const unread = (acc.unreadNotifications || 0) + (acc.unreadMessages || 0);

              return (
                <button
                  key={acc.uid}
                  type="button"
                  onClick={() => handleSelectAccount(acc.uid, acc.username)}
                  className={`w-full p-4 flex items-center justify-between text-start transition-colors tap-press ${
                    isActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03] active:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar with unread badge */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={acc.avatar || DEFAULT_AVATAR}
                        alt={acc.username}
                        className={`w-11 h-11 rounded-full object-cover border-2 ${
                          isActive ? 'border-white ring-2 ring-white/20' : 'border-[#2C2C32]'
                        }`}
                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      {!isActive && unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-white text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#18181A]">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white truncate">
                          {acc.displayName || acc.username}
                        </span>
                        {acc.isVerified && (
                          <VerifiedBadge size={14} />
                        )}
                        {isActive && (
                          <span className="text-[10px] font-semibold bg-white/10 text-white px-1.5 py-0.5 rounded-md">
                            {isAr ? 'النشط حالياً' : 'Active'}
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-neutral-400 font-mono block" dir="ltr">
                        @{acc.username}
                      </span>
                    </div>
                  </div>

                    {/* Indicator */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isActive ? (
                      <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                        <Check size={16} strokeWidth={2.8} />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-black px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 transition-colors shadow-sm">
                        {isAr ? 'تبديل' : 'Switch'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser?.avatar || DEFAULT_AVATAR}
                  alt={currentUser?.username}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white"
                />
                <div>
                  <span className="text-sm font-bold text-white block">
                    {currentUser?.displayName || currentUser?.username}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono" dir="ltr">
                    @{currentUser?.username}
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">
                <Check size={16} strokeWidth={2.8} />
              </div>
            </div>
          )}

          {/* Add Account Shortcut */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenAccountsManager) onOpenAccountsManager();
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors text-start tap-press group"
          >
            <div className="flex items-center gap-3.5 text-neutral-200 group-hover:text-white">
              <div className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center bg-white/5 group-hover:border-white/40 transition-colors">
                <Plus size={18} />
              </div>
              <span className="text-sm font-bold">
                {isAr ? 'إضافة حساب جديد أو موجود' : 'Add or connect another account'}
              </span>
            </div>
            <Chevron size={17} className="text-neutral-500" />
          </button>
        </div>

        {/* Navigate to Dedicated Accounts Hub */}
        <button
          type="button"
          onClick={() => {
            onClose();
            if (onOpenAccountsManager) onOpenAccountsManager();
          }}
          className="w-full mt-3 py-3 px-4 rounded-2xl bg-[#18181A] hover:bg-[#202024] active:scale-[0.99] border border-[#242428] flex items-center justify-between text-neutral-300 hover:text-white transition-all tap-press"
        >
          <div className="flex items-center gap-2.5">
            <Shield size={16} className="text-neutral-400" />
            <span className="text-xs font-semibold">
              {isAr ? 'مركز إدارة الحسابات المتعددة والأمان' : 'Manage Accounts & Security Hub'}
            </span>
          </div>
          <Chevron size={15} className="text-neutral-500" />
        </button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
