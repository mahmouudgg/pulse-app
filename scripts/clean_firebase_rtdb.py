"""
PULSE Social Platform - Firebase RTDB Deep Clean & Sanitizer
============================================================
Safely purges:
1. Corrupted, empty, or zombie posts
2. Dummy, test, and invalid user profiles
3. Orphan comments referencing non-existent posts
4. Broken/orphan notifications referencing deleted posts
5. Corrupted conversations with invalid or empty participants
6. Prunes deleted post IDs from remaining users' bookmarks

STRICT ZERO EMOJIS.
"""

import sys
import json
import firebase_admin
from firebase_admin import credentials, db

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

cred = credentials.Certificate('push-server/serviceAccountKey.json')
firebase_admin.initialize_app(cred, {'databaseURL': 'https://sahra-f4ec6-default-rtdb.firebaseio.com'})

print("=" * 65)
print(" PULSE FIREBASE RTDB DEEP CLEAN & SANITIZER")
print("=" * 65)

# 1. Fetch current database state
users_ref = db.reference('users')
posts_ref = db.reference('posts')
comments_ref = db.reference('comments')
notifs_ref = db.reference('notifications')
convs_ref = db.reference('conversations')
messages_ref = db.reference('messages')

users = users_ref.get() or {}
posts = posts_ref.get() or {}
comments = comments_ref.get() or {}
notifs = notifs_ref.get() or {}
convs = convs_ref.get() or {}

stats = {
    "deleted_users": 0,
    "deleted_posts": 0,
    "deleted_comments": 0,
    "deleted_notifs": 0,
    "deleted_convs": 0,
    "pruned_bookmarks": 0
}

# ------------------------------------------------------------------------------
# STEP 1: CLEAN CORRUPT / TEST USERS
# ------------------------------------------------------------------------------
print("\n[Step 1] Cleaning corrupt and dummy users...")
deleted_uids = set()

for uid, u in list(users.items()):
    is_corrupt = False
    reason = ""

    if not isinstance(u, dict):
        is_corrupt = True
        reason = "not a dictionary"
    else:
        uname = str(u.get("username", "")).strip().lower()
        dname = str(u.get("displayName", "")).strip()
        email = str(u.get("email", "")).strip().lower()

        if uid == "security_pulse" or uid == "test":
            is_corrupt = True
            reason = "dummy system placeholder"
        elif not uname or uname in ["none", "null", "undefined"]:
            is_corrupt = True
            reason = "missing or null username"
        elif uname in ["tes", "test", "testuser", "dummy"] and email.endswith((".ckm", ".test")):
            is_corrupt = True
            reason = "test dummy account"

    if is_corrupt:
        print(f"  -> Deleting corrupt user [{uid}] (Reason: {reason})")
        users_ref.child(uid).delete()
        deleted_uids.add(uid)
        stats["deleted_users"] += 1

# ------------------------------------------------------------------------------
# STEP 2: CLEAN CORRUPT / ZOMBIE POSTS
# ------------------------------------------------------------------------------
print("\n[Step 2] Cleaning corrupt, empty, and zombie posts...")
deleted_pids = set()

for pid, p in list(posts.items()):
    is_corrupt = False
    reasons = []

    if not isinstance(p, dict):
        is_corrupt = True
        reasons.append("not a dictionary")
    else:
        author = p.get("author") or {}
        author_id = p.get("authorId") or author.get("uid")
        content = p.get("content", "")
        created_at = p.get("createdAt")

        if not author_id or author_id in deleted_uids:
            is_corrupt = True
            reasons.append("missing author or authored by deleted test user")
        
        if not content or str(content).strip() == "":
            is_corrupt = True
            reasons.append("empty content")
        
        if str(content).strip().lower() in ["test", "تجربة", "t", "testing"] and len(str(content).strip()) < 10:
            is_corrupt = True
            reasons.append("test placeholder content")

        if not created_at or "1970" in str(created_at) or "NaN" in str(created_at):
            is_corrupt = True
            reasons.append("invalid/corrupted timestamp")

    if is_corrupt:
        print(f"  -> Deleting corrupt post [{pid}] (Reasons: {', '.join(reasons)})")
        posts_ref.child(pid).delete()
        deleted_pids.add(pid)
        stats["deleted_posts"] += 1

# ------------------------------------------------------------------------------
# STEP 3: CLEAN ORPHAN & CORRUPT COMMENTS
# ------------------------------------------------------------------------------
print("\n[Step 3] Cleaning orphan and corrupted comments...")
remaining_posts = {k: v for k, v in posts.items() if k not in deleted_pids}

for pid, p_comms in list(comments.items()):
    if pid in deleted_pids or pid not in remaining_posts:
        print(f"  -> Deleting entire comment node for deleted/non-existent post [{pid}]")
        comments_ref.child(pid).delete()
        if isinstance(p_comms, dict):
            stats["deleted_comments"] += len(p_comms)
        else:
            stats["deleted_comments"] += 1
        continue

    if isinstance(p_comms, dict):
        for cid, c in list(p_comms.items()):
            if not isinstance(c, dict):
                print(f"  -> Deleting corrupt comment [{pid}/{cid}]")
                comments_ref.child(pid).child(cid).delete()
                stats["deleted_comments"] += 1
                continue
            author_id = c.get("authorId") or (c.get("author") or {}).get("uid")
            content = c.get("content", "")
            if not author_id or not content or str(content).strip() == "" or author_id in deleted_uids:
                print(f"  -> Deleting invalid comment [{pid}/{cid}]")
                comments_ref.child(pid).child(cid).delete()
                stats["deleted_comments"] += 1

# ------------------------------------------------------------------------------
# STEP 4: CLEAN BROKEN & ORPHAN NOTIFICATIONS
# ------------------------------------------------------------------------------
print("\n[Step 4] Cleaning broken and orphan notifications...")

for uid, u_notifs in list(notifs.items()):
    if uid in deleted_uids or not isinstance(u_notifs, dict):
        print(f"  -> Deleting notification node for [{uid}]")
        notifs_ref.child(uid).delete()
        stats["deleted_notifs"] += 1
        continue

    for nid, n in list(u_notifs.items()):
        is_invalid = False
        reason = ""

        if not isinstance(n, dict):
            is_invalid = True
            reason = "not a dict"
        else:
            p_id = n.get("postId")
            actor_uid = (n.get("actor") or {}).get("uid")

            if p_id and (p_id in deleted_pids or p_id not in remaining_posts):
                is_invalid = True
                reason = f"references deleted post {p_id}"
            elif actor_uid and actor_uid in deleted_uids:
                is_invalid = True
                reason = "actor is deleted user"

        if is_invalid:
            notifs_ref.child(uid).child(nid).delete()
            stats["deleted_notifs"] += 1

# ------------------------------------------------------------------------------
# STEP 5: CLEAN CORRUPTED CONVERSATIONS
# ------------------------------------------------------------------------------
print("\n[Step 5] Cleaning corrupted conversations...")

for cid, c in list(convs.items()):
    is_corrupt = False
    reason = ""

    if not isinstance(c, dict):
        is_corrupt = True
        reason = "not a dict"
    else:
        parts = c.get("participants") or []
        if not isinstance(parts, list) or len(parts) < 2:
            is_corrupt = True
            reason = "empty or invalid participants"
        elif any(p in deleted_uids for p in parts):
            is_corrupt = True
            reason = "involves deleted user"

    if is_corrupt:
        print(f"  -> Deleting corrupt conversation [{cid}] (Reason: {reason})")
        convs_ref.child(cid).delete()
        messages_ref.child(cid).delete()
        stats["deleted_convs"] += 1

# ------------------------------------------------------------------------------
# STEP 6: PRUNE DELETED POSTS FROM USER BOOKMARKS
# ------------------------------------------------------------------------------
print("\n[Step 6] Pruning deleted post references from user bookmarks...")

for uid, u in list(users.items()):
    if uid in deleted_uids or not isinstance(u, dict):
        continue
    bookmarks = u.get("bookmarks")
    if isinstance(bookmarks, list):
        cleaned_bms = [b for b in bookmarks if b not in deleted_pids and b in remaining_posts]
        if len(cleaned_bms) != len(bookmarks):
            users_ref.child(uid).child("bookmarks").set(cleaned_bms)
            stats["pruned_bookmarks"] += (len(bookmarks) - len(cleaned_bms))

print("\n" + "=" * 65)
print(" CLEANUP COMPLETED SUCCESSFULLY")
print("=" * 65)
print(f" Deleted Corrupt Users:         {stats['deleted_users']}")
print(f" Deleted Corrupt/Zombie Posts:  {stats['deleted_posts']}")
print(f" Deleted Orphan Comments:       {stats['deleted_comments']}")
print(f" Deleted Broken Notifications:  {stats['deleted_notifs']}")
print(f" Deleted Corrupt Conversations: {stats['deleted_convs']}")
print(f" Pruned Bookmark References:    {stats['pruned_bookmarks']}")
print("=" * 65)
