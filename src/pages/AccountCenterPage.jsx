import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRight, ArrowLeft, Shield, Key, AtSign, Download, Trash2, 
  Smartphone, Check, ChevronLeft, ChevronRight, Terminal, RefreshCw,
  AlertCircle, X, Lock, Calendar, Phone, Mail, User,
  FileText, Share2, Eye, ShieldCheck, UserX, ExternalLink, Laptop,
  Tablet, Clock, MapPin, CheckCircle2, ShieldAlert, AlertTriangle,
  History, LogOut, Copy, Search, Megaphone, Sliders, ToggleLeft,
  ToggleRight, Users, Bell, EyeOff, QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import PioneerBadge from '../components/PioneerBadge';
import PulseLogo from '../components/PulseLogo';
import LinkedDevicesModal from '../components/LinkedDevicesModal';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import AccountsManagerPage from './AccountsManagerPage';
import AdsManagerPage from './AdsManagerPage';
import ChangePasswordPage from './ChangePasswordPage';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { storageService } from '../services/storageService';
import { sessionService } from '../services/sessionService';
import { supervisionService } from '../services/supervisionService';
import { hapticsService } from '../services/hapticsService';
import { 
  generateBase32Secret, 
  verifyTOTP, 
  getOtpAuthUrl, 
  generateQRCodeDataUrl, 
  generateBackupCodes 
} from '../utils/totpService';

export default function AccountCenterPage({ onBack }) {
  const { 
    currentUser, 
    savedAccounts = [], 
    logout, 
    changeUsername, 
    changePassword, 
    updateProfile 
  } = useAuth();

  const { lang } = useLanguage();
  const { showToast } = useToast();

  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  // Active Standalone Sub-Page View:
  // null | 'profiles_details' | 'password_security' | 'connected_experiences' | 'information_permissions' | 'ad_preferences' | 'manage_accounts' | 'ads_manager'
  const [activeSubPage, setActiveSubPage] = useState(null);

  // Search in Accounts Center
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Profiles & Personal Details States
  const [editDisplayName, setEditDisplayName] = useState(currentUser?.displayName || '');
  const [newUsername, setNewUsername] = useState(currentUser?.username || '');
  const [usernameMsg, setUsernameMsg] = useState({ error: '', success: '' });
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editPhone, setEditPhone] = useState(currentUser?.fullPhone || currentUser?.phone || '');
  const [editBirthDate, setEditBirthDate] = useState(currentUser?.birthDate || '2001-01-01');
  const [savingPersonal, setSavingPersonal] = useState(false);

  // 2. Password & Security States
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ error: '', success: '' });

  // Two-Factor Auth (TOTP RFC 6238)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    return localStorage.getItem(`pulse_2fa_${currentUser?.uid}`) === 'true' || Boolean(currentUser?.twoFactorEnabled);
  });
  const [totpSecret, setTotpSecret] = useState(currentUser?.totpSecret || '');
  const [totpQrUrl, setTotpQrUrl] = useState('');
  const [totpInputCode, setTotpInputCode] = useState('');
  const [totpStep, setTotpStep] = useState('setup');
  const [totpBackupCodes, setTotpBackupCodes] = useState(() => {
    try {
      if (Array.isArray(currentUser?.totpBackupCodes) && currentUser.totpBackupCodes.length > 0) {
        return currentUser.totpBackupCodes;
      }
      const stored = localStorage.getItem(`pulse_2fa_codes_${currentUser?.uid}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isVerifyingTotp, setIsVerifyingTotp] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Saved Login & Login Alerts
  const [savedLoginEnabled, setSavedLoginEnabled] = useState(() => {
    return localStorage.getItem(`pulse_saved_login_${currentUser?.uid}`) !== 'false';
  });
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(() => {
    return localStorage.getItem(`pulse_login_alerts_${currentUser?.uid}`) !== 'false';
  });

  // Active Sessions
  const [sessionsList, setSessionsList] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const currentSessionId = sessionService.getCurrentSessionId();

  // 3. Connected Experiences States
  const [autoSharePulses, setAutoSharePulses] = useState(() => {
    return localStorage.getItem('pulse_crossposting_enabled') === 'true';
  });
  const [fediverseSharing, setFediverseSharing] = useState(() => {
    return localStorage.getItem('pulse_fediverse_sharing') === 'true';
  });
  const [showLinkedDevicesModal, setShowLinkedDevicesModal] = useState(false);

  // 4. Information & Permissions States
  const [isExporting, setIsExporting] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // 5. Ad Preferences States (Migrated from Settings)
  const [personalizedAds, setPersonalizedAds] = useState(() => {
    return localStorage.getItem('pulse_ads_personalized') !== 'false';
  });
  const [partnerDataAds, setPartnerDataAds] = useState(() => {
    return localStorage.getItem('pulse_ads_partner_data') !== 'false';
  });
  const [adTopics, setAdTopics] = useState(() => {
    try {
      const stored = localStorage.getItem('pulse_ads_topics');
      return stored ? JSON.parse(stored) : [
        { id: 'tech', label: isAr ? 'التكنولوجيا والبرمجيات' : 'Technology & Software', enabled: true },
        { id: 'business', label: isAr ? 'ريادة الأعمال والاستثمار' : 'Business & Startups', enabled: true },
        { id: 'design', label: isAr ? 'الفنون والتصميم' : 'Design & Creative Arts', enabled: true },
        { id: 'science', label: isAr ? 'العلوم والفضاء' : 'Science & Education', enabled: true },
        { id: 'media', label: isAr ? 'السينما والترفيه' : 'Media & Entertainment', enabled: true }
      ];
    } catch {
      return [];
    }
  });

  // Calculate age from birthDate
  const calculatedAge = useMemo(() => {
    if (!editBirthDate) return 23;
    return supervisionService.calculateAge(editBirthDate);
  }, [editBirthDate]);

  // Real-time live sessions subscription
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoadingSessions(true);
    const unsub = sessionService.subscribeToUserSessions(currentUser.uid, (list) => {
      setSessionsList(list || []);
      setLoadingSessions(false);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  const calculateDaysRemaining = () => {
    if (!currentUser?.usernameLastChangedAt) return 0;
    const lastChanged = new Date(currentUser.usernameLastChangedAt).getTime();
    const diffDays = Math.floor((Date.now() - lastChanged) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - diffDays);
  };
  const daysRemaining = calculateDaysRemaining();

  const handleUpdateUsername = (e) => {
    e.preventDefault();
    setUsernameMsg({ error: '', success: '' });
    try {
      changeUsername(newUsername);
      setUsernameMsg({ 
        error: '', 
        success: isAr ? 'تم تحديث اسم المستخدم بنجاح.' : 'Username updated successfully.' 
      });
      showToast(isAr ? 'تم تحديث اسم المستخدم بنجاح' : 'Username updated');
    } catch (err) {
      setUsernameMsg({ error: err.message, success: '' });
    }
  };

  const handleUpdateProfileDetails = async (e) => {
    e.preventDefault();
    try {
      if (updateProfile) {
        await updateProfile({ displayName: editDisplayName });
        showToast(isAr ? 'تم حفظ اسم العرض بنجاح' : 'Display name updated');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSavePersonalInfo = async (e) => {
    e.preventDefault();
    setSavingPersonal(true);
    try { hapticsService.light?.(); } catch {}
    try {
      if (updateProfile) {
        await updateProfile({ 
          email: editEmail,
          phone: editPhone,
          fullPhone: editPhone,
          birthDate: editBirthDate
        });
      }
      showToast(isAr ? 'تم حفظ التفاصيل الشخصية بنجاح' : 'Personal details updated', 'success');
    } catch (err) {
      showToast(err.message || 'Error updating details', 'error');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ error: '', success: '' });
    try {
      await changePassword(currentPwd, newPwd, confirmPwd);
      setPasswordMsg({ 
        error: '', 
        success: isAr ? 'تم تغيير كلمة المرور بنجاح.' : 'Password changed successfully.' 
      });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      showToast(isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
    } catch (err) {
      setPasswordMsg({ error: err.message, success: '' });
      showToast(err.message, 'error');
    }
  };

  const handleOpen2FA = async () => {
    try { hapticsService.light?.(); } catch {}
    setTotpError('');
    setTotpInputCode('');

    if (twoFactorEnabled && (totpSecret || currentUser?.totpSecret)) {
      setTotpStep('manage');
    } else {
      const secret = generateBase32Secret(20);
      setTotpSecret(secret);
      const otpUrl = getOtpAuthUrl(secret, currentUser?.username || 'user', 'PULSE');
      const qrData = await generateQRCodeDataUrl(otpUrl);
      setTotpQrUrl(qrData);
      setTotpStep('setup');
    }
  };

  const handleVerifyAndActivate2FA = async (e) => {
    e.preventDefault();
    if (!totpInputCode.trim()) return;
    setTotpError('');
    setIsVerifyingTotp(true);
    try { hapticsService.medium?.(); } catch {}

    try {
      const res = await verifyTOTP(totpInputCode, totpSecret);
      if (res.valid) {
        const codes = generateBackupCodes(8);
        setTotpBackupCodes(codes);
        localStorage.setItem(`pulse_2fa_codes_${currentUser.uid}`, JSON.stringify(codes));
        localStorage.setItem(`pulse_2fa_${currentUser.uid}`, 'true');
        setTwoFactorEnabled(true);

        if (updateProfile) {
          await updateProfile({
            twoFactorEnabled: true,
            totpSecret,
            totpBackupCodes: codes
          });
        }
        setTotpStep('backup_codes');
        showToast(isAr ? 'تم تفعيل التحقق بخطوتين بنجاح!' : 'Two-Factor Authentication Enabled!', 'success');
      } else {
        setTotpError(isAr ? 'رمز التحقق غير صحيح، تأكد من الوقت في تطبيقك وأعد المحاولة.' : 'Invalid code. Check clock and retry.');
      }
    } catch (err) {
      setTotpError(err.message || 'Verification error');
    } finally {
      setIsVerifyingTotp(false);
    }
  };

  const handleDisable2FA = async () => {
    try { hapticsService.medium?.(); } catch {}
    try {
      localStorage.setItem(`pulse_2fa_${currentUser.uid}`, 'false');
      setTwoFactorEnabled(false);
      setTotpSecret('');
      setTotpBackupCodes([]);
      if (updateProfile) {
        await updateProfile({
          twoFactorEnabled: false,
          totpSecret: '',
          totpBackupCodes: []
        });
      }
      showToast(isAr ? 'تم إيقاف التحقق بخطوتين' : '2FA disabled');
      setTotpStep('setup');
    } catch {
      showToast('Error disabling 2FA', 'error');
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try { hapticsService.medium?.(); } catch {}
    const newCodes = generateBackupCodes(8);
    setTotpBackupCodes(newCodes);
    localStorage.setItem(`pulse_2fa_codes_${currentUser.uid}`, JSON.stringify(newCodes));
    if (updateProfile) {
      await updateProfile({ totpBackupCodes: newCodes });
    }
    showToast(isAr ? 'تم توليد أكواد استرداد جديدة' : 'Generated new backup codes', 'success');
  };

  const handleRevokeSession = async (sId) => {
    if (!sId) return;
    try { hapticsService.light?.(); } catch {}

    // Immediate optimistic state update
    setSessionsList((prev) => prev.filter((s) => s.id !== sId && s.sessionId !== sId));

    try {
      await sessionService.revokeSession(currentUser.uid, sId);
      showToast(isAr ? 'تم تسجيل الخروج من الجلسة بنجاح' : 'Session terminated successfully');

      if (sId === currentSessionId) {
        if (logout) {
          logout();
        }
      }
    } catch {
      const refreshed = await sessionService.getUserSessionsOnce(currentUser.uid);
      if (refreshed) setSessionsList(refreshed);
      showToast(isAr ? 'تعذر إنهاء الجلسة' : 'Could not terminate session', 'error');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try { hapticsService.medium?.(); } catch {}

    // Immediate optimistic state update
    setSessionsList((prev) => prev.filter((s) => (s.sessionId || s.id) === currentSessionId));

    try {
      await sessionService.revokeAllOtherSessions(currentUser.uid);
      showToast(isAr ? 'تم تسجيل الخروج من كافة الأجهزة الأخرى' : 'Logged out of all other devices', 'success');
    } catch {
      const refreshed = await sessionService.getUserSessionsOnce(currentUser.uid);
      if (refreshed) setSessionsList(refreshed);
      showToast(isAr ? 'تعذر إنهاء الجلسات الأخرى' : 'Error logging out other sessions', 'error');
    }
  };

  const downloadWebBlob = (jsonString, fileName) => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 150);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try { hapticsService.medium?.(); } catch {}

    try {
      const allPosts = storageService.getPosts();
      const userPosts = allPosts.filter((p) => p.authorId === currentUser.uid || p.author?.uid === currentUser.uid);
      const allComments = storageService.getComments();
      const userComments = Object.values(allComments).flat().filter((c) => c && (c.authorId === currentUser.uid || c.author?.uid === currentUser.uid));
      
      const exportPayload = {
        platform: 'PULSE Official Social Network',
        exportVersion: '1.0.1',
        exportDate: new Date().toISOString(),
        profile: {
          uid: currentUser.uid,
          username: currentUser.username,
          displayName: currentUser.displayName,
          email: currentUser.email,
          phone: currentUser.fullPhone || currentUser.phone || '',
          bio: currentUser.bio || '',
          location: currentUser.location || '',
          showLocation: Boolean(currentUser.showLocation),
          birthDate: currentUser.birthDate || editBirthDate,
          isVerified: Boolean(currentUser.isVerified),
          isFounder: Boolean(currentUser.isFounder),
          pioneerNumber: currentUser.pioneerNumber || null,
          twoFactorEnabled: Boolean(twoFactorEnabled),
          createdAt: currentUser.createdAt
        },
        social: {
          followingCount: (currentUser.following || []).length,
          followersCount: (currentUser.followers || []).length,
          following: currentUser.following || [],
          followers: currentUser.followers || [],
          bookmarks: currentUser.bookmarks || []
        },
        pulses: userPosts.map((p) => ({
          id: p.id,
          content: p.content,
          topic: p.topic || null,
          createdAt: p.createdAt,
          hasVoice: Boolean(p.hasVoice),
          audioUrl: p.audioUrl || null,
          audioDuration: p.audioDuration || null,
          likesCount: Array.isArray(p.likes) ? p.likes.length : (p.likesCount || 0),
          repostsCount: Array.isArray(p.reposts) ? p.reposts.length : (p.repostsCount || 0),
          repliesCount: p.repliesCount || 0,
          viewsCount: p.viewsCount || 0
        })),
        comments: userComments.map((c) => ({
          id: c.id,
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt,
          hasVoice: Boolean(c.hasVoice),
          likesCount: Array.isArray(c.likes) ? c.likes.length : (c.likesCount || 0)
        })),
        activeSessions: sessionsList.map((s) => ({
          deviceName: s.deviceName || s.browser,
          deviceType: s.deviceType,
          ip: s.ip,
          location: s.location,
          lastActive: s.lastActive
        }))
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);
      const fileName = `pulse_archive_${currentUser.username}_${Date.now()}.json`;

      let savedNatively = false;
      if (Capacitor.isNativePlatform()) {
        try {
          const writeRes = await Filesystem.writeFile({
            path: fileName,
            data: jsonString,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          });

          await Share.share({
            title: isAr ? 'أرشيف بيانات PULSE' : 'PULSE Data Archive',
            text: isAr ? `أرشيف بيانات حساب @${currentUser.username}` : `Data archive for @${currentUser.username}`,
            url: writeRes.uri,
            dialogTitle: isAr ? 'حفظ أو مشاركة الأرشيف' : 'Save or Share Archive'
          });
          savedNatively = true;
        } catch (nativeErr) {
          console.warn('Native filesystem/share notice:', nativeErr);
        }
      }

      if (!savedNatively) {
        downloadWebBlob(jsonString, fileName);
      }

      setIsExporting(false);
      showToast(isAr ? 'تم تصدير وتنزيل أرشيف بياناتك بنجاح' : 'Data archive downloaded successfully');
    } catch (err) {
      console.error('Export data error:', err);
      setIsExporting(false);
      showToast(isAr ? 'حدث خطأ أثناء تنزيل الأرشيف' : 'Failed to export archive', 'error');
    }
  };

  const handleClearCache = () => {
    storageService.cleanLegacyStorage();
    try {
      localStorage.removeItem('pulse_recent_searches');
    } catch {}
    setCacheCleared(true);
    showToast(isAr ? 'تم تنظيف سجل البحث والذاكرة التخزينية' : 'Search history and cache cleared');
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleToggleAdTopic = (topicId) => {
    const updated = adTopics.map((t) => t.id === topicId ? { ...t, enabled: !t.enabled } : t);
    setAdTopics(updated);
    try {
      localStorage.setItem('pulse_ads_topics', JSON.stringify(updated));
    } catch {}
    try { hapticsService.light?.(); } catch {}
  };

  const handleResetAdId = () => {
    try { hapticsService.light?.(); } catch {}
    const newId = 'ad_' + Math.random().toString(36).substring(2, 12);
    localStorage.setItem('pulse_ad_tracking_id', newId);
    showToast(isAr ? 'تمت إعادة تعيين معرّف الإعلانات بنجاح' : 'Advertising ID reset successfully');
  };

  const profileCount = Math.max((savedAccounts && savedAccounts.length) || 1, 1);

  // Sub-page top navigation bar
  const renderSubHeader = (title) => (
    <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            try { hapticsService.light?.(); } catch {}
            setActiveSubPage(null);
          }}
          className="p-1.5 -ml-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"
          title={isAr ? 'رجوع' : 'Back'}
        >
          <BackIcon size={21} strokeWidth={2.2} />
        </button>
        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
      </div>
    </div>
  );

  // ==========================================
  // STANDALONE SUB-PAGES RENDERING
  // ==========================================

  // 0. Standalone Sub-Page: Learn More About Accounts Center
  if (activeSubPage === 'learn_more') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
          {renderSubHeader(isAr ? 'حول مركز الحسابات' : 'About Accounts Center')}

          <div className="p-4 space-y-4 animate-fade-in">
            {/* Intro Card */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-5 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-1">
                <Shield size={20} />
              </div>
              <h2 className="text-base font-bold text-white">
                {isAr ? 'ما هو مركز حسابات PULSE؟' : 'What is PULSE Accounts Center?'}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'مركز الحسابات هو اللوحة المركزية الموحدة لإدارة هويتك الرقمية، أمان حسابك، وتجاربك المتصلة عبر شبكة وتقنيات PULSE دون تعقيد أو تكرار.' 
                  : 'Accounts Center is the unified control hub for managing your digital identity, account security, and connected experiences across PULSE technologies.'}
              </p>
            </div>

            {/* Feature 1: Multi-Account Management */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-2">
              <div className="flex items-center gap-2.5 text-white">
                <Users size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold">
                  {isAr ? 'إدارة وتبديل الحسابات بلمسة واحدة' : '1-Tap Fast Account Switching'}
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'يمكنك حفظ عدة حسابات شخصية أو مهنية على هذا الجهاز والتبديل بينها فورياً دون الحاجة إلى تسجيل الخروج أو كتابة كلمة المرور في كل مرة.' 
                  : 'Save multiple personal or professional accounts on this device and switch between them instantly without re-authenticating each time.'}
              </p>
            </div>

            {/* Feature 2: High Security & Active Sessions */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-2">
              <div className="flex items-center gap-2.5 text-white">
                <Key size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold">
                  {isAr ? 'الأمان المركزي ورصد الجلسات اللحظي' : 'Centralized Security & Active Sessions'}
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'رصد فوري لجميع الأجهزة النشطة المرتبطة بحسابك مع إمكانية إنهاء أي جلسة عن بُعد بلمسة واحدة، وتلقي إشعارات تفاعلية لحماية حسابك فور رصد أي نشاط دخول جديد.' 
                  : 'Real-time visibility into all active sessions on your account with 1-tap remote logout and interactive alerts whenever new device activity is detected.'}
              </p>
            </div>

            {/* Feature 3: Data Ownership & Archive */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-2">
              <div className="flex items-center gap-2.5 text-white">
                <Download size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold">
                  {isAr ? 'ملكية بياناتك وتنزيل الأرشيف الرسمي' : 'Data Ownership & Complete Archive'}
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'أنت المالك الكامل لبياناتك؛ يتيح لك مركز الحسابات تصدير نسخة رقمية شاملة لكافة نبضاتك، مواضيعك، تعليقاتك، وقائمة متابعاتك وتنزيلها مباشرة إلى جهازك بصيغة JSON المعيارية.' 
                  : 'You own your data completely. Accounts Center allows you to export and download a full official archive of your pulses, topics, comments, and profile directly.'}
              </p>
            </div>

            {/* Feature 4: Connected Experiences & QR */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-2">
              <div className="flex items-center gap-2.5 text-white">
                <Share2 size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold">
                  {isAr ? 'التجارب المتصلة والربط السريع برمز QR' : 'Connected Experiences & QR Pairing'}
                </h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'تسجيل الدخول ومصادقة جلسات أجهزة الكمبيوتر فورياً بمسح رمز QR من هاتفك، مع خيارات متقدمة للمشاركة التلقائية والتكامل مع بروتوكولات الويب الحديثة.' 
                  : 'Instantly authenticate desktop browser sessions by scanning a QR code from your phone, with options for auto-sharing across connected profiles.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubPage(null)}
              className="w-full py-3 bg-white text-black text-xs font-bold rounded-xl tap-press hover:bg-neutral-200 transition-colors mt-2"
            >
              {isAr ? 'العودة إلى مركز الحسابات' : 'Back to Accounts Center'}
            </button>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 0.5 Standalone Sub-Page: Dedicated Change Password & Security Checkup
  if (activeSubPage === 'change_password') {
    return (
      <ChangePasswordPage
        onBack={() => setActiveSubPage('password_security')}
      />
    );
  }

  // 1. Standalone Sub-Page: Profiles & Personal Details
  if (activeSubPage === 'profiles_details') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
          {renderSubHeader(isAr ? 'الملفات الشخصية والتفاصيل' : 'Profiles & Personal Details')}

          <div className="p-4 space-y-5">
            {/* User Profile Card */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center gap-3.5">
              <img
                src={currentUser.avatar || DEFAULT_AVATAR}
                alt={currentUser.displayName}
                className="w-14 h-14 rounded-full object-cover border border-[#2A2A2E]"
              />
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-white truncate">
                  {currentUser.displayName || currentUser.username}
                </div>
                <div className="text-xs text-neutral-400 font-mono mt-0.5" dir="ltr">
                  @{currentUser.username}
                </div>
                {currentUser.pioneerNumber && (
                  <div className="mt-1">
                    <PioneerBadge number={currentUser.pioneerNumber} size="xs" />
                  </div>
                )}
              </div>
            </div>

            {/* Edit Display Name */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {isAr ? 'اسم العرض' : 'Display Name'}
              </div>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder={isAr ? 'اسمك المعروض' : 'Display name'}
                className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
              />
              <button
                onClick={handleUpdateProfileDetails}
                className="w-full py-2.5 bg-white text-black text-xs font-bold rounded-xl tap-press hover:bg-neutral-200 transition-colors"
              >
                {isAr ? 'حفظ اسم العرض' : 'Save Display Name'}
              </button>
            </div>

            {/* Edit Username */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {isAr ? 'اسم المستخدم (@)' : 'Username (@)'}
                </div>
                {daysRemaining > 0 ? (
                  <span className="text-[11px] text-amber-400 font-mono">
                    {isAr ? `متبقي ${daysRemaining} يوم` : `${daysRemaining}d cooldown`}
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {isAr ? 'متاح للتعديل' : 'Available'}
                  </span>
                )}
              </div>
              <input
                type="text"
                disabled={daysRemaining > 0}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white disabled:opacity-40 focus:outline-none focus:border-white transition-colors font-mono"
                dir="ltr"
              />
              {usernameMsg.error && <p className="text-xs text-red-400">{usernameMsg.error}</p>}
              {usernameMsg.success && <p className="text-xs text-emerald-400">{usernameMsg.success}</p>}
              <button
                onClick={handleUpdateUsername}
                disabled={daysRemaining > 0 || !newUsername.trim()}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-bold rounded-xl tap-press transition-colors"
              >
                {isAr ? 'تأكيد اسم المستخدم الجديد' : 'Confirm New Username'}
              </button>
            </div>

            {/* Personal Details */}
            <form onSubmit={handleSavePersonalInfo} className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-4">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {isAr ? 'معلومات الاتصال والميلاد' : 'Contact & Birth Date'}
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                    dir="ltr"
                  />
                  <Check size={14} className="absolute end-3 top-3 text-emerald-400 stroke-[3]" />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  {isAr ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-neutral-400">
                    {isAr ? 'تاريخ الميلاد' : 'Date of Birth'}
                  </label>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {calculatedAge} {isAr ? 'سنة' : 'years'}
                  </span>
                </div>
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={savingPersonal}
                className="w-full py-2.5 bg-white text-black text-xs font-bold rounded-xl tap-press hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {savingPersonal ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ البيانات الشخصية' : 'Save Personal Details')}
              </button>
            </form>

            {/* Account UID */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  {isAr ? 'معرّف الحساب' : 'Account UID'}
                </div>
                <div className="text-xs text-neutral-300 font-mono mt-0.5 truncate max-w-[200px]" dir="ltr">
                  {currentUser.uid}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentUser.uid);
                  showToast(isAr ? 'تم نسخ المعرف' : 'UID copied');
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white tap-press"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 2. Standalone Sub-Page: Password and Security
  if (activeSubPage === 'password_security') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
          {renderSubHeader(isAr ? 'كلمة السر والأمان' : 'Password & Security')}

          <div className="p-4 space-y-5">
            {/* Section 1: Change Password */}
            <form onSubmit={handleUpdatePassword} className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-neutral-400" />
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { hapticsService.light?.(); } catch {}
                    setActiveSubPage('change_password');
                  }}
                  className="text-xs text-neutral-400 hover:text-white underline font-medium tap-press"
                >
                  {isAr ? 'الفحص المتقدم' : 'Security Checkup'}
                </button>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">
                  {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  placeholder="••••••••"
                />
              </div>

              {passwordMsg.error && <p className="text-xs text-red-400">{passwordMsg.error}</p>}
              {passwordMsg.success && <p className="text-xs text-emerald-400">{passwordMsg.success}</p>}

              <button
                type="submit"
                disabled={!currentPwd || !newPwd || !confirmPwd}
                className="w-full py-2.5 bg-white text-black text-xs font-bold rounded-xl tap-press hover:bg-neutral-200 transition-colors disabled:opacity-40"
              >
                {isAr ? 'حفظ كلمة المرور الجديدة' : 'Update Password'}
              </button>
            </form>

            {/* Section 2: Two-Factor Authentication (2FA) */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className={twoFactorEnabled ? 'text-emerald-400' : 'text-neutral-400'} />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {isAr ? 'المصادقة الثنائية (2FA)' : 'Two-Factor Authentication'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {twoFactorEnabled 
                        ? (isAr ? 'مفعلة عبر تطبيق المصادقة (TOTP)' : 'Enabled via authenticator app')
                        : (isAr ? 'غير مفعلة، قم بتأمين حسابك' : 'Disabled, protect your account')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={twoFactorEnabled ? handleDisable2FA : handleOpen2FA}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold tap-press transition-colors ${
                    twoFactorEnabled 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {twoFactorEnabled ? (isAr ? 'إلغاء التفعيل' : 'Disable') : (isAr ? 'تفعيل الآن' : 'Enable')}
                </button>
              </div>

              {/* 2FA Setup Flow if Active */}
              {!twoFactorEnabled && totpQrUrl && totpStep === 'setup' && (
                <div className="border-t border-[#1C1C20] pt-4 space-y-3">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {isAr 
                      ? 'امسح رمز QR بتطبيق المصادقة (Google Authenticator / 1Password) أو انسخ المفتاح:' 
                      : 'Scan QR code in Google Authenticator or copy key:'}
                  </p>
                  <div className="flex justify-center p-3 bg-white rounded-2xl w-fit mx-auto">
                    <img src={totpQrUrl} alt="TOTP QR" className="w-40 h-40" />
                  </div>
                  <div className="flex items-center justify-between bg-black p-2.5 rounded-xl border border-[#222226]">
                    <span className="font-mono text-xs text-neutral-300 truncate" dir="ltr">{totpSecret}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(totpSecret);
                        setCopiedSecret(true);
                        showToast(isAr ? 'تم نسخ المفتاح' : 'Key copied');
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="text-xs text-white font-bold px-2 py-1 bg-white/10 rounded-lg hover:bg-white/20"
                    >
                      {copiedSecret ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}
                    </button>
                  </div>

                  <form onSubmit={handleVerifyAndActivate2FA} className="space-y-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={totpInputCode}
                      onChange={(e) => setTotpInputCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-white"
                      dir="ltr"
                    />
                    {totpError && <p className="text-xs text-red-400 text-center">{totpError}</p>}
                    <button
                      type="submit"
                      disabled={isVerifyingTotp || totpInputCode.length !== 6}
                      className="w-full py-2.5 bg-emerald-500 text-black text-xs font-bold rounded-xl disabled:opacity-40 tap-press"
                    >
                      {isVerifyingTotp ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'تأكيد وتفعيل' : 'Confirm & Enable')}
                    </button>
                  </form>
                </div>
              )}

              {/* Backup Codes Display */}
              {twoFactorEnabled && totpBackupCodes.length > 0 && (
                <div className="border-t border-[#1C1C20] pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 font-semibold">{isAr ? 'أكواد الاسترداد الاحتياطية' : 'Backup Codes'}</span>
                    <button
                      type="button"
                      onClick={handleRegenerateBackupCodes}
                      className="text-[11px] text-neutral-400 hover:text-white underline"
                    >
                      {isAr ? 'توليد أكواد جديدة' : 'Regenerate'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-black/60 p-3 rounded-xl border border-[#222226]">
                    {totpBackupCodes.map((c, idx) => (
                      <span key={idx} className="font-mono text-xs text-neutral-300 text-center">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Saved Login Info & Alerts */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{isAr ? 'حفظ معلومات تسجيل الدخول' : 'Saved login'}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{isAr ? 'تذكر بيانات تسجيل دخولك على هذا الجهاز' : 'Remember credentials on this device'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !savedLoginEnabled;
                    setSavedLoginEnabled(next);
                    localStorage.setItem(`pulse_saved_login_${currentUser.uid}`, String(next));
                    showToast(next ? (isAr ? 'تم تفعيل حفظ الدخول' : 'Saved login enabled') : (isAr ? 'تم التعطيل' : 'Disabled'));
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative tap-press ${savedLoginEnabled ? 'bg-white' : 'bg-neutral-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${savedLoginEnabled ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
                </button>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{isAr ? 'تنبيهات تسجيل الدخول' : 'Login alerts'}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{isAr ? 'إرسال تنبيه فوري عند تسجيل الدخول من جهاز غير معروف' : 'Alert on login from unrecognized device'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !loginAlertsEnabled;
                    setLoginAlertsEnabled(next);
                    localStorage.setItem(`pulse_login_alerts_${currentUser.uid}`, String(next));
                    showToast(next ? (isAr ? 'تم تفعيل التنبيهات' : 'Alerts enabled') : (isAr ? 'تم التعطيل' : 'Disabled'));
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative tap-press ${loginAlertsEnabled ? 'bg-white' : 'bg-neutral-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${loginAlertsEnabled ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Section 4: QR Web Pairing & Desktop Login */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'ربط الأجهزة عبر رمز الـ QR' : 'Link Web Browser via QR'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                  {isAr 
                    ? 'تسجيل الدخول فورياً ومصادقة جلسة الكمبيوتر بمسح الرمز من هاتفك' 
                    : 'Log in instantly on desktop browser by scanning QR from phone'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkedDevicesModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-bold tap-press hover:bg-neutral-200 flex items-center gap-1.5 shadow-sm"
              >
                <QrCode size={15} />
                <span>{isAr ? 'ربط جهاز' : 'Link'}</span>
              </button>
            </div>

            {/* Section 5: Active Sessions (Where you're logged in) */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop size={18} className="text-neutral-400" />
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    {isAr ? 'الأجهزة والجلسات النشطة' : 'Where you are logged in'}
                  </span>
                </div>
                {sessionsList.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRevokeAllOtherSessions}
                    className="text-xs text-rose-400 hover:underline font-medium tap-press"
                  >
                    {isAr ? 'إنهاء باقي الجلسات' : 'Log out all others'}
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#1C1C20]">
                {sessionsList.map((session) => {
                  const sId = session.sessionId || session.id;
                  const isCurrent = sId === currentSessionId;
                  const displayLoc = session.location || (isAr ? 'القاهرة، مصر' : 'Cairo, Egypt');
                  return (
                    <div key={sId} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400 flex-shrink-0">
                          {session.deviceType === 'desktop' ? <Laptop size={17} /> : <Smartphone size={17} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                            <span>{session.deviceName || session.browser || 'PULSE Client'}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                                {isAr ? 'هذا الجهاز' : 'This device'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {displayLoc} • {session.ip || '197.38.0.1'} • {session.lastActive ? new Date(session.lastActive).toLocaleDateString() : 'Active now'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeSession(sId)}
                        className={`text-xs px-2.5 py-1 rounded tap-press font-semibold transition-colors ${
                          isCurrent
                            ? 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
                            : 'text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20'
                        }`}
                      >
                        {isCurrent ? (isAr ? 'تسجيل الخروج' : 'Log out') : (isAr ? 'خروج' : 'Revoke')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <LinkedDevicesModal
            isOpen={showLinkedDevicesModal}
            onClose={() => setShowLinkedDevicesModal(false)}
            currentUser={currentUser}
          />
        </div>
      </SwipeBackWrapper>
    );
  }

  // 3. Standalone Sub-Page: Connected Experiences
  if (activeSubPage === 'connected_experiences') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
          {renderSubHeader(isAr ? 'التجارب المتصلة' : 'Connected Experiences')}

          <div className="p-4 space-y-4">
            {/* Auto Crossposting */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'المشاركة عبر الملفات الشخصية' : 'Sharing across profiles'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                  {isAr 
                    ? 'مشاركة النبضات تلقائياً عبر جميع حساباتك المتصلة على المنصة' 
                    : 'Automatically share pulses across your connected accounts'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !autoSharePulses;
                  setAutoSharePulses(next);
                  localStorage.setItem('pulse_crossposting_enabled', String(next));
                  showToast(next ? (isAr ? 'تم تفعيل المشاركة التلقائية' : 'Auto-sharing enabled') : (isAr ? 'تم التعطيل' : 'Disabled'));
                }}
                className={`w-11 h-6 rounded-full transition-colors relative tap-press ${autoSharePulses ? 'bg-white' : 'bg-neutral-700'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${autoSharePulses ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
              </button>
            </div>

            {/* Linked Web Sessions & QR Pairing */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'ربط الأجهزة عبر رمز الـ QR' : 'Link Web Browser via QR'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                  {isAr 
                    ? 'تسجيل الدخول فورياً على موقع الويب للكمبيوتر بمسح الرمز' 
                    : 'Log in instantly on desktop browser by scanning QR'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkedDevicesModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-bold tap-press hover:bg-neutral-200 flex items-center gap-1.5"
              >
                <QrCode size={15} />
                <span>{isAr ? 'ربط جهاز' : 'Link'}</span>
              </button>
            </div>

            {/* Fediverse Integration */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'المشاركة في فيديفيرس (Fediverse)' : 'Fediverse Sharing'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                  {isAr 
                    ? 'السماح لمستخدمي الخوادم اللامركزية بمتابعة نبضاتك والتفاعل معها' 
                    : 'Allow people on other decentralized servers to follow your pulses'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !fediverseSharing;
                  setFediverseSharing(next);
                  localStorage.setItem('pulse_fediverse_sharing', String(next));
                  showToast(next ? (isAr ? 'تم تفعيل فيديفيرس' : 'Fediverse enabled') : (isAr ? 'تم التعطيل' : 'Disabled'));
                }}
                className={`w-11 h-6 rounded-full transition-colors relative tap-press ${fediverseSharing ? 'bg-white' : 'bg-neutral-700'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${fediverseSharing ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
              </button>
            </div>
          </div>

          <LinkedDevicesModal
            isOpen={showLinkedDevicesModal}
            onClose={() => setShowLinkedDevicesModal(false)}
            currentUser={currentUser}
          />
        </div>
      </SwipeBackWrapper>
    );
  }

  // 4. Standalone Sub-Page: Your Information and Permissions
  if (activeSubPage === 'information_permissions') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
          {renderSubHeader(isAr ? 'معلوماتك وأذوناتك' : 'Your Information & Permissions')}

          <div className="p-4 space-y-4">
            {/* Search History & Cache */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'سجل البحث والذاكرة التخزينية' : 'Search history & cache'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {isAr ? 'مسح عمليات البحث السابقة والملفات المؤقتة' : 'Clear search history and temporary files'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold tap-press"
              >
                {cacheCleared ? (isAr ? 'تم المسح' : 'Cleared') : (isAr ? 'تنظيف الآن' : 'Clear')}
              </button>
            </div>

            {/* Download Archive Data */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'تنزيل أرشيف معلوماتك' : 'Download your information'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                  {isAr 
                    ? 'تنزيل نسخة رسمية كاملة من نبضاتك وتعليقاتك وملفك الشخصي بتنسيق JSON' 
                    : 'Download complete export of your pulses, comments, and profile'}
                </div>
              </div>
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportData}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold tap-press hover:bg-neutral-200 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Download size={15} />
                <span>{isExporting ? (isAr ? 'جاري التحضير...' : 'Exporting...') : (isAr ? 'تنزيل' : 'Download')}</span>
              </button>
            </div>

            {/* Account Insights Summary */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {isAr ? 'الوصول إلى سجل الحساب' : 'Account Registry Access'}
              </div>
              <div className="divide-y divide-[#1C1C20] text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-neutral-400">{isAr ? 'تاريخ الانضمام' : 'Date joined'}</span>
                  <span className="text-white font-mono">{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-neutral-400">{isAr ? 'نوع الحساب' : 'Account type'}</span>
                  <span className="text-white font-semibold">{currentUser.isFounder ? 'FOUNDER' : currentUser.isVerified ? 'VERIFIED' : 'Standard'}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-neutral-400">{isAr ? 'إجمالي المتابعين' : 'Total followers'}</span>
                  <span className="text-white font-mono">{(currentUser.followers || []).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 5. Standalone Sub-Page: Ad Preferences (Migrated from Settings)
  if (activeSubPage === 'ad_preferences') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
          {renderSubHeader(isAr ? 'تفضيلات الإعلانات' : 'Ad Preferences')}

          <div className="p-4 space-y-4">
            {/* Master Toggle: Personalized Ads */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'الإعلانات المخصصة' : 'Personalized ads'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                  {isAr 
                    ? 'عرض إعلانات تتناسب مع اهتماماتك وتفاعلاتك داخل التطبيق' 
                    : 'Show ads tailored to your interests and activity'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !personalizedAds;
                  setPersonalizedAds(next);
                  localStorage.setItem('pulse_ads_personalized', String(next));
                  showToast(next ? (isAr ? 'تم تفعيل التخصيص' : 'Personalization enabled') : (isAr ? 'تم إيقاف التخصيص' : 'Personalization disabled'));
                }}
                className={`w-11 h-6 rounded-full transition-colors relative tap-press ${personalizedAds ? 'bg-white' : 'bg-neutral-700'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${personalizedAds ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
              </button>
            </div>

            {/* Partner Data Toggle */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'بيانات الشركاء' : 'Data from partners'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                  {isAr 
                    ? 'استخدام بيانات شركاء PULSE لتحديد ملائمة الإعلانات المعروضة' 
                    : 'Use data from PULSE partners to gauge ad relevance'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !partnerDataAds;
                  setPartnerDataAds(next);
                  localStorage.setItem('pulse_ads_partner_data', String(next));
                  showToast(next ? (isAr ? 'تم تفعيل بيانات الشركاء' : 'Partner data enabled') : (isAr ? 'تم التعطيل' : 'Disabled'));
                }}
                className={`w-11 h-6 rounded-full transition-colors relative tap-press ${partnerDataAds ? 'bg-white' : 'bg-neutral-700'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${partnerDataAds ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
              </button>
            </div>

            {/* Ad Topics */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {isAr ? 'مواضيع الإعلانات المفضلة' : 'Ad Topics'}
              </div>
              <div className="divide-y divide-[#1C1C20]">
                {adTopics.map((topic) => (
                  <div key={topic.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-xs text-neutral-200">{topic.label}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAdTopic(topic.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        topic.enabled 
                          ? 'bg-white/10 text-white' 
                          : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                      }`}
                    >
                      {topic.enabled ? (isAr ? 'مرغوب' : 'Preferred') : (isAr ? 'أقل' : 'Less')}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset Ad ID */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'إعادة تعيين معرّف الإعلانات' : 'Reset advertising ID'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {isAr ? 'إلغاء ربط سجل التفاعلات الإعلانية السابقة' : 'Unlink previous ad activity records'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetAdId}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold tap-press"
              >
                {isAr ? 'إعادة تعيين' : 'Reset'}
              </button>
            </div>

            {/* Manage Campaigns Launcher */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'إعلاناتي وحملاتي' : 'My Ad Campaigns'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {isAr ? 'إنشاء وإدارة حملاتك الترويجية ومتابعة الأداء' : 'Create and manage promotional campaigns'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubPage('ads_manager')}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold tap-press hover:bg-neutral-200 flex items-center gap-1.5"
              >
                <Megaphone size={15} />
                <span>{isAr ? 'لوحة الحملات' : 'Dashboard'}</span>
              </button>
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 6. Standalone Sub-Page: Manage Accounts
  if (activeSubPage === 'manage_accounts') {
    return (
      <AccountsManagerPage
        onBack={() => setActiveSubPage(null)}
      />
    );
  }

  // 7. Ads Manager Full Dashboard Sub-Page
  if (activeSubPage === 'ads_manager') {
    return (
      <AdsManagerPage
        onBack={() => setActiveSubPage('ad_preferences')}
      />
    );
  }

  // ==========================================
  // MAIN ACCOUNTS CENTER SCREEN (Exact Match to Screenshot 1)
  // ==========================================

  const filteredItems = {
    showProfiles: !searchQuery.trim() || (isAr ? 'الملفات الشخصية الهوية' : 'profiles personal details').includes(searchQuery.toLowerCase()),
    showPassword: !searchQuery.trim() || (isAr ? 'كلمة السر الأمان مصادقة ثنائية 2FA جلسات' : 'password security 2fa sessions').includes(searchQuery.toLowerCase()),
    showConnected: !searchQuery.trim() || (isAr ? 'التجارب المتصلة مشاركة تلقائية ويب QR' : 'connected experiences sharing qr web').includes(searchQuery.toLowerCase()),
    showPermissions: !searchQuery.trim() || (isAr ? 'معلوماتك أذوناتك تنزيل أرشيف بحث' : 'information permissions download archive search').includes(searchQuery.toLowerCase()),
    showAds: !searchQuery.trim() || (isAr ? 'تفضيلات الإعلانات حملات ترويج' : 'ad preferences ads campaigns').includes(searchQuery.toLowerCase()),
    showManage: !searchQuery.trim() || (isAr ? 'إدارة الحسابات تبديل إضافة حذف' : 'manage accounts switch add delete').includes(searchQuery.toLowerCase())
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Top Header: Dismiss X | Pulse Mark | Spacer */}
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-1 -ml-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={22} strokeWidth={2.2} />
          </button>
          
          <div className="flex items-center gap-1.5 text-neutral-300">
            <PulseLogo size={20} />
            <span className="text-sm font-bold font-mono tracking-wider">PULSE</span>
          </div>

          <div className="w-8" />
        </div>

        <div className="p-4 space-y-5">
          
          {/* Main Title & Subtitle Matching Screenshot 1 */}
          <div className="space-y-1.5 pt-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isAr ? 'مركز الحسابات' : 'Accounts Center'}
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {isAr 
                ? 'إدارة تجاربك المتصلة وإعدادات حسابك عبر تقنيات PULSE. ' 
                : 'Manage your connected experiences and account settings across PULSE technologies. '}
              <span 
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubPage('learn_more');
                }}
                className="text-[#0095F6] cursor-pointer hover:underline font-medium"
              >
                {isAr ? 'تعرّف على المزيد' : 'Learn more'}
              </span>
            </p>
          </div>

          {/* Search Bar for Ultra Fast Navigation */}
          <div className="relative">
            <Search size={16} className="absolute start-3.5 top-3 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'البحث في مركز الحسابات...' : 'Search Accounts Center...'}
              className="w-full bg-[#121214] border border-[#222226] rounded-2xl ps-10 pe-9 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-3 text-neutral-500 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* CARD 1: Profiles and personal details (Exact Screenshot 1 Match) */}
          {filteredItems.showProfiles && (
            <div 
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setActiveSubPage('profiles_details');
              }}
              className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between cursor-pointer hover:bg-[#161619] active:bg-[#1A1A1E] tap-press transition-all shadow-sm"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Overlapping Avatar Stack Matching Screenshot 1 */}
                <div className="relative flex-shrink-0">
                  <img
                    src={currentUser.avatar || DEFAULT_AVATAR}
                    alt={currentUser.displayName || currentUser.username}
                    className="w-12 h-12 rounded-full object-cover border border-[#2A2A2E] block"
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                  <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-black shadow border-2 border-black font-mono">
                    {profileCount}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {isAr ? 'الملفات الشخصية والتفاصيل الشخصية' : 'Profiles and personal details'}
                  </div>
                  <div className="text-xs text-neutral-400 truncate mt-0.5">
                    {profileCount} {profileCount === 1 ? (isAr ? 'ملف شخصي' : 'profile') : (isAr ? 'ملفات شخصية' : 'profiles')}
                  </div>
                </div>
              </div>
              <Chevron size={18} className="text-neutral-500 flex-shrink-0 ml-2" />
            </div>
          )}

          {/* CARD 2: Grouped Account Settings (Exact Screenshot 1 Match) */}
          <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden shadow-sm">
            
            {/* 1. Password and security */}
            {filteredItems.showPassword && (
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubPage('password_security');
                }}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] active:bg-white/[0.04] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200 min-w-0">
                  <Shield size={20} strokeWidth={2} className="text-neutral-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-white truncate">
                    {isAr ? 'كلمة السر والأمان' : 'Password and security'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-600 flex-shrink-0" />
              </button>
            )}

            {/* 2. Connected experiences */}
            {filteredItems.showConnected && (
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubPage('connected_experiences');
                }}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] active:bg-white/[0.04] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200 min-w-0">
                  <Share2 size={20} strokeWidth={2} className="text-neutral-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-white truncate">
                    {isAr ? 'التجارب المتصلة' : 'Connected experiences'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-600 flex-shrink-0" />
              </button>
            )}

            {/* 3. Your information and permissions */}
            {filteredItems.showPermissions && (
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubPage('information_permissions');
                }}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] active:bg-white/[0.04] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200 min-w-0">
                  <FileText size={20} strokeWidth={2} className="text-neutral-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-white truncate">
                    {isAr ? 'معلوماتك وأذوناتك' : 'Your information and permissions'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-600 flex-shrink-0" />
              </button>
            )}

            {/* 4. Ad preferences (Migrated here from settings!) */}
            {filteredItems.showAds && (
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubPage('ad_preferences');
                }}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] active:bg-white/[0.04] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200 min-w-0">
                  <Megaphone size={20} strokeWidth={2} className="text-neutral-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-white truncate">
                    {isAr ? 'تفضيلات الإعلانات' : 'Ad preferences'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-600 flex-shrink-0" />
              </button>
            )}

          </div>

          {/* CARD 3: Manage accounts (Exact Screenshot 1 Match) */}
          {filteredItems.showManage && (
            <div 
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setActiveSubPage('manage_accounts');
              }}
              className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between cursor-pointer hover:bg-[#161619] active:bg-[#1A1A1E] tap-press transition-all shadow-sm"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 flex-shrink-0">
                  <User size={19} />
                </div>
                <span className="text-sm font-semibold text-white truncate">
                  {isAr ? 'إدارة الحسابات' : 'Manage accounts'}
                </span>
              </div>
              <Chevron size={18} className="text-neutral-500 flex-shrink-0 ml-2" />
            </div>
          )}

        </div>
      </div>
    </SwipeBackWrapper>
  );
}
