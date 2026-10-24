import os, sys

def patch_file(file_path, old_text, new_text):
    with open(file_path, 'rb') as f:
        data = f.read()
    
    is_crlf = b'\r\n' in data
    old_bytes = old_text.replace('\r\n', '\n').encode('utf-8')
    new_bytes = new_text.replace('\r\n', '\n').encode('utf-8')
    data_norm = data.replace(b'\r\n', b'\n')
    
    if old_bytes not in data_norm:
        print(f"FAILED: old_text not found in {file_path}")
        return False
        
    data_replaced = data_norm.replace(old_bytes, new_bytes, 1)
    
    if is_crlf:
        data_final = data_replaced.replace(b'\n', b'\r\n')
    else:
        data_final = data_replaced
        
    with open(file_path, 'wb') as f:
        f.write(data_final)
        
    print(f"SUCCESS: Patched {file_path}")
    return True

# 1. PostCard.jsx
pc_path = r'src/components/PostCard.jsx'
patch_file(pc_path,
    """import { affinityEngine } from '../services/affinityEngine';""",
    """import { affinityEngine } from '../services/affinityEngine';\nimport { moderationService } from '../services/moderationService';"""
)
patch_file(pc_path,
    """  const [isSuppressed, setIsSuppressed] = useState(() => {
    return affinityEngine.isPostSuppressed(currentUserId, post);
  });""",
    """  const [isSuppressed, setIsSuppressed] = useState(() => {
    return affinityEngine.isPostSuppressed(currentUserId, post);
  });
  const [hideLikeCounts, setHideLikeCounts] = useState(() => localStorage.getItem('pulse_hide_likes_counts') === 'true');

  useEffect(() => {
    const handlePref = () => {
      setHideLikeCounts(localStorage.getItem('pulse_hide_likes_counts') === 'true');
    };
    window.addEventListener('pulse_preference_changed', handlePref);
    return () => window.removeEventListener('pulse_preference_changed', handlePref);
  }, []);"""
)
patch_file(pc_path,
    """                          {/* Mute */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              showToast(lang === 'ar' ? `تم كتم @${displayAuthor.username}` : `Muted @${displayAuthor.username}`);
                            }}""",
    """                          {/* Mute */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(false);
                              moderationService.muteUser(displayAuthor, currentUser);
                              showToast(lang === 'ar' ? `تم كتم @${displayAuthor.username}` : `Muted @${displayAuthor.username}`);
                            }}"""
)
patch_file(pc_path,
    """{likesCount > 0 && <AnimatedCounter value={likesCount} className="text-xs" />}""",
    """{!hideLikeCounts && likesCount > 0 && <AnimatedCounter value={likesCount} className="text-xs" />}"""
)
patch_file(pc_path,
    """{repostsCount > 0 && <AnimatedCounter value={repostsCount} className="text-xs" />}""",
    """{!hideLikeCounts && repostsCount > 0 && <AnimatedCounter value={repostsCount} className="text-xs" />}"""
)

# 2. PostDetailPage.jsx
pd_path = r'src/pages/PostDetailPage.jsx'
patch_file(pd_path,
    """  const [comments, setComments] = useState([]);""",
    """  const [comments, setComments] = useState([]);
  const [hideLikeCounts, setHideLikeCounts] = useState(() => localStorage.getItem('pulse_hide_likes_counts') === 'true');

  useEffect(() => {
    const handlePref = () => {
      setHideLikeCounts(localStorage.getItem('pulse_hide_likes_counts') === 'true');
    };
    window.addEventListener('pulse_preference_changed', handlePref);
    return () => window.removeEventListener('pulse_preference_changed', handlePref);
  }, []);"""
)
patch_file(pd_path,
    """              <AnimatedCounter value={localLikesCount} className="text-xs font-semibold" />""",
    """              {!hideLikeCounts && <AnimatedCounter value={localLikesCount} className="text-xs font-semibold" />}"""
)
patch_file(pd_path,
    """              <AnimatedCounter value={localRepostsCount} className="text-xs font-semibold" />""",
    """              {!hideLikeCounts && <AnimatedCounter value={localRepostsCount} className="text-xs font-semibold" />}"""
)
patch_file(pd_path,
    """              <AnimatedCounter value={Number(post.sharesCount) || 0} className="text-xs font-semibold" />""",
    """              {!hideLikeCounts && <AnimatedCounter value={Number(post.sharesCount) || 0} className="text-xs font-semibold" />}"""
)

# 3. SettingsPage.jsx
sp_path = r'src/pages/SettingsPage.jsx'

# Add icons
patch_file(sp_path,
    """  Film, Languages, Compass""",
    """  Film, Languages, Compass, BellOff, FileX, HeartOff, ImageOff, Landmark"""
)

# Add states
patch_file(sp_path,
    """  // Content preferences
  const [contentFilters, setContentFilters] = useState(() => storageService.getContentFilters(currentUser));
  const [newKeyword, setNewKeyword] = useState('');
  const [sensitiveLevel, setSensitiveLevel] = useState(() => localStorage.getItem('pulse_sensitive_level') || 'standard'); // 'standard' | 'less' | 'more'
  const [autoFilterOffensive, setAutoFilterOffensive] = useState(() => localStorage.getItem('pulse_autofilter_offensive') !== 'false');
  const [limitPolitical, setLimitPolitical] = useState(() => localStorage.getItem('pulse_limit_political') !== 'false');""",
    """  // Content preferences
  const [contentFilters, setContentFilters] = useState(() => storageService.getContentFilters(currentUser));
  const [newKeyword, setNewKeyword] = useState('');
  const [sensitiveLevel, setSensitiveLevel] = useState(() => moderationService.getSensitiveLevel());
  const [autoFilterOffensive, setAutoFilterOffensive] = useState(() => localStorage.getItem('pulse_autofilter_offensive') !== 'false');
  const [limitPolitical, setLimitPolitical] = useState(() => moderationService.getPoliticalLimit());
  const [hideLikesCounts, setHideLikesCounts] = useState(() => moderationService.getHideLikeCounts());
  const [mutedUsersList, setMutedUsersList] = useState(() => moderationService.getMutedUsers(currentUser?.uid));
  const [hiddenWordsList, setHiddenWordsList] = useState(() => moderationService.getHiddenWords(currentUser?.uid));

  useEffect(() => {
    const handlePrefChange = () => {
      setSensitiveLevel(moderationService.getSensitiveLevel());
      setLimitPolitical(moderationService.getPoliticalLimit());
      setHideLikesCounts(moderationService.getHideLikeCounts());
      setMutedUsersList(moderationService.getMutedUsers(currentUser?.uid));
      setHiddenWordsList(moderationService.getHiddenWords(currentUser?.uid));
    };
    window.addEventListener('pulse_preference_changed', handlePrefChange);
    return () => window.removeEventListener('pulse_preference_changed', handlePrefChange);
  }, [currentUser?.uid]);"""
)

# Update renderSubHeader signature
patch_file(sp_path,
    """  // Helper for Top Sub-Page Header
  const renderSubHeader = (title) => (
    <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            try { hapticsService.light?.(); } catch {}
            setActiveSubView(null);
          }}""",
    """  // Helper for Top Sub-Page Header
  const renderSubHeader = (title, customBackAction = null) => (
    <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#18181A] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            try { hapticsService.light?.(); } catch {}
            if (typeof customBackAction === 'function') {
              customBackAction();
            } else {
              setActiveSubView(null);
            }
          }}"""
)

# Read SettingsPage and replace the content block
with open(sp_path, 'r', encoding='utf-8') as f:
    sp_text = f.read()

sp_norm = sp_text.replace('\r\n', '\n')
start_marker = "  // 6. Content Preferences Sub-Page\n  if (activeSubView === 'content') {"
end_marker = "  // 7. Account Status Sub-Page\n  if (activeSubView === 'status') {"

if start_marker in sp_norm and end_marker in sp_norm:
    start_idx = sp_norm.find(start_marker)
    end_idx = sp_norm.find(end_marker)
    
    new_content_block = '''  // 6. Content Preferences Hub (Threads Exact 1:1 Matching media_1792748554929_d0ab4503.png)
  if (activeSubView === 'content') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'تفضيلات المحتوى' : 'Content preferences')}
          <div className="p-4">
            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
              {/* 1. Muted */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('content_muted');
                }}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <VolumeX size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-semibold text-white">
                    {isAr ? 'الحسابات المكتومة' : 'Muted'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-500" />
              </div>

              {/* 2. Hidden Words */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('content_hidden_words');
                }}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <FileX size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-semibold text-white">
                    {isAr ? 'الكلمات المخفية' : 'Hidden Words'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-500" />
              </div>

              {/* 3. Hide like and share counts */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('content_hide_likes');
                }}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <HeartOff size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-semibold text-white">
                    {isAr ? 'إخفاء أعداد تسجيلات الإعجاب والمشاركات' : 'Hide like and share counts'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-500" />
              </div>

              {/* 4. Sensitive content */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('content_sensitive');
                }}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <ImageOff size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-semibold text-white">
                    {isAr ? 'المحتوى الحساس' : 'Sensitive content'}
                  </span>
                </div>
                <Chevron size={18} className="text-neutral-500" />
              </div>

              {/* 5. Political content */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('content_political');
                }}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <Landmark size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-semibold text-white">
                    {isAr ? 'المحتوى السياسي' : 'Political content'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400 text-sm">
                  <span>{limitPolitical ? (isAr ? 'الحد' : 'Limit') : (isAr ? 'اقتراح' : 'Suggest')}</span>
                  <Chevron size={18} className="text-neutral-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 6.1 Sensitive Content Sub-Screen (Threads Exact 1:1 Matching media_1792748513774_aeaccd4e.png)
  if (activeSubView === 'content_sensitive') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('content')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'المحتوى الحساس' : 'Sensitive content', () => setActiveSubView('content'))}
          <div className="p-4 space-y-6">
            {/* Top Notice */}
            <p className="text-xs text-neutral-400 leading-relaxed px-1">
              {isAr 
                ? 'سيتم عرض المحتوى الحساس من الملفات الشخصية التي تتابعها في خلاصتك مثل أي محتوى آخر يشاركونه.' 
                : 'Sensitive content from profiles you follow will be shown in your feed like any other content they share.'}
            </p>

            {/* Section Header & Subtitle */}
            <div className="space-y-1.5 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'ما تراه من الملفات الشخصية التي لا تتابعها' : "What you see from profiles you don't follow"}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'المحتوى الحساس لا يخالف إرشادات مجتمعنا، ولكنه يشير إلى موضوعات قد لا يرغب بعض الأشخاص في رؤيتها.' 
                  : "Sensitive content doesn't go against our Community Standards, but refers to topics some people may not want to see."}
              </p>
            </div>

            {/* 3 Radio Options */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
              {[
                {
                  id: 'less',
                  title: isAr ? 'أقل' : 'Less',
                  desc: isAr ? 'قد ترى محتوى حساساً أقل.' : 'You might see less sensitive content.'
                },
                {
                  id: 'standard',
                  title: isAr ? 'قياسي' : 'Standard',
                  desc: isAr ? 'قد ترى بعض المحتوى الحساس.' : 'You might see some sensitive content.'
                },
                {
                  id: 'more',
                  title: isAr ? 'المزيد' : 'More',
                  desc: isAr ? 'قد ترى المزيد من المحتوى الحساس.' : 'You might see more sensitive content.'
                }
              ].map((option) => {
                const isSelected = sensitiveLevel === option.id;
                return (
                  <div
                    key={option.id}
                    onClick={() => {
                      try { hapticsService.selection?.(); } catch {}
                      setSensitiveLevel(option.id);
                      moderationService.setSensitiveLevel(option.id);
                      showToast(isAr ? `تم ضبط المحتوى الحساس: ${option.title}` : `Sensitive content: ${option.title}`);
                    }}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
                  >
                    <div className="pr-3">
                      <div className="text-sm font-semibold text-white">{option.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{option.desc}</div>
                    </div>
                    {/* Threads Custom Radio Circle */}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                      isSelected ? 'border-white bg-transparent' : 'border-neutral-600 bg-transparent'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 6.2 Hidden Words Sub-Screen (Active filtering of custom keywords + Offensive Shield)
  if (activeSubView === 'content_hidden_words') {
    const SUGGESTED_HIDDEN = isAr 
      ? ['إعلان', 'سبام', 'متابعة', 'تداول', 'عملات', 'فوركس']
      : ['crypto', 'forex', 'spam', 'follow me', 'giveaway', 'ad'];

    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('content')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'الكلمات المخفية' : 'Hidden Words', () => setActiveSubView('content'))}
          <div className="p-4 space-y-6">
            <p className="text-xs text-neutral-400 leading-relaxed px-1">
              {isAr 
                ? 'سيتم حجب أي نبضات أو ردود أو تعليقات تحتوي على هذه الكلمات أو العبارات تلقائياً من خلاصتك وإشعاراتك.' 
                : 'Pulses, replies, and comments containing these words or phrases will be hidden automatically from your feed.'}
            </p>

            {/* Custom Words Card */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 space-y-4">
              <div className="text-sm font-semibold text-white">
                {isAr ? 'إضافة كلمات وعبارات مخصصة' : 'Add custom words and phrases'}
              </div>

              {/* Form Input */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newKeyword.trim()) return;
                  const word = newKeyword.trim().toLowerCase();
                  moderationService.addHiddenWord(word);
                  setHiddenWordsList(moderationService.getHiddenWords());
                  setNewKeyword('');
                  showToast(isAr ? `تمت إضافة "${word}" إلى الكلمات المخفية` : `Added "${word}" to hidden words`);
                }} 
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder={isAr ? 'أدخل كلمة أو عبارة لحجبها...' : 'Add word or phrase to hide...'}
                  className="flex-1 bg-black border border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newKeyword.trim()}
                  className="px-4 py-2.5 bg-white text-black text-xs font-bold rounded-xl hover:bg-neutral-200 disabled:opacity-30 tap-press transition-all flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>{isAr ? 'إضافة' : 'Add'}</span>
                </button>
              </form>

              {/* Active Words Tags Cloud */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-medium text-neutral-400">
                  {isAr ? `الكلمات المحجوبة حالياً (${hiddenWordsList.length}):` : `Active hidden words (${hiddenWordsList.length}):`}
                </div>
                <div className="flex flex-wrap gap-2">
                  {hiddenWordsList.length > 0 ? (
                    hiddenWordsList.map((word) => (
                      <span 
                        key={word} 
                        className="px-3 py-1.5 rounded-full bg-[#1C1C20] border border-[#2C2C32] text-xs text-white flex items-center gap-2"
                      >
                        <span>{word}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            moderationService.removeHiddenWord(word);
                            setHiddenWordsList(moderationService.getHiddenWords());
                            showToast(isAr ? `تمت إزالة "${word}"` : `Removed "${word}"`);
                          }}
                          className="hover:text-red-400 tap-press text-neutral-400 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500 py-1">
                      {isAr ? 'لم تقم بإضافة أي كلمات مخصصة بعد.' : 'No custom hidden words added yet.'}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick suggestions chips */}
              <div className="border-t border-[#1C1C20] pt-3 space-y-2">
                <span className="text-[11px] text-neutral-500 font-medium">
                  {isAr ? 'اقتراحات سريعة للحجب الشائع:' : 'Quick hide suggestions:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_HIDDEN.map((sug) => {
                    const isAdded = hiddenWordsList.includes(sug.toLowerCase());
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            moderationService.removeHiddenWord(sug.toLowerCase());
                            setHiddenWordsList(moderationService.getHiddenWords());
                          } else {
                            moderationService.addHiddenWord(sug.toLowerCase());
                            setHiddenWordsList(moderationService.getHiddenWords());
                            showToast(isAr ? `تمت إضافة "${sug}" للحجب` : `Added "${sug}" to blacklist`);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors tap-press ${
                          isAdded 
                            ? 'bg-white/15 text-white border border-white/30' 
                            : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-[#26262A]'
                        }`}
                      >
                        {isAdded ? `- ${sug}` : `+ ${sug}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Offensive Language & Slurs Shield Card */}
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div className="pr-3">
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'الحجب التلقائي للألفاظ النابية والشتائم' : 'Offensive words & slurs shield'}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                  {isAr 
                    ? 'فلترة تلقائية للألفاظ المسيئة والشتائم باستخدام قاموس الحماية المدمج في منصة PULSE.' 
                    : 'Automatically filter abusive remarks and vulgarities using PULSE built-in safety dictionary.'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoFilterOffensive}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoFilterOffensive(val);
                  localStorage.setItem('pulse_autofilter_offensive', val ? 'true' : 'false');
                  window.dispatchEvent(new CustomEvent('pulse_preference_changed', { detail: { type: 'offensive', val } }));
                  showToast(val ? (isAr ? 'تم تفعيل حماية الألفاظ' : 'Offensive shield active') : (isAr ? 'تم إيقاف حماية الألفاظ' : 'Offensive shield off'));
                }}
                className="w-5 h-5 accent-white cursor-pointer flex-shrink-0 ml-3"
              />
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 6.3 Hide Like and Share Counts Sub-Screen (Active Suppression on Posts)
  if (activeSubView === 'content_hide_likes') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('content')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'إخفاء أعداد تسجيلات الإعجاب' : 'Hide like and share counts', () => setActiveSubView('content'))}
          <div className="p-4 space-y-6">
            <div className="rounded-2xl bg-[#121214] border border-[#222226] p-4 flex items-center justify-between">
              <div className="pr-3">
                <div className="text-sm font-semibold text-white">
                  {isAr ? 'إخفاء أعداد تسجيلات الإعجاب والمشاركات' : 'Hide like and share counts'}
                </div>
                <div className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {isAr 
                    ? 'في PULSE، لن ترى العدد الإجمالي لتسجيلات الإعجاب والمشاركات على المنشورات من الحسابات الأخرى. سيساعد هذا في التركيز على جودة المحتوى بدلاً من الأرقام ومقارنة التفاعل.' 
                    : 'On PULSE, you will not see the total number of likes and shares on posts from other accounts. You can also hide like counts on your own posts.'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={hideLikesCounts}
                onChange={(e) => {
                  const val = e.target.checked;
                  setHideLikesCounts(val);
                  moderationService.setHideLikeCounts(val);
                  showToast(val 
                    ? (isAr ? 'تم إخفاء أعداد الإعجابات والمشاركات' : 'Likes and shares counts hidden') 
                    : (isAr ? 'تم إظهار أعداد الإعجابات والمشاركات' : 'Likes and shares counts visible')
                  );
                }}
                className="w-5 h-5 accent-white cursor-pointer flex-shrink-0 ml-3"
              />
            </div>

            <div className="px-1 text-xs text-neutral-500 leading-relaxed">
              {isAr 
                ? 'ستظل قادراً على رؤية إحصاءات منشوراتك الخاصة في تفاصيل المنشور ولوحة التحليلات الخاصة بحسابك.' 
                : 'You can still see engagement numbers and insights on your own posts in your profile analytics.'}
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 6.4 Muted Accounts Sub-Screen (Active Feed Suppression + Unmute Action)
  if (activeSubView === 'content_muted') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('content')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'الحسابات المكتومة' : 'Muted accounts', () => setActiveSubView('content'))}
          <div className="p-4 space-y-4">
            <p className="text-xs text-neutral-400 leading-relaxed px-1">
              {isAr 
                ? 'لن تظهر نبضات أو ردود الحسابات المكتومة في خلاصتك. لن يتم إشعار هذه الحسابات بأنك قمت بكتمها.' 
                : "You won't see pulses or replies from people you've muted in your feed. They won't know they've been muted."}
            </p>

            {mutedUsersList.length === 0 ? (
              <div className="rounded-2xl bg-[#121214] border border-[#222226] p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 mx-auto">
                  <VolumeX size={22} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">
                    {isAr ? 'لا توجد حسابات مكتومة' : 'No muted accounts'}
                  </div>
                  <div className="text-xs text-neutral-500 max-w-xs mx-auto">
                    {isAr 
                      ? 'عندما تقوم بكتم شخص ما من قائمة خيارات نبضاته أو ملفه، سيظهر هنا.' 
                      : 'When you mute someone from their post options or profile, they will appear here.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
                {mutedUsersList.map((item) => {
                  const uid = typeof item === 'string' ? item : item.uid;
                  const username = typeof item === 'object' ? item.username : uid;
                  const displayName = typeof item === 'object' ? item.displayName : username;
                  const avatar = typeof item === 'object' ? item.avatar : null;
                  return (
                    <div key={uid} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <img
                          src={resolveAvatar(avatar)}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                          <div className="text-xs text-neutral-400 truncate" dir="ltr">@{username}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          moderationService.unmuteUser(uid, currentUser);
                          setMutedUsersList(moderationService.getMutedUsers(currentUser?.uid));
                          showToast(isAr ? `تم إلغاء كتم @${username}` : `Unmuted @${username}`);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-white/20 hover:border-white text-xs font-semibold text-white tap-press transition-colors flex-shrink-0"
                      >
                        {isAr ? 'إلغاء الكتم' : 'Unmute'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 6.5 Political Content Sub-Screen (Active Limiting of Political Topics)
  if (activeSubView === 'content_political') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('content')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'المحتوى السياسي' : 'Political content', () => setActiveSubView('content'))}
          <div className="p-4 space-y-6">
            <p className="text-xs text-neutral-400 leading-relaxed px-1">
              {isAr 
                ? 'يشمل المحتوى السياسي الموضوعات المتعلقة بالحكومات، الانتخابات، القوانين، والمناظرات العامة الحساسة.' 
                : 'Political content includes topics related to government, elections, legislation, and civic debate.'}
            </p>

            <div className="space-y-1.5 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'ما تراه من الملفات الشخصية التي لا تتابعها' : "What you see from profiles you don't follow"}
              </h3>
            </div>

            <div className="rounded-2xl bg-[#121214] border border-[#222226] divide-y divide-[#1C1C20] overflow-hidden">
              {[
                {
                  id: 'suggest',
                  limitVal: false,
                  title: isAr ? 'عدم الحد (اقتراح)' : "Don't limit",
                  desc: isAr ? 'قد تشاهد محتوى سياسياً في خلاصتك وترشيحات البحث.' : 'You might see political content in your feed and search suggestions.'
                },
                {
                  id: 'limit',
                  limitVal: true,
                  title: isAr ? 'الحد من المحتوى السياسي' : 'Limit',
                  desc: isAr ? 'الحد من الموضوعات السياسية من الحسابات التي لا تتابعها. ستستمر في رؤية ما يشاركه الأشخاص الذين تتابعهم.' : "Limit political content from people you don't follow. You may still see political content from accounts you follow."
                }
              ].map((opt) => {
                const isSelected = limitPolitical === opt.limitVal;
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      try { hapticsService.selection?.(); } catch {}
                      setLimitPolitical(opt.limitVal);
                      moderationService.setPoliticalLimit(opt.limitVal);
                      showToast(isAr ? `تم ضبط المحتوى السياسي: ${opt.title}` : `Political content: ${opt.title}`);
                    }}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
                  >
                    <div className="pr-3">
                      <div className="text-sm font-semibold text-white">{opt.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{opt.desc}</div>
                    </div>
                    {/* Threads Custom Radio Circle */}
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                      isSelected ? 'border-white bg-transparent' : 'border-neutral-600 bg-transparent'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }
\n\n'''
    
    sp_norm = sp_norm[:start_idx] + new_content_block + sp_norm[end_idx:]
    with open(sp_path, 'w', encoding='utf-8') as f:
        f.write(sp_norm)
    print("SUCCESS: Replaced content block in SettingsPage.jsx")
else:
    print(f"FAILED to find markers in SettingsPage.jsx: start={start_marker in sp_norm}, end={end_marker in sp_norm}")

print("ALL PATCHES APPLIED!")
