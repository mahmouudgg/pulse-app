import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { moderationService } from '../services/moderationService';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';

export default function ReportModal({ isOpen, onClose, post, currentUser, onReportSubmitted }) {
  const [reason, setReason] = useState('spam');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  if (!isOpen || !post) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    moderationService.reportContent({
      postId: post.id,
      targetUserId: post.authorId || post.author?.uid || null,
      reporterId: currentUser?.uid || 'anonymous',
      reason,
      notes
    });
    if (onReportSubmitted) {
      onReportSubmitted(post.id);
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
      style={backdropStyle}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        {...containerProps}
        className="relative bg-[#0E0E0E] border-t sm:border border-[#222222] w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl animate-sheet-up will-change-transform"
      >
        {/* Top Handle Pill */}
        <div className="w-10 h-1 bg-[#3A3A40] rounded-full mx-auto mb-3 cursor-grab active:cursor-grabbing"></div>
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C1E]">
          <span className="font-bold text-sm text-white flex items-center gap-1.5 text-rose-400">
            <AlertTriangle size={16} />
            <span>الإبلاغ عن محتوى مخالف</span>
          </span>
          <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center animate-fade-in-up">
            <ShieldCheck size={36} className="text-white mx-auto mb-2" />
            <div className="text-sm font-bold text-white">تم استلام بلاغك بنجاح</div>
            <p className="text-xs text-neutral-400 mt-1">
              شكراً لمساعدتنا في الحفاظ على مجتمع Pulse نظيفاً وخالياً من السبام.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                ما هو سبب الإبلاغ؟
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'spam', label: 'إعلانات مضللة أو سبام آلي' },
                  { id: 'harassment', label: 'تنمر أو خطاب كراهية وإساءة' },
                  { id: 'misleading', label: 'معلومات مضللة أو احتيال' },
                  { id: 'inappropriate', label: 'محتوى غير لائق' }
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                      reason === item.id
                        ? 'bg-[#181818] border-white text-white font-semibold'
                        : 'bg-[#111111] border-[#222222] text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={item.id}
                      checked={reason === item.id}
                      onChange={() => setReason(item.id)}
                      className="hidden"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                تفاصيل إضافية (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="وضح ما الذي وجدته مخالفاً..."
                className="w-full bg-[#111111] text-xs text-white rounded-xl p-2.5 border border-[#222222] focus:border-white focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 rounded-full tap-press transition-colors shadow-sm"
            >
              إرسال البلاغ لفريق الإشراف
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
