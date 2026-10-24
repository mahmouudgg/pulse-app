import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Share2, Copy, Check, Users, MessageCircle, 
  Mail, Smartphone, Search, UserPlus, Send, ExternalLink,
  ShieldCheck, RefreshCw, Phone
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import PioneerBadge from '../components/PioneerBadge';
import VerifiedBadge from '../components/VerifiedBadge';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { storageService } from '../services/storageService';
import { contactsService } from '../services/contactsService';
import { hapticsService } from '../services/hapticsService';
import { Share } from '@capacitor/share';

export default function FollowInvitePage({ currentUser, onBack, onOpenUserProfile }) {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const [copied, setCopied] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsList, setContactsList] = useState([]);
  const [contactsSearch, setContactsSearch] = useState('');
  const [hasLoadedContacts, setHasLoadedContacts] = useState(false);

  // Suggested Pioneers / Creators list
  const [pioneers, setPioneers] = useState([]);
  const [followingMap, setFollowingMap] = useState({});

  const inviteUrl = `https://pulseeg.wuaze.com/${encodeURIComponent(currentUser?.username || 'user')}`;
  const shareMessage = isAr 
    ? `انضم إليّ على PULSE، المنصة الفكرية الأرقى للتواصل والنبضات الصوتية والمجالس! سجّل عبر رابط دعوتي الحصري: ${inviteUrl}`
    : `Join me on PULSE, the premier intellectual social platform for discussions and audio spaces! Use my exclusive invite: ${inviteUrl}`;

  useEffect(() => {
    try {
      const allUsers = storageService.getUsers() || [];
      const filtered = allUsers
        .filter((u) => u.uid !== currentUser?.uid && u.username !== currentUser?.username)
        .slice(0, 15);
      setPioneers(filtered);

      const fMap = {};
      (currentUser?.following || []).forEach((id) => {
        fMap[id] = true;
      });
      setFollowingMap(fMap);
    } catch (e) {
      console.warn('Error loading pioneers for invite page:', e);
    }
  }, [currentUser]);

  const handleCopyLink = async () => {
    try {
      hapticsService.light?.();
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      showToast(isAr ? 'تم نسخ رابط الدعوة الحصري!' : 'Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(isAr ? 'تعذر النسخ، يرجى المحاولة يدوياً' : 'Could not copy link');
    }
  };

  const handleNativeShare = async () => {
    try {
      hapticsService.medium?.();
      await Share.share({
        title: 'PULSE - النبضة الفكرية',
        text: shareMessage,
        url: inviteUrl,
        dialogTitle: isAr ? 'مشاركة رابط دعوة PULSE' : 'Share PULSE invite link'
      });
    } catch (e) {
      handleCopyLink();
    }
  };

  const handleShareWhatsApp = () => {
    hapticsService.light?.();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = () => {
    hapticsService.light?.();
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(isAr ? 'انضم إلي على منصة PULSE الفكرية' : 'Join me on PULSE')}`;
    window.open(url, '_blank');
  };

  const handleShareSMS = () => {
    hapticsService.light?.();
    const url = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.location.href = url;
  };

  const handleShareEmail = () => {
    hapticsService.light?.();
    const subject = encodeURIComponent(isAr ? 'دعوة خاصة للانضمام إلى PULSE' : 'Exclusive invite to join PULSE');
    const body = encodeURIComponent(shareMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleLoadContacts = async () => {
    setContactsLoading(true);
    hapticsService.light?.();
    try {
      const res = await contactsService.getRealContacts();
      if (res && res.success && Array.isArray(res.contacts)) {
        setContactsList(res.contacts);
        setHasLoadedContacts(true);
        showToast(isAr ? `تمت مزامنة ${res.contacts.length} جهة اتصال` : `Synced ${res.contacts.length} contacts`);
      } else {
        showToast(isAr ? 'لم نتمكن من الوصول لجهات الاتصال، تأكد من الأذونات' : 'Could not access contacts. Check permissions', 'error');
      }
    } catch (err) {
      showToast(isAr ? 'حدث خطأ أثناء مزامنة جهات الاتصال' : 'Error accessing contacts', 'error');
    } finally {
      setContactsLoading(false);
    }
  };

  const handleToggleFollow = (targetUser) => {
    if (!currentUser) return;
    hapticsService.light?.();
    const isNowFollowing = storageService.toggleFollow(targetUser.uid, currentUser);
    setFollowingMap((prev) => ({
      ...prev,
      [targetUser.uid]: isNowFollowing
    }));
    showToast(
      isNowFollowing 
        ? (isAr ? `بدأت بمتابعة @${targetUser.username}` : `Following @${targetUser.username}`)
        : (isAr ? `ألغيت متابعة @${targetUser.username}` : `Unfollowed @${targetUser.username}`)
    );
  };

  const filteredContacts = contactsList.filter((c) => {
    if (!contactsSearch.trim()) return true;
    const q = contactsSearch.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                hapticsService.light?.();
                onBack();
              }}
              className="p-1.5 -ml-1 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={21} strokeWidth={2.2} />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">
              {isAr ? 'متابعة ودعوة الأصدقاء' : 'Follow and invite friends'}
            </h1>
          </div>
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 tap-press transition-colors"
            title={isAr ? 'مشاركة' : 'Share'}
          >
            <Share2 size={19} />
          </button>
        </div>

        <div className="p-4 space-y-6">

          {/* Hero Exclusive Referral Card */}
          <div className="rounded-3xl bg-gradient-to-b from-[#18181C] to-[#101012] border border-[#26262C] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <UserPlus size={14} className="text-white" />
                <span>{isAr ? 'رابط دعوة الرواد الحصري' : 'Exclusive Pioneer Referral'}</span>
              </div>
              <PioneerBadge number={currentUser?.pioneerNumber || 1} size="sm" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white leading-tight">
                {isAr ? 'ادعُ نخبة أصدقائك إلى مجتمع PULSE' : 'Invite your network to PULSE'}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'شارك رابطك الشخصي. سيحصل أصدقاؤك على وصول فوري ومتابعة تلقائية لملفك الشخصي كأحد رواد المنصة.'
                  : 'Share your personal referral link to give friends direct access and pioneer onboarding.'}
              </p>
            </div>

            {/* Link Box & Action Buttons */}
            <div className="flex items-center gap-2 bg-black/80 border border-[#28282E] rounded-2xl p-2 pl-3">
              <span className="text-xs text-neutral-300 font-mono truncate flex-1" dir="ltr">
                {inviteUrl}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 tap-press transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                {copied ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
                <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* Quick Direct Invite Channels */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
              {isAr ? 'قنوات الدعوة المباشرة' : 'Direct invite channels'}
            </div>
            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
              
              {/* WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{isAr ? 'دعوة عبر واتساب' : 'Invite friends via WhatsApp'}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{isAr ? 'إرسال رسالة جاهزة لجهات اتصالك' : 'Send prefilled invite message'}</div>
                  </div>
                </div>
                <Send size={16} className="text-neutral-500 rotate-45" />
              </button>

              {/* Telegram */}
              <button
                onClick={handleShareTelegram}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Send size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{isAr ? 'دعوة عبر تيليجرام' : 'Invite friends via Telegram'}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{isAr ? 'مشاركة في المجموعات والمحادثات' : 'Share in groups and chats'}</div>
                  </div>
                </div>
                <ExternalLink size={16} className="text-neutral-500" />
              </button>

              {/* SMS */}
              <button
                onClick={handleShareSMS}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{isAr ? 'دعوة عبر الرسائل القصيرة (SMS)' : 'Invite friends via SMS'}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{isAr ? 'إرسال رسالة نصية مباشرة لهواتف أصدقائك' : 'Send direct SMS to contacts'}</div>
                  </div>
                </div>
                <Send size={16} className="text-neutral-500" />
              </button>

              {/* Email */}
              <button
                onClick={handleShareEmail}
                className="w-full p-4 flex items-center justify-between text-start hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5 text-neutral-200">
                  <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{isAr ? 'دعوة عبر البريد الإلكتروني' : 'Invite friends via Email'}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{isAr ? 'إرسال دعوة رسمية أنيقة عبر الإيميل' : 'Send an official email invitation'}</div>
                  </div>
                </div>
                <Send size={16} className="text-neutral-500" />
              </button>

            </div>
          </div>

          {/* Contacts Sync Card */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
              {isAr ? 'مزامنة جهات اتصال الهاتف' : 'Contact book synchronization'}
            </div>

            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Phone size={19} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {isAr ? 'اكتشاف الأصدقاء من دفتر العناوين' : 'Discover friends from address book'}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                      {isAr 
                        ? 'مزامنة جهات الاتصال للتعرف على من انضم إلى PULSE ومتابعتهم فوراً.' 
                        : 'Connect your contacts to see who is on PULSE and follow them instantly.'}
                    </div>
                  </div>
                </div>
              </div>

              {!hasLoadedContacts ? (
                <button
                  onClick={handleLoadContacts}
                  disabled={contactsLoading}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {contactsLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Users size={15} />
                  )}
                  <span>{contactsLoading ? (isAr ? 'جاري الفحص والمزامنة...' : 'Syncing...') : (isAr ? 'مزامنة جهات الاتصال الآن' : 'Sync Contacts Now')}</span>
                </button>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="relative">
                    <Search size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-neutral-500" />
                    <input
                      type="text"
                      value={contactsSearch}
                      onChange={(e) => setContactsSearch(e.target.value)}
                      placeholder={isAr ? 'ابحث في جهات الاتصال...' : 'Search contacts...'}
                      className="w-full bg-black border border-[#26262A] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-[#1C1C20] rounded-xl border border-[#222226] bg-black/40">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((c) => (
                        <div key={c.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{c.name}</div>
                            {c.phone && <div className="text-[10px] text-neutral-500 font-mono truncate" dir="ltr">{c.phone}</div>}
                          </div>
                          <button
                            onClick={() => {
                              hapticsService.light?.();
                              const smsUrl = `sms:${encodeURIComponent(c.phone || '')}?body=${encodeURIComponent(shareMessage)}`;
                              window.location.href = smsUrl;
                            }}
                            className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium tap-press transition-colors flex-shrink-0"
                          >
                            {isAr ? 'دعوة' : 'Invite'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-neutral-500">
                        {isAr ? 'لا توجد جهات اتصال مطابقة للبحث' : 'No matching contacts'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Pioneers & Creators on PULSE */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
              {isAr ? 'رواد ومبدعون يستحقون المتابعة' : 'Pioneers to follow on PULSE'}
            </div>

            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
              {pioneers.length > 0 ? (
                pioneers.map((user) => {
                  const isFollowing = Boolean(followingMap[user.uid]);
                  const avatar = user.avatar || DEFAULT_AVATAR;
                  const displayName = user.displayName || user.username || 'User';

                  return (
                    <div key={user.uid} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors">
                      <div 
                        onClick={() => {
                          if (onOpenUserProfile) onOpenUserProfile(user);
                        }}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border border-white/10 bg-neutral-900 flex-shrink-0"
                          onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-white truncate">{displayName}</span>
                            {user.pioneerNumber && <PioneerBadge number={user.pioneerNumber} size="xs" />}
                            {user.isVerified && <VerifiedBadge size={13} />}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono truncate" dir="ltr">
                            @{user.username}
                          </div>
                          {user.bio && (
                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFollow(user)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold tap-press transition-all flex-shrink-0 ${
                          isFollowing
                            ? 'bg-transparent border border-[#2C2C32] text-neutral-300 hover:border-red-500/50 hover:text-red-400'
                            : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
                        }`}
                      >
                        {isFollowing 
                          ? (isAr ? 'تتابعه' : 'Following') 
                          : (isAr ? 'متابعة' : 'Follow')}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-neutral-500">
                  {isAr ? 'جاري تحميل الرواد...' : 'Loading pioneers...'}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </SwipeBackWrapper>
  );
}
