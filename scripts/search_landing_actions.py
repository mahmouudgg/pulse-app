import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('landing/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines, 1):
    if any(k in line for k in ['handleLike', 'handleRepost', 'openComments', 'sharePost']):
        if any(k in line for k in ['button', 'onclick', 'svg']):
            print(f'{i}: {line.strip()[:110]}')
