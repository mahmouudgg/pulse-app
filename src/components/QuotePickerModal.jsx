import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Quote, Link2, User, Loader2 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { useLanguage } from '../context/LanguageContext';
import { hapticsService } from '../services/hapticsService';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

export default function QuotePickerModal({
  isOpen,
  onClose,
  onSelectQuote,
  currentUser
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadRecentPosts();
  }, [isOpen]);

  const loadRecentPosts = async () => {
    setIsLoading(true);
    try {
      const allPosts = await storageService.getPosts();
      if (Array.isArray(allPosts)) {
        // Exclude system broadcasts or corrupted empty posts
        const valid = allPosts.filter((p) => p && (p.content || p.imageUrl || p.hasVoice));
        setPosts(valid.slice(0, 50));
      }
    } catch (e) {
      console.warn('Error loading posts for quote:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePickPost = (post) => {
    hapticsService.selection?.();
    onSelectQuote({
      id: post.id,
      author: post.author || {
        uid: post.authorId || 'unknown',
        displayName: 'مستخدم',
        username: 'user',
        avatar: DEFAULT_AVATAR
      },
      content: post.content || '',
      imageUrl: post.imageUrl || null,
      hasVoice: Boolean(post.hasVoice)
    });
    onClose();
  };

  const handlePasteLink = () => {
    setLinkError('');
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    // Match /p/post-id or direct id
    const match = trimmed.match(/\/p\/([a-zA-Z0-9_-]+)/) || trimmed.match(/^(post-[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{8,})$/);
    const targetId = match ? match[1] : trimmed;

    const found = posts.find((p) => p.id === targetId || p.id === trimmed);
    if (found) {
      handlePickPost(found);
      return;
    }

    // Try finding in storage
    storageService.getPostById(targetId).then((post) => {
      if (post) {
        handlePickPost(post);
      } else {
        setLinkError(isAr ? 'لم يتم العثور على النبضة المطلوبة' : 'Pulse not found');
      }
    }).catch(() => {
      setLinkError(isAr ? 'تعذر جلب النبضة من الرابط' : 'Could not fetch pulse from link');
    });
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredPosts = posts.filter((p) => {
    if (!q) return true;
    const content = (p.content || '').toLowerCase();
    const username = (p.author?.username || '').toLowerCase();
    const displayName = (p.author?.displayName || '').toLowerCase();
    return content.includes(q) || username.includes(q) || displayName.includes(q);
  });

  const modalContent = (
    <div className="fixed inset-0 z-[1150] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-[460px] h-[85vh] sm:h-[78vh] bg-[#121214] border-t sm:border border-[#222226] rounded-t-3xl sm:rounded-3xl text-white flex flex-col overflow-hidden shadow-2xl animate-sheet-up">
        {/* Grabber on mobile */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="pt-3 px-4 pb-3 flex items-center justify-between border-b border-[#1C1C20]">
          <div className="flex items-center gap-2">
            <Quote size={18} className="text-[#0095F6]" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              {isAr ? 'اقتباس نبضة' : 'Quote a pulse'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 tap-press transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Link input accordion */}
        <div className="p-3 border-b border-[#1C1C20] bg-[#161618]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={linkInput}
                onChange={(e) => {
                  setLinkInput(e.target.value);
                  setLinkError('');
                }}
                placeholder={isAr ? 'ألصق رابط النبضة هنا...' : 'Paste pulse link here...'}
                className="w-full bg-[#1C1C20] border border-white/10 rounded-xl ps-8 pe-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handlePasteLink}
              disabled={!linkInput.trim()}
              className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed tap-press transition-all flex-shrink-0"
            >
              {isAr ? 'اقتباس' : 'Quote'}
            </button>
          </div>
          {linkError && (
            <div className="text-[11px] text-rose-400 mt-1.5 ps-1">{linkError}</div>
          )}
        </div>

        {/* Search input for timeline posts */}
        <div className="p-3 border-b border-[#1C1C20]/50">
          <div className="relative flex items-center bg-[#1E1E22] rounded-xl px-3 py-2 border border-white/5 focus-within:border-white/20 transition-all">
            <Search size={15} className="text-neutral-400 flex-shrink-0 me-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في النبضات للاقتباس...' : 'Search pulses to quote...'}
              className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-0.5 text-neutral-400 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Posts list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 no-scrollbar">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-neutral-500 gap-2">
              <Loader2 size={22} className="animate-spin text-white" />
              <span className="text-xs">{isAr ? 'جاري تحميل النبضات...' : 'Loading pulses...'}</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-500">
              {isAr ? 'لم يتم العثور على نبضات مطابقة' : 'No pulses found'}
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => handlePickPost(post)}
                className="p-3 rounded-2xl bg-[#18181B] border border-white/5 hover:border-white/20 active:bg-white/10 cursor-pointer tap-press transition-all group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <img
                    src={post.author?.avatar || DEFAULT_AVATAR}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {post.author?.displayName || 'User'}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono truncate" dir="ltr">
                    @{post.author?.username}
                  </span>
                </div>
                {post.content && (
                  <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                )}
                {post.imageUrl && (
                  <div className="mt-2 w-full h-24 rounded-xl overflow-hidden bg-black/40 border border-white/5">
                    <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
