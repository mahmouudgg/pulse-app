import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  Info,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Repeat2,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { adService } from '../services/adService';
import { Megaphone, MousePointer, Target, ExternalLink } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useLanguage } from '../context/LanguageContext';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

export const InsightsPage = ({ onBack, currentUser, userPosts = [] }) => {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'audience'
  const [overviewRange, setOverviewRange] = useState('30d'); // '7d' | '30d' | '90d'
  const [postsFilter, setPostsFilter] = useState('all'); // 'all' | 'views' | 'likes' | 'reposts'
  const [showOverviewDropdown, setShowOverviewDropdown] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // Fetch ads created by this user
  const userAds = useMemo(() => {
    return adService.getUserAds(currentUser?.uid);
  }, [currentUser?.uid]);
  const hasAds = userAds.length > 0;

  // Compute live analytics data
  const insights = useMemo(() => {
    return analyticsService.getUserInsights(currentUser, userPosts, overviewRange);
  }, [currentUser, userPosts, overviewRange]);

  // Compute Ad Metrics
  const adMetrics = useMemo(() => {
    if (!userAds || userAds.length === 0) return null;
    const totalImpressions = userAds.reduce((acc, a) => acc + (a.impressionsCount || 0), 0);
    const totalClicks = userAds.reduce((acc, a) => acc + (a.clicksCount || 0), 0);
    const totalLikes = userAds.reduce((acc, a) => acc + (a.likesCount || 0), 0);
    const totalBudget = userAds.reduce((acc, a) => acc + (a.dailyBudget || 10), 0);
    const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
    const activeCampaigns = userAds.filter((a) => a.status === 'active' || a.status === 'approved').length;
    return {
      totalImpressions,
      totalClicks,
      totalLikes,
      totalBudget,
      avgCtr,
      activeCampaigns,
      campaignsCount: userAds.length
    };
  }, [userAds]);

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      try {
        Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
      setActiveTab(tab);
    }
  };

  // Filtered and sorted posts
  const filteredPosts = useMemo(() => {
    let list = [...(insights.postsAnalytics || [])];
    if (postsFilter === 'views') {
      list.sort((a, b) => b.viewsCount - a.viewsCount);
    } else if (postsFilter === 'likes') {
      list.sort((a, b) => b.likesCount - a.likesCount);
    } else if (postsFilter === 'reposts') {
      list.sort((a, b) => b.repostsCount - a.repostsCount);
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [insights.postsAnalytics, postsFilter]);

  // SVG Chart calculation
  const chartData = useMemo(() => {
    const points = insights.timeline || [];
    if (points.length === 0) return { path: '', areaPath: '', maxVal: 0, coords: [] };

    const maxVal = Math.max(...points.map((p) => p.views), 10);
    const width = 360;
    const height = 140;
    const paddingX = 16;
    const paddingY = 20;

    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / Math.max(points.length - 1, 1)) * innerWidth;
      const y = height - paddingY - (p.views / maxVal) * innerHeight;
      return { x, y, ...p };
    });

    // Build smooth curve line
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      path += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaPath = `${path} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

    return { path, areaPath, maxVal, coords, width, height };
  }, [insights.timeline]);

  const pageContent = (
    <div className="min-h-screen bg-black text-white flex flex-col select-none" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-[#1E1E22] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 -mx-2 rounded-full flex items-center justify-center hover:bg-[#1C1C20] active:scale-90 transition-all text-white tap-press"
          aria-label="Back"
        >
          <ChevronLeft size={24} className={isAr ? 'rotate-180' : ''} />
        </button>

        <h1 className="text-base font-bold tracking-tight text-white">
          {isAr ? 'الرؤى والتحليلات' : 'Insights'}
        </h1>

        <div className="w-10"></div>
      </header>

      {/* Tabs Row */}
      <div className="flex border-b border-[#1E1E22] bg-black">
        <button
          onClick={() => handleTabChange('overview')}
          className={`flex-1 py-3 text-center text-sm font-semibold relative transition-colors ${
            activeTab === 'overview' ? 'text-white' : 'text-[#777777] hover:text-[#AAAAAA]'
          }`}
        >
          <span>{isAr ? 'نظرة عامة' : 'Overview'}</span>
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></div>
          )}
        </button>

        <button
          onClick={() => handleTabChange('audience')}
          className={`flex-1 py-3 text-center text-sm font-semibold relative transition-colors ${
            activeTab === 'audience' ? 'text-white' : 'text-[#777777] hover:text-[#AAAAAA]'
          }`}
        >
          <span>{isAr ? 'الجمهور' : 'Audience'}</span>
          {activeTab === 'audience' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></div>
          )}
        </button>

        {hasAds && (
          <button
            onClick={() => handleTabChange('ads')}
            className={`flex-1 py-3 text-center text-sm font-semibold relative transition-colors ${
              activeTab === 'ads' ? 'text-white' : 'text-[#777777] hover:text-[#AAAAAA]'
            }`}
          >
            <span>{isAr ? 'الحملات الإعلانية' : 'Ads & Campaigns'}</span>
            {activeTab === 'ads' && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></div>
            )}
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'overview' ? (
          /* TAB 1: OVERVIEW */
          <div className="p-4 space-y-6">
            {/* Section 1: Profile Views Header & Timeframe */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 text-white font-bold text-base">
                  <span>{isAr ? 'الملف الشخصي' : 'Profile'}</span>
                  <Info size={15} className="text-[#66666A]" />
                </div>

                {/* Timeframe Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowOverviewDropdown(!showOverviewDropdown)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93] bg-[#18181A] border border-[#26262B] px-3 py-1.5 rounded-full hover:bg-[#222226] active:scale-95 transition-all"
                  >
                    <span>
                      {overviewRange === '7d'
                        ? (isAr ? 'آخر 7 أيام' : 'Past 7 days')
                        : overviewRange === '90d'
                        ? (isAr ? 'آخر 90 يوماً' : 'Past 90 days')
                        : (isAr ? 'آخر 30 يوماً' : 'Past 30 days')}
                    </span>
                    <ChevronDown size={14} />
                  </button>

                  {showOverviewDropdown && (
                    <div className={`absolute ${isAr ? 'left-0' : 'right-0'} mt-2 w-36 bg-[#1C1C20] border border-[#2E2E34] rounded-2xl shadow-2xl py-1 z-50 animate-fade-in`}>
                      {[
                        { id: '7d', label: isAr ? 'آخر 7 أيام' : 'Past 7 days' },
                        { id: '30d', label: isAr ? 'آخر 30 يوماً' : 'Past 30 days' },
                        { id: '90d', label: isAr ? 'آخر 90 يوماً' : 'Past 90 days' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setOverviewRange(item.id);
                            setShowOverviewDropdown(false);
                          }}
                          className={`w-full text-start px-4 py-2 text-xs font-medium transition-colors ${
                            overviewRange === item.id
                              ? 'text-white bg-[#2A2A30] font-bold'
                              : 'text-[#AAAAAA] hover:bg-[#222226]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Core Threads KPI Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* 1. Total Impressions / Views */}
                <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                  <div className="text-xs text-[#8E8E93] font-medium mb-1">{isAr ? 'إجمالي الظهور والمشاهدات' : 'Impressions & Views'}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white tracking-tight">
                      {insights.profileViews.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-[#4ADE80]">{insights.viewsGrowth}</span>
                  </div>
                </div>

                {/* 2. Total Interactions */}
                <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                  <div className="text-xs text-[#8E8E93] font-medium mb-1">{isAr ? 'إجمالي التفاعلات' : 'Total Interactions'}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white tracking-tight">
                      {(insights.totalInteractions || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-[#4ADE80]">{insights.viewersGrowth}</span>
                  </div>
                </div>

                {/* 3. Engagement Rate % */}
                <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                  <div className="text-xs text-[#8E8E93] font-medium mb-1">{isAr ? 'معدل التفاعل' : 'Engagement Rate'}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white tracking-tight">
                      %{insights.avgEngagementRate || '0.0'}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">THR</span>
                  </div>
                </div>

                {/* 4. Profile Visits */}
                <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                  <div className="text-xs text-[#8E8E93] font-medium mb-1">{isAr ? 'زيارات الحساب' : 'Profile Visits'}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white tracking-tight">
                      {(insights.profileVisits || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-[#4ADE80]">+12.5%</span>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Chart */}
              <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4 pt-5">
                <div className="relative w-full h-36">
                  {chartData.coords.length > 0 ? (
                    <svg
                      viewBox={`0 0 ${chartData.width} ${chartData.height}`}
                      className="w-full h-full overflow-visible"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Subtle horizontal grid lines */}
                      {[0.25, 0.5, 0.75].map((ratio) => (
                        <line
                          key={ratio}
                          x1="16"
                          y1={chartData.height * ratio}
                          x2={chartData.width - 16}
                          y2={chartData.height * ratio}
                          stroke="#24242A"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                      ))}

                      {/* Gradient Fill under line */}
                      <path d={chartData.areaPath} fill="url(#chartGradient)" />

                      {/* Line stroke with 120 FPS draw-in animation */}
                      <path
                        key={`path-${overviewRange}`}
                        d={chartData.path}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-chart-draw"
                      />

                      {/* Point indicator if hovered */}
                      {hoveredPointIndex !== null && chartData.coords[hoveredPointIndex] && (
                        <circle
                          cx={chartData.coords[hoveredPointIndex].x}
                          cy={chartData.coords[hoveredPointIndex].y}
                          r="5"
                          fill="#FFFFFF"
                          stroke="#000000"
                          strokeWidth="2"
                        />
                      )}
                    </svg>
                  ) : null}
                </div>

                {/* X-Axis dates */}
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#222226] text-[11px] text-[#77777A] font-medium" dir="ltr">
                  {chartData.coords
                    .filter((_, i) => i === 0 || i === Math.floor(chartData.coords.length / 2) || i === chartData.coords.length - 1)
                    .map((item, idx) => (
                      <span key={idx}>{item.label}</span>
                    ))}
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-[#1E1E22]"></div>

            {/* Section 2: Pulses Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-white font-bold text-base">
                  <span>{isAr ? 'النبضات' : 'Pulses'}</span>
                  <Info size={15} className="text-[#66666A]" />
                </div>
                <span className="text-xs text-[#8E8E93] bg-[#18181A] px-2.5 py-1 rounded-full border border-[#242428]">
                  {isAr ? 'آخر 90 يوماً' : 'Past 90 days'}
                </span>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {[
                  { id: 'all', label: isAr ? 'الكل' : 'All' },
                  { id: 'views', label: isAr ? 'الأكثر مشاهدة' : 'Top Views' },
                  { id: 'likes', label: isAr ? 'الأكثر إعجاباً' : 'Top Likes' },
                  { id: 'reposts', label: isAr ? 'الأكثر مشاركة' : 'Top Reposts' }
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setPostsFilter(chip.id)}
                    className={`text-xs px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                      postsFilter === chip.id
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#18181A] text-[#8E8E93] hover:text-white border border-[#26262B]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Posts List */}
              <div className="mt-3 space-y-2">
                {filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#141416] border border-[#222226] rounded-2xl p-3.5 flex items-center justify-between hover:bg-[#18181B] transition-colors"
                    >
                      {/* Post snippet & preview */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {post.imageUrl ? (
                          <img
                            src={post.imageUrl}
                            alt="Post media"
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#222228] border border-white/5 flex items-center justify-center flex-shrink-0 text-white font-mono text-xs">
                            <Layers size={18} className="text-[#77777D]" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium line-clamp-1 truncate">
                            {post.content || (isAr ? 'نبضة وسائط بدون نص' : 'Media pulse without text')}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[#8E8E93]">
                            <span className="flex items-center gap-1">
                              <Heart size={12} className="text-[#77777A]" />
                              <span>{post.likesCount}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle size={12} className="text-[#77777A]" />
                              <span>{post.repliesCount}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Repeat2 size={12} className="text-[#77777A]" />
                              <span>{post.repostsCount}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Views Count Pill */}
                      <div className="mx-2 flex-shrink-0 flex items-center gap-1.5 bg-[#202026] px-2.5 py-1.5 rounded-xl border border-white/5">
                        <Eye size={13} className="text-[#AAAAAF]" />
                        <span className="text-xs font-bold text-white tracking-tight">
                          {post.viewsCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-[#121214] border border-[#202024] rounded-2xl">
                    <p className="text-[#77777A] text-sm">{isAr ? 'لا توجد نبضات متاحة في هذه الفترة' : 'No pulses available for this period'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'audience' ? (
          /* TAB 2: AUDIENCE */
          <div className="p-4 space-y-6">
            {/* Header: Viewers Overview */}
            <div className="bg-[#141416] border border-[#222226] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-white font-bold text-base">
                  <span>{isAr ? 'المشاهدون' : 'Viewers'}</span>
                  <Info size={15} className="text-[#66666A]" />
                </div>
                <span className="text-xs text-[#8E8E93] bg-[#18181A] px-2.5 py-1 rounded-full border border-[#242428]">
                  {isAr ? 'آخر 30 يوماً' : 'Past 30 days'}
                </span>
              </div>

              <div className="text-3xl font-extrabold text-white tracking-tight">
                {insights.audience.totalViewers.toLocaleString()}
              </div>
              <div className="text-xs text-[#4ADE80] font-semibold mt-1">
                {insights.audience.growthSinceStart} {isAr ? 'منذ الشهر الماضي' : 'vs last month'}
              </div>
            </div>

            {/* Viewer Types Section */}
            <div>
              <div className="flex items-center gap-1.5 text-white font-bold text-base mb-3">
                <span>{isAr ? 'تصنيف المشاهدين' : 'Viewer Breakdown'}</span>
                <Info size={15} className="text-[#66666A]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Followers Card */}
                <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                  <div className="text-xs text-[#8E8E93] font-medium mb-1">{isAr ? 'المتابعون' : 'Followers'}</div>
                  <div className="text-2xl font-extrabold text-white mb-2">
                    %{insights.audience.followersPct}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#26262C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${insights.audience.followersPct}%` }}
                    ></div>
                  </div>
                  <div className="text-[11px] text-[#77777D] mt-2">
                    {insights.audience.followersCount} {isAr ? 'مشاهد متابع' : 'follower viewers'}
                  </div>
                </div>

                {/* Non-followers Card */}
                <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                  <div className="text-xs text-[#8E8E93] font-medium mb-1">{isAr ? 'غير المتابعين' : 'Non-followers'}</div>
                  <div className="text-2xl font-extrabold text-white mb-2">
                    %{insights.audience.nonFollowersPct}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#26262C] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#66666F] rounded-full transition-all duration-500"
                      style={{ width: `${insights.audience.nonFollowersPct}%` }}
                    ></div>
                  </div>
                  <div className="text-[11px] text-[#77777D] mt-2">
                    {insights.audience.nonFollowersCount} {isAr ? 'غير متابع وصلوا إليك' : 'non-followers reached'}
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Breakdown */}
            <div className="bg-[#141416] border border-[#222226] rounded-2xl p-5">
              <div className="text-white font-bold text-base mb-4">{isAr ? 'توزيع التفاعل على حسابك' : 'Engagement Breakdown'}</div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#8E8E93]">
                    <Heart size={15} />
                    <span>{isAr ? 'إجمالي الإعجابات' : 'Total Likes'}</span>
                  </div>
                  <span className="font-bold text-white">
                    {insights.audience.engagementDistribution.likes}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#8E8E93]">
                    <MessageCircle size={15} />
                    <span>{isAr ? 'الردود والتعليقات' : 'Replies & Comments'}</span>
                  </div>
                  <span className="font-bold text-white">
                    {insights.audience.engagementDistribution.replies}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-[#8E8E93]">
                    <Repeat2 size={15} />
                    <span>{isAr ? 'إعادات النشر' : 'Reposts'}</span>
                  </div>
                  <span className="font-bold text-white">
                    {insights.audience.engagementDistribution.reposts}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 3: ADS ANALYTICS */
          <div className="p-4 space-y-6">
            {/* Header: Ads Overview */}
            <div className="bg-[#141416] border border-[#222226] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-white" />
                  <span className="text-base font-bold text-white tracking-tight">
                    {isAr ? 'أداء الحملات الإعلانية' : 'Campaign Performance'}
                  </span>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {adMetrics?.activeCampaigns || 0} {isAr ? 'حملات نشطة' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isAr
                  ? 'مؤشرات الأداء الفعلية المحسوبة بدقة لظهور وتفاعل حملاتك الإعلانية داخل خلاصات PULSE.'
                  : 'Real-time verified metrics for your sponsored campaigns across PULSE feeds.'}
              </p>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Impressions Card */}
              <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] font-medium mb-1">
                  <Eye size={13} />
                  <span>{isAr ? 'مرات الظهور' : 'Impressions'}</span>
                </div>
                <div className="text-2xl font-extrabold text-white tracking-tight">
                  {(adMetrics?.totalImpressions || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-[#4ADE80] mt-1 block">
                  {isAr ? 'ظهور فعلي وموثق' : 'Verified feed views'}
                </span>
              </div>

              {/* Clicks Card */}
              <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] font-medium mb-1">
                  <MousePointer size={13} />
                  <span>{isAr ? 'إجمالي النقرات' : 'Clicks'}</span>
                </div>
                <div className="text-2xl font-extrabold text-white tracking-tight">
                  {(adMetrics?.totalClicks || 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  {isAr ? 'نقرة على الرابط' : 'CTA click actions'}
                </span>
              </div>

              {/* CTR Card */}
              <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] font-medium mb-1">
                  <TrendingUp size={13} />
                  <span>{isAr ? 'معدل النقر (CTR)' : 'CTR'}</span>
                </div>
                <div className="text-2xl font-extrabold text-white tracking-tight">
                  {adMetrics?.avgCtr || '0.00'}%
                </div>
                <span className="text-[11px] text-[#4ADE80] mt-1 block">
                  {isAr ? 'معدل تحويل قياسي' : 'Conversion efficiency'}
                </span>
              </div>

              {/* Total Budget Card */}
              <div className="bg-[#141416] border border-[#222226] rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-xs text-[#8E8E93] font-medium mb-1">
                  <Target size={13} />
                  <span>{isAr ? 'الميزانية اليومية' : 'Daily Budget'}</span>
                </div>
                <div className="text-2xl font-extrabold text-white tracking-tight">
                  ${adMetrics?.totalBudget || 0}
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  {isAr ? 'لكل الحملات' : 'Across all campaigns'}
                </span>
              </div>
            </div>

            {/* Campaign List Breakdown */}
            <div className="space-y-3">
              <div className="text-white font-bold text-base px-1">
                {isAr ? 'قائمة الحملات التابعة لك' : 'Your Campaigns'} ({userAds.length})
              </div>

              <div className="space-y-3">
                {userAds.map((ad) => {
                  const ctr = ad.impressionsCount > 0 ? ((ad.clicksCount / ad.impressionsCount) * 100).toFixed(2) : '0.00';
                  return (
                    <div key={ad.id} className="bg-[#141416] border border-[#222226] rounded-2xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">{ad.brandName}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                ad.status === 'active' || ad.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : ad.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                  : ad.status === 'rejected'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {ad.status === 'active' || ad.status === 'approved'
                                ? (isAr ? 'نشط ومعتمد' : 'Active')
                                : ad.status === 'pending'
                                ? (isAr ? 'قيد المراجعة' : 'Pending')
                                : ad.status === 'rejected'
                                ? (isAr ? 'مرفوض' : 'Rejected')
                                : (isAr ? 'متوقف' : 'Paused')}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                            {ad.content}
                          </p>
                        </div>
                        {ad.mediaUrl && (
                          <img
                            src={ad.mediaUrl}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                          />
                        )}
                      </div>

                      {/* Campaign Micro Stats */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F1F24] text-center text-xs">
                        <div className="bg-[#18181C] py-2 rounded-xl">
                          <span className="text-[11px] text-neutral-400 block">{isAr ? 'الظهور' : 'Views'}</span>
                          <span className="font-bold text-white">{(ad.impressionsCount || 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-[#18181C] py-2 rounded-xl">
                          <span className="text-[11px] text-neutral-400 block">{isAr ? 'النقرات' : 'Clicks'}</span>
                          <span className="font-bold text-white">{(ad.clicksCount || 0).toLocaleString()}</span>
                        </div>
                        <div className="bg-[#18181C] py-2 rounded-xl">
                          <span className="text-[11px] text-neutral-400 block">CTR</span>
                          <span className="font-bold text-emerald-400">{ctr}%</span>
                        </div>
                      </div>

                      {/* Destination URL */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-neutral-500 font-mono truncate text-[11px]" dir="ltr">
                          {ad.displayUrl || ad.destinationUrl}
                        </span>
                        <a
                          href={ad.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-white hover:underline font-medium text-[11px]"
                        >
                          <span>{ad.ctaText || (isAr ? 'زيارة الرابط' : 'Visit link')}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return onBack ? (
    <SwipeBackWrapper onBack={onBack}>{pageContent}</SwipeBackWrapper>
  ) : (
    pageContent
  );
};
