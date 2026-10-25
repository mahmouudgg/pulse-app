import os
import re

def fix_ads_manager():
    p = 'src/pages/AdsManagerPage.jsx'
    if not os.path.exists(p): return
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace('text-emerald-400', 'text-blue-400')
    content = content.replace('bg-emerald-500/10', 'bg-blue-500/10')
    content = content.replace('border-emerald-500/20', 'border-blue-500/20')
    content = content.replace('border-emerald-500/30', 'border-blue-500/30')
    content = content.replace('bg-emerald-500', 'bg-blue-500')
    content = content.replace('bg-amber-500/10', 'bg-neutral-800/80')
    content = content.replace('border-amber-500/20', 'border-neutral-700')
    content = content.replace('text-amber-300', 'text-neutral-300')
    content = content.replace('text-amber-400', 'text-neutral-300')
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print('Fixed AdsManagerPage')

def fix_insights():
    p = 'src/pages/InsightsPage.jsx'
    if not os.path.exists(p): return
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace('text-emerald-400', 'text-blue-400')
    content = content.replace('bg-emerald-500/10', 'bg-blue-500/10')
    content = content.replace('border-emerald-500/20', 'border-blue-500/20')
    content = content.replace('bg-amber-500/10', 'bg-neutral-800')
    content = content.replace('border-amber-500/20', 'border-neutral-700')
    content = content.replace('text-amber-300', 'text-neutral-300')
    content = content.replace('text-amber-400', 'text-neutral-300')
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print('Fixed InsightsPage')

def fix_auth():
    p = 'src/pages/AuthPage.jsx'
    if not os.path.exists(p): return
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace('bg-emerald-950/40', 'bg-neutral-900')
    content = content.replace('border-emerald-800/40', 'border-neutral-800')
    content = content.replace('text-emerald-300', 'text-white')
    content = content.replace('text-emerald-400', 'text-blue-400')
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print('Fixed AuthPage')

def fix_supervision():
    p = 'src/pages/SupervisionPage.jsx'
    if not os.path.exists(p): return
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace("usagePercent > 75 ? 'bg-amber-400' : 'bg-white'", "'bg-white'")
    content = content.replace('text-emerald-400', 'text-blue-400')
    content = content.replace('bg-emerald-500/10', 'bg-blue-500/10')
    content = content.replace('border-emerald-500/20', 'border-blue-500/20')
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print('Fixed SupervisionPage')

def fix_follow_invite():
    p = 'src/pages/FollowInvitePage.jsx'
    if not os.path.exists(p): return
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace('bg-emerald-500/10', 'bg-blue-500/10')
    content = content.replace('border-emerald-500/20', 'border-blue-500/20')
    content = content.replace('text-emerald-400', 'text-blue-400')
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print('Fixed FollowInvitePage')

def fix_profile():
    p = 'src/components/ProfilePage.jsx'
    if not os.path.exists(p): return
    with open(p, 'r', encoding='utf-8') as f: content = f.read()
    content = content.replace('hover:text-emerald-400', 'hover:text-blue-400')
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print('Fixed ProfilePage')

if __name__ == '__main__':
    fix_ads_manager()
    fix_insights()
    fix_auth()
    fix_supervision()
    fix_follow_invite()
    fix_profile()
