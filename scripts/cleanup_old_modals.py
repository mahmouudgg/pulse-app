import os

file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "pages", "SettingsPage.jsx"))

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove the old bottom sheet modal
modal_target = """                {/* Community Standards Bottom Sheet Modal */}
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
      )}"""

# 2. Remove obsolete mock appeal submit handler
handler_target = """  const handleSubmitAppeal = (e) => {
    e.preventDefault();
    if (!appealText.trim()) return;
    setAppealSubmitting(true);
    hapticsService.success?.();
    setTimeout(() => {
      setAppealSubmitting(false);
      setShowAppealModal(false);
      setAppealText('');
      showToast(isAr ? 'تم استلام التماسك بنجاح، وسيقوم فريق مراجعة الحسابات بفحصه.' : 'Appeal submitted successfully to the review team.', 'success');
    }, 900);
  };"""

text_norm = text.replace("\r\n", "\n")
modal_target_norm = modal_target.replace("\r\n", "\n")
handler_target_norm = handler_target.replace("\r\n", "\n")

if modal_target_norm in text_norm:
    text_norm = text_norm.replace(modal_target_norm, "")
    print("Obsolete modal removed successfully")
else:
    print("Modal target not found")

if handler_target_norm in text_norm:
    text_norm = text_norm.replace(handler_target_norm, "")
    print("Obsolete handler removed successfully")
else:
    print("Handler target not found")

with open(file_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text_norm.replace("\n", "\r\n"))

print("Clean-up finished!")
