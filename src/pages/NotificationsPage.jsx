import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Repeat2, 
  Mic, 
  Check, 
  UserPlus, 
  Flame, 
  UserCheck, 
  Trash2, 
  Send,
  AtSign,
  Quote,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  SlidersHorizontal
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationService } from '../services/notificationService';
import { storageService } from '../services/storageService';
import { sessionService } from '../services/sessionService';
import { hapticsService } from '../services/hapticsService';
import VerifiedBadge from '../components/VerifiedBadge';
import { DEFAULT_AVATAR, resolveAvatar } from '../utils/defaultAvatar';

export default function NotificationsPage({ onOpenDetail, onOpenUserProfile, onOpenChangePassword }) {
  const { t, lang } = useLanguage();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [followingIds, setFollowingIds] = useState(() => new Set(storageService._resolveEngagementArray(currentUser?.following)));

  useEffect(() => {
    if (currentUser?.following) {
      setFollowingIds(new Set(storageService._resolveEngagementArray(currentUser.following)));
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();

    if (currentUser?.uid) {
      notificationService.markAllAsRead(currentUser.uid);
    }

    const handleLiveUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('pulse_push_notification', handleLiveUpdate);
    return () => {
      window.removeEventListener('pulse_push_notification', handleLiveUpdate);
    };
  }, [currentUser?.uid]);

  const loadNotifications = () => {
    if (currentUser?.uid) {
      const real = notificationService.getNotifications(currentUser.uid);
      if (real && real.length > 0) {
        const posts = storageService.getPosts();
        const postsMap = new Map(posts.map((p) => [String(p.id), p]));

        const mappedReal = real.map((r) => {
          const targetPost = r.postId ? postsMap.get(String(r.postId)) : null;
          return {
            id: r.id,
            type: r.type,
            status: r.status,
            sessionId: r.sessionId,
            device: r.device,
            location: r.location,
            ip: r.ip,
            user: r.actor || { displayName: 'مستخدم PULSE', username: 'user', avatar: DEFAULT_AVATAR },
            text: r.text,
            time: notificationService.formatRelativeTime(r.createdAt || r.timestamp, lang),
            rawTime: r.createdAt || r.timestamp,
            preview: r.preview || targetPost?.content || '',
            postId: r.postId,
            targetPost,
            mediaUrl: targetPost?.imageUrl || targetPost?.videoUrl || null,
            likesCount: targetPost?.likesCount || (Array.isArray(targetPost?.likes) ? targetPost.likes.length : 0),
            commentsCount: targetPost?.repliesCount || targetPost?.commentsCount || 0,
            repostsCount: targetPost?.repostsCount || (Array.isArray(targetPost?.reposts) ? targetPost.reposts.length : 0),
            viewsCount: targetPost?.viewsCount || 0
          };
        });
        setNotifications(mappedReal);
        return;
      }
    }
    setNotifications([]);
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdated = () => loadNotifications();
    window.addEventListener('pulse_notifications_updated', handleUpdated);
    window.addEventListener('pulse_push_notification', handleUpdated);
    return () => {
      window.removeEventListener('pulse_notifications_updated', handleUpdated);
      window.removeEventListener('pulse_push_notification', handleUpdated);
    };
  }, [currentUser, lang]);

  const handleNotificationClick = (item) => {
    if (item.type === 'weak_password_alert' || item.action === 'change_password') {
      try { hapticsService.medium?.(); } catch {}
      onOpenChangePassword?.();
      return;
    }
    if (item.postId && onOpenDetail) {
      const posts = storageService.getPosts();
      const target = posts.find((p) => p.id === item.postId);
      if (target) {
        onOpenDetail(target);
        return;
      }
    }
    if (item.preview && onOpenDetail) {
      const cleanSnippet = item.preview.replace(/\.\.\.$/, '').trim();
      const posts = storageService.getPosts();
      const target = posts.find((p) => p.content && p.content.includes(cleanSnippet));
      if (target) {
        onOpenDetail(target);
        return;
      }
    }
    if (item.user && onOpenUserProfile) {
      onOpenUserProfile(item.user);
    }
  };

  const handleToggleFollow = (e, targetUser) => {
    e.stopPropagation();
    if (!currentUser || !targetUser?.uid) return;
    hapticsService.medium();
    const isNowFollowing = storageService.toggleFollow(targetUser.uid, currentUser);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isNowFollowing === true) next.add(targetUser.uid);
      else if (isNowFollowing === false) next.delete(targetUser.uid);
      return next;
    });
  };

  const handleAcceptFollowRequest = (e, item) => {
    e.stopPropagation();
    if (!currentUser || !item.user?.uid) return;
    try { hapticsService.success?.(); } catch {}
    storageService.acceptFollowRequest(item.user.uid, currentUser);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, status: 'accepted' } : n))
    );
  };

  const handleRejectFollowRequest = (e, item) => {
    e.stopPropagation();
    if (!currentUser || !item.user?.uid) return;
    try { hapticsService.light?.(); } catch {}
    storageService.rejectFollowRequest(item.user.uid, currentUser);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, status: 'declined' } : n))
    );
  };

  const handleApproveLoginAlert = (e, item) => {
    e.stopPropagation();
    try { hapticsService.light?.(); } catch {}
    if (currentUser?.uid && item.id) {
      notificationService.updateNotificationById(currentUser.uid, item.id, { status: 'approved' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, status: 'approved' } : n))
      );
      showToast(lang === 'ar' ? 'تم تأكيد الجلسة كنشاط موثوق بواسطتك.' : 'Session recognized and approved.');
    }
  };

  const handleRejectLoginAlert = async (e, item) => {
    e.stopPropagation();
    try { hapticsService.medium?.(); } catch {}
    if (currentUser?.uid && item.id) {
      if (item.sessionId) {
        try {
          await sessionService.revokeSession(currentUser.uid, item.sessionId);
        } catch (err) {
          console.warn('Revoke session from notification error:', err);
        }
      }
      notificationService.updateNotificationById(currentUser.uid, item.id, { status: 'rejected' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, status: 'rejected' } : n))
      );
      showToast(
        lang === 'ar' 
          ? 'تم إنهاء الجلسة فورياً وحظر الجهاز! يُنصح بتغيير كلمة المرور.' 
          : 'Session revoked and device logged out! Please change password.',
        'error'
      );
    }
  };

  const handleDeleteNotification = (notifId) => {
    try {
      hapticsService.warning?.();
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      if (currentUser?.uid) {
        notificationService.deleteNotification(currentUser.uid, notifId);
      }
    } catch (e) {
      console.warn('Error deleting notification:', e);
    }
  };

  const getSubBadgeIcon = (type) => {
    switch (type) {
      case 'security_login_alert':
        return (
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border-2 border-black">
            <ShieldAlert size={9} className="text-black stroke-[3]" />
          </div>
        );
      case 'weak_password_alert':
        return (
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border-2 border-black">
            <Lock size={9} className="text-black stroke-[3]" />
          </div>
        );
      case 'like':
        return (
          <div className="w-4 h-4 rounded-full bg-[#FF3040] flex items-center justify-center border-2 border-black">
            <Heart size={9} className="fill-white text-white" />
          </div>
        );
      case 'voice':
        return (
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-black">
            <Mic size={9} className="text-black stroke-[2.5]" />
          </div>
        );
      case 'repost':
        return (
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-black">
            <Repeat2 size={9} className="text-black stroke-[2.5]" />
          </div>
        );
      case 'mutual_follow':
        return (
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-black">
            <UserCheck size={9} className="text-black stroke-[3.5]" />
          </div>
        );
      case 'follow':
        return (
          <div className="w-4 h-4 rounded-full bg-[#0095F6] flex items-center justify-center border-2 border-black">
            <UserCheck size={9} className="text-white" />
          </div>
        );
      case 'follow_request':
        return (
          <div className="w-4 h-4 rounded-full bg-[#0095F6] flex items-center justify-center border-2 border-black">
            <UserPlus size={9} className="text-white" />
          </div>
        );
      case 'follow_suggestion':
        return (
          <div className="w-4 h-4 rounded-full bg-[#0095F6] flex items-center justify-center border-2 border-black">
            <UserPlus size={9} className="text-white" />
          </div>
        );
      case 'post_suggestion':
        return (
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-black">
            <Flame size={9} className="text-black stroke-[2.5]" />
          </div>
        );
      case 'mention':
        return (
          <div className="w-4 h-4 rounded-full bg-[#0095F6] flex items-center justify-center border-2 border-black">
            <AtSign size={9} className="text-white" />
          </div>
        );
      case 'quote':
        return (
          <div className="w-4 h-4 rounded-full bg-neutral-600 flex items-center justify-center border-2 border-black">
            <Quote size={9} className="text-white" />
          </div>
        );
      case 'system':
      case 'official':
      case 'promo':
      case 'pulse':
        return (
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center border-2 border-black">
            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-none stroke-black stroke-[3.5] stroke-linecap-round">
              <line x1="5" y1="10" x2="5" y2="14" />
              <line x1="9" y1="7" x2="9" y2="17" />
              <line x1="12" y1="4" x2="12" y2="20" />
              <line x1="15" y1="7" x2="15" y2="17" />
              <line x1="19" y1="10" x2="19" y2="14" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-[#0095F6] flex items-center justify-center border-2 border-black">
            <MessageCircle size={9} className="text-white" />
          </div>
        );
    }
  };

  const getSubtitle = (item) => {
    switch (item.type) {
      case 'security_login_alert':
        return lang === 'ar' ? 'تنبيه أمان وحماية الحساب' : 'Security login alert';
      case 'weak_password_alert':
        return lang === 'ar' ? 'فحص دوري لأمان الحساب' : 'Periodic account security check';
      case 'mutual_follow':
        return lang === 'ar' ? 'أصبحتما الآن تتابعان بعضكما البعض' : 'You are now mutually connected';
      case 'follow_suggestion':
        return lang === 'ar' ? 'اقتراح متابعة' : 'Follow suggestion';
      case 'post_suggestion':
        return lang === 'ar' ? 'بناءً على متابعاتك' : 'Because you follow';
      case 'comment':
      case 'reply':
        return lang === 'ar' ? 'محادثة قد تهمك' : 'Conversation you missed';
      case 'like':
        return lang === 'ar' ? 'أعجب بنبضتك' : 'Liked your pulse';
      case 'repost':
        return lang === 'ar' ? 'أعاد نشر نبضتك' : 'Reposted your pulse';
      case 'mention':
        return lang === 'ar' ? 'أشار إليك' : 'Mentioned you';
      case 'quote':
        return lang === 'ar' ? 'اقتبس نبضتك' : 'Quoted your pulse';
      case 'follow':
        return lang === 'ar' ? 'بدأ في متابعتك' : 'Started following you';
      case 'follow_request':
        return lang === 'ar' ? 'طلب متابعتك' : 'Requested to follow you';
      case 'system':
      case 'official':
      case 'promo':
        return lang === 'ar' ? 'إشعار رسمي من منصة PULSE' : 'Official PULSE Platform Notice';
      default:
        return item.text || '';
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'follows') return item.type === 'follow' || item.type === 'mutual_follow' || item.type === 'follow_suggestion' || item.type === 'follow_request';
    if (filter === 'conversations') return item.type === 'comment' || item.type === 'reply' || item.type === 'post_suggestion';
    if (filter === 'mentions') return item.type === 'mention';
    if (filter === 'quotes') return item.type === 'quote';
    if (filter === 'reposts') return item.type === 'repost';
    if (filter === 'verified') return Boolean(item.user?.isVerified || item.user?.isFounder);
    return true;
  });

  // PULSE Official Filter tabs
  const filterTabs = [
    { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
    { id: 'follows', label: lang === 'ar' ? 'المتابعات' : 'Follows' },
    { id: 'conversations', label: lang === 'ar' ? 'المحادثات' : 'Conversations' },
    { id: 'mentions', label: lang === 'ar' ? 'الإشارات' : 'Mentions' },
    { id: 'quotes', label: lang === 'ar' ? 'الاقتباسات' : 'Quotes' },
    { id: 'reposts', label: lang === 'ar' ? 'إعادات النشر' : 'Reposts' },
    { id: 'verified', label: lang === 'ar' ? 'الموثق' : 'Verified' }
  ];

  // PULSE Official Chronological Grouping: "Last 7 days", "Last 30 days", "Earlier"
  const groupNotificationsByTime = (list) => {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    const last7Days = [];
    const last30Days = [];
    const earlier = [];

    list.forEach((item) => {
      const timeMs = new Date(item.rawTime || 0).getTime();
      const diff = now - timeMs;
      if (diff <= SEVEN_DAYS) {
        last7Days.push(item);
      } else if (diff <= THIRTY_DAYS) {
        last30Days.push(item);
      } else {
        earlier.push(item);
      }
    });

    const sections = [];
    if (last7Days.length > 0) {
      sections.push({
        id: 'last_7_days',
        title: lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 days',
        items: last7Days
      });
    }
    if (last30Days.length > 0) {
      sections.push({
        id: 'last_30_days',
        title: lang === 'ar' ? 'آخر 30 يوماً' : 'Last 30 days',
        items: last30Days
      });
    }
    if (earlier.length > 0) {
      sections.push({
        id: 'earlier',
        title: lang === 'ar' ? 'سابقاً' : 'Earlier',
        items: earlier
      });
    }

    return sections;
  };

  const sections = groupNotificationsByTime(filteredNotifications);

  return (
    <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto pt-[max(0.75rem,env(safe-area-inset-top))]">
      {/* Threads Activity Header (Screenshot 1:1) */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between py-2">
          <h1 className="font-extrabold text-3xl text-white tracking-tight">
            {lang === 'ar' ? 'النشاط' : 'Activity'}
          </h1>
          <button
            type="button"
            onClick={() => {
              hapticsService.light?.();
              window.dispatchEvent(new CustomEvent('pulse:open-settings', { detail: { subview: 'notifications' } }));
            }}
            className="w-9 h-9 rounded-full bg-[#18181A] border border-[#27272A] flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            aria-label={lang === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
            title={lang === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
          >
            <SlidersHorizontal size={17} className="stroke-[2.2]" />
          </button>
        </div>

        {/* Filter Chips Carousel (Screenshot 4 exact) */}
        <div className="flex items-center gap-2 pt-2 pb-1 overflow-x-auto no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`text-sm px-4 py-1.5 rounded-xl whitespace-nowrap tap-press transition-all font-semibold ${
                filter === tab.id
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-[#18181A] text-white border border-[#2A2A2E] hover:border-neutral-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Grouped by Date (PULSE Official) */}
      <div className="divide-y divide-[#1C1C1E] overflow-hidden mt-1">
        {sections.map((section) => (
          <div key={section.id} className="pt-2">
            <div className="px-4 py-2 text-sm font-bold text-neutral-300">
              {section.title}
            </div>

            <div className="divide-y divide-[#18181A]">
              {section.items.map((item) => {
                const isFollowSuggestion = item.type === 'follow_suggestion';
                const isFollowingThisUser = followingIds.has(item.user?.uid);
                const isActorFounder = item.user?.isFounder || item.user?.username === 'my';

                return (
                  <SwipeableNotificationRow
                    key={item.id}
                    item={item}
                    lang={lang}
                    getSubBadgeIcon={getSubBadgeIcon}
                    getSubtitle={getSubtitle}
                    isFollowSuggestion={isFollowSuggestion}
                    isFollowingThisUser={isFollowingThisUser}
                    isActorFounder={isActorFounder}
                    currentUser={currentUser}
                    onNotificationClick={handleNotificationClick}
                    onOpenUserProfile={onOpenUserProfile}
                    onAcceptFollowRequest={handleAcceptFollowRequest}
                    onRejectFollowRequest={handleRejectFollowRequest}
                    onApproveLoginAlert={handleApproveLoginAlert}
                    onRejectLoginAlert={handleRejectLoginAlert}
                    onToggleFollow={handleToggleFollow}
                    onDelete={handleDeleteNotification}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="py-24 px-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#121214] border border-[#222226] mx-auto flex items-center justify-center text-neutral-500">
              <MessageCircle size={20} />
            </div>
            <p className="text-xs text-neutral-400 font-medium">
              {filter === 'all'
                ? (lang === 'ar' ? 'لا توجد أنشطة حتى الآن' : 'No activity yet')
                : (lang === 'ar' ? 'لا توجد إشعارات في هذا التصنيف' : 'No activity in this filter')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SwipeableNotificationRow({
  item,
  lang,
  getSubBadgeIcon,
  getSubtitle,
  isFollowSuggestion,
  isFollowingThisUser,
  isActorFounder,
  currentUser,
  onNotificationClick,
  onOpenUserProfile,
  onAcceptFollowRequest,
  onRejectFollowRequest,
  onApproveLoginAlert,
  onRejectLoginAlert,
  onToggleFollow,
  onDelete
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isHorizontalSwipeRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartRef.current;
    const deltaY = currentY - touchStartYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    // Dampen drag
    const dampened = deltaX * 0.75;
    if (dampened > 0) {
      setDragOffset(Math.min(dampened, 95));
    } else {
      setDragOffset(Math.max(dampened, -95));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(dragOffset) > 65) {
      setDragOffset(dragOffset > 0 ? 80 : -80);
    } else {
      setDragOffset(0);
    }
  };

  const handleDelete = (e) => {
    if (e) e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(item.id);
    }, 200);
  };

  if (isDeleting) {
    return <div className="h-0 opacity-0 overflow-hidden transition-all duration-200" />;
  }

  const showDelete = Math.abs(dragOffset) > 15;
  const subtitle = getSubtitle(item);

  return (
    <div className="relative overflow-hidden bg-black select-none border-b border-[#141416]">
      {/* Background Red Delete Tray (PULSE Style) */}
      <div 
        className={`absolute inset-0 bg-red-600 flex items-center justify-between px-5 z-0 transition-opacity ${
          showDelete ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-white font-bold text-xs tap-press py-2 px-3"
          aria-label="Delete"
        >
          <Trash2 size={16} />
          <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-white font-bold text-xs tap-press py-2 px-3"
          aria-label="Delete"
        >
          <Trash2 size={16} />
          <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
        </button>
      </div>

      {/* Foreground Sliding Card */}
      <div
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (dragOffset !== 0) {
            setDragOffset(0);
          } else {
            onNotificationClick(item);
          }
        }}
        className="relative z-10 bg-black p-4 flex items-start gap-3 hover:bg-[#0A0A0C] cursor-pointer active:bg-[#121214] transition-colors group/row"
      >
        {/* User Avatar with Event Badge */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenUserProfile && item.user) onOpenUserProfile(item.user);
          }}
          className="relative flex-shrink-0 cursor-pointer tap-press pt-0.5"
        >
          <img 
            src={resolveAvatar(item.user?.avatar)} 
            alt={item.user.displayName} 
            className="w-10 h-10 rounded-full aspect-square object-cover border border-[#222226] flex-shrink-0 block" 
            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px', maxWidth: '40px', maxHeight: '40px' }}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
          />
          <div className="absolute -bottom-1 -right-1">
            {getSubBadgeIcon(item.type)}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          {/* Top Line: Username + Relative Time + Optional Follow button */}
          <div className="flex items-center justify-between gap-2">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenUserProfile && item.user) onOpenUserProfile(item.user);
              }}
              className="flex items-center gap-1.5 flex-wrap cursor-pointer group/author"
            >
              <span className="text-sm font-bold text-white transition-opacity group-hover/author:opacity-80">
                {item.user.username || item.user.displayName}
              </span>
              {isActorFounder && (
                <span className="px-1.5 py-0.2 rounded bg-white text-black text-[9px] font-black font-mono">
                  FOUNDER
                </span>
              )}
              {item.user.isVerified && !isActorFounder && (
                <VerifiedBadge size={14} />
              )}
              <span className="text-[11px] text-neutral-400 font-mono">
                {item.time}
              </span>
            </div>

            {/* Desktop Quick Delete Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="opacity-0 group-hover/row:opacity-100 p-1 text-neutral-500 hover:text-red-400 rounded-full hover:bg-white/5 transition-all tap-press"
                title={lang === 'ar' ? 'حذف الإشعار' : 'Delete notification'}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Subtitle / Context (Follow suggestion, Because you follow, etc.) */}
          {subtitle && (
            <div className="text-xs text-neutral-400 mt-0.5 font-normal">
              {subtitle}
            </div>
          )}

          {/* Post Snippet Text (PULSE Style) */}
          {item.preview && (
            <p dir="auto" className="text-xs text-neutral-200 mt-1 line-clamp-3 leading-relaxed bidi-plain break-words font-normal">
              {item.preview}
            </p>
          )}

          
          {item.targetPost && (
            <div className="flex items-center gap-4 mt-2.5 text-[11px] text-neutral-400 font-mono">
              <span className="flex items-center gap-1">
                <Heart size={12} className="text-neutral-500" />
                <span>{item.likesCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={12} className="text-neutral-500" />
                <span>{item.commentsCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <Repeat2 size={12} className="text-neutral-500" />
                <span>{item.repostsCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <Send size={11} className="text-neutral-500" />
                <span>{item.viewsCount > 0 ? item.viewsCount : 1}</span>
              </span>
            </div>
          )}

          {/* Follow Request Actions */}
          {item.type === 'follow_request' && (
            <div className="flex items-center gap-2 mt-2.5">
              {item.status === 'accepted' ? (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium py-1">
                  <Check size={13} className="text-white" />
                  <span>{lang === 'ar' ? 'تم قبول الطلب' : 'Request accepted'}</span>
                </div>
              ) : item.status === 'declined' ? (
                <div className="text-xs text-neutral-500 font-medium py-1">
                  <span>{lang === 'ar' ? 'تم حذف الطلب' : 'Request deleted'}</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleAcceptFollowRequest(e, item)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 tap-press transition-all shadow-sm"
                  >
                    {lang === 'ar' ? 'تأكيد' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleRejectFollowRequest(e, item)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#18181D] text-neutral-300 border border-[#2E2E32] hover:bg-[#25252A] tap-press transition-all"
                  >
                    {lang === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Security Login Alert Actions (1:1 Authentic Session Defense) */}
          {item.type === 'security_login_alert' && (
            <div className="mt-3 p-3.5 rounded-2xl bg-[#141418] border border-[#26262E] space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                <ShieldAlert size={16} className="text-red-500 flex-shrink-0" />
                <span className="leading-relaxed font-medium">
                  {item.text || (lang === 'ar' ? 'تسجيل دخول جديد لحسابك' : 'New login detected on your account')}
                </span>
              </div>
              
              {item.status === 'approved' ? (
                <div className="flex items-center gap-1.5 text-xs text-white font-semibold py-1">
                  <CheckCircle2 size={15} />
                  <span>{lang === 'ar' ? 'تم تأكيد الجلسة كنشاط موثوق بواسطتك' : 'Verified as recognized activity by you'}</span>
                </div>
              ) : item.status === 'rejected' ? (
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold py-1">
                  <AlertTriangle size={15} />
                  <span>{lang === 'ar' ? 'تم رفض الجلسة وإنهاء اتصال الجهاز فورياً' : 'Session denied and device terminated'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => onApproveLoginAlert?.(e, item)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 tap-press text-center shadow-sm transition-all"
                  >
                    {lang === 'ar' ? 'نعم، هذا أنا' : 'Yes, it was me'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onRejectLoginAlert?.(e, item)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 tap-press text-center transition-all"
                  >
                    {lang === 'ar' ? 'لا، لست أنا (اتخاذ الإجراءات)' : 'No, secure account'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Weak Password Periodic Security Alert Card */}
          {item.type === 'weak_password_alert' && (
            <div className="mt-3 p-3.5 rounded-2xl bg-[#141418] border border-red-500/25 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                <ShieldAlert size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">
                    {lang === 'ar' ? 'تنبيه أمان: كلمة المرور بحاجة للتحديث' : 'Security Alert: Password Update Recommended'}
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-relaxed">
                    {item.text || (lang === 'ar' 
                      ? 'كلمة المرور الخاصة بحسابك لا تلبي معايير الأمان الموصى بها. نوصي بتحديثها لحماية بياناتك.' 
                      : 'Your account password does not meet security criteria. Please update it.')}
                  </div>
                </div>
              </div>

              {item.status === 'resolved' ? (
                <div className="flex items-center gap-1.5 text-xs text-white font-semibold py-1">
                  <CheckCircle2 size={15} />
                  <span>{lang === 'ar' ? 'تم تحديث كلمة المرور وتأمين حسابك بنجاح' : 'Password updated & account secured'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    try { hapticsService.medium?.(); } catch {}
                    onOpenChangePassword?.();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 tap-press text-center shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Lock size={14} />
                  <span>{lang === 'ar' ? 'تحديث كلمة المرور الآن' : 'Update Password Now'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Far Right Action for Follow / Follow Suggestions / Mutual (PULSE Official) */}
        {(item.type === 'follow' || item.type === 'follow_suggestion' || item.type === 'mutual_follow') && item.user?.uid !== currentUser?.uid && (
          <div className="flex-shrink-0 self-center">
            <button
              type="button"
              onClick={(e) => handleToggleFollow(e, item.user)}
              className={`px-5 py-1.5 text-xs font-semibold rounded-xl tap-press transition-all flex items-center justify-center ${
                isFollowingThisUser
                  ? 'bg-transparent text-white border border-[#333333] hover:border-neutral-500'
                  : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
              }`}
            >
              {isFollowingThisUser ? (
                <span>{lang === 'ar' ? 'مُتابع' : 'Following'}</span>
              ) : (
                <span>{lang === 'ar' ? 'متابعة' : 'Follow'}</span>
              )}
            </button>
          </div>
        )}

        {/* Far Right Media Thumbnail (if post has image/video) */}
        {item.mediaUrl && !isFollowSuggestion && (
          <div className="flex-shrink-0 self-start ml-1 rtl:mr-1 rtl:ml-0">
            <img 
              src={item.mediaUrl} 
              alt="Media preview" 
              className="w-11 h-11 rounded-lg object-cover border border-white/10"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
