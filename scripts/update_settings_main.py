with open('src/pages/SettingsPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

main_marker = "  // ==========================================\n  // MAIN SETTINGS SCREEN (1:1 with Threads Image 4)\n  // =========================================="

parts = content.split(main_marker)
if len(parts) != 2:
    print("Error: Could not split by main_marker, count =", len(parts))
    exit(1)

pre_main = parts[0] + main_marker + "\n\n"

new_main = """  const SETTINGS_ITEMS = [
    {
      id: 'invite',
      icon: UserPlus,
      title: isAr ? 'متابعة ودعوة الأصدقاء' : 'Follow and invite friends',
      onClick: () => setActiveSubView('invite')
    },
    {
      id: 'notifications',
      icon: Bell,
      title: isAr ? 'الإشعارات' : 'Notifications',
      onClick: () => setActiveSubView('notifications')
    },
    {
      id: 'saved',
      icon: Bookmark,
      title: isAr ? 'المحفوظات' : 'Saved',
      onClick: () => setActiveSubView('saved')
    },
    {
      id: 'liked',
      icon: Heart,
      title: isAr ? 'تسجيلات الإعجاب' : 'Liked',
      onClick: () => setActiveSubView('liked')
    },
    {
      id: 'archive',
      icon: History,
      title: isAr ? 'الأرشيف' : 'Archive',
      onClick: () => setActiveSubView('archive')
    },
    {
      id: 'privacy',
      icon: Lock,
      title: isAr ? 'الخصوصية' : 'Privacy',
      onClick: () => setActiveSubView('privacy')
    },
    {
      id: 'content',
      icon: SlidersHorizontal,
      title: isAr ? 'تفضيلات المحتوى' : 'Content preferences',
      onClick: () => setActiveSubView('content')
    },
    {
      id: 'status',
      icon: UserCheck,
      title: isAr ? 'حالة الحساب' : 'Account status',
      onClick: () => setActiveSubView('status')
    },
    {
      id: 'sharing',
      icon: Share2,
      title: isAr ? 'المشاركة عبر الملفات الشخصية' : 'Sharing across profiles',
      onClick: () => setActiveSubView('sharing')
    },
    {
      id: 'more',
      icon: Settings2,
      title: isAr ? 'المزيد من الإعدادات' : 'More settings',
      onClick: () => setActiveSubView('more')
    },
    {
      id: 'help',
      icon: HelpCircle,
      title: isAr ? 'المساعدة' : 'Help',
      onClick: () => setActiveSubView('help')
    },
    {
      id: 'about',
      icon: Info,
      title: isAr ? 'حول' : 'About',
      onClick: () => setActiveSubView('about')
    }
  ];

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
        
        {/* Top Header: Clean Left-Aligned Back Arrow + Settings (Exact Threads Match) */}
        <div className="sticky top-0 z-30 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-1 -ms-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"
            title={isAr ? 'رجوع' : 'Back'}
          >
            <BackIcon size={24} strokeWidth={2} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isAr ? 'الإعدادات' : 'Settings'}
          </h1>
        </div>

        {/* Settings Body: Exact Threads Layout */}
        <div className="pt-1">
          
          {/* Item 1: Accounts Center Hero Row */}
          <button
            type="button"
            onClick={() => {
              try { hapticsService.light?.(); } catch {}
              if (onOpenAccountCenter) {
                onOpenAccountCenter();
              } else {
                setActiveSubView('account_center');
              }
            }}
            className="w-full flex items-start gap-4 py-3.5 px-4 text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group mb-1"
          >
            <User size={25} strokeWidth={1.8} className="text-white flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-white leading-tight">
                {isAr ? 'مركز الحسابات' : 'Accounts Center'}
              </div>
              <p className="text-[13px] text-[#777777] font-normal leading-snug mt-1 max-w-sm">
                {isAr 
                  ? 'كلمة السر، الأمان، التفاصيل الشخصية، التجارب المتصلة، وتفضيلات الإعلانات' 
                  : 'Password, security, personal details, connected experiences, ad preferences'}
              </p>
            </div>
          </button>

          {/* Standard 12 Settings List (Exact Threads Order, No Borders, No Chevrons) */}
          <div className="space-y-0">
            {SETTINGS_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  item.onClick();
                }}
                className="w-full flex items-center gap-4 py-3.5 px-4 text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group"
              >
                <item.icon size={25} strokeWidth={1.8} className="text-white flex-shrink-0" />
                <span className="text-[15px] font-normal text-white flex-1 truncate">
                  {item.title}
                </span>
              </button>
            ))}
          </div>

          {/* Bottom Actions: Blue Action Links (Exact Threads Match) */}
          <div className="px-4 pt-6 pb-12 space-y-1">
            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setShowSwitchAccountsSheet(true);
              }}
              className="block py-2 text-start text-[15px] font-medium text-[#0095F6] hover:opacity-80 active:opacity-60 transition-opacity tap-press"
            >
              {isAr ? 'تبديل الملفات الشخصية' : 'Switch profiles'}
            </button>

            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                setShowLogoutConfirm(true);
              }}
              className="block py-2 text-start text-[15px] font-medium text-[#0095F6] hover:opacity-80 active:opacity-60 transition-opacity tap-press"
            >
              {isAr ? 'تسجيل الخروج' : 'Log out'}
            </button>
          </div>

        </div>

        {/* 1. Threads 1:1 Switch Profiles Bottom Sheet */}
        {showSwitchAccountsSheet && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade-in p-0">
            <div 
              className="bg-[#18181A] border-t border-[#2A2A2E] rounded-t-[28px] max-w-lg w-full p-5 text-start space-y-4 animate-slide-up shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {/* Drag Handle */}
              <div className="w-10 h-1 bg-neutral-600 rounded-full mx-auto" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Users size={19} className="text-white" />
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'تبديل الملفات الشخصية' : 'Switch profiles'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSwitchAccountsSheet(false)}
                  className="w-8 h-8 rounded-full bg-[#242428] text-neutral-400 hover:text-white flex items-center justify-center transition-colors tap-press"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Saved Accounts List */}
              <div className="bg-[#121214] border border-[#24242A] rounded-2xl divide-y divide-[#1C1C20] overflow-hidden max-h-64 overflow-y-auto">
                {savedAccounts && savedAccounts.length > 0 ? (
                  savedAccounts.map((acc) => {
                    const isActive = acc.uid === currentUser?.uid;
                    const unread = acc.unreadNotifications || 0;
                    return (
                      <div
                        key={acc.uid}
                        className={`flex items-center justify-between p-3.5 transition-colors ${
                          isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowSwitchAccountsSheet(false);
                            handleSwitchAccount(acc.uid, acc.username);
                          }}
                          className="flex items-center gap-3 flex-1 text-start min-w-0 tap-press"
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={acc.avatar || DEFAULT_AVATAR}
                              alt={acc.username}
                              className={`w-10 h-10 rounded-full object-cover border ${
                                isActive ? 'border-white' : 'border-[#2A2A2E]'
                              }`}
                              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                            />
                            {!isActive && unread > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#121214]">
                                {unread > 9 ? '9+' : unread}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-white truncate">
                                {acc.displayName || acc.username}
                              </span>
                              {acc.isVerified && (
                                <span className="text-[#0095F6] text-xs">✓</span>
                              )}
                            </div>
                            <span className="text-xs text-neutral-400 truncate block font-mono" dir="ltr">
                              @{acc.username}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isActive ? (
                            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-sm">
                              <Check size={14} strokeWidth={2.5} />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setShowSwitchAccountsSheet(false);
                                handleSwitchAccount(acc.uid, acc.username);
                              }}
                              className="px-3 py-1 rounded-xl bg-[#24242A] hover:bg-[#2F2F36] text-white text-xs font-semibold tap-press"
                            >
                              {isAr ? 'تبديل' : 'Switch'}
                            </button>
                          )}

                          {savedAccounts.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                try { hapticsService.light?.(); } catch {}
                                removeSavedAccount(acc.uid);
                                showToast(isAr ? `تمت إزالة @${acc.username}` : `Removed @${acc.username}`);
                              }}
                              className="p-1.5 text-neutral-500 hover:text-red-400 tap-press transition-colors"
                              title={isAr ? 'إزالة' : 'Remove'}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentUser?.avatar || DEFAULT_AVATAR}
                        alt={currentUser?.username}
                        className="w-10 h-10 rounded-full object-cover border border-white"
                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                      <div>
                        <span className="text-sm font-semibold text-white block">
                          {currentUser?.displayName || currentUser?.username}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono" dir="ltr">
                          @{currentUser?.username}
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </div>

              {/* Add Account Button */}
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.impact?.(); } catch {}
                  setShowSwitchAccountsSheet(false);
                  setAddAccountError('');
                  setShowAddAccountModal(true);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#141416] hover:bg-[#1A1A1E] border border-[#24242A] text-[#0095F6] text-sm font-semibold tap-press transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plus size={18} />
                  <span>{isAr ? 'تسجيل الدخول إلى حساب آخر' : 'Log in to another account'}</span>
                </div>
                <Chevron size={16} className="text-neutral-500" />
              </button>

              {/* Full Multi-Accounts Manager Hub Link */}
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setShowSwitchAccountsSheet(false);
                  if (onOpenAccountsManager) {
                    onOpenAccountsManager();
                  } else {
                    setActiveSubView('accounts-manager');
                  }
                }}
                className="w-full py-2 text-center text-xs text-neutral-400 hover:text-white font-medium tap-press transition-colors"
              >
                {isAr ? 'فتح مركز إدارة الحسابات والأمان المتقدم' : 'Open Multi-Accounts Hub'}
              </button>
            </div>
          </div>
        )}

        {/* 2. Add Account Modal */}
        {showAddAccountModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div 
              className="bg-[#141416] border-t sm:border border-[#24242A] rounded-t-[32px] sm:rounded-[32px] p-6 max-w-md w-full text-start space-y-4 animate-slide-up shadow-2xl"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-white" />
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'إضافة حساب إلى PULSE' : 'Add Account to PULSE'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="w-8 h-8 rounded-full bg-[#1C1C20] hover:bg-[#28282D] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={17} />
                </button>
              </div>

              <p className="text-xs text-neutral-400">
                {isAr 
                  ? 'سجّل الدخول بحساب آخر لحفظه على هذا الجهاز والتبديل بينهما بلمسة واحدة دون تسجيل الخروج.' 
                  : 'Log in with another account to switch between them instantly without logging out.'}
              </p>

              <form onSubmit={handleAddAccountSubmit} className="space-y-3 pt-1">
                {addAccountError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>{addAccountError}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}
                  </label>
                  <input
                    type="text"
                    value={addAccountIdentifier}
                    onChange={(e) => setAddAccountIdentifier(e.target.value)}
                    placeholder={isAr ? 'مثال: sovythos أو user@domain.com' : 'e.g. username or email'}
                    className="w-full bg-[#18181A] border border-[#24242A] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-colors"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showAddAccountPassword ? 'text' : 'password'}
                      value={addAccountPassword}
                      onChange={(e) => setAddAccountPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#18181A] border border-[#24242A] rounded-xl px-3.5 py-2.5 pe-10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 transition-colors"
                      dir="ltr"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddAccountPassword(!showAddAccountPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                    >
                      {showAddAccountPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={addAccountLoading || !addAccountIdentifier.trim() || !addAccountPassword}
                    className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {addAccountLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>{isAr ? 'جارٍ تسجيل الدخول...' : 'Logging in...'}</span>
                      </>
                    ) : (
                      <span>{isAr ? 'تسجيل الدخول وإضافة الحساب' : 'Log in and Add'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#18181A] border border-[#2A2A2E] rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="space-y-1.5">
                <div className="text-base font-bold text-white">
                  {isAr ? 'تسجيل الخروج؟' : 'Log out of your account?'}
                </div>
                <div className="text-xs text-neutral-400 leading-relaxed">
                  {isAr 
                    ? `هل أنت متأكد من رغبتك في تسجيل الخروج من @${currentUser?.username || 'user'}؟ يمكنك تسجيل الدخول مرة أخرى في أي وقت.` 
                    : `You can always log back in to @${currentUser?.username || 'user'} at any time.`}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2.5 rounded-xl bg-[#242428] hover:bg-[#2F2F36] text-white text-xs font-semibold tap-press transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold tap-press transition-colors"
                >
                  {isAr ? 'تسجيل الخروج' : 'Log out'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Profile QR Code Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#18181A] border border-[#2A2A2E] rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'رمز الملف الشخصي' : 'Profile QR Code'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="w-7 h-7 rounded-full bg-[#242428] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* QR Container */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-inner">
                <div className="w-48 h-48 flex items-center justify-center border-4 border-black rounded-xl p-2 relative bg-white">
                  {/* Decorative QR Pattern */}
                  <div className="w-full h-full flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-10 h-10 border-4 border-black rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-sm" />
                      </div>
                      <div className="w-10 h-10 border-4 border-black rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-sm" />
                      </div>
                    </div>
                    {/* Centered avatar in QR */}
                    <div className="w-10 h-10 rounded-full border-2 border-white shadow-md mx-auto overflow-hidden bg-black flex items-center justify-center">
                      <img
                        src={currentUser?.avatar || DEFAULT_AVATAR}
                        alt={currentUser?.username}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-10 h-10 border-4 border-black rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-sm" />
                      </div>
                      <div className="w-10 h-10 flex flex-wrap gap-1 p-1">
                        <div className="w-3 h-3 bg-black rounded-sm" />
                        <div className="w-3 h-3 bg-black rounded-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-bold text-white">
                  {currentUser?.displayName || currentUser?.username}
                </div>
                <div className="text-xs text-neutral-400 font-mono mt-0.5" dir="ltr">
                  @{currentUser?.username}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`https://pulseeg.wuaze.com/@${currentUser?.username || ''}`);
                  showToast(isAr ? 'تم نسخ الرابط' : 'Link copied');
                  setShowQrModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs tap-press hover:bg-neutral-200 transition-colors"
              >
                {isAr ? 'نسخ رابط الملف' : 'Copy Profile Link'}
              </button>
            </div>
          </div>
        )}

      </div>
    </SwipeBackWrapper>
  );
}
"""

with open('src/pages/SettingsPage.jsx', 'w', encoding='utf-8') as f:
    f.write(pre_main + new_main)

print("Step 2 complete: main settings screen rewritten to match Threads screenshot 1:1.")
