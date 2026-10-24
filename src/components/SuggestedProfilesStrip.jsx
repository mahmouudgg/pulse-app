import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storageService';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import VerifiedBadge from './VerifiedBadge';

const DISMISS_KEY = 'pulse_dismissed_suggestions_v1';

export function getDismissedSuggestions() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persistDismissed(uid) {
  try {
    const next = Array.from(new Set([uid, ...getDismissedSuggestions()])).slice(0, 300);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
}

function compactCount(n, isAr) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')}${isAr ? ' م' : 'M'}`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}${isAr ? ' ألف' : 'K'}`;
  return String(n);
}

function reasonLabel(u, isAr) {
  switch (u.reasonKey) {
    case 'mutuals':
      return isAr ? `${u.mutualCount} متابع مشترك` : `${u.mutualCount} mutual${u.mutualCount > 1 ? 's' : ''}`;
    case 'follows_you':
      return isAr ? 'يتابعك' : 'Follows you';
    case 'interest':
      return isAr ? `مهتم بـ #${u.reasonData}` : `Into #${u.reasonData}`;
    case 'founder':
      return isAr ? 'مؤسس PULSE' : 'PULSE founder';
    case 'pioneer':
      return isAr ? `رائد #${u.reasonData}` : `Pioneer #${u.reasonData}`;
    case 'verified':
      return isAr ? 'حساب موثق' : 'Verified account';
    case 'followers':
      return isAr
        ? `${compactCount(u.reasonData, true)} متابع`
        : `${compactCount(u.reasonData, false)} followers`;
    default:
      return isAr ? 'جديد على PULSE' : 'New to PULSE';
  }
}

function SuggestionCard({ user, isAr, isFollowing, onToggleFollow, onDismiss, onOpenProfile }) {
  const name = user.displayName || user.username;
  const mutuals = user.reasonKey === 'mutuals' ? (user.mutualUsers || []) : [];

  return (
    <div className="relative flex-shrink-0 w-[172px] snap-start rounded-[26px] bg-[#121214] border border-[#1E1E22] px-3.5 pt-5 pb-3.5 flex flex-col items-center">
      <button
        type="button"
        onClick={() => onDismiss(user.uid)}
        className="absolute top-2.5 end-2.5 w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-white active:bg-white/10 tap-press"
        aria-label={isAr ? 'إخفاء الاقتراح' : 'Dismiss suggestion'}
      >
        <X size={15} strokeWidth={2.2} />
      </button>

      <button
        type="button"
        onClick={() => onOpenProfile(user)}
        className="flex flex-col items-center w-full outline-none"
      >
        <div className="relative w-[76px] h-[76px]">
          <img
            src={user.avatar || DEFAULT_AVATAR}
            alt=""
            width={76}
            height={76}
            loading="lazy"
            decoding="async"
            className="w-full h-full rounded-full object-cover bg-[#1C1C1E] border border-white/10"
          />
          {user.isVerified && (
            <span className="absolute bottom-0 end-0">
              <VerifiedBadge size={18} />
            </span>
          )}
        </div>

        <div className="mt-2.5 w-full text-center px-1">
          <div dir="auto" className="text-[15px] font-semibold text-white truncate leading-tight">
            {name}
          </div>
          <div className="mt-1 h-[20px] flex items-center justify-center gap-1.5 text-[12.5px] text-neutral-400 max-w-full">
            {mutuals.length > 0 ? (
              <>
                <span className="flex items-center flex-shrink-0">
                  {mutuals.slice(0, 2).map((m, i) => (
                    <img
                      key={m.uid}
                      src={m.avatar || DEFAULT_AVATAR}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={`w-[17px] h-[17px] rounded-full object-cover border-2 border-[#121214] bg-[#1C1C1E] ${i > 0 ? '-ms-1.5' : ''}`}
                    />
                  ))}
                </span>
                <span className="truncate">{reasonLabel(user, isAr)}</span>
              </>
            ) : (
              <span dir="ltr" className="truncate text-neutral-400">
                {user.username ? `@${user.username}` : reasonLabel(user, isAr)}
              </span>
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onToggleFollow(user)}
        className={`mt-3 w-full h-9 rounded-xl text-[14px] font-semibold tap-press transition-colors ${
          isFollowing
            ? 'bg-transparent border border-[#2E2E33] text-neutral-300'
            : 'bg-white text-black hover:bg-neutral-200'
        }`}
      >
        {isFollowing
          ? (isAr ? 'متابَع' : 'Following')
          : (user.followsMe || user.reasonKey === 'follows_you')
          ? (isAr ? 'رد المتابعة' : 'Follow back')
          : (isAr ? 'متابعة' : 'Follow')}
      </button>
    </div>
  );
}

function SuggestedProfilesStrip({ candidates, currentUser, onOpenUserProfile, lang }) {
  const isAr = lang === 'ar';
  const { toggleFollow } = useAuth();
  const [hidden, setHidden] = useState(() => new Set());
  const [followedOverride, setFollowedOverride] = useState({});
  const scrollerRef = useRef(null);

  const followingSet = useMemo(
    () => new Set(storageService._resolveEngagementArray(currentUser?.following)),
    [currentUser?.following]
  );

  // Cards that were dismissed (this session) or followed-then-reset should not reflow while scrolling
  const visible = useMemo(
    () => (candidates || []).filter((u) => !hidden.has(u.uid)),
    [candidates, hidden]
  );

  const handleDismiss = useCallback((uid) => {
    hapticsService.light?.();
    persistDismissed(uid);
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(uid);
      return next;
    });
  }, []);

  const handleToggleFollow = useCallback(async (user) => {
    hapticsService.medium?.();
    const current = user.uid in followedOverride ? followedOverride[user.uid] : followingSet.has(user.uid);
    setFollowedOverride((prev) => ({ ...prev, [user.uid]: !current }));
    try {
      await toggleFollow(user.uid);
    } catch (err) {
      console.warn('Suggestion follow error:', err);
      setFollowedOverride((prev) => ({ ...prev, [user.uid]: current }));
    }
  }, [followedOverride, followingSet, toggleFollow]);

  const handleOpenProfile = useCallback((user) => {
    hapticsService.light?.();
    onOpenUserProfile?.({ ...user });
  }, [onOpenUserProfile]);

  // Jump to the start whenever the strip contents change
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
  }, [candidates]);

  if (visible.length < 2) return null;

  return (
    <section
      dir={isAr ? 'rtl' : 'ltr'}
      className="py-4 border-b border-[#181818]"
      aria-label={isAr ? 'مقترح لك' : 'Suggested for you'}
    >
      <h3 className="px-4 pb-3 text-[15px] font-medium text-neutral-400">
        {isAr ? 'مقترح لك' : 'Suggested for you'}
      </h3>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-1 no-scrollbar"
        style={{
          overscrollBehaviorX: 'contain',
          scrollPaddingInline: 16,
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y'
        }}
      >
        {visible.map((u) => (
          <SuggestionCard
            key={u.uid}
            user={u}
            isAr={isAr}
            isFollowing={u.uid in followedOverride ? followedOverride[u.uid] : followingSet.has(u.uid)}
            onToggleFollow={handleToggleFollow}
            onDismiss={handleDismiss}
            onOpenProfile={handleOpenProfile}
          />
        ))}
        {/* trailing spacer so the last card can snap fully into view */}
        <div className="flex-shrink-0 w-1" aria-hidden="true" />
      </div>
    </section>
  );
}

export default React.memo(SuggestedProfilesStrip);
