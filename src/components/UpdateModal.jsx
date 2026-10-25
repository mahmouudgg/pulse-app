import React from 'react';
import { createPortal } from 'react-dom';
import { Download, X, ShieldCheck } from 'lucide-react';
import { updateService } from '../services/updateService';
import { hapticsService } from '../services/hapticsService';

export default function UpdateModal({
  updateInfo,
  onClose
}) {
  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleDownload = () => {
    hapticsService.medium();
    updateService.startDownload(updateInfo.apkUrl);
  };

  const handleDismiss = () => {
    hapticsService.light();
    if (onClose) onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-sm bg-[#0B0B0E] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-sheet-up text-white">
        
        {/* Header Icon & Close button */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
            <Download size={24} className="stroke-[2.5]" />
          </div>
          {!updateInfo.isMandatory && (
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Title and Badges */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold text-white tracking-tight">يتوفر إصدار جديد</h3>
            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
              v{updateInfo.latestVersion}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            أنت تستخدم حالياً الإصدار v{updateInfo.currentVersion}
          </p>
        </div>

        {/* Release Notes Card */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-300 font-bold">
            <ShieldCheck size={14} className="text-white" />
            <span>ما الجديد في هذا التحديث:</span>
          </div>
          <p className="text-neutral-300 leading-relaxed whitespace-pre-line text-[11.5px]">
            {updateInfo.releaseNotes}
          </p>
          <div className="pt-1 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
            <span>الحجم: {updateInfo.apkSize}</span>
            <span>بناء رسمي موثق</span>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
          <ShieldCheck size={13} className="text-neutral-300" />
          <span>تحديث أمان واستقرار معتمد من مجتمع PULSE</span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownload}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 tap-press"
          >
            <Download size={16} />
            <span>تحديث الآن (تحميل وتثبيت)</span>
          </button>

          {!updateInfo.isMandatory && (
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              تذكيري لاحقاً
            </button>
          )}
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
