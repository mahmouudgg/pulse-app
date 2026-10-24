import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function AvatarCropModal({ isOpen, onClose, imageSrc, onCropComplete }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  // Drag handlers (touch and mouse)
  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handlePointerMove = (e) => {
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
  };

  // Perform Canvas 1:1 Crop
  const handleConfirmCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const size = 280;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill background with black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Compute transform coordinates
    // Viewport box is 260px wide by 260px tall
    const viewportSize = 260;
    const factor = size / viewportSize;

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.translate(position.x * factor, position.y * factor);
    ctx.scale(scale, scale);

    const renderWidth = img.naturalWidth * (viewportSize / Math.min(img.naturalWidth, img.naturalHeight)) * factor;
    const renderHeight = img.naturalHeight * (viewportSize / Math.min(img.naturalWidth, img.naturalHeight)) * factor;

    ctx.drawImage(img, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
    ctx.restore();

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.8);
    onCropComplete(croppedBase64);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-[#0E0E0E] border border-[#262626] w-full max-w-sm rounded-3xl p-5 shadow-2xl z-10 animate-sheet-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1C1C1E]">
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white tap-press"
          >
            <X size={20} />
          </button>
          <span className="font-bold text-sm text-white">قص وتوسيط الصورة الشخصية</span>
          <div className="w-5" />
        </div>

        {/* Viewport Box with Circular Mask */}
        <div className="my-5 flex flex-col items-center justify-center">
          <div
            className="w-[260px] h-[260px] rounded-full border-2 border-white/80 overflow-hidden relative shadow-[0_0_25px_rgba(255,255,255,0.15)] bg-black cursor-grab active:cursor-grabbing touch-none flex items-center justify-center"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                maxWidth: 'none',
                minWidth: '260px',
                minHeight: '260px',
                objectFit: 'cover'
              }}
              className="pointer-events-none transition-transform duration-75"
            />
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">اسحب لتحريك الصورة، واستخدم الشريط للتكبير</p>
        </div>

        {/* Controls */}
        <div className="space-y-4 px-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScale((s) => Math.max(0.8, s - 0.1))}
              className="text-neutral-400 hover:text-white tap-press p-1"
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-white h-1 bg-[#262626] rounded-lg appearance-none cursor-pointer"
            />
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.1))}
              className="text-neutral-400 hover:text-white tap-press p-1"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
              className="text-neutral-400 hover:text-white tap-press p-1"
              title="إعادة ضبط"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-[#282828] text-neutral-300 hover:text-white font-bold text-xs tap-press transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmCrop}
              className="flex-1 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold text-xs tap-press transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              <span>تأكيد وقص الصورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
