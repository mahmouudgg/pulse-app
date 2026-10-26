import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('src/services/storageService.js', 'r', encoding='utf-8') as f:
    text = f.read()
print('subscribeToUser exists:', 'subscribeToUser(' in text or 'subscribeToUser (' in text)
