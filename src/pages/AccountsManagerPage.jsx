import React, { useState } from 'react';
import { 
  ArrowRight, ArrowLeft, Users, UserPlus, Shield, Check, 
  Trash2, LogOut, Plus, AlertCircle, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import VerifiedBadge from '../components/VerifiedBadge';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import AuthPage from './AuthPage';

export default function AccountsManagerPage({ onBack }) {
  const { 
    currentUser, 
    savedAccounts = [], 
    switchAccount, 
    removeSavedAccount, 
    logout 
  } = useAuth();
  
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  // Official Auth Modal state for adding or creating an account
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Modals
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState(null);

  // Handle 1-Tap Switching
  const handleSwitch = (targetUid, targetUsername) => {
    if (!targetUid || targetUid === currentUser?.uid) return;
    try { hapticsService.impact?.(); } catch {}

    const success = switchAccount(targetUid);
    if (success) {
      showToast(isAr ? `تم التبديل بنجاح إلى @${targetUsername}` : `Switched to @${targetUsername}`);
    } else {
      showToast(isAr ? 'تعذر التبديل إلى هذا الحساب' : 'Failed to switch account', 'error');
    }
  };

  // Remove single account
  const handleConfirmRemove = () => {
    if (!accountToRemove) return;
    try { hapticsService.light?.(); } catch {}
    const username = accountToRemove.username;
    removeSavedAccount(accountToRemove.uid);
    setAccountToRemove(null);
    showToast(isAr ? `تمت إزالة @${username} من هذا الجهاز` : `Removed @${username} from device`);
  };

  // Logout All
  const handleConfirmLogoutAll = () => {
    setShowLogoutAllConfirm(false);
    try { hapticsService.medium?.(); } catch {}
    logout(true);
  };

  const totalAccountsCount = Math.max((savedAccounts && savedAccounts.length) || 1, 1);
  const otherAccounts = (savedAccounts || []).filter((a) => a && a.uid !== currentUser?.uid);

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div 
        className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Sticky Unified SubHeader */}
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={21} strokeWidth={2.2} />
            </button>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                {isAr ? 'إدارة الحسابات' : 'Manage Accounts'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#121214] border border-[#222226] text-neutral-300 font-mono">
              {totalAccountsCount} {totalAccountsCount === 1 ? (isAr ? 'حساب' : 'account') : (isAr ? 'حسابات' : 'accounts')}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-5 animate-fade-in">
          
          {/* Header Explanation */}
          <div className="space-y-1 pt-1">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isAr ? 'الحسابات المحفوظة والتبديل السريع' : 'Saved Accounts & Fast Switch'}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {isAr 
                ? 'يمكنك التبديل بين حساباتك بلمسة واحدة دون الحاجة لإعادة كتابة كلمة المرور في كل مرة.' 
                : 'Switch between your accounts with 1 tap without having to enter credentials each time.'}
            </p>
          </div>

          {/* SECTION 1: ACTIVE CURRENT ACCOUNT */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
              {isAr ? 'الحساب النشط حالياً' : 'Active Account'}
            </span>

            <div className="rounded-2xl bg-[#121214] border border-[#26262E] p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={currentUser?.avatar || DEFAULT_AVATAR}
                    alt={currentUser?.username}
                    className="w-12 h-12 rounded-full object-cover border border-[#2A2A2E] block"
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                  <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center border-2 border-black">
                    <Check size={11} className="stroke-[3.5]" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">
                      {currentUser?.displayName || currentUser?.username}
                    </span>
                    {currentUser?.isVerified && <VerifiedBadge size={13} />}
                    {currentUser?.isFounder && (
                      <span className="text-[9px] font-mono font-bold bg-white text-black px-1.5 py-0.2 rounded">
                        FOUNDER
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400 font-mono block mt-0.5 truncate" dir="ltr">
                    @{currentUser?.username}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-medium border border-white/15">
                {isAr ? 'الحساب الحالي' : 'Current'}
              </div>
            </div>
          </div>

          {/* SECTION 2: OTHER SAVED ACCOUNTS */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
              {isAr ? 'الحسابات الأخرى على هذا الجهاز' : 'Other Accounts on Device'}
            </span>

            {otherAccounts.length > 0 ? (
              <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden shadow-sm">
                {otherAccounts.map((acc) => (
                  <div
                    key={acc.uid}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div 
                      onClick={() => handleSwitch(acc.uid, acc.username)}
                      className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer tap-press"
                    >
                      <img
                        src={acc.avatar || DEFAULT_AVATAR}
                        alt={acc.username}
                        className="w-11 h-11 rounded-full object-cover border border-[#2A2A2E] flex-shrink-0 block"
                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm font-semibold text-white truncate">
                            {acc.displayName || acc.username}
                          </span>
                          {acc.isVerified && <VerifiedBadge size={13} />}
                        </div>
                        <span className="text-xs text-neutral-400 font-mono block mt-0.5 truncate" dir="ltr">
                          @{acc.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSwitch(acc.uid, acc.username)}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-bold tap-press hover:bg-neutral-200 transition-colors shadow-sm"
                      >
                        {isAr ? 'تبديل' : 'Switch'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setAccountToRemove(acc)}
                        className="p-2 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-white/5 tap-press transition-colors"
                        title={isAr ? 'إزالة من الجهاز' : 'Remove account'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 text-center space-y-1">
                <p className="text-xs text-neutral-400">
                  {isAr 
                    ? 'لا توجد حسابات أخرى محفوظة حالياً على هذا الجهاز.' 
                    : 'No other accounts saved on this device yet.'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {isAr 
                    ? 'يمكنك إضافة حساب موجود أو إنشاء حساب إضافي في الأسفل.' 
                    : 'You can add an existing account or create a new one below.'}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 3: ADD AN ACCOUNT */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
              {isAr ? 'إضافة أو إنشاء حساب' : 'Add or Create Account'}
            </span>

            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setShowAuthModal(true);
              }}
              className="w-full p-4 rounded-2xl bg-[#121214] border border-[#222226] hover:bg-[#161619] active:bg-[#1A1A1E] tap-press transition-all flex items-center justify-between text-start shadow-sm"
            >
              <div className="flex items-center gap-3.5 text-white">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <Plus size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isAr ? 'إضافة حساب جديد' : 'Add Account'}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {isAr ? 'تسجيل الدخول إلى حساب آخر أو إنشاء حساب جديد' : 'Log into an existing account or create a new one'}
                  </div>
                </div>
              </div>
              <Chevron size={18} className="text-neutral-500 flex-shrink-0 ml-2" />
            </button>
          </div>

          {/* SECTION 4: LOG OUT ALL ACCOUNTS */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutAllConfirm(true)}
              className="w-full p-4 rounded-2xl bg-[#121214] border border-rose-500/20 hover:bg-rose-500/10 active:bg-rose-500/15 tap-press transition-colors flex items-center justify-between text-start"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <LogOut size={18} />
                <span className="text-xs font-bold">
                  {isAr ? 'تسجيل الخروج من كافة الحسابات' : 'Log out of all accounts'}
                </span>
              </div>
              <Chevron size={18} className="text-rose-400/60" />
            </button>
          </div>

        </div>

        {/* MODAL 1: Confirm Remove Single Account */}
        {accountToRemove && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#141416] border border-[#222226] p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <img
                  src={accountToRemove.avatar || DEFAULT_AVATAR}
                  alt={accountToRemove.username}
                  className="w-12 h-12 rounded-full object-cover border border-[#2A2A2E]"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'إزالة الحساب من الجهاز؟' : 'Remove account from device?'}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5" dir="ltr">
                    @{accountToRemove.username}
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'لن يتم حذف حسابك من المنصة، بل ستتم إزالته فقط من قائمة الحسابات المحفوظة على هذا الجهاز.' 
                  : 'Your account will not be deleted from PULSE, it will only be removed from this device.'}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAccountToRemove(null)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-bold tap-press hover:bg-white/15"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="flex-1 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold tap-press hover:bg-rose-500/30"
                >
                  {isAr ? 'إزالة' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Confirm Logout All Accounts */}
        {showLogoutAllConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#141416] border border-[#222226] p-5 space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
                <LogOut size={22} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'تسجيل الخروج من كافة الحسابات؟' : 'Log out of all accounts?'}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {isAr 
                    ? 'سيتم تسجيل الخروج من جميع الحسابات المحفوظة على هذا الجهاز وستحتاج لإدخال بيانات تسجيل الدخول للوصول إليها مجدداً.' 
                    : 'You will be logged out of all saved accounts on this device.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutAllConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-bold tap-press hover:bg-white/15"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogoutAll}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold tap-press hover:bg-rose-500"
                >
                  {isAr ? 'تسجيل الخروج' : 'Log Out'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Official Fullscreen Auth Page for Adding/Creating Account */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 bg-black animate-fade-in">
            <AuthPage
              isModal={true}
              onClose={() => setShowAuthModal(false)}
            />
          </div>
        )}

      </div>
    </SwipeBackWrapper>
  );
}
