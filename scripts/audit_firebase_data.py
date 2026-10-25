import requests
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

DB_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com'

print('Connecting to Firebase Realtime Database...')

# 1. Fetch posts
try:
    r = requests.get(f'{DB_URL}/posts.json?shallow=false', timeout=30)
    posts = r.json() or {}
except Exception as e:
    print('Error fetching posts:', e)
    posts = {}

# 2. Fetch comments
try:
    r = requests.get(f'{DB_URL}/comments.json?shallow=false', timeout=30)
    comments = r.json() or {}
except Exception as e:
    print('Error fetching comments:', e)
    comments = {}

# 3. Fetch users
try:
    r = requests.get(f'{DB_URL}/users.json?shallow=false', timeout=30)
    users = r.json() or {}
except Exception as e:
    print('Error fetching users:', e)
    users = {}

print(f'Total posts in RTDB: {len(posts)}')
print(f'Total comment root threads in RTDB: {len(comments)}')
print(f'Total users in RTDB: {len(users)}')

# Audit Sovythos posts and comments
sovythos_posts = []
broken_posts = []

for pid, p in posts.items():
    if not isinstance(p, dict):
        broken_posts.append((pid, 'Not a dict object'))
        continue
    
    author_id = p.get('authorId') or p.get('author', {}).get('uid')
    username = (p.get('author', {}).get('username') or '').lower()
    content = p.get('content') or ''
    
    is_sovythos = (username == 'sovythos' or author_id == 'user_1789917894698')
    if is_sovythos:
        sovythos_posts.append((pid, content))

    # Check for broken, hallucinated, or dummy posts
    is_broken = False
    reasons = []
    if not content.strip() and not p.get('imageUrl') and not p.get('videoUrl') and not p.get('audioUrl'):
        is_broken = True
        reasons.append('Empty content and no media')
    if 'بصفتي ذكاء' in content or 'نموذج لغوي' in content or 'as an ai' in content.lower():
        is_broken = True
        reasons.append('AI canned response')
    if content.startswith('"') and content.endswith('"') and len(content) > 20:
        reasons.append('Wrapped in quotes')
    if re.search(r'[\U00010000-\U0010ffff]', content):
        reasons.append('Contains emojis')
    if any(dummy in content.lower() for dummy in ['test test', 'asdf', 'تجربة تجربة', 'qwerty']):
        reasons.append('Dummy test content')

    if reasons:
        broken_posts.append((pid, ', '.join(reasons), content[:60]))

print('\n--- Sovythos Posts ---')
for pid, c in sovythos_posts:
    print(f'[{pid}] {c}')

print(f'\n--- Broken / Suspicious Posts Found: {len(broken_posts)} ---')
for item in broken_posts[:15]:
    print(item)

# Audit comments
sovythos_comments = []
broken_comments = []

for post_id, comm_map in comments.items():
    if not isinstance(comm_map, dict):
        continue
    for cid, c in comm_map.items():
        if not isinstance(c, dict):
            continue
        author_id = c.get('authorId') or c.get('author', {}).get('uid')
        username = (c.get('author', {}).get('username') or '').lower()
        content = c.get('content') or ''

        is_sovythos = (username == 'sovythos' or author_id == 'user_1789917894698' or c.get('isAIReply'))
        if is_sovythos:
            sovythos_comments.append((post_id, cid, content))

        reasons = []
        if 'بصفتي ذكاء' in content or 'نموذج لغوي' in content or 'as an ai' in content.lower():
            reasons.append('AI canned response')
        if re.search(r'[\U00010000-\U0010ffff]', content):
            reasons.append('Contains emojis')
        if not content.strip() and not c.get('audioUrl'):
            reasons.append('Empty content')
        if content.startswith('"') and content.endswith('"') and len(content) > 15:
            reasons.append('Wrapped in quotes')

        if reasons:
            broken_comments.append((post_id, cid, ', '.join(reasons), content[:60]))

print(f'\n--- Sovythos Comments Found: {len(sovythos_comments)} ---')
for item in sovythos_comments:
    print(f'Post [{item[0]}] Comment [{item[1]}]: {item[2]}')

print(f'\n--- Broken / Suspicious Comments Found: {len(broken_comments)} ---')
for item in broken_comments[:15]:
    print(item)
