import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { socialGraphService } from '../services/socialGraphService';
import { sessionService } from '../services/sessionService';
import { antiAbuseEngine } from '../services/antiAbuseEngine';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { hashPassword, verifyPassword, isPasswordHashed, sanitizeInput } from '../utils/securityCrypto';
import { verifyTOTP, verifyAndConsumeBackupCode } from '../utils/totpService';

import { multiAccountService } from '../services/multiAccountService';
import { hapticsService } from '../services/hapticsService';
import { passwordAuditService } from '../services/passwordAuditService';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pulse_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [savedAccounts, setSavedAccounts] = useState(() => multiAccountService.getSavedAccounts());

  useEffect(() => {
    storageService.init();
    if (currentUser) {
      try {
        localStorage.setItem('pulse_session_user', JSON.stringify(currentUser));
        multiAccountService.saveAccount(currentUser);
        setSavedAccounts(multiAccountService.getSavedAccounts());
      } catch (e) {
        console.warn('pulse_session_user save notice:', e);
      }
    } else {
      try {
        localStorage.removeItem('pulse_session_user');
      } catch (e) {
        console.warn(e);
      }
    }
  }, [currentUser]);

  // Track unread notifications for all saved accounts
  useEffect(() => {
    const handleAccountsChanged = (e) => {
      if (e.detail) setSavedAccounts(e.detail);
    };
    window.addEventListener('pulse_saved_accounts_changed', handleAccountsChanged);

    const accounts = multiAccountService.getSavedAccounts();
    accounts.forEach((acc) => {
      multiAccountService.trackAccountUnread(acc.uid, (uid, unread) => {
        setSavedAccounts(multiAccountService.getSavedAccounts());
      });
    });

    return () => {
      window.removeEventListener('pulse_saved_accounts_changed', handleAccountsChanged);
    };
  }, []);

  // Live Firebase Realtime Sync for currentUser (Ban, Verification, Profile)
  useEffect(() => {
    if (!currentUser?.uid) return;

    let isMounted = true;
    const unsubscribe = storageService.subscribeToUser(currentUser.uid, (liveUser) => {
      if (!isMounted) return;
      if (liveUser) {
        setCurrentUser((prev) => {
          // If the user has logged out or session is null, never resurrect
          if (!prev || !prev.uid) return null;

          const liveBookmarks = Array.isArray(liveUser.bookmarks)
            ? liveUser.bookmarks.filter((v) => typeof v === 'string')
            : (typeof liveUser.bookmarks === 'object' && liveUser.bookmarks ? Object.values(liveUser.bookmarks).filter((v) => typeof v === 'string') : []);

          const liveFollowing = Array.isArray(liveUser.following)
            ? liveUser.following
            : (typeof liveUser.following === 'object' && liveUser.following ? Object.values(liveUser.following) : []);

          const liveFollowers = Array.isArray(liveUser.followers)
            ? liveUser.followers
            : (typeof liveUser.followers === 'object' && liveUser.followers ? Object.values(liveUser.followers) : []);

          const isDifferent =
            Boolean(prev.isBanned) !== Boolean(liveUser.isBanned) ||
            Boolean(prev.isVerified) !== Boolean(liveUser.isVerified) ||
            (liveUser.avatar !== undefined && prev.avatar !== liveUser.avatar) ||
            (liveUser.displayName !== undefined && prev.displayName !== liveUser.displayName) ||
            (liveUser.username !== undefined && prev.username !== liveUser.username) ||
            (liveUser.bio !== undefined && prev.bio !== liveUser.bio) ||
            (liveUser.pioneerNumber !== undefined && prev.pioneerNumber !== liveUser.pioneerNumber) ||
            (liveUser.isPioneer !== undefined && prev.isPioneer !== liveUser.isPioneer) ||
            (liveUser.followersCount !== undefined && prev.followersCount !== liveUser.followersCount) ||
            (liveUser.followingCount !== undefined && prev.followingCount !== liveUser.followingCount) ||
            (liveUser.trustScore !== undefined && prev.trustScore !== liveUser.trustScore) ||
            (liveUser.location !== undefined && prev.location !== liveUser.location) ||
            (liveUser.website !== undefined && prev.website !== liveUser.website) ||
            (liveUser.phone !== undefined && prev.phone !== liveUser.phone) ||
            (liveUser.verificationStatus && prev.verificationStatus !== liveUser.verificationStatus) ||
            JSON.stringify(prev.bookmarks || []) !== JSON.stringify(liveBookmarks) ||
            JSON.stringify(prev.following || []) !== JSON.stringify(liveFollowing) ||
            JSON.stringify(prev.followers || []) !== JSON.stringify(liveFollowers);

          if (isDifferent) {
            const merged = {
              ...prev,
              ...liveUser,
              bio: liveUser.bio !== undefined ? liveUser.bio : (prev.bio || ''),
              pioneerNumber: liveUser.pioneerNumber !== undefined ? liveUser.pioneerNumber : prev.pioneerNumber,
              isPioneer: typeof liveUser.isPioneer === 'boolean' ? liveUser.isPioneer : prev.isPioneer,
              followersCount: liveUser.followersCount !== undefined ? liveUser.followersCount : (liveFollowers.length || prev.followersCount || 0),
              followingCount: liveUser.followingCount !== undefined ? liveUser.followingCount : (liveFollowing.length || prev.followingCount || 0),
              isBanned: Boolean(liveUser.isBanned),
              isVerified: Boolean(liveUser.isVerified),
              following: liveFollowing,
              followers: liveFollowers,
              bookmarks: liveBookmarks
            };
            try {
              localStorage.setItem('pulse_session_user', JSON.stringify(merged));
            } catch {
              // ignore
            }
            return merged;
          }
          return prev;
        });
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.uid]);

  // Live Active Session Registration & Remote Revocation Listener
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Register current session in Firebase
    sessionService.registerCurrentSession(currentUser);

    // Periodic Weak Password Audit Check (Facebook-style periodic security reminder)
    passwordAuditService.triggerAuditAlertIfNeeded(currentUser);

    // Listen if this session is revoked remotely by another device
    const unsubscribeRevocation = sessionService.subscribeToCurrentSessionStatus(currentUser.uid, () => {
      logout();
      try {
        sessionStorage.setItem('pulse_revoked_notice', 'تم إنهاء هذه الجلسة وتسجيل الخروج عن بُعد من جهاز آخر.');
      } catch {}
    });

    return () => {
      if (typeof unsubscribeRevocation === 'function') unsubscribeRevocation();
    };
  }, [currentUser?.uid]);

  // Strong password validator
  const validatePassword = (password) => {
    if (!password || password.length < 8) {
      return { valid: false, message: 'كلمة المرور يجب أن تكون 8 خانات على الأقل.' };
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber) {
      return { 
        valid: false, 
        message: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام (مثال: Pulse@2026).' 
      };
    }
    return { valid: true };
  };

  // Unique username validator
  // Unique username validator
  const validateUsername = (username) => {
    if (!username || username.length < 2) {
      return { valid: false, message: 'اسم المستخدم يجب أن يكون حرفين على الأقل.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { valid: false, message: 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام وعلامة _ فقط.' };
    }
    const existing = storageService.getUserByUsername(username);
    if (existing && (!currentUser || existing.uid !== currentUser.uid)) {
      return { valid: false, message: 'اسم المستخدم هذا محجوز مسبقاً، اختر اسماً آخر.' };
    }
    return { valid: true };
  };

  // Age validator (minimum 13 years old)
  const validateBirthDate = (birthDateString) => {
    if (!birthDateString) {
      return { valid: false, message: 'يرجى تحديد تاريخ ميلادك.' };
    }
    const birth = new Date(birthDateString);
    if (isNaN(birth.getTime())) {
      return { valid: false, message: 'تاريخ الميلاد غير صالح.' };
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 13) {
      return { valid: false, message: 'عذراً، يجب أن يكون عمرك 13 عاماً أو أكثر للتسجيل في منصة PULSE.' };
    }
    if (age > 120) {
      return { valid: false, message: 'يرجى إدخال تاريخ ميلاد صحيح.' };
    }
    return { valid: true, age };
  };

  // Register with Strict Real Uniqueness Check & Anti-Abuse Shield
  const register = async ({ email = '', username, displayName, password, phone = '', countryCode = '+20', birthDate = '', birthDatePrivacy = 'public', honeypot = '' }) => {
    let cleanPhone = phone ? String(phone).trim().replace(/[\s\-\(\)]/g, '') : '';
    // 0. Strict 6-Month Device Ban Verification
    const deviceBan = await antiAbuseEngine.checkDeviceBan();
    if (deviceBan.isBanned) {
      throw new Error('تم حظر هذا الجهاز لمدة 6 أشهر بسبب انتهاكات أمنية سابقة، ولا يمكن استخدامه لإنشاء حسابات جديدة.');
    }

    // 0.0 Anti-Bot Honeypot check
    if (honeypot && honeypot.trim().length > 0) {
      throw new Error('تم إلغاء التسجيل الآلي بنجاح.');
    }

    // 0.1 Device Account Quota check (Max 3 accounts per physical device)
    const quota = antiAbuseEngine.checkDeviceAccountQuota(3);
    if (!quota.allowed) {
      throw new Error(quota.message);
    }

    const effectiveEmail = (email && email.trim()) 
      ? email.trim().toLowerCase() 
      : (cleanPhone ? `${cleanPhone}@phone.pulse.app` : `user_${Date.now()}@pulse.app`);

    // 0.2 Disposable / Temp-Mail check
    if (email && antiAbuseEngine.isDisposableEmail(email)) {
      throw new Error('يرجى استخدام بريد إلكتروني حقيقي ودائم (مثل Gmail أو iCloud أو Outlook). نطاقات البريد المؤقت غير مقبولة في مجتمع PULSE.');
    }

    // 0.3 Silent Proof-of-Work Challenge (throttles bot factories without OTP friction)
    await antiAbuseEngine.solveProofOfWork(effectiveEmail);

    // 1. Username syntax check
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      throw new Error(usernameCheck.message);
    }

    // 2. Strict Live Username check against Firebase Cloud
    const isUsernameFree = await storageService.checkUsernameAvailable(username);
    if (!isUsernameFree) {
      throw new Error('اسم المستخدم محجوز بالفعل على شبكة PULSE، يرجى اختيار اسم آخر.');
    }

    // 3. Password check
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.message);
    }

    // 4. Strict Live Email check against Firebase Cloud
    if (email && email.trim()) {
      const isEmailFree = await storageService.checkEmailAvailable(email);
      if (!isEmailFree) {
        throw new Error('هذا البريد الإلكتروني مسجل بالفعل على منصة PULSE.');
      }
    }

    // 5. Phone check if provided
    cleanPhone = phone ? String(phone).trim().replace(/[\s\-\(\)]/g, '') : '';
    let fullPhone = '';
    if (cleanPhone) {
      fullPhone = cleanPhone.startsWith('+') ? cleanPhone : `${countryCode}${cleanPhone.replace(/^0+/, '')}`;
      const isPhoneFree = await storageService.checkPhoneAvailable(fullPhone);
      if (!isPhoneFree) {
        throw new Error('رقم الهاتف هذا مسجل بالفعل بحساب آخر على PULSE.');
      }
    }

    // 6. Birthday check
    if (birthDate) {
      const birthCheck = validateBirthDate(birthDate);
      if (!birthCheck.valid) {
        throw new Error(birthCheck.message);
      }
    }

    const nextPioneer = storageService.getNextPioneerNumber();
    const hashedPassword = await hashPassword(password);
    const deviceFp = await antiAbuseEngine.getDeviceFingerprint();

    const newUser = {
      uid: 'user_' + Date.now(),
      email: effectiveEmail,
      username: username.trim().toLowerCase(),
      displayName: sanitizeInput(displayName, 50).trim() || username.trim(),
      password: hashedPassword,
      phone: cleanPhone || '',
      countryCode: countryCode || '+20',
      fullPhone: fullPhone || '',
      birthDate: birthDate || '',
      birthDatePrivacy: birthDatePrivacy || 'public', // 'public' | 'followers' | 'private'
      avatar: DEFAULT_AVATAR,
      bio: '',
      website: '',
      location: 'CAIRO, EGYPT',
      isVerified: false,
      isFounder: false,
      isBanned: false,
      isPioneer: nextPioneer !== null,
      pioneerNumber: nextPioneer,
      verificationStatus: 'none',
      deviceFingerprint: deviceFp,
      trustScore: 45,
      trustTier: 'standard',
      followersCount: 0,
      followingCount: 0,
      following: [],
      followers: [],
      bookmarks: [],
      usernameLastChangedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(newUser);
    antiAbuseEngine.recordAccountCreation(newUser.username);
    setCurrentUser(newUser);
    return newUser;
  };

  // Login via Email, Username, OR Phone Number with Cryptographic Verification & Auto-Upgrade
  const login = async (identifier, password) => {
    const raw = (identifier || '').trim();
    const query = raw.toLowerCase();
    const cleanPhone = raw.replace(/[\s\-\(\)]/g, '');

    if (!raw || !password) {
      throw new Error('يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور.');
    }

    // 0. Strict 6-Month Device Ban Verification (Instant Hardware Check)
    const deviceBan = await antiAbuseEngine.checkDeviceBan();
    if (deviceBan.isBanned) {
      throw new Error(`DEVICE_BANNED: تم حظر هذا الجهاز لمدة 6 أشهر لمخالفة معايير الأمان (متبقي: ${deviceBan.remainingDays} يوم و ${deviceBan.remainingHours} ساعة).`);
    }

    // 0.1 Account Lockout Check (Anti-Brute-Force: 5 failed attempts -> 15 min lock)
    const cleanTarget = query.replace(/[^a-z0-9_]/g, '_');
    const lockout = await antiAbuseEngine.checkAccountLockout(cleanTarget);
    if (lockout.isLocked) {
      throw new Error(`تم تجميد محاولات الدخول لهذا الحساب مؤقتاً لمدة 15 دقيقة لحمايته من هجمات التخمين. يرجى الانتظار (المتبقي: ${lockout.remainingMinutes} دقيقة).`);
    }

    // 1. Fast path: check local storage cache
    let users = storageService.getUsers();
    let candidates = users.filter((u) => {
      if (u.email?.toLowerCase() === query) return true;
      if (u.username?.toLowerCase() === query) return true;
      if (u.uid?.toLowerCase() === query) return true;
      if (u.phone && (u.phone === raw || u.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone)) return true;
      if (u.fullPhone && (u.fullPhone === raw || u.fullPhone.replace(/[\s\-\(\)]/g, '') === cleanPhone)) return true;
      return false;
    });

    let user = null;
    for (const candidate of candidates) {
      const isValid = await verifyPassword(password, candidate.password);
      if (isValid) {
        user = candidate;
        break;
      }
    }

    // 2. Direct Cloud Query Fallback (Firebase Realtime Database)
    if (!user) {
      try {
        const cloudUser = await storageService.fetchUserFromCloud(raw);
        if (cloudUser) {
          const isValid = await verifyPassword(password, cloudUser.password);
          if (isValid) {
            user = cloudUser;
            storageService.saveUser(cloudUser);
          }
        }
      } catch (cloudErr) {
        console.warn('Cloud login lookup notice:', cloudErr);
      }
    }

    // 3. Fallback for Founder official account
    if (!user && (query === 'my' || query === 'mahmoud@pulse.app')) {
      const isFounderPass = await verifyPassword(password, 'Mahmoud.15');
      if (isFounderPass) {
        user = storageService.getUserByUsername('my');
        if (user) storageService.saveUser(user);
      }
    }

    // If authentication failed: Record attempt and enforce lockout & 6-month hardware ban
    if (!user) {
      const attemptResult = await antiAbuseEngine.recordFailedAttempt(cleanTarget, raw);
      if (attemptResult.deviceBanned) {
        throw new Error('تم تجاوز الحد الأقصى للمحاولات (5 محاولات خاطئة). تم تجميد الحساب لمدة 15 دقيقة، وتم حظر هذا الجهاز كلياً لمدة 6 أشهر.');
      } else {
        throw new Error(`بيانات الدخول أو كلمة المرور غير صحيحة. متبقي ${attemptResult.remainingAttempts} محاولات قبل تجميد الحساب 15 دقيقة وحظر الجهاز لمدة 6 أشهر.`);
      }
    }

    // Authentication succeeded: Clear failed attempts
    antiAbuseEngine.clearFailedAttempts(cleanTarget);
    if (user.username) {
      antiAbuseEngine.clearFailedAttempts(user.username.toLowerCase());
    }

    // Automatic silent security upgrade for legacy plaintext passwords
    if (!isPasswordHashed(user.password)) {
      try {
        const upgradedHash = await hashPassword(password);
        user.password = upgradedHash;
        storageService.saveUser(user);
      } catch (err) {
        console.warn('Password rehash upgrade notice:', err);
      }
    }

    const isFounder = user.isFounder || user.username === 'my';
    const isOfficial = user.username === 'my' || user.username === 'pulse' || user.username === 'sovythos' || user.uid === 'dev_mahmoud_yasser';
    const safeUser = {
      ...user,
      isBanned: Boolean(user.isBanned),
      isVerified: Boolean(user.isVerified || isOfficial),
      isFounder,
      isPioneer: isOfficial ? false : (typeof user.isPioneer === 'boolean' ? user.isPioneer : true),
      pioneerNumber: isOfficial ? null : (user.pioneerNumber || storageService.getUserPioneerNumber(user)),
      following: Array.isArray(user.following) ? user.following : [],
      followers: Array.isArray(user.followers) ? user.followers : [],
      bookmarks: Array.isArray(user.bookmarks) ? user.bookmarks : []
    };

    // 2FA Challenge Check: If enabled and secret key exists, require 6-digit TOTP code
    if (user.twoFactorEnabled && user.totpSecret) {
      return {
        requires2FA: true,
        tempUser: safeUser
      };
    }

    try {
      localStorage.setItem('pulse_session_user', JSON.stringify(safeUser));
    } catch {}

    passwordAuditService.recordLoginPasswordAudit(safeUser, password);

    setCurrentUser(safeUser);
    return safeUser;
  };

  // Verify and complete 2FA Login via TOTP 6-digit code or Backup Recovery Code
  const verify2FALogin = async (tempUser, tokenOrBackupCode) => {
    if (!tempUser || !tempUser.totpSecret) {
      throw new Error('بيانات الحساب أو التحقق غير صالحة.');
    }

    const cleanInput = String(tokenOrBackupCode || '').trim();
    if (!cleanInput) {
      throw new Error('يرجى إدخال رمز التحقق أو كود الاسترداد.');
    }

    // 1. Check TOTP 6-digit code from Google/Microsoft Authenticator
    if (/^\d{6}$/.test(cleanInput)) {
      const totpRes = await verifyTOTP(cleanInput, tempUser.totpSecret);
      if (totpRes.valid) {
        try {
          localStorage.setItem('pulse_session_user', JSON.stringify(tempUser));
        } catch {}
        setCurrentUser(tempUser);
        return tempUser;
      }
    }

    // 2. Check Single-Use Backup Recovery Code
    const backupRes = verifyAndConsumeBackupCode(cleanInput, tempUser.totpBackupCodes || []);
    if (backupRes.valid) {
      const updatedUser = {
        ...tempUser,
        totpBackupCodes: backupRes.remainingCodes
      };
      storageService.saveUser(updatedUser);
      try {
        localStorage.setItem('pulse_session_user', JSON.stringify(updatedUser));
      } catch {}
      setCurrentUser(updatedUser);
      return updatedUser;
    }

    throw new Error('رمز التحقق من تطبيق Google Authenticator أو كود الاسترداد غير صحيح.');
  };

  // Sign in or Register via Google (Full Real Integration & Conflict Prevention)
  const signInWithGoogle = async (options = {}) => {
    const { customBirthDate, customUsername, cachedUser } = options;

    // 0. Strict 6-Month Device Ban Verification
    const deviceBan = await antiAbuseEngine.checkDeviceBan();
    if (deviceBan.isBanned) {
      throw new Error(`DEVICE_BANNED: تم حظر هذا الجهاز لمدة 6 أشهر لمخالفة معايير الأمان (متبقي: ${deviceBan.remainingDays} يوم و ${deviceBan.remainingHours} ساعة).`);
    }

    let googleUser = cachedUser;

    if (!googleUser) {
      if (Capacitor.isNativePlatform()) {
        try {
          GoogleAuth.initialize({
            clientId: '455923436884-fjcpldhrojf4ic03h4cpmbscg97pvlce.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true
          });
          const nativeUser = await GoogleAuth.signIn();
          const idToken = nativeUser?.authentication?.idToken;
          if (!idToken) {
            throw new Error('تعذر استلام رمز المصادقة من Google.');
          }
          const credential = GoogleAuthProvider.credential(idToken);
          const result = await signInWithCredential(auth, credential);
          googleUser = result.user;
          if (nativeUser.imageUrl && !googleUser.photoURL) {
            googleUser.photoURL = nativeUser.imageUrl;
          }
          if (nativeUser.name && !googleUser.displayName) {
            googleUser.displayName = nativeUser.name;
          }
        } catch (nativeErr) {
          console.warn('Native GoogleAuth notice:', nativeErr);
          const msg = (nativeErr?.message || '').toLowerCase();
          if (msg.includes('12501') || msg.includes('cancel') || msg.includes('cancelled')) {
            throw new Error('تم إلغاء تسجيل الدخول عبر Google.');
          }
          throw new Error(nativeErr.message || 'فشل تسجيل الدخول بحساب Google على هذا الجهاز.');
        }
      } else {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        provider.setCustomParameters({
          prompt: 'select_account'
        });

        try {
          const result = await signInWithPopup(auth, provider);
          googleUser = result.user;
        } catch (authError) {
          if (authError.code === 'auth/popup-closed-by-user') {
            throw new Error('تم إلغاء تسجيل الدخول عبر Google من قبل المستخدم.');
          } else if (authError.code === 'auth/popup-blocked') {
            throw new Error('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة ثم إعادة المحاولة.');
          } else if (authError.code === 'auth/unauthorized-domain') {
            throw new Error('النطاق الحالي غير مصرح به في إعدادات Google OAuth في Firebase.');
          } else if (authError.code === 'auth/network-request-failed') {
            throw new Error('تعذر الاتصال بخوادم Google. يرجى التحقق من اتصال الإنترنت.');
          }
          throw new Error(authError.message || 'حدث خطأ أثناء تسجيل الدخول بحساب Google.');
        }
      }
    }

    if (!googleUser || !googleUser.email) {
      throw new Error('تعذر استرداد بيانات البريد الإلكتروني من حساب Google.');
    }

    const email = googleUser.email.trim().toLowerCase();

    // 1. Conflict Prevention Gate: Does an existing account have this email?
    const existingUser = await storageService.findUserByEmailAsync(email);

    if (existingUser) {
      // Existing user: Sign in directly into existing account!
      if (existingUser.isBanned) {
        throw new Error('هذا الحساب محظور بسبب انتهاك معايير المجتمع.');
      }

      // Seamlessly populate Google photo if user has default avatar
      const photo = googleUser.photoURL ? googleUser.photoURL.replace('=s96-c', '=s400-c') : null;
      const updatedUser = {
        ...existingUser,
        googleId: googleUser.uid,
        emailVerified: true,
        avatar: (!existingUser.avatar || existingUser.avatar === DEFAULT_AVATAR) && photo ? photo : existingUser.avatar,
        updatedAt: new Date().toISOString()
      };

      storageService.saveUser(updatedUser);

      const safeUser = {
        ...updatedUser,
        isBanned: Boolean(updatedUser.isBanned),
        isVerified: Boolean(updatedUser.isVerified || updatedUser.isFounder),
        following: Array.isArray(updatedUser.following) ? updatedUser.following : [],
        followers: Array.isArray(updatedUser.followers) ? updatedUser.followers : [],
        bookmarks: Array.isArray(updatedUser.bookmarks) ? updatedUser.bookmarks : []
      };

      try {
        localStorage.setItem('pulse_session_user', JSON.stringify(safeUser));
        multiAccountService.saveAccount(safeUser);
      } catch {}

      setCurrentUser(safeUser);
      return { isNewUser: false, user: safeUser };
    }

    // 2. New User: Check if birthdate is provided
    const photo = googleUser.photoURL ? googleUser.photoURL.replace('=s96-c', '=s400-c') : DEFAULT_AVATAR;
    const initialSuggestedUsername = await storageService.generateUniqueUsernameFromEmail(email);

    if (!customBirthDate) {
      return {
        isNewUser: true,
        needsBirthDate: true,
        cachedUser: googleUser,
        googleProfile: {
          email,
          displayName: googleUser.displayName || initialSuggestedUsername,
          photoURL: photo,
          suggestedUsername: initialSuggestedUsername,
          googleUid: googleUser.uid
        }
      };
    }

    // 3. Complete new account registration
    const birthCheck = validateBirthDate(customBirthDate);
    if (!birthCheck.valid) {
      throw new Error(birthCheck.message);
    }

    // Validate custom username if edited, otherwise use suggested
    let finalUsername = customUsername ? customUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : initialSuggestedUsername;
    const usernameCheck = validateUsername(finalUsername);
    if (!usernameCheck.valid) {
      finalUsername = await storageService.generateUniqueUsernameFromEmail(email);
    } else {
      const isFree = await storageService.checkUsernameAvailable(finalUsername);
      if (!isFree) {
        finalUsername = await storageService.generateUniqueUsernameFromEmail(email);
      }
    }

    // Device quota check
    const quota = antiAbuseEngine.checkDeviceAccountQuota(3);
    if (!quota.allowed) {
      throw new Error(quota.message);
    }

    const nextPioneer = storageService.getNextPioneerNumber();
    const deviceFp = await antiAbuseEngine.getDeviceFingerprint();
    const secureRandomPassword = await hashPassword('GAuth_' + googleUser.uid + '_' + Date.now());

    const newUser = {
      uid: 'user_g_' + Date.now(),
      googleId: googleUser.uid,
      email,
      username: finalUsername,
      displayName: sanitizeInput(googleUser.displayName || finalUsername, 50).trim(),
      password: secureRandomPassword,
      phone: '',
      countryCode: '+20',
      fullPhone: '',
      birthDate: customBirthDate,
      birthDatePrivacy: 'public',
      avatar: photo,
      bio: '',
      website: '',
      location: 'CAIRO, EGYPT',
      isVerified: false,
      isFounder: false,
      isBanned: false,
      isPioneer: nextPioneer !== null,
      pioneerNumber: nextPioneer,
      verificationStatus: 'none',
      deviceFingerprint: deviceFp,
      trustScore: 60,
      trustTier: 'verified_email',
      followersCount: 0,
      followingCount: 0,
      following: [],
      followers: [],
      bookmarks: [],
      authProvider: 'google',
      usernameLastChangedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(newUser);
    antiAbuseEngine.recordAccountCreation(newUser.username);

    try {
      localStorage.setItem('pulse_session_user', JSON.stringify(newUser));
      multiAccountService.saveAccount(newUser);
    } catch {}

    setCurrentUser(newUser);
    return { isNewUser: true, user: newUser };
  };

  // Change Username with 14-day rule
  const changeUsername = (newUsername) => {
    if (!currentUser) return;

    const trimmed = newUsername.trim().toLowerCase();
    if (trimmed === currentUser.username.toLowerCase()) return;

    // 14-day rule check
    if (currentUser.usernameLastChangedAt) {
      const lastChanged = new Date(currentUser.usernameLastChangedAt).getTime();
      const diffDays = Math.floor((Date.now() - lastChanged) / (1000 * 60 * 60 * 24));
      if (diffDays < 14) {
        const remainingDays = 14 - diffDays;
        throw new Error(`لا يمكنك تغيير اسم المستخدم إلا مرة واحدة كل 14 يوماً. المتبقي: ${remainingDays} يوم.`);
      }
    }

    const check = validateUsername(trimmed);
    if (!check.valid) throw new Error(check.message);

    const updated = {
      ...currentUser,
      username: trimmed,
      usernameLastChangedAt: new Date().toISOString()
    };
    storageService.saveUser(updated);
    setCurrentUser(updated);
  };

  // Change Password with cryptographic current password verification & hashing
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    if (!currentUser) return;

    const storedUser = storageService.getUser(currentUser.uid) || currentUser;
    const userPass = storedUser.password || currentUser.password;

    const isCurrentValid = await verifyPassword(currentPassword, userPass);
    if (!isCurrentValid) {
      throw new Error('كلمة المرور الحالية غير صحيحة.');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('تأكيد كلمة المرور غير متطابق.');
    }

    const check = validatePassword(newPassword);
    if (!check.valid) throw new Error(check.message);

    const hashedNew = await hashPassword(newPassword);
    const updated = {
      ...currentUser,
      ...storedUser,
      password: hashedNew,
      passwordLastChangedAt: Date.now()
    };
    storageService.saveUser(updated);
    setCurrentUser(updated);
    passwordAuditService.resolveWeakPasswordAlert(currentUser.uid);
  };

  // Switch Account (PULSE Official Instant Account Switching - Strict Device Auth Protected)
  const switchAccount = (targetUid) => {
    if (!targetUid || targetUid === currentUser?.uid) return false;
    try { hapticsService.medium?.(); } catch {}

    // HARD SECURITY GATE: Account MUST be explicitly saved and authenticated on THIS device!
    const saved = multiAccountService.getSavedAccounts();
    const authorizedAccount = saved.find((a) => a.uid === targetUid);
    if (!authorizedAccount) {
      console.error('[SECURITY ENFORCEMENT] Unauthorized account switch blocked! Target account is not authenticated on this device:', targetUid);
      return false;
    }

    // Save departing account state
    if (currentUser) {
      multiAccountService.saveAccount(currentUser);
    }

    const allUsers = storageService.getUsers();
    let targetUser = allUsers.find((u) => u.uid === targetUid) || authorizedAccount;
    if (!targetUser) {
      console.warn('Switch account: target user not found:', targetUid);
      return false;
    }

    if (targetUser.isBanned) {
      console.warn('[Security Gate] Cannot switch to banned account:', targetUid);
      return false;
    }

    const isFounder = targetUser.isFounder || targetUser.username === 'my';
    const isOfficial = targetUser.username === 'my' || targetUser.username === 'pulse' || targetUser.username === 'sovythos' || targetUser.uid === 'dev_mahmoud_yasser';
    const safeUser = {
      ...targetUser,
      isBanned: Boolean(targetUser.isBanned),
      isVerified: Boolean(targetUser.isVerified || isOfficial),
      isFounder,
      isPioneer: isOfficial ? false : (typeof targetUser.isPioneer === 'boolean' ? targetUser.isPioneer : true),
      pioneerNumber: isOfficial ? null : (targetUser.pioneerNumber || storageService.getUserPioneerNumber(targetUser)),
      following: Array.isArray(targetUser.following) ? targetUser.following : [],
      followers: Array.isArray(targetUser.followers) ? targetUser.followers : [],
      bookmarks: Array.isArray(targetUser.bookmarks) ? targetUser.bookmarks : []
    };

    try {
      localStorage.setItem('pulse_session_user', JSON.stringify(safeUser));
    } catch {}

    setCurrentUser(safeUser);
    multiAccountService.saveAccount(safeUser);
    setSavedAccounts(multiAccountService.getSavedAccounts());
    return true;
  };

  // Remove a saved account from this device's memory
  const removeSavedAccount = (targetUid) => {
    if (!targetUid) return;
    multiAccountService.removeAccount(targetUid);
    const remaining = multiAccountService.getSavedAccounts();
    setSavedAccounts(remaining);

    if (currentUser?.uid === targetUid) {
      try {
        localStorage.removeItem('pulse_session_user');
        sessionStorage.removeItem('pulse_session_user');
      } catch {}
      setCurrentUser(null);
    }
  };

  // Logout (Single Account or All Accounts - Instagram / Threads Architecture)
  const logout = (all = false) => {
    try {
      localStorage.removeItem('pulse_session_user');
      sessionStorage.removeItem('pulse_session_user');
      localStorage.removeItem('pulse_guest_mode');
    } catch (e) {
      console.warn('Error clearing active session:', e);
    }

    if (all) {
      try {
        localStorage.removeItem('pulse_saved_accounts_v1');
      } catch {}
      setSavedAccounts([]);
    } else {
      // Keep saved accounts remembered for 1-tap re-login
      const freshSaved = multiAccountService.getSavedAccounts();
      setSavedAccounts(freshSaved);
    }

    // Terminate current session cleanly without auto-switching
    setCurrentUser(null);
  };

  // Update Profile
  const updateProfile = (updates) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    storageService.saveUser(updated);
    setCurrentUser(updated);
  };

  // Request Official Verification
  const requestVerification = (notes = '') => {
    if (!currentUser) return;
    storageService.requestVerification(currentUser.uid, notes);
    const updated = { ...currentUser, verificationStatus: 'pending' };
    setCurrentUser(updated);
  };

  // Toggle Bookmark
  const toggleBookmark = (postId) => {
    if (!currentUser) return false;
    const isBookmarked = storageService.toggleBookmark(postId, currentUser);
    const users = storageService.getUsers();
    const freshUser = users.find((u) => u.uid === currentUser.uid);
    if (freshUser) {
      setCurrentUser(freshUser);
    }
    return isBookmarked;
  };

  // Toggle Follow
  const toggleFollow = (targetUserId) => {
    if (!currentUser) return false;
    const isNowFollowing = storageService.toggleFollow(targetUserId, currentUser);
    const users = storageService.getUsers();
    const freshUser = users.find((u) => u.uid === currentUser.uid);
    if (freshUser) {
      setCurrentUser(freshUser);
    }
    return isNowFollowing;
  };

  // Silent Remove Follower (PULSE Native Style)
  const removeFollower = (followerUid) => {
    if (!currentUser) return false;
    const res = socialGraphService.removeFollower(followerUid, currentUser.uid);
    const users = storageService.getUsers();
    const freshUser = users.find((u) => u.uid === currentUser.uid);
    if (freshUser) {
      setCurrentUser(freshUser);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        savedAccounts,
        switchAccount,
        removeSavedAccount,
        register,
        login,
        verify2FALogin,
        logout,
        updateProfile,
        changeUsername,
        changePassword,
        requestVerification,
        toggleBookmark,
        toggleFollow,
        removeFollower,
        signInWithGoogle,
        validateUsername,
        validatePassword,
        validateBirthDate
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
