import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, Delete, Shield, AlertCircle } from 'lucide-react';
import { biometricLockService } from '../services/biometricLockService';
import { hapticsService } from '../services/hapticsService';

export default function AppLockScreen({ onUnlock, lang = 'ar' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const isAr = lang === 'ar';

  useEffect(() => {
    biometricLockService.isBiometricAvailable().then((avail) => {
      setHasBiometrics(avail && biometricLockService.isBiometricEnabled());
      // Auto-trigger biometric prompt if enabled
      if (avail && biometricLockService.isBiometricEnabled()) {
        triggerBiometricAuth();
      }
    });
  }, []);

  const triggerBiometricAuth = async () => {
    try {
      hapticsService.light?.();
      const res = await biometricLockService.authenticateBiometrics();
      if (res.success) {
        hapticsService.success?.();
        onUnlock();
      }
    } catch {
      // fallback to PIN
    }
  };

  const handleKeyPress = async (digit) => {
    if (pin.length >= 4 || isVerifying) return;
    hapticsService.selection?.();
    const nextPin = pin + digit;
    setPin(nextPin);
    setError('');

    if (nextPin.length === 4) {
      setIsVerifying(true);
      const isValid = await biometricLockService.verifyPin(nextPin);
      if (isValid) {
        hapticsService.success?.();
        onUnlock();
      } else {
        hapticsService.error?.();
        setError(isAr ? 'رمز المرور غير صحيح. حاول مجدداً.' : 'Incorrect passcode. Try again.');
        setTimeout(() => {
          setPin('');
          setIsVerifying(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      hapticsService.light?.();
      setPin(pin.slice(0, -1));
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black text-white flex flex-col items-center justify-between p-6 sm:p-8 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="pt-8 sm:pt-12 text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto shadow-2xl">
          <Lock size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {isAr ? 'تطبيق PULSE مقفل' : 'PULSE is Locked'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {isAr ? 'أدخل رمز المرور المكون من 4 أرقام للمتابعة' : 'Enter 4-digit passcode to continue'}
          </p>
        </div>
      </div>

      {/* PIN Dots Display */}
      <div className="space-y-4 text-center my-auto">
        <div className="flex items-center justify-center gap-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.7)]'
                    : 'bg-neutral-800 border border-neutral-700'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 animate-shake">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Keypad */}
      <div className="w-full max-w-xs pb-6 sm:pb-8 space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(String(digit))}
              className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-xl font-bold font-mono text-white flex items-center justify-center tap-press transition-colors shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics button */}
          <button
            type="button"
            onClick={triggerBiometricAuth}
            disabled={!hasBiometrics}
            className={`w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center transition-colors ${
              hasBiometrics
                ? 'bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-neutral-300 tap-press'
                : 'opacity-0 pointer-events-none'
            }`}
            title={isAr ? 'فتح بالبصمة / Face ID' : 'Unlock with Biometrics'}
          >
            <Fingerprint size={28} />
          </button>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-xl font-bold font-mono text-white flex items-center justify-center tap-press transition-colors shadow-sm"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center tap-press transition-colors shadow-sm"
            title={isAr ? 'حذف' : 'Delete'}
          >
            <Delete size={22} className={isAr ? '-scale-x-100' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
