import os

new_code = '''import React, { useState } from 'react';
import { 
  ArrowRight, ArrowLeft, Check, Clock, FileText, Copy, 
  CheckCheck, ShieldCheck, Mic, Zap, Smartphone, ChevronRight, ChevronLeft,
  Bot, EyeOff, Pin, Sparkles, CheckCircle2
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

  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
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

  const currentPrice = billingCycle === 'annual' ? 400 : 50;

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
    requestVerification(docNotes.trim(), billingCycle);
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
        verificationStatus: nextStatus,
        proPlan: billingCycle
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
      icon: Bot,
      title: isAr ? 'محادثة خاصة بلا حدود مع سوفيثوس' : 'Sovythos AI Personal DM',
      desc: isAr ? 'دردشة خاصة مفتوحة 24/7 مع سوفيثوس بذكاء اصطناعي كامل، يسمعك ويحلل معك أفكارك.' : '24/7 unrestricted private DM chats with Sovythos AI.'
    },
    {
      icon: EyeOff,
      title: isAr ? 'تصفح نقي 100% بدون إعلانات' : '100% Ad-Free Experience',
      desc: isAr ? 'خلاصة التايم لاين نقية تماماً وخالية من أي نبضات ممولة أو إعلانات.' : 'Browse the entire feed completely ad-free.'
    },
    {
      icon: ShieldCheck,
      title: isAr ? 'شارة التوثيق الزرقاء الملكية' : 'Official Verified Badge',
      desc: isAr ? 'علامة التوثيق الزرقاء المعتمدة تظهر بجوار اسمك في كافة النبضات والردود والبحث.' : 'Blue verification badge displayed across your pulses and replies.'
    },
    {
      icon: Zap,
      title: isAr ? 'أولوية الظهور في الخوارزمية' : 'Algorithmic Priority',
      desc: isAr ? 'ظهور منشوراتك وردودك في صدارة التايم لاين والأكسبلور والمقترحات.' : 'Top placement across feeds and discussion threads.'
    },
    {
      icon: FileText,
      title: isAr ? 'مساحة نشر حتى 4,000 حرف' : '4,000 Character Pulses',
      desc: isAr ? 'نشر مقالات وتحليلات مطولة بدون التقيد بحد الـ 500 حرف الافتراضي.' : 'Publish long-form posts beyond default limits.'
    },
    {
      icon: Pin,
      title: isAr ? 'تثبيت حتى 3 نبضات في البروفايل' : '3 Pinned Pulses',
      desc: isAr ? 'إبراز أهم 3 منشورات وإنجازات في صدارة صفحتك الشخصية.' : 'Pin up to 3 pulses at the top of your profile.'
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
              {isAr ? 'عضوية Pulse Pro' : 'Pulse Pro Subscription'}
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
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-white truncate">
                    {currentUser?.displayName || currentUser?.username}
                  </span>
                  {isPro && <VerifiedBadge size={16} />}
                </div>
                <div className="text-xs text-zinc-400 font-mono truncate">
                  @{currentUser?.username}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isPro 
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
                      : isPending 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {isPro 
                      ? (isAr ? 'عضوية موثقة Pulse Pro' : 'Pulse Pro Member')
                      : isPending 
                      ? (isAr ? 'الطلب قيد المراجعة' : 'Pending Review')
                      : (isAr ? 'حساب مجاني' : 'Free Account')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isPro ? (
            /* ACTIVE PRO SUBSCRIBER VIEW */
            <div className="p-6 rounded-3xl bg-[#101012] border border-blue-500/20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <ShieldCheck size={26} />
              </div>
              <h2 className="text-base font-bold text-white">
                {isAr ? 'أنت مشترك في Pulse Pro' : 'You are subscribed to Pulse Pro'}
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {isAr 
                  ? 'حسابك يتمتع بكافة الميزات الحصرية: محادثة سوفيثوس الخاصة المفتوحة، التصفح الخالي من الإعلانات، وشارة التوثيق.'
                  : 'You have full access to Sovythos AI private chat, ad-free feed, and the verified blue badge.'}
              </p>
            </div>
          ) : isPending ? (
            /* PENDING APPLICATION VIEW */
            <div className="p-6 rounded-3xl bg-[#101012] border border-amber-500/20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <Clock size={24} />
              </div>
              <h2 className="text-base font-bold text-white">
                {isAr ? 'طلب الاشتراك قيد المراجعة' : 'Subscription Request Pending'}
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {isAr 
                  ? 'تم استلام بيانات المعاملة، ويجري مراجعة التحويل وتفعيل العضوية لحسابك خلال وقت قصير.'
                  : 'Your payment reference is being verified. Membership will be activated shortly.'}
              </p>
            </div>
          ) : (
            /* NOT SUBSCRIBED: SELECT PLAN & APPLY */
            <div className="space-y-5">
              {/* Billing Cycle Selector */}
              <div className="p-1 rounded-2xl bg-[#141416] border border-zinc-800 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    try { hapticsService.light?.(); } catch {}
                    setBillingCycle('monthly');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all tap-press ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'اشتراك شهري (50 ج.م)' : 'Monthly (50 EGP)'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try { hapticsService.light?.(); } catch {}
                    setBillingCycle('annual');
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all tap-press relative ${
                    billingCycle === 'annual'
                      ? 'bg-white text-black shadow-md'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isAr ? 'اشتراك سنوي (400 ج.م)' : 'Annual (400 EGP)'}
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      billingCycle === 'annual' ? 'bg-blue-600 text-white' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {isAr ? 'وفر 33%' : 'Save 33%'}
                    </span>
                  </span>
                </button>
              </div>

              {/* Selected Plan Details Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-b from-[#141418] to-[#0A0A0C] border border-white/10 text-center">
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  {currentPrice} {isAr ? 'ج.م' : 'EGP'}
                  <span className="text-xs font-normal text-zinc-400 font-sans ms-1.5">
                    / {billingCycle === 'annual' ? (isAr ? 'سنوياً (شهرين مجاناً)' : 'year') : (isAr ? 'شهرياً' : 'month')}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {billingCycle === 'annual'
                    ? (isAr ? 'بمعدل 33 ج.م فقط شهرياً مع كافة ميزات Pro المتقدمة والدعم ذو الأولوية.' : 'Equivalent to 33 EGP/month with all Pro perks.')
                    : (isAr ? 'تجديد شهري مرن، يمكنك الإلغاء أو الترقية للسنوي في أي وقت.' : 'Flexible monthly renewal. Cancel or upgrade anytime.')}
                </p>
              </div>

              {/* Perks List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
                  {isAr ? 'مميزات عضوية Pulse Pro' : 'Pulse Pro Features'}
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
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-white">
                      {isAr ? 'طرق الدفع (Vodafone Cash / InstaPay):' : 'Payment methods (Vodafone Cash / InstaPay):'}
                    </div>
                    <div className="text-xs font-mono font-bold text-blue-400">
                      {currentPrice} {isAr ? 'ج.م' : 'EGP'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-zinc-400">
                        {isAr ? 'رقم التحويل الرسمي (فودافون كاش أو إنستاباي)' : 'Official Payment Number'}
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
                      placeholder={isAr ? 'مثال: تم التحويل من محفظة 010xxxxxxx' : 'e.g. Sent from 010xxxxxxx'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors shadow-lg"
                >
                  {isAr 
                    ? `تأكيد الاشتراك ${billingCycle === 'annual' ? 'السنوي' : 'الشهري'} (${currentPrice} ج.م)`
                    : `Confirm ${billingCycle === 'annual' ? 'Annual' : 'Monthly'} Subscription (${currentPrice} EGP)`}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </SwipeBackWrapper>
  );
}
'''

path = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\VerificationPage.jsx'
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_code)
print('SUCCESS: Updated VerificationPage.jsx with monthly/annual plans and 6 perks')
