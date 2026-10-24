import React from 'react';
import { ArrowRight, ArrowLeft, ShieldCheck, Lock, Eye, Database, PhoneCall, Trash2, Mail, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function PrivacyPolicyPage({ onBack }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const sections = isAr ? [
    {
      icon: Eye,
      title: '1. البيانات والمعلومات التي نقوم بجمعها',
      content: `نحن في PULSE نلتزم بأقصى درجات الشفافية والخصوصية. نقوم بجمع البيانات التالية فقط لتقديم وتطوير خدماتنا:
• بيانات التسجيل الأساسية: الاسم المعروض، اسم المستخدم الفريد (@handle)، عنوان البريد الإلكتروني، وتاريخ الميلاد للتحقق من السن القانوني (13+).
• رقم الهاتف وكود الدولة: يُستخدم لمطابقة شبكة الرواد واسترداد أمان الحساب (ولا يتم إظهاره للعامة نهائياً).
• المحتوى المنشور: النبضات الفكرية، التسجيلات الصوتية (Voice Pulses)، التعليقات، وقوائم المتابعة والتفاعلات.`
    },
    {
      icon: PhoneCall,
      title: '2. معالجة الصوت والميكروفون وجهات الاتصال',
      content: `• الميكروفون والصوت: يتم استخدام صلاحية الميكروفون فقط وحصرياً أثناء ضغطك لتسجيل نبضة صوتية حية أو عند المشاركة في مجلس صوتي (Live Space). لا نسجل أي صوت خلسة أو في الخلفية أبداً.
• ميزة مطابقة الرواد من جهات الاتصال (Contacts Sync): عند منح الإذن، يقوم التطبيق بمقارنة أرقام الهواتف المشفرة حصرياً للتعرف على أصدقائك المسجلين على المنصة. لا نقوم بتخزين أسماء دفتر هاتفك أو بيعها أو مشاركتها مع أي جهة إعلانية أو تجارية إطلاقاً.`
    },
    {
      icon: Lock,
      title: '3. خصوصية تاريخ الميلاد والبيانات الحساسة',
      content: `نوفر لك تحكماً كاملاً في ظهور تاريخ ميلادك من خلال ثلاثة مستويات صارمة:
1. عام للجميع (Public)
2. المتابعون فقط (Followers Only)
3. خاص بي فقط (Private)
لا تتم مشاركة إعدادات الخصوصية هذه مع أطراف ثالثة، وتُحترم برمجياً في كامل الشاشات.`
    },
    {
      icon: Database,
      title: '4. الأمان والتخزين السحابي المشفر',
      content: `يتم تشفير وتأمين كافة بياناتك ونبضاتك الصوتية باستخدام بروتوكولات حماية متطورة وقواعد بيانات سحابية لحظية آمنة (Realtime Cloud Sync). يتم تجديد مفاتيح الجلسة باستمرار لمنع الاختراق أو استراق البيانات عبر الشبكات العامة.`
    },
    {
      icon: Trash2,
      title: '5. حقك في حذف البيانات والحساب نهائياً',
      content: `أنت المالك الوحيد لبياناتك. يحق لك في أي وقت تعديل بياناتك الشخصية من صفحة تعديل الملف الشخصي، أو طلب الحذف الكامل والنهائي لحسابك وكافة نبضاتك الصوتية وتعليقاتك وسجلاتك من خوادم المنصة دون أي رجعة.`
    },
    {
      icon: ShieldCheck,
      title: '6. حماية الأطفال والقصّر (13+)',
      content: `خدمات PULSE غير موجهة للأطفال دون سن 13 عاماً. نقوم بحظر وإلغاء أي حساب يتم اكتشاف إنشائه بواسطة مستخدم يقل عمره عن الحد الأدنى القانوني دون إشراف ولي الأمر.`
    },
    {
      icon: Mail,
      title: '7. مسؤول حماية الخصوصية والتواصل',
      content: `إذا كان لديك أي استفسار أو طلب يتعلق بخصوصيتك أو بياناتك الشخصية، يسعدنا تواصلك المباشر مع فريق حماية البيانات عبر البريد الإلكتروني:
privacy@pulseeg.wuaze.com`
    }
  ] : [
    {
      icon: Eye,
      title: '1. Information We Collect',
      content: `We collect essential information required to deliver our audio and intellectual social platform: display name, username, email address, birth date (for 13+ age compliance), phone number, and user-generated voice pulses and posts.`
    },
    {
      icon: PhoneCall,
      title: '2. Audio, Microphone & Contacts Data',
      content: `Microphone access is strictly used only when actively recording voice pulses or speaking in live spaces. Contact syncing securely matches phone numbers against registered users; we never sell or share contact books.`
    },
    {
      icon: Lock,
      title: '3. Birthday & Sensitive Data Controls',
      content: `You maintain full granular control over your birth date visibility (Public, Followers Only, or Private).`
    },
    {
      icon: Database,
      title: '4. Security & Cloud Encryption',
      content: `All transmissions are encrypted using standard TLS/SSL security protocols and protected by cloud authentication rules.`
    },
    {
      icon: Trash2,
      title: '5. Data Erasure & Account Deletion',
      content: `You possess the right to permanently erase your profile, audio files, and interactions at any time.`
    },
    {
      icon: ShieldCheck,
      title: '6. Children’s Privacy (13+ Enforcement)',
      content: `PULSE does not permit accounts under the age of 13.`
    },
    {
      icon: Mail,
      title: '7. Contact Us',
      content: `For privacy inquiries: privacy@pulseeg.wuaze.com`
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
                {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </h1>
              <p className="text-[10px] text-neutral-500 font-mono">
                {isAr ? 'حماية بياناتك أولويتنا · سبتمبر 2026' : 'Your privacy is paramount · Sep 2026'}
              </p>
            </div>
          </div>
          <div className="p-2 rounded-full bg-white/5 border border-white/10 text-neutral-300">
            <ShieldCheck size={16} />
          </div>
        </header>

        {/* Content Body */}
        <main className="p-5 space-y-6">
          {/* Commitment Card */}
          <div className="p-4 rounded-2xl bg-[#0E0E12] border border-[#222228] flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white flex-shrink-0 mt-0.5">
              <CheckCircle size={16} />
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {isAr
                ? 'تلتزم منصة PULSE بحماية خصوصيتك وصوتك وبياناتك الشخصية طبقاً لأعلى المعايير والبروتوكولات العالمية الرسمية، ودون أي بيع للبيانات أو استغلال إعلاني متطفل.'
                : 'PULSE is committed to protecting your personal data, audio recordings, and privacy under the highest global privacy standards without selling data to advertisers.'}
            </p>
          </div>

          {/* Sections List */}
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
