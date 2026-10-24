import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Radio, Mic } from 'lucide-react';
import { spaceService } from '../services/spaceService';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export default function CreateSpaceModal({ isOpen, onClose, currentUser, onSpaceCreated }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();

  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  const TOPICS = [
    { id: 'thought', ar: 'فكر وفلسفة', en: 'Thought & Philosophy' },
    { id: 'ai', ar: 'ذكاء اصطناعي', en: 'Artificial Intelligence' },
    { id: 'business', ar: 'ريادة أعمال', en: 'Entrepreneurship' },
    { id: 'tech', ar: 'تقنية وبرمجة', en: 'Tech & Code' },
    { id: 'culture', ar: 'أدب وثقافة', en: 'Literature & Culture' },
    { id: 'open', ar: 'نقاش حر', en: 'Open Discussion' }
  ];

  const [title, setTitle] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('open');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const currentTopicObj = TOPICS.find((t) => t.id === selectedTopic) || TOPICS[5];

  const handleStart = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    try {
      const space = await spaceService.createSpace({
        title: title || (isAr ? 'مجلس فكري مفتوح' : 'Open live space'),
        topic: isAr ? currentTopicObj.ar : currentTopicObj.en,
        currentUser
      });
      if (onSpaceCreated) onSpaceCreated(space);
      onClose();
    } catch (err) {
      showToast(err.message || (isAr ? 'حدث خطأ أثناء إنشاء المجلس' : 'Failed to create space'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      style={backdropStyle}
      onClick={onClose}
    >
      <div 
        {...containerProps}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-[#0F0F12] border-t sm:border border-[#26262E] rounded-t-3xl sm:rounded-3xl p-6 animate-sheet-up pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-2xl relative overflow-hidden will-change-transform"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Handle Pill */}
        <div className="w-10 h-1 bg-[#3A3A40] rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing"></div>
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E1E24]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Radio size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{isAr ? 'بدء مجلس صوتي مباشر' : 'Start live space'}</h2>
              <p className="text-[11px] text-neutral-400 font-mono">PULSE Live Space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors tap-press"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleStart} className="mt-5 space-y-4">
          {/* Room Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              {isAr ? 'ما هو عنوان أو موضوع الحوار؟' : 'What is the topic of discussion?'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isAr ? 'مثال: مستقبل التقنية والذكاء الاصطناعي...' : 'e.g. The future of AI and technology...'}
              dir="auto"
              maxLength={80}
              className="w-full bg-[#18181F] border border-[#2B2B36] focus:border-white/40 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors"
            />
            <div className="flex justify-between items-center text-[10px] text-neutral-500 mt-1 px-1 font-mono">
              <span>{isAr ? 'أصوات حرة، فكر منظم' : 'Free voices, structured thoughts'}</span>
              <span>{title.length}/80</span>
            </div>
          </div>

          {/* Topic Select */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              {isAr ? 'تصنيف المجلس:' : 'Category:'}
            </label>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <button
                  type="button"
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all tap-press ${
                    selectedTopic === topic.id
                      ? 'bg-white border-white text-black font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                      : 'bg-[#18181F] border-[#2A2A35] text-neutral-400 hover:text-white hover:border-neutral-600'
                  }`}
                >
                  {isAr ? topic.ar : topic.en}
                </button>
              ))}
            </div>
          </div>

          {/* Start CTA Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 tap-press transition-all disabled:opacity-50"
            >
              <Mic size={16} />
              <span>{loading ? (isAr ? 'جاري فتح المجلس...' : 'Opening space...') : (isAr ? 'بدء المجلس الحي الآن' : 'Start live space now')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
