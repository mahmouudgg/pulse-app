import requests

r = requests.get('https://sahra-f4ec6-default-rtdb.firebaseio.com/posts.json')
posts = r.json() or {}

my_posts = []
for pid, p in posts.items():
    if isinstance(p, dict) and (p.get('authorId') == 'dev_mahmoud_yasser' or (p.get('author') or {}).get('uid') == 'dev_mahmoud_yasser'):
        my_posts.append((pid, p.get('content')[:40]))

print(f"Total user posts: {len(my_posts)}")
for pid, content in my_posts[:3]:
    print("Post:", pid, "Content:", content)
