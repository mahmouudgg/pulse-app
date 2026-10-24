import { notificationService } from './notificationService';

export const passwordAuditService = {
  // 1. Evaluate Password Security Strength
  evaluateStrength(password) {
    if (!password || typeof password !== 'string') {
      return {
        score: 0,
        isWeak: true,
        rules: {
          minLength: false,
          hasUpperLower: false,
          hasNumber: false,
          hasSymbol: false,
          notCommon: false
        }
      };
    }

    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasUpperLower = hasUpper && hasLower;
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    const commonPasswords = [
      '123456', '12345678', '123456789', 'password', 'qwerty',
      '111111', '000000', 'admin', 'welcome', 'pulse', 'pulse123',
      'abc123', 'iloveyou', 'secret', 'testing', 'letmein', 'monkey',
      'football', 'dragon', 'master', 'sunshine', 'princess', '654321'
    ];
    const notCommon = !commonPasswords.includes(password.trim().toLowerCase());

    let score = 0;
    if (minLength) score += 1;
    if (hasUpperLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSymbol) score += 1;

    // Password is weak if length < 8, or lacks variety, or is common
    const isWeak = !minLength || !notCommon || score < 3;

    return {
      score, // 0 to 4
      isWeak,
      rules: {
        minLength,
        hasUpperLower,
        hasNumber,
        hasSymbol,
        notCommon
      }
    };
  },

  // 2. Record password strength upon user authentication
  recordLoginPasswordAudit(currentUser, plainPassword) {
    if (!currentUser?.uid || !plainPassword) return;

    const evaluation = this.evaluateStrength(plainPassword);
    const weakKey = `pulse_weak_password_${currentUser.uid}`;

    if (evaluation.isWeak) {
      localStorage.setItem(weakKey, 'true');
      this.triggerAuditAlertIfNeeded(currentUser);
    } else {
      localStorage.removeItem(weakKey);
      this.resolveWeakPasswordAlert(currentUser.uid);
    }
  },

  // 3. Periodic Weak Password Audit Check (Facebook-style periodic security reminder)
  triggerAuditAlertIfNeeded(currentUser) {
    if (!currentUser?.uid) return;

    const isFlaggedWeak = 
      localStorage.getItem(`pulse_weak_password_${currentUser.uid}`) === 'true' || 
      Boolean(currentUser.isPasswordWeak);

    if (!isFlaggedWeak) return;

    // Periodic check interval: Every 7 days
    const auditKey = `pulse_last_weak_pwd_alert_${currentUser.uid}`;
    const lastAlertTime = parseInt(localStorage.getItem(auditKey) || '0', 10);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    if (now - lastAlertTime < SEVEN_DAYS_MS) {
      return;
    }

    try {
      notificationService.addNotification({
        targetUserId: currentUser.uid,
        type: 'weak_password_alert',
        actor: {
          uid: 'security_pulse',
          displayName: 'أمان PULSE',
          username: 'pulse_security',
          avatar: 'https://cdn-icons-png.flaticon.com/512/9422/9422891.png',
          isVerified: true
        },
        title: 'تنبيه أمان: كلمة المرور بحاجة للتحديث',
        text: 'تنبيه أمان دوري: كلمة المرور الخاصة بحسابك لا تلبي معايير الأمان الموصى بها. يرجى تحديثها لحماية حسابك من الاختراق.',
        action: 'change_password',
        status: 'pending'
      });

      localStorage.setItem(auditKey, String(now));
    } catch (err) {
      console.warn('triggerAuditAlertIfNeeded error:', err);
    }
  },

  // 4. Resolve and clear weak password state after successful update
  resolveWeakPasswordAlert(userId) {
    if (!userId) return;
    localStorage.removeItem(`pulse_weak_password_${userId}`);

    try {
      const notifs = notificationService.getNotifications(userId);
      const weakAlerts = (notifs || []).filter((n) => n.type === 'weak_password_alert' && n.status !== 'resolved');
      weakAlerts.forEach((alert) => {
        notificationService.updateNotificationById(userId, alert.id, { status: 'resolved' });
      });
    } catch (e) {
      console.warn('resolveWeakPasswordAlert error:', e);
    }
  },

  // 5. Check if a user currently has a weak password flag
  isUserPasswordWeak(userId) {
    if (!userId) return false;
    return localStorage.getItem(`pulse_weak_password_${userId}`) === 'true';
  }
};
