import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Scale, Clock, CheckCircle2, AlertCircle, 
  Send, Copy, Check, FileText, ChevronRight, MessageSquare, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { hapticsService } from '../services/hapticsService';
import { notificationService } from '../services/notificationService';
import SwipeBackWrapper from '../components/SwipeBackWrapper';
import { ref, set, get } from 'firebase/database';
import { database } from '../services/firebase';

const LOCAL_APPEALS_KEY = 'pulse_account_appeals_';

export default function AccountAppealPage({ onBack, onOpenCommunityStandards }) {
  const { currentUser } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const isAr = language === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [appeals, setAppeals] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // Form State
  const [category, setCategory] = useState('removed_content');
  const [reason, setReason] = useState('');
  const [postReference, setPostReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    {
      id: 'removed_content',
      title: isAr ? 'محتوى تمت إزالته أو مشكلة في المراسلة' : 'Removed content or messaging issue',
      desc: isAr ? 'طعن على حذف منشور أو تعليق أو تقييد في إرسال الرسائل' : 'Dispute removed post, comment, or message restrictions'
    },
    {
      id: 'feed_lowered',
      title: isAr ? 'خفض ظهور المنشورات في الخلاصة' : 'Content lowered in feed',
      desc: isAr ? 'طلب مراجعة وصول حسابك وتوزيعه في خلاصة المتابعين' : 'Review reduced feed visibility and account reach'
    },
    {
      id: 'feature_restricted',
      title: isAr ? 'تقييد ميزات أو أدوات بالحساب' : 'Restricted account features',
      desc: isAr ? 'طعن على حظر التفاعل أو البث أو إنشاء المجموعات' : 'Dispute disabled engagement or space creation features'
    },
    {
      id: 'general_standing',
      title: isAr ? 'استفسار أو طعن عام في تقييم الحساب' : 'General standing inquiry',
      desc: isAr ? 'طلب تدقيق شامل لسجل الحساب وشهادة الالتزام' : 'Comprehensive audit of account record and compliance'
    }
  ];

  // Load Appeals from LocalStorage & Firebase RTDB
  useEffect(() => {
    if (!currentUser?.uid) return;
    const storageKey = `${LOCAL_APPEALS_KEY}${currentUser.uid}`;
    
    // 1. Local cache load
    try {
      const cached = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        setAppeals(cached);
      }
    } catch {}

    // 2. Cloud RTDB sync
    try {
      const userAppealsRef = ref(database, `account_appeals/${currentUser.uid}`);
      get(userAppealsRef).then((snap) => {
        if (snap.exists()) {
          const val = snap.val();
          if (val && typeof val === 'object') {
            const list = Object.values(val).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
            setAppeals(list);
            try {
              localStorage.setItem(storageKey, JSON.stringify(list));
            } catch {}
          }
        }
      }).catch(() => {});
    } catch {}
  }, [currentUser?.uid]);

  const handleCopyCode = (code) => {
    try { hapticsService.light?.(); } catch {}
    navigator.clipboard?.writeText(code);
    setCopiedId(code);
    showToast(isAr ? 'تم نسخ رقم المرجع' : 'Reference code copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) {
      showToast(isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first', 'error');
      return;
    }

    if (reason.trim().length < 15) {
      showToast(isAr ? 'يرجى كتابة شرح كافٍ (15 حرفاً على الأقل)' : 'Please provide a detailed explanation (at least 15 chars)', 'error');
      return;
    }

    setIsSubmitting(true);
    try { hapticsService.medium?.(); } catch {}

    try {
      const nowTs = Date.now();
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      const referenceCode = `APL-${randomCode}`;
      const appealId = `appeal_${nowTs}_${randomCode}`;

      const selectedCategoryObj = categories.find((c) => c.id === category);

      const appealPayload = {
        id: appealId,
        uid: currentUser.uid,
        username: currentUser.username || 'user',
        displayName: currentUser.displayName || 'مستخدم PULSE',
        referenceCode,
        category,
        categoryTitle: selectedCategoryObj?.title || category,
        reason: reason.trim(),
        postReference: postReference.trim() || null,
        status: 'in_review', // 'in_review' | 'approved' | 'maintained'
        submittedAt: nowTs,
        updatedAt: nowTs,
        reviewNotes: isAr 
          ? 'تم استلام طلبك وتوثيق ملف الطعن بنجاح. الطلب قيد الفحص المتأني من قِبل لجنة مراجعة معايير مجتمع PULSE.' 
          : 'Appeal received and logged. Under active evaluation by the PULSE Standards Committee.'
      };

      // 1. Persist to Firebase RTDB
      await set(ref(database, `account_appeals/${currentUser.uid}/${appealId}`), appealPayload);

      // 2. Persist to LocalStorage
      const storageKey = `${LOCAL_APPEALS_KEY}${currentUser.uid}`;
      const updatedList = [appealPayload, ...appeals];
      setAppeals(updatedList);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedList));
      } catch {}

      // 3. Trigger Official In-App Notification
      try {
        notificationService.addNotification({
          targetUserId: currentUser.uid,
          type: 'system',
          actor: {
            uid: 'system_trust_safety',
            displayName: isAr ? 'فريق مراجعة PULSE' : 'PULSE Review Team',
            username: 'pulse_safety',
            avatar: null,
            isVerified: true
          },
          text: isAr 
            ? `تم استلام طعنك بنجاح برقم مرجعي: ${referenceCode}` 
            : `Appeal received with reference code: ${referenceCode}`,
          preview: isAr 
            ? 'طلبك قيد الفحص البشري وسيتم إخطارك بالنتيجة خلال 24 إلى 48 ساعة.' 
            : 'Your appeal is in human review. Results will be delivered within 24-48 hours.'
        });
      } catch {}

      showToast(isAr ? 'تم إرسال طلب المراجعة بنجاح' : 'Appeal submitted successfully', 'success');
      setReason('');
      setPostReference('');
      setIsSubmitting(false);
      setActiveTab('history');

    } catch (err) {
      console.warn('Submit appeal error:', err);
      setIsSubmitting(false);
      showToast(isAr ? 'حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً' : 'Submission error, please try again', 'error');
    }
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto flex flex-col font-sans">
        
        {/* Navigation Header */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-[#18181A] px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                try { hapticsService.light?.(); } catch {}
                onBack();
              }}
              className="p-1.5 -ml-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 tap-press transition-colors"
              aria-label={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={20} />
            </button>
            <h1 className="text-base font-bold text-white tracking-tight">
              {isAr ? 'طلب مراجعة الحساب والطعون' : 'Account Review & Appeals'}
            </h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
            <Scale size={16} />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-3 pb-2 border-b border-[#18181A] flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              try { hapticsService.light?.(); } catch {}
              setActiveTab('submit');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all tap-press ${
              activeTab === 'submit'
                ? 'bg-white text-black'
                : 'bg-[#121214] border border-[#222226] text-neutral-400 hover:text-white'
            }`}
          >
            {isAr ? 'تقديم طلب مراجعة' : 'Submit Appeal'}
          </button>

          <button
            type="button"
            onClick={() => {
              try { hapticsService.light?.(); } catch {}
              setActiveTab('history');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all tap-press flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-black'
                : 'bg-[#121214] border border-[#222226] text-neutral-400 hover:text-white'
            }`}
          >
            <span>{isAr ? 'سجل المراجعات والطعون' : 'Appeal History'}</span>
            {appeals.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'history' ? 'bg-black text-white' : 'bg-white/10 text-white'
              }`}>
                {appeals.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-6 flex-1">

          {/* TAB 1: SUBMIT APPEAL FORM */}
          {activeTab === 'submit' && (
            <form onSubmit={handleSubmitAppeal} className="space-y-5 animate-fadeIn">
              
              {/* Informational Guidance Box */}
              <div className="p-4 rounded-2xl bg-[#121214] border border-[#222226] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <CheckCircle2 size={15} />
                  <span>{isAr ? 'ضمان العدالة والمراجعة البشرية المحايدة' : 'Fairness Guarantee & Human Review'}</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {isAr 
                    ? 'ندرك تماماً أن أنظمة الرصد الآلي قد تخطئ أحياناً في فهم سياق الكلمات أو المقاصد. إذا كنت تعتقد أن إجراءً ما اتُخذ بحق حسابك عن طريق الخطأ، يحق لك طلب إعادة فحص يدوي دقيق من فريق مستقل.'
                    : 'We understand automated moderation may misinterpret context. If an action was taken on your account in error, you have the right to a rigorous human review.'}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onOpenCommunityStandards}
                    className="text-[11px] text-neutral-300 hover:text-white underline font-semibold tap-press"
                  >
                    {isAr ? 'مراجعة بنود وسياسات معايير المجتمع قبل تقديم الطعن.' : 'Review Community Standards policies before submitting.'}
                  </button>
                </div>
              </div>

              {/* Step 1: Decision Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-neutral-300 block">
                  {isAr ? '1. اختر الإجراء الذي ترغب في الطعن عليه:' : '1. Select the action you wish to dispute:'}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {categories.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          try { hapticsService.light?.(); } catch {}
                          setCategory(cat.id);
                        }}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all tap-press ${
                          isSelected
                            ? 'bg-white/10 border-white text-white'
                            : 'bg-[#121214] border-[#222226] text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold">{cat.title}</div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-white bg-white' : 'border-neutral-600'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                          {cat.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Explanation Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-300">
                    {isAr ? '2. اشرح وجهة نظرك والسياق الواقعي بوضوح:' : '2. Explain your reasoning and context clearly:'}
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {reason.length} / 1000
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 1000))}
                  placeholder={isAr 
                    ? 'اكتب شرحاً مفصلاً لسبب اعتقادك أن القرار كان غير دقيق، وما هو السياق الحقيقي للمحتوى أو السلوك موضوع الإجراء...'
                    : 'Provide detailed context on why you believe this decision was made in error...'}
                  className="w-full bg-[#121214] border border-[#222226] focus:border-white/30 rounded-2xl p-3.5 text-xs text-white placeholder-neutral-500 outline-none leading-relaxed transition-all resize-none"
                />
              </div>

              {/* Step 3: Optional Reference Link/ID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300 block">
                  {isAr ? '3. معرّف أو رابط النبضة ذات الصلة (اختياري):' : '3. Related Post ID or Link (Optional):'}
                </label>
                <input
                  type="text"
                  value={postReference}
                  onChange={(e) => setPostReference(e.target.value)}
                  placeholder={isAr ? 'مثال: post_178982... أو رابط النبضة' : 'e.g. post_178982... or URL'}
                  className="w-full bg-[#121214] border border-[#222226] focus:border-white/30 rounded-2xl py-3 px-3.5 text-xs text-white placeholder-neutral-500 outline-none transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || reason.trim().length < 15}
                  className={`w-full py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all tap-press ${
                    isSubmitting || reason.trim().length < 15
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  <Send size={15} />
                  <span>
                    {isSubmitting 
                      ? (isAr ? 'جارٍ تسجيل طلب المراجعة...' : 'Submitting appeal...') 
                      : (isAr ? 'إرسال طلب المراجعة الرسمي' : 'Submit Official Appeal')}
                  </span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: APPEALS HISTORY & TRACKER */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              {appeals.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                    <Scale size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isAr ? 'لا توجد طلبات مراجعة مسجلة' : 'No appeals recorded'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                    {isAr 
                      ? 'سجل حسابك نظيف بالكامل. إذا واجهت أي قيد في المستقبل يمكنك تقديم طلب مراجعة وسيتم تتبع مساره هنا خطوة بخطوة.'
                      : 'Your record is completely clean. If an enforcement occurs in the future, your appeal tracking will appear here.'}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('submit')}
                      className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press"
                    >
                      {isAr ? 'تقديم طلب جديد' : 'Submit New Appeal'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                    <span>{isAr ? 'الطلبات المسجلة' : 'Submitted Appeals'}</span>
                    <span>{appeals.length} {isAr ? 'طلب' : 'records'}</span>
                  </div>

                  {appeals.map((app) => {
                    const isInReview = app.status === 'in_review';
                    const isApproved = app.status === 'approved';
                    const dateStr = new Date(app.submittedAt || Date.now()).toLocaleDateString(
                      isAr ? 'ar-EG' : 'en-US',
                      { day: 'numeric', month: 'short', year: 'numeric' }
                    );

                    return (
                      <div
                        key={app.id || app.referenceCode}
                        className="rounded-2xl bg-[#121214] border border-[#1F1F23] p-4 space-y-3"
                      >
                        {/* Top Bar: Code and Status Badge (Pure Obsidian Monochrome) */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(app.referenceCode)}
                            className="flex items-center gap-1.5 text-xs font-mono font-bold text-white hover:text-neutral-300 tap-press"
                          >
                            <span>{app.referenceCode}</span>
                            {copiedId === app.referenceCode ? (
                              <Check size={13} className="text-white" />
                            ) : (
                              <Copy size={13} className="text-neutral-500" />
                            )}
                          </button>

                          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                            isInReview 
                              ? 'bg-white/10 border border-white/20 text-neutral-200' 
                              : isApproved
                              ? 'bg-white text-black'
                              : 'bg-neutral-900 border border-neutral-800 text-neutral-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isInReview ? 'bg-neutral-300' : isApproved ? 'bg-black' : 'bg-neutral-500'
                            }`} />
                            <span>
                              {isInReview 
                                ? (isAr ? 'قيد الفحص والمراجعة' : 'In Review')
                                : isApproved
                                ? (isAr ? 'تم قبول الطعن' : 'Appeal Approved')
                                : (isAr ? 'تم استكمال الفحص' : 'Completed')}
                            </span>
                          </div>
                        </div>

                        {/* Category & Date */}
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white">
                            {app.categoryTitle || app.category}
                          </div>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                            <Clock size={12} />
                            <span>{isAr ? `تاريخ التقديم: ${dateStr}` : `Submitted on: ${dateStr}`}</span>
                          </div>
                        </div>

                        {/* 3-Step Timeline Tracker */}
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            {isAr ? 'مسار المراجعة والتدقيق:' : 'Review Timeline:'}
                          </div>
                          <div className="grid grid-cols-3 gap-1 pt-1">
                            <div className="text-center space-y-1">
                              <div className="h-1 rounded-full bg-white" />
                              <span className="text-[10px] text-neutral-300 block">
                                {isAr ? '1. توثيق الطلب' : '1. Received'}
                              </span>
                            </div>
                            <div className="text-center space-y-1">
                              <div className={`h-1 rounded-full ${isInReview ? 'bg-white' : 'bg-neutral-700'}`} />
                              <span className="text-[10px] text-neutral-300 block">
                                {isAr ? '2. الفحص البشري' : '2. In Review'}
                              </span>
                            </div>
                            <div className="text-center space-y-1">
                              <div className={`h-1 rounded-full ${isApproved ? 'bg-white' : 'bg-neutral-700'}`} />
                              <span className="text-[10px] text-neutral-400 block">
                                {isAr ? '3. القرار النهائي' : '3. Decision'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Reason Preview */}
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-xs text-neutral-300 leading-relaxed">
                          <div className="text-[10px] text-neutral-500 mb-1">
                            {isAr ? 'شرحك المقدم:' : 'Your submitted reason:'}
                          </div>
                          {app.reason}
                        </div>

                        {/* Review Team Note */}
                        <div className="pt-1 flex items-start gap-2 text-[11px] text-neutral-400">
                          <CheckCircle2 size={13} className="text-neutral-500 flex-shrink-0 mt-0.5" />
                          <span>{app.reviewNotes || (isAr ? 'طلبك مسجل لدى لجنة المراجعة.' : 'Appeal logged with the review board.')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </SwipeBackWrapper>
  );
}
