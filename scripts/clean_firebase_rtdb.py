import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

DB_URL = 'https://sahra-f4ec6-default-rtdb.firebaseio.com'

print('=== STARTING SURGICAL FIREBASE RTDB CLEANUP ===\n')

# 1. Posts to delete
posts_to_delete = [
    # Hallucinated / Broken Sovythos Posts
    'pulse_sov_1792831799009',
    'pulse_sovythos_1792335839392',
    'pulse_sovythos_1792488475254',
    'pulse_sovythos_1792513707781',
    'pulse_sovythos_1792500955513',

    # Empty Ghost Sovythos Posts
    'pulse_sovythos_1790942322766',
    'pulse_sovythos_1791119043879',
    'pulse_sovythos_1791408470182',
    'pulse_sovythos_1791490099600',
    'pulse_sovythos_1791666543260',
    'pulse_sovythos_1791752352583',
    'pulse_sovythos_1791827498945',
    'pulse_sovythos_1791833468489',
    'pulse_sovythos_1791921017724',
    'pulse_sovythos_1791996702647',
    'pulse_sovythos_1792069563624',
    'pulse_sovythos_1792144882018',
    'pulse_sovythos_1792151934123',
    'pulse_sovythos_1792158549734',

    # Empty Ghost User Posts
    'post-1791823814976',
    'post-1792244375720',
    'post-1792317149917',
    'post-1792667625408',

    # Test Post with Emojis
    'post-1792177358113'
]

print(f'1. Deleting {len(posts_to_delete)} broken / empty / hallucinated posts...')
deleted_posts_count = 0
for pid in posts_to_delete:
    r = requests.delete(f'{DB_URL}/posts/{pid}.json', timeout=15)
    if r.status_code in [200, 204]:
        print(f'   [DELETED POST] {pid}')
        deleted_posts_count += 1
    else:
        print(f'   [FAILED POST] {pid}: {r.status_code}')

# Also delete comments under deleted posts
for pid in posts_to_delete:
    requests.delete(f'{DB_URL}/comments/{pid}.json', timeout=15)

# 2. Specific Broken Comments to delete
print('\n2. Deleting broken / hallucinated comments...')
specific_comments_to_delete = [
    ('post-1792614565171', 'comm_sovythos_1792614580975'),
    ('post-1792177358113', 'comm-1792179437571')
]
for pid, cid in specific_comments_to_delete:
    r = requests.delete(f'{DB_URL}/comments/{pid}/{cid}.json', timeout=15)
    print(f'   [DELETED COMMENT] {pid}/{cid}: status {r.status_code}')

# 3. Misplaced / Ghost Users
print('\n3. Deleting ghost / misplaced users...')
ghost_users = ['app_release', 'security_pulse']
for uid in ghost_users:
    r = requests.delete(f'{DB_URL}/users/{uid}.json', timeout=15)
    print(f'   [DELETED GHOST USER] users/{uid}: status {r.status_code}')

# 4. Incomplete conversations
print('\n4. Deleting incomplete conversations...')
ghost_convs = ['dev_mahmoud_yasser_user_club_zamalek']
for cid in ghost_convs:
    r = requests.delete(f'{DB_URL}/conversations/{cid}.json', timeout=15)
    print(f'   [DELETED GHOST CONV] conversations/{cid}: status {r.status_code}')

# 5. Clean up notifications referencing deleted posts
print('\n5. Auditing and cleaning orphaned notifications...')
r = requests.get(f'{DB_URL}/notifications.json?shallow=false', timeout=30)
all_notifs = r.json() or {}
deleted_posts_set = set(posts_to_delete)
cleaned_notifs_count = 0

for user_id, inbox in all_notifs.items():
    if not isinstance(inbox, dict):
        continue
    for nid, n in inbox.items():
        if not isinstance(n, dict):
            continue
        target_post_id = n.get('postId')
        if target_post_id and target_post_id in deleted_posts_set:
            requests.delete(f'{DB_URL}/notifications/{user_id}/{nid}.json', timeout=10)
            cleaned_notifs_count += 1

print(f'   [CLEANED NOTIFICATIONS] Removed {cleaned_notifs_count} orphaned notifications.')

# 6. Final verification count
print('\n=== VERIFYING FINAL CLEAN STATE ===')
p_res = requests.get(f'{DB_URL}/posts.json?shallow=true')
u_res = requests.get(f'{DB_URL}/users.json?shallow=true')
c_res = requests.get(f'{DB_URL}/comments.json?shallow=true')

print(f'Final Clean Posts in RTDB: {len(p_res.json() or {})}')
print(f'Final Clean Users in RTDB: {len(u_res.json() or {})}')
print(f'Final Comment Threads in RTDB: {len(c_res.json() or {})}')
print('\nDATABASE CLEANUP FULLY COMPLETED SUCCESSFULLY.')
