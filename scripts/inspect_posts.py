import urllib.request
import json

RTDB_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"

def check_posts():
    # Fetch shallow or limit 5 posts
    req = urllib.request.Request(f"{RTDB_URL}/posts.json?orderBy=\"$key\"&limitToLast=5")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Post sample keys:", list(data.keys()))
            for k, v in data.items():
                print(f"Key: {k}, authorId: {v.get('authorId')}, author: {type(v.get('author'))}, text/content: {(v.get('content') or v.get('text') or '')[:30]}")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    check_posts()
