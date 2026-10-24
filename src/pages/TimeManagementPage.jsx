import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Info, ChevronRight, ChevronLeft, 
  Clock, Moon, Check, X 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { timeTrackerService } from '../services/timeTrackerService';
import { hapticsService } from '../services/hapticsService';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function TimeManagementPage({ onBack }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();

  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const [days, setDays] = useState([]);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [sleepMode, setSleepMode] = useState({ enabled: false, start: '23:00', end: '07:00' });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const loadData = () => {
    const list = timeTrackerService.getPastSevenDays(isAr);
    setDays(list);
    setDailyAverage(timeTrackerService.getDailyAverage());
    setDailyLimit(timeTrackerService.getDailyLimit());
    setSleepMode(timeTrackerService.getSleepMode());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = timeTrackerService.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [isAr]);

  const handleSelectLimit = (minutes) => {
    try { hapticsService.light?.(); } catch {}
    timeTrackerService.setDailyLimit(minutes);
    setDailyLimit(minutes);
    setShowLimitModal(false);
    showToast(
      minutes === 0
        ? (isAr ? 'تم إيقاف الحد اليومي' : 'Daily limit turned off')
        : (isAr ? `تم ضبط الحد اليومي: ${timeTrackerService.formatDuration(minutes, true)}` : `Daily limit set to ${timeTrackerService.formatDuration(minutes, false)}`)
    );
  };

  const handleToggleSleepMode = (enabled) => {
    try { hapticsService.light?.(); } catch {}
    const updated = { ...sleepMode, enabled };
    timeTrackerService.setSleepMode(updated);
    setSleepMode(updated);
    showToast(
      enabled
        ? (isAr ? 'تم تفعيل وضع النوم' : 'Sleep mode enabled')
        : (isAr ? 'تم إيقاف وضع النوم' : 'Sleep mode turned off')
    );
  };

  const formatLimitLabel = (mins) => {
    if (!mins || mins === 0) return isAr ? 'متوقف' : 'Off';
    return timeTrackerService.formatDuration(mins, isAr);
  };

  const formatSleepLabel = () => {
    if (!sleepMode.enabled) return isAr ? 'متوقف' : 'Off';
    return `${sleepMode.start} - ${sleepMode.end}`;
  };

  const LIMIT_OPTIONS = [
    { label: isAr ? 'متوقف' : 'Off', value: 0 },
    { label: isAr ? '15 دقيقة' : '15m', value: 15 },
    { label: isAr ? '30 دقيقة' : '30m', value: 30 },
    { label: isAr ? '45 دقيقة' : '45m', value: 45 },
    { label: isAr ? 'ساعة واحدة' : '1h', value: 60 },
    { label: isAr ? 'ساعتان' : '2h', value: 120 }
  ];

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div 
        className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none font-sans"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Header matching Threads 1:1 */}
        <div className="sticky top-0 z-30 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                onBack();
              }}
              className="p-1 -ms-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={24} strokeWidth={2} />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isAr ? 'إدارة الوقت' : 'Time management'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              try { hapticsService.light?.(); } catch {}
              setShowInfoModal(true);
            }}
            className="p-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"
            title={isAr ? 'معلومات' : 'Information'}
          >
            <Info size={22} strokeWidth={2} />
          </button>
        </div>

        {/* Headline Stat matching Threads screenshot */}
        <div className="px-5 pt-4 pb-2">
          <div className="text-5xl font-bold tracking-tight text-white mb-2">
            {timeTrackerService.formatDuration(dailyAverage, false)}
          </div>
          <div className="text-base font-bold text-white mb-1.5">
            {isAr ? 'المتوسط اليومي' : 'Daily average'}
          </div>
          <p className="text-sm text-zinc-400 font-normal leading-relaxed max-w-md">
            {isAr
              ? 'متوسط الوقت الذي تقضيه يومياً في استخدام PULSE على هذا الجهاز خلال آخر 7 أيام. تعرّف على المزيد حول التوازن في وقتك على الإنترنت.'
              : 'Average time you spent per day using PULSE on this device in the past 7 days. Learn more about balancing your time online.'}
          </p>
        </div>

        {/* 7-Day Rounded Solid White Bar Chart */}
        <div className="px-5 pt-8 pb-4">
          <div className="h-44 flex items-end justify-between gap-2.5">
            {days.map((day, idx) => {
              const isSelected = selectedDay?.key === day.key;
              return (
                <div 
                  key={day.key || idx} 
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  onClick={() => {
                    try { hapticsService.selection?.(); } catch {}
                    setSelectedDay(isSelected ? null : day);
                  }}
                >
                  {/* Selected tooltip */}
                  {isSelected && (
                    <div className="mb-2 px-2 py-0.5 rounded-md bg-zinc-800 text-white text-[11px] font-mono whitespace-nowrap shadow-lg">
                      {timeTrackerService.formatDuration(day.minutes, isAr)}
                    </div>
                  )}

                  {/* Solid White Rounded Bar */}
                  <div className="w-full flex items-end justify-center h-36">
                    <div
                      className={`w-full max-w-[42px] bg-white rounded-2xl transition-all duration-300 ${
                        isSelected ? 'ring-2 ring-white/50 opacity-100' : 'opacity-95 hover:opacity-100'
                      }`}
                      style={{
                        height: `${day.heightPercent}%`,
                        minHeight: '14px'
                      }}
                    />
                  </div>

                  {/* Day Label beneath */}
                  <span className={`text-xs mt-2.5 text-center truncate w-full ${
                    day.isToday ? 'text-white font-semibold' : 'text-zinc-400 font-normal'
                  }`}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-900 mx-5 my-6" />

        {/* Section: Manage your time */}
        <div className="px-5">
          <div className="text-sm font-semibold text-zinc-400 mb-3">
            {isAr ? 'إدارة وقتك' : 'Manage your time'}
          </div>

          <div className="divide-y divide-zinc-900/60">
            {/* Daily limit Row */}
            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setShowLimitModal(true);
              }}
              className="w-full py-4 flex items-center justify-between text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group"
            >
              <span className="text-[15px] font-normal text-white">
                {isAr ? 'الحد اليومي' : 'Daily limit'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400 font-normal">
                  {formatLimitLabel(dailyLimit)}
                </span>
                <Chevron size={18} className="text-zinc-500" />
              </div>
            </button>

            {/* Sleep mode Row */}
            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setShowSleepModal(true);
              }}
              className="w-full py-4 flex items-center justify-between text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group"
            >
              <span className="text-[15px] font-normal text-white">
                {isAr ? 'وضع النوم' : 'Sleep mode'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400 font-normal">
                  {formatSleepLabel()}
                </span>
                <Chevron size={18} className="text-zinc-500" />
              </div>
            </button>
          </div>
        </div>

        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121214] border border-zinc-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-fade-in-up">
              <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-4">
                <Info size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                {isAr ? 'حول إدارة الوقت' : 'About time management'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                {isAr
                  ? 'يتم حساب الوقت الفعلي لنشاطك تلقائياً وبأمان تام على هذا الجهاز فقط دون مشاركة أو إرسال أي بيانات لخوادم خارجية، لمساعدتك في الحفاظ على رفاهيتك الرقمية.'
                  : 'Time spent is calculated securely and locally on this device only without sending data to external servers, helping you maintain digital well-being.'}
              </p>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors"
              >
                {isAr ? 'فهمت ذلك' : 'Got it'}
              </button>
            </div>
          </div>
        )}

        {/* Daily Limit Picker Bottom Sheet Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-[#121214] border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock size={18} />
                  <span>{isAr ? 'تحديد الحد اليومي' : 'Set daily limit'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLimitModal(false)}
                  className="p-1 text-zinc-400 hover:text-white tap-press"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-4">
                {isAr
                  ? 'سننبهك عندما تصل إلى الحد المحدد لمساعدتك في إدارة وقتك.'
                  : 'We will notify you when you reach the selected daily limit.'}
              </p>

              <div className="space-y-1">
                {LIMIT_OPTIONS.map((opt) => {
                  const isSelected = dailyLimit === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectLimit(opt.value)}
                      className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-between text-start transition-colors tap-press ${
                        isSelected ? 'bg-white text-black font-bold' : 'text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-sm">{opt.label}</span>
                      {isSelected && <Check size={18} className="stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sleep Mode Modal */}
        {showSleepModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-[#121214] border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Moon size={18} />
                  <span>{isAr ? 'وضع النوم' : 'Sleep mode'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSleepModal(false)}
                  className="p-1 text-zinc-400 hover:text-white tap-press"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-zinc-400 mb-6">
                {isAr
                  ? 'يقوم وضع النوم بكتم الإشعارات وتذكيرك بأخذ قسط من الراحة خلال ساعات الليل.'
                  : 'Sleep mode mutes notifications and reminds you to rest during nighttime hours.'}
              </p>

              <div className="p-4 rounded-2xl bg-[#18181C] border border-zinc-800 flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isAr ? 'تفعيل وضع النوم' : 'Enable sleep mode'}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {sleepMode.start} - {sleepMode.end}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleSleepMode(!sleepMode.enabled)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors tap-press ${
                    sleepMode.enabled ? 'bg-white' : 'bg-zinc-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-black transition-transform ${
                    sleepMode.enabled ? (isAr ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowSleepModal(false)}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>
    </SwipeBackWrapper>
  );
}