import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRight, ArrowLeft, Search, SquarePen, ListFilter,
  Send, MoreHorizontal, Check, Mic, X, Settings, 
  Trash2, UserX, Shield, CheckCheck, SlidersHorizontal
} from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import PioneerBadge from '../components/PioneerBadge';
import NewChatModal from '../components/NewChatModal';
import { chatService } from '../services/chatService';
import { storageService } from '../services/storageService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { hapticsService } from '../services/hapticsService';

export default function MessagesPage({
  currentUser,
  onBack,
  onOpenChat,
  onOpenUserProfile
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'requests'
  const [requestsSubTab, setRequestsSubTab] = useState('all'); // 'all' | 'hidden'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread'
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Message privacy setting state
  const [messagePermission, setMessagePermission] = useState(() => {
    try {
      const filters = storageService.getContentFilters(currentUser);
      return filters?.messagePermission || 'everyone'; // 'everyone' | 'following' | 'none'
    } catch {
      return 'everyone';
    }
  });

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  // Realtime subscription to conversations
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = chatService.subscribeToConversations(currentUser.uid, (list) => {
      setConversations(list || []);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.uid]);

  // Separate regular conversations vs incoming requests
  const pendingRequests = useMemo(() => {
    return conversations.filter(
      (c) => c && c.isRequest === true && !c.isAccepted && c.requestedBy !== currentUser?.uid
    );
  }, [conversations, currentUser?.uid]);

  const regularConversations = useMemo(() => {
    return conversations.filter(
      (c) => !(c && c.isRequest === true && !c.isAccepted && c.requestedBy !== currentUser?.uid)
    );
  }, [conversations, currentUser?.uid]);

  function getOtherParticipant(conversation) {
    if (!conversation || !conversation.participantDetails) return null;
    const details = conversation.participantDetails;
    const otherUid = Object.keys(details).find((uid) => uid !== currentUser?.uid);
    return otherUid ? details[otherUid] : null;
  }

  // Filtered list based on active tab, search, and filterType
  const currentList = useMemo(() => {
    const baseList = activeTab === 'requests' ? pendingRequests : regularConversations;
    return baseList.filter((conv) => {
      const other = getOtherParticipant(conv);
      if (!other) return false;

      // Filter unread only
      if (activeTab === 'inbox' && filterType === 'unread') {
        const unreadCount = (conv.unread && conv.unread[currentUser?.uid]) || 0;
        if (unreadCount <= 0) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = other.displayName?.toLowerCase().includes(q);
      const userMatch = other.username?.toLowerCase().includes(q);
      return nameMatch || userMatch;
    });
  }, [activeTab, filterType, pendingRequests, regularConversations, searchQuery, currentUser?.uid]);

  // Orbit community avatars for empty state
  const orbitUsers = useMemo(() => {
    try {
      const all = storageService.getUsers().filter((u) => u.uid !== currentUser?.uid);
      return all.slice(0, 7);
    } catch {
      return [];
    }
  }, [currentUser?.uid]);

  // Relative Threads formatted timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return isAr ? 'الآن' : 'now';
    if (minutes < 60) return isAr ? `${minutes} د` : `${minutes}m`;
    if (hours < 24) return isAr ? `${hours} س` : `${hours}h`;
    if (days === 1) return isAr ? 'أمس' : 'yesterday';
    if (days < 7) return isAr ? `${days} ي` : `${days}d`;
    const weeks = Math.floor(days / 7);
    return isAr ? `${weeks} أ` : `${weeks}w`;
  };

  const handleAcceptRequest = async (conv) => {
    hapticsService.success?.();
    const other = getOtherParticipant(conv);
    await chatService.acceptMessageRequest(conv.id);
    showToast(isAr ? 'تم قبول طلب المراسلة' : 'Request accepted', 'success');
    if (other && onOpenChat) {
      onOpenChat(other);
    }
  };

  const handleDeleteRequest = async (convId) => {
    hapticsService.light?.();
    await chatService.declineMessageRequest(convId);
    showToast(isAr ? 'تم حذف الطلب' : 'Request deleted', 'info');
  };

  const handleSavePermission = (val) => {
    setMessagePermission(val);
    try {
      const filters = storageService.getContentFilters(currentUser);
      storageService.saveContentFilters({ ...filters, messagePermission: val }, currentUser);
      showToast(isAr ? 'تم حفظ تفضيلات الرسائل' : 'Message settings saved', 'success');
    } catch {}
    setShowSettingsModal(false);
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* ======================================================== */}
        {/* TOP HEADER: PULSE Official Matching Screenshots 1 & 2       */}
        {/* ======================================================== */}
        {activeTab === 'requests' ? (
          /* REQUESTS VIEW HEADER (Screenshot 1 Exact) */
          <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-[#18181C] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  hapticsService.dismiss?.();
                  setActiveTab('inbox');
                }}
                className="p-1 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors tap-press"
                aria-label={isAr ? 'رجوع للرسائل' : 'Back to messages'}
              >
                <BackIcon size={22} />
              </button>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {isAr ? 'طلبات المراسلة' : 'Requests'}
              </h1>
            </div>

            <button
              onClick={() => {
                hapticsService.light?.();
                setShowSettingsModal(true);
              }}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 tap-press transition-colors"
              title={isAr ? 'إعدادات الرسائل' : 'Settings'}
            >
              <Settings size={19} />
            </button>
          </div>
        ) : (
          /* MAIN INBOX HEADER (Screenshot 2 Exact) */
          <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={() => {
                    hapticsService.dismiss?.();
                    onBack();
                  }}
                  className="p-1 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors tap-press"
                  aria-label={isAr ? 'رجوع' : 'Back'}
                >
                  <BackIcon size={22} />
                </button>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isAr ? 'الرسائل' : 'Messages'}
              </h1>
            </div>

            {/* Compose New Message Button (Screenshot 2 exact square with pen) */}
            <button
              onClick={() => {
                hapticsService.selection?.();
                setIsNewChatOpen(true);
              }}
              className="p-1.5 rounded-full text-neutral-200 hover:text-white hover:bg-neutral-900 active:scale-95 transition-all tap-press"
              title={isAr ? 'رسالة جديدة' : 'New message'}
            >
              <SquarePen size={22} className="stroke-[1.8]" />
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* SEARCH BAR (PULSE Official Standard)                        */}
        {/* ======================================================== */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search 
              size={16} 
              className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-neutral-500`} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث' : 'Search'}
              dir="auto"
              className={`w-full bg-[#141416] border border-transparent focus:border-neutral-700 rounded-2xl ${
                isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
              } py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white`}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ======================================================== */}
          {/* FILTER NAVIGATION PILLS ROW (Screenshots 1 & 2 Exact)    */}
          {/* ======================================================== */}
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar">
            {/* Filter icon button */}
            <button
              onClick={() => {
                hapticsService.light?.();
                setShowFilterSheet(true);
              }}
              className="p-1.5 px-2 rounded-full bg-[#141416] border border-[#242428] text-neutral-400 hover:text-white tap-press transition-colors flex-shrink-0"
              title={isAr ? 'تصفية' : 'Filter'}
            >
              <ListFilter size={15} />
            </button>

            {activeTab === 'requests' ? (
              /* Sub-pills when in Requests (Screenshot 1: Requests | Hidden) */
              <>
                <button
                  onClick={() => setRequestsSubTab('all')}
                  className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap tap-press transition-all font-semibold ${
                    requestsSubTab === 'all'
                      ? 'bg-[#1C1C20] text-white border border-[#323238] shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'الطلبات' : 'Requests'}
                </button>

                <button
                  onClick={() => setRequestsSubTab('hidden')}
                  className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap tap-press transition-all font-semibold ${
                    requestsSubTab === 'hidden'
                      ? 'bg-[#1C1C20] text-white border border-[#323238] shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'المخفية' : 'Hidden'}
                </button>
              </>
            ) : (
              /* Main pills when in Inbox (Screenshot 2: Inbox | Requests) */
              <>
                <button
                  onClick={() => {
                    hapticsService.selection?.();
                    setActiveTab('inbox');
                  }}
                  className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap tap-press transition-all font-semibold ${
                    activeTab === 'inbox'
                      ? 'bg-[#1C1C20] text-white border border-[#323238] shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isAr ? 'صندوق الوارد' : 'Inbox'}
                </button>

                <button
                  onClick={() => {
                    hapticsService.selection?.();
                    setActiveTab('requests');
                  }}
                  className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap tap-press transition-all font-semibold flex items-center gap-1.5 ${
                    activeTab === 'requests'
                      ? 'bg-[#1C1C20] text-white border border-[#323238] shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>{isAr ? 'الطلبات' : 'Requests'}</span>
                  {pendingRequests.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-[#0095F6] text-white">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="h-[1px] bg-[#141418] mt-1" />

        {/* ======================================================== */}
        {/* VIEW BODY: INBOX VS REQUESTS                            */}
        {/* ======================================================== */}
        {activeTab === 'requests' ? (
          /* ====================================================== */
          /* CASE A: REQUESTS VIEW (Screenshot 1 Exact)              */
          /* ====================================================== */
          <div>
            {currentList.length > 0 ? (
              <div className="divide-y divide-[#16161A]">
                {currentList.map((conv) => {
                  const other = getOtherParticipant(conv);
                  if (!other) return null;

                  return (
                    <div 
                      key={conv.id} 
                      className="p-4 hover:bg-[#08080A] transition-colors space-y-3"
                    >
                      <div 
                        onClick={() => onOpenChat && onOpenChat(other)}
                        className="flex items-start gap-3 cursor-pointer"
                      >
                        <img
                          src={other.avatar || DEFAULT_AVATAR}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 truncate">
                              <span className="font-bold text-xs sm:text-sm text-white truncate">
                                {other.displayName}
                              </span>
                              {other.isVerified && <VerifiedBadge size={12} />}
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {formatTimestamp(conv.updatedAt || conv.lastMessage?.timestamp)}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono" dir="ltr">
                            @{other.username}
                          </div>
                          <p className="text-xs text-neutral-300 mt-1 line-clamp-2">
                            {conv.lastMessageDecrypted || (isAr ? 'أرسل لك طلباً للمراسلة' : 'Sent you a message request')}
                          </p>
                        </div>
                      </div>

                      {/* Request Action Buttons: Accept / Delete */}
                      <div className="flex items-center gap-2 pt-1 ps-15">
                        <button
                          onClick={() => handleAcceptRequest(conv)}
                          className="flex-1 py-1.5 px-3 rounded-full bg-white text-black text-xs font-bold shadow hover:bg-neutral-200 active:scale-95 transition-all tap-press"
                        >
                          {isAr ? 'قبول' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(conv.id)}
                          className="flex-1 py-1.5 px-3 rounded-full bg-[#18181C] border border-[#2A2A2E] text-neutral-300 hover:text-white text-xs font-semibold hover:bg-neutral-800 active:scale-95 transition-all tap-press"
                        >
                          {isAr ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* EMPTY REQUESTS STATE (Screenshot 1 Exact Replica) */
              <div className="pt-24 pb-16 px-6 text-center animate-fade-in">
                {/* Outline Paper Plane inside Circle (Screenshot 1) */}
                <div className="w-20 h-20 rounded-full bg-[#141416] border border-[#222226] flex items-center justify-center mx-auto text-neutral-400 mb-6 shadow-inner">
                  <Send size={30} className="-rotate-12 translate-x-0.5 text-neutral-300 stroke-[1.6]" />
                </div>

                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight mb-2">
                  {isAr ? 'لا توجد طلبات مراسلة بعد' : 'No message requests yet'}
                </h2>

                <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed mb-6">
                  {isAr 
                    ? 'ستظهر هنا الرسائل الواردة من أشخاص لا تتابعهم. يمكنك دائماً إيقاف تشغيل هذا الخيار.' 
                    : 'Messages from people you don’t follow will appear here. You can always turn this off.'}
                </p>

                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="px-5 py-2 rounded-2xl bg-[#141416] border border-[#2A2A2E] text-xs font-semibold text-white hover:bg-neutral-800 active:scale-95 transition-all tap-press shadow-sm"
                >
                  {isAr ? 'إدارة الإعدادات' : 'Manage settings'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ====================================================== */
          /* CASE B: INBOX VIEW (Screenshot 2 Exact)                */
          /* ====================================================== */
          <div>
            {currentList.length > 0 ? (
              /* Populated Conversations List */
              <div className="divide-y divide-[#141418]">
                {currentList.map((conv) => {
                  const other = getOtherParticipant(conv);
                  if (!other) return null;

                  const unreadCount = (conv.unread && conv.unread[currentUser?.uid]) || 0;
                  const isLastVoice = conv.lastMessage?.type === 'voice';
                  const isPostShare = conv.lastMessage?.type === 'post_share';

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        hapticsService.light?.();
                        onOpenChat && onOpenChat(other);
                      }}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-[#08080A] cursor-pointer transition-colors tap-press select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <img
                            src={other.avatar || DEFAULT_AVATAR}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover ring-1 ring-white/10 aspect-square"
                          />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-[13.5px] font-bold text-white truncate">
                                {other.displayName}
                              </span>
                              {other.isVerified && <VerifiedBadge size={12} />}
                              <PioneerBadge number={other.pioneerNumber} size="xs" />
                            </div>

                            <span className="text-[10.5px] text-neutral-500 font-mono flex-shrink-0">
                              {formatTimestamp(conv.updatedAt || conv.lastMessage?.timestamp)}
                            </span>
                          </div>

                          {/* Last message preview */}
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs truncate ${unreadCount > 0 ? 'text-white font-semibold' : 'text-neutral-400'}`}>
                              {isLastVoice ? (
                                <span className="flex items-center gap-1 text-neutral-200">
                                  <Mic size={12} className="text-white" />
                                  <span>{isAr ? 'رسالة صوتية' : 'Voice note'}</span>
                                </span>
                              ) : isPostShare ? (
                                <span className="text-neutral-300">
                                  {isAr ? 'مشاركة نبضة' : 'Shared pulse'}
                                </span>
                              ) : (
                                conv.lastMessageDecrypted || (isAr ? 'بدء محادثة...' : 'Started conversation...')
                              )}
                            </p>

                            {/* Unread Glowing Blue Dot indicator (PULSE Signature) */}
                            {unreadCount > 0 && (
                              <div className="w-2 h-2 rounded-full bg-[#0095F6] flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* EMPTY INBOX STATE (Screenshot 2 Exact Replica) */
              <div className="pt-20 pb-16 px-6 text-center animate-fade-in">
                
                {/* 6-Avatar Orbital Cluster around Central 3-Dot Bubble */}
                <div className="w-48 h-40 relative mx-auto my-4 flex items-center justify-center">
                  
                  {/* Orbiting Avatar 1 (Top Left) */}
                  <img
                    src={orbitUsers[0]?.avatar || DEFAULT_AVATAR}
                    alt=""
                    className="absolute top-0 left-6 w-10 h-10 rounded-full object-cover ring-2 ring-black shadow-lg"
                  />

                  {/* Orbiting Avatar 2 (Top Right) */}
                  <img
                    src={orbitUsers[1]?.avatar || DEFAULT_AVATAR}
                    alt=""
                    className="absolute top-1 right-7 w-11 h-11 rounded-full object-cover ring-2 ring-black shadow-lg"
                  />

                  {/* Orbiting Avatar 3 (Far Left) */}
                  <img
                    src={orbitUsers[2]?.avatar || DEFAULT_AVATAR}
                    alt=""
                    className="absolute top-12 left-0 w-8 h-8 rounded-full object-cover ring-2 ring-black shadow-lg"
                  />

                  {/* Orbiting Avatar 4 (Far Right) */}
                  <img
                    src={orbitUsers[3]?.avatar || DEFAULT_AVATAR}
                    alt=""
                    className="absolute top-14 right-1 w-8 h-8 rounded-full object-cover ring-2 ring-black shadow-lg"
                  />

                  {/* Orbiting Avatar 5 (Bottom Left) */}
                  <img
                    src={orbitUsers[4]?.avatar || DEFAULT_AVATAR}
                    alt=""
                    className="absolute bottom-1 left-7 w-11 h-11 rounded-full object-cover ring-2 ring-black shadow-lg"
                  />

                  {/* Orbiting Avatar 6 (Bottom Right) */}
                  <img
                    src={orbitUsers[5]?.avatar || DEFAULT_AVATAR}
                    alt=""
                    className="absolute bottom-2 right-6 w-10 h-10 rounded-full object-cover ring-2 ring-black shadow-lg"
                  />

                  {/* Central Dark Chat Bubble with 3 Dots (Screenshot 2) */}
                  <div className="w-14 h-10 rounded-2xl bg-[#202024] border border-white/10 shadow-2xl flex items-center justify-center relative z-20">
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-neutral-400" />
                      <div className="w-1 h-1 rounded-full bg-neutral-400" />
                      <div className="w-1 h-1 rounded-full bg-neutral-400" />
                    </div>
                  </div>
                </div>

                {/* Heading (Screenshot 2 Exact) */}
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-6">
                  {isAr ? 'تواصل بحرية عبر الرسائل الخاصة' : 'Keep it real in direct messages'}
                </h2>

                {/* Subtitle (Screenshot 2 Exact) */}
                <p className="text-xs sm:text-sm text-neutral-400 max-w-xs mx-auto mt-2 leading-relaxed">
                  {isAr 
                    ? 'ابدأ محادثة جانبية، شارك النبضات والمزيد مع أصدقائك.' 
                    : 'Start a side conversation, send pulses and more.'}
                </p>

                {/* Message CTA Button (Screenshot 2 Exact) */}
                <button
                  onClick={() => {
                    hapticsService.selection?.();
                    setIsNewChatOpen(true);
                  }}
                  className="mt-6 px-7 py-2.5 rounded-full bg-white text-black text-xs sm:text-sm font-bold shadow-lg hover:bg-neutral-200 active:scale-95 transition-all tap-press inline-block"
                >
                  {isAr ? 'مراسلة' : 'Message'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* FILTER BOTTOM SHEET                                      */}
        {/* ======================================================== */}
        {showFilterSheet && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center select-none animate-in fade-in duration-200"
            onClick={() => setShowFilterSheet(false)}
          >
            <div 
              className="w-full max-w-md bg-[#141416] border-t border-[#26262B] rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white space-y-2 shadow-2xl animate-sheet-up divide-y divide-[#222226]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-2" />
              
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider pb-2">
                {isAr ? 'تصفية المحادثات' : 'Filter messages'}
              </div>

              <button
                onClick={() => {
                  setFilterType('all');
                  setShowFilterSheet(false);
                }}
                className={`w-full py-3 flex items-center justify-between text-xs sm:text-sm tap-press ${
                  filterType === 'all' ? 'text-white font-bold' : 'text-neutral-400'
                }`}
              >
                <span>{isAr ? 'كل الرسائل' : 'All messages'}</span>
                {filterType === 'all' && <Check size={16} className="text-[#0095F6]" />}
              </button>

              <button
                onClick={() => {
                  setFilterType('unread');
                  setShowFilterSheet(false);
                }}
                className={`w-full py-3 flex items-center justify-between text-xs sm:text-sm tap-press ${
                  filterType === 'unread' ? 'text-white font-bold' : 'text-neutral-400'
                }`}
              >
                <span>{isAr ? 'غير المقروءة فقط' : 'Unread only'}</span>
                {filterType === 'unread' && <Check size={16} className="text-[#0095F6]" />}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MESSAGE SETTINGS MODAL (Manage Settings in Requests)     */}
        {/* ======================================================== */}
        {showSettingsModal && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center select-none animate-in fade-in duration-200"
            onClick={() => setShowSettingsModal(false)}
          >
            <div 
              className="w-full max-w-md bg-[#141416] border-t border-[#26262B] rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white space-y-4 shadow-2xl animate-sheet-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-2" />

              <div className="flex items-center justify-between border-b border-[#222226] pb-3">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-[#0095F6]" />
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'إعدادات طلبات المراسلة' : 'Message Request Controls'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-neutral-400">
                  {isAr ? 'من يمكنه إرسال طلبات مراسلة لك:' : 'Who can send you message requests:'}
                </div>

                <div className="space-y-1.5">
                  {[
                    { id: 'everyone', title: isAr ? 'الجميع على المنصة' : 'Everyone' },
                    { id: 'following', title: isAr ? 'الأشخاص الذين تتابعهم فقط' : 'People you follow only' },
                    { id: 'none', title: isAr ? 'لا أحد (إيقاف الطلبات)' : 'No one (Turn off requests)' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleSavePermission(opt.id)}
                      className={`w-full p-3 rounded-2xl flex items-center justify-between text-xs tap-press transition-colors ${
                        messagePermission === opt.id 
                          ? 'bg-[#1C1C20] border border-[#303036] text-white font-bold' 
                          : 'bg-[#101012] border border-transparent text-neutral-400 hover:bg-[#161618]'
                      }`}
                    >
                      <span>{opt.title}</span>
                      {messagePermission === opt.id && <Check size={15} className="text-[#0095F6]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start New Chat Modal */}
        <NewChatModal
          isOpen={isNewChatOpen}
          onClose={() => setIsNewChatOpen(false)}
          currentUser={currentUser}
          onSelectUser={(selected) => {
            setIsNewChatOpen(false);
            if (onOpenChat) onOpenChat(selected);
          }}
        />

      </div>
    </SwipeBackWrapper>
  );
}
