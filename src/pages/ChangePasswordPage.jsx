import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  Eye, 
  EyeOff, 
  Lock, 
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { hapticsService } from '../services/hapticsService';
import { passwordAuditService } from '../services/passwordAuditService';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function ChangePasswordPage({ onBack }) {
  const { currentUser, changePassword } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic strength analysis
  const strength = useMemo(() => {
    return passwordAuditService.evaluateStrength(newPassword);
  }, [newPassword]);

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const getStrengthLabel = () => {
    if (!newPassword) return isAr ? 'أدخل كلمة المرور' : 'Enter password';
    switch (strength.score) {
      case 0:
      case 1:
        return isAr ? 'ضعيفة جداً' : 'Very Weak';
      case 2:
        return isAr ? 'متوسطة' : 'Fair';
      case 3:
        return isAr ? 'جيدة' : 'Good';
      case 4:
        return isAr ? 'قوية جداً ومحمية' : 'Strong & Secure';
      default:
        return '';
    }
  };

  const getStrengthBarColor = () => {
    if (!newPassword) return 'bg-neutral-800';
    switch (strength.score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-neutral-500';
      case 3:
        return 'bg-neutral-400';
      case 4:
        return 'bg-white';
      default:
        return 'bg-neutral-800';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword) {
      setErrorMsg(isAr ? 'يرجى إدخال كلمة المرور الحالية.' : 'Please enter your current password.');
      return;
    }

    if (strength.isWeak) {
      setErrorMsg(isAr ? 'كلمة المرور الجديدة لا تستوفي جميع معايير الأمان الموصى بها.' : 'New password does not meet security criteria.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try { hapticsService.medium?.(); } catch {}

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      passwordAuditService.resolveWeakPasswordAlert(currentUser?.uid);

      try { hapticsService.success?.(); } catch {}
      showToast(isAr ? 'تم تحديث كلمة المرور وتأمين حسابك بنجاح' : 'Password updated & account secured', 'success');

      if (onBack) {
        setTimeout(() => {
          onBack();
        }, 300);
      }
    } catch (err) {
      try { hapticsService.error?.(); } catch {}
      setErrorMsg(err.message || (isAr ? 'تعذر تغيير كلمة المرور' : 'Failed to update password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div 
        className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Sticky Sub-Header matching Accounts Center 1:1 */}
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-[#1C1C20] px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={21} strokeWidth={2.2} />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">
              {isAr ? 'تحديث كلمة المرور والأمان' : 'Change Password & Security'}
            </h1>
          </div>
        </div>

        <div className="p-4 space-y-4 animate-fade-in">
          {/* Header Security Card */}
          <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white flex-shrink-0">
                <ShieldCheck size={19} className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isAr ? 'معايير أمان كلمة المرور' : 'Password Security Standards'}
                </h2>
                <div className="text-[11px] text-neutral-400">
                  {isAr ? 'فحص دوري لحماية حسابك من الاختراق والوصول غير المصرح' : 'Periodic security checkup for your account'}
                </div>
              </div>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed pt-1 border-t border-[#1C1C20]">
              {isAr
                ? 'يجب أن تتكون كلمة المرور القوية من 8 خانات على الأقل وتجمع بين الأحرف الكبيرة والصغيرة والأرقام والرموز لضمان حماية بياناتك وفق معايير الأمان العالمية.'
                : 'A strong password must contain at least 8 characters, combining uppercase and lowercase letters, numbers, and symbols to ensure protection.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Card */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3.5">
              
              {/* Current Password */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-[#2A2A2E] rounded-xl ps-3.5 pe-10 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute end-3 top-2.5 text-neutral-500 hover:text-white"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-[#2A2A2E] rounded-xl ps-3.5 pe-10 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute end-3 top-2.5 text-neutral-500 hover:text-white"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400">{isAr ? 'قوة كلمة المرور:' : 'Strength:'}</span>
                      <span className="font-bold text-white">{getStrengthLabel()}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-all duration-300 ${
                            strength.score >= step ? getStrengthBarColor() : 'bg-neutral-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-[#2A2A2E] rounded-xl ps-3.5 pe-10 py-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-white transition-colors"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute end-3 top-2.5 text-neutral-500 hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {confirmPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    {passwordsMatch ? (
                      <span className="text-white flex items-center gap-1 font-medium">
                        <Check size={12} />
                        {isAr ? 'كلمتا المرور متطابقتان' : 'Passwords match'}
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle size={12} />
                        {isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Checklist Card */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-2.5">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                {isAr ? 'قائمة متطلبات الأمان' : 'Security Requirements'}
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    strength.rules.minLength ? 'bg-white text-black font-bold' : 'border border-neutral-600'
                  }`}>
                    {strength.rules.minLength && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className={strength.rules.minLength ? 'text-white' : 'text-neutral-400'}>
                    {isAr ? '8 خانات أو أكثر' : 'At least 8 characters'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    strength.rules.hasUpperLower ? 'bg-white text-black font-bold' : 'border border-neutral-600'
                  }`}>
                    {strength.rules.hasUpperLower && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className={strength.rules.hasUpperLower ? 'text-white' : 'text-neutral-400'}>
                    {isAr ? 'أحرف إنجليزية كبيرة وصغيرة (A-Z, a-z)' : 'Uppercase & lowercase letters'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    strength.rules.hasNumber ? 'bg-white text-black font-bold' : 'border border-neutral-600'
                  }`}>
                    {strength.rules.hasNumber && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className={strength.rules.hasNumber ? 'text-white' : 'text-neutral-400'}>
                    {isAr ? 'أرقام (0-9)' : 'Numbers (0-9)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    strength.rules.hasSymbol ? 'bg-white text-black font-bold' : 'border border-neutral-600'
                  }`}>
                    {strength.rules.hasSymbol && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className={strength.rules.hasSymbol ? 'text-white' : 'text-neutral-400'}>
                    {isAr ? 'رموز خاصة (!@#$%)' : 'Special symbols (!@#$%)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                    strength.rules.notCommon ? 'bg-white text-black font-bold' : 'border border-neutral-600'
                  }`}>
                    {strength.rules.notCommon && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className={strength.rules.notCommon ? 'text-white' : 'text-neutral-400'}>
                    {isAr ? 'ليست كلمة مرور شائعة أو متوقعة' : 'Not a common weak password'}
                  </span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !currentPassword || strength.isWeak || !passwordsMatch}
              className="w-full py-3 rounded-2xl bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
            >
              <KeyRound size={15} />
              <span>
                {isSubmitting 
                  ? (isAr ? 'جاري التحقق والحفظ...' : 'Saving...') 
                  : (isAr ? 'حفظ كلمة المرور الجديدة وتأمين الحساب' : 'Save New Password & Secure Account')}
              </span>
            </button>
          </form>
        </div>
      </div>
    </SwipeBackWrapper>
  );
}
