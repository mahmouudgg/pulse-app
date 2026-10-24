import React, { useState, useEffect } from 'react';
import { 
  Lock, Shield, RefreshCw, Power, Scale, Copy, Check, 
  X, Send, ArrowRight, FileText, ChevronLeft, ChevronRight 
} from 'lucide-react';
import PulseLogo from './PulseLogo';
import { antiAbuseEngine } from '../services/antiAbuseEngine';
import { App as CapApp } from '@capacitor/app';
import { ref, set, get } from 'firebase/database';
import { database } from '../services/firebase';
import CommunityStandardsPage from '../pages/CommunityStandardsPage';

export default function DeviceBanScreen({ banInfo, onUnban }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const bannedUntil = Number(banInfo?.bannedUntil || Date.now() + 180 * 24 * 60 * 60 * 1000);
    const diff = Math.max(0, bannedUntil - Date.now());
    return {
      days: Math.floor(diff / (24 * 60 * 60 * 1000)),
      hours: Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
      minutes: Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)),
      seconds: Math.floor((diff % (60 * 1000)) / 1000),
      totalMs: diff
    };
  });

  const [isChecking, setIsChecking] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showStandardsModal, setShowStandardsModal] = useState(false);

  // Device Appeal Form State
  const [appealReason, setAppealReason] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealStatus, setAppealStatus] = useState(null); // null | 'submitted'

  const fp = banInfo?.fp || localStorage.getItem('pulse_device_fingerprint_v1') || 'DEV-SEC';
  const caseId = 'PL-DEV-' + fp.slice(-6).toUpperCase();
  const bannedUntilTs = Number(banInfo?.bannedUntil || Date.now() + 180 * 24 * 60 * 60 * 1000);
  const formattedEndDate = new Date(bannedUntilTs).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Check if appeal was previously submitted for this device
  useEffect(() => {
    try {
      const savedAppeal = localStorage.getItem(`pulse_device_appeal_${fp}`);
      if (savedAppeal) {
        setAppealStatus('submitted');
      }
    } catch {}
  }, [fp]);

  // Live real-time tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, bannedUntilTs - now);

      if (diff <= 0) {
        clearInterval(interval);
        antiAbuseEngine.clearLocalDeviceBan();
        if (onUnban) onUnban();
        window.location.reload();
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (24 * 60 * 60 * 1000)),
        hours: Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
        minutes: Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000)),
        seconds: Math.floor((diff % (60 * 1000)) / 1000),
        totalMs: diff
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [bannedUntilTs, onUnban]);

  // Real-time listener: if lifted remotely in Firebase Realtime Database
  useEffect(() => {
    if (!fp) return;

    const unsubscribe = antiAbuseEngine.subscribeToDeviceBan(fp, (liveStatus) => {
      if (!liveStatus.isBanned) {
        antiAbuseEngine.clearLocalDeviceBan();
        if (onUnban) onUnban();
        window.location.reload();
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fp, onUnban]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const status = await antiAbuseEngine.checkDeviceBan();
      if (!status.isBanned) {
        if (onUnban) onUnban();
        window.location.reload();
      }
    } catch (e) {
      console.warn('Manual check notice:', e);
    } finally {
      setTimeout(() => setIsChecking(false), 900);
    }
  };

  const handleCopyCaseId = () => {
    try {
      navigator.clipboard?.writeText(caseId);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {}
  };

  const handleExitApp = async () => {
    try {
      if (CapApp && typeof CapApp.exitApp === 'function') {
        await CapApp.exitApp();
      } else {
        window.close();
      }
    } catch {
      window.location.href = 'about:blank';
    }
  };

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (appealReason.trim().length < 15) return;

    setIsSubmittingAppeal(true);
    try {
      const appealPayload = {
        caseId,
        deviceFingerprint: fp,
        reason: appealReason.trim(),
        contactEmail: contactEmail.trim() || null,
        submittedAt: Date.now(),
        status: 'in_review',
        type: 'device_restriction_6m'
      };

      // 1. Save to Firebase RTDB
      try {
        await set(ref(database, `device_appeals/${fp}`), appealPayload);
      } catch (err) {
        console.warn('Firebase device appeal save:', err);
      }

      // 2. Save locally
      try {
        localStorage.setItem(`pulse_device_appeal_${fp}`, JSON.stringify(appealPayload));
      } catch {}

      setAppealStatus('submitted');
      setIsSubmittingAppeal(false);
      setShowAppealModal(false);
    } catch (err) {
      console.warn('Submit appeal failed:', err);
      setIsSubmittingAppeal(false);
    }
  };

  // If user opens Community Standards Modal
  if (showStandardsModal) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black text-white overflow-y-auto">
        <CommunityStandardsPage 
          onBack={() => setShowStandardsModal(false)}
          onOpenAppeal={() => {
            setShowStandardsModal(false);
            setShowAppealModal(true);
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black text-white flex flex-col justify-between items-center p-5 select-none overflow-y-auto font-sans"
      dir="rtl"
    >
      {/* Top Bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <PulseLogo size={24} />
          <span className="font-semibold text-xs tracking-wider text-neutral-300">PULSE</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
          <span>تقييد مؤقت للجهاز</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto my-auto py-6 flex flex-col items-center text-center">
        {/* Subtle Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#111114] border border-[#222228] flex items-center justify-center mb-5 text-neutral-200">
          <Lock size={26} strokeWidth={2} />
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2.5">
          تم تقييد وصول هذا الجهاز مؤقتاً
        </h1>

        {/* Description */}
        <p className="text-xs text-neutral-400 leading-relaxed mb-6 max-w-sm">
          حرصاً على أمان المنصة وحماية الحسابات، تم تعليق إمكانية تسجيل الدخول أو إنشاء حسابات جديدة عبر هذا الجهاز لمدة 6 أشهر لمخالفة سياسات الأمان وشروط الاستخدام.
        </p>

        {/* Countdown Box */}
        <div className="w-full bg-[#0B0B0E] border border-[#1C1C22] rounded-2xl p-4 mb-4">
          <div className="text-[11px] text-neutral-400 font-medium mb-3 flex items-center justify-between">
            <span>الوقت المتبقي لرفع التقييد:</span>
            <span className="text-[10px] text-neutral-500 font-mono">180 يوماً إجمالاً</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center" dir="ltr">
            <div className="bg-[#121216] border border-[#202026] rounded-xl py-2.5 px-1">
              <span className="text-lg sm:text-xl font-mono font-bold text-white block">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">يوم</span>
            </div>

            <div className="bg-[#121216] border border-[#202026] rounded-xl py-2.5 px-1">
              <span className="text-lg sm:text-xl font-mono font-bold text-white block">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">ساعة</span>
            </div>

            <div className="bg-[#121216] border border-[#202026] rounded-xl py-2.5 px-1">
              <span className="text-lg sm:text-xl font-mono font-bold text-white block">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">دقيقة</span>
            </div>

            <div className="bg-[#121216] border border-[#202026] rounded-xl py-2.5 px-1">
              <span className="text-lg sm:text-xl font-mono font-bold text-white block">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">ثانية</span>
            </div>
          </div>
        </div>

        {/* Decision Summary Card */}
        <div className="w-full bg-[#0B0B0E] border border-[#1C1C22] rounded-2xl p-4 text-xs text-right space-y-2.5 mb-5">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500">نوع الإجراء</span>
            <span className="text-neutral-200 font-medium">تقييد أجهزة مؤقت (Device Lock)</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500">مدة التقييد</span>
            <span className="text-neutral-200 font-medium">6 أشهر (180 يوماً)</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500">تاريخ الرفع التلقائي</span>
            <span className="text-neutral-200 font-medium">{formattedEndDate}</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-[#18181E]">
            <span className="text-neutral-500">السبب الإداري</span>
            <span className="text-neutral-300 font-medium text-left max-w-[200px] truncate">
              {banInfo?.reason || 'مخالفة معايير الأمان وتكرار محاولات تسجيل الدخول'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-neutral-500">رقم المرجع</span>
            <button
              type="button"
              onClick={handleCopyCaseId}
              className="flex items-center gap-1.5 text-neutral-300 font-mono text-[11px] hover:text-white tap-press"
            >
              <span>{caseId}</span>
              {copiedRef ? <Check size={12} className="text-white" /> : <Copy size={12} className="text-neutral-500" />}
            </button>
          </div>
        </div>

        {/* Appeal Status Banner (if appeal already submitted) */}
        {appealStatus === 'submitted' && (
          <div className="w-full p-3.5 mb-4 rounded-xl bg-[#111115] border border-[#22222A] text-right space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Scale size={14} className="text-neutral-400" />
              <span>طلب المراجعة قيد الفحص</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              تم تسجيل التماسك بنجاح لدى فريق مراجعة السياسات. سيتم فحص السجلات ورفع التقييد تلقائياً في حال ثبوت عدم وجود مخالفة.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          {/* Manual Recheck Button */}
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="w-full py-3 px-4 rounded-xl bg-[#141418] hover:bg-[#1E1E24] text-white border border-[#24242C] font-semibold text-xs flex items-center justify-center gap-2 tap-press transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            <span>{isChecking ? 'جارٍ التحقق من حالة الجهاز...' : 'إعادة التحقق من الحالة'}</span>
          </button>

          {/* Appeal / Review Button */}
          {appealStatus !== 'submitted' && (
            <button
              type="button"
              onClick={() => setShowAppealModal(true)}
              className="w-full py-3 px-4 rounded-xl bg-[#141418] hover:bg-[#1E1E24] text-neutral-300 hover:text-white border border-[#24242C] font-semibold text-xs flex items-center justify-center gap-2 tap-press transition-colors"
            >
              <Scale size={14} />
              <span>تقديم طلب مراجعة (الالتماس)</span>
            </button>
          )}

          {/* Community Standards Link */}
          <button
            type="button"
            onClick={() => setShowStandardsModal(true)}
            className="w-full py-2.5 px-4 text-neutral-400 hover:text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileText size={13} />
            <span>الاطلاع على إرشادات مجتمع PULSE وشروط الاستخدام</span>
          </button>

          {/* Exit App Button */}
          <button
            type="button"
            onClick={handleExitApp}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 tap-press transition-colors flex items-center justify-center gap-2 mt-1"
          >
            <Power size={14} />
            <span>إغلاق التطبيق والخروج</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center pt-2">
        <p className="text-[10px] text-neutral-600 font-mono">
          منصة PULSE • فريق النزاهة والأمان &copy; {new Date().getFullYear()}
        </p>
      </footer>

      {/* Modal: Device Restriction Appeal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0F0F12] border border-[#222228] rounded-t-3xl sm:rounded-3xl p-5 text-right space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C1C22]">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Scale size={16} />
                <span>تقديم طلب مراجعة لتقييد الجهاز</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAppealModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white tap-press"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              إذا كنت تعتقد أن تقييد هذا الجهاز تم عن طريق الخطأ، يرجى كتابة توضيح مختصر وسيقوم فريق المراجعة بفحص السجلات بدقة.
            </p>

            <form onSubmit={handleSubmitAppeal} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                  الرقم المرجعي للجهاز
                </label>
                <input
                  type="text"
                  readOnly
                  value={caseId}
                  className="w-full bg-[#16161B] border border-[#24242C] rounded-xl px-3 py-2 text-xs text-neutral-300 font-mono outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                  بريد إلكتروني للتواصل (اختياري)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#16161B] border border-[#24242C] focus:border-white/30 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-neutral-400">
                    سبب الالتماس والشرح
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {appealReason.length} / 500
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value.slice(0, 500))}
                  placeholder="اشرح سياق استخدامك للجهاز ولماذا تعتقد أن التقييد غير دقيق (15 حرفاً على الأقل)..."
                  className="w-full bg-[#16161B] border border-[#24242C] focus:border-white/30 rounded-xl p-3 text-xs text-white placeholder-neutral-500 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#16161B] hover:bg-[#202026] text-neutral-300 text-xs font-semibold tap-press"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAppeal || appealReason.trim().length < 15}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Send size={13} />
                  <span>{isSubmittingAppeal ? 'جارٍ الإرسال...' : 'إرسال الطلب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}