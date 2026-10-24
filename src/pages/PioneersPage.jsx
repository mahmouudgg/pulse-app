import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Share2, Copy, Check, 
  Users, Search, ShieldCheck, Compass, Smartphone, ExternalLink, UserCheck, UserPlus 
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { contactsService } from '../services/contactsService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';
import PioneerBadge from '../components/PioneerBadge';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { hapticsService } from '../services/hapticsService';

export default function PioneersPage({ currentUser, onBack, onOpenUserProfile }) {
  const { lang } = useLanguage();
  const { toggleFollow } = useAuth();
  const [copied, setCopied] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsPermissionDenied, setContactsPermissionDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPioneers, setTotalPioneers] = useState(() => storageService.getPioneerCount());
  const [followingMap, setFollowingMap] = useState(() => {
    const map = {};
    (currentUser?.following || []).forEach(uid => { map[uid] = true; });
    return map;
  });

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;
  const isFounder = currentUser?.isFounder || currentUser?.username === 'my';
  const pioneerNum = currentUser?.pioneerNumber || (isFounder ? 1 : 1);
  const inviteLink = `https://pulseeg.wuaze.com/${encodeURIComponent(currentUser?.username || 'my')}`;

  // Live Real Pioneer Counter Sync (Bandwidth-Optimized)
  useEffect(() => {
    setTotalPioneers(storageService.getPioneerCount());

    storageService.getCloudPioneerCount().then((count) => {
      if (typeof count === 'number' && count > 0) {
        setTotalPioneers(count);
      }
    });
  }, []);

  const handleCopyLink = () => {
    hapticsService.light();
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    contactsService.shareNative(pioneerNum, currentUser?.username || 'my');
  };

  const handleRequestContacts = async () => {
    setLoadingContacts(true);
    setContactsPermissionDenied(false);

    const res = await contactsService.getRealContacts();
    setLoadingContacts(false);

    if (res.success && Array.isArray(res.contacts)) {
      setContacts(res.contacts);
    } else {
      setContactsPermissionDenied(true);
    }
  };

  const handleToggleFollow = (targetUser) => {
    hapticsService.light();
    toggleFollow(targetUser.uid);
    setFollowingMap(prev => ({
      ...prev,
      [targetUser.uid]: !prev[targetUser.uid]
    }));
  };

  const normalizePhone = (num) => {
    if (!num) return '';
    return num.replace(/[\s\-\(\)\+]/g, '').replace(/^0+/, '');
  };

  const registeredUsers = storageService.getUsers();

  // Separate contacts into:
  // 1. Matched users on PULSE ("أشخاص قد تعرفهم من جهات الاتصال")
  // 2. Unmatched contacts for standard invitation
  const matchedUsers = [];
  const unmatchedContacts = [];

  contacts.forEach((c) => {
    const normCPhone = normalizePhone(c.phone);
    if (!normCPhone || normCPhone.length < 7) {
      unmatchedContacts.push(c);
      return;
    }

    const found = registeredUsers.find((u) => {
      if (u.uid === currentUser?.uid) return false;
      const uPhone = normalizePhone(u.phone);
      const uFull = normalizePhone(u.fullPhone);
      return (
        (uPhone && (normCPhone.endsWith(uPhone) || uPhone.endsWith(normCPhone))) ||
        (uFull && (normCPhone.endsWith(uFull) || uFull.endsWith(normCPhone)))
      );
    });

    if (found && !matchedUsers.some(m => m.user.uid === found.uid)) {
      matchedUsers.push({
        user: found,
        contactName: c.name,
        contactPhone: c.phone
      });
    } else {
      unmatchedContacts.push(c);
    }
  });

  const filteredMatched = matchedUsers.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.user.displayName?.toLowerCase().includes(q) ||
      m.user.username?.toLowerCase().includes(q) ||
      m.contactName?.toLowerCase().includes(q)
    );
  });

  const filteredUnmatched = unmatchedContacts.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const getInitials = (name) => {
    if (!name) return '•';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-20 max-w-xl mx-auto border-x border-[#141414] select-none">
      {/* Top Header - PULSE Official Minimal */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#141414] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#141414] transition-colors tap-press"
          >
            <BackIcon size={20} />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
              الرواد المؤسسون
            </h1>
            <p className="text-[11px] text-neutral-500 font-mono">
              Founding Pioneers · 10,000 Limited
            </p>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-full bg-[#111111] border border-[#222222] text-[10px] font-mono text-neutral-300 font-bold">
          PIONEER #{pioneerNum}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Monochromatic Status Card */}
        <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#1A1A1A] space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black tracking-wider px-2 py-0.5 rounded bg-white text-black">
                  PIONEER #{pioneerNum}
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">عضو تاريخي</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight pt-1">
                شارة الرواد الأوائل الحصرية
              </h2>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#141414] border border-[#242424] flex items-center justify-center text-white flex-shrink-0">
              <Compass size={17} className="text-neutral-200" />
            </div>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed font-normal">
            أنت من الأعضاء الأوائل على منصة PULSE. شارك دعوتك الخاصة مع أصدقائك لحجز مقاعدهم التأسيسية الدائمة قبل اكتمال الـ 10,000 رائد.
          </p>

          {/* Clean Monochrome Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-500">المقاعد المحجوزة</span>
              <span className="text-white font-bold">{totalPioneers} / 10,000</span>
            </div>
            <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div 
                style={{ width: `${Math.max(2, (totalPioneers / 10000) * 100)}%` }}
                className="h-full bg-white rounded-full transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Minimalist Share Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleNativeShare}
            className="py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all tap-press flex items-center justify-center gap-2 shadow-sm"
          >
            <Share2 size={15} />
            <span>مشاركة الدعوة</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="py-3 px-4 rounded-xl bg-[#111111] hover:bg-[#181818] border border-[#222222] text-white text-xs font-bold transition-all tap-press flex items-center justify-center gap-2"
          >
            {copied ? <Check size={15} className="text-white" /> : <Copy size={15} className="text-neutral-400" />}
            <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
          </button>
        </div>

        {/* Real Phone Contacts Sync Section */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#090909] border border-[#181818] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-neutral-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                جهات اتصال هاتفك الحقيقية
              </h3>
            </div>
            {contacts.length > 0 && (
              <span className="text-[11px] text-neutral-400 font-mono">
                {contacts.length} جهة اتصال
              </span>
            )}
          </div>

          {/* Sync Trigger Card (If not synced yet) */}
          {contacts.length === 0 && (
            <div className="text-center py-6 px-4 space-y-3 bg-[#0D0D0D] border border-[#1F1F1F] rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#181818] border border-[#262626] flex items-center justify-center mx-auto text-neutral-300">
                <Smartphone size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">مزامنة سجل الهاتف</h4>
                <p className="text-[11px] text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  يتم قراءة جهات الاتصال من جهازك مباشرة وبأمان تام لدعوتهم بضغطة زر.
                </p>
              </div>

              <button
                onClick={handleRequestContacts}
                disabled={loadingContacts}
                className="mt-2 py-2.5 px-6 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold tap-press transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Users size={14} />
                <span>{loadingContacts ? 'جاري طلب الإذن والتحميل...' : 'مزامنة جهات الاتصال الآن'}</span>
              </button>

              {contactsPermissionDenied && (
                <div className="text-[11px] text-neutral-400 pt-2 font-mono">
                  تم رفض الإذن أو عدم اختيار جهات اتصال. يمكنك إرسال الرابط عبر زر المشاركة أعلاه.
                </div>
              )}
            </div>
          )}

          {/* Real Loaded Contacts List */}
          {contacts.length > 0 && (
            <div className="space-y-3">
              {/* Search contacts input */}
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في جهات اتصالك..."
                  dir="auto"
                  className="w-full bg-[#121212] border border-[#222222] focus:border-neutral-500 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>

              {/* Matched PULSE Users (People You May Know from Contacts) */}
              {filteredMatched.length > 0 && (
                <div className="p-3.5 bg-[#111114] border border-white/10 rounded-2xl space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Users size={14} className="text-white" />
                      <span>أشخاص قد تعرفهم على PULSE (من جهات اتصالك)</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                      {filteredMatched.length}
                    </span>
                  </div>

                  <div className="divide-y divide-[#1C1C20]">
                    {filteredMatched.map(({ user, contactName, contactPhone }) => {
                      const isFollowed = followingMap[user.uid];
                      return (
                        <div key={user.uid} className="py-2.5 flex items-center justify-between gap-3">
                          <div 
                            onClick={() => onOpenUserProfile && onOpenUserProfile(user)}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                          >
                            <img
                              src={resolveAvatar(user.avatar)}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                              alt={user.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-[#282828] group-hover:border-white transition-colors flex-shrink-0 block"
                              style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', maxWidth: '36px', maxHeight: '36px' }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[180px]">
                                  {user.displayName}
                                </span>
                                <PioneerBadge number={user.pioneerNumber} size="xs" />
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono" dir="ltr">
                                @{user.username}
                              </div>
                              <div className="text-[9px] text-neutral-500 truncate mt-0.5">
                                مسجل باسم: {contactName}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleFollow(user)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all tap-press flex items-center gap-1 flex-shrink-0 ${
                              isFollowed
                                ? 'bg-[#18181A] border border-[#2A2A2E] text-neutral-300 hover:text-white'
                                : 'bg-white text-black hover:bg-neutral-200'
                            }`}
                          >
                            {isFollowed ? (
                              <>
                                <UserCheck size={12} />
                                <span>متابع</span>
                              </>
                            ) : (
                              <>
                                <UserPlus size={12} />
                                <span>متابعة</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unmatched Contacts for Direct Invite */}
              {filteredUnmatched.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-neutral-400 px-1 py-1 flex items-center gap-1.5">
                    <span>دعوة باقي جهات اتصالك للانضمام</span>
                    <span className="text-[10px] font-mono text-neutral-500">({filteredUnmatched.length})</span>
                  </div>

                  <div className="divide-y divide-[#141414] max-h-80 overflow-y-auto pr-0.5">
                    {filteredUnmatched.map((contact) => (
                      <div
                        key={contact.id}
                        className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#0E0E0E] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#181818] border border-[#242424] flex items-center justify-center text-[10px] font-bold text-neutral-300 flex-shrink-0 font-mono">
                            {getInitials(contact.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate max-w-[170px] sm:max-w-[220px]">
                              {contact.name}
                            </div>
                            {contact.phone && (
                              <div className="text-[10px] text-neutral-500 font-mono mt-0.5" dir="ltr">
                                {contact.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => contactsService.inviteContact(contact, pioneerNum, currentUser?.username || 'my')}
                          className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-white hover:text-black border border-[#242424] text-neutral-300 text-xs font-bold transition-all tap-press flex-shrink-0"
                        >
                          دعوة
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredMatched.length === 0 && filteredUnmatched.length === 0 && (
                <div className="py-6 text-center text-xs text-neutral-500 font-mono">
                  لا توجد نتائج مطابقة في جهات الاتصال.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </SwipeBackWrapper>
  );
}
