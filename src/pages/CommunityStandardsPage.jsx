import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, ArrowLeft, Shield, ShieldCheck, Search, X, ChevronDown, 
  ChevronUp, AlertCircle, Scale, FileText, CheckCircle2, Eye, 
  Lock, BookOpen
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { hapticsService } from '../services/hapticsService';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function CommunityStandardsPage({ onBack, onOpenAppeal }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedSection, setExpandedSection] = useState(null);

  const categories = [
    { id: 'all', label: isAr ? 'جميع المعايير' : 'All Standards' },
    { id: 'safety', label: isAr ? 'الأمان والاحترام' : 'Safety & Respect' },
    { id: 'authenticity', label: isAr ? 'النزاهة والأصالة' : 'Integrity' },
    { id: 'media', label: isAr ? 'سلامة المحتوى والوسائط' : 'Media Safety' },
    { id: 'privacy', label: isAr ? 'الخصوصية والأمان الشخصي' : 'Privacy & Data' },
    { id: 'ip', label: isAr ? 'الملكية الفكرية' : 'Intellectual Property' },
    { id: 'enforcement', label: isAr ? 'إجراءات الإنفاذ والطعون' : 'Enforcement & Appeals' },
  ];

  const standardsSections = [
    {
      id: 'respect',
      category: 'safety',
      icon: Shield,
      title: isAr ? 'الحوار الفكري الراقي ومكافحة الكراهية والتحرش' : 'Intellectual Dialogue, Anti-Harassment & Hate Speech',
      summary: isAr 
        ? 'حظر خطاب الكراهية، والتنمر، والمضايقات الشخصية، والتشهير، مع ضمان حرية النقاش الفكري الموضوعي.'
        : 'Zero tolerance for hate speech, harassment, bullying, and defamation while protecting robust intellectual debate.',
      rules: isAr ? [
        'يُحظر تماماً مهاجمة الأشخاص أو إهانتهم أو التحقير منهم على أساس العرق أو الجنسية أو الدين أو المذهب أو أي خصائص شخصية.',
        'يُمنع التهديد بالعنف المباشر أو المبطن، أو التحريض على إلحاق الأذى الجسدي أو المعنوي بأي فرد أو جماعة.',
        'النقد الفكري والسياسي والأكاديمي مسموح به ومرحب به بالكامل، بشرط التزامه بنقد الأفكار والمواقف دون توجيه شتائم أو سباب شخصي.',
        'يُحظر التحرش المستمر بالمستخدمين عبر التعليقات أو الرسائل الخاصة بعد إبداء رغبتهم الصريحة في إنهاء المحادثة.'
      ] : [
        'Direct attacks, slurs, defamation, or degradation based on race, nationality, religion, or personal traits are strictly prohibited.',
        'Threats of violence, encouragement of harm, or personal intimidation will result in immediate enforcement action.',
        'Intellectual, political, and cultural debate is welcomed as long as it critiques concepts rather than attacking individuals.',
        'Targeted harassment across comments or private messaging after clear boundaries are set is strictly banned.'
      ]
    },
    {
      id: 'authenticity',
      category: 'authenticity',
      icon: CheckCircle2,
      title: isAr ? 'النزاهة، مكافحة السبام، وأصالة الهوية' : 'Authenticity, Anti-Spam & Real Identity',
      summary: isAr 
        ? 'حظر الحسابات الزائفة، وحملات التضليل المنسقة، والإغراق بالمنشورات، والاحتيال المالي.'
        : 'Strict prohibition of impersonation, coordinated inauthentic behavior, spamming, and financial fraud.',
      rules: isAr ? [
        'يُحظر انتحال صفة أي شخصية عامة، مؤسسة، أو مستخدم آخر بهدف التضليل، السخرية المسيئة، أو الاحتيال.',
        'يُمنع استخدام برمجيات آلية غير مصرح بها أو مزارع نقرات لتوليد تفاعل زائف أو التلاعب بترتيب المنشورات وقائمة المواضيع الشائعة.',
        'يُحظر نشر الروابط الخبيثة، أو الترويج لمخططات الاحتيال المالي والاستثمار الوهمي، أو رسائل التصيد الإلكتروني.',
        'يجب أن تعبر الحسابات الموثقة والمؤسسية عن أصحابها الحقيقيين بشفافية مطلقة دون التباس أو تضليل للمتابعين.'
      ] : [
        'Impersonating public figures, brands, or other users to mislead, deceive, or defraud is strictly prohibited.',
        'Automated bot scripts, click farms, and coordinated inauthentic engagement to manipulate trending topics are banned.',
        'Distributing phishing links, financial scams, or malicious payloads will trigger permanent device-level revocation.',
        'Official, verified, and institutional accounts must maintain full transparency and authentic representation.'
      ]
    },
    {
      id: 'media_safety',
      category: 'media',
      icon: Eye,
      title: isAr ? 'سلامة الوسائط وحماية المحتوى المرئي والصوتي' : 'Media Safety & Visual Content Integrity',
      summary: isAr 
        ? 'ضوابط نشر الصور والفيديوهات والنبضات الصوتية، وحظر المواد العنيفة الصريحة، والمشاهد الإباحية.'
        : 'Clear rules regarding uploaded imagery, video, and audio, banning graphic gore, pornography, and non-consensual media.',
      rules: isAr ? [
        'يُحظر تماماً نشر أو تداول المواد الإباحية أو المشاهد الجنسية الصريحة بجميع أشكالها وتصنيفاتها.',
        'يُمنع نشر المشاهد الدموية الصادمة أو العنف المفرط إلا في سياقات التوثيق الإخباري المعتمد مع وجوب وضع تصنيف المحتوى الحساس.',
        'يُحظر ترويج أو تصوير إيذاء النفس أو الانتحار، وتوفر المنصة مسارات دعم وقائي فوري عند رصد أي مؤشرات مقلقة.',
        'يتم تطبيق نظام حجب وتصفية ذكي للمحتوى الحساس يمنح المستخدمين حرية تخصيص تجربة التصفح وفق اختياراتهم.'
      ] : [
        'Sexually explicit material, adult pornography, and non-consensual imagery are strictly banned on PULSE.',
        'Gratuitous gore, graphic violence, and shock media are prohibited unless documented for verified journalistic integrity.',
        'Content promoting or depicting self-harm or suicide is removed, and preventative support resources are immediately provided.',
        'Sensitive content filtering provides users complete autonomy over the visual content thresholds they encounter.'
      ]
    },
    {
      id: 'privacy_protection',
      category: 'privacy',
      icon: Lock,
      title: isAr ? 'حماية الخصوصية والبيانات الشخصية ومكافحة التشهير' : 'Privacy, Personal Data Protection & Anti-Doxxing',
      summary: isAr 
        ? 'حماية سرية البيانات الشخصية، وحظر كشف وثائق أو عناوين أو أرقام الآخرين دون موافقتهم الصريحة.'
        : 'Guarding confidential personal information, strictly banning doxxing, identity document exposure, and private surveillance.',
      rules: isAr ? [
        'يُمنع منعاً باتاً نشر البيانات والمعلومات الشخصية الحساسة للآخرين كالعناوين المنزلية، أرقام الهواتف الخاصة، أو الوثائق الرسمية.',
        'يُحظر مشاركة المحادثات والرسائل الخاصة بهدف التشهير أو الابتزاز أو الإضرار المتعمد بسمعة الأطراف المشاركة.',
        'يُمنع استخدام المنصة لتعقب الأشخاص أو محاولة اختراق حساباتهم أو الاستيلاء على جلساتهم الإلكترونية.',
        'تلتزم المنصة بتشفير بيانات المستخدمين ولا تشارك بياناتك الحساسة مع أي أطراف ثالثة دون إذنك.'
      ] : [
        'Publishing private personal data (doxxing) such as home addresses, private phone numbers, or identity documents is strictly prohibited.',
        'Sharing confidential private conversations to blackmail, defame, or cause harm is prohibited.',
        'Using the platform for stalking, unauthorized surveillance, or account compromise attempts will result in immediate termination.',
        'PULSE protects user data confidentiality and never distributes sensitive credentials to third parties.'
      ]
    },
    {
      id: 'intellectual_property',
      category: 'ip',
      icon: FileText,
      title: isAr ? 'الملكية الفكرية وحقوق النشر والتأليف' : 'Intellectual Property & Copyright',
      summary: isAr 
        ? 'حماية حقوق المبدعين وصناع المحتوى، وضوابط الاقتباس العادل، وآليات إخطارات الانتهاك.'
        : 'Protecting creator copyright, fair use standards, and formal notice-and-takedown procedures.',
      rules: isAr ? [
        'يجب احترام حقوق التأليف والنشر، ويُحظر إعادة نشر أعمال الآخرين الإبداعية ونسبتها للنفس دون إذن كتابي أو إسناد صريح.',
        'يُسمح بالاقتباس النزيه للأغراض التعليمية، النقدية، أو التحليلية مع الالتزام بالإشارة الواضحة والشفافة للمصدر الأصلي.',
        'تلتزم PULSE بنظام إخطار وإزالة سريع لأي مادة منتهكة فور استلام بلاغ موثق من صاحب الحق القانوني.',
        'تكرار انتهاك حقوق الملكية الفكرية يؤدي إلى إيقاف صلاحيات النشر تدريجياً وصولاً إلى الإغلاق النهائي للحساب.'
      ] : [
        'Original creator copyright must be respected; re-uploading creative works without authorization is prohibited.',
        'Fair use for educational commentary, critique, and news reporting is permitted with transparent source attribution.',
        'PULSE maintains a fast-track notice and takedown system for verified intellectual property infringement notices.',
        'Repeated intellectual property infringements result in progressive publishing restrictions and final account closure.'
      ]
    },
    {
      id: 'enforcement_system',
      category: 'enforcement',
      icon: Scale,
      title: isAr ? 'نظام الإنفاذ، التدرج في العقوبات، وحق الطعن البشري' : 'Enforcement, Strikes & Human Appeal Rights',
      summary: isAr 
        ? 'الشفافية في معالجة البلاغات، نظام الإنذارات المتدرج، والحق الأصيل في طلب مراجعة بشرية محايدة.'
        : 'Transparent review protocols, progressive strike tiers, and the fundamental right to independent human review.',
      rules: isAr ? [
        'تعتمد PULSE على مزيج متقدم من التحليل الأمني الذكي والمراجعة البشرية المتأنية لتقييم البلاغات وضمان العدالة المطلقة.',
        'نظام التدرج في العقوبات: تنبيه إرشادي أولي -> خفض مؤقت لانتشار المحتوى في الخلاصة -> تقييد المراسلة والميزات -> تعليق الحساب.',
        'يحق لكل مستخدم تقديم طعن رسمي على أي إجراء أو تقييد، حيث يتولى فريق مستقل إعادة فحص القضية وسياقها بدقة وبشكل يدوي.',
        'إذا تبيّن أن الإجراء اتُخذ نتيجة خطأ آلي أو بلاغ كيدي غير صحيح، يُلغى القيد فوراً ويُستعاد السجل النظيف للحساب بالكامل.'
      ] : [
        'PULSE combines automated safety sentinels with independent human moderators to evaluate reports objectively.',
        'Progressive disciplinary tiers: Educational notice -> Feed distribution reduction -> Messaging restriction -> Suspension.',
        'Every user retains the universal right to formally contest any moderation decision via the official Appeals system.',
        'If an enforcement was triggered erroneously or via bad-faith reporting, it is instantly revoked with full standing restored.'
      ]
    }
  ];

  const filteredSections = useMemo(() => {
    return standardsSections.filter((sec) => {
      const matchesCategory = selectedCategory === 'all' || sec.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        sec.title.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q) ||
        sec.rules.some((r) => r.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, language]);

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
              {isAr ? 'معايير مجتمع PULSE' : 'Community Standards'}
            </h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="p-4 space-y-5">

          {/* Hero Banner */}
          <div className="p-5 rounded-3xl bg-[#121214] border border-[#222226] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <Scale size={14} className="text-white" />
              <span>{isAr ? 'الميثاق الأخلاقي وضوابط الأمان' : 'Ethical Charter & Safety Code'}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
              {isAr 
                ? 'نبني معاً مساحة رقمية راقية ترتكز على الاحترام والأصالة وحرية الفكر'
                : 'Building an authentic digital space rooted in intellectual respect'}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {isAr 
                ? 'تحدد معايير مجتمع PULSE المبادئ والقواعد الواضحة لما هو مسموح به وما هو محظور على المنصة، لحماية سلامة وخصوصية وكرامة كل عضو في مجتمعنا، وضمان بيئة فكرية حرة ونقية وخالية من التحرش والزيف.'
                : 'Our Community Standards outline what is and is not permitted on PULSE, safeguarding dignity, privacy, and integrity without stifling meaningful discourse.'}
            </p>
            <div className="pt-1 flex items-center gap-3 text-[11px] text-neutral-500 font-medium">
              <span>{isAr ? 'الإصدار المعتمد v2.1' : 'Official Version 2.1'}</span>
              <span>•</span>
              <span>{isAr ? 'مُحدّث لأكتوبر 2026' : 'Updated October 2026'}</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className={`absolute inset-y-0 ${isAr ? 'right-3.5' : 'left-3.5'} flex items-center pointer-events-none text-neutral-500`}>
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في بنود وقواعد المعايير وسياسات المجتمع...' : 'Search standards, policies and rules...'}
              className={`w-full bg-[#121214] border border-[#222226] focus:border-white/30 rounded-2xl py-3 text-xs text-white placeholder-neutral-500 outline-none transition-all ${
                isAr ? 'pr-10 pl-10' : 'pl-10 pr-10'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className={`absolute inset-y-0 ${isAr ? 'left-3' : 'right-3'} flex items-center text-neutral-500 hover:text-white`}
                aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    try { hapticsService.light?.(); } catch {}
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors tap-press ${
                    isActive 
                      ? 'bg-white text-black font-bold' 
                      : 'bg-[#121214] border border-[#222226] text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Standards Accordions */}
          <div className="space-y-3">
            {filteredSections.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <AlertCircle size={28} className="mx-auto text-neutral-600" />
                <p className="text-xs text-neutral-400">
                  {isAr ? 'لم يتم العثور على بنود تطابق بحثك الحالي' : 'No standards matched your search query'}
                </p>
              </div>
            ) : (
              filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                const isExpanded = expandedSection === sec.id;
                return (
                  <div
                    key={sec.id}
                    className="rounded-2xl bg-[#121214] border border-[#1F1F23] overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        try { hapticsService.light?.(); } catch {}
                        setExpandedSection(isExpanded ? null : sec.id);
                      }}
                      className={`w-full p-4 flex items-start justify-between gap-3 hover:bg-white/[0.02] tap-press transition-colors ${
                        isAr ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                          <IconComponent size={18} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-white leading-snug">
                            {sec.title}
                          </h3>
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {sec.summary}
                          </p>
                        </div>
                      </div>
                      <div className="text-neutral-500 pt-1 flex-shrink-0">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#1C1C20] bg-black/40 space-y-2.5 animate-fadeIn">
                        <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider pt-2">
                          {isAr ? 'القواعد والإرشادات التفصيلية:' : 'Specific Policy Rules:'}
                        </div>
                        <ul className="space-y-2 text-xs text-neutral-300 leading-relaxed pr-1">
                          {sec.rules.map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 mt-1.5" />
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Dispute & Appeal CTA Box */}
          <div className="p-4 rounded-2xl bg-[#121214] border border-[#222226] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-white">
                {isAr ? 'هل تعتقد بوجود خطأ في تطبيق أي من هذه المعايير؟' : 'Think a moderation action was a mistake?'}
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {isAr 
                  ? 'يمكنك تقديم طلب مراجعة رسمي ومتابعة حالة طعنك مع فريق الإشراف خطوة بخطوة.' 
                  : 'Submit a formal appeal and track review status with our trust & safety team.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                try { hapticsService.medium?.(); } catch {}
                if (onOpenAppeal) onOpenAppeal();
              }}
              className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-bold whitespace-nowrap hover:bg-neutral-200 tap-press transition-colors flex-shrink-0"
            >
              {isAr ? 'تقديم طعن' : 'Submit Appeal'}
            </button>
          </div>

        </div>
      </div>
    </SwipeBackWrapper>
  );
}
