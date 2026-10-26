import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('src/services/storageService.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if any(k in line for k in ['getUser', 'subscribeToUser', 'Replies', 'replies', 'getUsers']):
        print(f'{i+1}: {line.strip()[:80]}')
