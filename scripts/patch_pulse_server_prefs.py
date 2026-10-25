import os

FILE_PATH = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\scripts\pulse_server.py'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    c = f.read()

helper_code = '''def check_user_notif_pref(target_uid, notif_type, actor_uid=None):
    try:
        prefs = rtdb_get(f"users/{target_uid}/notificationPreferences")
        if not prefs or not isinstance(prefs, dict):
            return True
        if prefs.get("pauseAll"):
            pause_until = prefs.get("pauseUntil")
            if not pause_until or (time.time() * 1000) < pause_until:
                return False
        if notif_type == "like":
            val = prefs.get("likes", "everyone")
            if val == "off":
                return False
            if val == "following" and actor_uid:
                u_target = rtdb_get(f"users/{target_uid}") or {}
                following = u_target.get("following", [])
                if isinstance(following, list) and actor_uid not in following:
                    return False
        elif notif_type == "repost":
            val = prefs.get("reposts", "everyone")
            if val == "off":
                return False
        elif notif_type == "mention":
            val = prefs.get("mentions", "everyone")
            if val == "off":
                return False
        return True
    except Exception:
        return True

'''

if "def check_user_notif_pref" not in c:
    # Insert helper before class EventSynthesizer or where event synthesizer runs
    target_insert = "# 1. Multi-threaded HTTP Distribution"
    if target_insert in c:
        c = c.replace(target_insert, helper_code + target_insert)
        print("Inserted check_user_notif_pref helper")

# Apply check to likes
target_like = """                                    if rtdb_put(f"notifications/{author_id}/{notif_id}", new_notif):"""
replacement_like = """                                    if check_user_notif_pref(author_id, "like", liker_uid) and rtdb_put(f"notifications/{author_id}/{notif_id}", new_notif):"""

if target_like in c:
    c = c.replace(target_like, replacement_like, 1)
    print("Added check to like synthesizer")

# Apply check to reposts
target_repost = """                                    if rtdb_put(f"notifications/{author_id}/{notif_id}", new_notif):"""
replacement_repost = """                                    if check_user_notif_pref(author_id, "repost", reposter_uid) and rtdb_put(f"notifications/{author_id}/{notif_id}", new_notif):"""

if target_repost in c:
    c = c.replace(target_repost, replacement_repost, 1)
    print("Added check to repost synthesizer")

# Apply check to mentions
target_men = """                                            if rtdb_put(f"notifications/{u_uid}/{notif_id}", new_notif):"""
replacement_men = """                                            if check_user_notif_pref(u_uid, "mention", author_id) and rtdb_put(f"notifications/{u_uid}/{notif_id}", new_notif):"""

if target_men in c:
    c = c.replace(target_men, replacement_men, 1)
    print("Added check to mention synthesizer")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(c)

print("Done updating pulse_server.py with notification preference checks")
