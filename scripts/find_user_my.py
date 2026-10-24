import requests

r = requests.get('https://sahra-f4ec6-default-rtdb.firebaseio.com/users.json')
users = r.json() or {}

for uid, u in users.items():
    if isinstance(u, dict):
        uname = str(u.get('username', '')).lower()
        if uname in ['my', 'mahmoud']:
            print("Found user:", uid, u.get('username'), u.get('displayName'), "FCM:", u.get('fcmToken')[:20] if u.get('fcmToken') else "None")
