import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, RotateCw, FlipHorizontal, Crop, 
  Type, Sliders, Undo2, ZoomIn, ZoomOut, Move
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { hapticsService } from '../services/hapticsService';

const FILTERS = [
  { id: 'normal', nameAr: 'أصلي', nameEn: 'Normal', css: 'none' },
  { id: 'vivid', nameAr: 'حيوي', nameEn: 'Vivid', css: 'saturate(1.4) contrast(1.15)' },
  { id: 'noir', nameAr: 'أبيض وأسود', nameEn: 'Noir', css: 'grayscale(1) contrast(1.35) brightness(0.95)' },
  { id: 'warm', nameAr: 'دافئ', nameEn: 'Warm', css: 'sepia(0.35) saturate(1.25) contrast(1.05)' },
  { id: 'cool', nameAr: 'بارد', nameEn: 'Cool', css: 'hue-rotate(180deg) sepia(0.2) saturate(1.15) brightness(1.05)' },
  { id: 'vintage', nameAr: 'ريترو', nameEn: 'Vintage', css: 'sepia(0.45) contrast(0.92) brightness(1.08)' },
  { id: 'dramatic', nameAr: 'درامي', nameEn: 'Dramatic', css: 'contrast(1.4) brightness(0.9) saturate(1.2)' },
];

const ASPECT_RATIOS = [
  { id: 'free', labelAr: 'حر', labelEn: 'Free', ratio: null },
  { id: '1:1', labelAr: '1:1 مربع', labelEn: '1:1 Square', ratio: 1 },
  { id: '4:5', labelAr: '4:5 عمودي', labelEn: '4:5 Portrait', ratio: 4 / 5 },
  { id: '16:9', labelAr: '16:9 سينمائي', labelEn: '16:9 Wide', ratio: 16 / 9 },
];

const TEXT_COLORS = [
  { id: 'white', hex: '#FFFFFF', name: 'White' },
  { id: 'black', hex: '#000000', name: 'Black' },
  { id: 'yellow', hex: '#FFE600', name: 'Yellow' },
  { id: 'green', hex: '#25D366', name: 'Green' },
  { id: 'pink', hex: '#FF2D55', name: 'Pink' },
  { id: 'cyan', hex: '#00E5FF', name: 'Cyan' },
];

export default function ImageEditorModal({
  isOpen,
  onClose,
  imageSrc,
  imageUrl,
  onSave
}) {
  const effectiveSrc = imageSrc || imageUrl;
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState('crop'); // 'crop' | 'filters' | 'text' | 'adjust'
  
  // Crop & Transform state
  const [aspectRatio, setAspectRatio] = useState('free');
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('normal');

  // Text overlay state
  const [overlayText, setOverlayText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textBgStyle, setTextBgStyle] = useState('pill'); // 'none' | 'pill' | 'solid'
  const [textSize, setTextSize] = useState(24);
  const [textPosPercent, setTextPosPercent] = useState(50); // 15% top, 50% center, 85% bottom

  // Canvas & Image refs
  const sourceImgRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAspectRatio('free');
      setRotation(0);
      setFlipH(false);
      setScale(1);
      setPan({ x: 0, y: 0 });
      setSelectedFilter('normal');
      setOverlayText('');
      setActiveTab('crop');
    }
  }, [isOpen, effectiveSrc]);

  if (!isOpen || !effectiveSrc) return null;

  const currentFilterObj = FILTERS.find((f) => f.id === selectedFilter) || FILTERS[0];

  // Rotate 90 deg clockwise
  const handleRotate = () => {
    hapticsService.light();
    setRotation((prev) => (prev + 90) % 360);
  };

  // Flip horizontal
  const handleFlipH = () => {
    hapticsService.light();
    setFlipH((prev) => !prev);
  };

  // Pan gesture handlers
  const handlePointerDown = (e) => {
    setIsPanning(true);
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    panStartRef.current = { x: clientX - pan.x, y: clientY - pan.y };
  };

  const handlePointerMove = (e) => {
    if (!isPanning) return;
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setPan({
      x: clientX - panStartRef.current.x,
      y: clientY - panStartRef.current.y
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  // Export edited composite image via Canvas
  const handleSave = async () => {
    hapticsService.medium();
    setIsProcessing(true);

    try {
      const loadImg = (src, useCors = true) => {
        return new Promise((resolve, reject) => {
          const imageObj = new Image();
          if (useCors && !src.startsWith('data:')) {
            imageObj.crossOrigin = 'anonymous';
          }
          imageObj.onload = () => resolve(imageObj);
          imageObj.onerror = () => {
            if (useCors) {
              loadImg(src, false).then(resolve).catch(reject);
            } else {
              reject(new Error('Failed to load image'));
            }
          };
          imageObj.src = src;
        });
      };

      const img = await loadImg(effectiveSrc);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const isQuarterTurn = rotation === 90 || rotation === 270;
      const naturalWidth = isQuarterTurn ? img.naturalHeight : img.naturalWidth;
      const naturalHeight = isQuarterTurn ? img.naturalWidth : img.naturalHeight;

      // Handle Aspect Ratio Cropping
      const selectedRatioObj = ASPECT_RATIOS.find((r) => r.id === aspectRatio);
      let targetWidth = naturalWidth;
      let targetHeight = naturalHeight;

      if (selectedRatioObj && selectedRatioObj.ratio) {
        const targetRatio = selectedRatioObj.ratio;
        const currentRatio = naturalWidth / naturalHeight;

        if (currentRatio > targetRatio) {
          targetWidth = naturalHeight * targetRatio;
        } else {
          targetHeight = naturalWidth / targetRatio;
        }
      }

      // Cap max dimension for optimal performance & crisp resolution
      const maxDim = 1600;
      const resizeScale = Math.min(1, maxDim / Math.max(targetWidth, targetHeight));
      canvas.width = Math.round(targetWidth * resizeScale);
      canvas.height = Math.round(targetHeight * resizeScale);

      // Fill canvas with pure AMOLED black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply CSS Filter onto Canvas Context
      if (currentFilterObj.css && currentFilterObj.css !== 'none') {
        ctx.filter = currentFilterObj.css;
      }

      // Draw transformed image
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      if (flipH) ctx.scale(-1, 1);

      const renderScale = resizeScale * scale;
      const drawW = img.naturalWidth * renderScale;
      const drawH = img.naturalHeight * renderScale;

      ctx.drawImage(
        img,
        -drawW / 2 + (pan.x * resizeScale),
        -drawH / 2 + (pan.y * resizeScale),
        drawW,
        drawH
      );
      ctx.restore();

      // Reset filter for text drawing
      ctx.filter = 'none';

      // Draw Text Overlay if present
      if (overlayText.trim()) {
        const textToDraw = overlayText.trim();
        const scaledFontSize = Math.round((textSize / 320) * canvas.width * 1.3);
        ctx.font = `bold ${scaledFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textMetrics = ctx.measureText(textToDraw);
        const textWidth = textMetrics.width;
        const textHeight = scaledFontSize * 1.2;

        const posX = canvas.width / 2;
        const posY = (canvas.height * textPosPercent) / 100;

        // Draw background pill
        if (textBgStyle === 'pill') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          const padX = scaledFontSize * 0.7;
          const padY = scaledFontSize * 0.4;
          const pillRadius = (textHeight + padY) / 2;

          ctx.beginPath();
          ctx.roundRect(
            posX - textWidth / 2 - padX,
            posY - textHeight / 2 - padY / 2,
            textWidth + padX * 2,
            textHeight + padY,
            pillRadius
          );
          ctx.fill();
        } else if (textBgStyle === 'solid') {
          ctx.fillStyle = textColor === '#FFFFFF' ? '#000000' : '#FFFFFF';
          const padX = scaledFontSize * 0.6;
          const padY = scaledFontSize * 0.35;
          ctx.fillRect(
            posX - textWidth / 2 - padX,
            posY - textHeight / 2 - padY / 2,
            textWidth + padX * 2,
            textHeight + padY
          );
        }

        // Text shadow for legibility
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = textColor;
        ctx.fillText(textToDraw, posX, posY);
        ctx.shadowBlur = 0;
      }

      const finalBase64 = canvas.toDataURL('image/jpeg', 0.88);
      onSave(finalBase64);
      onClose();
    } catch (err) {
      console.error('Failed to export edited image', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 w-screen h-[100dvh] max-h-screen z-[9999] bg-black text-white flex flex-col select-none overflow-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Header Bar */}
      <div className="pt-[max(0.75rem,env(safe-area-inset-top))] px-4 pb-3 flex items-center justify-between border-b border-neutral-900 bg-black/90 backdrop-blur-md z-30">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center tap-press transition-colors"
          title={isAr ? 'إلغاء' : 'Cancel'}
        >
          <X size={19} />
        </button>

        <span className="font-bold text-sm tracking-wide">
          {isAr ? 'تعديل الصورة' : 'Edit photo'}
        </span>

        <button
          onClick={handleSave}
          disabled={isProcessing}
          className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs tracking-wide hover:bg-neutral-200 tap-press transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-lg"
        >
          <Check size={14} className="stroke-[3]" />
          <span>{isAr ? 'تم' : 'Done'}</span>
        </button>
      </div>

      {/* Main Preview Center Area */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden bg-black p-3 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Aspect Ratio Guide Box */}
        <div 
          className="relative max-w-full max-h-[72vh] flex items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-2xl transition-all duration-300"
          style={{
            aspectRatio: aspectRatio === 'free' ? 'auto' : aspectRatio.replace(':', '/'),
            width: aspectRatio === 'free' ? 'auto' : '88vw',
            maxHeight: '68vh'
          }}
        >
          {/* Rule of Thirds Grid Lines (Active during crop mode) */}
          {activeTab === 'crop' && (
            <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-e border-b border-white/20" />
              <div className="border-e border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-e border-b border-white/20" />
              <div className="border-e border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-e border-white/20" />
              <div className="border-e border-white/20" />
              <div />
            </div>
          )}

          {/* Source Image with Live CSS Filter, Rotation, and Flip */}
          <img
            ref={sourceImgRef}
            src={effectiveSrc}
            alt="Preview"
            draggable={false}
            className="max-w-full max-h-[68vh] object-contain select-none transition-all duration-200"
            style={{
              filter: currentFilterObj.css,
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scale(${scale})`,
              transformOrigin: 'center center'
            }}
          />

          {/* Live Text Overlay Preview */}
          {overlayText.trim() && (
            <div 
              className="absolute left-0 right-0 z-20 flex justify-center px-4 pointer-events-none transition-all duration-150"
              style={{
                top: `${textPosPercent}%`,
                transform: 'translateY(-50%)'
              }}
            >
              <div 
                className={`max-w-[90%] text-center font-bold tracking-tight px-3 py-1.5 transition-all select-none ${
                  textBgStyle === 'pill' 
                    ? 'rounded-full bg-black/65 backdrop-blur-sm' 
                    : textBgStyle === 'solid' 
                      ? 'rounded-lg bg-black text-white' 
                      : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                }`}
                style={{
                  color: textColor,
                  fontSize: `${textSize}px`,
                  lineHeight: 1.25
                }}
              >
                {overlayText}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Controls & Tool Panels */}
      <div className="bg-[#101012] border-t border-neutral-900/90 pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pt-3 flex flex-col gap-3">
        
        {/* TAB 1: CROP & ASPECT RATIO */}
        {activeTab === 'crop' && (
          <div className="flex flex-col gap-2.5 animate-in fade-in">
            <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => {
                    hapticsService.light();
                    setAspectRatio(ratio.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tap-press whitespace-nowrap transition-colors ${
                    aspectRatio === ratio.id 
                      ? 'bg-white text-black font-bold shadow-md' 
                      : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  {isAr ? ratio.labelAr : ratio.labelEn}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                onClick={handleRotate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs tap-press transition-colors"
                title={isAr ? 'تدوير 90 درجة' : 'Rotate 90deg'}
              >
                <RotateCw size={15} />
                <span>{isAr ? 'تدوير 90°' : 'Rotate 90°'}</span>
              </button>

              <button
                onClick={handleFlipH}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs tap-press transition-colors"
                title={isAr ? 'قلب أفقي' : 'Flip'}
              >
                <FlipHorizontal size={15} />
                <span>{isAr ? 'قلب أفقي' : 'Flip'}</span>
              </button>

              <button
                onClick={() => {
                  setScale(1);
                  setPan({ x: 0, y: 0 });
                  setRotation(0);
                  setFlipH(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs tap-press transition-colors"
              >
                <Undo2 size={14} />
                <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: FILTERS */}
        {activeTab === 'filters' && (
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 animate-in fade-in">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  hapticsService.light();
                  setSelectedFilter(f.id);
                }}
                className="flex flex-col items-center gap-1 flex-shrink-0 tap-press group"
              >
                <div 
                  className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all shadow-md ${
                    selectedFilter === f.id ? 'border-white scale-105 shadow-white/10' : 'border-neutral-800 opacity-70 group-hover:opacity-100'
                  }`}
                >
                  <img
                    src={effectiveSrc}
                    alt={f.nameEn}
                    className="w-full h-full object-cover"
                    style={{ filter: f.css }}
                  />
                </div>
                <span className={`text-[11px] font-medium tracking-tight ${selectedFilter === f.id ? 'text-white font-bold' : 'text-neutral-400'}`}>
                  {isAr ? f.nameAr : f.nameEn}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* TAB 3: TEXT OVERLAY */}
        {activeTab === 'text' && (
          <div className="flex flex-col gap-2.5 animate-in fade-in">
            <input
              type="text"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder={isAr ? 'اكتب نصاً على الصورة...' : 'Type text on photo...'}
              className="w-full bg-neutral-900/90 border border-neutral-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none focus:border-white transition-colors"
            />

            <div className="flex items-center justify-between gap-2 pt-0.5">
              {/* Color swatches */}
              <div className="flex items-center gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      hapticsService.light();
                      setTextColor(c.hex);
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform tap-press ${
                      textColor === c.hex ? 'border-white scale-125 shadow-md' : 'border-neutral-700'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Background style toggle */}
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setTextBgStyle('none')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold tap-press transition-colors ${
                    textBgStyle === 'none' ? 'bg-white text-black' : 'text-neutral-400'
                  }`}
                >
                  {isAr ? 'شفاف' : 'None'}
                </button>
                <button
                  onClick={() => setTextBgStyle('pill')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold tap-press transition-colors ${
                    textBgStyle === 'pill' ? 'bg-white text-black' : 'text-neutral-400'
                  }`}
                >
                  {isAr ? 'كبسولة' : 'Pill'}
                </button>
                <button
                  onClick={() => setTextBgStyle('solid')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold tap-press transition-colors ${
                    textBgStyle === 'solid' ? 'bg-white text-black' : 'text-neutral-400'
                  }`}
                >
                  {isAr ? 'ممتلئ' : 'Solid'}
                </button>
              </div>

              {/* Position toggle: Top / Center / Bottom */}
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setTextPosPercent(18)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold tap-press transition-colors ${
                    textPosPercent === 18 ? 'bg-white text-black' : 'text-neutral-400'
                  }`}
                >
                  {isAr ? 'أعلى' : 'Top'}
                </button>
                <button
                  onClick={() => setTextPosPercent(50)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold tap-press transition-colors ${
                    textPosPercent === 50 ? 'bg-white text-black' : 'text-neutral-400'
                  }`}
                >
                  {isAr ? 'وسط' : 'Mid'}
                </button>
                <button
                  onClick={() => setTextPosPercent(82)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold tap-press transition-colors ${
                    textPosPercent === 82 ? 'bg-white text-black' : 'text-neutral-400'
                  }`}
                >
                  {isAr ? 'أسفل' : 'Bot'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION TABS (Crop, Filters, Text) */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-900">
          <button
            onClick={() => {
              hapticsService.light();
              setActiveTab('crop');
            }}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-2xl tap-press transition-colors ${
              activeTab === 'crop' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Crop size={17} />
            <span className="text-[11px]">{isAr ? 'قص وتدوير' : 'Crop'}</span>
          </button>

          <button
            onClick={() => {
              hapticsService.light();
              setActiveTab('filters');
            }}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-2xl tap-press transition-colors ${
              activeTab === 'filters' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders size={17} />
            <span className="text-[11px]">{isAr ? 'فلاتر سينمائية' : 'Filters'}</span>
          </button>

          <button
            onClick={() => {
              hapticsService.light();
              setActiveTab('text');
            }}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-2xl tap-press transition-colors ${
              activeTab === 'text' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Type size={17} />
            <span className="text-[11px]">{isAr ? 'كتابة على الصورة' : 'Text'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
