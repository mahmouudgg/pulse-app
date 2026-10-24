import os

file_path = os.path.join('src', 'pages', 'SettingsPage.jsx')
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

start_marker = "  // 10. More Settings Sub-Page (Language & Cache)\n  if (activeSubView === 'more') {"
if start_marker not in c:
    start_marker = "  // 10. More Settings Sub-Page (Language & Cache)\r\n  if (activeSubView === 'more') {"

end_marker = "  // 12. Follow and Invite Sub-Page"
if end_marker not in c:
    end_marker = "  // 12. Follow and Invite Sub-Page"

start_idx = c.find(start_marker)
end_idx = c.find(end_marker)

assert start_idx != -1 and end_idx != -1, f"Markers not found: start={start_idx}, end={end_idx}"

new_view = """  // 10. More Settings and Permissions (Exact 1:1 match with user screenshot)
  if (activeSubView === 'more') {
    const MORE_SETTINGS_ITEMS = [
      {
        id: 'time',
        icon: Clock,
        title: isAr ? 'إدارة الوقت' : 'Time management',
        onClick: () => {
          try { hapticsService.light?.(); } catch {}
          setActiveSubView('supervision');
        }
      },
      {
        id: 'media_quality',
        icon: Film,
        title: isAr ? 'جودة الوسائط' : 'Media quality',
        onClick: () => {
          try { hapticsService.light?.(); } catch {}
          const next = mediaAutoplay === 'wifi' ? 'always' : 'wifi';
          setMediaAutoplay(next);
          localStorage.setItem('pulse_media_autoplay', next);
          showToast(isAr ? 'تم ضبط جودة الوسائط والتشغيل التلقائي' : 'Media quality and autoplay preferences updated');
        }
      },
      {
        id: 'accessibility',
        icon: Eye,
        title: isAr ? 'إمكانية الوصول' : 'Accessibility',
        onClick: () => {
          try { hapticsService.light?.(); } catch {}
          showToast(isAr ? 'تم تحسين التباين العالي وحركات AMOLED التلقائية' : 'High contrast and AMOLED animations optimized');
        }
      },
      {
        id: 'fediverse',
        icon: Globe,
        title: isAr ? 'المشاركة في شبكة فيديفيرس' : 'Fediverse sharing',
        badge: fediverseSharing ? 'BETA On' : 'BETA Off',
        onClick: () => {
          try { hapticsService.light?.(); } catch {}
          const next = !fediverseSharing;
          setFediverseSharing(next);
          localStorage.setItem('pulse_fediverse_sharing', String(next));
          showToast(next ? (isAr ? 'تم تفعيل مشاركة فيديفيرس' : 'Fediverse sharing enabled') : (isAr ? 'تم تعطيل مشاركة فيديفيرس' : 'Fediverse sharing disabled'));
        }
      },
      {
        id: 'language',
        icon: Languages,
        title: isAr ? 'اللغة' : 'Language',
        value: isAr ? 'العربية' : 'English',
        onClick: () => {
          try { hapticsService.light?.(); } catch {}
          const nextLang = lang === 'ar' ? 'en' : 'ar';
          setLang(nextLang);
          showToast(nextLang === 'ar' ? 'تم ضبط اللغة على: العربية' : 'Language set to English');
        }
      },
      {
        id: 'website_permissions',
        icon: Compass,
        title: isAr ? 'أذونات مواقع الويب' : 'Website permissions',
        onClick: () => {
          try { hapticsService.light?.(); } catch {}
          showToast(isAr ? 'أذونات الأمان والمواقع الخارجية مؤمنة ومشفرة' : 'Web permissions securely managed');
        }
      }
    ];

    return (
      <SwipeBackWrapper onBack={() => setActiveSubView(null)}>
        <div className="min-h-screen bg-black text-white pb-[calc(6.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto select-none" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Header matching main settings screen */}
          <div className="sticky top-0 z-30 bg-black px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSubView(null)}
              className="p-1 -ms-1 text-white hover:opacity-80 active:opacity-60 transition-opacity tap-press"
              title={isAr ? 'رجوع' : 'Back'}
            >
              <BackIcon size={24} strokeWidth={2} />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight truncate">
              {isAr ? 'المزيد من الإعدادات والأذونات' : 'More settings and permissions'}
            </h1>
          </div>

          {/* Clean Single-Line Items List (1:1 with Screenshot) */}
          <div className="pt-2 space-y-0">
            {MORE_SETTINGS_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="w-full flex items-center justify-between py-3.5 px-4 text-start hover:opacity-80 active:opacity-60 transition-opacity tap-press group"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <item.icon size={25} strokeWidth={1.8} className="text-white flex-shrink-0" />
                  <span className="text-[15px] font-normal text-white truncate">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-[11px] font-mono text-neutral-300 font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {item.value && (
                    <span className="text-xs text-neutral-400 font-medium font-sans">
                      {item.value}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Clean Cache and Version Strip */}
          <div className="mt-8 px-4 space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#101012] border border-[#222226] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">{isAr ? 'ذاكرة التخزين المؤقت' : 'Cache and data'}</div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{cacheSize}</div>
              </div>
              <button
                type="button"
                onClick={handleCleanCache}
                disabled={cachePurged}
                className="px-3 py-1 rounded-full bg-white text-black text-xs font-bold hover:bg-neutral-200 tap-press disabled:opacity-50 transition-all"
              >
                {cachePurged ? (isAr ? 'تم المسح' : 'Purged') : (isAr ? 'مسح' : 'Purge')}
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#101012] border border-[#222226] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">PULSE v1.0.2</div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{isAr ? 'الإصدار الرسمي المستقر' : 'Official stable release'}</div>
              </div>
              <button
                type="button"
                onClick={handleCheckUpdates}
                disabled={isCheckingUpdate}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold tap-press transition-colors flex items-center gap-1.5"
              >
                {isCheckingUpdate ? <RefreshCw size={12} className="animate-spin" /> : <span>{isAr ? 'فحص' : 'Check'}</span>}
              </button>
            </div>
          </div>
        </div>
      </SwipeBackWrapper>
    );
  }

  """

if '\r\n' in c:
    new_view = new_view.replace('\n', '\r\n')

c = c[:start_idx] + new_view + c[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Successfully updated SettingsPage.jsx More settings sub-page')
