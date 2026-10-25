import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

DB_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com'

r = requests.get(f'{DB_URL}/posts.json?shallow=false')
posts = r.json() or {}

print(f'Total posts: {len(posts)}')

sovythos_posts = []

for pid, p in posts.items():
    if not isinstance(p, dict):
        continue
    author_id = p.get('authorId') or p.get('author', {}).get('uid')
    username = (p.get('author', {}).get('username') or '').lower()
    
    if username == 'sovythos' or author_id == 'user_1789917894698' or pid.startswith(('pulse_sovythos_', 'pulse_sov_')):
        sovythos_posts.append((pid, p.get('content', ''), p.get('createdAt', '')))

print(f'Total Sovythos posts: {len(sovythos_posts)}\n')
for pid, content, cat in sorted(sovythos_posts, key=lambda x: x[2]):
    print(f'ID: {pid}')
    print(f'Time: {cat}')
    print(f'Content: {content}')
    print('-'*50)
