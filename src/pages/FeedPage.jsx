import React, {
  useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback
} from 'react';
import PostCard from '../components/PostCard';
import AdCard from '../components/AdCard';
import PulseLogo from '../components/PulseLogo';
import FeedsDrawerModal from '../components/FeedsDrawerModal';
import SuggestedProfilesStrip from '../components/SuggestedProfilesStrip';
import { MessageCircle, MapPin, Navigation, X, Menu, Check, Plus, Search, WifiOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { hapticsService } from '../services/hapticsService';
import { rankingEngine } from '../services/rankingEngine';
import { moderationService } from '../services/moderationService';
import { locationService } from '../services/locationService';
import { storageService } from '../services/storageService';
import { offlineCacheService } from '../services/offlineCacheService';
import { adService } from '../services/adService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { affinityEngine } from '../services/affinityEngine';
import VirtualPostItem from '../components/VirtualPostItem';

// Survives tab switches (FeedPage unmounts when another tab is shown)
const feedSession = { uid: null, scrollY: 0, filter: 'for_you' };

const PULL_THRESHOLD = 62;
const MAX_PULL = 112;
const REFRESH_HOLD = 54;

// Where the "Suggested for you" carousels are injected (count of organic posts before each)
const SUGGESTION_SLOTS = [
  { afterPosts: 12, from: 0, to: 8 },
  { afterPosts: 20, from: 8, to: 16 }
];

function FeedSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="px-4 py-4 border-b border-white/[0.05] flex gap-3">
          <div className="w-10 h-10 rounded-full bg-white/[0.05] flex-shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-3 w-1/3 rounded-full bg-white/[0.05]" />
            <div className="h-3 w-full rounded-full bg-white/[0.03]" />
            <div className="h-3 w-5/6 rounded-full bg-white/[0.03]" />
            {i % 2 === 0 && <div className="h-36 w-full rounded-2xl bg-white/[0.02] border border-white/[0.04] mt-3" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedPage({
  posts,
  currentUser,
  onLike,
  onRepost,
  onOpenDetail,
  onOpenCompose,
  onOpenSettings,
  onOpenVerification,
  onOpenShare,
  onOpenReport,
  onBlockUser,
  onDeletePost,
  onEditPost,
  onToggleBookmark,
  onOpenUserProfile,
  onOpenContactsSync,
  onOpenCreateSpace,
  onOpenSpace,
  activeSpaceId,
  onOpenMessages,
  unreadDmCount = 0,
  onLoadOlderPosts = null,
  hasMorePosts = false,
  isLoadingOlder = false,
  onRefresh = null
}) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  // Reset remembered position when another account signs in
  if (feedSession.uid !== (currentUser?.uid || null)) {
    feedSession.uid = currentUser?.uid || null;
    feedSession.scrollY = 0;
    feedSession.filter = 'for_you';
  }

  const [filter, setFilterState] = useState(feedSession.filter); // 'for_you' | 'following' | 'voice' | 'nearby' | 'bookmarks' | topic_*
  const [selectedLocationFilter, setSelectedLocationFilter] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFeedsDrawerOpen, setIsFeedsDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [bootGrace, setBootGrace] = useState(true);
  const [poolNonce, setPoolNonce] = useState(0);
  const [prefNonce, setPrefNonce] = useState(0);

  useEffect(() => {
    const handlePrefChange = () => setPrefNonce((n) => n + 1);
    window.addEventListener('pulse_preference_changed', handlePrefChange);
    return () => window.removeEventListener('pulse_preference_changed', handlePrefChange);
  }, []);

  const setFilter = useCallback((next) => {
    feedSession.filter = next;
    setFilterState(next);
  }, []);

  // ---------------------------------------------------------------------
  // Pull-to-refresh: PULSE Official Compositor-driven physics with rotating
  // Pulse badge, circular SVG progress winding, and crisp haptic clicks.
  // ---------------------------------------------------------------------
  const indicatorRef = useRef(null);
  const iconRef = useRef(null);
  const circleProgressRef = useRef(null);
  const contentRef = useRef(null);
  const drag = useRef({ active: false, locked: false, startY: 0, startX: 0, y: 0, armed: false });
  const refreshingRef = useRef(false);

  const [isOffline, setIsOffline] = useState(() => !offlineCacheService.isOnline());

  useEffect(() => {
    return offlineCacheService.onNetworkChange((online) => {
      setIsOffline(!online);
    });
  }, []);

  const setPull = useCallback((y, animate) => {
    const content = contentRef.current;
    if (!content) return;
    content.style.transition = animate ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
    content.style.willChange = y > 0 ? 'transform' : '';
    content.style.transform = y > 0 ? `translate3d(0, ${y}px, 0)` : '';

    const indicator = indicatorRef.current;
    if (indicator) {
      indicator.style.transition = animate ? 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.25s ease' : 'none';
      if (y > 0) {
        const progress = Math.min(1, Math.max(0, y / PULL_THRESHOLD));
        const badgeY = Math.min(y * 0.72, 54);
        const scale = Math.min(1, 0.45 + progress * 0.55);
        indicator.style.transform = `translateY(${badgeY}px) scale(${scale.toFixed(3)})`;
        indicator.style.opacity = String(Math.min(1, progress * 1.5));
        if (circleProgressRef.current) {
          const offset = 106.8 * (1 - progress);
          circleProgressRef.current.style.strokeDashoffset = String(offset);
          circleProgressRef.current.style.stroke = progress >= 0.95 ? '#FFFFFF' : '#88888E';
        }
      } else {
        indicator.style.transform = 'translateY(-50px) scale(0)';
        indicator.style.opacity = '0';
        if (circleProgressRef.current) {
          circleProgressRef.current.style.strokeDashoffset = '106.8';
        }
      }
    }

    const icon = iconRef.current;
    if (icon && !refreshingRef.current) {
      icon.style.transform = `rotate(${Math.round(y * 3.6)}deg)`;
    }
  }, []);

  const handleTouchStart = (e) => {
    if (refreshingRef.current || e.touches.length !== 1 || window.scrollY > 0) {
      drag.current.active = false;
      return;
    }
    drag.current = {
      active: true,
      locked: false,
      armed: false,
      startY: e.touches[0].clientY,
      startX: e.touches[0].clientX,
      y: 0
    };
  };

  const handleTouchMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const touch = e.touches[0];
    const dy = touch.clientY - d.startY;
    const dx = touch.clientX - d.startX;

    if (!d.locked) {
      if (dy < -4 || (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8)) {
        d.active = false;
        return;
      }
      if (dy > 8) d.locked = true;
      else return;
    }

    if (window.scrollY > 0) {
      d.active = false;
      setPull(0, true);
      return;
    }

    const y = Math.min(MAX_PULL, Math.pow(Math.max(0, dy - 8), 0.8) * 1.25);
    d.y = y;
    if (y >= PULL_THRESHOLD && !d.armed) {
      d.armed = true;
      try { hapticsService.impact?.(); } catch { /* noop */ }
    } else if (y < PULL_THRESHOLD && d.armed) {
      d.armed = false;
    }
    setPull(y, false);
  };

  const runRefresh = useCallback(async () => {
    refreshingRef.current = true;
    setIsRefreshing(true);
    if (iconRef.current) iconRef.current.style.transform = '';
    if (circleProgressRef.current) {
      circleProgressRef.current.style.strokeDashoffset = '0';
      circleProgressRef.current.style.stroke = '#FFFFFF';
    }
    setPull(REFRESH_HOLD, true);
    try { hapticsService.refresh?.(); } catch { /* noop */ }
    const minSpin = new Promise((r) => setTimeout(r, 700));
    try {
      if (typeof onRefresh === 'function') await onRefresh();
    } catch (err) {
      console.warn('Pull-to-refresh error:', err);
    }
    await minSpin;
    try { hapticsService.light?.(); } catch {}
    setRefreshNonce((n) => n + 1);
    refreshingRef.current = false;
    setIsRefreshing(false);
    setPull(0, true);
  }, [onRefresh, setPull]);

  const handleTouchEnd = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.y >= PULL_THRESHOLD) runRefresh();
    else setPull(0, true);
  };

  // ---------------------------------------------------------------------
  // Scroll position memory across tab switches
  // ---------------------------------------------------------------------
  useLayoutEffect(() => {
    const target = feedSession.scrollY;
    if (!target || target < 8) return undefined;
    let frames = 0;
    let raf = 0;
    const restore = () => {
      window.scrollTo(0, target);
      frames += 1;
      if (frames < 8 && Math.abs(window.scrollY - target) > 2) {
        raf = requestAnimationFrame(restore);
      }
    };
    restore();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        feedSession.scrollY = window.scrollY;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // First-paint grace so the empty-state text never flashes before data arrives
  useEffect(() => {
    const timer = setTimeout(() => setBootGrace(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------
  // Data pipeline (memoised, so re-renders caused by likes etc. are cheap)
  // ---------------------------------------------------------------------
  const activeUserLocation = useMemo(
    () => gpsLocation || (currentUser?.location ? locationService.parseProfileLocation(currentUser.location) : null),
    [gpsLocation, currentUser?.location]
  );

  const followingArr = useMemo(
    () => storageService._resolveEngagementArray(currentUser?.following),
    [currentUser?.following]
  );
  const bookmarksArr = useMemo(
    () => storageService._resolveEngagementArray(currentUser?.bookmarks),
    [currentUser?.bookmarks]
  );

  const visiblePosts = useMemo(
    () => moderationService.filterBlockedPosts(posts, currentUser?.uid, followingArr),
    [posts, currentUser?.uid, followingArr, prefNonce]
  );

  const handleEnableGps = async () => {
    setIsLocating(true);
    try {
      const pos = await locationService.getCurrentPosition();
      const geocoded = await locationService.reverseGeocode(pos.lat, pos.lng, lang);
      setGpsLocation(geocoded);
    } catch (err) {
      console.warn('GPS error in feed:', err);
    } finally {
      setIsLocating(false);
    }
  };

  const filteredPosts = useMemo(() => {
    if (selectedLocationFilter) {
      const locName = (typeof selectedLocationFilter === 'object'
        ? (selectedLocationFilter.name || selectedLocationFilter.city || '')
        : selectedLocationFilter).toLowerCase();
      return visiblePosts.filter((p) => {
        if (!p.location) return false;
        const pLoc = typeof p.location === 'object' ? (p.location.name + ' ' + (p.location.city || '')) : p.location;
        return pLoc.toLowerCase().includes(locName) || locName.includes(pLoc.toLowerCase());
      });
    }
    if (filter === 'following') {
      return visiblePosts.filter((p) => followingArr.includes(p.authorId) || followingArr.includes(p.author?.uid));
    }
    if (filter === 'voice') return visiblePosts.filter((p) => p.hasVoice);
    if (filter === 'nearby') {
      const withLoc = visiblePosts.filter((p) => !!p.location);
      if (!activeUserLocation) return withLoc;
      return [...withLoc].sort((a, b) => (
        locationService.getProximityScore(b, activeUserLocation) -
        locationService.getProximityScore(a, activeUserLocation)
      ));
    }
    if (filter === 'bookmarks') {
      return visiblePosts.filter((p) => bookmarksArr.includes(p.id) ||
        (typeof storageService.isBookmarked === 'function' && storageService.isBookmarked(p.id, currentUser)));
    }
    if (filter.startsWith('topic_')) {
      const targetTopic = filter.replace('topic_', '');
      return visiblePosts.filter((p) => affinityEngine.extractTopics(p.content).includes(targetTopic));
    }
    return visiblePosts;
  }, [visiblePosts, selectedLocationFilter, filter, followingArr, bookmarksArr, activeUserLocation, currentUser]);

  // Stable ranking: positions are decided once per (filter, refresh). Likes /
  // live updates change post content but never reorder what's on screen, so the
  // list never "jumps" under the user's finger. Brand-new posts go on top,
  // older pagination results are appended at the bottom.
  const orderRef = useRef({ key: '', ids: [] });
  const rankedPosts = useMemo(() => {
    let ranked;
    if (filter === 'nearby' || selectedLocationFilter) {
      ranked = filteredPosts;
    } else if (filter === 'following') {
      ranked = [...filteredPosts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      ranked = rankingEngine.rankPosts(filteredPosts, currentUser, activeUserLocation);
    }

    const locKey = selectedLocationFilter
      ? (typeof selectedLocationFilter === 'object' ? selectedLocationFilter.name : selectedLocationFilter)
      : '';
    const key = `${filter}|${locKey}|${refreshNonce}|${currentUser?.uid || ''}`;
    const prev = orderRef.current;

    if (prev.key === key && prev.ids.length > 0) {
      const byId = new Map(ranked.map((p) => [p.id, p]));
      const kept = prev.ids.filter((id) => byId.has(id)).map((id) => byId.get(id));
      const keptSet = new Set(prev.ids);
      const fresh = ranked.filter((p) => !keptSet.has(p.id));
      const newestKept = kept.reduce((max, p) => Math.max(max, new Date(p.createdAt || 0).getTime()), 0);
      const freshTop = fresh.filter((p) => new Date(p.createdAt || 0).getTime() > newestKept);
      const freshBottom = fresh.filter((p) => new Date(p.createdAt || 0).getTime() <= newestKept);
      ranked = [...freshTop, ...kept, ...freshBottom];
    }

    orderRef.current = { key, ids: ranked.map((p) => p.id) };
    return ranked;
  }, [filteredPosts, filter, selectedLocationFilter, refreshNonce, currentUser, activeUserLocation]);

  // Ads (deterministic, injected once per ranked list)
  const adsLocKey = activeUserLocation ? JSON.stringify(activeUserLocation) : '';
  const feedWithAds = useMemo(
    () => adService.injectAdsIntoFeed(rankedPosts, currentUser, activeUserLocation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankedPosts, currentUser?.uid, adsLocKey]
  );

  // "Suggested for you" pool: computed once per session/refresh so cards do not
  // vanish or reshuffle while the user scrolls or follows someone.
  const hasAnyPosts = posts.length > 0;
  const suggestionPool = useMemo(() => {
    if (!currentUser?.uid) return [];
    try {
      const users = storageService.getUsers() || [];
      const excludeIds = [
        ...moderationService.getBlockedUsers(currentUser.uid),
        ...moderationService.getBlockedByUsers(currentUser.uid),
        ...getDismissedSuggestions()
      ];
      return rankingEngine.recommendCreators(currentUser, users, posts, { excludeIds, limit: 16 });
    } catch (err) {
      console.warn('Suggestions error:', err);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, refreshNonce, poolNonce, hasAnyPosts]);

  // Users may stream in after first paint: retry a few times while the pool is empty
  useEffect(() => {
    if (suggestionPool.length >= 3) return undefined;
    const timers = [2000, 6000, 15000].map((ms) => setTimeout(() => setPoolNonce((n) => n + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [suggestionPool.length]);

  const showSuggestions = filter === 'for_you' && !selectedLocationFilter && suggestionPool.length >= 3;

  const feedItems = useMemo(() => {
    if (!showSuggestions) return feedWithAds;
    const out = [];
    let organic = 0;
    const pending = [...SUGGESTION_SLOTS];
    feedWithAds.forEach((item) => {
      out.push(item);
      if (item.isAd) return;
      organic += 1;
      const slot = pending[0];
      if (slot && organic === slot.afterPosts) {
        const candidates = suggestionPool.slice(slot.from, slot.to);
        if (candidates.length >= 2) {
          out.push({ isSuggestion: true, id: `suggestions_${slot.afterPosts}`, candidates });
        }
        pending.shift();
      }
    });
    // Short feed: still surface one carousel at the end
    if (pending.length === SUGGESTION_SLOTS.length && organic >= 6) {
      const candidates = suggestionPool.slice(0, 8);
      if (candidates.length >= 2) out.push({ isSuggestion: true, id: 'suggestions_tail', candidates });
    }
    return out;
  }, [feedWithAds, showSuggestions, suggestionPool]);

  // ---------------------------------------------------------------------
  // Infinite scroll
  // ---------------------------------------------------------------------
  const sentinelRef = useRef(null);
  const supportsObserver = typeof IntersectionObserver !== 'undefined';
  useEffect(() => {
    if (!supportsObserver || !hasMorePosts || !onLoadOlderPosts || isLoadingOlder) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadOlderPosts();
      },
      { rootMargin: '1400px 0px 1400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [supportsObserver, hasMorePosts, onLoadOlderPosts, isLoadingOlder, rankedPosts.length]);

  const handleFilterByLocation = useCallback((loc) => {
    setSelectedLocationFilter(loc);
    setFilter('nearby');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setFilter]);

  const getFilterLabel = () => {
    if (selectedLocationFilter) return isAr ? 'الموقع' : 'Location';
    if (filter === 'following') return isAr ? 'المتابعون' : 'Following';
    if (filter === 'voice') return isAr ? 'الصوتيات' : 'Audio';
    if (filter === 'nearby') return isAr ? 'بالقرب منك' : 'Nearby';
    if (filter === 'bookmarks') return isAr ? 'المحفوظات' : 'Bookmarks';
    return null;
  };
  const activeLabel = getFilterLabel();

  const showSkeleton = rankedPosts.length === 0 && posts.length === 0 && bootGrace;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto w-full select-none"
    >
      {/* Top header — solid (no backdrop blur: blur is re-rasterised every scroll frame) */}
      <div className="sticky top-0 z-30 bg-black border-b border-[#18181A]">
        <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <button
            onClick={() => {
              try { hapticsService.light?.(); } catch { /* noop */ }
              setIsFeedsDrawerOpen(true);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors"
            title={isAr ? 'الخلاصات' : 'Feeds'}
            aria-label="Feeds"
          >
            <Menu size={22} strokeWidth={2.2} />
          </button>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center justify-center cursor-pointer tap-press outline-none hover:opacity-85 transition-opacity"
            title="PULSE"
            aria-label="Scroll to top"
          >
            <PulseLogo size={32} />
          </button>

          <button
            onClick={onOpenMessages}
            className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 active:bg-white/15 tap-press transition-colors relative"
            title={t('messages') || 'Direct Messages'}
            aria-label="Messages"
          >
            <MessageCircle size={20} strokeWidth={2.2} />
            {unreadDmCount > 0 && (
              <span className="absolute top-1 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-white text-[10px] font-mono font-black text-black flex items-center justify-center shadow-md">
                {unreadDmCount > 9 ? '9+' : unreadDmCount}
              </span>
            )}
          </button>
        </header>

        {activeLabel && (
          <div className="px-4 py-2 bg-[#121214] border-t border-[#1C1C20] flex items-center justify-between animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
            <span className="text-xs text-neutral-400">
              {isAr ? 'الخلاصة:' : 'Feed:'} <strong className="text-white font-bold">{activeLabel}</strong>
            </span>
            <button
              onClick={() => {
                setFilter('for_you');
                setSelectedLocationFilter(null);
              }}
              className="text-xs text-white bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1 rounded-full tap-press transition-all flex items-center gap-1.5"
            >
              <span>{isAr ? 'العودة للموصى بها' : 'Back to For you'}</span>
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Offline Status Notice */}
      {isOffline && (
        <div
          className="px-4 py-2.5 bg-[#121214] border-b border-[#222226] flex items-center justify-between text-xs text-neutral-300 animate-fade-in select-none"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="text-neutral-400 flex-shrink-0" />
            <span className="font-medium text-neutral-300">
              {isAr
                ? 'أنت في وضع عدم الاتصال · يتم عرض النبضات المحفوظة محلياً'
                : 'You are offline · Showing locally cached pulses'}
            </span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 flex-shrink-0" />
        </div>
      )}

      <div className="relative">
        {/* Pull-to-refresh PULSE Official Floating Indicator */}
        <div
          ref={indicatorRef}
          className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none z-20"
          style={{ transform: 'translateY(-50px) scale(0)', opacity: 0 }}
          aria-hidden="true"
        >
          <div className="relative w-10 h-10 rounded-full bg-black/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.8)] flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-10 h-10 -rotate-90 pointer-events-none" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                stroke="#222226"
                strokeWidth="2.2"
              />
              <circle
                ref={circleProgressRef}
                cx="20"
                cy="20"
                r="17"
                fill="none"
                stroke="#88888E"
                strokeWidth="2.2"
                strokeDasharray="106.8"
                strokeDashoffset="106.8"
                strokeLinecap="round"
                className="transition-colors duration-150"
              />
            </svg>
            <div
              ref={iconRef}
              className={`flex items-center justify-center transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ animationDuration: '0.8s' }}
            >
              <PulseLogo size={18} />
            </div>
          </div>
        </div>

        {/* Feed content */}
        <div ref={contentRef} className="relative bg-black">
          {/* "What's new?" quick composer row */}
          {currentUser && (
            <div
              onClick={() => {
                try { hapticsService.light?.(); } catch { /* noop */ }
                onOpenCompose();
              }}
              className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-3.5 cursor-pointer active:bg-white/[0.02] transition-colors"
              role="button"
              aria-label={isAr ? 'نبضة جديدة' : 'New pulse'}
            >
              <img
                src={currentUser.avatar || DEFAULT_AVATAR}
                alt=""
                width={36}
                height={36}
                className="w-9 h-9 rounded-full aspect-square object-cover border border-[#222226] block flex-shrink-0"
                style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-white truncate" dir="ltr">
                  {currentUser.username ? `@${currentUser.username}` : currentUser.displayName}
                </div>
                <div className="text-[14px] text-neutral-500 font-normal mt-0.5">
                  {isAr ? 'ما الجديد؟' : "What's new?"}
                </div>
              </div>
              <span className="px-4 py-1.5 rounded-full border border-[#26262A] text-[13px] font-semibold text-neutral-500 flex-shrink-0">
                {isAr ? 'نشر' : 'Post'}
              </span>
            </div>
          )}

          {selectedLocationFilter && (
            <div className="mx-4 my-2.5 p-2.5 rounded-2xl bg-[#141416] border border-white/20 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2 text-xs text-neutral-200 min-w-0">
                <MapPin size={14} className="text-white flex-shrink-0" />
                <span className="text-neutral-400 flex-shrink-0">{isAr ? 'نبضات من:' : 'Pulses in:'}</span>
                <span className="font-bold text-white truncate">
                  {typeof selectedLocationFilter === 'object' ? selectedLocationFilter.name : selectedLocationFilter}
                </span>
              </div>
              <button
                onClick={() => setSelectedLocationFilter(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white tap-press flex-shrink-0 ml-2"
                title={isAr ? 'إلغاء الفلترة' : 'Clear filter'}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {filter === 'nearby' && !activeUserLocation && !selectedLocationFilter && (
            <div className="mx-4 my-3 p-3.5 rounded-2xl bg-[#141416] border border-neutral-800 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-white">
                  <Navigation size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">
                    {isAr ? 'اكتشف نبضات منطقتك' : 'Discover Local Pulses'}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {isAr ? 'فعّل الـ GPS أو حدد مدينتك لترتيب النبضات الأقرب لك' : 'Enable GPS or set profile city to rank closest pulses'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleEnableGps}
                disabled={isLocating}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press flex-shrink-0 transition-colors"
              >
                {isLocating ? (isAr ? 'جاري التحديد...' : 'Locating...') : (isAr ? 'تحديد موقعي' : 'Enable GPS')}
              </button>
            </div>
          )}

          {showSkeleton && <FeedSkeleton />}

          {/* Posts, ads and suggestion carousels — content-visibility windowing */}
          <div>
            {feedItems.map((item, index) => {
              if (item.isSuggestion) {
                return (
                  <SuggestedProfilesStrip
                    key={item.id}
                    candidates={item.candidates}
                    currentUser={currentUser}
                    onOpenUserProfile={onOpenUserProfile}
                    lang={lang}
                  />
                );
              }
              if (item.isAd) {
                return (
                  <VirtualPostItem key={item.id} minHeight={240}>
                    <AdCard
                      ad={item}
                      currentUser={currentUser}
                      onOpenUserProfile={onOpenUserProfile}
                      onOpenReport={onOpenReport}
                    />
                  </VirtualPostItem>
                );
              }
              return (
                <VirtualPostItem key={item.id} minHeight={190}>
                  <PostCard
                    post={item}
                    animationIndex={index}
                    currentUserId={currentUser?.uid}
                    currentUser={currentUser}
                    onLike={onLike}
                    onRepost={onRepost}
                    onOpenDetail={onOpenDetail}
                    onOpenShare={onOpenShare}
                    onOpenReport={onOpenReport}
                    onBlockUser={onBlockUser}
                    onDeletePost={onDeletePost}
                    onEditPost={onEditPost}
                    onToggleBookmark={onToggleBookmark}
                    onOpenUserProfile={onOpenUserProfile}
                    onFilterByLocation={handleFilterByLocation}
                  />
                </VirtualPostItem>
              );
            })}

            {/* Infinite-scroll sentinel + loader */}
            {rankedPosts.length > 0 && hasMorePosts && onLoadOlderPosts && (
              <div ref={sentinelRef} className="py-8 px-4 text-center">
                {isLoadingOlder ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-neutral-400">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>{isAr ? 'جاري تحميل المزيد...' : 'Loading more...'}</span>
                  </div>
                ) : !supportsObserver ? (
                  <button
                    onClick={onLoadOlderPosts}
                    className="py-2.5 px-5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 hover:text-white font-medium transition-all tap-press"
                  >
                    {isAr ? 'تحميل المزيد من المنشورات' : 'Load more posts'}
                  </button>
                ) : (
                  <div className="h-4" />
                )}
              </div>
            )}

            {/* End of feed */}
            {rankedPosts.length > 8 && !hasMorePosts && (
              <div className="py-10 flex flex-col items-center gap-2 text-neutral-600">
                <div className="w-8 h-8 rounded-full border border-[#222226] flex items-center justify-center">
                  <Check size={15} strokeWidth={2.5} />
                </div>
                <span className="text-xs">{isAr ? 'وصلت إلى آخر المنشورات' : "You're all caught up"}</span>
              </div>
            )}

            {rankedPosts.length === 0 && !showSkeleton && (
              <div className="p-12 text-center text-xs text-neutral-500 animate-fade-in-up">
                {filter === 'nearby' || selectedLocationFilter
                  ? (isAr ? 'لا توجد منشورات موسومة بهذا الموقع بعد. كن أول من ينشر هنا!' : 'No posts tagged in this location yet. Be the first to share one!')
                  : filter === 'following'
                    ? (isAr ? 'لا توجد منشورات من الحسابات التي تتابعها حتى الآن.' : 'No posts from accounts you follow yet.')
                    : filter === 'bookmarks'
                      ? (isAr ? 'لم تقم بحفظ أي منشورات في المحفوظات بعد.' : 'No bookmarks saved yet.')
                      : t('noPostsYet')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (+) Matching Screenshot 3 & 5 */}
      {currentUser && (
        <button
          onClick={() => {
            hapticsService.light?.();
            onOpenCompose();
          }}
          className="fixed bottom-20 end-4 z-30 w-14 h-14 rounded-2xl bg-[#1E1E22] hover:bg-[#28282C] active:bg-[#323238] border border-white/10 text-white shadow-2xl flex items-center justify-center tap-press transition-transform"
          aria-label={isAr ? 'منشور جديد' : 'New post'}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* Feeds Drawer Modal */}
      <FeedsDrawerModal
        isOpen={isFeedsDrawerOpen}
        onClose={() => setIsFeedsDrawerOpen(false)}
        activeFilter={filter}
        onSelectFilter={(newFilter) => {
          setFilter(newFilter);
          setSelectedLocationFilter(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenBookmarks={() => {
          setFilter('bookmarks');
          setSelectedLocationFilter(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenActivity={() => onOpenMessages?.()}
        lang={lang}
      />
    </div>
  );
}
