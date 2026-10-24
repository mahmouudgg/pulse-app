import requests
import json

FIREBASE_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"
CLOUDINARY_AVATAR = "https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1792681479/pulse_avatars/pulse_default_avatar_dark.png"

def should_replace_avatar(avatar_val, username=""):
    if not avatar_val or not isinstance(avatar_val, str):
        return True
    u_lower = (username or "").lower().strip()
    if u_lower in ["my", "pulse", "sovythos", "dev_mahmoud_yasser"]:
        return False
    trimmed = avatar_val.strip()
    if not trimmed or trimmed in ["null", "undefined", "[object Object]"]:
        return True
    if trimmed.startswith("data:image"):
        return True
    if "default-avatar" in trimmed or "/default_avatar" in trimmed:
        return True
    if "media_" in trimmed and not trimmed.startswith("http"):
        return True
    return False

print("1. Fetching users from Firebase...")
r = requests.get(f"{FIREBASE_URL}/users.json")
if r.status_code == 200 and r.json():
    users = r.json()
    updated_users_count = 0
    for uid, user_data in users.items():
        if not isinstance(user_data, dict):
            continue
        curr_avatar = user_data.get("avatar")
        username = user_data.get("username", "")
        if should_replace_avatar(curr_avatar, username):
            patch_url = f"{FIREBASE_URL}/users/{uid}.json"
            patch_res = requests.patch(patch_url, json={"avatar": CLOUDINARY_AVATAR})
            if patch_res.status_code == 200:
                print(f"Updated user @{username} ({uid}) avatar to Cloudinary placeholder")
                updated_users_count += 1
            else:
                print(f"Failed to update user {uid}: {patch_res.text}")
    print(f"Finished updating users: {updated_users_count} users updated.")
else:
    print(f"Could not load users or no users: {r.status_code}")

print("\n2. Scanning posts in Firebase...")
r_posts = requests.get(f"{FIREBASE_URL}/posts.json")
if r_posts.status_code == 200 and r_posts.json():
    posts = r_posts.json()
    updated_posts_count = 0
    for post_id, post_data in posts.items():
        if not isinstance(post_data, dict):
            continue
        author = post_data.get("author")
        if isinstance(author, dict):
            curr_avatar = author.get("avatar")
            username = author.get("username", "")
            if should_replace_avatar(curr_avatar, username):
                patch_url = f"{FIREBASE_URL}/posts/{post_id}/author.json"
                patch_res = requests.patch(patch_url, json={"avatar": CLOUDINARY_AVATAR})
                if patch_res.status_code == 200:
                    updated_posts_count += 1
    print(f"Finished updating posts: {updated_posts_count} posts updated.")
