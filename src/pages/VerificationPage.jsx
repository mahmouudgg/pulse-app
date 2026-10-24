import React, { useState } from 'react';
import { 
  ArrowRight, ArrowLeft, Check, Clock, FileText, Copy, 
  CheckCheck, ShieldCheck, Mic, Zap, Smartphone, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import VerifiedBadge from '../components/VerifiedBadge';

export default function VerificationPage({ onBack, onOpenCompose }) {
  const { currentUser, requestVerification, updateProfile } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();

  const [docNotes, setDocNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const VERIFICATION_PHONE = '01100627772';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const isPro = Boolean(
    currentUser?.isVerified || 
    currentUser?.isFounder || 
    currentUser?.isPro || 
    currentUser?.verificationStatus === 'verified'
  );
  const isPending = (currentUser?.verificationStatus === 'pending' || submitted) && !isPro;
  const isDeveloper = currentUser?.username === 'my' || currentUser?.isFounder;

  const handleApply = (e) => {
    e.preventDefault();
    if (!docNotes.trim()) {
      showToast(
        isAr ? 'يرجى إدخال رقم المعاملة أو المحفظة' : 'Please enter payment reference',
        'error'
      );
      return;
    }
    try { hapticsService.medium?.(); } catch {}
    requestVerification(docNotes.trim());
    setSubmitted(true);
    showToast(
      isAr ? 'تم استلام بيانات التحويل ورقم المعاملة بنجاح' : 'Payment reference submitted successfully',
      'success'
    );
  };

  const handleCopyPhone = () => {
    try { hapticsService.light?.(); } catch {}
    navigator.clipboard?.writeText(VERIFICATION_PHONE);
    setCopiedNumber(true);
    showToast(isAr ? 'تم نسخ الرقم إلى الحافظة' : 'Number copied to clipboard', 'success');
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  // Immediate Developer / Founder Toggle for Testing
  const handleDevTogglePro = () => {
    if (!isDeveloper) return;
    try { hapticsService.success?.(); } catch {}
    const nextStatus = isPro ? 'none' : 'verified';
    if (updateProfile) {
      updateProfile({
        isVerified: !isPro,
        isPro: !isPro,
        verificationStatus: nextStatus
      });
    }
    showToast(
      isAr 
        ? (!isPro ? 'تم تفعيل عضوية Pulse Pro فورياً' : 'تم إلغاء التفعيل للاختبار') 
        : (!isPro ? 'Pulse Pro activated instantly' : 'Deactivated for test'),
      'success'
    );
  };

  const PRO_PERKS = [
    {
      icon: ShieldCheck,
      title: isAr ? 'شارة التوثيق الرسمية' : 'Official Verified Badge',
      desc: isAr ? 'علامة التوثيق الزرقاء المعتمدة تظهر بجوار اسمك في المنشورات والردود والبحث.' : 'Blue verification badge displayed across your pulses and replies.'
    },
    {
      icon: FileText,
      title: isAr ? 'مساحة نشر حتى 4,000 حرف' : '4,000 Character Pulses',
      desc: isAr ? 'نشر مقالات وتحليلات مطولة بدون قيود حد الـ 500 حرف الافتراضي.' : 'Publish long-form posts beyond the default 500-character limit.'
    },
    {
      icon: Zap,
      title: isAr ? 'أولوية الظهور في الخوارزمية' : 'Algorithmic Priority',
      desc: isAr ? 'ظهور منشوراتك وردودك في صدارة الصفحة الرئيسية وشجرة النقاشات.' : 'Top placement across feeds and discussion threads.'
    },
    {
      icon: Mic,
      title: isAr ? 'تسجيلات صوتية بنقاء استوديو' : 'Studio Voice Notes',
      desc: isAr ? 'تسجيلات صوتية بدقة فائقة ومدة تصل إلى دقيقتين كاملتين.' : 'Studio-grade voice pulses up to 2 full minutes.'
    }
  ];

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div 
        className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none font-sans"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Header */}
        <div className="sticky top-0 z-30 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between border-b border-zinc-900/60">
          <div className="flex items-center gap-3">
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
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? 'إدارة الاشتراك' : 'Subscription'}
            </h1>
          </div>

          {/* Dev Quick Test Switch */}
          {isDeveloper && (
            <button
              type="button"
              onClick={handleDevTogglePro}
              className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 tap-press"
              title="Dev Mode: Toggle Pro Status"
            >
              {isPro ? 'DEV: REVOKE' : 'DEV: ACTIVATE'}
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* User Membership Status Card */}
          <div className="p-5 rounded-3xl bg-[#101012] border border-[#222226]">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 flex-shrink-0">
                <img
                  src={currentUser?.avatar || DEFAULT_AVATAR}
                  alt={currentUser?.displayName}
                  className="w-14 h-14 rounded-full object-cover border border-white/20 bg-zinc-900"
                />
                {isPro && (
                  <div className="absolute -bottom-1 -end-1">
                    <VerifiedBadge size={18} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-bold text-white truncate">
                    {currentUser?.displayName || currentUser?.username}
                  </h2>
                </div>
                <div className="text-xs text-zinc-400 font-mono" dir="ltr">
                  @{currentUser?.username}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {isPro ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-black text-xs font-bold font-mono">
                      <Check size={12} className="stroke-[3]" />
                      <span>PULSE PRO</span>
                    </span>
                  ) : isPending ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium font-mono">
                      <Clock size={12} />
                      <span>{isAr ? 'قيد المراجعة' : 'PENDING'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 text-xs font-medium">
                      {isAr ? 'عضوية أساسية' : 'Basic Member'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE PRO VIEW */}
          {isPro ? (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-[#0D0D10] border border-zinc-800 text-center">
                <p className="text-sm font-semibold text-white mb-1">
                  {isAr ? 'عضويتك معتمدة ونشطة مدى الحياة' : 'Your membership is active for life'}
                </p>
                <p className="text-xs text-zinc-400">
                  {isAr 
                    ? 'جميع المميزات الحصرية مفعلة لحسابك دون أي مدفوعات متكررة.' 
                    : 'All privileges are unlocked without recurring charges.'}
                </p>
              </div>

              {/* Active Perks List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
                  {isAr ? 'المميزات المفعلة' : 'Active Privileges'}
                </div>
                {PRO_PERKS.map((perk, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#101012] border border-[#222226] flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <perk.icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <span>{perk.title}</span>
                        <Check size={14} className="text-white stroke-[2.5]" />
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                        {perk.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {onOpenCompose && (
                <button
                  type="button"
                  onClick={() => {
                    try { hapticsService.light?.(); } catch {}
                    onBack();
                    onOpenCompose();
                  }}
                  className="w-full py-3.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors shadow-lg flex items-center justify-center gap-2 mt-4"
                >
                  <FileText size={16} />
                  <span>{isAr ? 'نشر نبضة مطولة جديدة' : 'Write a Long-form Pulse'}</span>
                </button>
              )}
            </div>
          ) : isPending ? (
            /* PENDING REVIEW VIEW */
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-[#101012] border border-[#222226] text-center">
                <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-3">
                  <Clock size={24} />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {isAr ? 'طلب التوثيق قيد المراجعة' : 'Verification Under Review'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto mb-4">
                  {isAr
                    ? 'تم استلام بيانات التحويل ورقم المعاملة بنجاح، وسيتم اعتماد الشارة وتفعيل حسابك في أقرب وقت.'
                    : 'Payment details received. Your badge and features will be unlocked shortly.'}
                </p>
                <div className="inline-block px-3 py-1 rounded-full bg-black border border-zinc-800 text-xs text-zinc-400 font-mono">
                  REF-{Date.now().toString().slice(-6)}
                </div>
              </div>
            </div>
          ) : (
            /* NOT SUBSCRIBED VIEW: MINIMAL & ELEGANT */
            <div className="space-y-5">
              {/* Value Proposition */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-[#141418] to-[#0A0A0C] border border-white/10 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black text-xs font-bold mb-3">
                  <ShieldCheck size={13} />
                  <span>{isAr ? 'عضوية معتمدة مدى الحياة: 50 ج.م' : 'Lifetime Access: 50 EGP'}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                  {isAr
                    ? 'احصل على شارة التوثيق الزرقاء، مساحة نشر 4000 حرف، وأولوية الخوارزمية لمرة واحدة فقط بدون أي اشتراك شهري.'
                    : 'Get the blue badge, 4,000 char capacity, and priority feed placement for a single one-time payment.'}
                </p>
              </div>

              {/* Perks List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
                  {isAr ? 'مميزات العضوية' : 'Membership Features'}
                </div>
                {PRO_PERKS.map((perk, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#101012] border border-[#222226] flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <perk.icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">
                        {perk.title}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                        {perk.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Box */}
              <form onSubmit={handleApply} className="space-y-3 pt-2">
                <div className="p-4 rounded-3xl bg-[#101012] border border-[#222226] space-y-3">
                  <div className="text-xs font-semibold text-white">
                    {isAr ? 'طرق التحويل (Vodafone Cash / InstaPay):' : 'Payment methods (Vodafone Cash / InstaPay):'}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-400">
                        {isAr ? 'رقم التحويل (فودافون كاش أو إنستاباي)' : 'Payment Number'}
                      </div>
                      <div className="text-base font-mono font-bold text-white tracking-wider mt-0.5" dir="ltr">
                        {VERIFICATION_PHONE}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-1.5 tap-press transition-colors"
                    >
                      {copiedNumber ? <CheckCheck size={14} /> : <Copy size={14} />}
                      <span>{copiedNumber ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      {isAr ? 'رقم المحفظة أو رقم العملية المرجعي بعد التحويل:' : 'Your wallet number or transaction reference:'}
                    </label>
                    <input
                      type="text"
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      placeholder={isAr ? 'مثال: تم التحويل من رقم 010xxxxxxx' : 'e.g. Sent from 010xxxxxxx'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors shadow-lg"
                >
                  {isAr ? 'تأكيد الاشتراك وإرسال البيانات' : 'Confirm Subscription'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </SwipeBackWrapper>
  );
}