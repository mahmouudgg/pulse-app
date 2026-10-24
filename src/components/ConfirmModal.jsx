import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Trash2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد من رغبتك في الاستمرار؟ لا يمكن التراجع عن هذا الإجراء.',
  confirmText = 'حذف نهائي',
  cancelText = 'إلغاء',
  isDestructive = true
}) {
  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="absolute inset-0" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
      />

      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#121215] border border-[#28282D] w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-sheet-up gpu-accelerated z-10 text-center"
      >
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full mx-auto mb-3.5 flex items-center justify-center border ${
          isDestructive ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white/10 border-white/20 text-white'
        }`}>
          {isDestructive ? <Trash2 size={22} /> : <AlertCircle size={22} />}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>

        {/* Message */}
        <p className="text-xs text-neutral-400 leading-relaxed mb-5 px-2">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-full border border-[#282828] text-neutral-300 hover:text-white hover:bg-[#181818] font-bold text-xs tap-press transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 rounded-full font-bold text-xs tap-press transition-colors shadow-sm ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-white hover:bg-neutral-200 text-black'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
