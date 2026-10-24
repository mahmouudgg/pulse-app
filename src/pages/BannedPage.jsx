import React, { useState, useEffect } from 'react';
import { 
  Lock, AlertCircle, LogOut, RefreshCw, Scale, FileText, 
  Copy, Check, ChevronLeft, ChevronRight, ArrowRight 
} from 'lucide-react';
import PulseLogo from '../components/PulseLogo';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import AccountAppealPage from './AccountAppealPage';
import CommunityStandardsPage from './CommunityStandardsPage';

export default function BannedPage({ user }) {
  const { logout } = useAuth();

  const [isChecking, setIsChecking] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showAppealView, setShowAppealView] = useState(false);
  const [showStandardsView, setShowStandardsView] = useState(false);

  // Case Reference Code
  const caseRef = 'PL-ACC-' + (user?.uid ? user.uid.slice(-6).toUpperCase() : '0091');
  const banReason = user?.banReason || 'مخالفة معايير مجتمع PULSE وشروط الاستخدام.';

  // Dates: Banned At & Banned Until (1 Year Suspension = 365 Days)
  const bannedAtTs = user?.bannedAt ? new Date(user.bannedAt).getTime() : Date.now();
  const bannedUntilTs = bannedAtTs + 365 * 24 * 60 * 60 * 1000;

  const formattedStartDate = new Date(bannedAtTs).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedEndDate = new Date(bannedUntilTs).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate days remaining in 1-year suspension
  const daysRemaining = Math.max(0, Math.ceil((bannedUntilTs - Date.now()) / (24 * 60 * 60 * 1000)));

  // Realtime subscription if ban is lifted in Firebase Realtime Database
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = storageService.subscribeToUser(user.uid, (live) => {
      if (live && !live.isBanned) {
        window.location.reload();
      }
    });

    const interval = setInterval(() => {
      const fresh = storageService.getUser(user.uid);
      if (fresh && !fresh.isBanned) {
        window.location.reload();
      }
    }, 2000);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(interval);
    };
  }, [user?.uid]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const fresh = await storageService.getUser(user?.uid);
      if (fresh && !fresh.isBanned) {
        window.location.reload();
      }
    } catch (e) {
      console.warn('Manual check notice:', e);
    } finally {
      setTimeout(() => setIsChecking(false), 900);
    }
  };

  const handleCopyRef = () => {
    try {
      navigator.clipboard?.writeText(caseRef);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {}
  };

  // If user opens Account Appeal Flow
  if (showAppealView) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black text-white overflow-y-auto">
        <AccountAppealPage 
          onBack={() => setShowAppealView(false)}
          onOpenCommunityStandards={() => {
            setShowAppealView(false);
            setShowStandardsView(true);
          }}
        />
      </div>
    );
  }

  // If user opens Community Standards Flow
  if (showStandardsView) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black text-white overflow-y-auto">
        <CommunityStandardsPage 
          onBack={() => setShowStandardsView(false)}
          onOpenAppeal={() => {
            setShowStandardsView(false);
            setShowAppealView(true);
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[99999] min-h-screen bg-black text-white flex flex-col justify-between items-center p-5 select-none overflow-y-auto font-sans"
      dir="rtl"
    >
      {/* Top Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <PulseLogo size={24} />
          <span className="font-semibold text-xs tracking-wider text-neutral-300">PULSE</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span>حساب معلق</span>
        </div>
      </header>

      {/* Main Content Box */}
      <main className="w-full max-w-md mx-auto my-auto py-6 flex flex-col items-center text-center">
        {/* Subtle Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#111114] border border-[#222228] flex items-center justify-center mb-5 text-neutral-200">
          <Lock size={26} strokeWidth={2} />
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2.5">
          تم تعليق هذا الحساب
        </h1>

        {/* Subtitle / User Notice */}
        <p className="text-xs text-neutral-400 leading-relaxed mb-6 max-w-sm">
          مرحباً <span className="text-white font-medium">{user?.displayName || 'المستخدم'}</span> (@{user?.username || 'user'}). تم تعليق حسابك لمدة عام واحد لمخالفة إرشادات مجتمع PULSE وشروط الخدمة. خلال فترة التعليق، لا يمكن نشر محتوى أو التفاعل مع المستخدمين.
        </p>

        {/* Duration Milestone Pill */}
        <div className="w-full bg-[#0B0B0E] border border-[#1C1C22] rounded-2xl p-4 mb-4 text-right">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">مدة التعليق:</span>
            <span className="text-xs font-mono font-bold text-white">عام كامل (365 يوماً)</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-[#18181E] flex items-center justify-between text-[11px] text-neutral-400">
            <span>الوقت المتبقي حتى إعادة التفعيل:</span>
            <span className="text-neutral-200 font-mono font-medium">متبقي {daysRemaining} يوماً</span>
          </div>
        </div>

        {/* Decision Summary Card */}
        <div className="w-full bg-[#0B0B0E] border border-[#1C1C22] rounded-2xl p-4 text-xs text-right space-y-2.5 mb-5">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500">نوع الإجراء</span>
            <span className="text-neutral-200 font-medium">تعليق حساب مؤقت (Suspension)</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500">تاريخ بدء السريان</span>
            <span className="text-neutral-200 font-medium">{formattedStartDate}</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500">تاريخ الرفع التلقائي</span>
            <span className="text-neutral-200 font-medium">{formattedEndDate}</span>
          </div>

          <div className="pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500 block mb-1">سبب التعليق</span>
            <span className="text-neutral-300 font-medium leading-relaxed block">{banReason}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-neutral-500">الرقم المرجعي</span>
            <button
              type="button"
              onClick={handleCopyRef}
              className="flex items-center gap-1.5 text-neutral-300 font-mono text-[11px] hover:text-white tap-press"
            >
              <span>{caseRef}</span>
              {copiedRef ? <Check size={12} className="text-white" /> : <Copy size={12} className="text-neutral-500" />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          {/* Submit Appeal Action (Primary) */}
          <button
            type="button"
            onClick={() => setShowAppealView(true)}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 tap-press transition-colors flex items-center justify-center gap-2"
          >
            <Scale size={14} />
            <span>تقديم طلب مراجعة (الالتماس)</span>
          </button>

          {/* Recheck Account Status */}
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="w-full py-3 px-4 rounded-xl bg-[#141418] hover:bg-[#1E1E24] text-white border border-[#24242C] font-semibold text-xs flex items-center justify-center gap-2 tap-press transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            <span>{isChecking ? 'جارٍ التحقق من حالة الحساب...' : 'إعادة التحقق من حالة الحساب'}</span>
          </button>

          {/* Review Community Standards */}
          <button
            type="button"
            onClick={() => setShowStandardsView(true)}
            className="w-full py-2.5 px-4 text-neutral-400 hover:text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileText size={13} />
            <span>الاطلاع على إرشادات مجتمع PULSE وشروط الاستخدام</span>
          </button>

          {/* Log Out / Switch Account */}
          <button
            type="button"
            onClick={logout}
            className="w-full py-3 px-4 rounded-xl bg-[#141418] hover:bg-[#1E1E24] text-neutral-300 hover:text-white border border-[#24242C] font-semibold text-xs tap-press transition-colors flex items-center justify-center gap-2 mt-1"
          >
            <LogOut size={14} />
            <span>تسجيل الخروج والتبديل لحساب آخر</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center pt-2">
        <p className="text-[10px] text-neutral-600 font-mono">
          منصة PULSE • فريق النزاهة والأمان &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}