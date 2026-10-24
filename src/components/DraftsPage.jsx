import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, FileText, Trash2, Mic, BarChart2, MapPin, Image as ImageIcon,
  Video, Check, Quote
} from 'lucide-react';
import { draftService } from '../services/draftService';
import { hapticsService } from '../services/hapticsService';

function timeAgo(ts, isAr) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return isAr ? 'الآن' : 'Just now';
  if (m < 60) return isAr ? `منذ ${m} د` : `${m}m ago`;
  if (h < 24) return isAr ? `منذ ${h} س` : `${h}h ago`;
  if (d < 7) return isAr ? `منذ ${d} يوم` : `${d}d ago`;
  try {
    return new Date(ts).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-neutral-300 font-medium">
      <Icon size={11} strokeWidth={2.4} className="text-neutral-400" />
      {children}
    </span>
  );
}

export default function DraftsPage({ isOpen, onClose, uid, onSelectDraft, isAr }) {
  const [drafts, setDrafts] = useState(() => draftService.peek(uid));
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [undoState, setUndoState] = useState(null); // { drafts: Draft[] }
  const undoTimer = useRef(null);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  // Live subscription to the drafts store
  useEffect(() => {
    if (!isOpen || !uid) return undefined;
    let alive = true;
    draftService.load(uid).then((list) => { if (alive) setDrafts(list); });
    const unsub = draftService.subscribe((changedUid, list) => {
      if (changedUid === uid && alive) setDrafts(list);
    });
    return () => { alive = false; unsub(); };
  }, [isOpen, uid]);

  // Reset transient state each time the page opens
  useEffect(() => {
    if (isOpen) {
      setSelectMode(false);
      setSelected(new Set());
    } else {
      clearTimeout(undoTimer.current);
      setUndoState(null);
    }
  }, [isOpen]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const showUndo = useCallback((removed) => {
    if (!removed?.length) return;
    clearTimeout(undoTimer.current);
    setUndoState({ drafts: removed });
    undoTimer.current = setTimeout(() => setUndoState(null), 5000);
  }, []);

  const handleDeleteOne = async (e, draft) => {
    e.stopPropagation();
    hapticsService.medium?.();
    const removed = await draftService.removeMany(uid, [draft.id]);
    showUndo(removed);
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    hapticsService.medium?.();
    const removed = await draftService.removeMany(uid, Array.from(selected));
    setSelected(new Set());
    setSelectMode(false);
    showUndo(removed);
  };

  const handleUndo = async () => {
    if (!undoState) return;
    clearTimeout(undoTimer.current);
    hapticsService.light?.();
    await draftService.restore(uid, undoState.drafts);
    setUndoState(null);
  };

  const toggleSelect = (id) => {
    hapticsService.selection?.();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = drafts.length > 0 && selected.size === drafts.length;
  const toggleSelectAll = () => {
    hapticsService.selection?.();
    setSelected(allSelected ? new Set() : new Set(drafts.map((d) => d.id)));
  };

  const handleRowClick = (draft) => {
    if (selectMode) {
      toggleSelect(draft.id);
      return;
    }
    hapticsService.light?.();
    onSelectDraft?.(draft);
  };

  const title = isAr ? 'المسودات' : 'Drafts';

  const rows = useMemo(() => drafts.map((d) => {
    const m = d.media || {};
    const pollCount = (d.poll?.options || []).filter((o) => String(o || '').trim()).length;
    const thumb = m.gif || m.image || null;
    return { d, m, pollCount, thumb };
  }), [drafts]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black text-white flex flex-col animate-sheet-up"
      dir={isAr ? 'rtl' : 'ltr'}
      role="dialog"
      aria-label={title}
    >
      {/* Header */}
      <div className="pt-[max(0.75rem,env(safe-area-inset-top))] px-3 pb-3 flex items-center justify-between border-b border-[#18181A] bg-black">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-200 hover:bg-white/10 tap-press"
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <BackIcon size={22} strokeWidth={2.2} />
        </button>

        <h2 className="text-base font-bold tracking-tight">{title}</h2>

        {drafts.length > 0 ? (
          <button
            onClick={() => {
              hapticsService.selection?.();
              setSelectMode((v) => !v);
              setSelected(new Set());
            }}
            className="min-w-[56px] h-10 px-2 rounded-full text-[14px] font-semibold text-white hover:bg-white/10 tap-press"
          >
            {selectMode ? (isAr ? 'تم' : 'Done') : (isAr ? 'تحديد' : 'Select')}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar" style={{ overscrollBehavior: 'contain' }}>
        {rows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-10 text-center pb-24">
            <div className="w-16 h-16 rounded-full bg-[#111113] border border-[#222226] flex items-center justify-center mb-5">
              <FileText size={26} className="text-neutral-400" strokeWidth={1.8} />
            </div>
            <h3 className="text-[17px] font-bold text-white mb-1.5">
              {isAr ? 'لا توجد مسودات' : 'No drafts yet'}
            </h3>
            <p className="text-[13.5px] leading-relaxed text-neutral-500 max-w-[280px]">
              {isAr
                ? 'أي نبضة تتركها دون نشر تُحفظ هنا تلقائياً، لتكمل كتابتها في أي وقت.'
                : 'Any pulse you leave unpublished is saved here automatically so you can finish it anytime.'}
            </p>
          </div>
        ) : (
          <ul className="max-w-xl mx-auto">
            {rows.map(({ d, m, pollCount, thumb }) => {
              const isChecked = selected.has(d.id);
              const hasText = String(d.content || '').trim().length > 0;
              return (
                <li key={d.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowClick(d)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(d); }}
                    className="w-full px-4 py-3.5 flex items-start gap-3 border-b border-[#141416] active:bg-[#0C0C0E] cursor-pointer"
                  >
                    {selectMode && (
                      <div
                        className={`mt-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked ? 'bg-white border-white' : 'border-neutral-600'
                        }`}
                      >
                        {isChecked && <Check size={13} className="text-black" strokeWidth={3.5} />}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        dir="auto"
                        className={`text-[15px] leading-[1.55] line-clamp-3 break-words ${
                          hasText ? 'text-white' : 'text-neutral-500 italic'
                        }`}
                      >
                        {hasText ? d.content : (isAr ? 'نبضة بدون نص' : 'Pulse without text')}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {m.audio && <Chip icon={Mic}>{d.audioDuration || '0:00'}</Chip>}
                        {m.video && <Chip icon={Video}>{isAr ? 'فيديو' : 'Video'}</Chip>}
                        {m.image && !m.gif && <Chip icon={ImageIcon}>{isAr ? 'صورة' : 'Photo'}</Chip>}
                        {m.gif && <Chip icon={ImageIcon}>GIF</Chip>}
                        {pollCount > 0 && <Chip icon={BarChart2}>{isAr ? 'استطلاع' : 'Poll'}</Chip>}
                        {d.location && (
                          <Chip icon={MapPin}>
                            <span className="max-w-[110px] truncate">{d.location.name}</span>
                          </Chip>
                        )}
                        {d.quotePost && <Chip icon={Quote}>{isAr ? 'اقتباس' : 'Quote'}</Chip>}
                        {d.mediaStripped && (
                          <span className="text-[11px] text-neutral-600">
                            {isAr ? 'تعذّر حفظ الوسائط' : 'media not saved'}
                          </span>
                        )}
                      </div>

                      <div className="text-[12px] text-neutral-500 mt-2">
                        {isAr ? 'آخر تعديل ' : 'Edited '}{timeAgo(d.updatedAt, isAr)}
                      </div>
                    </div>

                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-16 rounded-xl object-cover bg-[#111113] border border-white/10 flex-shrink-0"
                      />
                    )}

                    {!selectMode && (
                      <button
                        onClick={(e) => handleDeleteOne(e, d)}
                        className="w-9 h-9 -me-1 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/10 tap-press flex-shrink-0"
                        aria-label={isAr ? 'حذف المسودة' : 'Delete draft'}
                      >
                        <Trash2 size={17} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Select-mode action bar */}
      {selectMode && (
        <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between border-t border-[#18181A] bg-black">
          <button
            onClick={toggleSelectAll}
            className="text-[14px] font-semibold text-white px-3 py-2 rounded-full hover:bg-white/10 tap-press"
          >
            {allSelected ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect all') : (isAr ? 'تحديد الكل' : 'Select all')}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selected.size === 0}
            className={`px-5 py-2 rounded-full text-[14px] font-bold tap-press transition-opacity ${
              selected.size === 0 ? 'bg-[#1E1E22] text-neutral-500 opacity-50' : 'bg-white text-black'
            }`}
          >
            {isAr ? `حذف${selected.size ? ` (${selected.size})` : ''}` : `Delete${selected.size ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      )}

      {/* Undo snackbar */}
      {undoState && (
        <div className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] px-4 flex justify-center pointer-events-none animate-sheet-up">
          <div className="pointer-events-auto w-full max-w-md bg-[#1C1C1E] border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
            <span className="text-[13.5px] text-neutral-200">
              {isAr
                ? (undoState.drafts.length > 1 ? `تم حذف ${undoState.drafts.length} مسودات` : 'تم حذف المسودة')
                : (undoState.drafts.length > 1 ? `${undoState.drafts.length} drafts deleted` : 'Draft deleted')}
            </span>
            <button onClick={handleUndo} className="text-[13.5px] font-bold text-white px-2 py-1 tap-press">
              {isAr ? 'تراجع' : 'Undo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
