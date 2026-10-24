import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/PostDetailPage.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

matches = [m.start() for m in re.finditer(r'likesCount|repostsCount|AnimatedCounter', text)]
print('Matches in PostDetailPage.jsx:', len(matches))
for idx in matches[:10]:
    line_no = text[:idx].count('\n') + 1
    print(f'Line {line_no}: {text[idx:idx+80]}')
