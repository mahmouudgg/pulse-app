import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, UserMinus, X } from 'lucide-react';
import { storageService } from '../services/storageService';
import { socialGraphService } from '../services/socialGraphService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function FollowListPage({
  user,
  initialType = 'followers', // 'mutual' | 'followers' | 'following'
  currentUser,
  onBack,
  onOpenUserProfile,
  onToggleFollow
}) {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const { removeFollower } = useAuth();
  const [activeTab, setActiveTab] = useState(initialType);
  const [userToRemove, setUserToRemove] = useState(null);
  const [localFollowers, setLocalFollowers] = useState(() => storageService.getUserFollowers(user?.uid));
  const [localFollowing, setLocalFollowing] = useState(() => storageService.getUserFollowing(user?.uid));

  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;
  const isOwnProfile = currentUser?.uid && user?.uid === currentUser.uid;

  // Mutual connections: people YOU follow who also follow THIS profile
  const mutualList = (!isOwnProfile && currentUser?.uid && user?.uid)
    ? socialGraphService.getMutualFollowers(currentUser.uid, user.uid)
    : [];

  const displayedUsers = activeTab === 'mutual'
    ? mutualList
    : activeTab === 'followers'
    ? localFollowers
    : localFollowing;

  const handleConfirmRemoveFollower = () => {
    if (!userToRemove || !isOwnProfile) return;
    hapticsService.medium?.();

    if (removeFollower) {
      removeFollower(userToRemove.uid);
    } else {
      socialGraphService.removeFollower(userToRemove.uid, currentUser.uid);
    }

    setLocalFollowers((prev) => prev.filter((u) => u.uid !== userToRemove.uid));
    showToast(lang === 'ar' ? `تمت إزالة @${userToRemove.username} من متابعيك` : `Removed @${userToRemove.username} from followers`);
    setUserToRemove(null);
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 tap-press transition-colors"
            aria-label="رجوع"
          >
            <BackIcon size={20} />
          </button>
          <div>
            <h1 className="font-bold text-sm text-white">{user?.displayName}</h1>
            <p className="text-[11px] text-neutral-500 font-mono" dir="ltr">@{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Switcher Tabs - PULSE Official (Mutual / Followers / Following) */}
      <div className="flex border-b border-[#1C1C1E] bg-black/90 sticky top-[53px] z-20 backdrop-blur-md">
        {!isOwnProfile && (
          <button
            onClick={() => setActiveTab('mutual')}
            className={`flex-1 py-3 text-xs font-bold transition-all relative tap-press flex items-center justify-center gap-1.5 ${
              activeTab === 'mutual' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span>{lang === 'ar' ? 'المشتركون' : 'Mutual'}</span>
            <span className="text-[11px] font-mono text-neutral-400">({mutualList.length})</span>
            {activeTab === 'mutual' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></div>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('followers')}
          className={`flex-1 py-3 text-xs font-bold transition-all relative tap-press flex items-center justify-center gap-1.5 ${
            activeTab === 'followers' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span>{t('followers')}</span>
          <span className="text-[11px] font-mono text-neutral-400">({localFollowers.length})</span>
          {activeTab === 'followers' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5 tap-press ${
            activeTab === 'following' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span>{t('following')}</span>
          <span className="text-[11px] font-mono text-neutral-400">({localFollowing.length})</span>
          {activeTab === 'following' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></div>
          )}
        </button>
      </div>

      {/* Users List */}
      <div className="divide-y divide-[#151518]">
        {displayedUsers.map((item) => {
          const isFounder = item.isFounder || item.username === 'my';
          const rel = socialGraphService.getRelationship(currentUser?.uid, item.uid);
          const isMe = currentUser?.uid === item.uid;

          return (
            <div
              key={item.uid}
              onClick={() => onOpenUserProfile && onOpenUserProfile(item)}
              className="p-4 flex items-center justify-between hover:bg-[#070708] active:bg-[#0C0C0D] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden pe-2">
                <img
                  src={item.avatar || DEFAULT_AVATAR}
                  alt={item.displayName}
                  className="w-11 h-11 rounded-full aspect-square object-cover border border-[#222226] flex-shrink-0 block"
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', maxWidth: '44px', maxHeight: '44px' }}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[13.5px] font-bold text-white truncate">{item.displayName}</span>
                    {isFounder ? (
                      <span className="text-[8px] font-extrabold bg-white/10 text-white border border-white/20 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                        FOUNDER
                      </span>
                    ) : item.isVerified ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <Check size={9} className="text-black stroke-[3.5]" />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    <span className="text-xs text-neutral-500 font-mono truncate" dir="ltr">@{item.username}</span>
                    {rel.isMutual && !isMe ? (
                      <span className="text-[10.5px] text-neutral-400 font-medium whitespace-nowrap flex-shrink-0">
                        · {lang === 'ar' ? 'متابعة متبادلة' : 'Mutual'}
                      </span>
                    ) : rel.followsYou && !rel.isMutual && !isMe ? (
                      <span className="text-[10.5px] text-neutral-400 font-medium whitespace-nowrap flex-shrink-0">
                        · {lang === 'ar' ? 'يتابعك' : 'Follows you'}
                      </span>
                    ) : null}
                  </div>

                  {item.bio && (
                    <p dir="auto" className="text-xs text-neutral-400 mt-1 line-clamp-1 bidi-plain break-words">
                      {item.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Area */}
              <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                {/* Silent Remove Follower button if viewing OWN followers list (PULSE Style) */}
                {isOwnProfile && activeTab === 'followers' && !isMe && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToRemove(item);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full font-bold border border-[#2E2E32] text-neutral-300 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 tap-press transition-colors"
                  >
                    {lang === 'ar' ? 'إزالة' : 'Remove'}
                  </button>
                )}

                {/* Follow / Follow back / Following Toggle button */}
                {!isMe && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticsService.light?.();
                      if (onToggleFollow) onToggleFollow(item.uid);
                    }}
                    className={`text-xs px-3.5 py-1.5 rounded-full font-bold tap-press transition-colors ${
                      rel.isFollowing
                        ? 'border border-[#2E2E32] text-neutral-300 hover:bg-[#141416]'
                        : rel.isRequested
                        ? 'border border-[#3E3E42] text-neutral-400'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {rel.isFollowing
                      ? (lang === 'ar' ? 'متابَع' : 'Following')
                      : rel.isRequested
                      ? (lang === 'ar' ? 'تم الطلب' : 'Requested')
                      : rel.followsYou
                      ? (lang === 'ar' ? 'رد المتابعة' : 'Follow back')
                      : (lang === 'ar' ? 'متابعة' : 'Follow')}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {displayedUsers.length === 0 && (
          <div className="py-24 px-4 text-center">
            <p className="text-xs text-neutral-400">
              {activeTab === 'mutual'
                ? (lang === 'ar' ? 'لا يوجد متابعون مشتركون بينكما حالياً' : 'No mutual followers yet')
                : activeTab === 'followers'
                ? t('noFollowersYet')
                : t('noFollowingYet')}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Removing Follower (PULSE Style) */}
      {userToRemove && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setUserToRemove(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[24px] bg-[#18181A] border border-white/10 p-5 shadow-2xl text-center animate-in zoom-in-95"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-neutral-300">
              <UserMinus size={22} />
            </div>
            <h3 className="font-bold text-base text-white mb-1.5">
              {lang === 'ar' ? `إزالة @${userToRemove.username}؟` : `Remove @${userToRemove.username}?`}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed mb-5">
              {lang === 'ar'
                ? `لن نخطر @${userToRemove.username} بأنه تمت إزالته من قائمة متابعيك، ولن يتمكن من رؤية نبضاتك الخاصة إلا إذا قبلت طلبه مجدداً.`
                : `We won't tell @${userToRemove.username} they were removed from your followers.`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserToRemove(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-neutral-300 hover:bg-white/5 tap-press"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveFollower}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white tap-press"
              >
                {lang === 'ar' ? 'إزالة المتابع' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </SwipeBackWrapper>
  );
}
