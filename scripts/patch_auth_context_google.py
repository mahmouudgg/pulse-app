path = r'src/context/AuthContext.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
old_imp = "import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';"
new_imp = """import { GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';"""

if old_imp in text:
    text = text.replace(old_imp, new_imp)
    print("Updated imports in AuthContext.jsx")

# 2. Replace signInWithGoogle auth popup block
old_block = '''    if (!googleUser) {
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
    }'''

new_block = '''    if (!googleUser) {
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
    }'''

if old_block in text:
    text = text.replace(old_block, new_block)
    print("Replaced signInWithGoogle popup block (LF)")
elif old_block.replace('\n', '\r\n') in text:
    text = text.replace(old_block.replace('\n', '\r\n'), new_block)
    print("Replaced signInWithGoogle popup block (CRLF)")
else:
    print("old_block not matched in AuthContext.jsx")

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("AuthContext.jsx updated with native Google Sign-In.")
