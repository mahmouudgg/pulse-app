import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, Send, Mic, Info, 
  Check, CheckCheck, Terminal, MoreHorizontal, ExternalLink,
  Share2, BellOff, ShieldAlert, UserX, X
} from 'lucide-react';
import PioneerBadge from '../components/PioneerBadge';
import VerifiedBadge from '../components/VerifiedBadge';
import VoiceNoteRecorder from '../components/VoiceNoteRecorder';
import VoiceNoteBubble from '../components/VoiceNoteBubble';
import { chatService } from '../services/chatService';
import { storageService } from '../services/storageService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { useLanguage } from '../context/LanguageContext';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { hapticsService } from '../services/hapticsService';
import { database } from '../services/firebase';
import { ref, onValue } from 'firebase/database';
import { moderationService } from '../services/moderationService';
import RichTextRenderer from '../components/RichTextRenderer';

export default function ChatConversationPage({
  recipient,
  currentUser,
  onBack,
  onOpenUserProfile,
  onOpenDetail,
  onBlockUser,
  onOpenVerification
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [conversationMeta, setConversationMeta] = useState(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const conversationId = chatService.getConversationId(currentUser?.uid, recipient?.uid);
  const isFounder = recipient?.isFounder || recipient?.username === 'my';
  const isRecipientVerified = Boolean(
    recipient?.isVerified || 
    recipient?.isPro || 
    recipient?.isFounder || 
    recipient?.verificationStatus === 'verified'
  );

  const isRecipientSovythos = recipient?.uid === 'user_1789917894698' || recipient?.username?.toLowerCase() === 'sovythos';
  const isCurrentUserPro = Boolean(
    currentUser?.isPro || 
    currentUser?.vipTier === 'pro' || 
    currentUser?.isFounder || 
    currentUser?.isVerified ||
    currentUser?.verificationStatus === 'verified'
  );

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  // Realtime subscription to conversation metadata (isRequest, isAccepted)
  useEffect(() => {
    if (!conversationId) return;
    try {
      const convRef = ref(database, `conversations/${conversationId}`);
      const unsub = onValue(convRef, (snap) => {
        if (snap.exists()) {
          setConversationMeta(snap.val());
        }
      });
      return () => {
        try { unsub(); } catch {}
      };
    } catch (e) {
      console.warn('Conv meta sub error:', e);
    }
  }, [conversationId]);

  // Real-time messages subscription
  useEffect(() => {
    if (!conversationId) return;

    chatService.markConversationAsRead(conversationId, currentUser.uid);

    const unsubscribeMessages = chatService.subscribeToMessages(conversationId, (list) => {
      setMessages(list);
      chatService.markConversationAsRead(conversationId, currentUser.uid);
    });

    const unsubscribeTyping = chatService.subscribeToTyping(conversationId, recipient.uid, (typing) => {
      setIsOtherTyping(typing);
    });

    return () => {
      if (typeof unsubscribeMessages === 'function') unsubscribeMessages();
      if (typeof unsubscribeTyping === 'function') unsubscribeTyping();
      chatService.setTyping(conversationId, currentUser.uid, false);
    };
  }, [conversationId, currentUser?.uid, recipient?.uid]);

  // Auto-scroll on new message or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  // Determine Message Request Status & Block Shield
  const isAccepted = conversationMeta?.isAccepted === true;
  const isRequest = Boolean(conversationMeta?.isRequest && !isAccepted);
  const isRequester = conversationMeta?.requestedBy === currentUser?.uid;
  const isRecipient = isRequest && !isRequester;
  const isBlocked = moderationService.isUserBlocked(currentUser?.uid, recipient?.uid);

  const sentCount = messages.filter((m) => m.senderId === currentUser?.uid).length;
  const remainingMessages = Math.max(0, 3 - sentCount);
  const isLimitReached = isRequest && isRequester && sentCount >= 3;

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (conversationId && currentUser?.uid) {
      chatService.setTyping(conversationId, currentUser.uid, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        chatService.setTyping(conversationId, currentUser.uid, false);
      }, 1500);
    }
  };

  const handleSendText = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !conversationId) return;

    if (isLimitReached) return;

    hapticsService.light?.();
    setInputText('');
    chatService.setTyping(conversationId, currentUser.uid, false);

    // 0ms Optimistic append
    const optimisticMsg = {
      id: 'opt_' + Date.now(),
      senderId: currentUser.uid,
      recipientId: recipient.uid,
      type: 'text',
      content: text,
      timestamp: Date.now(),
      read: false
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await chatService.sendMessage({
        sender: currentUser,
        recipient,
        type: 'text',
        content: text
      });
      if (res && res.error === 'limit_reached') {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } catch (err) {
      console.warn('Send text error:', err);
    }
  };

  const handleSendVoice = async (audioDataUrl, duration) => {
    setIsRecordingVoice(false);
    if (!audioDataUrl || !conversationId) return;
    if (isLimitReached) return;

    hapticsService.success?.();
    const optimisticMsg = {
      id: 'opt_' + Date.now(),
      senderId: currentUser.uid,
      recipientId: recipient.uid,
      type: 'voice',
      content: audioDataUrl,
      voiceDuration: duration,
      timestamp: Date.now(),
      read: false
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await chatService.sendMessage({
        sender: currentUser,
        recipient,
        type: 'voice',
        content: audioDataUrl,
        voiceDuration: duration
      });
    } catch (err) {
      console.warn('Send voice error:', err);
    }
  };

  const handleAcceptRequest = async () => {
    try { hapticsService.success?.(); } catch {}
    await chatService.acceptMessageRequest(conversationId);
    setConversationMeta((prev) => ({ ...prev, isAccepted: true, isRequest: false }));
  };

  const handleDeclineRequest = async () => {
    try { hapticsService.light?.(); } catch {}
    await chatService.declineMessageRequest(conversationId);
    onBack();
  };

  const handleBlockAction = () => {
    try { hapticsService.medium?.(); } catch {}
    if (onBlockUser && recipient?.uid) {
      onBlockUser(recipient.uid);
    }
    setShowOptionsMenu(false);
    onBack();
  };

  const handleOpenSharedPost = (shared) => {
    if (!onOpenDetail) return;
    if (shared && shared.id) {
      const allPosts = storageService.getPosts();
      const target = allPosts.find((p) => p.id === shared.id) || shared;
      onOpenDetail(target);
    }
  };

  const formatMessageTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // Format follower count cleanly (e.g. 6M, 12.5K, 450)
  const formatFollowers = (count) => {
    const num = Number(count) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return num.toLocaleString();
  };

  const rawFollowersCount = recipient?.followersCount ?? (
    Array.isArray(recipient?.followers) 
      ? recipient.followers.length 
      : (recipient?.followers ? Object.keys(recipient.followers).length : 0)
  );

  return (
    <SwipeBackWrapper onBack={onBack} className="fixed inset-0 z-40">
      <div className="w-full h-full bg-black text-white flex flex-col max-w-xl mx-auto border-x border-[#1C1C22]" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* ======================================================== */}
        {/* Top Header (1:1 with media_1792328088248_572ba54c.png)   */}
        {/* ======================================================== */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#1C1C22] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-1 rounded-full text-white hover:text-neutral-300 tap-press transition-colors"
              aria-label="Back"
            >
              <BackIcon size={22} className="stroke-[2.2]" />
            </button>

            {/* User Info Header: Avatar + Username + Verified Badge + Subtitle */}
            <div 
              onClick={() => onOpenUserProfile && onOpenUserProfile(recipient)}
              className="flex items-center gap-2.5 cursor-pointer tap-press min-w-0 group"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={recipient?.avatar || DEFAULT_AVATAR}
                  alt={recipient?.displayName}
                  className="w-10 h-10 rounded-full object-cover border border-[#26262B] aspect-square bg-[#121214]"
                />
                {isFounder && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                    <Terminal size={8} className="text-black stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 flex-nowrap">
                  <span className="text-sm font-bold text-white tracking-tight truncate" dir="ltr">
                    {recipient?.username || recipient?.displayName}
                  </span>
                  {isRecipientVerified && (
                    <VerifiedBadge size={14} />
                  )}
                  {recipient?.pioneerNumber && (
                    <PioneerBadge number={recipient.pioneerNumber} size="xs" />
                  )}
                </div>

                <div className="text-xs text-neutral-400 font-normal truncate">
                  {isOtherTyping ? (
                    <span className="text-neutral-300 font-medium">
                      {isAr ? 'يكتب الآن...' : 'typing...'}
                    </span>
                  ) : (
                    <span>{recipient?.displayName || recipient?.username}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Circular Options Button (1:1 with screenshot MoreHorizontal in circle) */}
          <button
            type="button"
            onClick={() => {
              try { hapticsService.light?.(); } catch {}
              setShowOptionsMenu(true);
            }}
            className="w-8 h-8 rounded-full border border-neutral-700/80 hover:border-neutral-500 flex items-center justify-center text-neutral-300 hover:text-white transition-colors tap-press"
            aria-label="Options"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Sovythos Dedicated AI Membership Status Bar */}
        {isRecipientSovythos && (
          <div className="bg-[#101012] border-b border-[#1C1C22] px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isCurrentUserPro ? 'bg-blue-400' : 'bg-zinc-600'}`} />
              <span className="text-zinc-300 text-[11px] truncate">
                {isCurrentUserPro 
                  ? (isAr ? 'عضوية Pulse Pro: محادثة خاصة غير محدودة مع سوفيثوس' : 'Pulse Pro: Unlimited Sovythos AI Chat')
                  : (isAr ? 'وضع سوفيثوس المجاني (50 رداً مصرياً منوعاً). اشترك في Pro لفتح المحادثة الحرة الكاملة' : 'Free Sovythos mode. Upgrade to Pro for full AI chat.')}
              </span>
            </div>
            {!isCurrentUserPro && onOpenVerification && (
              <button
                type="button"
                onClick={onOpenVerification}
                className="ms-2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold tap-press flex-shrink-0 transition-colors"
              >
                {isAr ? 'ترقية' : 'Upgrade'}
              </button>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* Messages Scroll Area                                     */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          
          {/* Centered Large Profile Hero Card (1:1 with media_1792328088248_572ba54c.png) */}
          <div className="pt-6 pb-4 px-4 text-center select-none flex flex-col items-center">
            {/* 88px Avatar */}
            <div 
              onClick={() => onOpenUserProfile && onOpenUserProfile(recipient)}
              className="w-[88px] h-[88px] rounded-full overflow-hidden mx-auto border border-[#2E2E33] bg-[#101012] cursor-pointer tap-press shadow-xl"
            >
              <img
                src={recipient?.avatar || DEFAULT_AVATAR}
                alt={recipient?.displayName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Username + Official Blue Badge */}
            <div className="flex items-center justify-center gap-1.5 mt-3.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight" dir="ltr">
                {recipient?.username || recipient?.displayName}
              </h2>
              {isRecipientVerified && (
                <VerifiedBadge size={18} />
              )}
              {recipient?.pioneerNumber && (
                <PioneerBadge number={recipient.pioneerNumber} size="xs" />
              )}
            </div>

            {/* Display Name Subtitle in Gray */}
            <p className="text-sm text-neutral-400 mt-0.5 font-normal">
              {recipient?.displayName || recipient?.username}
            </p>

            {/* Social Proof Lines */}
            <div className="mt-2.5 space-y-1 text-center text-xs sm:text-[13px] text-neutral-400 leading-relaxed font-normal">
              <p>
                {formatFollowers(rawFollowersCount)} {isAr ? 'متابع' : 'followers'}
              </p>
              <p>
                {isAr ? 'متابع على PULSE منذ 2026' : 'Following on PULSE since 2026'}
              </p>
              {recipient?.bio ? (
                <p className="text-neutral-500 text-xs max-w-xs mx-auto line-clamp-2 mt-1 font-normal">
                  {recipient.bio}
                </p>
              ) : (
                <p className="text-neutral-500 text-xs max-w-xs mx-auto mt-0.5">
                  {isAr ? 'حساب معتمد وموثق في مجتمع PULSE' : 'Verified account on PULSE'}
                </p>
              )}
            </div>

            {/* Pill "View profile" Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => onOpenUserProfile && onOpenUserProfile(recipient)}
                className="px-6 py-1.5 rounded-full border border-[#333336] hover:border-neutral-500 bg-transparent text-white font-medium text-xs sm:text-sm tap-press transition-all active:scale-95"
              >
                {isAr ? 'عرض الملف الشخصي' : 'View profile'}
              </button>
            </div>
          </div>

          {/* Centered Timeline Timestamp */}
          {messages.length > 0 && (
            <div className="text-center my-4 select-none">
              <span className="text-[11px] text-neutral-500 font-normal">
                {formatMessageTime(messages[0]?.timestamp)}
              </span>
            </div>
          )}

          {/* Messages List */}
          {messages.map((msg, index) => {
            const isSender = msg.senderId === currentUser?.uid;
            const isPostShare = msg.type === 'post_share' || Boolean(msg.sharedPost);

            // Show time separator between distant messages
            const prevMsg = messages[index - 1];
            const showTimeDivider = prevMsg && (msg.timestamp - prevMsg.timestamp > 15 * 60 * 1000);

            return (
              <React.Fragment key={msg.id || index}>
                {showTimeDivider && (
                  <div className="text-center my-3 select-none">
                    <span className="text-[11px] text-neutral-500 font-normal">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
                >
                  {msg.type === 'voice' ? (
                    <VoiceNoteBubble
                      audioUrl={msg.content}
                      duration={msg.voiceDuration}
                      isSender={isSender}
                      timestamp={msg.timestamp}
                      isRead={msg.isRead}
                    />
                  ) : isPostShare ? (
                    /* Shared Post Card Bubble */
                    <div
                      onClick={() => handleOpenSharedPost(msg.sharedPost)}
                      className={`max-w-[85%] sm:max-w-sm rounded-2xl overflow-hidden cursor-pointer tap-press transition-all hover:border-neutral-500 border ${
                        isSender 
                          ? 'bg-[#15151A] border-[#2C2C34] text-white shadow-md' 
                          : 'bg-[#141418] border-[#26262E] text-white shadow-sm'
                      }`}
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={msg.sharedPost?.author?.avatar || DEFAULT_AVATAR}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover border border-[#2E2E36]"
                          />
                          <span className="text-xs font-bold text-white truncate">
                            {msg.sharedPost?.author?.displayName || 'مستخدم'}
                          </span>
                          {msg.sharedPost?.author?.isVerified && (
                            <VerifiedBadge size={13} />
                          )}
                          <span className="text-[11px] text-neutral-500 font-mono" dir="ltr">
                            @{msg.sharedPost?.author?.username}
                          </span>
                        </div>

                        {msg.sharedPost?.content && (
                          <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed break-words" dir="auto">
                            {msg.sharedPost.content}
                          </p>
                        )}

                        {msg.sharedPost?.audioUrl && (
                          <div className="flex items-center gap-1.5 text-xs text-neutral-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 w-fit">
                            <Mic size={12} className="text-white" />
                            <span className="text-[10px] font-medium">{isAr ? 'نبضة صوتية' : 'Voice pulse'}</span>
                          </div>
                        )}

                        {msg.sharedPost?.imageUrl && (
                          <div className="rounded-xl overflow-hidden border border-[#26262E] max-h-48 bg-black">
                            <img
                              src={msg.sharedPost.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="px-3 py-1.5 bg-[#0C0C10] border-t border-[#202026] flex items-center justify-between text-[10px] text-neutral-400">
                        <span className="font-semibold text-white/90">
                          {isAr ? 'عرض النبضة على PULSE' : 'View pulse on PULSE'}
                        </span>
                        <span className="font-mono text-neutral-500">{formatMessageTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  ) : (
                    /* 1:1 Clean Threads Message Bubble (Dark Charcoal #36363B for Sent) */
                    <div
                      className={`px-4 py-2.5 rounded-[22px] max-w-[80%] sm:max-w-md text-sm leading-relaxed break-words select-text ${
                        isSender
                          ? 'bg-[#36363B] text-white shadow-sm'
                          : 'bg-[#18181B] border border-[#26262B] text-neutral-100 shadow-sm'
                      }`}
                      dir="auto"
                    >
                      <div className="whitespace-pre-wrap select-text">
                        <RichTextRenderer
                          text={msg.content}
                          mentionClassName={isSender ? "text-neutral-100 font-bold hover:underline" : "text-[#0095F6] font-medium hover:underline"}
                          linkClassName="underline hover:text-white break-all"
                          onOpenUserProfile={onOpenUserProfile}
                        />
                      </div>
                      
                      <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 font-mono ${
                        isSender ? 'text-neutral-400' : 'text-neutral-500'
                      }`}>
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        {isSender && (
                          <span className={msg.isRead ? "text-white" : "text-neutral-400"}>
                            {msg.isRead ? (
                              <CheckCheck size={13} className="stroke-[2.5]" title="تمت القراءة" />
                            ) : (
                              <Check size={11} className="stroke-[2.5]" title="تم الإرسال" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* Typing Bubble */}
          {isOtherTyping && (
            <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#18181B] border border-[#26262B] w-16 text-neutral-400 animate-in fade-in duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce"></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ======================================================== */}
        {/* Bottom Area: Recipient Action Bar vs Input Bar           */}
        {/* ======================================================== */}
        {isRecipient ? (
          /* Recipient Message Request Review Bar */
          <div className="sticky bottom-0 z-30 bg-black/95 backdrop-blur-md border-t border-[#1C1C22] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            <p className="text-center text-xs text-neutral-400">
              {isAr ? 'هل تريد السماح لـ @' + recipient?.username + ' بمراسلتك؟' : 'Allow @' + recipient?.username + ' to message you?'}
            </p>
            <div className="flex items-center gap-2 max-w-sm mx-auto">
              <button
                type="button"
                onClick={handleAcceptRequest}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white text-black font-bold text-xs tap-press transition-all hover:bg-neutral-200 shadow-sm"
              >
                {isAr ? 'قبول' : 'Accept'}
              </button>
              <button
                type="button"
                onClick={handleDeclineRequest}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#18181D] text-neutral-300 border border-[#2E2E32] font-bold text-xs tap-press transition-all hover:bg-[#25252A]"
              >
                {isAr ? 'حذف' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={handleBlockAction}
                className="py-2.5 px-3 rounded-xl bg-[#18181D] text-rose-400 border border-[#2E2E32] font-bold text-xs tap-press transition-all hover:bg-rose-950/30"
              >
                {isAr ? 'حظر' : 'Block'}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Input Area with 1:1 Threads Notice Banner Above It */
          <div className="sticky bottom-0 z-30 bg-black/95 backdrop-blur-md border-t border-[#1C1C22] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {isBlocked ? (
              <div className="p-3 text-center rounded-2xl bg-[#141418] border border-[#2B2B32] text-xs text-red-400 font-medium">
                {isAr 
                  ? 'لا يمكنك مراسلة هذا الحساب لأن هناك حظراً مفعّلاً بينكما.' 
                  : 'You cannot message this account because a block is active.'}
              </div>
            ) : isLimitReached ? (
              <div className="p-3 text-center rounded-2xl bg-[#121216] border border-[#26262E] text-xs text-neutral-400">
                {isAr 
                  ? 'وصلت إلى الحد الأقصى (3 رسائل). يمكنك إرسال المزيد بمجرد قبول طلبك.' 
                  : 'You reached the 3-message limit. You can send more once they accept your request.'}
              </div>
            ) : (
              <>
                {/* 1:1 Threads Message Request Notice Banner (media_1792328088248_572ba54c.png) */}
                {isRequest && isRequester && (
                  <div className="mb-3 px-2 text-center select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <p className="text-sm font-bold text-white tracking-tight">
                      {isAr 
                        ? (remainingMessages === 1 
                            ? 'لديك رسالة واحدة متبقية' 
                            : (remainingMessages === 2 
                                ? 'لديك رسالتان متبقيتان' 
                                : `لديك ${remainingMessages} رسائل متبقية`))
                        : `You have ${remainingMessages} message${remainingMessages === 1 ? '' : 's'} left`}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                      {isAr
                        ? 'يمكنك إرسال ما يصل إلى 3 رسائل قبل أن يقبل طلبك.'
                        : 'You can send up to 3 messages before they accept your request.'}
                    </p>
                  </div>
                )}

                {isRecordingVoice ? (
                  <VoiceNoteRecorder
                    onSendVoice={handleSendVoice}
                    onCancel={() => setIsRecordingVoice(false)}
                  />
                ) : (
                  <form onSubmit={handleSendText} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder={isAr ? 'مراسلة...' : 'Message...'}
                      dir="auto"
                      className="flex-1 bg-[#18181A] border border-[#28282C] focus:border-neutral-500 rounded-full px-5 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-all"
                    />

                    {inputText.trim() ? (
                      <button
                        type="submit"
                        className="p-2.5 rounded-full bg-[#0095F6] hover:bg-[#0081D6] text-white shadow-sm tap-press transition-transform active:scale-95 flex-shrink-0"
                        title={isAr ? 'إرسال' : 'Send'}
                      >
                        <Send size={15} className={isAr ? "" : "rotate-180"} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        className="p-2.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 tap-press transition-colors flex-shrink-0"
                        title={isAr ? 'تسجيل نبضة صوتية' : 'Record voice note'}
                      >
                        <Mic size={19} />
                      </button>
                    )}
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* Clean Options Bottom Sheet Modal (Triggered by 3-dots)   */}
        {/* ======================================================== */}
        {showOptionsMenu && (
          <div 
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
            onClick={() => setShowOptionsMenu(false)}
          >
            <div 
              className="w-full max-w-sm bg-[#141416] border border-[#26262B] rounded-t-3xl sm:rounded-3xl p-5 space-y-2 text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-3 sm:hidden" />
              
              <div className="flex items-center justify-between pb-2 border-b border-[#222226]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{recipient?.displayName || recipient?.username}</span>
                  {isRecipientVerified && <VerifiedBadge size={14} />}
                </div>
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowOptionsMenu(false);
                  if (onOpenUserProfile) onOpenUserProfile(recipient);
                }}
                className="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm text-neutral-200 hover:bg-white/5 transition-colors tap-press text-start"
              >
                <Info size={17} className="text-neutral-400" />
                <span>{isAr ? 'عرض الملف الشخصي' : 'View profile'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOptionsMenu(false);
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(`https://pulse.app/@${recipient?.username}`);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm text-neutral-200 hover:bg-white/5 transition-colors tap-press text-start"
              >
                <Share2 size={17} className="text-neutral-400" />
                <span>{isAr ? 'مشاركة رابط الملف الشخصي' : 'Share profile link'}</span>
              </button>

              <button
                type="button"
                onClick={handleBlockAction}
                className="w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm text-rose-400 hover:bg-rose-950/20 transition-colors tap-press text-start"
              >
                <UserX size={17} />
                <span>{isAr ? `حظر @${recipient?.username}` : `Block @${recipient?.username}`}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOptionsMenu(false)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-medium text-xs mt-2 tap-press transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

      </div>
    </SwipeBackWrapper>
  );
}
