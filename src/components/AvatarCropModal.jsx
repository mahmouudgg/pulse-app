import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw,
  Move,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { hapticsService } from '../services/hapticsService';

/**
 * PULSE Full-Screen High-Precision Avatar Cropper
 * Designed to replace legacy cramped floating modals with a full-viewport,
 * distraction-free, professional editing canvas matching Threads & Instagram.
 * 
 * STRICT COMPLIANCE: ZERO EMOJIS across all code, logs, and UI strings.
 */

export default function AvatarCropModal({ isOpen, onClose, imageSrc, onCropComplete }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState(null);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      try {
        hapticsService.light?.();
      } catch {}
    }
  }, [isOpen, imageSrc]);

  // Touch and Mouse Drag / Pan Handlers
  const handlePointerDown = (e) => {
    if (e.touches && e.touches.length === 2) {
      // Pinch to zoom start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      setInitialDistance(dist);
      return;
    }

    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handlePointerMove = (e) => {
    // Handle pinch to zoom on touch
    if (e.touches && e.touches.length === 2 && initialDistance) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const diff = (currentDist - initialDistance) / 200;
      setScale((prev) => Math.min(3.5, Math.max(0.7, prev + diff)));
      setInitialDistance(currentDist);
      return;
    }

    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setInitialDistance(null);
  };

  // Wheel zoom on desktop
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => Math.min(3.5, Math.max(0.7, prev + delta)));
  };

  const handleRotate = () => {
    hapticsService.selection?.();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    hapticsService.light?.();
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // 1:1 Canvas Crop Output (High Quality 512x512)
  const handleConfirmCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    hapticsService.medium?.();

    const outputSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');

    // Fill black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Viewport diameter is 300px
    const viewportDiameter = 300;
    const factor = outputSize / viewportDiameter;

    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(position.x * factor, position.y * factor);
    ctx.scale(scale, scale);

    const naturalW = img.naturalWidth || 512;
    const naturalH = img.naturalHeight || 512;
    const minDim = Math.min(naturalW, naturalH);
    const renderW = naturalW * (viewportDiameter / minDim) * factor;
    const renderH = naturalH * (viewportDiameter / minDim) * factor;

    ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
    ctx.restore();

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedBase64);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  const fullScreenContent = (
    <div 
      className="fixed inset-0 z-[2500] bg-black text-white flex flex-col select-none animate-fade-in overflow-hidden touch-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. Top Navigation Bar */}
      <header className="h-14 px-4 border-b border-[#18181A] flex items-center justify-between bg-black/95 backdrop-blur-md z-30">
        <button
          type="button"
          onClick={() => {
            hapticsService.light?.();
            onClose();
          }}
          className="px-3 py-1.5 rounded-full text-sm font-medium text-neutral-300 hover:text-white active:bg-white/10 transition-colors"
        >
          {isAr ? 'إلغاء' : 'Cancel'}
        </button>

        <h2 className="text-base font-bold text-white tracking-tight">
          {isAr ? 'قص وتوسيط الصورة' : 'Move and Scale'}
        </h2>

        <button
          type="button"
          onClick={handleConfirmCrop}
          className="px-4 py-1.5 rounded-full bg-[#0095F6] text-white font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          {isAr ? 'تم' : 'Done'}
        </button>
      </header>

      {/* 2. Interactive Canvas Viewport */}
      <main 
        ref={containerRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
        className="flex-1 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing bg-black"
      >
        {/* The Scalable and Draggable Image */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          className="pointer-events-none select-none flex items-center justify-center"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Avatar crop target"
            draggable={false}
            className="max-w-none max-h-none object-contain pointer-events-none"
            style={{
              minWidth: '300px',
              minHeight: '300px',
              maxWidth: '85vw',
              maxHeight: '70vh'
            }}
          />
        </div>

        {/* Circular Crop Guide Mask with Darkened Vignette */}
        <div 
          className="pointer-events-none absolute w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] rounded-full border border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.78)] z-20"
        >
          {/* Subtle grid crosshairs for centering */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-full h-px bg-white/40" />
            <div className="h-full w-px bg-white/40 absolute" />
          </div>
        </div>

        {/* Center alignment guide indicator */}
        <div className="pointer-events-none absolute bottom-4 text-center z-20">
          <p className="text-xs text-neutral-400 font-medium px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-neutral-800">
            {isAr 
              ? 'اسحب بإصبعك للتحريك، أو استخدم شريط التكبير بالأسفل' 
              : 'Drag to reposition photo within circle'}
          </p>
        </div>
      </main>

      {/* 3. Bottom Control Console */}
      <footer className="bg-[#0A0A0C] border-t border-[#18181A] px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 z-30">
        {/* Zoom Slider */}
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.7, s - 0.1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:bg-white/10 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} />
          </button>

          <input
            type="range"
            min="0.7"
            max="3.5"
            step="0.02"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 accent-[#0095F6] h-1.5 bg-[#27272A] rounded-lg appearance-none cursor-pointer"
          />

          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3.5, s + 0.1))}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white active:bg-white/10 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Quick Transformation Actions */}
        <div className="flex items-center justify-center gap-3 pt-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleRotate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-xs font-semibold text-neutral-300 hover:text-white active:scale-95 transition-all"
          >
            <RotateCw size={14} className="stroke-[2.2]" />
            <span>{isAr ? 'تدوير 90°' : 'Rotate'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-xs font-semibold text-neutral-300 hover:text-white active:scale-95 transition-all"
          >
            <RotateCcw size={14} className="stroke-[2.2]" />
            <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
        </div>

        {/* Primary Confirmation Action */}
        <div className="pt-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleConfirmCrop}
            className="w-full py-3.5 rounded-2xl bg-white text-black font-extrabold text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Check size={18} className="stroke-[2.5]" />
            <span>{isAr ? 'تأكيد واستخدام الصورة' : 'Choose Photo'}</span>
          </button>
        </div>
      </footer>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(fullScreenContent, document.body) : fullScreenContent;
}
