import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft,
  Bell, 
  ShieldCheck, 
  Check, 
  X,
  Clock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { hapticsService } from '../services/hapticsService';
import { notificationPreferencesService } from '../services/notificationPreferencesService';
import SwipeBackWrapper from './SwipeBackWrapper';

/**
 * PULSE Notification Settings & Granular Engine View
 * Built to 1:1 specifications of Instagram Threads / Meta Design Architecture
 * 
 * STRICT COMPLIANCE: ZERO EMOJIS across all code, logs, and UI strings.
 */

export default function NotificationSettingsView({ currentUser, onBack, initialSubPage = null }) {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isAr = lang === 'ar';

  const [activeSubPage, setActiveSubPage] = useState(initialSubPage);
  const [prefs, setPrefs] = useState(() => notificationPreferencesService.getPreferences(currentUser?.uid));
  const [showPauseModal, setShowPauseModal] = useState(false);

  useEffect(() => {
    if (currentUser?.uid) {
      const p = notificationPreferencesService.getPreferences(currentUser.uid);
      setPrefs(p);
      notificationPreferencesService.syncFromCloud(currentUser.uid).then((cloudPrefs) => {
        if (cloudPrefs) setPrefs(cloudPrefs);
      });
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    const handlePrefsChanged = (e) => {
      if (e.detail) setPrefs(e.detail);
    };
    window.addEventListener('pulse_notification_prefs_changed', handlePrefsChanged);
    return () => window.removeEventListener('pulse_notification_prefs_changed', handlePrefsChanged);
  }, []);

  const updatePref = (key, value) => {
    hapticsService.light?.();
    const updated = notificationPreferencesService.savePreferences(currentUser?.uid, { [key]: value });
    if (updated) setPrefs(updated);
  };

  const handlePauseToggle = (checked) => {
    hapticsService.medium?.();
    if (checked) {
      setShowPauseModal(true);
    } else {
      updatePref('pauseAll', false);
      notificationPreferencesService.savePreferences(currentUser?.uid, { pauseAll: false, pauseUntil: null });
      showToast(isAr ? 'تم استئناف جميع الإشعارات' : 'All notifications resumed', 'success');
    }
  };

  const handleSelectPauseDuration = (durationMinutes) => {
    hapticsService.light?.();
    setShowPauseModal(false);
    let pauseUntil = null;
    let label = isAr ? 'تم إيقاف الإشعارات مؤقتاً' : 'Notifications paused';

    if (durationMinutes > 0) {
      pauseUntil = Date.now() + durationMinutes * 60 * 1000;
      if (durationMinutes === 15) label = isAr ? 'تم إيقاف الإشعارات لمدة 15 دقيقة' : 'Notifications paused for 15 minutes';
      else if (durationMinutes === 60) label = isAr ? 'تم إيقاف الإشعارات لمدة ساعة' : 'Notifications paused for 1 hour';
      else if (durationMinutes === 120) label = isAr ? 'تم إيقاف الإشعارات لمدة ساعتين' : 'Notifications paused for 2 hours';
      else if (durationMinutes === 240) label = isAr ? 'تم إيقاف الإشعارات لمدة 4 ساعات' : 'Notifications paused for 4 hours';
      else if (durationMinutes === 480) label = isAr ? 'تم إيقاف الإشعارات لمدة 8 ساعات' : 'Notifications paused for 8 hours';
    } else {
      label = isAr ? 'تم إيقاف الإشعارات حتى إلغائها' : 'Notifications paused until turned off';
    }

    notificationPreferencesService.savePreferences(currentUser?.uid, {
      pauseAll: true,
      pauseUntil
    });
    setPrefs((prev) => ({ ...prev, pauseAll: true, pauseUntil }));
    showToast(label, 'info');
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const ChevronIcon = isAr ? ChevronLeft : ChevronRight;

  // Custom Meta/Threads Radio Option Row
  const RadioOptionRow = ({ label, selected, onSelect }) => (
    <button
      type="button"
      onClick={() => {
        hapticsService.selection?.();
        onSelect();
      }}
      className="w-full flex items-center justify-between py-3.5 px-0 text-left cursor-pointer active:opacity-70 transition-opacity"
    >
      <span className="text-[15px] font-normal text-white">{label}</span>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'border-white' : 'border-[#52525B]'
        }`}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
      </div>
    </button>
  );

  // Group Box for Sub-Pages
  const SettingsGroup = ({ title, subtitle, children }) => (
    <div className="py-3">
      <div className="text-[15px] font-medium text-white">{title}</div>
      {subtitle && <div className="text-[13px] font-normal text-[#71717A] mt-0.5 mb-1 leading-snug">{subtitle}</div>}
      <div className="mt-1 divide-y divide-[#18181A]">{children}</div>
    </div>
  );

  // Top Sub-Header
  const renderHeader = (title, onBackAction) => (
    <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-[#18181A] px-4 h-14 flex items-center gap-4">
      <button
        type="button"
        onClick={() => {
          hapticsService.light?.();
          onBackAction();
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white active:bg-white/10 transition-colors"
        aria-label="Back"
      >
        <BackIcon size={22} className="stroke-[2.2]" />
      </button>
      <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
    </div>
  );

  // System Settings Helper Note (Screenshots 3 & 4)
  const renderSystemSettingsNotice = () => (
    <div className="pt-6 pb-8 text-[13px] leading-relaxed text-[#71717A]">
      <button
        type="button"
        onClick={() => {
          hapticsService.light?.();
          if (typeof window !== 'undefined' && window.Capacitor) {
            import('@capacitor/app').then(({ App }) => {
              // On native mobile devices
            }).catch(() => {});
          }
          showToast(isAr ? 'يمكنك ضبط تفضيلات النظام الإضافية من إعدادات جهازك' : 'Manage system push permissions in your device settings', 'info');
        }}
        className="text-[#0095F6] hover:underline font-medium block mb-2 text-left"
      >
        {isAr ? 'خيارات إضافية في إعدادات النظام...' : 'Additional options in system settings...'}
      </button>
      <p>
        {isAr
          ? 'تنطبق هذه الإعدادات على أي حسابات نبض مسجل دخولها على هذا الجهاز.'
          : 'These settings affect any PULSE accounts logged into this device'}
      </p>
    </div>
  );

  // ============================================================================
  // SUB-PAGE 1: Threads and replies (النبضات والردود)
  // ============================================================================
  if (activeSubPage === 'threads_replies') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-20 max-w-xl mx-auto">
          {renderHeader(isAr ? 'النبضات والردود' : 'Threads and replies', () => setActiveSubPage(null))}
          <div className="px-5 divide-y divide-[#18181A]">
            {/* Likes */}
            <SettingsGroup
              title={isAr ? 'تسجيلات الإعجاب' : 'Likes'}
              subtitle={isAr ? 'أُعجب فلان بنبضتك أو ردك.' : 'johnappleseed liked your reply.'}
            >
              <RadioOptionRow
                label={isAr ? 'من الجميع' : 'From everyone'}
                selected={prefs.likes === 'everyone'}
                onSelect={() => updatePref('likes', 'everyone')}
              />
              <RadioOptionRow
                label={isAr ? 'من الأشخاص الذين تتابعهم' : 'From people you follow'}
                selected={prefs.likes === 'following'}
                onSelect={() => updatePref('likes', 'following')}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.likes === 'off'}
                onSelect={() => updatePref('likes', 'off')}
              />
            </SettingsGroup>

            {/* Replies */}
            <SettingsGroup
              title={isAr ? 'الردود والتعليقات' : 'Replies'}
              subtitle={isAr ? 'علّق فلان على نبضتك.' : 'johnappleseed replied to you.'}
            >
              <RadioOptionRow
                label={isAr ? 'من الجميع' : 'From everyone'}
                selected={prefs.replies === 'everyone'}
                onSelect={() => updatePref('replies', 'everyone')}
              />
              <RadioOptionRow
                label={isAr ? 'من الأشخاص الذين تتابعهم' : 'From people you follow'}
                selected={prefs.replies === 'following'}
                onSelect={() => updatePref('replies', 'following')}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.replies === 'off'}
                onSelect={() => updatePref('replies', 'off')}
              />
            </SettingsGroup>

            {/* Mentions */}
            <SettingsGroup
              title={isAr ? 'الإشارات والمنشن (@)' : 'Mentions'}
              subtitle={isAr ? 'أشار فلان إليك في نبضة.' : 'johnappleseed mentioned you.'}
            >
              <RadioOptionRow
                label={isAr ? 'من الجميع' : 'From everyone'}
                selected={prefs.mentions === 'everyone'}
                onSelect={() => updatePref('mentions', 'everyone')}
              />
              <RadioOptionRow
                label={isAr ? 'من الأشخاص الذين تتابعهم' : 'From people you follow'}
                selected={prefs.mentions === 'following'}
                onSelect={() => updatePref('mentions', 'following')}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.mentions === 'off'}
                onSelect={() => updatePref('mentions', 'off')}
              />
            </SettingsGroup>

            {/* Reposts & Quotes */}
            <SettingsGroup
              title={isAr ? 'إعادات النشر والاقتباسات' : 'Reposts and quotes'}
              subtitle={isAr ? 'أعاد فلان نشر نبضتك أو اقتبسها.' : 'johnappleseed reposted your pulse.'}
            >
              <RadioOptionRow
                label={isAr ? 'من الجميع' : 'From everyone'}
                selected={prefs.reposts === 'everyone'}
                onSelect={() => updatePref('reposts', 'everyone')}
              />
              <RadioOptionRow
                label={isAr ? 'من الأشخاص الذين تتابعهم' : 'From people you follow'}
                selected={prefs.reposts === 'following'}
                onSelect={() => updatePref('reposts', 'following')}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.reposts === 'off'}
                onSelect={() => updatePref('reposts', 'off')}
              />
            </SettingsGroup>

            {/* Voice Plays & Listens */}
            <SettingsGroup
              title={isAr ? 'الاستماع للنبضات الصوتية' : 'Voice plays and listens'}
              subtitle={isAr ? 'استمع فلان إلى نبضتك الصوتية.' : 'johnappleseed listened to your voice pulse.'}
            >
              <RadioOptionRow
                label={isAr ? 'من الجميع' : 'From everyone'}
                selected={prefs.voicePlays === 'everyone'}
                onSelect={() => updatePref('voicePlays', 'everyone')}
              />
              <RadioOptionRow
                label={isAr ? 'من الأشخاص الذين تتابعهم' : 'From people you follow'}
                selected={prefs.voicePlays === 'following'}
                onSelect={() => updatePref('voicePlays', 'following')}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.voicePlays === 'off'}
                onSelect={() => updatePref('voicePlays', 'off')}
              />
            </SettingsGroup>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // ============================================================================
  // SUB-PAGE 2: Following and followers (المتابعات والمتابعون)
  // ============================================================================
  if (activeSubPage === 'following_followers') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-20 max-w-xl mx-auto">
          {renderHeader(isAr ? 'المتابعات والمتابعون' : 'Following and followers', () => setActiveSubPage(null))}
          <div className="px-5 divide-y divide-[#18181A]">
            {/* New Followers */}
            <SettingsGroup
              title={isAr ? 'متابعون جدد' : 'New followers'}
              subtitle={isAr ? 'بدأ فلان بمتابعتك.' : 'johnappleseed started following you.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.newFollowers === true}
                onSelect={() => updatePref('newFollowers', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.newFollowers === false}
                onSelect={() => updatePref('newFollowers', false)}
              />
            </SettingsGroup>

            {/* Accepted Follow Requests */}
            <SettingsGroup
              title={isAr ? 'طلبات المتابعة المقبولة' : 'Accepted follow requests'}
              subtitle={isAr ? 'قبل فلان طلب متابعتك.' : 'johnappleseed accepted your follow request.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.acceptedFollowRequests === true}
                onSelect={() => updatePref('acceptedFollowRequests', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.acceptedFollowRequests === false}
                onSelect={() => updatePref('acceptedFollowRequests', false)}
              />
            </SettingsGroup>

            {/* Follow Suggestions */}
            <SettingsGroup
              title={isAr ? 'اقتراحات المتابعة' : 'Follow suggestions'}
              subtitle={isAr ? 'أشخاص قد تعرفهم على نبض.' : 'johnappleseed, who you may know, is on PULSE.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.followSuggestions === true}
                onSelect={() => updatePref('followSuggestions', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.followSuggestions === false}
                onSelect={() => updatePref('followSuggestions', false)}
              />
            </SettingsGroup>

            {renderSystemSettingsNotice()}
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // ============================================================================
  // SUB-PAGE 3: Custom feeds (التغذية المخصصة)
  // ============================================================================
  if (activeSubPage === 'custom_feeds') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-20 max-w-xl mx-auto">
          {renderHeader(isAr ? 'التغذية المخصصة' : 'Custom feeds', () => setActiveSubPage(null))}
          <div className="px-5 divide-y divide-[#18181A]">
            <SettingsGroup
              title={isAr ? 'الإضافة لتغذية مخصصة' : 'Added to custom feed'}
              subtitle={isAr ? 'أضافك فلان إلى تغذية مخصصة.' : 'johnappleseed added you to their feed.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.addedToCustomFeed === true}
                onSelect={() => updatePref('addedToCustomFeed', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.addedToCustomFeed === false}
                onSelect={() => updatePref('addedToCustomFeed', false)}
              />
            </SettingsGroup>

            {renderSystemSettingsNotice()}
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // ============================================================================
  // SUB-PAGE 4: From PULSE (من نبض)
  // ============================================================================
  if (activeSubPage === 'from_pulse') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-20 max-w-xl mx-auto">
          {renderHeader(isAr ? 'من نبض' : 'From PULSE', () => setActiveSubPage(null))}
          <div className="px-5 divide-y divide-[#18181A]">
            {/* Suggested Pulses */}
            <SettingsGroup
              title={isAr ? 'نبضات مقترحة' : 'Suggested threads'}
              subtitle={isAr ? 'نشر فلان نبضة قد تهمك بناءً على اهتماماتك.' : 'johnappleseed posted a thread you might be interested in.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.suggestedPulses === true}
                onSelect={() => updatePref('suggestedPulses', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.suggestedPulses === false}
                onSelect={() => updatePref('suggestedPulses', false)}
              />
            </SettingsGroup>

            {/* Reminders */}
            <SettingsGroup
              title={isAr ? 'التذكيرات' : 'Reminders'}
              subtitle={isAr ? 'لديك 5 ردود جديدة و10 متابعين جدد.' : 'You have 5 new replies and 10 new followers.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.reminders === true}
                onSelect={() => updatePref('reminders', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.reminders === false}
                onSelect={() => updatePref('reminders', false)}
              />
            </SettingsGroup>

            {/* Product Announcements */}
            <SettingsGroup
              title={isAr ? 'إعلانات المنصة والميزات الجديدة' : 'Product announcements'}
              subtitle={isAr ? 'تعرف على أحدث ميزات وتحديثات نبض وتجربة الاستخدام.' : 'You can now see threads from people you follow using the new Following feed.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.productAnnouncements === true}
                onSelect={() => updatePref('productAnnouncements', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.productAnnouncements === false}
                onSelect={() => updatePref('productAnnouncements', false)}
              />
            </SettingsGroup>

            {/* Follow Suggestions */}
            <SettingsGroup
              title={isAr ? 'اقتراحات المتابعة الدورية' : 'Follow suggestions'}
              subtitle={isAr ? 'تابع المبدعين لترى نبضاتهم أولاً بأول.' : 'Follow johnappleseed to see when they post new threads.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.periodicFollowSuggestions === true}
                onSelect={() => updatePref('periodicFollowSuggestions', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.periodicFollowSuggestions === false}
                onSelect={() => updatePref('periodicFollowSuggestions', false)}
              />
            </SettingsGroup>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // ============================================================================
  // SUB-PAGE 5: Messages (الرسائل المباشرة)
  // ============================================================================
  if (activeSubPage === 'messages') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-20 max-w-xl mx-auto">
          {renderHeader(isAr ? 'الرسائل المباشرة' : 'Messages', () => setActiveSubPage(null))}
          <div className="px-5 divide-y divide-[#18181A]">
            {/* Message Requests */}
            <SettingsGroup
              title={isAr ? 'طلبات المراسلة' : 'Message requests'}
              subtitle={isAr ? 'يريد فلان إرسال رسالة خاصة إليك.' : 'johnappleseed wants to send you a message.'}
            >
              <RadioOptionRow
                label={isAr ? 'من الجميع' : 'From everyone'}
                selected={prefs.messageRequests === 'everyone'}
                onSelect={() => updatePref('messageRequests', 'everyone')}
              />
              <RadioOptionRow
                label={isAr ? 'من الأشخاص الذين تتابعهم' : 'From people you follow'}
                selected={prefs.messageRequests === 'following'}
                onSelect={() => updatePref('messageRequests', 'following')}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.messageRequests === 'off'}
                onSelect={() => updatePref('messageRequests', 'off')}
              />
            </SettingsGroup>

            {/* Direct Messages */}
            <SettingsGroup
              title={isAr ? 'رسائل المحادثات المباشرة' : 'Direct messages'}
              subtitle={isAr ? 'أرسل لك فلان رسالة جديدة.' : 'johnappleseed sent you a message.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.directMessages === true}
                onSelect={() => updatePref('directMessages', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.directMessages === false}
                onSelect={() => updatePref('directMessages', false)}
              />
            </SettingsGroup>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // ============================================================================
  // SUB-PAGE 6: Email notifications (إشعارات البريد الإلكتروني)
  // ============================================================================
  if (activeSubPage === 'email_notifications') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubPage(null)}>
        <div className="min-h-screen bg-black text-white pb-20 max-w-xl mx-auto">
          {renderHeader(isAr ? 'إشعارات البريد الإلكتروني' : 'Email notifications', () => setActiveSubPage(null))}
          <div className="px-5 divide-y divide-[#18181A]">
            {/* Feedback emails */}
            <SettingsGroup
              title={isAr ? 'استطلاعات الرأي والتطوير' : 'Feedback emails'}
              subtitle={isAr ? 'المشاركة في تحسين وتطوير منصة نبض.' : 'Give feedback on PULSE.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.emailFeedback === true}
                onSelect={() => updatePref('emailFeedback', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.emailFeedback === false}
                onSelect={() => updatePref('emailFeedback', false)}
              />
            </SettingsGroup>

            {/* Reminder emails */}
            <SettingsGroup
              title={isAr ? 'رسائل التذكير' : 'Reminder emails'}
              subtitle={isAr ? 'موجز بالردود والتفاعلات التي فاتتك.' : 'Catch up on notifications you missed.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.emailReminders === true}
                onSelect={() => updatePref('emailReminders', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.emailReminders === false}
                onSelect={() => updatePref('emailReminders', false)}
              />
            </SettingsGroup>

            {/* Product news emails */}
            <SettingsGroup
              title={isAr ? 'أخبار المنصة والميزات الجديدة' : 'Product news emails'}
              subtitle={isAr ? 'رسائل بريدية بأهم التحديثات والإعلانات.' : 'Find out about new PULSE features and announcements.'}
            >
              <RadioOptionRow
                label={isAr ? 'تشغيل' : 'On'}
                selected={prefs.emailProductNews === true}
                onSelect={() => updatePref('emailProductNews', true)}
              />
              <RadioOptionRow
                label={isAr ? 'إيقاف' : 'Off'}
                selected={prefs.emailProductNews === false}
                onSelect={() => updatePref('emailProductNews', false)}
              />
            </SettingsGroup>

            {/* Security Alerts (Always On) */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium text-white">{isAr ? 'تنبيهات الأمان والدخول' : 'Security alerts'}</div>
                  <div className="text-[13px] font-normal text-[#71717A] mt-0.5">
                    {isAr ? 'تنبيهات فورية عند تسجيل الدخول من جهاز جديد.' : 'Immediate notices when logging in from new devices.'}
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 text-white border border-white/20 whitespace-nowrap">
                  {isAr ? 'مفعّلة دائماً' : 'Always On'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // ============================================================================
  // MAIN VIEW: Notifications (Screenshot 1: 1:1 Architecture)
  // ============================================================================
  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
        {/* Main Header (Exact match to Screenshot 1) */}
        {renderHeader(isAr ? 'الإشعارات' : 'Notifications', onBack)}

        <div className="px-0">
          {/* Section 1: Push notifications */}
          <div className="pt-6 pb-2 px-5 text-[14px] font-medium text-white">
            {isAr ? 'إشعارات التنبيهات المباشرة' : 'Push notifications'}
          </div>

          <div className="divide-y divide-[#18181A]">
            {/* Pause all row */}
            <div className="py-3.5 px-5 flex items-center justify-between">
              <div>
                <span className="text-[15px] font-normal text-white">{isAr ? 'إيقاف مؤقت للكل' : 'Pause all'}</span>
                {prefs.pauseAll && prefs.pauseUntil && (
                  <div className="text-[12px] text-[#A1A1AA] flex items-center gap-1.5 mt-0.5">
                    <Clock size={12} className="text-[#0095F6]" />
                    <span>
                      {isAr ? 'ينتهي الإيقاف: ' : 'Paused until: '}
                      {new Date(prefs.pauseUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>

              {/* iOS-Style Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(prefs.pauseAll)}
                  onChange={(e) => handlePauseToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#3F3F46] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0095F6]"></div>
              </label>
            </div>

            {/* Threads and replies */}
            <button
              type="button"
              onClick={() => {
                hapticsService.selection?.();
                setActiveSubPage('threads_replies');
              }}
              className="w-full py-3.5 px-5 flex items-center justify-between text-left active:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-[15px] font-normal text-white">{isAr ? 'النبضات والردود' : 'Threads and replies'}</span>
              <ChevronIcon size={18} className="text-[#52525B]" />
            </button>

            {/* Following and followers */}
            <button
              type="button"
              onClick={() => {
                hapticsService.selection?.();
                setActiveSubPage('following_followers');
              }}
              className="w-full py-3.5 px-5 flex items-center justify-between text-left active:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-[15px] font-normal text-white">{isAr ? 'المتابعات والمتابعون' : 'Following and followers'}</span>
              <ChevronIcon size={18} className="text-[#52525B]" />
            </button>

            {/* Custom feeds */}
            <button
              type="button"
              onClick={() => {
                hapticsService.selection?.();
                setActiveSubPage('custom_feeds');
              }}
              className="w-full py-3.5 px-5 flex items-center justify-between text-left active:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-[15px] font-normal text-white">{isAr ? 'التغذية المخصصة' : 'Custom feeds'}</span>
              <ChevronIcon size={18} className="text-[#52525B]" />
            </button>

            {/* From PULSE */}
            <button
              type="button"
              onClick={() => {
                hapticsService.selection?.();
                setActiveSubPage('from_pulse');
              }}
              className="w-full py-3.5 px-5 flex items-center justify-between text-left active:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-[15px] font-normal text-white">{isAr ? 'من نبض' : 'From PULSE'}</span>
              <ChevronIcon size={18} className="text-[#52525B]" />
            </button>

            {/* Messages */}
            <button
              type="button"
              onClick={() => {
                hapticsService.selection?.();
                setActiveSubPage('messages');
              }}
              className="w-full py-3.5 px-5 flex items-center justify-between text-left active:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-[15px] font-normal text-white">{isAr ? 'الرسائل المباشرة' : 'Messages'}</span>
              <ChevronIcon size={18} className="text-[#52525B]" />
            </button>
          </div>

          {/* Section 2: Other notification types (Screenshot 1) */}
          <div className="pt-8 pb-2 px-5 text-[14px] font-medium text-white">
            {isAr ? 'أنواع الإشعارات الأخرى' : 'Other notification types'}
          </div>

          <div className="divide-y divide-[#18181A]">
            {/* Email notifications */}
            <button
              type="button"
              onClick={() => {
                hapticsService.selection?.();
                setActiveSubPage('email_notifications');
              }}
              className="w-full py-3.5 px-5 flex items-center justify-between text-left active:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-[15px] font-normal text-white">{isAr ? 'إشعارات البريد الإلكتروني' : 'Email notifications'}</span>
              <ChevronIcon size={18} className="text-[#52525B]" />
            </button>
          </div>
        </div>

        {/* Pause Duration Bottom Sheet Modal */}
        {showPauseModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center animate-fade-in">
            <div
              className="w-full max-w-lg bg-[#18181B] rounded-t-3xl border-t border-[#27272A] p-5 pb-8 space-y-2 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'إيقاف الإشعارات مؤقتاً' : 'Pause push notifications'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  className="w-7 h-7 rounded-full bg-[#27272A] flex items-center justify-center text-neutral-400 active:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="divide-y divide-[#27272A] pt-1">
                {[
                  { minutes: 15, label: isAr ? 'لمدة 15 دقيقة' : '15 minutes' },
                  { minutes: 60, label: isAr ? 'لمدة ساعة واحدة' : '1 hour' },
                  { minutes: 120, label: isAr ? 'لمدة ساعتين' : '2 hours' },
                  { minutes: 240, label: isAr ? 'لمدة 4 ساعات' : '4 hours' },
                  { minutes: 480, label: isAr ? 'لمدة 8 ساعات' : '8 hours' },
                  { minutes: 0, label: isAr ? 'حتى أقوم بإلغائها' : 'Until turned off' }
                ].map((item) => (
                  <button
                    key={item.minutes}
                    type="button"
                    onClick={() => handleSelectPauseDuration(item.minutes)}
                    className="w-full py-3.5 px-2 flex items-center justify-between text-left active:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-medium text-white">{item.label}</span>
                    <Clock size={16} className="text-[#71717A]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SwipeBackWrapper>
  );
}
