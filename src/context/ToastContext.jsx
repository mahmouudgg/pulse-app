import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';
import { hapticsService } from '../services/hapticsService';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 2400) => {
    if (!message) return;

    if (type === 'error') {
      hapticsService.error?.();
    } else if (type === 'info') {
      hapticsService.light?.();
    } else {
      hapticsService.success?.();
    }

    setToast({
      id: Date.now(),
      message,
      type
    });

    if (window._toastTimer) clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  useEffect(() => {
    window.showToast = showToast;
    return () => {
      delete window.showToast;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-3 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#121215]/95 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.85)] max-w-sm pointer-events-auto">
            {toast.type === 'success' && (
              <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">
                <Check size={11} className="stroke-[3]" />
              </div>
            )}
            {toast.type === 'error' && (
              <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={13} className="stroke-[2.5]" />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center flex-shrink-0">
                <Info size={13} className="stroke-[2.5]" />
              </div>
            )}
            <span className="text-xs font-medium text-white tracking-wide leading-tight">
              {toast.message}
            </span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg, type) => {
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast(msg, type);
        } else {
          console.log('[Toast]', msg);
        }
      }
    };
  }
  return ctx;
}
