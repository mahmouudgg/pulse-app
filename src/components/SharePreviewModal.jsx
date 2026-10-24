import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Link2, Share2, Check, Send, MessageCircle, ExternalLink } from 'lucide-react';
import { storageService } from '../services/storageService';
import { chatService } from '../services/chatService';
import { hapticsService } from '../services/hapticsService';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { Share } from '@capacitor/share';

import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export default function SharePreviewModal({ isOpen, onClose, post, currentUser: propCurrentUser }) {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const { currentUser: authUser } = useAuth();
  const currentUser = propCurrentUser || authUser;
  const isAr = lang === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [sentUserIds, setSentUserIds] = useState(new Set());
  const [copied, setCopied] = useState(false);

  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSentUserIds(new Set());
      setCopied(false);

      // Load all available users for direct sharing
      const loadUsers = async () => {
        try {
          let loadedUsers = storageService.getUsers() || [];
          if (loadedUsers.length <= 2) {
            try {
              const cloudUsers = await storageService.syncUsersFromCloud();
              if (cloudUsers && cloudUsers.length > 0) loadedUsers = cloudUsers;
            } catch {}
          }

          // Ensure Sovythos is in list with official account UID
          const list = loadedUsers.filter((u) => u.uid !== currentUser?.uid);
          if (!list.some((u) => u.username === 'sovythos' || u.uid === 'user_1789917894698')) {
            list.unshift({
              uid: 'user_1789917894698',
              username: 'sovythos',
              displayName: 'Sovythos',
              avatar: 'https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1790975397/pulse_avatars/zhdxv7x7htrphqt3iaew.png',
              isVerified: true
            });
          }
          setUsers(list);
        } catch (e) {
          console.warn('Error loading users for share:', e);
        }
      };

      loadUsers();
    }
  }, [isOpen, currentUser?.uid]);

  const postUrl = post?.id ? `https://pulseeg.wuaze.com/p/${post.id}` : 'https://pulseeg.wuaze.com/';
  const authorName = post?.author?.displayName || post?.author?.username || 'user';
  const postSnippet = post?.content ? (post.content.length > 90 ? post.content.slice(0, 90) + '...' : post.content) : '';
  const shareText = `نبضة من ${authorName} على PULSE:\n"${postSnippet}"\n\nرابط النبضة: ${postUrl}`;

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // Send directly to a user in PULSE DM
  const handleDirectSend = async (targetUser) => {
    if (sentUserIds.has(targetUser.uid)) return;

    if (!currentUser?.uid) {
      showToast(isAr ? 'يرجى تسجيل الدخول أولاً للمشاركة' : 'Please sign in to send messages', 'warning');
      return;
    }

    try { hapticsService.success?.(); } catch {}

    try {
      const messageText = `مشاركة نبضة لـ @${post?.author?.username || ''}:\n"${postSnippet}"\n${postUrl}`;
      const res = await chatService.sendMessage({
        sender: currentUser,
        recipient: targetUser,
        type: 'post_share',
        content: messageText,
        sharedPost: {
          id: post?.id,
          content: post?.content,
          author: post?.author,
          imageUrl: post?.imageUrl || null,
          videoUrl: post?.videoUrl || null,
          audioUrl: post?.audioUrl || null,
          createdAt: post?.createdAt
        }
      });

      if (res && res.error === 'limit_reached') {
        showToast(res.message, 'warning');
        return;
      }

      setSentUserIds((prev) => new Set([...prev, targetUser.uid]));
      showToast(isAr ? `تم إرسال النبضة إلى ${targetUser.displayName || targetUser.username}` : `Sent to ${targetUser.displayName}`);
    } catch (err) {
      console.warn('Direct send error:', err);
      showToast(isAr ? 'تعذر إرسال النبضة، حاول مرة أخرى' : 'Failed to send pulse, please try again', 'error');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      try { hapticsService.light?.(); } catch {}
      setCopied(true);
      showToast(isAr ? 'تم نسخ رابط النبضة بنجاح!' : 'Link copied successfully');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(postUrl, 'info');
    }
  };

  const handleNativeShare = async () => {
    try { hapticsService.light?.(); } catch {}
    try {
      await Share.share({
        title: `نبضة من ${authorName} على PULSE`,
        text: shareText,
        url: postUrl,
        dialogTitle: isAr ? 'مشاركة النبضة' : 'Share pulse'
      });
    } catch {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `نبضة من ${authorName} على PULSE`,
            text: shareText,
            url: postUrl
          });
        } catch {}
      } else {
        handleCopyLink();
      }
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, '_blank');
  };

  const handleTwitterShare = () => {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twUrl, '_blank');
  };

  if (!isOpen || !post) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      style={backdropStyle}
      onClick={onClose}
    >
      <div
        {...containerProps}
        className="w-full max-w-[480px] bg-[#141416] border-t sm:border border-[#242428] rounded-t-[34px] sm:rounded-[34px] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-white shadow-2xl animate-sheet-up flex flex-col will-change-transform"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Handle Pill */}
        <div className="w-10 h-1 bg-[#3A3A40] rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing"></div>

        {/* Search Bar Capsule (PULSE Style Image 3) */}
        <div className="relative mb-5">
          <div className="flex items-center gap-2.5 bg-[#202024] border border-[#28282E] rounded-full px-4 py-2.5 focus-within:border-white/40 transition-colors">
            <Search size={16} className="text-[#88888D] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث عن شخص للإرسال إليه...' : 'Search'}
              className="w-full bg-transparent text-sm text-white placeholder-[#77777D] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 text-[#88888D] hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Scroll of Contacts to Send to (PULSE Standard) */}
        <div className="mb-6">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none px-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSent = sentUserIds.has(user.uid);
                return (
                  <button
                    key={user.uid}
                    onClick={() => handleDirectSend(user)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 tap-press group outline-none"
                    style={{ width: '68px' }}
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#2A2A30] bg-[#1C1C20] flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95">
                      <img
                        src={user.avatar || DEFAULT_AVATAR}
                        alt={user.displayName || user.username}
                        className="w-full h-full object-cover rounded-full"
                      />
                      {isSent && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-fade-in">
                          <Check size={20} className="text-white stroke-[3.5]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-300 font-medium truncate w-full text-center leading-tight">
                      {isSent ? (isAr ? 'تم الإرسال' : 'Sent') : user.displayName || user.username}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-neutral-500 py-3 text-center w-full">
                {isAr ? 'لا يوجد مستخدم بهذا الاسم' : 'No user found'}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#222226] mb-5"></div>

        {/* Social Share Action Buttons Row (PULSE Standard) */}
        <div>
          <div className="flex items-center justify-around gap-2 px-1">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center gap-2 tap-press group"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#182C22] border border-[#254636] flex items-center justify-center text-[#25D366] group-hover:scale-105 active:scale-95 transition-transform p-3">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <span className="text-[11px] text-neutral-300 font-medium">WhatsApp</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 tap-press group"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#202024] border border-[#2A2A30] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-transform p-3">
                {copied ? <Check size={22} className="text-white stroke-[3]" /> : <Link2 size={22} />}
              </div>
              <span className="text-[11px] text-neutral-300 font-medium">
                {copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy link')}
              </span>
            </button>

            {/* Native More Share */}
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-2 tap-press group"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#202024] border border-[#2A2A30] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-transform p-3">
                <Share2 size={22} />
              </div>
              <span className="text-[11px] text-neutral-300 font-medium">
                {isAr ? 'المزيد' : 'More'}
              </span>
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegramShare}
              className="flex flex-col items-center gap-2 tap-press group"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#182838] border border-[#223E5C] flex items-center justify-center text-[#2AABEE] group-hover:scale-105 active:scale-95 transition-transform p-3">
                <Send size={20} className="-rotate-12" />
              </div>
              <span className="text-[11px] text-neutral-300 font-medium">Telegram</span>
            </button>

            {/* Twitter / X */}
            <button
              onClick={handleTwitterShare}
              className="flex flex-col items-center gap-2 tap-press group"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#18181A] border border-[#28282E] flex items-center justify-center text-white group-hover:scale-105 active:scale-95 transition-transform p-3">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <span className="text-[11px] text-neutral-300 font-medium">X (Twitter)</span>
            </button>
          </div>
        </div>

        {/* Minimal Post Snippet Preview */}
        <div className="mt-5 p-3 rounded-2xl bg-[#18181A] border border-[#222226] flex items-center gap-3">
          <img
            src={post.author?.avatar || DEFAULT_AVATAR}
            alt={authorName}
            className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-white block truncate">{authorName}</span>
            <p className="text-[11px] text-neutral-400 truncate mt-0.5">{postSnippet || 'نبضة على PULSE'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
