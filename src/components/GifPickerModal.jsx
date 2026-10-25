import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { hapticsService } from '../services/hapticsService';

// Comprehensive curated library of high-quality animated GIFs (Reactions, Memes, Egyptian, Global)
import { CURATED_GIFS_250 } from '../data/curatedGifs250';

const PRESET_GIFS = CURATED_GIFS_250;

const CATEGORIES = [
  { id: 'all', labelAr: 'الكل', labelEn: 'All', q: 'trending' },
  { id: 'trending', labelAr: 'شائع', labelEn: 'Trending', q: 'trending' },
  { id: 'memes', labelAr: 'كوميكس وميمز', labelEn: 'Memes', q: 'meme' },
  { id: 'reactions', labelAr: 'ردود أفعال', labelEn: 'Reactions', q: 'reaction' },
  { id: 'laugh', labelAr: 'ضحك', labelEn: 'Laugh', q: 'laugh' },
  { id: 'applause', labelAr: 'تصفيق', labelEn: 'Applause', q: 'applause' },
  { id: 'fire', labelAr: 'حماس ونار', labelEn: 'Fire', q: 'fire' },
  { id: 'love', labelAr: 'حب وقلوب', labelEn: 'Love', q: 'love' },
  { id: 'shock', labelAr: 'صدمة', labelEn: 'Shock', q: 'shock' }
];

export default function GifPickerModal({ isOpen, onClose, onSelectGif }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [gifs, setGifs] = useState(PRESET_GIFS);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search Tenor / Giphy API with fallback
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const searchTerm = query.trim() || (activeCategory === 'all' ? 'trending' : activeCategory);

    const fetchGifs = async () => {
      setLoading(true);
      try {
        const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllCa54iNt0yFbjz7L65&q=${encodeURIComponent(
          searchTerm
        )}&limit=50&offset=0&rating=g`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.data && data.data.length > 0) {
            const mapped = data.data.map((item) => ({
              id: item.id,
              title: item.title || 'GIF',
              url: item.images?.downsized_medium?.url || item.images?.fixed_height?.url || item.images?.original?.url
            })).filter(g => g.url);

            setGifs(mapped);
            setOffset(mapped.length);
            setHasMore(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to rich presets
      }

      if (isMounted) {
        const cleanQuery = searchTerm.toLowerCase();
        const filtered = PRESET_GIFS.filter(g => {
          if (cleanQuery === 'trending' || cleanQuery === 'all') return true;
          return (
            (g.title && g.title.toLowerCase().includes(cleanQuery)) ||
            (g.tags && g.tags.toLowerCase().includes(cleanQuery))
          );
        });
        setGifs(filtered.length > 0 ? filtered : PRESET_GIFS);
        setHasMore(false);
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchGifs, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, activeCategory, isOpen]);

  const handleLoadMore = async () => {
    const searchTerm = query.trim() || (activeCategory === 'all' ? 'trending' : activeCategory);
    setLoading(true);
    try {
      const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllCa54iNt0yFbjz7L65&q=${encodeURIComponent(
        searchTerm
      )}&limit=40&offset=${offset}&rating=g`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const newGifs = data.data.map((item) => ({
            id: item.id,
            title: item.title || 'GIF',
            url: item.images?.downsized_medium?.url || item.images?.fixed_height?.url || item.images?.original?.url
          })).filter(g => g.url);

          setGifs((prev) => [...prev, ...newGifs]);
          setOffset((prev) => prev + newGifs.length);
          if (newGifs.length < 20) setHasMore(false);
        } else {
          setHasMore(false);
        }
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[1150] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in select-none">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-[#121214] border-t sm:border border-[#222226] w-full max-w-[460px] rounded-t-3xl sm:rounded-3xl p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl flex flex-col h-[82vh] max-h-[640px] animate-sheet-up overflow-hidden">
        {/* Grabber on mobile */}
        <div className="w-10 h-1 bg-[#2C2C2E] rounded-full mx-auto mb-3 sm:hidden" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-white text-black font-extrabold text-[11px] flex items-center justify-center">
              GIF
            </span>
            <span className="font-bold text-sm text-white">
              {isAr ? 'مكتبة الصور المتحركة' : 'GIF Library'}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">({gifs.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 tap-press transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن GIF بالعربي أو الإنجليزي...' : 'Search millions of GIFs...'}
            className="w-full bg-[#1C1C20] border border-[#2A2A2E] rounded-xl ps-9 pe-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                hapticsService.selection?.();
                setActiveCategory(cat.q);
                setQuery('');
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all tap-press ${
                activeCategory === cat.q && !query
                  ? 'bg-white text-black'
                  : 'bg-[#1C1C20] text-neutral-400 hover:text-white border border-[#2A2A2E]'
              }`}
            >
              {isAr ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* GIFs Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar mt-1 rounded-xl">
          {loading && gifs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500 gap-2">
              <Loader2 size={20} className="animate-spin text-white" />
              <span className="text-xs">{isAr ? 'جاري التحميل...' : 'Loading GIFs...'}</span>
            </div>
          ) : gifs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
              <Search size={24} className="mb-2 text-neutral-600" />
              <span>{isAr ? 'لا توجد صور مطابقة' : 'No GIFs found'}</span>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif, idx) => (
                  <div
                    key={`${gif.id}-${idx}`}
                    onClick={() => {
                      hapticsService.light?.();
                      onSelectGif(gif.url);
                      onClose();
                    }}
                    className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-white/5 hover:border-white/30 cursor-pointer tap-press group transition-all"
                  >
                    <img
                      src={gif.url}
                      alt={gif.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="pt-2 pb-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold tap-press transition-all inline-flex items-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{isAr ? 'جاري التحميل...' : 'Loading more...'}</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>{isAr ? 'تحميل المزيد من صور GIF' : 'Load more GIFs'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
