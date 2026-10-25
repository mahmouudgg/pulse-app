import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Repeat2, Share2, MoreHorizontal, ExternalLink, Volume2, VolumeX, ShieldAlert, EyeOff, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { adService } from '../services/adService';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

export default function AdCard({
  ad,
  onOpenUserProfile,
  onOpenReport,
  currentUser
}) {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const isAr = lang === 'ar';

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(ad.likesCount || 0);
  const [isMuted, setIsMuted] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Automatically track verified Impression upon mounting in feed
  useEffect(() => {
    if (ad?.id) {
      adService.trackImpression(ad.id, currentUser?.uid);
    }
  }, [ad?.id, currentUser?.uid]);

  const handleCtaClick = (e) => {
    e.stopPropagation();
    try {
      hapticsService.light?.();
      adService.trackClick(ad.id, currentUser?.uid);
      if (ad.destinationUrl) {
        window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.warn('Ad click error:', err);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    hapticsService.light?.();
    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
    }
  };

  const handleHideAd = () => {
    setShowMenu(false);
    setIsHidden(true);
    showToast(isAr ? 'تم إخفاء هذا الإعلان' : 'Ad hidden');
  };

  if (isHidden) {
    return (
      <div className="p-4 text-center border-b border-[#18181A] bg-[#0E0E10] text-xs text-neutral-500">
        {isAr ? 'تم إخفاء الإعلان من خلاصتك.' : 'Ad hidden from your feed.'}
      </div>
    );
  }

  const ctaLabel = isAr ? (ad.ctaTextAr || ad.ctaText || 'معرفة المزيد') : (ad.ctaText || 'Learn more');
  const displayUrl = ad.displayUrl || 'pulse.app';

  return (
    <article className="border-b border-[#18181A] bg-black hover:bg-white/[0.01] transition-colors p-4 relative select-none">
      {/* 1. Header (PULSE Official Ad Style - media_1790943254010.png) */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2.5">
          <div 
            onClick={() => {
              if (onOpenUserProfile && ad.brandUsername) {
                onOpenUserProfile({
                  displayName: ad.brandName,
                  username: ad.brandUsername,
                  avatar: ad.brandAvatar
                });
              }
            }}
            className="w-10 h-10 rounded-full overflow-hidden border border-[#28282D] bg-[#111111] flex-shrink-0 cursor-pointer tap-press"
          >
            <img
              src={ad.brandAvatar || DEFAULT_AVATAR}
              alt={ad.brandName}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white hover:underline cursor-pointer">
              {ad.brandName}
            </span>
            {/* Subtle Ad / إعلان Tag */}
            <span className="text-[12px] font-medium text-[#777777] select-none">
              {isAr ? 'إعلان' : 'Ad'}
            </span>
          </div>
        </div>

        {/* 3-Dots Context Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 rounded-full text-neutral-500 hover:text-white hover:bg-white/5 tap-press transition-colors"
            aria-label="Ad options"
          >
            <MoreHorizontal size={17} />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute end-0 top-full mt-1 w-52 rounded-2xl bg-[#1C1C1E] border border-white/10 shadow-2xl py-1 z-50 overflow-hidden divide-y divide-white/5 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    showToast(isAr ? 'أنت تشاهد هذا الإعلان بناءً على اهتماماتك ومنطقتك الجغرافية.' : 'You are seeing this ad based on relevance and region.');
                  }}
                  className="w-full px-4 py-2.5 text-xs text-start text-neutral-300 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <Info size={14} className="text-neutral-400" />
                  <span>{isAr ? 'لماذا أشاهد هذا الإعلان؟' : 'Why am I seeing this ad?'}</span>
                </button>
                <button
                  onClick={handleHideAd}
                  className="w-full px-4 py-2.5 text-xs text-start text-neutral-300 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                >
                  <EyeOff size={14} className="text-neutral-400" />
                  <span>{isAr ? 'إخفاء الإعلان' : 'Hide ad'}</span>
                </button>
                {onOpenReport && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenReport({ postId: ad.id, targetUserId: ad.ownerId, reason: 'spam' });
                    }}
                    className="w-full px-4 py-2.5 text-xs text-start text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                  >
                    <ShieldAlert size={14} />
                    <span>{isAr ? 'إبلاغ عن الإعلان' : 'Report ad'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Ad Copy / Text */}
      {ad.content && (
        <p dir="auto" className="text-sm text-neutral-100 leading-relaxed mb-3 bidi-plain break-words">
          {ad.content}
        </p>
      )}

      {/* 3. Media Container (Image / Video) */}
      {ad.mediaUrl && (
        <div 
          onClick={handleCtaClick}
          className="relative rounded-2xl overflow-hidden border border-[#262628] bg-[#0c0c0e] mb-3 cursor-pointer group/media"
        >
          {ad.mediaType === 'video' ? (
            <div className="relative aspect-[4/5] sm:aspect-[16/9] w-full bg-black">
              <video
                src={ad.mediaUrl}
                muted={isMuted}
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                className="absolute bottom-3 end-3 p-2 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10 hover:bg-black/90 transition-colors tap-press"
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
          ) : (
            <div className="w-full max-h-[500px] overflow-hidden bg-neutral-950 flex items-center justify-center">
              <img
                src={ad.mediaUrl}
                alt={ad.brandName}
                className="w-full h-auto object-cover max-h-[500px] group-hover/media:scale-[1.01] transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}

          {/* 4. Signature Threads Ad Bottom Banner (media_1790943254010.png) */}
          <div className="bg-[#141416]/95 backdrop-blur-md border-t border-[#262628] p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[200px]" dir="ltr">
                {displayUrl}
              </span>
              <span className="text-xs font-bold text-white group-hover/media:underline mt-0.5">
                {ctaLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold shadow-sm tap-press">
              <span>{ctaLabel}</span>
              <ExternalLink size={12} className="stroke-[2.5]" />
            </div>
          </div>
        </div>
      )}

      {/* 5. Native Threads Engagement Action Bar */}
      <div className="flex items-center gap-6 text-neutral-400 pt-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-xs tap-press transition-colors ${
            isLiked ? 'text-red-500' : 'hover:text-white'
          }`}
          title="Like"
        >
          <Heart size={18} className={isLiked ? 'fill-red-500 stroke-red-500' : ''} />
          {likesCount > 0 && <span className="text-xs font-mono">{likesCount}</span>}
        </button>

        <button
          onClick={handleCtaClick}
          className="flex items-center gap-1.5 text-xs hover:text-white tap-press transition-colors"
          title="Comment"
        >
          <MessageCircle size={18} />
          {ad.repliesCount > 0 && <span className="text-xs font-mono">{ad.repliesCount}</span>}
        </button>

        <button
          onClick={handleCtaClick}
          className="flex items-center gap-1.5 text-xs hover:text-white tap-press transition-colors"
          title="Repost"
        >
          <Repeat2 size={18} />
          {ad.repostsCount > 0 && <span className="text-xs font-mono">{ad.repostsCount}</span>}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share && ad.destinationUrl) {
              navigator.share({ title: ad.brandName, text: ad.content, url: ad.destinationUrl }).catch(() => {});
            } else {
              handleCtaClick(e);
            }
          }}
          className="flex items-center gap-1.5 text-xs hover:text-white tap-press transition-colors"
          title="Share"
        >
          <Share2 size={18} />
        </button>
      </div>
    </article>
  );
}
