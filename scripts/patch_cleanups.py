# Clean any remaining symbols from SettingsPage.jsx
path = r'src/pages/SettingsPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

target = '<span className="text-[#0095F6] text-xs">\u2713</span>'
if target in c:
    c = c.replace(target, '<Check size={12} className="text-white stroke-[3] inline" />')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Replaced checkmark in SettingsPage')
else:
    print('Target not found in SettingsPage')
