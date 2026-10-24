import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Download, QrCode, Copy, Share2, Check, ExternalLink, 
  Camera, Image as ImageIcon, Flashlight, RefreshCw, User, Search
} from 'lucide-react';
import QRCode from 'qrcode';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import VerifiedBadge from './VerifiedBadge';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export const ProfileQrShareModal = ({ isOpen, onClose, user, onOpenUserProfile }) => {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isAr = lang === 'ar';

  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  const [activeTab, setActiveTab] = useState('card'); // 'card' | 'scanner'
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Scanner states
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualUsername, setManualUsername] = useState('');
  const [scannedResult, setScannedResult] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const username = user?.username || 'user';
  const displayName = user?.displayName || user?.name || username;
  const avatarUrl = user?.avatar || DEFAULT_AVATAR;
  const isVerified = Boolean(user?.isVerified);
  
  // Official live web URL
  const profileUrl = `https://pulseeg.wuaze.com/${encodeURIComponent(username)}`;

  // Generate high-resolution PULSE-Style QR code
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateQR = async () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 512;
        canvas.width = size;
        canvas.height = size;

        // Generate QR code with Level H error correction (allows 30% area overlay)
        await QRCode.toCanvas(canvas, profileUrl, {
          width: size,
          margin: 2,
          color: {
            dark: '#FFFFFF',
            light: '#0D0D10'
          },
          errorCorrectionLevel: 'H'
        });

        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const badgeRadius = 46;

        // Draw center circular badge
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, badgeRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#0D0D10';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#222228';
        ctx.stroke();

        // Draw circular inner pulse badge
        ctx.beginPath();
        ctx.arc(center, center, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Load official pulse logo or fallback pulse icon
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';

        logoImg.onload = () => {
          if (!isMounted) return;
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, badgeRadius - 4, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(
            logoImg,
            center - (badgeRadius - 4),
            center - (badgeRadius - 4),
            (badgeRadius - 4) * 2,
            (badgeRadius - 4) * 2
          );
          ctx.restore();

          if (isMounted) {
            setQrDataUrl(canvas.toDataURL('image/png'));
            setIsGenerating(false);
          }
        };

        logoImg.onerror = () => {
          if (!isMounted) return;
          // Clean vector fallback icon inside center
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('P', center, center);

          setQrDataUrl(canvas.toDataURL('image/png'));
          setIsGenerating(false);
        };

        logoImg.src = '/pulse_logo_clean.png';
      } catch (err) {
        console.warn('QR generation error:', err);
        if (isMounted) setIsGenerating(false);
      }
    };

    generateQR();

    return () => {
      isMounted = false;
    };
  }, [isOpen, profileUrl]);

  // Clean camera scanner lifecycle
  useEffect(() => {
    if (!isOpen || activeTab !== 'scanner') {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, cameraFacing]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError(isAr ? 'الكاميرا غير مدعومة على هذا المتصفح' : 'Camera not supported on this browser');
        setHasCameraPermission(false);
        return;
      }

      const constraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play warning:', e));
      }

      // Start continuous barcode detection loop
      startDetectionLoop();
    } catch (err) {
      console.warn('Camera access error:', err);
      setHasCameraPermission(false);
      setCameraError(
        isAr 
          ? 'تعذر الوصول للكاميرا. يرجى منح إذن الكاميرا أو استخدام مسح صورة من المعرض.' 
          : 'Unable to access camera. Please allow camera permission or pick an image.'
      );
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities?.torch) {
        const nextTorch = !isTorchOn;
        await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
        setIsTorchOn(nextTorch);
      } else {
        showToast(isAr ? 'الفلاش غير مدعوم على هذه الكاميرا' : 'Torch not supported on this camera');
      }
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const toggleCameraFacing = () => {
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Continuous frame analysis
  const startDetectionLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let detector = null;
    if (hasBarcodeDetector) {
      try {
        // eslint-disable-next-line no-undef
        detector = new BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        detector = null;
      }
    }

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        if (detector) {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawVal = barcodes[0].rawValue;
            handleDetectedCode(rawVal);
          }
        }
      } catch (e) {
        // Silently continue scanning frames
      }
    }, 400);
  };

  // Extract username from scanned text/url
  const extractUsername = (text) => {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();

    // Pattern 1: pulseeg.wuaze.com/XYZ or pulseeg.wuaze.com/?user=XYZ
    const urlMatch = clean.match(/[?&]user=([a-zA-Z0-9_]+)/i) || clean.match(/pulseeg\.wuaze\.com\/@?([a-zA-Z0-9_]+)/i);
    if (urlMatch && urlMatch[1]) return urlMatch[1];

    // Pattern 2: https://pulse.app/u/XYZ or /@XYZ
    const pathMatch = clean.match(/(?:pulse\.app|\/u\/|@)([a-zA-Z0-9_]+)/i);
    if (pathMatch && pathMatch[1]) return pathMatch[1];

    // Pattern 3: @username
    if (clean.startsWith('@')) return clean.replace(/^@+/, '');

    // Pattern 4: direct username (alphanumeric with underscores 2-35 chars)
    if (/^[a-zA-Z0-9_]{2,35}$/.test(clean)) return clean;

    return null;
  };

  const handleDetectedCode = async (rawValue) => {
    const extracted = extractUsername(rawValue);
    if (!extracted) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {}

    setScannedResult(extracted);
    stopCamera();

    showToast(isAr ? `تم العثور على @${extracted}!` : `Found @${extracted}!`);

    setTimeout(() => {
      onClose();
      if (typeof onOpenUserProfile === 'function') {
        onOpenUserProfile(extracted);
      }
    }, 600);
  };

  // Scan from photo uploaded from gallery
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
      showToast(isAr ? 'جارٍ تحليل الصورة...' : 'Analyzing image...');

      const img = new Image();
      const reader = new FileReader();

      reader.onload = async (readerEvent) => {
        img.onload = async () => {
          if ('BarcodeDetector' in window) {
            try {
              // eslint-disable-next-line no-undef
              const detector = new BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await detector.detect(img);
              if (barcodes && barcodes.length > 0) {
                handleDetectedCode(barcodes[0].rawValue);
                return;
              }
            } catch (err) {
              console.warn('BarcodeDetector error on file:', err);
            }
          }

          showToast(
            isAr 
              ? 'لم يتم العثور على رمز QR صالح في الصورة. جرب إدخال اسم المستخدم يدوياً.' 
              : 'No valid QR code found in image. Try manual search.'
          );
        };
        img.src = readerEvent.target.result;
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('File upload read error:', err);
      showToast(isAr ? 'حدث خطأ أثناء قراءة الصورة' : 'Error reading image');
    }
  };

  // Manual username navigation
  const handleManualSubmit = (e) => {
    e?.preventDefault();
    const clean = manualUsername.trim().replace(/^@+/, '');
    if (!clean) return;

    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    onClose();
    if (typeof onOpenUserProfile === 'function') {
      onOpenUserProfile(clean);
    }
  };

  // Copy Profile Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
      setCopied(true);
      showToast(isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied successfully');
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      showToast(isAr ? 'فشل نسخ الرابط' : 'Failed to copy link');
    }
  };

  // Share profile link via system dialog
  const handleShareTo = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}

    try {
      await Share.share({
        title: `حساب ${displayName} على PULSE`,
        text: isAr ? `تابع @${username} على منصة PULSE:` : `Follow @${username} on PULSE:`,
        url: profileUrl,
        dialogTitle: isAr ? 'مشاركة الملف الشخصي' : 'Share Profile'
      });
    } catch (err) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `حساب ${displayName} على PULSE`,
            text: isAr ? `تابع @${username} على منصة PULSE:` : `Follow @${username} on PULSE:`,
            url: profileUrl
          });
        } catch {}
      } else {
        handleCopyLink();
      }
    }
  };

  // Download High-Resolution Obsidian Card (Native Android + Web)
  const handleDownloadCard = async () => {
    if (isDownloading || !qrDataUrl) return;
    setIsDownloading(true);

    try {
      try { Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
      showToast(isAr ? 'جارٍ إنشاء البطاقة الفاخرة...' : 'Generating card...');

      const width = 1080;
      const height = 1520;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // 1. Pitch Obsidian Background with Subtle Radial Gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 3, 50, width / 2, height / 2, width);
      bgGrad.addColorStop(0, '#151518');
      bgGrad.addColorStop(1, '#070709');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Luxurious Border with Soft Glow
      ctx.strokeStyle = '#232328';
      ctx.lineWidth = 6;
      const cardMargin = 40;
      const cardRadius = 56;
      ctx.beginPath();
      ctx.roundRect(cardMargin, cardMargin, width - (cardMargin * 2), height - (cardMargin * 2), cardRadius);
      ctx.stroke();

      // Inner subtle border
      ctx.strokeStyle = '#18181D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardMargin + 10, cardMargin + 10, width - ((cardMargin + 10) * 2), height - ((cardMargin + 10) * 2), cardRadius - 8);
      ctx.stroke();

      // 3. Brand Header
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PULSE', width / 2, 160);

      ctx.fillStyle = '#666670';
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('PROFILE PASS', width / 2, 205);
      ctx.letterSpacing = '0px';

      // 4. User Avatar with Golden/White Ring
      const avatarSize = 150;
      const avatarY = 320;
      const avatarImg = new Image();
      avatarImg.crossOrigin = 'anonymous';

      await new Promise((resolve) => {
        avatarImg.onload = () => {
          ctx.save();
          // Circular shadow
          ctx.beginPath();
          ctx.arc(width / 2, avatarY, (avatarSize / 2) + 6, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          // Clip image
          ctx.beginPath();
          ctx.arc(width / 2, avatarY, avatarSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(avatarImg, (width / 2) - (avatarSize / 2), avatarY - (avatarSize / 2), avatarSize, avatarSize);
          ctx.restore();
          resolve();
        };
        avatarImg.onerror = () => {
          // Fallback circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(width / 2, avatarY, avatarSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = '#222228';
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 60px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayName.charAt(0) || 'P', width / 2, avatarY);
          ctx.restore();
          resolve();
        };
        avatarImg.src = avatarUrl;
      });

      // 5. User Names
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(displayName, width / 2, 450);

      ctx.fillStyle = '#8E8E98';
      ctx.font = '500 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`@${username}`, width / 2, 505);

      // 6. Draw QR Code in Center Card Area
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';

      await new Promise((resolve) => {
        qrImg.onload = () => {
          const qrDrawSize = 640;
          const qrDrawY = 560;

          // QR Code Card Container with Rounded Corners
          ctx.save();
          ctx.fillStyle = '#0D0D10';
          ctx.beginPath();
          ctx.roundRect((width - qrDrawSize - 40) / 2, qrDrawY - 20, qrDrawSize + 40, qrDrawSize + 40, 36);
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#222228';
          ctx.stroke();

          // Draw QR Image
          ctx.drawImage(qrImg, (width - qrDrawSize) / 2, qrDrawY, qrDrawSize, qrDrawSize);
          ctx.restore();
          resolve();
        };
        qrImg.onerror = resolve;
        qrImg.src = qrDataUrl;
      });

      // 7. Footer Instructions
      ctx.fillStyle = '#777782';
      ctx.font = '400 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isAr ? 'امسح الرمز بواسطة كاميرا الهاتف للانتقال للملف مباشرة' : 'Scan with mobile camera to visit profile',
        width / 2,
        1320
      );

      ctx.fillStyle = '#3E3E48';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`pulseeg.wuaze.com/${username}`, width / 2, 1370);

      // 8. Export & Save Image
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const filename = `pulse-pass-${username}-${Date.now()}.png`;

      // Native Android / iOS via Capacitor
      if (Capacitor.isNativePlatform()) {
        try {
          const fileResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Cache
          });

          await Share.share({
            title: `بطاقة @${username} على PULSE`,
            url: fileResult.uri,
            dialogTitle: isAr ? 'حفظ أو مشاركة بطاقة الملف الشخصي' : 'Save or Share Profile Pass'
          });

          showToast(isAr ? 'تم تجهيز البطاقة للحفظ والمشاركة!' : 'Pass ready to save or share!');
        } catch (nativeErr) {
          console.warn('Native write fallback:', nativeErr);
          // Try fallback to Documents
          try {
            const saved = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Documents
            });
            showToast(isAr ? 'تم حفظ البطاقة في المستندات' : 'Saved to Documents');
          } catch (e2) {
            showToast(isAr ? 'تم إنشاء البطاقة بنجاح' : 'Card generated successfully');
          }
        }
      } else {
        // Desktop / Web Browser Fallback
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(isAr ? 'تم تنزيل البطاقة بنجاح!' : 'Card downloaded successfully!');
      }
    } catch (err) {
      console.error('Download card error:', err);
      showToast(isAr ? 'حدث خطأ أثناء تنزيل البطاقة' : 'Error downloading card');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 bg-black/85 backdrop-blur-md animate-fade-in"
      style={backdropStyle}
      onClick={onClose}
    >
      <div
        {...containerProps}
        className="w-full max-w-[480px] max-h-[92vh] overflow-y-auto no-scrollbar bg-[#121214] border-t sm:border border-[#222226] rounded-t-[36px] sm:rounded-[36px] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-white shadow-2xl animate-slide-up flex flex-col items-center select-none will-change-transform"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top sheet pull handle */}
        <div className="w-10 h-1 bg-[#333338] rounded-full mb-4 cursor-grab active:cursor-grabbing"></div>

        {/* Header with Title and Close Button */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-white/80" />
            <h2 className="text-base font-bold text-white tracking-wide">
              {isAr ? 'بطاقة الرمز السريع' : 'Profile Pass'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1F1F23] hover:bg-[#28282D] active:scale-95 text-neutral-400 hover:text-white flex items-center justify-center transition-all tap-press"
          >
            <X size={18} />
          </button>
        </div>

        {/* PULSE-Style Segmented Switcher (Pass / Scanner) */}
        <div className="w-full flex p-1 bg-[#18181C] border border-[#24242A] rounded-2xl mb-5">
          <button
            onClick={() => {
              try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
              setActiveTab('card');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 tap-press ${
              activeTab === 'card'
                ? 'bg-[#282830] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <QrCode size={15} />
            <span>{isAr ? 'بطاقتي' : 'My Pass'}</span>
          </button>

          <button
            onClick={() => {
              try { Haptics.impact({ style: ImpactStyle.Light }); } catch {}
              setActiveTab('scanner');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 tap-press ${
              activeTab === 'scanner'
                ? 'bg-[#282830] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Camera size={15} />
            <span>{isAr ? 'ماسح الرمز' : 'Scan QR'}</span>
          </button>
        </div>

        {/* TAB 1: MY PASS (Obsidian Card View) */}
        {activeTab === 'card' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* The Obsidian Card Preview */}
            <div className="w-full bg-[#18181A] border border-[#26262B] rounded-[32px] p-6 flex flex-col items-center shadow-2xl relative overflow-hidden">
              {/* Subtle glossy gradient header */}
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

              {/* User Avatar & Info */}
              <div className="flex flex-col items-center text-center relative z-10 mb-4">
                <div className="relative mb-2.5">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#2E2E36] shadow-lg"
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                  {isVerified && (
                    <div className="absolute -bottom-1 -right-1 border-2 border-[#18181A] rounded-full">
                      <VerifiedBadge size={16} />
                    </div>
                  )}
                </div>

                <h3 className="text-white font-bold text-base tracking-wide flex items-center justify-center gap-1.5 mt-1">
                  <span>{displayName}</span>
                  {isVerified && <VerifiedBadge size={14} />}
                </h3>
                <span className="text-neutral-400 text-xs font-mono tracking-normal block mt-0.5" dir="ltr">
                  @{username}
                </span>
              </div>

              {/* QR Code Graphic Frame */}
              <div className="w-60 h-60 sm:w-64 sm:h-64 bg-[#0D0D10] border border-[#24242A] rounded-3xl p-3 flex items-center justify-center relative shadow-inner my-1">
                {qrDataUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={qrDataUrl}
                      alt={`QR code for @${username}`}
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-xs">{isAr ? 'جارٍ توليد الرمز...' : 'Generating code...'}</span>
                  </div>
                )}
              </div>

              {/* Minimal Brand Footer */}
              <div className="mt-4 text-center">
                <span className="text-[11px] text-neutral-500 tracking-wider uppercase font-semibold">
                  {isAr ? 'امسح بواسطة الكاميرا للمتابعة فوراً' : 'Scan with camera to connect on PULSE'}
                </span>
              </div>

              {/* Action Buttons Inside Card */}
              <div className="w-full grid grid-cols-2 gap-2.5 mt-5">
                <button
                  onClick={handleDownloadCard}
                  disabled={isDownloading || !qrDataUrl}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#24242A] hover:bg-[#2C2C34] active:scale-95 transition-all text-white text-xs font-bold border border-white/5 tap-press disabled:opacity-50"
                >
                  <Download size={16} />
                  <span>{isDownloading ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'تنزيل البطاقة' : 'Download Pass')}</span>
                </button>

                <button
                  onClick={handleShareTo}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#24242A] hover:bg-[#2C2C34] active:scale-95 transition-all text-white text-xs font-bold border border-white/5 tap-press"
                >
                  <Share2 size={16} />
                  <span>{isAr ? 'مشاركة' : 'Share'}</span>
                </button>
              </div>
            </div>

            {/* Copy Link Row */}
            <div className="w-full mt-3 bg-[#18181A] border border-[#26262B] rounded-2xl overflow-hidden">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between p-3.5 hover:bg-[#202024] active:bg-[#24242A] transition-colors tap-press"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#24242A] flex items-center justify-center text-white flex-shrink-0">
                    {copied ? <Check size={16} className="text-white" /> : <Copy size={16} />}
                  </div>
                  <div className="text-start min-w-0">
                    <span className="text-white font-semibold text-xs block">
                      {copied ? (isAr ? 'تم نسخ الرابط بنجاح' : 'Link copied') : (isAr ? 'نسخ رابط الملف الشخصي' : 'Copy profile link')}
                    </span>
                    <span className="text-neutral-500 text-[11px] font-mono truncate max-w-[220px] block" dir="ltr">
                      pulseeg.wuaze.com/{username}
                    </span>
                  </div>
                </div>
                {copied ? (
                  <span className="text-xs text-white font-bold bg-white/10 px-2 py-1 rounded-md">{isAr ? 'تم' : 'Done'}</span>
                ) : (
                  <ExternalLink size={15} className="text-neutral-500" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SCANNER (Live Camera Viewfinder + Gallery + Manual Search) */}
        {activeTab === 'scanner' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Viewfinder Card */}
            <div className="w-full bg-[#18181A] border border-[#26262B] rounded-[32px] p-5 flex flex-col items-center relative overflow-hidden shadow-2xl">
              
              {/* Camera Stream Box */}
              <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-[#2C2C34]">
                {/* Real Live Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Futuristic Threads Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Outer dimmed border */}
                  <div className="w-52 h-52 sm:w-56 sm:h-56 relative border-2 border-white/20 rounded-3xl">
                    {/* Glowing Corner Brackets */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl" />

                    {/* Animated Laser Scanning Beam */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_#ffffff] animate-laser" />
                  </div>
                </div>

                {/* Camera Error or Permission Notice */}
                {cameraError && (
                  <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center space-y-3 z-20">
                    <Camera size={32} className="text-neutral-500" />
                    <p className="text-xs text-neutral-300 max-w-[240px] leading-relaxed">
                      {cameraError}
                    </p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl active:scale-95 transition-all"
                    >
                      {isAr ? 'إعادة المحاولة' : 'Try Again'}
                    </button>
                  </div>
                )}

                {/* Scanned Result Success Flash */}
                {scannedResult && (
                  <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center space-y-2 z-30 animate-fade-in">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center">
                      <Check size={24} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-bold text-white">@{scannedResult}</span>
                    <span className="text-xs text-neutral-400">{isAr ? 'جارٍ فتح الحساب...' : 'Opening profile...'}</span>
                  </div>
                )}
              </div>

              {/* Viewfinder Controls (Flip, Torch, Gallery) */}
              <div className="flex items-center gap-4 mt-4">
                <button
                  onClick={toggleCameraFacing}
                  className="w-10 h-10 rounded-full bg-[#24242A] hover:bg-[#2C2C34] active:scale-90 text-white flex items-center justify-center transition-all border border-white/5"
                  title={isAr ? 'تبديل الكاميرا' : 'Switch camera'}
                >
                  <RefreshCw size={17} />
                </button>

                <button
                  onClick={toggleTorch}
                  className={`w-10 h-10 rounded-full active:scale-90 flex items-center justify-center transition-all border border-white/5 ${
                    isTorchOn ? 'bg-white text-black' : 'bg-[#24242A] text-white hover:bg-[#2C2C34]'
                  }`}
                  title={isAr ? 'تشغيل الفلاش' : 'Flashlight'}
                >
                  <Flashlight size={17} />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-[#24242A] hover:bg-[#2C2C34] active:scale-90 text-white flex items-center justify-center transition-all border border-white/5"
                  title={isAr ? 'اختيار صورة من المعرض' : 'Upload from gallery'}
                >
                  <ImageIcon size={17} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <p className="text-center text-xs text-neutral-400 mt-3 max-w-[280px]">
                {isAr 
                  ? 'وجّه الكاميرا نحو رمز PULSE لمسحه تلقائياً أو ارفع لقطة شاشة من المعرض'
                  : 'Point camera at any PULSE QR code or upload from gallery'}
              </p>
            </div>

            {/* Manual Username Direct Search (Fail-Safe) */}
            <div className="w-full mt-3 bg-[#18181A] border border-[#26262B] rounded-2xl p-3.5">
              <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">@</span>
                  <input
                    type="text"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    placeholder={isAr ? 'أو اكتب اسم المستخدم للانتقال...' : 'Or enter username...'}
                    className="w-full bg-[#121214] border border-[#24242A] rounded-xl ps-8 pe-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualUsername.trim()}
                  className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-bold active:scale-95 transition-all disabled:opacity-40"
                >
                  <Search size={14} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
