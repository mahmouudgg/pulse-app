import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, Plus, Play, Pause, BarChart2, 
  ExternalLink, Eye, MousePointerClick, TrendingUp, X, Check, 
  Globe, Image as ImageIcon, Video, Upload, Copy, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, DollarSign, Settings, Trash2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { adService } from '../services/adService';
import { hapticsService } from '../services/hapticsService';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { cloudinaryService } from '../services/cloudinaryService';

export default function AdsManagerPage({ onBack, onOpenInsights }) {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const isDeveloper = currentUser?.username === 'my' || currentUser?.isFounder || currentUser?.email === 'mahmoud@pulse.app';

  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'google_ads' | 'admin_all'
  const [campaigns, setCampaigns] = useState(() => adService.getUserAds(currentUser?.uid) || []);
  const [allPlatformAds, setAllPlatformAds] = useState(() => adService.getAds() || []);
  const [isCreating, setIsCreating] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null); // When an ad is created, show manual payment invoice
  const [copiedRef, setCopiedRef] = useState(false);

  // Form State
  const [brandName, setBrandName] = useState(currentUser?.displayName || '');
  const [brandAvatar, setBrandAvatar] = useState(currentUser?.avatar || '');
  const [content, setContent] = useState('');
  const [mediaBase64, setMediaBase64] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [mediaFileName, setMediaFileName] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [ctaType, setCtaType] = useState('shop_now');
  const [targetCountry, setTargetCountry] = useState('all');
  const [dailyBudget, setDailyBudget] = useState(10);
  const [durationDays, setDurationDays] = useState(7);
  const [paymentMethod, setPaymentMethod] = useState('instapay'); // 'instapay' | 'vodafone_cash' | 'bank_transfer'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Ads Config State
  const [googleConfig, setGoogleConfig] = useState(() => adService.getGoogleAdsConfig());

  const fileInputRef = useRef(null);

  // Sync campaigns in real time
  useEffect(() => {
    const unsub = adService.subscribeToAds((allAds) => {
      setAllPlatformAds(allAds || []);
      if (currentUser?.uid) {
        setCampaigns((allAds || []).filter((a) => a.ownerId === currentUser.uid));
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [currentUser?.uid]);

  // Strict privacy lock: regular users can NEVER access Google Ads or admin tabs
  useEffect(() => {
    if (!isDeveloper && activeTab !== 'campaigns') {
      setActiveTab('campaigns');
    }
  }, [isDeveloper, activeTab]);

  // Aggregate Metrics for User Campaigns
  const approvedCampaigns = campaigns.filter((c) => c.status === 'active' || c.status === 'approved');
  const totalImpressions = approvedCampaigns.reduce((acc, c) => acc + (c.impressionsCount || 0), 0);
  const totalClicks = approvedCampaigns.reduce((acc, c) => acc + (c.clicksCount || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const activeCount = approvedCampaigns.length;

  // Real-time Budget Calculation
  const totalBudget = Number(dailyBudget) * Number(durationDays);
  const estimatedImpressions = Math.round((totalBudget / 1.5) * 1000);
  const estimatedClicks = Math.round(totalBudget * 22);

  // Handle Real Media File to Base64
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      showToast(isAr ? 'حجم الملف كبير جداً (الحد الأقصى 25 ميجابايت)' : 'File size exceeds 25MB limit');
      return;
    }

    setIsUploadingMedia(true);
    setMediaFileName(file.name);

    const isVid = file.type.startsWith('video');
    setMediaType(isVid ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaBase64(event.target.result);
      setIsUploadingMedia(false);
      try { hapticsService.light?.(); } catch {}
    };
    reader.onerror = () => {
      setIsUploadingMedia(false);
      showToast(isAr ? 'فشل قراءة الملف' : 'Failed to read media file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaBase64('');
    setMediaFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Toggle Campaign status (Active / Paused) for approved ads
  const handleToggleStatus = async (adId, currentStatus) => {
    try {
      hapticsService.light?.();
      const nextStatus = currentStatus === 'active' || currentStatus === 'approved' ? 'paused' : 'active';
      await adService.toggleAdStatus(adId, nextStatus);
      showToast(
        nextStatus === 'active'
          ? (isAr ? 'تم استئناف الحملة الإعلانية' : 'Campaign resumed')
          : (isAr ? 'تم إيقاف الحملة مؤقتاً' : 'Campaign paused')
      );
    } catch (e) {
      console.warn('Toggle status error:', e);
    }
  };

  // Admin Quick Actions
  const handleApproveAd = async (adId) => {
    try {
      hapticsService.medium?.();
      await adService.approveAd(adId);
      showToast(isAr ? 'تم اعتماد الإعلان بنجاح وتفعيله في الخلاصات!' : 'Ad approved and activated in feed!');
    } catch (e) {
      showToast(isAr ? 'فشل الاعتماد' : 'Approval failed');
    }
  };

  const handleRejectAd = async (adId) => {
    try {
      hapticsService.medium?.();
      await adService.rejectAd(adId, 'لم يستوفِ الشروط أو لم يتم تأكيد الدفع');
      showToast(isAr ? 'تم رفض الإعلان' : 'Ad rejected');
    } catch (e) {
      showToast(isAr ? 'فشل الرفض' : 'Rejection failed');
    }
  };

  const handleDeleteAd = async (adId) => {
    try {
      hapticsService.light?.();
      await adService.deleteAd(adId);
      showToast(isAr ? 'تم حذف الإعلان' : 'Ad deleted');
    } catch (e) {
      showToast(isAr ? 'فشل الحذف' : 'Deletion failed');
    }
  };

  // Submit and Create Campaign
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!content.trim() || !destinationUrl.trim()) {
      showToast(isAr ? 'يرجى كتابة نص الإعلان ورابط الوجهة' : 'Please fill content and destination link');
      return;
    }

    try {
      setIsSubmitting(true);
      hapticsService.medium?.();

      const ctaMap = {
        shop_now: { en: 'Shop now', ar: 'تسوق الآن' },
        learn_more: { en: 'Learn more', ar: 'معرفة المزيد' },
        sign_up: { en: 'Sign up', ar: 'تسجيل' },
        contact_us: { en: 'Contact us', ar: 'تواصل معنا' }
      };

      const ctaMeta = ctaMap[ctaType] || ctaMap.learn_more;

      let finalMediaUrl = mediaBase64 || null;
      if (mediaBase64 && mediaBase64.startsWith('data:image')) {
        try {
          finalMediaUrl = await cloudinaryService.uploadImage(mediaBase64, 'pulse_ads');
        } catch (cloudErr) {
          console.warn('Cloudinary ad media upload error, using fallback:', cloudErr);
        }
      }

      const createdAd = await adService.createAd({
        brandName: brandName.trim() || currentUser?.displayName || 'PULSE Advertiser',
        brandUsername: currentUser?.username || 'advertiser',
        brandAvatar: brandAvatar.trim() || currentUser?.avatar || DEFAULT_AVATAR,
        content: content.trim(),
        mediaUrl: finalMediaUrl,
        mediaType,
        destinationUrl: destinationUrl.trim(),
        ctaText: ctaMeta.en,
        ctaTextAr: ctaMeta.ar,
        ctaType,
        targetCountry,
        dailyBudget: Number(dailyBudget) || 10,
        durationDays: Number(durationDays) || 7,
        totalBudget,
        paymentMethod
      }, currentUser);

      setIsCreating(false);
      setIsSubmitting(false);

      // Reset Form
      setContent('');
      handleRemoveMedia();
      setDestinationUrl('');

      // Show Manual Payment Invoice Modal
      if (createdAd) {
        setActiveInvoice(createdAd);
      }
    } catch (err) {
      console.warn('Create ad error:', err);
      setIsSubmitting(false);
    }
  };

  // Save Google Ads Fallback Config
  const handleSaveGoogleConfig = (e) => {
    e.preventDefault();
    try {
      hapticsService.light?.();
      adService.saveGoogleAdsConfig(googleConfig);
      showToast(isAr ? 'تم حفظ إعدادات شبكة Google Ads بنجاح' : 'Google Ads configuration saved successfully');
    } catch (err) {
      showToast(isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    }
  };

  const handleCopyReference = (refCode) => {
    try {
      navigator.clipboard.writeText(refCode);
      setCopiedRef(true);
      showToast(isAr ? 'تم نسخ رقم المرجع إلى الحافظة' : 'Payment reference copied');
      setTimeout(() => setCopiedRef(false), 2500);
    } catch {}
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 tap-press transition-colors"
              aria-label="Back"
            >
              <BackIcon size={20} />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">
              {isAr ? 'إدارة الإعلانات والحملات' : 'Ads Manager'}
            </h1>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-bold text-xs tap-press transition-transform active:scale-95 shadow-sm"
          >
            <Plus size={14} />
            <span>{isAr ? 'إنشاء إعلان' : 'New Ad'}</span>
          </button>
        </header>

        {/* Developer / Admin Tabs Bar */}
        {isDeveloper && (
          <div className="flex border-b border-[#18181A] bg-[#0E0E10] px-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`py-2.5 px-4 border-b-2 transition-colors ${
                activeTab === 'campaigns' ? 'border-white text-white font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {isAr ? 'إعلاناتي' : 'My Ads'} ({campaigns.length})
            </button>

            <button
              onClick={() => setActiveTab('admin_all')}
              className={`py-2.5 px-4 border-b-2 transition-colors ${
                activeTab === 'admin_all' ? 'border-white text-white font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {isAr ? 'إدارة كل الإعلانات (المسؤول)' : 'All Platform Ads'} ({allPlatformAds.length})
            </button>

            <button
              onClick={() => setActiveTab('google_ads')}
              className={`py-2.5 px-4 border-b-2 transition-colors ${
                activeTab === 'google_ads' ? 'border-white text-white font-bold' : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {isAr ? 'أرباح Google Ads' : 'Google Ads'}
            </button>
          </div>
        )}

        {/* TAB 1: USER CAMPAIGNS */}
        {activeTab === 'campaigns' && (
          <>
            {/* Overview Stats Bar */}
            <div className="p-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400 mb-1">
                  <Eye size={12} />
                  <span>{isAr ? 'الظهور الفعلي' : 'Impressions'}</span>
                </div>
                <div className="text-base font-extrabold text-white font-mono">{totalImpressions.toLocaleString()}</div>
              </div>

              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400 mb-1">
                  <MousePointerClick size={12} />
                  <span>{isAr ? 'النقرات' : 'Clicks'}</span>
                </div>
                <div className="text-base font-extrabold text-white font-mono">{totalClicks.toLocaleString()}</div>
              </div>

              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400 mb-1">
                  <TrendingUp size={12} />
                  <span>{isAr ? 'معدل CTR' : 'CTR%'}</span>
                </div>
                <div className="text-base font-extrabold text-blue-400 font-mono">{avgCtr}%</div>
              </div>
            </div>

            {/* View Detailed Insights Link */}
            {campaigns.length > 0 && onOpenInsights && (
              <div className="px-4 pb-2">
                <button
                  onClick={onOpenInsights}
                  className="w-full p-3 rounded-2xl bg-[#121214] border border-[#222226] flex items-center justify-between text-xs text-neutral-300 hover:text-white hover:bg-[#16161A] tap-press transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart2 size={16} className="text-white" />
                    <span className="font-semibold">{isAr ? 'عرض تقارير الأداء المتقدمة في صفحة الإحصائيات' : 'View advanced performance in Insights'}</span>
                  </div>
                  <BackIcon size={14} className={isAr ? "rotate-180" : ""} />
                </button>
              </div>
            )}

            {/* Campaigns List */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                <span>{isAr ? 'حملاتك الإعلانية' : 'Your Campaigns'} ({campaigns.length})</span>
                <span className="text-[11px] font-mono text-blue-400">{activeCount} {isAr ? 'معتمدة / نشطة' : 'Active'}</span>
              </div>

              {campaigns.length > 0 ? (
                campaigns.map((ad) => {
                  const isApproved = ad.status === 'active' || ad.status === 'approved';
                  const isPending = ad.status === 'pending';
                  const isRejected = ad.status === 'rejected';
                  const ctr = ad.impressionsCount > 0 ? ((ad.clicksCount / ad.impressionsCount) * 100).toFixed(1) : '0.0';

                  return (
                    <div key={ad.id} className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={ad.brandAvatar || DEFAULT_AVATAR}
                            alt={ad.brandName}
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-white">{ad.brandName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isApproved
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : isPending
                                  ? 'bg-neutral-800/80 text-neutral-300 border border-neutral-700'
                                  : isRejected
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}>
                                {isApproved 
                                  ? (isAr ? 'نشط ومعتمد' : 'Active & Approved') 
                                  : isPending 
                                  ? (isAr ? 'قيد المراجعة والتحقق المالي' : 'Pending Review') 
                                  : isRejected
                                  ? (isAr ? 'مرفوض' : 'Rejected')
                                  : (isAr ? 'متوقف مؤقتاً' : 'Paused')}
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-400 font-mono" dir="ltr">{ad.displayUrl || 'pulse.app'}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {isApproved && (
                            <button
                              onClick={() => handleToggleStatus(ad.id, ad.status)}
                              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 tap-press transition-colors ${
                                ad.status === 'active' || ad.status === 'approved'
                                  ? 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
                                  : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
                              }`}
                              title={ad.status === 'active' ? 'إيقاف مؤقت' : 'استئناف'}
                            >
                              {ad.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                              <span>{ad.status === 'active' ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'استئناف' : 'Resume')}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteAd(ad.id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-neutral-400 tap-press transition-colors"
                            title={isAr ? 'حذف الإعلان' : 'Delete Ad'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Content Preview */}
                      {ad.content && (
                        <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                          {ad.content}
                        </p>
                      )}

                      {/* Media Thumbnail */}
                      {ad.mediaUrl && (
                        <div className="rounded-xl overflow-hidden max-h-36 bg-neutral-900 border border-white/5">
                          {ad.mediaType === 'video' ? (
                            <video src={ad.mediaUrl} className="w-full h-36 object-cover" muted />
                          ) : (
                            <img src={ad.mediaUrl} alt="" className="w-full h-36 object-cover" />
                          )}
                        </div>
                      )}

                      {/* Pending Notice / Payment Ref */}
                      {isPending && (
                        <div className="rounded-xl bg-neutral-900 border border-neutral-700 p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-neutral-300">
                            <Clock size={14} />
                            <span>{isAr ? 'رقم المرجع للحجز:' : 'Ref ID:'}</span>
                            <span className="font-mono font-bold">{ad.paymentReference || 'PAY-REF'}</span>
                          </div>
                          <button
                            onClick={() => setActiveInvoice(ad)}
                            className="text-[11px] underline font-bold text-blue-400 tap-press hover:text-white"
                          >
                            {isAr ? 'عرض بيانات الدفع' : 'View Invoice'}
                          </button>
                        </div>
                      )}

                      {/* Campaign Metrics */}
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1C1C20] text-center text-xs">
                        <div>
                          <span className="text-[10px] text-neutral-500 block">{isAr ? 'الميزانية' : 'Budget'}</span>
                          <span className="font-bold text-white font-mono">${ad.totalBudget || ad.dailyBudget * 7}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 block">{isAr ? 'الظهور' : 'Impressions'}</span>
                          <span className="font-bold text-white font-mono">{ad.impressionsCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 block">{isAr ? 'النقرات' : 'Clicks'}</span>
                          <span className="font-bold text-white font-mono">{ad.clicksCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 block">{isAr ? 'نسبة CTR' : 'CTR'}</span>
                          <span className="font-bold text-blue-400 font-mono">{ctr}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center rounded-3xl bg-[#121214] border border-[#222226] p-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center mx-auto">
                    <TrendingUp size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'لا توجد حملات إعلانية نشطة حالياً' : 'No ads created yet'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    {isAr 
                      ? 'أطلق حملتك الإعلانية الحقيقية لتظهر في خلاصات PULSE مع استهداف دقيق ونظام دفع يدوي مرن.'
                      : 'Launch your real ad campaign to appear in PULSE feeds with accurate targeting and flexible manual payment.'}
                  </p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs tap-press hover:bg-neutral-200 shadow-sm"
                  >
                    {isAr ? 'إنشاء إعلان حقيقي الآن' : 'Create your ad now'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: ADMIN ALL PLATFORM ADS (FOR FOUNDER / REVIEW) */}
        {activeTab === 'admin_all' && isDeveloper && (
          <div className="p-4 space-y-4">
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{isAr ? 'لوحة تحكم واعتماد الإعلانات' : 'Ads Approval Dashboard'}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{isAr ? 'فحص الإعلانات المحجوزة والموافقة عليها بنقرة واحدة أو عبر Firebase' : 'Review pending ads and approve with 1-click'}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold">
                {allPlatformAds.filter(a => a.status === 'pending').length} {isAr ? 'بانتظار الموافقة' : 'Pending'}
              </span>
            </div>

            <div className="space-y-3">
              {allPlatformAds.length > 0 ? (
                allPlatformAds.map((ad) => (
                  <div key={ad.id} className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={ad.brandAvatar || DEFAULT_AVATAR}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{ad.brandName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              ad.status === 'active' || ad.status === 'approved'
                                ? 'bg-blue-500/10 text-blue-400'
                                : ad.status === 'pending'
                                ? 'bg-neutral-800/80 text-neutral-300'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}>
                              {ad.status}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400">@{ad.brandUsername} · {ad.paymentReference || 'NO-REF'}</span>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-1 rounded-lg">
                        ${ad.totalBudget || ad.dailyBudget * 7}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-200 line-clamp-2">{ad.content}</p>

                    {ad.mediaUrl && (
                      <div className="rounded-xl overflow-hidden max-h-32 bg-neutral-900 border border-white/5">
                        {ad.mediaType === 'video' ? (
                          <video src={ad.mediaUrl} className="w-full h-32 object-cover" muted />
                        ) : (
                          <img src={ad.mediaUrl} alt="" className="w-full h-32 object-cover" />
                        )}
                      </div>
                    )}

                    {/* Admin Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1C1C20]">
                      <span className="text-[11px] text-neutral-500">
                        {isAr ? 'الدفع:' : 'Payment:'} <strong className="text-neutral-300">{ad.paymentMethod || 'manual'}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {ad.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApproveAd(ad.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-500 text-black font-bold text-xs tap-press hover:bg-blue-400 transition-colors flex items-center gap-1"
                            >
                              <Check size={13} strokeWidth={2.5} />
                              <span>{isAr ? 'اعتماد الإعلان' : 'Approve'}</span>
                            </button>
                            <button
                              onClick={() => handleRejectAd(ad.id)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-xs tap-press hover:bg-red-500/20 transition-colors"
                            >
                              {isAr ? 'رفض' : 'Reject'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(ad.id, ad.status)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 text-white font-bold text-xs tap-press hover:bg-white/20"
                          >
                            {ad.status === 'active' || ad.status === 'approved' ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'تفعيل' : 'Activate')}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="p-1.5 rounded-xl text-neutral-500 hover:text-red-400 tap-press"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-neutral-500">{isAr ? 'لا توجد إعلانات على المنصة' : 'No ads on platform'}</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE ADS INTEGRATION (FOR PERSONAL REVENUE) */}
        {activeTab === 'google_ads' && isDeveloper && (
          <div className="p-4 space-y-4">
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">{isAr ? 'شبكة إعلانات Google Ads / AdSense' : 'Google Ads Revenue Integration'}</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                  {isAr ? 'أرباحك الشخصية' : 'Personal Revenue'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr
                  ? 'هذه الميزة مصممة لتوليد أرباح شخصية لك من شبكة Google Ads. يتم حقن هذه الإعلانات بنفس قالب ثريدس الرسمي تلقائياً، ولكنها تأخذ أولوية ثانوية وتظهر كبديل فقط في حال عدم وجود إعلانات معتمدة من المستخدمين.'
                  : 'Automated revenue fallback from Google Ads. Serves in the exact same Threads card template with secondary priority whenever no user campaigns exist.'}
              </p>
            </div>

            <form onSubmit={handleSaveGoogleConfig} className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <div className="text-sm font-semibold text-white">{isAr ? 'تفعيل شبكة Google Ads الاحتياطية' : 'Enable Google Ads Fallback'}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{isAr ? 'حقن إعلانات جوجل عند فراغ إعلانات المستخدمين' : 'Fill slots with Google Ads when empty'}</div>
                </div>
                <input
                  type="checkbox"
                  checked={googleConfig.enabled}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, enabled: e.target.checked })}
                  className="w-5 h-5 accent-white cursor-pointer"
                />
              </div>

              {/* Publisher ID */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Google Publisher ID (AdSense)
                </label>
                <input
                  type="text"
                  value={googleConfig.publisherId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, publisherId: e.target.value })}
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>

              {/* Ad Slot ID */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {isAr ? 'معرف وحدة الإعلان (Ad Slot ID)' : 'Ad Slot ID'}
                </label>
                <input
                  type="text"
                  value={googleConfig.adSlotId || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, adSlotId: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>

              {/* Custom Display Brand Name (Natural Native appearance) */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {isAr ? 'اسم الشريك/المعلن الظاهر للجمهور في الخلاصة' : 'Display Partner Name in Feed'}
                </label>
                <input
                  type="text"
                  value={googleConfig.sponsorNameAr || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, sponsorNameAr: e.target.value })}
                  placeholder={isAr ? 'مثال: شريك ممول أو Google Ads Partner' : 'e.g. Sponsored Partner'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors"
                />
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  {isAr ? 'هذا الاسم سيظهر للناس كاسم الحساب المعلن الطبيعي' : 'This name will appear to users as the normal advertiser handle'}
                </span>
              </div>

              {/* Custom Display Copy */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {isAr ? 'نص الإعلان الترويجي الظاهر للجمهور' : 'Display Promotional Copy'}
                </label>
                <input
                  type="text"
                  value={googleConfig.sponsorText || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, sponsorText: e.target.value })}
                  placeholder={isAr ? 'محتوى وإعلان ترويجي رسمي. استكشف أحدث العروض والخدمات الحصرية.' : 'Sponsored promo. Explore featured updates.'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Destination URL */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {isAr ? 'رابط التوجيه عند النقر (Destination URL)' : 'Click Destination URL'}
                </label>
                <input
                  type="url"
                  value={googleConfig.destinationUrl || ''}
                  onChange={(e) => setGoogleConfig({ ...googleConfig, destinationUrl: e.target.value })}
                  placeholder="https://yourlink.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-white text-black font-bold text-xs tap-press hover:bg-neutral-200 transition-colors shadow-sm"
              >
                {isAr ? 'حفظ إعدادات الأرباح' : 'Save Revenue Settings'}
              </button>
            </form>
          </div>
        )}

        {/* CREATE CAMPAIGN MODAL */}
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#141416] border border-[#26262B] rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="p-4 border-b border-[#222226] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'إطلاق حملة إعلانية حقيقية' : 'Create Real Ad Campaign'}
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    {isAr ? 'حجز مباشر · مراجعة وتأكيد يدوي' : 'Instant booking · Manual verification'}
                  </span>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 tap-press"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateCampaign} className="p-4 overflow-y-auto space-y-4 flex-1">
                {/* Brand Name */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'اسم العلامة التجارية / الحساب المعلن' : 'Brand Name'}
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Acme Studio"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors"
                    required
                  />
                </div>

                {/* Ad Content */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'نص الإعلان الترويجي' : 'Ad Copy / Text'}
                  </label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isAr ? 'اكتب رسالتك الترويجية أو العرض الخاص لجمهورك...' : 'Write your promotional message or special offer...'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors resize-none"
                    required
                  />
                </div>

                {/* Real Media Upload (Image or Video converted to Base64) */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'صورة أو فيديو الإعلان (رفع مباشر Base64)' : 'Ad Media (Direct Base64 Upload)'}
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {mediaBase64 ? (
                    <div className="relative rounded-2xl overflow-hidden border border-[#2A2A30] bg-[#0E0E10] p-2">
                      {mediaType === 'video' ? (
                        <video src={mediaBase64} className="w-full max-h-48 object-cover rounded-xl" controls />
                      ) : (
                        <img src={mediaBase64} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                      )}
                      <div className="flex items-center justify-between mt-2 px-1">
                        <span className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                          {mediaFileName || (mediaType === 'video' ? 'Video file' : 'Image file')}
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveMedia}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 tap-press"
                        >
                          {isAr ? 'حذف وتغيير' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploadingMedia}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-6 rounded-2xl border-2 border-dashed border-[#2A2A30] hover:border-neutral-400 bg-[#0E0E10] flex flex-col items-center justify-center gap-2 tap-press transition-colors text-neutral-400 hover:text-white"
                    >
                      <Upload size={22} />
                      <span className="text-xs font-semibold">
                        {isUploadingMedia ? (isAr ? 'جارِ التحويل...' : 'Converting...') : (isAr ? 'اختر صورة أو فيديو من هاتفك' : 'Upload photo or video')}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {isAr ? 'يتم التخزين بدقة عالية كبيانات Base64 آمنة' : 'Stores in high-res as native Base64 data'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Destination Link */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'رابط الموقع أو المتجر المستهدف' : 'Destination URL'}
                  </label>
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://yourbrand.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E0E10] border border-[#26262B] text-xs text-white placeholder-neutral-500 outline-none focus:border-white transition-colors font-mono"
                    required
                  />
                </div>

                {/* CTA Button Type */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'زر اتخاذ الإجراء (CTA)' : 'Call to Action'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'shop_now', label: isAr ? 'تسوق الآن' : 'Shop now' },
                      { id: 'learn_more', label: isAr ? 'معرفة المزيد' : 'Learn more' },
                      { id: 'sign_up', label: isAr ? 'تسجيل' : 'Sign up' },
                      { id: 'contact_us', label: isAr ? 'تواصل معنا' : 'Contact us' }
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setCtaType(btn.id)}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                          ctaType === btn.id
                            ? 'bg-white text-black border-white shadow-sm'
                            : 'bg-[#0E0E10] text-neutral-300 border-[#26262B] hover:border-neutral-500'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget & Duration Selector */}
                <div className="space-y-3 pt-2 border-t border-[#222226]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{isAr ? 'الميزانية والمدة' : 'Budget & Duration'}</span>
                    <span className="text-xs font-mono font-bold text-blue-400">${totalBudget} USD</span>
                  </div>

                  {/* Daily Budget Chips */}
                  <div>
                    <span className="text-[11px] text-neutral-400 block mb-1">{isAr ? 'الميزانية اليومية:' : 'Daily Budget:'}</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 25, 50].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDailyBudget(amt)}
                          className={`py-2 rounded-xl text-xs font-bold border text-center transition-colors ${
                            dailyBudget === amt ? 'bg-white text-black border-white' : 'bg-[#0E0E10] text-neutral-300 border-[#26262B]'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Days */}
                  <div>
                    <span className="text-[11px] text-neutral-400 block mb-1">{isAr ? 'مدة تشغيل الحملة:' : 'Campaign Duration:'}</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { days: 3, label: isAr ? '3 أيام' : '3d' },
                        { days: 7, label: isAr ? '7 أيام' : '7d' },
                        { days: 14, label: isAr ? '14 يوماً' : '14d' },
                        { days: 30, label: isAr ? '30 يوماً' : '30d' }
                      ].map((item) => (
                        <button
                          key={item.days}
                          type="button"
                          onClick={() => setDurationDays(item.days)}
                          className={`py-2 rounded-xl text-xs font-bold border text-center transition-colors ${
                            durationDays === item.days ? 'bg-white text-black border-white' : 'bg-[#0E0E10] text-neutral-300 border-[#26262B]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estimated Reach Card */}
                  <div className="rounded-2xl bg-[#0E0E10] border border-[#222226] p-3 grid grid-cols-2 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 block">{isAr ? 'الظهور المتوقع' : 'Est. Impressions'}</span>
                      <span className="font-bold text-white font-mono">~{estimatedImpressions.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 block">{isAr ? 'النقرات المتوقعة' : 'Est. Clicks'}</span>
                      <span className="font-bold text-blue-400 font-mono">~{estimatedClicks.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Live Feed Ad Preview (PULSE Official) */}
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-neutral-400 block mb-2">
                    {isAr ? 'معاينة الإعلان الحية كما ستظهر في خلاصات PULSE:' : 'Live Feed Ad Preview:'}
                  </span>
                  <div className="rounded-2xl bg-black border border-[#2A2A30] p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={brandAvatar || currentUser?.avatar || DEFAULT_AVATAR}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-white/10"
                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{brandName || (isAr ? 'اسم علامتك التجارية' : 'Brand Name')}</span>
                          <span className="text-[11px] text-[#777777] font-medium">{isAr ? 'إعلان' : 'Ad'}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono" dir="ltr">
                          {(destinationUrl || '').replace(/^https?:\/\//, '').split('/')[0] || 'yourbrand.com'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">
                      {content || (isAr ? 'نص الإعلان الترويجي سيظهر هنا للجمهور في خلاصات PULSE...' : 'Your promotional ad copy will appear here in PULSE feeds...')}
                    </p>

                    {mediaBase64 && (
                      <div className="rounded-xl overflow-hidden max-h-36 bg-neutral-900 border border-white/10">
                        {mediaType === 'video' ? (
                          <video src={mediaBase64} className="w-full h-36 object-cover" muted />
                        ) : (
                          <img src={mediaBase64} alt="" className="w-full h-36 object-cover" />
                        )}
                      </div>
                    )}

                    {/* CTA Bar */}
                    <div className="pt-1 flex items-center justify-between border-t border-white/5">
                      <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[150px]" dir="ltr">
                        {(destinationUrl || '').replace(/^https?:\/\//, '').split('/')[0] || 'yourbrand.com'}
                      </span>
                      <div className="px-3.5 py-1.5 rounded-full bg-white text-black font-bold text-[11px] flex items-center gap-1 shadow-sm">
                        <span>
                          {ctaType === 'shop_now' 
                            ? (isAr ? 'تسوق الآن' : 'Shop now') 
                            : ctaType === 'sign_up' 
                            ? (isAr ? 'تسجيل' : 'Sign up') 
                            : ctaType === 'contact_us' 
                            ? (isAr ? 'تواصل معنا' : 'Contact us') 
                            : (isAr ? 'معرفة المزيد' : 'Learn more')}
                        </span>
                        <ExternalLink size={10} className="text-black" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'طريقة الدفع اليدوي' : 'Manual Payment Method'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'instapay', label: 'InstaPay' },
                      { id: 'vodafone_cash', label: isAr ? 'فودافون كاش' : 'VF Cash' },
                      { id: 'bank_transfer', label: isAr ? 'تحويل بنكي' : 'Bank' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                          paymentMethod === m.id
                            ? 'bg-white text-black border-white shadow-sm'
                            : 'bg-[#0E0E10] text-neutral-300 border-[#26262B]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-full bg-white text-black font-bold text-xs tap-press hover:bg-neutral-200 transition-all shadow-md disabled:opacity-50"
                  >
                    {isSubmitting 
                      ? (isAr ? 'جارِ الحجز وإرسال الطلب...' : 'Booking Campaign...') 
                      : (isAr ? `تأكيد الحجز ($${totalBudget}) وإصدار الفاتورة` : `Book Ad ($${totalBudget}) & Get Invoice`)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MANUAL PAYMENT INVOICE MODAL */}
        {activeInvoice && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#141416] border border-[#26262B] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#222226] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'فاتورة حجز الإعلان وتفاصيل الدفع' : 'Ad Booking Invoice & Payment'}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Reference ID Card */}
              <div className="rounded-2xl bg-[#0E0E10] border border-[#2A2A30] p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>{isAr ? 'رقم مرجع الحجز:' : 'Payment Reference:'}</span>
                  <span className="text-blue-400 font-bold">{isAr ? 'قيد التدقيق (Pending)' : 'Pending Verification'}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-mono font-black text-white tracking-wider">
                    {activeInvoice.paymentReference}
                  </span>
                  <button
                    onClick={() => handleCopyReference(activeInvoice.paymentReference)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white tap-press transition-colors"
                  >
                    {copiedRef ? <CheckCircle2 size={13} className="text-blue-400" /> : <Copy size={13} />}
                    <span>{copiedRef ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ المرجع' : 'Copy')}</span>
                  </button>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">{isAr ? 'إجمالي المبلغ المستحق:' : 'Total Amount Due:'}</span>
                  <span className="text-sm font-bold font-mono text-white">
                    ${activeInvoice.totalBudget || 70} USD
                  </span>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="rounded-2xl bg-[#0E0E10] border border-[#222226] p-3.5 space-y-2.5 text-xs text-neutral-300">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Clock size={14} className="text-neutral-300" />
                  <span>{isAr ? 'طرق تحويل المبلغ وتأكيد الحجز:' : 'Payment Transfer Instructions:'}</span>
                </div>

                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                    <strong>InstaPay (إنستاباي):</strong> <span className="font-mono text-white select-all">pulse@instapay</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                    <strong>Vodafone Cash (فودافون كاش):</strong> <span className="font-mono text-white select-all">010XXXXXXXX</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                    <strong>التحويل البنكي / المحافظ:</strong> يرجى التواصل مع إدارة المنصة.
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed pt-1">
                  {isAr 
                    ? 'بعد إتمام التحويل، يرجى إرسال صورة إيصال الدفع مع رقم المرجع إلى حساب الإدارة (@my) عبر الرسائل المباشرة. سيتم فحص الإعلان وتغيير حالته فوراً إلى معتمد (Approved) ليظهر لآلاف المستخدمين.'
                    : 'After completing the transfer, send the transaction screenshot and reference ID to @my via Direct Messages. Your ad will be approved and activated immediately.'}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setActiveInvoice(null)}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-xs tap-press hover:bg-neutral-200 transition-colors shadow-md"
              >
                {isAr ? 'حسناً، فهمت وسأقوم بإرسال الإيصال' : 'Done, I will send the receipt'}
              </button>
            </div>
          </div>
        )}
      </div>
    </SwipeBackWrapper>
  );
}
