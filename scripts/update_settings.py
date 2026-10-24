import re

with open('src/pages/SettingsPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update lucide-react imports: add User and QrCode if not present
if 'User,' not in content:
    content = content.replace('UserCheck, ShieldAlert,', 'UserCheck, ShieldAlert, User, QrCode,')

# 2. Add state variables if not present
if 'showSwitchAccountsSheet' not in content:
    state_injection = """  const [showSwitchAccountsSheet, setShowSwitchAccountsSheet] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [autoShareThreads, setAutoShareThreads] = useState(() => localStorage.getItem('pulse_crossposting_enabled') === 'true');
  const [fediverseSharing, setFediverseSharing] = useState(() => localStorage.getItem('pulse_fediverse_sharing') === 'true');
"""
    content = content.replace("const [showAddAccountPassword, setShowAddAccountPassword] = useState(false);",
                              "const [showAddAccountPassword, setShowAddAccountPassword] = useState(false);\n" + state_injection)

# 3. Clean emojis in TOPIC_CHIPS
clean_topics = """    const TOPIC_CHIPS = [
      { id: 'تكنولوجيا', labelAr: 'تقنية وبرمجة', labelEn: 'Tech & Code' },
      { id: 'ذكاء_اصطناعي', labelAr: 'ذكاء اصطناعي', labelEn: 'Artificial Intelligence' },
      { id: 'فلسفة', labelAr: 'فلسفة وتأمل', labelEn: 'Philosophy & Thought' },
      { id: 'ريادة_أعمال', labelAr: 'ريادة واستثمار', labelEn: 'Startups & Business' },
      { id: 'علم_نفس', labelAr: 'علم نفس ووعي', labelEn: 'Psychology & Mindset' },
      { id: 'أدب_وقراءة', labelAr: 'أدب وقراءة', labelEn: 'Literature & Books' },
      { id: 'اقتصاد_ومال', labelAr: 'اقتصاد وأسواق', labelEn: 'Economy & Markets' },
      { id: 'تصميم_وإبداع', labelAr: 'تصميم وفنون', labelEn: 'Design & Art' },
      { id: 'علوم_وفلك', labelAr: 'علوم وفلك', labelEn: 'Science & Cosmos' },
      { id: 'سينما', labelAr: 'سينما وأفلام', labelEn: 'Cinema & Movies' },
      { id: 'رياضة', labelAr: 'رياضة ولياقة', labelEn: 'Sports & Fitness' },
      { id: 'مجالس_صوتية', labelAr: 'مجالس وبودكاست', labelEn: 'Audio & Podcasts' }
    ];"""

content = re.sub(r'const TOPIC_CHIPS = \[[\s\S]*?\];', clean_topics, content)

# 4. Enhance More settings to include Pro Studio, Supervision, and Ads
more_settings_enhancement = """            {/* Pulse Pro Studio & App Icons Shortcut */}
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
                {isAr ? 'عضوية Pulse Pro وتخصيص الأيقونات' : 'Pulse Pro Studio & App Icons'}
              </div>
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  if (onOpenVerification) onOpenVerification();
                }}
                className="w-full rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors tap-press text-start"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <span>{isAr ? 'ستوديو Pulse Pro وتخصيص المظهر' : 'Pulse Pro Studio & Appearance'}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white text-black font-mono">PRO</span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {isAr ? 'تغيير أيقونة التطبيق، شارة التوثيق، و4000 حرف' : 'Custom launcher icon, verified badge, 4,000 chars'}
                    </div>
                  </div>
                </div>
                <Chevron size={17} className="text-neutral-500" />
              </button>
            </div>

            {/* Supervision for Teen Accounts */}
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
                {isAr ? 'إشراف الحسابات والعائلة' : 'Family Supervision'}
              </div>
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('supervision');
                }}
                className="w-full rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors tap-press text-start"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {isAr ? 'مركز الإشراف العائلي وحسابات اليافعين' : 'Supervision for Teen Accounts'}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {isAr ? 'إدارة الوقت، الرقابة الأبوية، وحماية الخصوصية' : 'Screen time limits, parental guidance, and safety'}
                    </div>
                  </div>
                </div>
                <Chevron size={17} className="text-neutral-500" />
              </button>
            </div>

            {/* Ads and Campaigns Manager */}
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
                {isAr ? 'إدارة الإعلانات والحملات' : 'Ads & Sponsored Campaigns'}
              </div>
              <button
                type="button"
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  if (onOpenAdsManager) {
                    onOpenAdsManager();
                  } else {
                    setActiveSubView('ads');
                  }
                }}
                className="w-full rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors tap-press text-start"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                    <Megaphone size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {isAr ? 'لوحة إدارة الإعلانات والحملات' : 'Ads Manager & Campaigns'}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {isAr ? 'إنشاء حملات ممولة وتتبع الميزانية والمشاهدات' : 'Create sponsored posts, manage budget and impressions'}
                    </div>
                  </div>
                </div>
                <Chevron size={17} className="text-neutral-500" />
              </button>
            </div>
"""

# Inject enhancement into More settings before cache
if '{/* Cache and Storage */}' in content and 'Pulse Pro Studio & Appearance' not in content:
    content = content.replace('{/* Cache and Storage */}', more_settings_enhancement + '\n            {/* Cache and Storage */}')

# 5. Add Sharing across profiles subview
sharing_subview = """  // 13. Sharing across profiles Sub-Page (Threads 1:1)
  if (activeSubView === 'sharing') {
    const profileUrl = `https://pulseeg.wuaze.com/@${currentUser?.username || ''}`;
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'المشاركة عبر الملفات الشخصية' : 'Sharing across profiles')}
          <div className="p-4 space-y-6">
            
            {/* Profile Sharing Card */}
            <div className="rounded-3xl bg-[#121214] border border-[#222226] p-5 space-y-4 shadow-lg">
              <div className="flex items-center gap-3.5">
                <img
                  src={currentUser?.avatar || DEFAULT_AVATAR}
                  alt={currentUser?.username}
                  className="w-12 h-12 rounded-full object-cover border border-[#2A2A2E]"
                  onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-white truncate">
                      {currentUser?.displayName || currentUser?.username}
                    </span>
                    {currentUser?.isVerified && (
                      <span className="text-[#0095F6] text-sm">✓</span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400 block font-mono" dir="ltr">
                    @{currentUser?.username}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#0C0C0E] border border-[#1E1E22] rounded-2xl flex items-center justify-between gap-2">
                <span className="text-xs text-neutral-300 font-mono truncate" dir="ltr">
                  {profileUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(profileUrl);
                    showToast(isAr ? 'تم نسخ رابط ملفك الشخصي' : 'Profile link copied to clipboard');
                  }}
                  className="p-1.5 text-neutral-400 hover:text-white tap-press transition-colors"
                  title={isAr ? 'نسخ الرابط' : 'Copy link'}
                >
                  <Copy size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleShareApp}
                  className="py-3 px-4 rounded-xl bg-white text-black font-semibold text-xs tap-press hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  <span>{isAr ? 'مشاركة الملف' : 'Share profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="py-3 px-4 rounded-xl bg-[#202024] text-white font-semibold text-xs border border-white/5 tap-press hover:bg-[#2A2A30] transition-all flex items-center justify-center gap-2"
                >
                  <QrCode size={16} />
                  <span>{isAr ? 'رمز QR' : 'QR code'}</span>
                </button>
              </div>
            </div>

            {/* Auto-sharing */}
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
                {isAr ? 'المشاركة التلقائية' : 'Auto-sharing'}
              </div>
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isAr ? 'مشاركة النبضات تلقائياً' : 'Auto-share threads'}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {isAr ? 'مشاركة النبضات الجديدة عبر الملفات المتصلة' : 'Share new threads to connected profiles'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !autoShareThreads;
                    setAutoShareThreads(next);
                    localStorage.setItem('pulse_crossposting_enabled', String(next));
                    showToast(next ? (isAr ? 'تم تفعيل المشاركة التلقائية' : 'Auto-share enabled') : (isAr ? 'تم إيقاف المشاركة التلقائية' : 'Auto-share disabled'));
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative tap-press ${autoShareThreads ? 'bg-white' : 'bg-neutral-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${autoShareThreads ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Fediverse Integration */}
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 px-1">
                {isAr ? 'شبكة فيديفيرس (Fediverse)' : 'Fediverse sharing'}
              </div>
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {isAr ? 'المشاركة في فيديفيرس' : 'Fediverse integration'}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed max-w-xs">
                    {isAr 
                      ? 'السماح للمستخدمين في خوادم فيديفيرس بمتابعتك ومشاهدة نبضاتك والتفاعل معها' 
                      : 'Allow people on other fediverse servers to follow you and view your threads'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !fediverseSharing;
                    setFediverseSharing(next);
                    localStorage.setItem('pulse_fediverse_sharing', String(next));
                    showToast(next ? (isAr ? 'تم تفعيل مشاركة فيديفيرس' : 'Fediverse sharing enabled') : (isAr ? 'تم تعطيل مشاركة فيديفيرس' : 'Fediverse sharing disabled'));
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative tap-press ${fediverseSharing ? 'bg-white' : 'bg-neutral-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-black transition-transform absolute top-0.5 ${fediverseSharing ? 'translate-x-5.5 start-0.5' : 'start-0.5'}`} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </SwipeBackWrapper>
    );
  }
"""

if 'if (activeSubView === \'sharing\')' not in content:
    content = content.replace("  // 12. Follow and Invite Sub-Page", sharing_subview + "\n  // 12. Follow and Invite Sub-Page")

with open('src/pages/SettingsPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 1 complete: imports, state, topics, and sharing subview saved.")
