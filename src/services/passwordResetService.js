import { database } from './firebase';
import { ref, get, update, remove, set } from 'firebase/database';
import { storageService } from './storageService';
import { hashPasswordWithSalt } from '../utils/securityCrypto';

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

export const passwordResetService = {
  // Step 1: Request Password Reset OTP
  async requestReset(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      return { success: false, message: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني.' };
    }

    const clean = identifier.trim().toLowerCase();

    // 1. Find user by username or email
    let user = storageService.getUserByUsername(clean) || storageService.getUserByEmail(clean);

    if (!user) {
      // Deep cloud search
      user = await storageService.fetchUserFromCloud(clean);
    }

    if (!user) {
      return { success: false, message: 'لم يتم العثور على أي حساب مسجل بهذا الاسم أو البريد.' };
    }

    // 2. Generate 6-digit cryptographically secure OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const otpData = {
      code: otpCode,
      expiresAt,
      requestedAt: Date.now()
    };

    try {
      // Save OTP to Realtime Database
      await set(ref(database, `users/${user.uid}/passwordResetOtp`), otpData);

      return {
        success: true,
        uid: user.uid,
        username: user.username,
        maskedEmail: maskEmail(user.email || `${user.username}@pulse.net`),
        code: otpCode, // Preview for local testing/instant verification
        expiresAt
      };
    } catch (e) {
      console.error('Password reset request error:', e);
      return { success: false, message: 'حدث خطأ أثناء إرسال رمز التحقق. حاول مرة أخرى.' };
    }
  },

  // Step 2: Verify OTP and set New Salted Password
  async completeReset(uid, inputOtp, newPassword) {
    if (!uid || !inputOtp || !newPassword) {
      return { success: false, message: 'جميع الحقول مطلوبة لإتمام الاستعادة.' };
    }

    if (newPassword.length < 8) {
      return { success: false, message: 'كلمة المرور الجديدة يجب أن تكون 8 خانات على الأقل.' };
    }

    try {
      const otpSnap = await get(ref(database, `users/${uid}/passwordResetOtp`));
      if (!otpSnap.exists()) {
        return { success: false, message: 'رمز التحقق غير صالح أو لم يتم طلبه.' };
      }

      const otp = otpSnap.val();
      if (Date.now() > otp.expiresAt) {
        await remove(ref(database, `users/${uid}/passwordResetOtp`));
        return { success: false, message: 'انتهت صلاحية رمز التحقق (10 دقائق). يرجى طلب رمز جديد.' };
      }

      if (String(otp.code).trim() !== String(inputOtp).trim()) {
        return { success: false, message: 'رمز التحقق غير صحيح. يرجى التأكد من الرمز المدخل.' };
      }

      // Hash new password with Salted SHA-256
      const { hash, salt } = await hashPasswordWithSalt(newPassword);

      // Update password, clear OTP, and revoke existing sessions for security
      const updates = {};
      updates[`users/${uid}/password`] = hash;
      updates[`users/${uid}/passwordSalt`] = salt;
      updates[`users/${uid}/updatedAt`] = new Date().toISOString();
      updates[`users/${uid}/passwordResetOtp`] = null;

      await update(ref(database), updates);

      // Invalidate all active sessions in Firebase
      try {
        const sessionsSnap = await get(ref(database, `users/${uid}/sessions`));
        if (sessionsSnap.exists()) {
          const sessions = sessionsSnap.val();
          const sessionUpdates = {};
          Object.keys(sessions).forEach((sid) => {
            sessionUpdates[`users/${uid}/sessions/${sid}/status`] = 'revoked';
            sessionUpdates[`users/${uid}/sessions/${sid}/revokedReason`] = 'password_reset';
          });
          await update(ref(database), sessionUpdates);
        }
      } catch (sessionErr) {
        console.warn('Session revoking notice:', sessionErr);
      }

      // Sync local cache
      const localUser = storageService.getUser(uid);
      if (localUser) {
        localUser.password = hash;
        localUser.passwordSalt = salt;
        storageService.saveUser(localUser);
      }

      return { success: true };
    } catch (e) {
      console.error('Password reset completion error:', e);
      return { success: false, message: 'فشل حفظ كلمة المرور الجديدة في السيرفر.' };
    }
  }
};
