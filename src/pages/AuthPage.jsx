import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PulseLogo from '../components/PulseLogo';
import { storageService } from '../services/storageService';
import { generateUniqueUsername } from '../utils/usernameGenerator';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Globe, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  X,
  Mail,
  Phone,
  Users,
  UserPlus,
  Loader2,
  Calendar,
  ChevronDown
} from 'lucide-react';
import TermsOfServicePage from './TermsOfServicePage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { hapticsService } from '../services/hapticsService';
import { passwordResetService } from '../services/passwordResetService';

const COUNTRY_CODES = [
  { code: '+20', country: 'مصر (Egypt)' },
  { code: '+966', country: 'السعودية (KSA)' },
  { code: '+971', country: 'الإمارات (UAE)' },
  { code: '+965', country: 'الكويت (Kuwait)' },
  { code: '+974', country: 'قطر (Qatar)' },
  { code: '+968', country: 'عمان (Oman)' },
  { code: '+973', country: 'البحرين (Bahrain)' },
  { code: '+962', country: 'الأردن (Jordan)' },
  { code: '+964', country: 'العراق (Iraq)' },
  { code: '+212', country: 'المغرب (Morocco)' },
  { code: '+213', country: 'الجزائر (Algeria)' },
  { code: '+216', country: 'تونس (Tunisia)' },
  { code: '+1', country: 'US / Canada' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+90', country: 'Turkey' }
];

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AuthPage({ isModal = false, onClose = null, onContinueAsGuest = null }) {
  const { 
    login, 
    register, 
    verify2FALogin, 
    signInWithGoogle, 
    validateBirthDate,
    savedAccounts = [],
    switchAccount,
    removeSavedAccount
  } = useAuth();
  
  const { lang, setLang } = useLanguage();
  const isAr = lang === 'ar';

  const [view, setView] = useState(() => (savedAccounts && savedAccounts.length > 0 && !isModal) ? 'saved_accounts' : 'form');
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot_password'
  const [authSubScreen, setAuthSubScreen] = useState(null); // null | 'terms' | 'privacy'

  // Sequential Wizard Step for Registration (1: Credentials & Terms, 2: Display Name, 3: Birthdate)
  const [step, setStep] = useState(1);
  const [regMethod, setRegMethod] = useState('email'); // 'email' | 'phone'

  // Credentials State
  const [identifier, setIdentifier] = useState(''); // email, username, or phone for login
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Profile Onboarding State
  const [displayName, setDisplayName] = useState('');
  const [generatedUsername, setGeneratedUsername] = useState('');
  const [generatingUsername, setGeneratingUsername] = useState(false);

  // Birthdate State
  const [birthYear, setBirthYear] = useState('2000');
  const [birthMonth, setBirthMonth] = useState('1');
  const [birthDay, setBirthDay] = useState('1');

  // Real-time Availability & Validation State
  const [emailAvailability, setEmailAvailability] = useState({ checking: false, available: null, message: '' });
  const [phoneAvailability, setPhoneAvailability] = useState({ checking: false, available: null, message: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // 2FA Challenge State
  const [pending2FAUser, setPending2FAUser] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // Password Recovery State
  const [resetStep, setResetStep] = useState(1);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetUid, setResetUid] = useState(null);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPreviewNotice, setResetPreviewNotice] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Google Onboarding State (for missing birth date)
  const [googleOnboarding, setGoogleOnboarding] = useState(null);

  // Debounced Email Uniqueness Check
  useEffect(() => {
    if (mode !== 'register' || regMethod !== 'email' || !email || !email.includes('@') || email.trim().length < 5) {
      setEmailAvailability({ checking: false, available: null, message: '' });
      return;
    }
    const timer = setTimeout(async () => {
      setEmailAvailability({ checking: true, available: null, message: '' });
      try {
        const free = await storageService.checkEmailAvailable(email.trim());
        if (free) {
          setEmailAvailability({ checking: false, available: true, message: isAr ? 'البريد متاح للاستخدام' : 'Email available' });
        } else {
          setEmailAvailability({
            checking: false,
            available: false,
            message: isAr ? 'هذا البريد مسجل بالفعل في PULSE' : 'Email is already registered'
          });
        }
      } catch {
        setEmailAvailability({ checking: false, available: null, message: '' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [email, mode, regMethod, isAr]);

  // Debounced Phone Uniqueness Check
  useEffect(() => {
    if (mode !== 'register' || regMethod !== 'phone' || !phone || phone.trim().length < 6) {
      setPhoneAvailability({ checking: false, available: null, message: '' });
      return;
    }
    const timer = setTimeout(async () => {
      setPhoneAvailability({ checking: true, available: null, message: '' });
      try {
        const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
        const fullPhone = cleanPhone.startsWith('+') ? cleanPhone : `${countryCode}${cleanPhone.replace(/^0+/, '')}`;
        const free = await storageService.checkPhoneAvailable(fullPhone);
        if (free) {
          setPhoneAvailability({ checking: false, available: true, message: isAr ? 'رقم الهاتف متاح للاستخدام' : 'Phone available' });
        } else {
          setPhoneAvailability({
            checking: false,
            available: false,
            message: isAr ? 'رقم الهاتف مسجل بالفعل بحساب آخر' : 'Phone is already registered'
          });
        }
      } catch {
        setPhoneAvailability({ checking: false, available: null, message: '' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [phone, countryCode, mode, regMethod, isAr]);

  // Automatic Username Engine based on Display Name
  useEffect(() => {
    if (!displayName || displayName.trim().length < 2) {
      setGeneratedUsername('');
      return;
    }
    setGeneratingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const uniqueHandle = await generateUniqueUsername(displayName.trim());
        setGeneratedUsername(uniqueHandle);
      } catch (err) {
        console.warn('Username generation notice:', err);
      } finally {
        setGeneratingUsername(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [displayName]);

  // Computed birthDate string (YYYY-MM-DD)
  const formattedBirthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  const computedAge = new Date().getFullYear() - parseInt(birthYear, 10);

  // Switch Modes Helper
  const handleSwitchMode = (newMode) => {
    setError('');
    setMode(newMode);
    setStep(1);
    hapticsService.light?.();
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      hapticsService.light?.();
      const result = await signInWithGoogle();
      if (result?.needsBirthDate) {
        setGoogleOnboarding({
          cachedUser: result.cachedUser,
          googleProfile: result.googleProfile,
          customUsername: result.googleProfile.suggestedUsername,
          customBirthDate: '2000-01-01',
          birthDateError: ''
        });
        hapticsService.medium?.();
      } else {
        hapticsService.success?.();
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.message || (isAr ? 'فشل تسجيل الدخول بحساب Google.' : 'Google sign-in failed.'));
      hapticsService.error?.();
    } finally {
      setGoogleLoading(false);
    }
  };

  // Complete Google Onboarding
  const handleCompleteGoogleOnboarding = async (e) => {
    e.preventDefault();
    if (!googleOnboarding) return;
    setError('');
    setGoogleLoading(true);
    try {
      hapticsService.medium?.();
      await signInWithGoogle({
        customBirthDate: googleOnboarding.customBirthDate,
        customUsername: googleOnboarding.customUsername,
        cachedUser: googleOnboarding.cachedUser
      });
      setGoogleOnboarding(null);
      hapticsService.success?.();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || (isAr ? 'فشل إكمال إنشاء الحساب.' : 'Failed to complete registration.'));
      hapticsService.error?.();
    } finally {
      setGoogleLoading(false);
    }
  };

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToStep2 = () => {
    setError('');
    if (regMethod === 'email') {
      if (!email.trim() || !email.includes('@')) {
        setError(isAr ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address');
        hapticsService.error?.();
        return;
      }
      if (emailAvailability.available === false) {
        setError(emailAvailability.message);
        hapticsService.error?.();
        return;
      }
    } else {
      if (!phone.trim() || phone.trim().length < 6) {
        setError(isAr ? 'يرجى إدخال رقم هاتف صحيح' : 'Please enter a valid phone number');
        hapticsService.error?.();
        return;
      }
      if (phoneAvailability.available === false) {
        setError(phoneAvailability.message);
        hapticsService.error?.();
        return;
      }
    }

    if (!password || password.length < 8) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 8 خانات على الأقل وبها أرقام وحروف' : 'Password must be at least 8 characters with numbers and letters');
      hapticsService.error?.();
      return;
    }

    if (password !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      hapticsService.error?.();
      return;
    }

    if (!agreedToTerms) {
      setError(isAr ? 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة' : 'You must agree to the Terms and Privacy Policy');
      hapticsService.error?.();
      return;
    }

    hapticsService.medium?.();
    setStep(2);
  };

  // Step 2 Validation & Proceed to Step 3
  const handleProceedToStep3 = () => {
    setError('');
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError(isAr ? 'يرجى كتابة الاسم الذي تحب أن نناديك به (حرفين على الأقل)' : 'Please enter your display name (at least 2 characters)');
      hapticsService.error?.();
      return;
    }
    hapticsService.medium?.();
    setStep(3);
  };

  // Step 3: Final Submission & Account Creation
  const handleFinalRegister = async () => {
    setError('');
    const birthCheck = validateBirthDate(formattedBirthDate);
    if (!birthCheck.valid) {
      setError(birthCheck.message);
      hapticsService.error?.();
      return;
    }

    setLoading(true);
    hapticsService.medium?.();

    try {
      const finalUsername = generatedUsername || await generateUniqueUsername(displayName.trim());
      await register({
        email: regMethod === 'email' ? email.trim() : '',
        phone: regMethod === 'phone' ? phone.trim() : '',
        countryCode: countryCode,
        username: finalUsername,
        displayName: displayName.trim(),
        password: password,
        birthDate: formattedBirthDate,
        birthDatePrivacy: 'public'
      });

      hapticsService.success?.();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || (isAr ? 'تعذر إتمام إنشاء الحساب، يرجى المحاولة مرة أخرى.' : 'Failed to create account. Please try again.'));
      hapticsService.error?.();
    } finally {
      setLoading(false);
    }
  };

  // Standard Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف أو اسم المستخدم' : 'Please enter your email, phone or username');
      return;
    }
    if (!password) {
      setError(isAr ? 'يرجى إدخال كلمة المرور' : 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      hapticsService.light?.();
      const res = await login(identifier.trim(), password);
      if (res && res.requires2FA) {
        setPending2FAUser(res.tempUser);
        setLoading(false);
        return;
      }
      hapticsService.success?.();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || (isAr ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.'));
      hapticsService.error?.();
    } finally {
      setLoading(false);
    }
  };

  // 2FA Verification Submit
  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || !pending2FAUser) return;
    setError('');
    setLoading(true);
    try {
      await verify2FALogin(pending2FAUser, twoFactorCode);
      hapticsService.success?.();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || (isAr ? 'رمز التحقق غير صحيح.' : 'Invalid verification code.'));
      hapticsService.error?.();
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Handlers
  const handleRequestResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setResetPreviewNotice('');
    setLoading(true);
    try {
      hapticsService.light?.();
      const res = await passwordResetService.requestReset(resetIdentifier.trim());
      if (res.success) {
        setResetUid(res.uid);
        setResetStep(2);
        setResetPreviewNotice(
          isAr
            ? `تم إرسال رمز التحقق إلى ${res.maskedEmail}. (كود التحقق: ${res.code})`
            : `Verification code sent to ${res.maskedEmail}. (Code: ${res.code})`
        );
        hapticsService.success?.();
      } else {
        setError(res.message);
        hapticsService.error?.();
      }
    } catch {
      setError(isAr ? 'حدث خطأ أثناء طلب استعادة كلمة المرور.' : 'Error requesting password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e) => {
    e.preventDefault();
    setError('');
    if (resetNewPassword !== resetConfirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      hapticsService.medium?.();
      const res = await passwordResetService.completeReset(resetUid, resetOtpCode.trim(), resetNewPassword);
      if (res.success) {
        hapticsService.success?.();
        setResetSuccessMessage(
          isAr
            ? 'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
            : 'Password updated successfully. You can now log in.'
        );
        setMode('login');
        setResetStep(1);
      } else {
        setError(res.message);
        hapticsService.error?.();
      }
    } catch {
      setError(isAr ? 'فشل تعيين كلمة المرور الجديدة.' : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // Sub-screens for Terms & Privacy
  if (authSubScreen === 'terms') {
    return <TermsOfServicePage onBack={() => setAuthSubScreen(null)} />;
  }
  if (authSubScreen === 'privacy') {
    return <PrivacyPolicyPage onBack={() => setAuthSubScreen(null)} />;
  }

  // Google Onboarding Modal (missing birth date)
  if (googleOnboarding) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 select-none" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-sm bg-[#0c0c0e] border border-[#222226] rounded-3xl p-6 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-3">
              <Calendar size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isAr ? 'تأكيد تاريخ الميلاد' : 'Confirm Birth Date'}
            </h2>
            <p className="text-xs text-[#a1a1aa] text-center mt-1">
              {isAr ? 'مرحبا بك عبر Google. لإكمال تسجيلك يرجى تحديد تاريخ ميلادك.' : 'Welcome via Google. Please specify your birth date to continue.'}
            </p>
          </div>

          <form onSubmit={handleCompleteGoogleOnboarding} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#71717a] mb-1.5">
                {isAr ? 'تاريخ الميلاد' : 'Birth Date'}
              </label>
              <input
                type="date"
                required
                value={googleOnboarding.customBirthDate}
                onChange={(e) => setGoogleOnboarding({ ...googleOnboarding, customBirthDate: e.target.value })}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={googleLoading}
              className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              {googleLoading ? <Loader2 size={16} className="animate-spin" /> : (isAr ? 'إكمال والدخول إلى PULSE' : 'Complete and Enter')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2FA Security Challenge Screen
  if (pending2FAUser) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 select-none" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-sm bg-[#0c0c0e] border border-[#222226] rounded-3xl p-6 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mb-3">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isAr ? 'التحقق بخطوتين (2FA)' : 'Two-Factor Authentication'}
            </h2>
            <p className="text-xs text-[#a1a1aa] text-center mt-1">
              {isAr ? 'أدخل الرمز المكون من 6 أرقام من تطبيق Authenticator' : 'Enter the 6-digit verification code from your authenticator app'}
            </p>
          </div>

          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div>
              <input
                type="text"
                autoFocus
                maxLength={8}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.trim())}
                placeholder="123456"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !twoFactorCode}
              className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : (isAr ? 'تأكيد الدخول' : 'Verify & Continue')}
            </button>

            <button
              type="button"
              onClick={() => { setPending2FAUser(null); setError(''); }}
              className="w-full py-2.5 text-xs text-[#71717a] hover:text-white transition-colors"
            >
              {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Saved Accounts View
  if (view === 'saved_accounts' && savedAccounts.length > 0 && !isModal) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 select-none" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-sm bg-[#0c0c0e] border border-[#222226] rounded-3xl p-6 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3">
              <PulseLogo size={42} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isAr ? 'الحسابات المسجلة' : 'Saved Accounts'}
            </h2>
            <p className="text-xs text-[#a1a1aa] mt-1">
              {isAr ? 'اختر حساباً للمتابعة فوراً' : 'Select an account to continue'}
            </p>
          </div>

          <div className="space-y-2 mb-5">
            {savedAccounts.map((acc) => (
              <div
                key={acc.uid}
                onClick={() => { switchAccount(acc.uid); if (onClose) onClose(); }}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#141416] hover:bg-[#1c1c1f] border border-[#222226] cursor-pointer tap-press transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={acc.avatar || DEFAULT_AVATAR}
                    alt={acc.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-[#27272a]"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-tight">{acc.displayName}</h3>
                    <p className="text-xs text-[#71717a] font-mono leading-tight">@{acc.username}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSavedAccount(acc.uid);
                  }}
                  className="p-1.5 rounded-lg text-[#52525b] hover:text-red-400 hover:bg-red-950/20 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setView('form')}
            className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            <span>{isAr ? 'تسجيل الدخول بحساب آخر' : 'Use Another Account'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Main Auth Flow: Login | Register Sequential Wizard | Forgot Password
  return (
    <div className={`${isModal ? '' : 'min-h-screen'} bg-black text-white flex flex-col items-center justify-center p-4 select-none`} dir={isAr ? 'rtl' : 'ltr'}>
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      )}

      <div className="w-full max-w-sm bg-[#0c0c0e] border border-[#222226] rounded-3xl p-6 sm:p-7 shadow-2xl relative">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="mb-2">
            <PulseLogo size={42} />
          </div>
          <span className="text-xs font-mono tracking-widest text-[#71717a] uppercase">PULSE</span>
        </div>

        {/* ===================== MODE: LOGIN ===================== */}
        {mode === 'login' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isAr ? 'تسجيل الدخول' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-[#a1a1aa] mt-1">
                {isAr ? 'سجل دخولك لمتابعة النبضات والتفاعل' : 'Sign in to your account'}
              </p>
            </div>

            {resetSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
                <Check size={15} className="flex-shrink-0" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#71717a] mb-1">
                  {isAr ? 'البريد أو الهاتف أو اسم المستخدم' : 'Email, Phone or Username'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={isAr ? 'name@example.com أو @username' : 'name@example.com or @username'}
                    className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#71717a]">
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('forgot_password')}
                    className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot?'}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-[#71717a] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (isAr ? 'تسجيل الدخول' : 'Log In')}
              </button>
            </form>

            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-[#1f1f23]"></div>
              <span className="px-3 text-[11px] text-[#52525b] uppercase font-mono">{isAr ? 'أو' : 'or'}</span>
              <div className="flex-grow border-t border-[#1f1f23]"></div>
            </div>

            {/* Google One-Tap Sign In */}
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 rounded-xl bg-[#141416] hover:bg-[#1a1a1d] border border-[#27272a] text-sm text-white font-medium flex items-center justify-center gap-2.5 transition-colors tap-press"
            >
              {googleLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isAr ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
                </>
              )}
            </button>

            {/* Toggle to Register */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
              >
                {isAr ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
                <span className="font-semibold text-white underline underline-offset-4">{isAr ? 'إنشاء حساب جديد' : 'Sign up'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ===================== MODE: REGISTER (SEQUENTIAL CARDS) ===================== */}
        {mode === 'register' && (
          <div className="space-y-4">
            {/* Minimal Progress Bar */}
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-white' : 'bg-[#27272a]'}`} />
              <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-white' : 'bg-[#27272a]'}`} />
              <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-white' : 'bg-[#27272a]'}`} />
            </div>

            {/* STEP 1: CREDENTIALS & TERMS */}
            {step === 1 && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="text-center mb-3">
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    {isAr ? 'إنشاء حساب في PULSE' : 'Create your account'}
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-0.5">
                    {isAr ? 'الخطوة 1 من 3 · بيانات الدخول' : 'Step 1 of 3 · Credentials'}
                  </p>
                </div>

                {/* Method Switcher: Email vs Phone */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-[#141416] border border-[#222226] text-xs">
                  <button
                    type="button"
                    onClick={() => { setRegMethod('email'); setError(''); }}
                    className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                      regMethod === 'email' ? 'bg-white text-black shadow-sm font-semibold' : 'text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    <Mail size={14} />
                    <span>{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRegMethod('phone'); setError(''); }}
                    className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                      regMethod === 'phone' ? 'bg-white text-black shadow-sm font-semibold' : 'text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    <Phone size={14} />
                    <span>{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                  </button>
                </div>

                {/* Input: Email */}
                {regMethod === 'email' ? (
                  <div>
                    <label className="block text-xs font-medium text-[#71717a] mb-1">
                      {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
                    />
                    {emailAvailability.message && (
                      <p className={`text-[11px] mt-1 ${emailAvailability.available ? 'text-emerald-400' : 'text-red-400'}`}>
                        {emailAvailability.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-[#71717a] mb-1">
                      {isAr ? 'رقم الهاتف' : 'Phone Number'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-[#141416] border border-[#222226] rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors font-mono"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code} className="bg-[#141416] text-white">
                            {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        autoFocus
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        className="flex-1 bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors font-mono"
                      />
                    </div>
                    {phoneAvailability.message && (
                      <p className={`text-[11px] mt-1 ${phoneAvailability.available ? 'text-emerald-400' : 'text-red-400'}`}>
                        {phoneAvailability.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Password & Confirm */}
                <div>
                  <label className="block text-xs font-medium text-[#71717a] mb-1">
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-[#71717a] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#71717a] mb-1">
                    {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-[#27272a] bg-[#18181b] text-white focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-[#a1a1aa] leading-relaxed">
                      {isAr ? 'أوافق على ' : 'I agree to the '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setAuthSubScreen('terms'); }}
                        className="text-white underline underline-offset-2 hover:text-neutral-200"
                      >
                        {isAr ? 'شروط الخدمة' : 'Terms of Service'}
                      </button>
                      {isAr ? ' و ' : ' and '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setAuthSubScreen('privacy'); }}
                        className="text-white underline underline-offset-2 hover:text-neutral-200"
                      >
                        {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
                      </button>
                      {isAr ? ' الرسمية لـ PULSE' : ' of PULSE'}
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <span>{isAr ? 'متابعة' : 'Continue'}</span>
                  {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </button>

                <div className="flex items-center my-3">
                  <div className="flex-grow border-t border-[#1f1f23]"></div>
                  <span className="px-3 text-[11px] text-[#52525b] uppercase font-mono">{isAr ? 'أو' : 'or'}</span>
                  <div className="flex-grow border-t border-[#1f1f23]"></div>
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 rounded-xl bg-[#141416] hover:bg-[#1a1a1d] border border-[#27272a] text-xs text-white font-medium flex items-center justify-center gap-2 transition-colors tap-press"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isAr ? 'تسجيل فوري بحساب Google' : 'Sign up with Google'}</span>
                </button>

                {/* Back to Login */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
                  >
                    {isAr ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
                    <span className="font-semibold text-white underline underline-offset-4">{isAr ? 'تسجيل الدخول' : 'Log in'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DISPLAY NAME ("عايز تتنادي بإيه؟") */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in py-2">
                <div className="text-center">
                  <span className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider block mb-1">
                    {isAr ? 'الخطوة 2 من 3' : 'Step 2 of 3'}
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
                    {isAr ? 'عايز تتنادي بإيه؟' : 'What should we call you?'}
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1.5 leading-relaxed">
                    {isAr ? 'اكتب اسمك الحقيقي أو لقبك المفضل للظهور للآخرين على PULSE' : 'Enter your preferred display name to show on your profile'}
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={40}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={isAr ? 'اكتب اسمك هنا' : 'Your name here'}
                    className="w-full bg-[#141416] border-2 border-[#26262a] focus:border-white rounded-2xl px-4 py-4 text-center text-lg font-bold text-white placeholder:text-[#52525b] focus:outline-none transition-all"
                  />
                </div>

                {/* Automatic Username Engine Feedback */}
                <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#222226] text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#a1a1aa]">
                    {generatingUsername ? (
                      <div className="flex items-center gap-1.5 text-[#71717a]">
                        <Loader2 size={13} className="animate-spin" />
                        <span>{isAr ? 'جاري تجهيز اسم مستخدم خاص بك...' : 'Generating unique handle...'}</span>
                      </div>
                    ) : generatedUsername ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5 text-white font-mono font-semibold text-sm">
                          <Check size={14} className="text-emerald-400" />
                          <span>@{generatedUsername}</span>
                        </div>
                        <span className="text-[10px] text-[#71717a]">
                          {isAr ? '(تم إنشاؤه تلقائياً بناءً على اسمك، ويمكنك تغييره لاحقاً من الإعدادات)' : '(Auto-generated from your name, customizable later in Settings)'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#71717a]">
                        {isAr ? 'سيتم إنشاء معرف حساب فريد تلقائياً' : 'A unique handle will be automatically assigned'}
                      </span>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="flex-1 py-3.5 rounded-xl bg-[#141416] hover:bg-[#1a1a1d] border border-[#27272a] text-white font-semibold text-sm transition-colors"
                  >
                    {isAr ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    type="button"
                    disabled={!displayName || displayName.trim().length < 2 || generatingUsername}
                    onClick={handleProceedToStep3}
                    className="flex-2 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isAr ? 'التالي' : 'Next'}</span>
                    {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: BIRTH DATE ("متى ولدت؟") */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in py-2">
                <div className="text-center">
                  <span className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider block mb-1">
                    {isAr ? 'الخطوة 3 من 3' : 'Step 3 of 3'}
                  </span>
                  <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
                    {isAr ? 'متى ولدت؟' : 'When were you born?'}
                  </h2>
                  <p className="text-xs text-[#a1a1aa] mt-1.5 leading-relaxed">
                    {isAr ? 'لحماية أمان حسابك وتقديم تجربة مناسبة لعمرك (الحد الأدنى 13 عاماً)' : 'To ensure community safety and personalize your experience (13+ only)'}
                  </p>
                </div>

                {/* 3 Dropdown Selectors: Day, Month, Year */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {/* Day */}
                  <div>
                    <label className="block text-[11px] font-medium text-[#71717a] mb-1 text-center">
                      {isAr ? 'اليوم' : 'Day'}
                    </label>
                    <select
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      className="w-full bg-[#141416] border border-[#26262a] focus:border-white rounded-xl px-2 py-3 text-center text-sm font-semibold text-white focus:outline-none transition-colors"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d} className="bg-[#141416] text-white">
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div>
                    <label className="block text-[11px] font-medium text-[#71717a] mb-1 text-center">
                      {isAr ? 'الشهر' : 'Month'}
                    </label>
                    <select
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      className="w-full bg-[#141416] border border-[#26262a] focus:border-white rounded-xl px-2 py-3 text-center text-sm font-semibold text-white focus:outline-none transition-colors"
                    >
                      {(isAr ? MONTHS_AR : MONTHS_EN).map((m, idx) => (
                        <option key={idx + 1} value={idx + 1} className="bg-[#141416] text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-[11px] font-medium text-[#71717a] mb-1 text-center">
                      {isAr ? 'السنة' : 'Year'}
                    </label>
                    <select
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      className="w-full bg-[#141416] border border-[#26262a] focus:border-white rounded-xl px-2 py-3 text-center text-sm font-semibold text-white focus:outline-none transition-colors font-mono"
                    >
                      {Array.from({ length: 75 }, (_, i) => 2012 - i).map((y) => (
                        <option key={y} value={y} className="bg-[#141416] text-white">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Age preview indicator */}
                <div className="p-3 rounded-xl bg-[#141416] border border-[#222226] text-center">
                  <p className="text-xs text-[#a1a1aa]">
                    {isAr ? 'العمر المحسوب: ' : 'Calculated age: '}
                    <span className="font-bold text-white font-mono">{computedAge} {isAr ? 'عاماً' : 'years'}</span>
                  </p>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => { setStep(2); setError(''); }}
                    className="flex-1 py-3.5 rounded-xl bg-[#141416] hover:bg-[#1a1a1d] border border-[#27272a] text-white font-semibold text-sm transition-colors"
                  >
                    {isAr ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleFinalRegister}
                    className="flex-2 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{isAr ? 'جاري الإنشاء...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{isAr ? 'إتمام وإنشاء الحساب' : 'Complete Registration'}</span>
                        <Check size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== MODE: FORGOT PASSWORD ===================== */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isAr ? 'استعادة كلمة المرور' : 'Reset Password'}
              </h2>
              <p className="text-xs text-[#a1a1aa] mt-1">
                {resetStep === 1 
                  ? (isAr ? 'أدخل بريدك أو اسم المستخدم لاستلام رمز الأمان' : 'Enter your email or username to receive code')
                  : (isAr ? 'أدخل رمز التحقق وكلمة المرور الجديدة' : 'Enter verification code and new password')
                }
              </p>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleRequestResetOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#71717a] mb-1">
                    {isAr ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or Username'}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder={isAr ? 'name@example.com أو @username' : 'name@example.com or @username'}
                    className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (isAr ? 'إرسال رمز التحقق' : 'Send Verification Code')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-3.5">
                {resetPreviewNotice && (
                  <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs text-[#a1a1aa] leading-relaxed">
                    {resetPreviewNotice}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#71717a] mb-1">
                    {isAr ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6 digits)'}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-3 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#71717a] mb-1">
                    {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#71717a] mb-1">
                    {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                  </label>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#141416] border border-[#222226] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (isAr ? 'تعيين كلمة المرور والدخول' : 'Set Password & Log In')}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('login')}
                className="text-xs text-[#a1a1aa] hover:text-white transition-colors"
              >
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </button>
            </div>
          </div>
        )}

        {/* Global Language Toggle */}
        <div className="flex items-center justify-center pt-5 mt-4 border-t border-[#18181b]">
          <button
            type="button"
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141416] hover:bg-[#1a1a1d] text-[11px] font-mono text-[#71717a] hover:text-white transition-colors"
          >
            <Globe size={13} />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
