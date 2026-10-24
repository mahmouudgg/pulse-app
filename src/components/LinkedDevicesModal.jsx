import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  QrCode, 
  ShieldCheck, 
  LogOut, 
  X, 
  Check, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Camera, 
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { sessionService } from '../services/sessionService';
import { hapticsService } from '../services/hapticsService';

export default function LinkedDevicesModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Pending authorization confirmation state
  const [pendingRequest, setPendingRequest] = useState(null);
  const [authorizing, setAuthorizing] = useState(false);
  
  // Revoking session state
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const currentSessionId = sessionService.getCurrentSessionId();
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  // 1. Subscribe to live user sessions
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;
    setLoadingSessions(true);

    const unsubscribe = sessionService.subscribeToUserSessions(currentUser.uid, (list) => {
      setSessions(list || []);
      setLoadingSessions(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen, currentUser?.uid]);

  // 2. Camera handling for QR Scanner
  useEffect(() => {
    if (!isScanning) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isScanning]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanVideoFrame();
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      showToast(lang === 'ar' ? 'تعذر فتح الكاميرا، يرجى إدخال الرمز يدوياً' : 'Camera inaccessible, please use manual code entry');
      setShowManualInput(true);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Scanning loop (checking for barcode detector API or canvas fallback)
  const scanVideoFrame = () => {
    if (!videoRef.current || !isScanning) return;

    if (window.BarcodeDetector) {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      barcodeDetector.detect(videoRef.current)
        .then((barcodes) => {
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            handleDetectedCode(rawValue);
          } else {
            animFrameRef.current = requestAnimationFrame(scanVideoFrame);
          }
        })
        .catch(() => {
          animFrameRef.current = requestAnimationFrame(scanVideoFrame);
        });
    } else {
      // Periodic check or allow manual code
      animFrameRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  // Handle scanned or entered QR code string
  const handleDetectedCode = async (codeString) => {
    if (!codeString || pendingRequest) return;
    hapticsService.medium();
    setIsScanning(false);
    stopCamera();

    // Extract token from pulse://qr?token=xyz or raw token
    let token = codeString.trim();
    if (token.includes('token=')) {
      const params = new URLSearchParams(token.split('?')[1]);
      token = params.get('token') || token;
    }

    try {
      const details = await sessionService.getQrRequestDetails(token);
      setPendingRequest(details);
    } catch (err) {
      showToast(err.message || (lang === 'ar' ? 'رمز QR غير صالح' : 'Invalid QR Code'));
    }
  };

  // Approve Login
  const handleApprove = async () => {
    if (!pendingRequest?.token) return;
    setAuthorizing(true);
    hapticsService.success();
    try {
      await sessionService.authorizeQrLogin(pendingRequest.token, currentUser);
      showToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح على الجهاز الآخر!' : 'Login successfully authorized!');
      setPendingRequest(null);
    } catch (err) {
      showToast(err.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Authorization failed'));
    } finally {
      setAuthorizing(false);
    }
  };

  // Reject Login
  const handleReject = async () => {
    if (!pendingRequest?.token) return;
    hapticsService.light();
    try {
      await sessionService.rejectQrLogin(pendingRequest.token);
    } catch {}
    setPendingRequest(null);
    showToast(lang === 'ar' ? 'تم رفض طلب الدخول' : 'Login request rejected');
  };

  // Revoke single session
  const handleRevokeSingle = async (session) => {
    if (!session || !currentUser?.uid) return;
    setRevokingId(session.sessionId);
    hapticsService.medium();
    try {
      await sessionService.revokeSession(currentUser.uid, session.sessionId);
      showToast(lang === 'ar' ? `تم إنهاء جلسة ${session.deviceName}` : `Revoked ${session.deviceName}`);
    } catch (e) {
      showToast(lang === 'ar' ? 'تعذر إنهاء الجلسة' : 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  // Revoke all other sessions
  const handleRevokeAllOthers = async () => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من كافة الأجهزة والمتصفحات الأخرى؟' : 'Are you sure you want to log out of all other devices?')) {
      return;
    }
    setRevokingAll(true);
    hapticsService.heavy();
    try {
      await sessionService.revokeAllOtherSessions(currentUser.uid);
      showToast(lang === 'ar' ? 'تم إنهاء كافة الجلسات الأخرى بنجاح' : 'Logged out of all other devices');
    } catch (e) {
      showToast(lang === 'ar' ? 'فشل إنهاء الجلسات' : 'Failed to revoke sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  if (!isOpen) return null;

  const otherSessionsCount = sessions.filter(s => s.sessionId !== currentSessionId && s.status === 'active').length;

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-center items-center bg-black/85 backdrop-blur-md animate-fade-in p-0 sm:p-4 select-none">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-[#0E0E11] border-t sm:border border-[#222226] rounded-t-[32px] sm:rounded-3xl p-4 sm:p-6 animate-sheet-up shadow-2xl flex flex-col max-h-[90vh] pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 tap-press"
            >
              <X size={20} />
            </button>
            <h2 className="text-base font-bold text-white">
              {lang === 'ar' ? 'الأجهزة المرتبطة والجلسات' : 'Linked Devices & Sessions'}
            </h2>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">
            <Laptop size={16} />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto no-scrollbar py-4 space-y-5 flex-1">
          {/* Hero Action Card: Link a Device */}
          <div className="bg-gradient-to-br from-[#16161B] to-[#121215] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <QrCode size={30} strokeWidth={2.5} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {lang === 'ar' ? 'استخدم PULSE على أجهزة أخرى' : 'Use PULSE on Other Devices'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mb-4 leading-relaxed">
              {lang === 'ar' 
                ? 'امسح رمز الاستجابة السريعة (QR) الظاهر على موقع الويب أو حاسوبك لتسجيل الدخول فورياً دون إدخال كلمة المرور.' 
                : 'Scan the QR code shown on the PULSE website or your computer to log in instantly without entering your password.'}
            </p>

            <button
              onClick={() => {
                hapticsService.medium();
                setIsScanning(true);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-white text-black text-xs font-extrabold hover:bg-neutral-200 tap-press transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Camera size={16} />
              <span>{lang === 'ar' ? 'مسح رمز الـ QR لربط جهاز' : 'Scan QR Code to Link Device'}</span>
            </button>
          </div>

          {/* Active Sessions List */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-white" />
                <span>{lang === 'ar' ? 'الأجهزة والجلسات النشطة' : 'Active Devices & Sessions'}</span>
              </h4>
              <span className="text-[11px] font-mono text-neutral-500">
                {sessions.filter(s => s.status === 'active').length} {lang === 'ar' ? 'أجهزة' : 'devices'}
              </span>
            </div>

            {loadingSessions ? (
              <div className="py-8 text-center text-xs text-neutral-500 font-mono">
                {lang === 'ar' ? 'جاري التحقق من الجلسات...' : 'Verifying active sessions...'}
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500 bg-[#121215] rounded-2xl border border-white/5">
                {lang === 'ar' ? 'لا توجد جلسات أخرى مسجلة.' : 'No other active sessions found.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((sess) => {
                  const isCurrent = sess.sessionId === currentSessionId;
                  const isRevoked = sess.status === 'revoked';
                  const isMobile = sess.deviceType === 'mobile';
                  const isTablet = sess.deviceType === 'tablet';

                  return (
                    <div
                      key={sess.sessionId}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        isCurrent 
                          ? 'bg-white/[0.04] border-white/20' 
                          : isRevoked 
                            ? 'bg-black/40 border-white/5 opacity-50' 
                            : 'bg-[#121216] border-[#222226] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isCurrent ? 'bg-white text-black' : 'bg-white/10 text-white'
                        }`}>
                          {isTablet ? <Tablet size={18} /> : isMobile ? <Smartphone size={18} /> : <Laptop size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {sess.deviceName || (isMobile ? 'الهاتف المحمول' : 'جهاز الكمبيوتر')}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white text-black font-mono flex-shrink-0">
                                {lang === 'ar' ? 'هذا الجهاز' : 'THIS DEVICE'}
                              </span>
                            )}
                            {isRevoked && (
                              <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                                {lang === 'ar' ? 'منتهية' : 'REVOKED'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={11} className="text-neutral-500 flex-shrink-0" />
                              <span className="truncate">{sess.location || 'مصر'}</span>
                            </span>
                            <span className="flex items-center gap-1 flex-shrink-0 font-mono text-[10px] text-neutral-500">
                              <Clock size={11} />
                              <span>{isCurrent ? (lang === 'ar' ? 'نشط الآن' : 'Active Now') : new Date(sess.lastActive || sess.firstLogin || Date.now()).toLocaleDateString('ar-EG')}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Log out of this device */}
                      {!isCurrent && !isRevoked && (
                        <button
                          onClick={() => handleRevokeSingle(sess)}
                          disabled={revokingId === sess.sessionId}
                          className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 tap-press transition-colors flex-shrink-0 ml-2"
                        >
                          {revokingId === sess.sessionId 
                            ? (lang === 'ar' ? 'جاري الخروج...' : 'Revoking...') 
                            : (lang === 'ar' ? 'تسجيل الخروج' : 'Log Out')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Revoke all other sessions button */}
          {otherSessionsCount > 0 && (
            <div className="pt-2">
              <button
                onClick={handleRevokeAllOthers}
                disabled={revokingAll}
                className="w-full py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold tap-press transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={15} />
                <span>
                  {revokingAll 
                    ? (lang === 'ar' ? 'جاري إنهاء الجلسات...' : 'Logging out other devices...') 
                    : (lang === 'ar' ? `تسجيل الخروج من كل الأجهزة الأخرى (${otherSessionsCount})` : `Log out from all other devices (${otherSessionsCount})`)}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= CAMERA QR SCANNER VIEWPORT MODAL ================= */}
      {isScanning && (
        <div className="fixed inset-0 z-[100000] bg-black/95 flex flex-col justify-between items-center p-4">
          <div className="w-full max-w-md flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <QrCode size={18} />
              <span>{lang === 'ar' ? 'مسح رمز PULSE QR' : 'Scan PULSE QR Code'}</span>
            </span>
            <button
              onClick={() => {
                setIsScanning(false);
                stopCamera();
              }}
              className="p-2 rounded-full bg-white/10 text-white tap-press"
            >
              <X size={20} />
            </button>
          </div>

          {/* Central Camera Viewfinder */}
          <div className="relative w-72 h-72 rounded-3xl overflow-hidden border-2 border-white/40 shadow-[0_0_60px_rgba(255,255,255,0.15)] flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Animated Laser Scanning Line */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_white]" style={{
              top: '50%',
              transform: 'translateY(-50%)'
            }} />
          </div>

          {/* Scanner Instructions & Manual Code Option */}
          <div className="w-full max-w-md pb-[max(2rem,env(safe-area-inset-bottom))] text-center space-y-3">
            <p className="text-xs text-neutral-400">
              {lang === 'ar' 
                ? 'وجه الكاميرا نحو رمز الاستجابة السريعة الظاهر على شاشة المتصفح' 
                : 'Point camera at the QR code displayed on the browser screen'}
            </p>

            <button
              onClick={() => {
                setIsScanning(false);
                stopCamera();
                setShowManualInput(true);
              }}
              className="text-xs text-neutral-300 hover:text-white underline font-mono"
            >
              {lang === 'ar' ? 'أو أدخل الرمز يدوياً' : 'Or enter pairing code manually'}
            </button>
          </div>
        </div>
      )}

      {/* ================= MANUAL CODE ENTRY MODAL ================= */}
      {showManualInput && (
        <div className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121215] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound size={16} />
                <span>{lang === 'ar' ? 'إدخال رمز الربط يدوياً' : 'Enter Pairing Code'}</span>
              </span>
              <button onClick={() => setShowManualInput(false)} className="p-1 text-neutral-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              {lang === 'ar' ? 'انسخ الرمز الظاهر أسفل الـ QR في شاشة الموقع وألصقه هنا:' : 'Paste the pairing code shown below the QR on the website:'}
            </p>

            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="pulse_qr_..."
              className="w-full p-3 rounded-xl bg-black border border-white/20 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white"
            />

            <button
              onClick={() => {
                if (manualToken.trim()) {
                  setShowManualInput(false);
                  handleDetectedCode(manualToken.trim());
                }
              }}
              className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press"
            >
              {lang === 'ar' ? 'تحقق ومتابعة' : 'Verify & Proceed'}
            </button>
          </div>
        </div>
      )}

      {/* ================= PENDING LOGIN AUTHORIZATION CONFIRMATION ================= */}
      {pendingRequest && (
        <div className="fixed inset-0 z-[100001] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121216] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5 animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              {pendingRequest.requester?.deviceType === 'mobile' ? (
                <Smartphone size={30} strokeWidth={2.2} />
              ) : pendingRequest.requester?.deviceType === 'tablet' ? (
                <Tablet size={30} strokeWidth={2.2} />
              ) : (
                <Laptop size={30} strokeWidth={2.2} />
              )}
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">
                {lang === 'ar' ? 'طلب تسجيل دخول جديد' : 'New Login Request'}
              </h3>
              <p className="text-xs text-neutral-400">
                {lang === 'ar' ? 'هل أنت من يحاول تسجيل الدخول إلى حساب PULSE الخاص بك على هذا الجهاز؟' : 'Are you trying to log into your PULSE account on this device?'}
              </p>
            </div>

            {/* Requester Device Info Box */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{lang === 'ar' ? 'الجهاز المتصل:' : 'Device:'}</span>
                <span className="font-bold text-white">{pendingRequest.requester?.deviceName || 'Web Browser'}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{lang === 'ar' ? 'نظام التشغيل:' : 'OS:'}</span>
                <span className="font-mono">{pendingRequest.requester?.os || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{lang === 'ar' ? 'الموقع التقريبي:' : 'Location:'}</span>
                <span className="flex items-center gap-1 font-semibold text-white">
                  <MapPin size={12} className="text-neutral-400" />
                  <span>{pendingRequest.requester?.location || 'مصر'}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span className="text-neutral-500">{lang === 'ar' ? 'عنوان الشبكة:' : 'IP:'}</span>
                <span className="font-mono text-neutral-400">{pendingRequest.requester?.ip || 'مخفي'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleReject}
                disabled={authorizing}
                className="flex-1 py-3 rounded-2xl bg-[#1C1C20] hover:bg-[#25252A] text-neutral-300 text-xs font-bold tap-press transition-colors"
              >
                {lang === 'ar' ? 'رفض وإلغاء' : 'Deny & Cancel'}
              </button>

              <button
                onClick={handleApprove}
                disabled={authorizing}
                className="flex-1 py-3 rounded-2xl bg-white text-black hover:bg-neutral-200 text-xs font-bold tap-press transition-colors flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Check size={16} className="stroke-[3]" />
                <span>{authorizing ? (lang === 'ar' ? 'جاري التأكيد...' : 'Authorizing...') : (lang === 'ar' ? 'موافقة والدخول' : 'Authorize Login')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  ) : null;
}
