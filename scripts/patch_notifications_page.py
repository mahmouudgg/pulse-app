import os

FILE_PATH = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\pages\NotificationsPage.jsx'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add SlidersHorizontal to import
if 'SlidersHorizontal' not in c:
    c = c.replace(
        "  Lock\n} from 'lucide-react';",
        "  Lock,\n  SlidersHorizontal\n} from 'lucide-react';"
    )
    print("Added SlidersHorizontal import")

# 2. Add settings button to header
target_h1 = """      <div className="px-4 pb-3">
        <h1 className="font-extrabold text-3xl text-white tracking-tight py-2">
          {lang === 'ar' ? 'النشاط' : 'Activity'}
        </h1>"""

replacement_h1 = """      <div className="px-4 pb-3">
        <div className="flex items-center justify-between py-2">
          <h1 className="font-extrabold text-3xl text-white tracking-tight">
            {lang === 'ar' ? 'النشاط' : 'Activity'}
          </h1>
          <button
            type="button"
            onClick={() => {
              hapticsService.light?.();
              window.dispatchEvent(new CustomEvent('pulse:open-settings', { detail: { subview: 'notifications' } }));
            }}
            className="w-9 h-9 rounded-full bg-[#18181A] border border-[#27272A] flex items-center justify-center text-neutral-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            aria-label={lang === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
            title={lang === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
          >
            <SlidersHorizontal size={17} className="stroke-[2.2]" />
          </button>
        </div>"""

if target_h1 in c:
    c = c.replace(target_h1, replacement_h1)
    print("Replaced Activity header with header + settings button")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(c)

print("Done patching NotificationsPage.jsx")
