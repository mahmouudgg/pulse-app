"""
PULSE Social - Autonomous Firebase RTDB Cleanup Utility
Removes all simulated/test notifications, duplicate/recent Sovythos comments, and test messages.
STRICT ZERO EMOJIS.
"""

import sys
import requests
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

FIREBASE_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"
SOVYTHOS_UID = "user_1789917894698"

session = requests.Session()

def rtdb_get(path):
    res = session.get(f"{FIREBASE_URL}/{path.lstrip('/')}.json", timeout=15)
    return res.json() if res.status_code == 200 else None

def rtdb_delete(path):
    res = session.delete(f"{FIREBASE_URL}/{path.lstrip('/')}.json", timeout=15)
    return res.status_code in [200, 204]

def rtdb_patch(path, data):
    res = session.patch(f"{FIREBASE_URL}/{path.lstrip('/')}.json", json=data, timeout=15)
    return res.status_code in [200, 204]

def rtdb_put(path, data):
    res = session.put(f"{FIREBASE_URL}/{path.lstrip('/')}.json", json=data, timeout=15)
    return res.status_code in [200, 204]

def inspect_and_clean():
    print("[RTDB Cleaner] Starting comprehensive database inspection & cleanup...", flush=True)

    # 1. Clean Notifications
    notifs_data = rtdb_get("notifications") or {}
    print(f"\n--- Checking Notifications (Users: {len(notifs_data)}) ---", flush=True)
    deleted_notifs = 0
    for uid, user_notifs in list(notifs_data.items()):
        if not isinstance(user_notifs, dict):
            continue
        for nid, notif in list(user_notifs.items()):
            if not isinstance(notif, dict):
                rtdb_delete(f"notifications/{uid}/{nid}")
                deleted_notifs += 1
                continue

            # Identify simulated / test notifications or phantom notifications
            is_test = (
                nid.startswith("notif_test_") or
                nid.startswith("test_") or
                notif.get("type") == "test" or
                (notif.get("actor") or {}).get("uid") == SOVYTHOS_UID or
                "يا عم اعملي منشن" in str(notif.get("preview", "")) or
                "كلام مظبوط يا ريس" in str(notif.get("preview", "")) or
                "يا باشا، إنت بتخيل" in str(notif.get("preview", "")) or
                "يا عم كبر مخك" in str(notif.get("preview", "")) or
                "استمع إلى التسجيل الصوتي كاملاً" in str(notif.get("preview", "")) or
                "طرح هندسي ممتاز جداً يا @my" in str(notif.get("preview", ""))
            )

            # Check if user wants all fake/test notifications cleared for their account
            if uid == "dev_mahmoud_yasser" or is_test:
                print(f"Deleting notification: {uid}/{nid} | Type: {notif.get('type')} | Text: {notif.get('text')} | Preview: {str(notif.get('preview'))[:35]}", flush=True)
                if rtdb_delete(f"notifications/{uid}/{nid}"):
                    deleted_notifs += 1

    print(f"Total deleted notifications: {deleted_notifs}", flush=True)

    # 2. Clean Recent/Duplicate Sovythos Comments
    comments_data = rtdb_get("comments") or {}
    posts_data = rtdb_get("posts") or {}
    print(f"\n--- Checking Comments on Posts (Posts with comments: {len(comments_data)}) ---", flush=True)

    deleted_comments = 0
    for pid, p_comms in list(comments_data.items()):
        if not isinstance(p_comms, dict):
            continue

        remaining_count = 0
        for cid, comment in list(p_comms.items()):
            if not isinstance(comment, dict):
                rtdb_delete(f"comments/{pid}/{cid}")
                deleted_comments += 1
                continue

            author_id = comment.get("authorId") or (comment.get("author") or {}).get("uid")
            content = comment.get("content", "")

            # Identify Sovythos comments (especially recent or duplicate ones)
            is_sovythos_comment = (
                author_id == SOVYTHOS_UID or
                cid.startswith("comm_sovythos_") or
                comment.get("isAIReply") is True or
                "يا باشا" in content or
                "يا عم كبر مخك" in content or
                "كلام مظبوط يا ريس" in content
            )

            if is_sovythos_comment:
                print(f"Deleting Sovythos comment on post {pid}: {cid} | Text: {content[:45]}", flush=True)
                if rtdb_delete(f"comments/{pid}/{cid}"):
                    deleted_comments += 1
            else:
                remaining_count += 1

        # Recalculate and update repliesCount on the post
        if pid in posts_data and isinstance(posts_data[pid], dict):
            rtdb_patch(f"posts/{pid}", {"repliesCount": remaining_count})
            print(f"Updated post {pid} repliesCount to: {remaining_count}", flush=True)

    print(f"Total deleted Sovythos comments: {deleted_comments}", flush=True)

    # 3. Clean Test Messages & Conversations
    print("\n--- Checking Test Messages & Conversations ---", flush=True)
    deleted_messages = 0
    convs_data = rtdb_get("conversations") or {}
    for conv_id in list(convs_data.keys()):
        msgs = rtdb_get(f"messages/{conv_id}") or {}
        if isinstance(msgs, dict):
            for mid, m in list(msgs.items()):
                if not isinstance(m, dict):
                    continue
                content = str(m.get("content") or m.get("text") or "")
                is_test_msg = (
                    mid.startswith("msg_test_") or
                    mid.startswith("msg_sov_") or
                    "يا عم اعملي منشن" in content or
                    m.get("senderId") == SOVYTHOS_UID
                )
                if is_test_msg:
                    print(f"Deleting message in {conv_id}: {mid} | Content: {content[:35]}", flush=True)
                    if rtdb_delete(f"messages/{conv_id}/{mid}"):
                        deleted_messages += 1

    print(f"Total deleted test messages: {deleted_messages}", flush=True)

    print("\n[RTDB Cleanup Completed Successfully] All test notifications, recent Sovythos comments, and test messages purged.", flush=True)

if __name__ == "__main__":
    inspect_and_clean()
