with open('src/pages/SettingsPage.jsx', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if any(term in line.lower() for term in ['المزيد من الإعدادات', 'more_settings', 'subview', 'subscription', 'verification', 'time_management', 'إدارة الوقت']):
            print(f'{i}: {line.strip()[:100].encode("ascii", "replace").decode()}')
