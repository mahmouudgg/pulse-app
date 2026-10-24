import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/SettingsPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

matches = [m.start() for m in re.finditer(r'activeSubView\s*===?\s*[\'"]content', text)]
for idx in matches:
    line_no = text[:idx].count('\n') + 1
    print(f'Line {line_no}: {text[idx:idx+120]}')
