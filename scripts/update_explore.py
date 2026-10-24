code = '''import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Check, X, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft,
  ChevronDown, SlidersHorizontal, SquarePen, MoreHorizontal, Clock, Hash,
  Users, UserCheck
} from 'lucide-react';
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

  // Results Controls:
  const [sortOrder, setSortOrder] = useState('top'); // 'top' | 'latest'
  const [activeResultsTab, setActiveResultsTab] = useState('posts'); // 'posts' | 'profiles'
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const [followingMap, setFollowingMap] = useState({});
  const [recentSearches, setRecentSearches] = useState(() => searchEngine.getRecentSearches() || []);

  const users = storageService.getUsers() || [];
  const posts = storageService.getPosts() || [];

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

  // Suggested Profiles (Threads 1:1 - Image 1)
  const suggestedProfiles = useMemo(() => {
    return rankingEngine.recommendCreators(currentUser, users, posts);
  }, [currentUser, users, posts]);

  // Hybrid Autocomplete Data (Threads 1:1 - Image 2)
  const autocomplete = useMemo(() => {
    if (!searchQuery.trim()) return { topUser: null, searchTerms: [], otherUsers: [] };
    return searchEngine.getAutocompleteHybrid(searchQuery, users, posts);
  }, [searchQuery, users, posts]);

  // Full Search Results (Threads 1:1 - Image 3)
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

  // Sorted Posts for Results View
  const sortedPosts = useMemo(() => {
    const list = [...(searchResults.posts || [])];
    if (sortOrder === 'latest') {
      return list.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    }
    // 'top' - sorted by matchScore & engagement
    return list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }, [searchResults.posts, sortOrder]);

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

  // Format follower count in Silicon Valley notation (e.g. 293K followers, 167K followers)
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
              onClick={() => setShowFilterSheet(true)}
              className="p-2 text-neutral-400 hover:text-white tap-press transition-colors flex-shrink-0"
              title={isAr ? 'خيارات الفلترة' : 'Filters'}
            >
              <SlidersHorizontal size={20} strokeWidth={1.8} />
            </button>
          )}

          {/* Results Mode: Compose + More Action Icons on Right (Image 3) */}
          {currentMode === 'results' && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onOpenCompose) onOpenCompose();
                }}
                className="p-1.5 text-white hover:opacity-80 active:opacity-60 tap-press transition-opacity"
                title={isAr ? 'نبضة جديدة' : 'New thread'}
              >
                <SquarePen size={21} strokeWidth={1.9} />
              </button>
              <button
                type="button"
                onClick={() => setShowSortSheet(true)}
                className="p-1.5 text-white hover:opacity-80 active:opacity-60 tap-press transition-opacity"
                title={isAr ? 'ترتيب وفرز' : 'Sort & Options'}
              >
                <MoreHorizontal size={21} strokeWidth={1.9} />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. STATE: IDLE (Threads 1:1 Image 1)                     */}
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
      {/* 3. STATE: TYPING / AUTOCOMPLETE (Threads 1:1 Image 2)    */}
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
      {/* 4. STATE: RESULTS VIEW (Threads 1:1 Image 3)             */}
      {/* ======================================================== */}
      {currentMode === 'results' && (
        <div>
          
          {/* Sub-bar Filter Row (Threads 1:1: "Top posts v" & "Related profiles >") */}
          <div className="px-4 border-b border-[#18181A] pb-2.5 pt-1 mb-2 flex items-center justify-between">
            
            {/* Left: Top posts dropdown toggle */}
            <button
              type="button"
              onClick={() => setShowSortSheet(true)}
              className="flex items-center gap-1.5 text-sm font-bold text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"
            >
              <span>
                {sortOrder === 'top' 
                  ? (isAr ? 'أبرز المنشورات' : 'Top posts') 
                  : (isAr ? 'أحدث المنشورات' : 'Latest')}
              </span>
              <ChevronDown size={16} className="text-neutral-400" />
            </button>

            {/* Right: Related profiles toggle link */}
            {searchResults.users && searchResults.users.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveResultsTab(activeResultsTab === 'posts' ? 'profiles' : 'posts')}
                className="flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-white transition-colors tap-press"
              >
                <span>
                  {activeResultsTab === 'profiles'
                    ? (isAr ? 'عرض المنشورات' : 'View posts')
                    : (isAr ? `الحسابات ذات الصلة (${searchResults.users.length})` : `Related profiles (${searchResults.users.length})`)}
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
                searchResults.users && searchResults.users.length > 0 ? (
                  <div className="pt-1">
                    <div className="px-4 py-2 text-xs font-semibold text-neutral-400">
                      {isAr ? 'لم يتم العثور على نبضات، إليك الحسابات ذات الصلة:' : 'No threads found. Here are related profiles:'}
                    </div>
                    {searchResults.users.map((user) => renderSuggestedProfileRow(user))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-xs text-neutral-500">
                    <Search size={32} className="mx-auto mb-3 text-neutral-600 stroke-[1.5]" />
                    <div className="text-white font-medium mb-1">
                      {isAr ? `لا توجد نتائج لـ "${searchQuery}"` : `No results found for "${searchQuery}"`}
                    </div>
                    <div>{isAr ? 'جرب البحث بكلمات أخرى أو تصفح الحسابات المقترحة.' : 'Try a different keyword or explore suggested creators.'}</div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Results: Related Profiles View */}
          {activeResultsTab === 'profiles' && (
            <div className="pt-1">
              {searchResults.users && searchResults.users.length > 0 ? (
                searchResults.users.map((user) => renderSuggestedProfileRow(user))
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
      {/* 5. SORT BOTTOM SHEET (Top Posts vs Latest)               */}
      {/* ======================================================== */}
      {showSortSheet && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade-in p-0">
          <div 
            className="bg-[#18181A] border-t border-[#2A2A2E] rounded-t-[28px] max-w-lg w-full p-5 text-start space-y-4 animate-slide-up shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="w-10 h-1 bg-neutral-600 rounded-full mx-auto" />
            <div className="text-base font-bold text-white px-1">
              {isAr ? 'فرز نتائج البحث' : 'Sort search results'}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setSortOrder('top');
                  setShowSortSheet(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-colors ${
                  sortOrder === 'top' ? 'bg-white/10 text-white font-bold' : 'hover:bg-white/[0.03] text-neutral-300'
                }`}
              >
                <span className="text-sm">{isAr ? 'أبرز المنشورات (الأعلى تفاعلاً)' : 'Top posts (Highest engagement)'}</span>
                {sortOrder === 'top' && <Check size={18} className="text-white" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSortOrder('latest');
                  setShowSortSheet(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-colors ${
                  sortOrder === 'latest' ? 'bg-white/10 text-white font-bold' : 'hover:bg-white/[0.03] text-neutral-300'
                }`}
              >
                <span className="text-sm">{isAr ? 'أحدث المنشورات (حسب الوقت)' : 'Latest (Newest first)'}</span>
                {sortOrder === 'latest' && <Check size={18} className="text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. FILTER OPTIONS BOTTOM SHEET                          */}
      {/* ======================================================== */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade-in p-0">
          <div 
            className="bg-[#18181A] border-t border-[#2A2A2E] rounded-t-[28px] max-w-lg w-full p-5 text-start space-y-4 animate-slide-up shadow-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            dir={isAr ? 'rtl' : 'ltr'}
          >
            <div className="w-10 h-1 bg-neutral-600 rounded-full mx-auto" />
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-white">
                {isAr ? 'خيارات وتصفية البحث' : 'Search filters'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="w-7 h-7 rounded-full bg-[#242428] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowFilterSheet(false);
                  handleExecuteSearch(searchQuery);
                }}
                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm tap-press"
              >
                {isAr ? 'تطبيق الفلترة' : 'Apply filter'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // ==========================================================
  // HELPER 1: Render Suggested Profile Row (Threads 1:1 Image 1)
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

            {/* Line 3: Follower Count (Exact Threads 1:1) */}
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
  // HELPER 2: Render Autocomplete User Row (Threads 1:1 Image 2)
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
'''

with open('src/pages/ExplorePage.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("ExplorePage.jsx rewritten to match Threads screenshots 1, 2, and 3.")
