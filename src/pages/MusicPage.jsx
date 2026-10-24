import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Search, Play, Pause, Music2, 
  Loader2, Disc, X, Check
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { hapticsService } from '../services/hapticsService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export default function MusicPage({
  currentUser,
  onBack,
  onSelectMusicForCompose
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();
  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  // Active Category Filter: 'all' | 'trending' | 'originals'
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [allSounds, setAllSounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingSoundId, setPlayingSoundId] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);

  // Subscribe to soundService global preview state & clean up on unmount
  useEffect(() => {
    const unsub = soundService.subscribe((state) => {
      setPlayingSoundId(state.playingId);
      setCurrentTrack(state.sound || null);
      if (state.error) {
        showToast(isAr ? 'تعذر تشغيل هذا المقطع الصوتي' : 'Could not play audio track');
      }
    });

    return () => {
      unsub();
      // Ensure audio stops completely when exiting the music page
      soundService.stopPreview();
    };
  }, [isAr, showToast]);

  // Load tracks from Firebase & verified registry
  useEffect(() => {
    loadAllSounds();
  }, []);

  const loadAllSounds = async () => {
    setIsLoading(true);
    try {
      const sounds = await soundService.getAllSounds();
      setAllSounds(sounds);
    } catch {
      showToast(isAr ? 'تعذر تحميل مكتبة الأصوات' : 'Failed to load sounds library');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePlay = (e, sound) => {
    e.stopPropagation();
    hapticsService.light?.();
    soundService.playPreview(sound);
  };

  const handleStopCurrentTrack = (e) => {
    e?.stopPropagation();
    hapticsService.light?.();
    soundService.stopPreview();
  };

  const handleSelectTrack = (sound) => {
    hapticsService.selection?.();
    soundService.stopPreview();
    if (onSelectMusicForCompose) {
      onSelectMusicForCompose({
        id: sound.id,
        title: sound.title,
        artist: sound.artist,
        duration: sound.duration || '0:30',
        coverUrl: sound.coverUrl,
        audioUrl: sound.audioUrl,
        isCustom: Boolean(sound.isCustom)
      });
    }
  };

  // Filtered tracks calculation
  const filteredSounds = allSounds.filter((sound) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (sound.title && sound.title.toLowerCase().includes(q)) ||
      (sound.artist && sound.artist.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeTab === 'trending') {
      return (sound.usesCount || 0) >= 10;
    }
    if (activeTab === 'originals') {
      return sound.isOfficial || !sound.isCustom;
    }
    return true;
  });

  return (
    <SwipeBackWrapper onBack={onBack}>
      <div className="min-h-screen bg-black text-white flex flex-col safe-area-top safe-area-bottom select-none">
        
        {/* Top Header - Pure, Clean, Single Line 'Music' */}
        <header className="sticky top-0 z-40 h-14 bg-black/90 backdrop-blur-xl border-b border-[#1A1A1E] px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                hapticsService.light?.();
                soundService.stopPreview();
                onBack();
              }}
              className="p-1.5 -mr-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
              aria-label={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={22} className="stroke-[2.2]" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
              Music
            </h1>
          </div>
        </header>

        {/* Search Bar matching Threads */}
        <div className="px-4 pt-3 pb-2 bg-black">
          <div className="relative flex items-center">
            <Search size={16} className="absolute right-3.5 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث عن مقطع صوتي أو فنان...' : 'Search tracks or artists...'}
              className="w-full bg-[#101012] text-white placeholder-neutral-500 text-xs pr-10 pl-8 py-2.5 rounded-xl border border-[#1F1F24] focus:border-neutral-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs: الكل / شائع / أصلية */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-[#1A1A1E] overflow-x-auto no-scrollbar bg-black">
          {[
            { id: 'all', label: isAr ? 'الكل' : 'All' },
            { id: 'trending', label: isAr ? 'شائع' : 'Trending' },
            { id: 'originals', label: isAr ? 'أصلية' : 'Originals' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  hapticsService.selection?.();
                  setActiveTab(tab.id);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-[#101012] text-neutral-400 hover:text-white border border-[#1F1F24]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Track List */}
        <div className="flex-1 px-4 py-3 overflow-y-auto pb-28">
          <div className="space-y-2.5 max-w-lg mx-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-3">
                <Loader2 size={26} className="animate-spin text-neutral-400" />
                <span className="text-xs font-medium">{isAr ? 'جاري تحميل المقاطع...' : 'Loading tracks...'}</span>
              </div>
            ) : filteredSounds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-2">
                <Music2 size={36} className="text-neutral-600 stroke-[1.5]" />
                <p className="text-xs font-semibold text-neutral-400">
                    {searchQuery.trim()
                      ? (isAr ? 'لا توجد مقاطع صوتية مطابقة للبحث' : 'No matching tracks found')
                      : (isAr ? 'لا توجد مقاطع صوتية متاحة حالياً' : 'No audio tracks available')}
                </p>
              </div>
            ) : (
              filteredSounds.map((sound) => {
                const isPlaying = playingSoundId === sound.id;
                return (
                  <div
                    key={sound.id}
                    onClick={() => handleSelectTrack(sound)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer tap-press ${
                      isPlaying 
                        ? 'bg-[#151518] border-white/25 shadow-md' 
                        : 'bg-[#101012] border-[#1F1F24] hover:bg-[#16161A] hover:border-neutral-700'
                    }`}
                  >
                    {/* Left: 48x48 Album Cover with Play/Pause Overlay */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/10">
                        {sound.coverUrl ? (
                          <img
                            src={sound.coverUrl}
                            alt={sound.title}
                            className={`w-full h-full object-cover transition-transform duration-300 ${isPlaying ? 'scale-105' : ''}`}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <Disc size={22} className={isPlaying ? 'animate-spin' : ''} />
                          </div>
                        )}

                        {/* Play overlay button on thumbnail */}
                        <button
                          type="button"
                          onClick={(e) => handleTogglePlay(e, sound)}
                          className="absolute inset-0 bg-black/45 flex items-center justify-center text-white opacity-90 hover:opacity-100 transition-opacity"
                          aria-label={isPlaying ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'تشغيل' : 'Play')}
                        >
                          {isPlaying ? (
                            <Pause size={18} className="fill-current text-white" />
                          ) : (
                            <Play size={18} className="fill-current text-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Track Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-white truncate max-w-[200px]">
                            {sound.title}
                          </h3>
                          {sound.isOfficial && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-neutral-300 font-semibold flex-shrink-0">
                              {isAr ? 'رسمي' : 'Official'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate max-w-[200px] mt-0.5">
                          {sound.artist || (isAr ? 'فنان غير معروف' : 'Unknown Artist')}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-mono">
                          <span>{sound.duration || '0:30'}</span>
                          <span>·</span>
                          <span>{sound.usesCount || 0} {isAr ? 'استخدام' : 'uses'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Circular Preview Play Button & Use Action */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePlay(e, sound)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isPlaying 
                            ? 'bg-white text-black' 
                            : 'bg-[#1E1E24] hover:bg-[#282830] text-white'
                        }`}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause size={15} className="fill-current" />
                        ) : (
                          <Play size={15} className="fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTrack(sound);
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-bold tracking-tight hover:bg-neutral-200 active:scale-95 transition-all shadow-sm"
                      >
                        {isAr ? 'استخدام' : 'Use'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Floating Now-Playing Mini Bar at Bottom */}
        {currentTrack && (
          <div className="fixed bottom-3 left-4 right-4 z-50 max-w-lg mx-auto">
            <div className="bg-[#141416]/95 backdrop-blur-xl border border-white/20 rounded-2xl p-2.5 px-3 shadow-[0_8px_30px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0 relative">
                  <img
                    src={currentTrack.coverUrl || DEFAULT_AVATAR}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate max-w-[170px]">
                    {currentTrack.title}
                  </div>
                  <div className="text-[10px] text-neutral-400 truncate max-w-[170px]">
                    {currentTrack.artist}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleTogglePlay(e, currentTrack)}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 active:scale-95 transition-all shadow-sm"
                  aria-label={playingSoundId === currentTrack.id ? 'Pause' : 'Play'}
                >
                  {playingSoundId === currentTrack.id ? (
                    <Pause size={14} className="fill-current" />
                  ) : (
                    <Play size={14} className="fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTrack(currentTrack)}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all"
                >
                  {isAr ? 'استخدام' : 'Use'}
                </button>

                <button
                  type="button"
                  onClick={handleStopCurrentTrack}
                  className="w-7 h-7 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                  aria-label={isAr ? 'إغلاق' : 'Close'}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </SwipeBackWrapper>
  );
}
