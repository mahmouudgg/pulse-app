import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Users, Shield, Clock, Moon, Lock, 
  Check, AlertCircle, X, ChevronRight, ChevronLeft, UserPlus, 
  Smartphone, EyeOff, HeartHandshake, CheckCircle2, UserCheck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { supervisionService } from '../services/supervisionService';
import { hapticsService } from '../services/hapticsService';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

export default function SupervisionPage({ currentUser, onBack }) {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const [settings, setSettings] = useState(() => supervisionService.getSettings(currentUser));
  const [activeTab, setActiveTab] = useState(() => settings.isTeen ? 'teen' : 'guardian');
  const [todayMinutes, setTodayMinutes] = useState(() => supervisionService.getTodayUsageMinutes());
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [guardianInput, setGuardianInput] = useState('');
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setSettings(supervisionService.getSettings(currentUser));
      setTodayMinutes(supervisionService.getTodayUsageMinutes());
    }
  }, [currentUser]);

  const handleUpdate = async (patch) => {
    try {
      hapticsService.light?.();
      const updated = await supervisionService.saveSettings(currentUser, patch);
      setSettings(updated);
      showToast(isAr ? 'تم حفظ التعديلات بنجاح' : 'Settings updated successfully', 'success');
    } catch (e) {
      showToast(isAr ? 'حدث خطأ أثناء الحفظ' : 'Error updating settings', 'error');
    }
  };

  const handleLinkGuardian = async (e) => {
    e.preventDefault();
    if (!guardianInput.trim()) return;

    setIsSubmittingLink(true);
    try {
      hapticsService.medium?.();
      const res = await supervisionService.linkGuardian(currentUser, guardianInput);
      setSettings(supervisionService.getSettings(currentUser));
      setIsLinkingModalOpen(false);
      setGuardianInput('');
      showToast(
        isAr 
          ? `تم ربط حساب ولي الأمر @${res.guardian.username} بنجاح!` 
          : `Linked with @${res.guardian.username} successfully!`,
        'success'
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من إلغاء ربط حساب الإشراف العائلي؟' : 'Are you sure you want to unlink family supervision?')) {
      return;
    }

    try {
      hapticsService.medium?.();
      await supervisionService.unlink(currentUser);
      setSettings(supervisionService.getSettings(currentUser));
      showToast(isAr ? 'تم إلغاء ربط الحساب' : 'Unlinked successfully');
    } catch (err) {
      showToast(isAr ? 'حدث خطأ أثناء إلغاء الربط' : 'Error unlinking', 'error');
    }
  };

  const limitMinutes = settings.dailyLimitMinutes || 0;
  const usagePercent = limitMinutes > 0 ? Math.min(100, Math.round((todayMinutes / limitMinutes) * 100)) : 0;

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto border-x border-[#1C1C22]" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Top Header */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={21} strokeWidth={2.2} />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">
              {isAr ? 'الإشراف العائلي وحماية المراهقين' : 'Family Supervision'}
            </h1>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="p-4">
          <div className="rounded-3xl bg-gradient-to-b from-[#18181E] to-[#101014] border border-[#26262E] p-5 text-center relative overflow-hidden shadow-xl">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto mb-3 shadow-inner">
              <HeartHandshake size={28} />
            </div>
            <h2 className="text-base font-extrabold text-white mb-1.5">
              {isAr ? 'مركز سلامة العائلة على PULSE' : 'PULSE Family Center'}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
              {isAr 
                ? 'نظام أمان رقمي حقيقي مستوحى من أعلى المعايير العالمية لحماية المراهقين (13-17 عاماً) وتنظيم وقت الشاشة مع الحفاظ على خصوصيتهم.' 
                : 'Real digital safety system protecting teens (13-17) and helping families build healthy screen habits while respecting privacy.'}
            </p>

            {/* Role Tabs Switcher */}
            <div className="mt-4 flex rounded-full bg-black/50 p-1 border border-[#24242A] max-w-xs mx-auto">
              <button
                onClick={() => {
                  setActiveTab('teen');
                  hapticsService.selection?.();
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'teen' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isAr ? 'حساب المراهق' : 'Teen Account'}
              </button>
              <button
                onClick={() => {
                  setActiveTab('guardian');
                  hapticsService.selection?.();
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === 'guardian' ? 'bg-white text-black shadow-md' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isAr ? 'ولي الأمر' : 'Guardian'}
              </button>
            </div>
          </div>
        </div>

        {/* Content based on Role Tab */}
        <div className="px-4 space-y-5">
          {/* TAB 1: TEEN PROTECTION MODE */}
          {activeTab === 'teen' && (
            <>
              {/* Linked Guardian Status Card */}
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1C1C22] border border-[#2E2E36] flex items-center justify-center text-white">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">{isAr ? 'ولي الأمر المشرف' : 'Supervising Guardian'}</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {settings.guardianUsername ? `@${settings.guardianUsername}` : (isAr ? 'لا يوجد ولي أمر مرتبط' : 'No guardian linked')}
                      </div>
                    </div>
                  </div>

                  {settings.guardianUsername ? (
                    <button
                      onClick={handleUnlink}
                      className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold tap-press hover:bg-red-500/20"
                    >
                      {isAr ? 'إلغاء الربط' : 'Unlink'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsLinkingModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-bold tap-press shadow-sm hover:bg-neutral-200"
                    >
                      {isAr ? 'ربط ولي أمر' : 'Link Parent'}
                    </button>
                  )}
                </div>
              </div>

              {/* Today's Screen Time Usage Meter */}
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-neutral-400" />
                    <span className="text-sm font-semibold text-white">
                      {isAr ? 'وقت الشاشة اليوم' : 'Screen Time Today'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">
                    {todayMinutes} {isAr ? 'دقيقة' : 'mins'} {limitMinutes > 0 ? `/ ${limitMinutes} ${isAr ? 'د' : 'm'}` : ''}
                  </span>
                </div>

                {limitMinutes > 0 && (
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-[#202026] overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          usagePercent > 90 ? 'bg-red-500' : usagePercent > 75 ? 'bg-amber-400' : 'bg-white'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                      <span>0m</span>
                      <span>{Math.round(limitMinutes / 2)}m</span>
                      <span>{limitMinutes}m</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Limit Preset Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
                  {isAr ? 'حد وقت الاستخدام اليومي' : 'Daily Screen Limit'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: isAr ? '30 د' : '30m', value: 30 },
                    { label: isAr ? '45 د' : '45m', value: 45 },
                    { label: isAr ? 'ساعة' : '1h', value: 60 },
                    { label: isAr ? 'ساعتان' : '2h', value: 120 }
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleUpdate({ dailyLimitMinutes: item.value })}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all tap-press ${
                        settings.dailyLimitMinutes === item.value
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-[#121214] border-[#222226] text-neutral-300 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled Sleep / Downtime Mode */}
              <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                      <Moon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{isAr ? 'وضع النوم وفترة التوقف' : 'Sleep & Downtime Mode'}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {isAr ? 'كتم الإشعارات وإيقاف التصفح ليلًا لتشجيع النوم' : 'Silence alerts and pause feed browsing at night'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.downtimeEnabled}
                    onChange={(e) => handleUpdate({ downtimeEnabled: e.target.checked })}
                    className="w-5 h-5 accent-white cursor-pointer"
                  />
                </div>

                {settings.downtimeEnabled && (
                  <div className="p-4 bg-[#0E0E10] flex items-center justify-between text-xs text-neutral-300">
                    <span className="font-medium">{isAr ? 'ساعات التوقف المجدولة:' : 'Scheduled hours:'}</span>
                    <span className="font-mono bg-white/10 px-2.5 py-1 rounded-md text-white font-bold">
                      {settings.downtimeStart || '22:00'} — {settings.downtimeEnd || '07:00'}
                    </span>
                  </div>
                )}
              </div>

              {/* Strict DM Stranger Blocking */}
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <Lock size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{isAr ? 'حماية الرسائل من الغرباء' : 'Block Stranger DMs'}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {isAr ? 'السماح فقط للحسابات المتبادلة بالمراسلة' : 'Only allow mutual follows to message you'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.blockStrangerDMs}
                  onChange={(e) => handleUpdate({ blockStrangerDMs: e.target.checked })}
                  className="w-5 h-5 accent-white cursor-pointer"
                />
              </div>

              {/* Strict Content Safety Shield */}
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{isAr ? 'الفلترة المشددة للمحتوى الحساس' : 'Strict Sensitive Content Shield'}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {isAr ? 'حجب أقصى تلقائي للكلمات والوسائط غير المناسبة' : 'Auto-hides sensitive media and mature language'}
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.strictContentFilter}
                  onChange={(e) => handleUpdate({ strictContentFilter: e.target.checked })}
                  className="w-5 h-5 accent-white cursor-pointer"
                />
              </div>
            </>
          )}

          {/* TAB 2: GUARDIAN MODE */}
          {activeTab === 'guardian' && (
            <>
              {/* Guardian Overview Info */}
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-2">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield size={16} className="text-emerald-400" />
                  <span>{isAr ? 'إشراف ولي الأمر المعتمد' : 'Supervising as Guardian'}</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {isAr 
                    ? 'يمكنك كولي أمر مراقبة وقت الشاشة وضبط قيود المحتوى والمراسلة لأبنائك، مع الحفاظ الكامل على خصوصية رسائلهم ومحتواهم الشخصي.'
                    : 'Manage screen time and safety controls for your teens without reading their private messages.'}
                </p>
              </div>

              {/* Linked Teens List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    {isAr ? 'الحسابات الخاضعة للإشراف' : 'Supervised Accounts'} ({(settings.linkedTeens || []).length})
                  </span>
                  <button
                    onClick={() => setIsLinkingModalOpen(true)}
                    className="text-xs font-bold text-white flex items-center gap-1 hover:underline tap-press"
                  >
                    <UserPlus size={13} />
                    <span>{isAr ? 'إضافة مراهق' : 'Add Teen'}</span>
                  </button>
                </div>

                <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
                  {(settings.linkedTeens || []).length > 0 ? (
                    settings.linkedTeens.map((teen) => (
                      <div key={teen.uid} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={DEFAULT_AVATAR}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-[#26262E]"
                          />
                          <div>
                            <div className="text-sm font-bold text-white">{teen.displayName || teen.username}</div>
                            <div className="text-[11px] text-neutral-400 font-mono" dir="ltr">@{teen.username}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {isAr ? 'محمي ومراقب' : 'Protected'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-neutral-500 space-y-2">
                      <Users size={28} className="mx-auto text-neutral-600 mb-2" />
                      <p className="font-semibold text-neutral-400">
                        {isAr ? 'لم يتم ربط أي حساب مراهق حتى الآن' : 'No teen accounts linked yet'}
                      </p>
                      <p className="text-[11px] text-neutral-600 max-w-xs mx-auto">
                        {isAr ? 'أدخل اسم مستخدم ابنك المراهق لربط حسابه وتفعيل أدوات الحماية.' : 'Enter your teen’s username to establish supervision.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal: Link Account */}
        {isLinkingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#141418] border border-[#2A2A32] p-5 text-white shadow-2xl space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'ربط حساب للإشراف' : 'Link Account for Supervision'}
                </h3>
                <button onClick={() => setIsLinkingModalOpen(false)} className="p-1 rounded-full text-neutral-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'أدخل اسم المستخدم (@username) أو البريد الإلكتروني لحساب ولي الأمر أو المراهق:' 
                  : 'Enter the @username or email address of the account to link:'}
              </p>

              <form onSubmit={handleLinkGuardian} className="space-y-3">
                <input
                  type="text"
                  value={guardianInput}
                  onChange={(e) => setGuardianInput(e.target.value)}
                  placeholder={isAr ? 'مثال: my أو parent@pulse.app' : 'e.g. username or email'}
                  className="w-full bg-[#1C1C22] border border-[#2E2E36] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                  autoFocus
                />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsLinkingModalOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold tap-press text-neutral-300"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLink || !guardianInput.trim()}
                    className="flex-1 py-2 rounded-xl bg-white text-black text-xs font-bold tap-press hover:bg-neutral-200 disabled:opacity-50"
                  >
                    {isSubmittingLink ? (isAr ? 'جاري التحقق...' : 'Linking...') : (isAr ? 'تأكيد الربط' : 'Confirm')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SwipeBackWrapper>
  );
}
