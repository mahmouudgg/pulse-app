import React from 'react';
import { ArrowRight, ArrowLeft, Shield, FileText, Scale, Lock, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function TermsOfServicePage({ onBack }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const sections = isAr ? [
    {
      icon: Scale,
      title: '1. قبول الشروط والأهلية القانونية',
      content: `من خلال إنشاء حساب أو تسجيل الدخول أو استخدام منصة PULSE ("المنصة" أو "نحن")، فإنك تقر وتوافق على الالتزام الكامل بهذه الشروط وكافة السياسات الملحقة بها. إذا كنت لا توافق على هذه الشروط، يجب عليك التوقف فوراً عن استخدام المنصة. يُشترط ألا يقل عمر المستخدم عن 13 عاماً (أو السن القانوني المطبق في بلد إقامتك) لإنشاء حساب واستخدام المنصة، ويُحظر تماماً تسجيل القُصّر دون إشراف ولي الأمر.`
    },
    {
      icon: Users,
      title: '2. حسابك وأمان بيانات الدخول',
      content: `أنت مسؤول مسؤولية كاملة عن الحفاظ على سرية بيانات تسجيل دخولك (اسم المستخدم، كلمة المرور، ورمز الهاتف)، وعن كافة الأنشطة والتفاعلات التي تتم من خلال حسابك. يجب إخطار إدارة المنصة فوراً عن أي استخدام غير مصرح به أو اختراق أمني. تملك المنصة الحق الكامل في رفض تسجيل أي اسم مستخدم مضلل، مسيء، منتحل لشخصية أخرى، أو ينتهك علامة تجارية مسجلة.`
    },
    {
      icon: FileText,
      title: '3. ملكية المحتوى وحقوق الملكية الفكرية والنبضات الصوتية',
      content: `أنت تحتفظ بكافة حقوق الملكية الفكرية الكاملة للمحتوى الذي تنشره عبر PULSE، بما في ذلك النصوص، النبضات الصوتية (Voice Pulses)، الصور، والآراء المقابلة. بنشرك للمحتوى، فإنك تمنح PULSE ترخيصاً عالمياً، غير حصري، ومجانياً لاستضافة وتخزين وعرض وتوزيع هذا المحتوى حصرياً لتشغيل وتطوير المنصة. يُحظر عليك نشر أو تسجيل أي محتوى صوتي أو نصي ينتهك حقوق النشر أو براءات الاختراع أو الأسرار التجارية لأي طرف ثالث.`
    },
    {
      icon: AlertTriangle,
      title: '4. السلوكيات المحظورة ومعايير المجتمع الفكري',
      content: `صُممت PULSE لتكون مجتمعاً راقياً للحوار العقلاني الرصين. يُحظر حظراً باتاً استخدام المنصة للقيام بأي مما يلي:
• نشر أو ترويج خطاب الكراهية، التحريض على العنف، الإرهاب، أو التمييز القائم على العرق أو الدين أو الجنس.
• التحرش، المضايقة، الابتزاز، أو التشهير بأي عضو أو مطور أو فريق عمل.
• بث الرسائل المزعجة (Spam)، التلاعب بالخوارزميات، تشغيل بوتات غير مصرح بها، أو الهجوم على خوادم المنصة.
• نشر محتوى إباحي، مخل بالآداب، أو ينتهك القوانين والتشريعات المحلية والدولية.`
    },
    {
      icon: Shield,
      title: '5. برنامج الرواد المؤسسين والتوثيق الرسمي',
      content: `شرف الانضمام ضمن أول 10,000 رائد (Pioneer) أو الحصول على الشارة الرسمية (Verified Badge) يخضع لتقدير المنصة والامتثال الصارم للسياسات. تحتفظ إدارة PULSE بحق سحب الشارة، أو إعادة تعيين الأرقام، أو تعليق أي حساب يقوم باستغلال كود الدعوات أو تزييف الهوية بطرق احتيالية.`
    },
    {
      icon: Lock,
      title: '6. تعليق الحسابات وإنهاء الخدمة',
      content: `تحتفظ PULSE بحق تعليق الحساب (Account Suspension) أو حظره نهائياً (Permanent Ban) أو حذف أي محتوى دون سابق إنذار في حال ثبوت مخالفة هذه الشروط أو التعدي على حقوق الآخرين أو بناءً على أوامر قضائية. كما يحق للمستخدم التوقف عن استخدام الخدمة وطلب حذف حسابه وبياناته في أي وقت.`
    },
    {
      icon: CheckCircle2,
      title: '7. إخلاء المسؤولية وحدود التعويض',
      content: `يتم توفير خدمات PULSE "كما هي" (AS IS) وبحالتها الراهنة دون أي ضمانات صريحة أو ضمنية باستمرار الخدمة دون انقطاع. لا تتحمل المنصة أو مؤسسوها أي مسؤولية عن أي أضرار غير مباشرة أو فقدان للبيانات أو الأرباح الناتجة عن استخدام المنصة أو تعذر استخدامها.`
    }
  ] : [
    {
      icon: Scale,
      title: '1. Acceptance of Terms & Eligibility',
      content: `By creating an account, accessing, or using PULSE ("the Platform"), you agree to be bound by these Terms of Service and all related policies. You must be at least 13 years old to use PULSE. If you do not agree to these terms, you must discontinue use immediately.`
    },
    {
      icon: Users,
      title: '2. Account Security & Identity',
      content: `You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree not to impersonate any individual or entity or use a username that infringes upon third-party rights.`
    },
    {
      icon: FileText,
      title: '3. Intellectual Property & Voice Pulses',
      content: `You retain full intellectual property ownership of the content and voice pulses you create on PULSE. By publishing content, you grant PULSE a worldwide, royalty-free license to host, display, and distribute your content solely for the purpose of operating and enhancing the platform.`
    },
    {
      icon: AlertTriangle,
      title: '4. Prohibited Conduct',
      content: `You agree not to engage in hate speech, harassment, spamming, botting, distributing malware, or publishing content that violates intellectual property or criminal laws.`
    },
    {
      icon: Shield,
      title: '5. Pioneers Program & Verification',
      content: `Pioneers status and Verified Badges are issued subject to platform guidelines and may be revoked upon policy violations.`
    },
    {
      icon: Lock,
      title: '6. Termination of Service',
      content: `PULSE reserves the right to suspend or terminate accounts that breach these terms. Users may terminate their account and request data deletion at any time.`
    },
    {
      icon: CheckCircle2,
      title: '7. Limitation of Liability',
      content: `PULSE is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind.`
    }
  ];

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white pb-[calc(6rem+env(safe-area-inset-bottom))] max-w-xl mx-auto">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 glass-nav border-b border-[#1C1C1E] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 tap-press transition-colors"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">
                {isAr ? 'شروط الخدمة' : 'Terms of Service'}
              </h1>
              <p className="text-[10px] text-neutral-500 font-mono">
                {isAr ? 'آخر تحديث: سبتمبر 2026 · إصدار 1.0' : 'Last updated: Sep 2026 · v1.0'}
              </p>
            </div>
          </div>
          <div className="p-2 rounded-full bg-white/5 border border-white/10 text-neutral-300">
            <Scale size={16} />
          </div>
        </header>

        {/* Content Body */}
        <main className="p-5 space-y-6">
          {/* Intro Card */}
          <div className="p-4 rounded-2xl bg-[#0E0E12] border border-[#222228]">
            <p className="text-xs text-neutral-300 leading-relaxed">
              {isAr
                ? 'مرحباً بك في PULSE. تحدد هذه الوثيقة القانونية القواعد والمعايير التي تحكم استخدامك لمنصتنا الاجتماعية الفكرية والصوتية. يُرجى قراءتها بعناية لضمان تجربة آمنة وراقية للجميع.'
                : 'Welcome to PULSE. This legal document outlines the rules and standards governing your use of our intellectual audio social platform. Please review it carefully.'}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((sec, idx) => {
              const IconComp = sec.icon;
              return (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl bg-[#0A0A0C] border border-[#1A1A20] space-y-2.5 transition-all hover:border-[#2A2A35]"
                >
                  <div className="flex items-center gap-2.5 text-white">
                    <div className="p-1.5 rounded-lg bg-white/10 text-white flex-shrink-0">
                      <IconComp size={15} />
                    </div>
                    <h2 className="text-xs font-bold tracking-wide">
                      {sec.title}
                    </h2>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line pl-1 pr-1 font-sans">
                    {sec.content}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bottom Back Button */}
          <div className="pt-4">
            <button
              onClick={onBack}
              className="w-full bg-white text-black font-bold text-xs py-3.5 rounded-2xl hover:bg-neutral-200 active:scale-95 transition-all tap-press flex items-center justify-center gap-2 shadow-lg"
            >
              <span>{isAr ? 'العودة للتطبيق' : 'Back to App'}</span>
            </button>
          </div>
        </main>
      </div>
    </SwipeBackWrapper>
  );
}
