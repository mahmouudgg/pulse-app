import React, { useState, useRef } from 'react';
import { Home, Search, Plus, Heart, User, Download, LogIn } from 'lucide-react';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import PulseLogo from './PulseLogo';

export default function Navbar({ 
  activeTab, 
  onTabChange, 
  onOpenCompose, 
  hasUnreadNotifications = false,
  currentUserAvatar = null,
  currentUser = null,
  hasOtherAccountUnread = false,
  onOpenAccountSwitcher = null,
  onOpenAuth = null
}) {
  const [clickedTab, setClickedTab] = useState(null);
  const pressTimerRef = useRef(null);

  const tabs = [
    { id: 'feed', icon: Home, label: 'الرئيسية' },
    { id: 'explore', icon: Search, label: 'بحث واستكشاف' },
    { id: 'compose', isAction: true, label: 'نبضة جديدة' },
    { id: 'activity', icon: Heart, label: 'النشاط' },
    { id: 'profile', icon: User, label: 'الملف الشخصي' }
  ];

  const handleTabClick = (tabId) => {
    hapticsService.tab?.();
    setClickedTab(tabId);
    setTimeout(() => setClickedTab(null), 350);

    // If guest clicks activity, compose, or profile -> open Auth Modal
    if (!currentUser && (tabId === 'activity' || tabId === 'profile')) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (tabId === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onTabChange(tabId);
  };

  const handleComposeClick = () => {
    hapticsService.light?.();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    onOpenCompose();
  };

  const handleProfileTouchStart = () => {
    if (!onOpenAccountSwitcher || !currentUser) return;
    pressTimerRef.current = setTimeout(() => {
      try { hapticsService.medium?.(); } catch {}
      onOpenAccountSwitcher();
    }, 450);
  };

  const handleProfileTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  return (
    <>
      {/* ================= DESKTOP HEADER NAVBAR (md:flex) ================= */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-black/85 backdrop-blur-3xl border-b border-white/[0.06] px-6 py-2.5 gpu-accelerated select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo & Title */}
          <div 
            onClick={() => {
              if (activeTab === 'feed') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                onTabChange('feed');
              }
            }}
            className="flex items-center gap-3 cursor-pointer tap-press group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#121214] border border-[#242428] flex items-center justify-center group-hover:border-neutral-500 transition-colors">
              <PulseLogo size={24} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base tracking-wider font-mono">PULSE</span>
              <span className="text-[10px] text-neutral-400 font-medium">الويب المستقل</span>
            </div>
          </div>

          {/* Desktop Center Navigation Tabs (PULSE Web 1:1) */}
          <div className="flex items-center gap-2 bg-[#0C0C0E]/90 p-1.5 rounded-2xl border border-[#1C1C20] shadow-inner">
            {tabs.map((tab) => {
              if (tab.isAction) {
                return (
                  <button
                    key="desktop-compose"
                    onClick={handleComposeClick}
                    className="w-14 h-11 rounded-xl bg-[#18181C] hover:bg-[#222228] active:bg-[#2A2A32] border border-[#282830] text-white flex items-center justify-center card-press transition-all mx-1 shadow-[0_2px_12px_rgba(255,255,255,0.05)]"
                    title={tab.label}
                    aria-label={tab.label}
                  >
                    <Plus size={22} className="stroke-[2.5]" />
                  </button>
                );
              }

              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isProfile = tab.id === 'profile';

              return (
                <button
                  key={`desktop-${tab.id}`}
                  onClick={() => handleTabClick(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                  className={`px-6 py-2.5 rounded-xl transition-all relative flex items-center justify-center card-press ${
                    isActive 
                      ? 'text-white bg-white/10 shadow-sm' 
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                  }`}
                >
                  {isProfile && currentUserAvatar ? (
                    <img
                      src={currentUserAvatar}
                      alt="Profile"
                      className={`w-6 h-6 rounded-full object-cover border transition-all ${
                        isActive ? 'border-white ring-1 ring-white/40' : 'border-[#333338] opacity-80'
                      }`}
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                  ) : (
                    <Icon 
                      size={22} 
                      className={`transition-all duration-200 ${
                        isActive 
                          ? (tab.id === 'activity' ? 'fill-white stroke-white' : 'stroke-[2.5]') 
                          : 'stroke-[1.8]'
                      }`} 
                    />
                  )}

                  {/* Red Dot Notification Badge */}
                  {tab.id === 'activity' && hasUnreadNotifications && !isActive && (
                    <span className="absolute top-2 right-4 rtl:left-4 rtl:right-auto w-1.5 h-1.5 rounded-full bg-white ring-2 ring-black pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop Left Controls: APK Download & Auth Status */}
          <div className="flex items-center gap-3">
            <a
              href="/Pulse-v1.0.apk"
              download
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all tap-press shadow-sm"
              title="تحميل تطبيق الأندرويد الرسمي"
            >
              <Download size={15} className="text-white" />
              <span>تحميل التطبيق</span>
            </a>

            {!currentUser ? (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all tap-press shadow-sm"
              >
                <LogIn size={15} />
                <span>تسجيل الدخول</span>
              </button>
            ) : (
              <button
                onClick={onOpenAccountSwitcher}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-[#222226] transition-colors"
                title="تبديل الحساب أو إدارته"
              >
                <img
                  src={currentUser.avatar || DEFAULT_AVATAR}
                  alt={currentUser.displayName}
                  className="w-8 h-8 rounded-full object-cover border border-[#333338]"
                  onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                />
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* ================= MOBILE BOTTOM NAVBAR (md:hidden) ================= */}
      <nav className="fixed bottom-0 md:hidden left-0 right-0 z-40 bg-black/85 backdrop-blur-3xl border-t border-white/[0.06] px-6 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] gpu-accelerated select-none">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {tabs.map((tab) => {
            if (tab.isAction) {
              return (
                <button
                  key="mobile-compose"
                  onClick={handleComposeClick}
                  className="w-12 h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-90 border border-white/[0.1] text-white flex items-center justify-center tap-press transition-all mx-1 shadow-[0_2px_12px_rgba(255,255,255,0.06)]"
                  aria-label="New Post"
                >
                  <Plus size={20} className="stroke-[2.5]" />
                </button>
              );
            }

            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isPopping = clickedTab === tab.id;
            const isProfile = tab.id === 'profile';

            return (
              <button
                key={`mobile-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                onTouchStart={isProfile ? handleProfileTouchStart : undefined}
                onTouchEnd={isProfile ? handleProfileTouchEnd : undefined}
                onTouchMove={isProfile ? handleProfileTouchEnd : undefined}
                onContextMenu={isProfile ? (e) => {
                  e.preventDefault();
                  if (onOpenAccountSwitcher && currentUser) {
                    try { hapticsService.medium?.(); } catch {}
                    onOpenAccountSwitcher();
                  }
                } : undefined}
                className={`p-3 rounded-2xl transition-colors relative flex flex-col items-center justify-center card-press ${
                  isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                aria-label={tab.label}
              >
                <div className={isPopping ? 'animate-tab-pop' : ''}>
                  {isProfile && currentUserAvatar ? (
                    <div className="relative">
                      <img
                        src={currentUserAvatar}
                        alt="Profile"
                        className={`w-6 h-6 rounded-full object-cover border transition-all ${
                          isActive ? 'border-white ring-1 ring-white/40' : 'border-[#333338] opacity-75'
                        }`}
                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      {hasOtherAccountUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white ring-2 ring-black pointer-events-none" />
                      )}
                    </div>
                  ) : (
                    <Icon 
                      size={24} 
                      className={`transition-all duration-200 ${
                        isActive 
                          ? (tab.id === 'activity' ? 'fill-white stroke-white' : 'stroke-[2.5]') 
                          : 'stroke-[1.75]'
                      }`} 
                    />
                  )}
                </div>

                {/* PULSE Official Red Dot Notification Badge over Activity Heart SVG */}
                {tab.id === 'activity' && hasUnreadNotifications && !isActive && (
                  <span className="absolute top-2.5 right-2.5 rtl:left-2.5 rtl:right-auto w-1.5 h-1.5 rounded-full bg-white ring-2 ring-black pointer-events-none" />
                )}

                {/* Sub-pixel Active Indicator Dot */}
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] animate-tab-pop" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
