import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, Check, X, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft,
  ChevronDown, SlidersHorizontal, SquarePen, MoreHorizontal, Clock, Hash,
  Users, UserCheck, Flame
} from 'lucide-react';
import { useSwipeDownDismiss } from '../hooks/useSwipeDownDismiss';
import { storageService } from '../services/storageService';
import { searchEngine } from '../services/searchEngine';
import { rankingEngine } from '../services/rankingEngine';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { hapticsService } from '../services/hapticsService';
import PostCard from '../components/PostCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

export default function ExplorePage({
  currentUserId,
  currentUser,
  onLike,
  onRepost,
  onOpenDetail,
  onOpenShare,
  onOpenReport,
  onBlockUser,
  onDeletePost,
  onEditPost,
  onToggleBookmark,
  onOpenUserProfile,
  onOpenCompose
}) {
  const { t, lang } = useLanguage();
  const { toggleFollow } = useAuth();
  const isAr = lang === 'ar';
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const inputRef = useRef(null);

  // Search State Machine:
  // - mode: 'idle' (default suggested creators)
  // - mode: 'typing' (focused with live hybrid autocomplete suggestions)
  // - mode: 'results' (search submitted with posts feed and related profiles)
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Results & Advanced Filters:
  const [sortOrder, setSortOrder] = useState('top'); // 'top' | 'latest' | 'likes'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'media' | 'voice' | 'verified'
  const [filterTimeframe, setFilterTimeframe] = useState('all'); // 'all' | '24h' | 'week' | 'month'
  const [filterScope, setFilterScope] = useState('all'); // 'all' | 'following'
  const [activeResultsTab, setActiveResultsTab] = useState('posts'); // 'posts' | 'profiles'
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Draft filter state for the bottom sheet modal:
  const [draftSortOrder, setDraftSortOrder] = useState('top');
  const [draftFilterType, setDraftFilterType] = useState('all');
  const [draftFilterTimeframe, setDraftFilterTimeframe] = useState('all');
  const [draftFilterScope, setDraftFilterScope] = useState('all');

  const [followingMap, setFollowingMap] = useState({});
  const [recentSearches, setRecentSearches] = useState(() => searchEngine.getRecentSearches() || []);

  const users = storageService.getUsers() || [];
  const posts = storageService.getPosts() || [];

  // Track active filter count for badge indicator
  const hasActiveFilters = sortOrder !== 'top' || filterType !== 'all' || filterTimeframe !== 'all' || filterScope !== 'all';

  const openFilterModal = () => {
    try { hapticsService.light?.(); } catch {}
    setDraftSortOrder(sortOrder);
    setDraftFilterType(filterType);
    setDraftFilterTimeframe(filterTimeframe);
    setDraftFilterScope(filterScope);
    setShowFilterSheet(true);
  };

  const handleApplyFilters = () => {
    try { hapticsService.medium?.(); } catch {}
    setSortOrder(draftSortOrder);
    setFilterType(draftFilterType);
    setFilterTimeframe(draftFilterTimeframe);
    setFilterScope(draftFilterScope);
    setShowFilterSheet(false);
    if (!hasSubmitted && searchQuery.trim()) {
      handleExecuteSearch(searchQuery.trim());
    }
  };

  const handleResetFilters = () => {
    try { hapticsService.light?.(); } catch {}
    setDraftSortOrder('top');
    setDraftFilterType('all');
    setDraftFilterTimeframe('all');
    setDraftFilterScope('all');
    setSortOrder('top');
    setFilterType('all');
    setFilterTimeframe('all');
    setFilterScope('all');
  };

  // Track following state locally for instant optimistic UI
  useEffect(() => {
    if (currentUser) {
      const followingArr = storageService._resolveEngagementArray(currentUser.following);
      const map = {};
      followingArr.forEach((uid) => {
        map[uid] = true;
      });
      setFollowingMap(map);
    }
  }, [currentUser]);

  // Suggested Profiles (PULSE Official - Image 1)
  const suggestedProfiles = useMemo(() => {
    return rankingEngine.recommendCreators(currentUser, users, posts);
  }, [currentUser, users, posts]);

  // Hybrid Autocomplete Data (PULSE Official - Image 2)
  const autocomplete = useMemo(() => {
    if (!searchQuery.trim()) return { topUser: null, searchTerms: [], otherUsers: [] };
    return searchEngine.getAutocompleteHybrid(searchQuery, users, posts);
  }, [searchQuery, users, posts]);

  // Full Search Results (PULSE Official - Image 3)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { users: [], posts: [], hashtags: [], places: [] };
    return searchEngine.search({
      query: searchQuery,
      users,
      posts,
      category: 'all',
      currentUser
    });
  }, [searchQuery, users, posts, currentUser]);

  // Filtered and Sorted Posts for Results View
  const sortedPosts = useMemo(() => {
    let list = [...(searchResults.posts || [])];
    const now = Date.now();

    // 1. Content Type Filter
    if (filterType === 'media') {
      list = list.filter((p) => Boolean(p.mediaUrl || p.image || (p.images && p.images.length > 0)));
    } else if (filterType === 'voice') {
      list = list.filter((p) => Boolean(p.hasVoice || p.audioUrl));
    } else if (filterType === 'verified') {
      list = list.filter((p) => Boolean(p.author?.isVerified || p.author?.isFounder));
    }

    // 2. Creator Scope Filter
    if (filterScope === 'following') {
      list = list.filter((p) => {
        const authorUid = p.author?.uid || p.authorId;
        return Boolean(followingMap[authorUid]);
      });
    }

    // 3. Timeframe Filter
    if (filterTimeframe === '24h') {
      list = list.filter((p) => {
        const time = new Date(p.createdAt || 0).getTime();
        return now - time <= 24 * 60 * 60 * 1000;
      });
    } else if (filterTimeframe === 'week') {
      list = list.filter((p) => {
        const time = new Date(p.createdAt || 0).getTime();
        return now - time <= 7 * 24 * 60 * 60 * 1000;
      });
    } else if (filterTimeframe === 'month') {
      list = list.filter((p) => {
        const time = new Date(p.createdAt || 0).getTime();
        return now - time <= 30 * 24 * 60 * 60 * 1000;
      });
    }

    // 4. Sort Order
    if (sortOrder === 'latest') {
      return list.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    }
    if (sortOrder === 'likes') {
      return list.sort((a, b) => {
        const likesA = Array.isArray(a.likes) ? a.likes.length : 0;
        const likesB = Array.isArray(b.likes) ? b.likes.length : 0;
        return likesB - likesA;
      });
    }
    // Default 'top' - sorted by matchScore & engagement
    return list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [searchResults.posts, sortOrder, filterType, filterTimeframe, filterScope, followingMap]);

  // Filtered Users for Results View
  const filteredUsers = useMemo(() => {
    let list = [...(searchResults.users || [])];
    if (filterType === 'verified') {
      list = list.filter((u) => Boolean(u.isVerified || u.isFounder));
    }
    if (filterScope === 'following') {
      list = list.filter((u) => Boolean(followingMap[u.uid]));
    }
    return list;
  }, [searchResults.users, filterType, filterScope, followingMap]);

  // Execute Search
  const handleExecuteSearch = (queryText) => {
    const term = (queryText || searchQuery).trim();
    if (!term) return;
    try { hapticsService.light?.(); } catch {}
    setSearchQuery(term);
    setHasSubmitted(true);
    setIsFocused(false);
    searchEngine.saveRecentSearch(term);
    setRecentSearches(searchEngine.getRecentSearches());
  };

  // Exit Search to Idle State
  const handleExitSearch = () => {
    try { hapticsService.light?.(); } catch {}
    setSearchQuery('');
    setHasSubmitted(false);
    setIsFocused(false);
    setActiveResultsTab('posts');
  };

  const handleFollowToggle = async (targetUid) => {
    try {
      hapticsService.selection?.();
      setFollowingMap((prev) => ({
        ...prev,
        [targetUid]: !prev[targetUid]
      }));
      await toggleFollow(targetUid);
    } catch (e) {
      console.warn('Follow error:', e);
    }
  };

  // Format follower count in PULSE Official notation (e.g. 293K followers, 167K followers)
  const formatFollowers = (count) => {
    if (!count || count <= 0) return isAr ? 'انضم حديثاً إلى PULSE' : 'Joined recently';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace('.0', '') + (isAr ? 'M متابع' : 'M followers');
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace('.0', '') + (isAr ? 'K متابع' : 'K followers');
    }
    return `${count} ` + (isAr ? 'متابع' : 'followers');
  };

  // Determine current active mode
  const currentMode = hasSubmitted ? 'results' : (isFocused || searchQuery.trim() ? 'typing' : 'idle');

  return (
    <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ======================================================== */}
      {/* 1. TOP HEADER & SEARCH CAPSULE                           */}
      {/* ======================================================== */}
      <div className="sticky top-0 z-30 bg-black pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 px-4">
        
        {/* Idle Mode: Bold Large "Search" Title (Image 1) */}
        {currentMode === 'idle' && (
          <div className="flex items-center gap-3 py-1 mb-2">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {isAr ? 'البحث' : 'Search'}
            </h1>
          </div>
        )}

        {/* Search Bar Row */}
        <div className="flex items-center gap-3">
          
          {/* Back Chevron in Typing or Results Mode */}
          {currentMode !== 'idle' && (
            <button
              type="button"
              onClick={handleExitSearch}
              className="p-1 -ms-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press flex-shrink-0"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={24} strokeWidth={2} />
            </button>
          )}

          {/* Search Input Capsule */}
          <div className="flex-1 flex items-center gap-2.5 bg-[#141416] rounded-2xl px-3.5 py-2.5 border border-transparent focus-within:border-neutral-700 transition-all">
            <Search size={18} className="text-[#777777] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (hasSubmitted) setHasSubmitted(false);
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleExecuteSearch(searchQuery.trim());
                }
              }}
              placeholder={isAr ? 'بحث' : 'Search'}
              className="w-full bg-transparent text-[15px] text-white placeholder-[#777777] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setHasSubmitted(false);
                  inputRef.current?.focus();
                }}
                className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center tap-press transition-colors flex-shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Typing Mode: Filter Slider Icon on Right (Image 2) */}
          {currentMode === 'typing' && (
            <button
              type="button"
              onClick={openFilterModal}
              className="relative p-2 text-neutral-400 hover:text-white tap-press transition-colors flex-shrink-0"
              title={isAr ? 'خيارات الفلترة' : 'Filters'}
            >
              <SlidersHorizontal size={20} strokeWidth={1.8} />
              {hasActiveFilters && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-black" />
              )}
            </button>
          )}

          {/* Results Mode: Filter + Compose Action Icons on Right */}
          {currentMode === 'results' && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={openFilterModal}
                className="relative p-2 text-neutral-300 hover:text-white tap-press transition-colors"
                title={isAr ? 'خيارات وتصفية البحث' : 'Filters & Sort'}
              >
                <SlidersHorizontal size={20} strokeWidth={1.8} />
                {hasActiveFilters && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-black" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenCompose) onOpenCompose();
                }}
                className="p-1.5 text-white hover:opacity-80 active:opacity-60 tap-press transition-opacity"
                title={isAr ? 'نبضة جديدة' : 'New pulse'}
              >
                <SquarePen size={21} strokeWidth={1.9} />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. STATE: IDLE (PULSE Official Image 1)                     */}
      {/* ======================================================== */}
      {currentMode === 'idle' && (
        <div className="pt-1">
          {suggestedProfiles && suggestedProfiles.length > 0 ? (
            suggestedProfiles.map((user) => renderSuggestedProfileRow(user))
          ) : (
            <div className="py-20 text-center text-xs text-neutral-500">
              <Search size={32} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />
              <div className="text-white font-medium mb-1">{isAr ? 'استكشف الحسابات والنبضات' : 'Discover creators and threads'}</div>
              <div>{isAr ? 'ابحث عن الأشخاص، الأفكار، والموضوعات المتداولة.' : 'Search for people, topics, and ideas.'}</div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. STATE: TYPING / AUTOCOMPLETE (PULSE Official Image 2)    */}
      {/* ======================================================== */}
      {currentMode === 'typing' && (
        <div className="pt-1">
          
          {/* A. Top User Match */}
          {autocomplete.topUser && renderAutocompleteUserRow(autocomplete.topUser, true)}

          {/* B. Search Query Suggestions with Magnifying Glass Icon */}
          {autocomplete.searchTerms && autocomplete.searchTerms.length > 0 && (
            <div>
              {autocomplete.searchTerms.map((term, idx) => (
                <button
                  key={`term_${idx}`}
                  type="button"
                  onClick={() => handleExecuteSearch(term)}
                  className="w-full flex items-center gap-4 py-3.5 px-4 text-start hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors tap-press group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#141416] flex items-center justify-center text-neutral-400 group-hover:text-white flex-shrink-0">
                    <Search size={18} />
                  </div>
                  <span className="text-[15px] font-semibold text-white flex-1 truncate">
                    {term}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* C. Other Matching User Profiles */}
          {autocomplete.otherUsers && autocomplete.otherUsers.length > 0 && (
            <div>
              {autocomplete.otherUsers.map((user) => renderAutocompleteUserRow(user, false))}
            </div>
          )}

          {/* Empty fallback for autocomplete */}
          {!autocomplete.topUser && (!autocomplete.searchTerms || autocomplete.searchTerms.length === 0) && (!autocomplete.otherUsers || autocomplete.otherUsers.length === 0) && (
            <div className="py-16 text-center text-xs text-neutral-500">
              <div>{isAr ? 'اضغط إدخال للبحث في كافة النبضات والحسابات' : 'Press Enter to search all threads and accounts'}</div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. STATE: RESULTS VIEW (PULSE Official Image 3)             */}
      {/* ======================================================== */}
      {currentMode === 'results' && (
        <div>
          
          {/* Sub-bar Filter Row (PULSE Official: "Top posts v" & "Related profiles >") */}
          <div className="px-4 border-b border-[#18181A] pb-2.5 pt-1 mb-2 flex items-center justify-between">
            
            {/* Left: Top posts dropdown toggle */}
            <button
              type="button"
              onClick={openFilterModal}
              className="flex items-center gap-1.5 text-sm font-bold text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"
            >
              <span>
                {sortOrder === 'top' 
                  ? (isAr ? 'أبرز المنشورات' : 'Top posts') 
                  : (sortOrder === 'likes'
                    ? (isAr ? 'الأكثر إعجاباً' : 'Most liked')
                    : (isAr ? 'أحدث المنشورات' : 'Latest'))}
              </span>
              <ChevronDown size={16} className="text-neutral-400" />
            </button>

            {/* Right: Related profiles toggle link */}
            {filteredUsers && filteredUsers.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveResultsTab(activeResultsTab === 'posts' ? 'profiles' : 'posts')}
                className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-white transition-colors tap-press"
              >
                <span>
                  {activeResultsTab === 'profiles'
                    ? (isAr ? 'عرض المنشورات' : 'View posts')
                    : (isAr ? `الحسابات ذات الصلة (${filteredUsers.length})` : `Related profiles (${filteredUsers.length})`)}
                </span>
                <Chevron size={14} className="text-neutral-500" />
              </button>
            )}

          </div>

          {/* Results: Posts View */}
          {activeResultsTab === 'posts' && (
            <div>
              {sortedPosts && sortedPosts.length > 0 ? (
                <div className="divide-y divide-[#18181A]">
                  {sortedPosts.map((post, idx) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      animationIndex={idx}
                      currentUserId={currentUserId}
                      currentUser={currentUser}
                      onLike={onLike}
                      onRepost={onRepost}
                      onOpenDetail={onOpenDetail}
                      onOpenShare={onOpenShare}
                      onOpenReport={onOpenReport}
                      onBlockUser={onBlockUser}
                      onDeletePost={onDeletePost}
                      onEditPost={onEditPost}
                      onToggleBookmark={onToggleBookmark}
                      onOpenUserProfile={onOpenUserProfile}
                    />
                  ))}
                </div>
              ) : (
                /* Fallback when no posts match: display related profiles */
                filteredUsers && filteredUsers.length > 0 ? (
                  <div className="pt-1">
                    <div className="px-4 py-2 text-xs font-semibold text-neutral-400">
                      {isAr ? 'لم يتم العثور على نبضات مطابقة، إليك الحسابات ذات الصلة:' : 'No matching pulses found. Here are related profiles:'}
                    </div>
                    {filteredUsers.map((user) => renderSuggestedProfileRow(user))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-xs text-neutral-500">
                    <Search size={32} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />
                    <div className="text-white font-medium mb-1">
                      {isAr ? `لا توجد نتائج مطابقة لـ "${searchQuery}"` : `No matching results for "${searchQuery}"`}
                    </div>
                    <div>{isAr ? 'جرب تغيير الفلاتر أو البحث بكلمات أخرى.' : 'Try adjusting filters or searching with different keywords.'}</div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Results: Related Profiles View */}
          {activeResultsTab === 'profiles' && (
            <div className="pt-1">
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user) => renderSuggestedProfileRow(user))
              ) : (
                <div className="py-20 text-center text-xs text-neutral-500">
                  <UserCheck size={32} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />
                  <div className="text-white font-medium mb-1">{isAr ? 'لا توجد حسابات مطابقة' : 'No matching profiles'}</div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SEARCH FILTERS & SORT BOTTOM SHEET (Portaled z-[1000]) */}
      {/* ======================================================== */}
      {showFilterSheet && createPortal(
        <SearchFilterModal
          isOpen={showFilterSheet}
          onClose={() => setShowFilterSheet(false)}
          isAr={isAr}
          draftSortOrder={draftSortOrder}
          setDraftSortOrder={setDraftSortOrder}
          draftFilterType={draftFilterType}
          setDraftFilterType={setDraftFilterType}
          draftFilterTimeframe={draftFilterTimeframe}
          setDraftFilterTimeframe={setDraftFilterTimeframe}
          draftFilterScope={draftFilterScope}
          setDraftFilterScope={setDraftFilterScope}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          hasActiveFilters={draftSortOrder !== 'top' || draftFilterType !== 'all' || draftFilterTimeframe !== 'all' || draftFilterScope !== 'all'}
        />,
        document.body
      )}

    </div>
  );

  // ==========================================================
  // HELPER 1: Render Suggested Profile Row (PULSE Official Image 1)
  // ==========================================================
  function renderSuggestedProfileRow(user) {
    if (!user) return null;
    const isFollowing = Boolean(followingMap[user.uid]);
    const rawUsername = user.username ? user.username.replace('@', '').trim() : (user.uid ? `user_${user.uid.slice(0, 5)}` : 'user');
    const displayName = user.displayName || user.name || `@${rawUsername}`;
    const followersArr = Array.isArray(user.followers) ? user.followers : (user.followers ? Object.keys(user.followers) : []);
    const followerCount = user.followerCount ?? followersArr.length;

    return (
      <div
        key={`sug_${user.uid}`}
        onClick={() => onOpenUserProfile && onOpenUserProfile(user)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-white/[0.02] cursor-pointer tap-press transition-colors"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={user.avatar || DEFAULT_AVATAR}
            alt={displayName}
            className="w-11 h-11 rounded-full aspect-square object-cover border border-[#222226] flex-shrink-0"
            onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
          />
          <div className="min-w-0">
            {/* Line 1: Username + Official Blue Checkmark */}
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold text-white tracking-tight truncate" dir="ltr">
                {rawUsername}
              </span>
              {user.isVerified && (
                <VerifiedBadge size={14} />
              )}
            </div>

            {/* Line 2: Display Name */}
            <div className="text-[13px] text-[#777777] font-normal truncate leading-snug mt-0.5">
              {displayName}
            </div>

            {/* Line 3: Follower Count (Exact PULSE Official) */}
            <div className="text-[12px] text-[#777777] font-mono mt-0.5">
              {formatFollowers(followerCount)}
            </div>
          </div>
        </div>

        {/* Right: Threads White Pill Follow Button */}
        {currentUser?.uid !== user.uid && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFollowToggle(user.uid);
            }}
            className={`text-xs font-semibold px-5 py-2 rounded-xl tap-press transition-all flex-shrink-0 min-w-[84px] text-center ${
              isFollowing
                ? 'border border-[#38383C] text-neutral-200 bg-transparent hover:bg-white/5'
                : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
            }`}
          >
            {isFollowing 
              ? (isAr ? 'يتابع' : 'Following') 
              : (isAr ? 'متابعة' : 'Follow')}
          </button>
        )}
      </div>
    );
  }

  // ==========================================================
  // HELPER 2: Render Autocomplete User Row (PULSE Official Image 2)
  // ==========================================================
  function renderAutocompleteUserRow(user, isTop = false) {
    if (!user) return null;
    const rawUsername = user.username ? user.username.replace('@', '').trim() : (user.uid ? `user_${user.uid.slice(0, 5)}` : 'user');
    const displayName = user.displayName || user.name || `@${rawUsername}`;

    return (
      <div
        key={`ac_${user.uid}`}
        onClick={() => onOpenUserProfile && onOpenUserProfile(user)}
        className="w-full flex items-center gap-3.5 py-3 px-4 hover:bg-white/[0.02] active:bg-white/[0.04] cursor-pointer tap-press transition-colors"
      >
        <img
          src={user.avatar || DEFAULT_AVATAR}
          alt={displayName}
          className="w-10 h-10 rounded-full aspect-square object-cover border border-[#222226] flex-shrink-0"
          onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-white tracking-tight truncate" dir="ltr">
              {rawUsername}
            </span>
            {user.isVerified && (
              <VerifiedBadge size={14} />
            )}
          </div>
          <div className="text-[13px] text-[#777777] font-normal truncate mt-0.5">
            {displayName}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * PULSE Official Unified Search & Discovery Filter Bottom Sheet
 * Hardware-accelerated, portaled to document.body, with swipe-down-to-dismiss gesture
 */
function SearchFilterModal({
  isOpen,
  onClose,
  isAr,
  draftSortOrder,
  setDraftSortOrder,
  draftFilterType,
  setDraftFilterType,
  draftFilterTimeframe,
  setDraftFilterTimeframe,
  draftFilterScope,
  setDraftFilterScope,
  onApply,
  onReset,
  hasActiveFilters
}) {
  const { containerProps, backdropStyle } = useSwipeDownDismiss({
    onClose,
    enabled: isOpen
  });

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-end justify-center p-0 animate-fade-in select-none"
      style={backdropStyle}
      onClick={onClose}
    >
      <div
        {...containerProps}
        className="w-full max-w-lg bg-[#121214] border-t border-[#242428] rounded-t-[32px] p-5 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl animate-slide-up flex flex-col will-change-transform max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Pull Handle */}
        <div className="w-10 h-1 bg-[#3A3A40] rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing flex-shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E1E22] flex-shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-white stroke-[2]" />
            <h3 className="text-base font-bold text-white tracking-wide">
              {isAr ? 'خيارات وتصفية البحث' : 'Search filters'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1C20] hover:bg-[#28282E] text-neutral-400 hover:text-white flex items-center justify-center transition-colors tap-press"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1 pl-1 no-scrollbar">
          
          {/* Section 1: Sort Order */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              {isAr ? 'الترتيب والتصنيف' : 'Sort By'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'top', label: isAr ? 'الأكثر تفاعلاً' : 'Top / Relevant' },
                { id: 'latest', label: isAr ? 'الأحدث زمنيًا' : 'Latest' },
                { id: 'likes', label: isAr ? 'الأكثر إعجاباً' : 'Most Liked' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    try { hapticsService.selection?.(); } catch {}
                    setDraftSortOrder(item.id);
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all tap-press text-center truncate ${
                    draftSortOrder === item.id
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-[#18181C] text-neutral-300 hover:bg-[#202026] border border-[#24242A]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Content Type */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              {isAr ? 'نوع المحتوى' : 'Content Type'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: isAr ? 'جميع النبضات' : 'All Pulses' },
                { id: 'media', label: isAr ? 'وسائط وصور فقط' : 'Media / Photos' },
                { id: 'voice', label: isAr ? 'تسجيلات صوتية' : 'Voice Notes' },
                { id: 'verified', label: isAr ? 'حسابات موثقة فقط' : 'Verified Accounts' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    try { hapticsService.selection?.(); } catch {}
                    setDraftFilterType(item.id);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all tap-press text-center truncate ${
                    draftFilterType === item.id
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-[#18181C] text-neutral-300 hover:bg-[#202026] border border-[#24242A]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Timeframe */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              {isAr ? 'الفترة الزمنية' : 'Timeframe'}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all', label: isAr ? 'أي وقت' : 'Anytime' },
                { id: '24h', label: isAr ? '24 ساعة' : '24 Hours' },
                { id: 'week', label: isAr ? 'أسبوع' : 'Week' },
                { id: 'month', label: isAr ? 'شهر' : 'Month' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    try { hapticsService.selection?.(); } catch {}
                    setDraftFilterTimeframe(item.id);
                  }}
                  className={`py-2.5 px-1.5 rounded-xl text-xs font-semibold transition-all tap-press text-center truncate ${
                    draftFilterTimeframe === item.id
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-[#18181C] text-neutral-300 hover:bg-[#202026] border border-[#24242A]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Creator Scope */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              {isAr ? 'نطاق الحسابات' : 'Creator Scope'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all', label: isAr ? 'جميع المبدعين' : 'All Creators' },
                { id: 'following', label: isAr ? 'من أتابعهم فقط' : 'Accounts I Follow' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    try { hapticsService.selection?.(); } catch {}
                    setDraftFilterScope(item.id);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all tap-press text-center truncate ${
                    draftFilterScope === item.id
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-[#18181C] text-neutral-300 hover:bg-[#202026] border border-[#24242A]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Action Buttons Footer */}
        <div className="pt-3 border-t border-[#1E1E22] flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={`py-3 px-5 rounded-2xl text-xs font-bold transition-all tap-press ${
              hasActiveFilters
                ? 'border border-[#38383E] text-neutral-300 hover:text-white hover:bg-white/5 active:bg-white/10'
                : 'border border-[#222226] text-neutral-600 cursor-not-allowed'
            }`}
          >
            {isAr ? 'إعادة ضبط' : 'Reset'}
          </button>

          <button
            type="button"
            onClick={onApply}
            className="flex-1 py-3 px-6 rounded-2xl bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-bold text-sm shadow-md tap-press transition-all text-center"
          >
            {isAr ? 'تطبيق الفلاتر' : 'Apply filters'}
          </button>
        </div>

      </div>
    </div>
  );
}
