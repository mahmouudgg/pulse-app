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

# =====================================================================
# 1. Update moderationService.js
# =====================================================================
mod_path = r'src/services/moderationService.js'

mod_old = """      return true;
    });
  }
};"""

mod_new = """      return true;
    });
  },

  // 9. Real Account Standing & Moderation Health Check
  getAccountStanding(currentUser = null) {
    const defaultStanding = {
      isGoodStanding: true,
      hasRemovedContent: false,
      removedItems: [],
      isFeedLowered: false,
      feedLoweredReason: null,
      hasRestrictedFeatures: false,
      restrictedFeatures: []
    };

    if (!currentUser) return defaultStanding;

    try {
      const strikesRaw = localStorage.getItem('pulse_account_strikes');
      const strikes = strikesRaw ? JSON.parse(strikesRaw) : (currentUser.strikes || []);
      const hasStrikes = Array.isArray(strikes) && strikes.length > 0;
      const isMuted = Boolean(currentUser.isMuted);
      const isBanned = Boolean(currentUser.isBanned);
      const reachPenalty = Boolean(currentUser.reachPenalty);

      return {
        isGoodStanding: !hasStrikes && !isMuted && !isBanned && !reachPenalty,
        hasRemovedContent: hasStrikes,
        removedItems: Array.isArray(strikes) ? strikes : [],
        isFeedLowered: reachPenalty,
        feedLoweredReason: reachPenalty ? 'Algorithmic spam mitigation' : null,
        hasRestrictedFeatures: isMuted || isBanned,
        restrictedFeatures: isMuted ? ['Direct Messages'] : isBanned ? ['All Features'] : []
      };
    } catch {
      return defaultStanding;
    }
  }
};"""

patch_file(mod_path, mod_old, mod_new)

# =====================================================================
# 2. Update SettingsPage.jsx
# =====================================================================
sp_path = r'src/pages/SettingsPage.jsx'

# Add state for Community Standards modal
sp_state_old = """  // Account Status Appeal Modal State
  const [showAppealModal, setShowAppealModal] = useState(false);"""

sp_state_new = """  // Account Status State & Community Standards Modal
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showCommunityStandardsModal, setShowCommunityStandardsModal] = useState(false);
  const accountStanding = useMemo(() => moderationService.getAccountStanding(currentUser), [currentUser]);"""

patch_file(sp_path, sp_state_old, sp_state_new)

# Replace the Account Status block
with open(sp_path, 'r', encoding='utf-8') as f:
    sp_text = f.read()

sp_norm = sp_text.replace('\r\n', '\n')
start_marker = "  // 7. Account Status Sub-Page\n  if (activeSubView === 'status') {"
end_marker = "  // 8. Help Sub-Page (Report a Problem)\n  if (activeSubView === 'help') {"

if start_marker in sp_norm and end_marker in sp_norm:
    start_idx = sp_norm.find(start_marker)
    end_idx = sp_norm.find(end_marker)
    
    new_status_block = '''  // 7. Account Status Hub (Threads Exact 1:1 Matching media_1792755183631_163a2bda.png)
  if (activeSubView === 'status') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status')}
          <div className="p-4">
            
            {/* Top User Profile Card (Screenshot 1 Exact) */}
            <div className="rounded-2xl bg-[#101012] border border-[#222226] p-4 flex items-center gap-3.5 mb-6">
              <img
                src={resolveAvatar(currentUser?.avatar)}
                alt=""
                className="w-12 h-12 rounded-full object-cover border border-white/10 flex-shrink-0"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white font-mono truncate" dir="ltr">
                  @{currentUser?.username || 'user'}
                </div>
                <div className="text-xs text-neutral-400 truncate mt-0.5">
                  {currentUser?.displayName || currentUser?.username}
                </div>
              </div>
            </div>

            {/* Actions we've taken Section Title & Description */}
            <div className="space-y-1 mb-4 px-1">
              <h2 className="text-base font-bold text-white tracking-tight">
                {isAr ? 'الإجراءات التي اتخذناها' : "Actions we've taken"}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'تعرّف على أي إجراءات اتخذتها PULSE عندما لا يتبع حسابك أو محتواك معاييرنا. ' 
                  : "See any actions PULSE has taken when your account or content don't follow our standards. "}
                <button
                  type="button"
                  onClick={() => setShowCommunityStandardsModal(true)}
                  className="text-neutral-300 underline font-semibold hover:text-white tap-press"
                >
                  {isAr ? 'معرفة المزيد.' : 'Learn more.'}
                </button>
              </p>
            </div>

            {/* 3 Status Rows (Screenshot 1 Exact) */}
            <div className="divide-y divide-[#1C1C20] border-t border-b border-[#1C1C20]">
              
              {/* Row 1: Removed content and messaging issues */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('status_removed');
                }}
                className="py-4 px-1 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <span className="text-sm font-semibold text-white pr-3">
                  {isAr ? 'المحتوى الذي تمت إزالته ومشكلات المراسلة' : 'Removed content and messaging issues'}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    accountStanding.hasRemovedContent ? 'border-amber-400 text-amber-400' : 'border-white text-white'
                  }`}>
                    {accountStanding.hasRemovedContent ? (
                      <span className="text-[10px] font-bold">!</span>
                    ) : (
                      <Check size={12} strokeWidth={3} className="text-white" />
                    )}
                  </div>
                  <Chevron size={18} className="text-neutral-500" />
                </div>
              </div>

              {/* Row 2: Content lowered in feed */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('status_lowered');
                }}
                className="py-4 px-1 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <span className="text-sm font-semibold text-white pr-3">
                  {isAr ? 'المحتوى المنخفض في الخلاصة' : 'Content lowered in feed'}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    accountStanding.isFeedLowered ? 'border-amber-400 text-amber-400' : 'border-white text-white'
                  }`}>
                    {accountStanding.isFeedLowered ? (
                      <span className="text-[10px] font-bold">!</span>
                    ) : (
                      <Check size={12} strokeWidth={3} className="text-white" />
                    )}
                  </div>
                  <Chevron size={18} className="text-neutral-500" />
                </div>
              </div>

              {/* Row 3: Features you can't use */}
              <div
                onClick={() => {
                  try { hapticsService.light?.(); } catch {}
                  setActiveSubView('status_features');
                }}
                className="py-4 px-1 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <span className="text-sm font-semibold text-white pr-3">
                  {isAr ? 'الميزات التي لا يمكنك استخدامها' : "Features you can't use"}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    accountStanding.hasRestrictedFeatures ? 'border-amber-400 text-amber-400' : 'border-white text-white'
                  }`}>
                    {accountStanding.hasRestrictedFeatures ? (
                      <span className="text-[10px] font-bold">!</span>
                    ) : (
                      <Check size={12} strokeWidth={3} className="text-white" />
                    )}
                  </div>
                  <Chevron size={18} className="text-neutral-500" />
                </div>
              </div>

            </div>

            {/* Bottom Support / Appeal Link */}
            <div className="mt-8 px-1">
              <button
                type="button"
                onClick={() => setShowAppealModal(true)}
                className="text-xs text-neutral-400 hover:text-white underline tap-press transition-colors"
              >
                {isAr ? 'هل تعتقد بوجود خطأ في حالة حسابك؟ تقديم التماس.' : 'Think something was a mistake? Submit an appeal.'}
              </button>
            </div>

          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 7.1 Removed content & account access (Threads Exact 1:1 Matching media_1792755194284_fb51ca6f.png)
  if (activeSubView === 'status_removed') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('status')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status', () => setActiveSubView('status'))}
          <div className="p-4 space-y-6">
            
            {/* Big Circular Checkmark Badge */}
            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto mt-6 mb-2">
              <Check size={36} strokeWidth={2.5} className="text-white" />
            </div>

            {/* Central Headline & Subtitle */}
            <div className="text-center space-y-1.5 px-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isAr ? 'حسابك غير متأثر حالياً' : 'Your account is not affected right now'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isAr ? 'شكراً لالتزامك بمعايير مجتمعنا' : 'Thank you for following our Community Standards'}
              </p>
            </div>

            {/* What this means Section */}
            <div className="pt-6 space-y-3 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'ماذا يعني هذا' : 'What this means'}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {isAr 
                  ? 'أنت لست معرضاً لخطر فقدان الوصول إلى حسابك حالياً.' 
                  : 'You are not at risk of losing access to your account right now.'}
              </p>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'قد نظل نتخذ إجراءات بإزالة حسابك دون سابق إنذار إذا كان أي شيء تنشره يمثل خطراً أو تهديداً لمجتمع PULSE.' 
                  : 'We may still take down your account without warning if something you post is a risk to the PULSE community.'}
              </p>
            </div>

            {/* What you can do Section */}
            <div className="border-t border-[#1C1C20] pt-6 space-y-3 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'ما يمكنك فعله' : 'What you can do'}
              </h3>
              <div
                onClick={() => setShowCommunityStandardsModal(true)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <span className="text-xs text-neutral-300">
                  {isAr ? 'التعرف على معايير مجتمعنا' : 'Learn about our Community Standards'}
                </span>
                <Chevron size={18} className="text-neutral-500" />
              </div>
            </div>

          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 7.2 Content lowered in feed (Threads Exact 1:1 Matching media_1792755200688_59808c43.png)
  if (activeSubView === 'status_lowered') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('status')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status', () => setActiveSubView('status'))}
          <div className="p-4 space-y-6">
            
            {/* Big Circular Checkmark Badge */}
            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto mt-6 mb-2">
              <Check size={36} strokeWidth={2.5} className="text-white" />
            </div>

            {/* Central Headline & Subtitle */}
            <div className="text-center space-y-1.5 px-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isAr ? 'لم يتم خفض منشوراتك في الخلاصة' : 'Your posts are not lowered in feed'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isAr ? 'شكراً لالتزامك بمعايير مجتمعنا' : 'Thank you for following our Community Standards'}
              </p>
            </div>

            {/* What this means Section */}
            <div className="pt-6 space-y-3 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'ماذا يعني هذا' : 'What this means'}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {isAr 
                  ? 'لم يتم نقل محتواك إلى أسفل في خلاصات المتابعين، وتتمتع منشوراتك بترتيب وانتشار طبيعي بالكامل.' 
                  : "Your content has not been moved lower in your followers' feeds."}
              </p>
            </div>

            {/* What you can do Section */}
            <div className="border-t border-[#1C1C20] pt-6 space-y-3 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'ما يمكنك فعله' : 'What you can do'}
              </h3>
              <div
                onClick={() => setShowCommunityStandardsModal(true)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <span className="text-xs text-neutral-300">
                  {isAr ? 'التعرف على معايير مجتمعنا' : 'Learn about our Community Standards'}
                </span>
                <Chevron size={18} className="text-neutral-500" />
              </div>
            </div>

          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  // 7.3 Messaging and Features Sub-Page (Threads Exact 1:1 Matching media_1792755207779_47825220.png)
  if (activeSubView === 'status_features') {
    return (
      <SwipeBackWrapper onBack={() => setActiveSubView('status')}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
          {renderSubHeader(isAr ? 'حالة الحساب' : 'Account status', () => setActiveSubView('status'))}
          <div className="p-4 space-y-6">
            
            {/* Big Circular Checkmark Badge */}
            <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center mx-auto mt-6 mb-2">
              <Check size={36} strokeWidth={2.5} className="text-white" />
            </div>

            {/* Central Headline & Subtitle */}
            <div className="text-center space-y-1.5 px-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isAr ? 'يمكنك مراسلة الأشخاص على PULSE حالياً' : 'You can message people on PULSE right now'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isAr ? 'شكراً لالتزامك بمعايير مجتمعنا.' : 'Thank you for following our Community Standards.'}
              </p>
            </div>

            {/* What this means Section */}
            <div className="pt-6 space-y-3 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'ماذا يعني هذا' : 'What this means'}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {isAr 
                  ? 'يمكنك إرسال الرسائل والرد عليها والتفاعل معها بكامل الصلاحيات على PULSE.' 
                  : 'You can send, reply and react to messages on PULSE.'}
              </p>
            </div>

            {/* More Information Section */}
            <div className="border-t border-[#1C1C20] pt-6 space-y-3 px-1">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'مزيد من المعلومات' : 'More Information'}
              </h3>
              <div
                onClick={() => setShowCommunityStandardsModal(true)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] tap-press transition-colors"
              >
                <span className="text-xs text-neutral-300">
                  {isAr ? 'التعرف على معايير مجتمعنا' : 'Learn about our Community Standards'}
                </span>
                <Chevron size={18} className="text-neutral-500" />
              </div>
            </div>

          </div>
        </div>
      </SwipeBackWrapper>
    );
  }
\n\n'''
    
    sp_norm = sp_norm[:start_idx] + new_status_block + sp_norm[end_idx:]
    with open(sp_path, 'w', encoding='utf-8') as f:
        f.write(sp_norm)
    print("SUCCESS: Replaced Account Status blocks in SettingsPage.jsx")
else:
    print(f"FAILED to find status markers in SettingsPage.jsx: start={start_marker in sp_norm}, end={end_marker in sp_norm}")

# Add Community Standards Modal before closing of SettingsPage
sp_modal_marker = "      {/* Set App Lock PIN Modal */}"
sp_modal_insert = '''      {/* Community Standards Bottom Sheet Modal */}
      {showCommunityStandardsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end p-0">
          <div className="bg-[#121214] border-t border-[#26262A] rounded-t-3xl max-w-xl mx-auto w-full p-5 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1C1C20] pb-3">
              <h3 className="text-base font-bold text-white">
                {isAr ? 'معايير مجتمع PULSE' : 'PULSE Community Standards'}
              </h3>
              <button 
                onClick={() => setShowCommunityStandardsModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white tap-press"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-neutral-300 leading-relaxed py-1">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-white text-sm">
                  {isAr ? '1. الحوار الفكري الراقي والاحترام المتبادل' : '1. Intellectual Dialogue & Respect'}
                </div>
                <p className="text-neutral-400">
                  {isAr ? 'يُمنع منعاً باتاً خطاب الكراهية، التنمر، المضايقات الشخصية، أو إهانة المعتقدات والأفراد.' : 'Hate speech, bullying, harassment, and personal abuse are strictly prohibited on PULSE.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-white text-sm">
                  {isAr ? '2. أصالة المحتوى ومكافحة السبام' : '2. Content Authenticity & Spam Prevention'}
                </div>
                <p className="text-neutral-400">
                  {isAr ? 'يُمنع الإغراق الإعلاني، الترويج لعمليات الاحتيال، النشر المكرر الآلي، أو روابط الخداع.' : 'Automated spamming, financial scams, deceptive links, and bot flooding are strictly banned.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-white text-sm">
                  {isAr ? '3. سلامة المحتوى والملكية الفكرية' : '3. Content Safety & Integrity'}
                </div>
                <p className="text-neutral-400">
                  {isAr ? 'يُمنع نشر المحتويات العنيفة، الإباحية، أو انتهاكات حقوق التأليف والنشر غير المصرح بها.' : 'Violent imagery, adult content, and unauthorized intellectual property infringement are prohibited.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-white text-sm">
                  {isAr ? '4. أصالة الهوية والشفافية' : '4. Authentic Identity'}
                </div>
                <p className="text-neutral-400">
                  {isAr ? 'يُمنع انتحال صفة الآخرين أو إنشاء حسابات مضللة للاحتيال على أعضاء المجتمع.' : 'Impersonation and deceptive identities designed to mislead others are not permitted.'}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCommunityStandardsModal(false)}
                className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press transition-colors"
              >
                {isAr ? 'فهمت ذلك' : 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set App Lock PIN Modal */}'''

patch_file(sp_path, sp_modal_marker, sp_modal_insert)

print("ALL ACCOUNT STATUS PATCHES COMPLETE!")
