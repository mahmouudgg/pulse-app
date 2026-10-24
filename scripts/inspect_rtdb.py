import firebase_admin
from firebase_admin import credentials, db
import json
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

cred = credentials.Certificate('push-server/serviceAccountKey.json')
firebase_admin.initialize_app(cred, {'databaseURL': 'https://sahra-f4ec6-default-rtdb.firebaseio.com'})

report = {
    "corrupt_users": [],
    "valid_users": [],
    "corrupt_posts": [],
    "valid_posts": [],
    "orphan_comments": [],
    "valid_comments_count": 0,
    "other_nodes": {}
}

print("=== INSPECTING USERS ===")
users = db.reference('users').get() or {}
for uid, u in users.items():
    if not isinstance(u, dict):
        report["corrupt_users"].append({"uid": uid, "reason": "not_a_dict", "data": str(u)})
        continue
    uname = u.get("username")
    dname = u.get("displayName")
    email = u.get("email")
    if not uname or not dname or uname in ["tes", "test", "testuser", "dummy"] or uid == "security_pulse":
        report["corrupt_users"].append({"uid": uid, "username": uname, "displayName": dname, "email": email})
    else:
        report["valid_users"].append({"uid": uid, "username": uname, "displayName": dname})

print(f"Found {len(report['corrupt_users'])} corrupt/test users, {len(report['valid_users'])} valid users.")

print("=== INSPECTING POSTS ===")
posts = db.reference('posts').get() or {}
for pid, p in posts.items():
    if not isinstance(p, dict):
        report["corrupt_posts"].append({"pid": pid, "reason": "not_a_dict"})
        continue
    author = p.get("author") or {}
    author_id = p.get("authorId") or author.get("uid")
    content = p.get("content", "")
    created_at = p.get("createdAt")
    views = p.get("viewsCount") or p.get("views") or 0
    
    issues = []
    if not author_id:
        issues.append("missing_author")
    if not content or content.strip() == "":
        issues.append("empty_content")
    if content.strip().lower() in ["test", "تجربة", "t", "testing", "asdf", "qwerty"] or len(content.strip()) < 3:
        issues.append("test_dummy_content")
    if not created_at or "1970" in str(created_at) or "NaN" in str(created_at) or created_at == 0:
        issues.append("invalid_timestamp")
    # Check if author was one of the corrupt users
    if author_id in [u["uid"] for u in report["corrupt_users"]]:
        issues.append("authored_by_corrupt_user")
    
    # Check for fake/synthetic inflated views: e.g. views > 50000 on a personal post
    if isinstance(views, (int, float)) and views > 50000:
        issues.append(f"fake_views_{views}")

    post_info = {
        "pid": pid,
        "authorId": author_id,
        "createdAt": created_at,
        "views": views,
        "snippet": content[:80].replace("\n", " ")
    }

    if issues:
        post_info["issues"] = issues
        report["corrupt_posts"].append(post_info)
    else:
        report["valid_posts"].append(post_info)

print(f"Found {len(report['corrupt_posts'])} corrupt/test posts, {len(report['valid_posts'])} valid posts.")

print("=== INSPECTING COMMENTS ===")
comments = db.reference('comments').get() or {}
for pid, p_comms in comments.items():
    if not isinstance(p_comms, dict):
        report["orphan_comments"].append({"pid": pid, "reason": "node_not_a_dict"})
        continue
    post_exists = pid in posts
    for cid, c in p_comms.items():
        if not isinstance(c, dict):
            report["orphan_comments"].append({"pid": pid, "cid": cid, "reason": "comment_not_a_dict"})
            continue
        if not post_exists:
            report["orphan_comments"].append({"pid": pid, "cid": cid, "content": c.get("content", "")[:40], "reason": "post_does_not_exist"})
        else:
            report["valid_comments_count"] += 1

print(f"Found {len(report['orphan_comments'])} orphan/corrupt comments, {report['valid_comments_count']} valid comments.")

print("=== INSPECTING NOTIFICATIONS ===")
notifs = db.reference('notifications').get() or {}
corrupt_notifs = []
for uid, u_notifs in notifs.items():
    if not isinstance(u_notifs, dict):
        corrupt_notifs.append({"uid": uid, "reason": "not_a_dict"})
        continue
    for nid, n in u_notifs.items():
        if not isinstance(n, dict):
            corrupt_notifs.append({"uid": uid, "nid": nid, "reason": "not_a_dict"})
            continue
        # If notification points to a non-existent post
        p_id = n.get("postId")
        if p_id and p_id not in posts:
            corrupt_notifs.append({"uid": uid, "nid": nid, "reason": "referenced_post_deleted", "postId": p_id})

report["corrupt_notifs"] = corrupt_notifs
print(f"Found {len(corrupt_notifs)} corrupt/orphan notifications.")

print("=== INSPECTING CONVERSATIONS ===")
convs = db.reference('conversations').get() or {}
corrupt_convs = []
for cid, c in convs.items():
    if not isinstance(c, dict):
        corrupt_convs.append({"cid": cid, "reason": "not_a_dict"})
        continue
    parts = c.get("participants") or []
    if not parts or len(parts) < 2:
        corrupt_convs.append({"cid": cid, "reason": "invalid_participants", "participants": parts})
report["corrupt_conversations"] = corrupt_convs
print(f"Found {len(corrupt_convs)} corrupt conversations.")

print("=== INSPECTING STORIES ===")
stories = db.reference('stories').get() or {}
corrupt_stories = []
for sid, s in stories.items():
    if not isinstance(s, dict):
        corrupt_stories.append({"sid": sid, "reason": "not_a_dict"})
        continue
report["corrupt_stories"] = corrupt_stories
print(f"Found {len(corrupt_stories)} corrupt stories.")

# Write report to json
with open('scripts/db_report.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print("Report saved to scripts/db_report.json")

