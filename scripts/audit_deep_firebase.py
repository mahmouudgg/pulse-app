import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

DB_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com'

# Users audit
r = requests.get(f'{DB_URL}/users.json?shallow=false')
users = r.json() or {}

print('=== USERS AUDIT ===')
for uid, u in users.items():
    if not isinstance(u, dict):
        print(f'Corrupt user (not a dict): {uid}')
        continue
    uname = u.get('username')
    dname = u.get('displayName')
    email = u.get('email')
    print(f'User [{uid}]: @{uname} ({dname}) - {email}')

# Notifications audit
r = requests.get(f'{DB_URL}/notifications.json?shallow=false')
notifs = r.json() or {}
print(f'\n=== NOTIFICATIONS AUDIT ({len(notifs)} user inboxes) ===')
for uid, inbox in notifs.items():
    if isinstance(inbox, dict):
        print(f'User {uid} has {len(inbox)} notifications')

# Conversations audit
r = requests.get(f'{DB_URL}/conversations.json?shallow=false')
convs = r.json() or {}
print(f'\n=== CONVERSATIONS AUDIT ({len(convs)} convs) ===')
for cid, c in convs.items():
    if isinstance(c, dict):
        p1 = c.get('participant1')
        p2 = c.get('participant2')
        print(f'Conv [{cid}]: {p1} <-> {p2}')

# System audit
r = requests.get(f'{DB_URL}/system.json?shallow=false')
sys_data = r.json() or {}
print(f'\n=== SYSTEM AUDIT ===')
print(json.dumps(sys_data, indent=2, ensure_ascii=False))
