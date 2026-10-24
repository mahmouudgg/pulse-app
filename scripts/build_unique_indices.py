import urllib.request
import json

FIREBASE_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"

def main():
    print("Fetching users from Firebase...")
    req = urllib.request.Request(f"{FIREBASE_URL}/users.json")
    with urllib.request.urlopen(req, timeout=15) as resp:
        users = json.loads(resp.read().decode("utf-8"))

    if not users:
        print("No users found in Firebase.")
        return

    print(f"Loaded {len(users)} users.")

    usernames_index = {}
    emails_index = {}
    phones_index = {}

    # Special handling for official system accounts to avoid collision
    if "user_1789828179039" in users:
        # Pulse official account
        p_user = users["user_1789828179039"]
        if p_user.get("email") == "my0919175@gmail.com":
            p_user["email"] = "pulse@pulse.app"
            # Update in Firebase
            patch_data = json.dumps({"email": "pulse@pulse.app"}).encode("utf-8")
            p_req = urllib.request.Request(f"{FIREBASE_URL}/users/user_1789828179039.json", data=patch_data, method="PATCH")
            with urllib.request.urlopen(p_req, timeout=10) as r:
                print("Updated PULSE official account email to pulse@pulse.app")

    if "user_1789917894698" in users:
        # Sovythos official account
        s_user = users["user_1789917894698"]
        if s_user.get("email") == "my@gmail.com":
            s_user["email"] = "sovythos@pulse.app"
            patch_data = json.dumps({"email": "sovythos@pulse.app"}).encode("utf-8")
            s_req = urllib.request.Request(f"{FIREBASE_URL}/users/user_1789917894698.json", data=patch_data, method="PATCH")
            with urllib.request.urlopen(s_req, timeout=10) as r:
                print("Updated Sovythos official account email to sovythos@pulse.app")

    for uid, u in users.items():
        if not isinstance(u, dict):
            continue

        raw_un = u.get("username")
        if raw_un and isinstance(raw_un, str):
            clean_un = raw_un.strip().lower()
            if clean_un:
                usernames_index[clean_un] = uid

        raw_em = u.get("email")
        if raw_em and isinstance(raw_em, str):
            clean_em = raw_em.strip().lower()
            if clean_em:
                email_key = clean_em.replace(".", "_").replace("#", "_").replace("$", "_").replace("[", "_").replace("]", "_")
                emails_index[email_key] = uid

        raw_ph = u.get("phone") or u.get("fullPhone")
        if raw_ph and isinstance(raw_ph, str):
            clean_ph = "".join(c for c in raw_ph if c.isdigit())
            if len(clean_ph) >= 7:
                phones_index[clean_ph] = uid

    print(f"Compiled {len(usernames_index)} usernames into index.")
    print(f"Compiled {len(emails_index)} emails into index.")
    print(f"Compiled {len(phones_index)} phones into index.")

    # Write atomic indices to Firebase RTDB
    print("Writing /usernames index to Firebase...")
    un_req = urllib.request.Request(
        f"{FIREBASE_URL}/usernames.json",
        data=json.dumps(usernames_index).encode("utf-8"),
        method="PUT"
    )
    with urllib.request.urlopen(un_req, timeout=15) as resp:
        print("Usernames index written successfully.")

    print("Writing /emails index to Firebase...")
    em_req = urllib.request.Request(
        f"{FIREBASE_URL}/emails.json",
        data=json.dumps(emails_index).encode("utf-8"),
        method="PUT"
    )
    with urllib.request.urlopen(em_req, timeout=15) as resp:
        print("Emails index written successfully.")

    print("Writing /phoneNumbers index to Firebase...")
    ph_req = urllib.request.Request(
        f"{FIREBASE_URL}/phoneNumbers.json",
        data=json.dumps(phones_index).encode("utf-8"),
        method="PUT"
    )
    with urllib.request.urlopen(ph_req, timeout=15) as resp:
        print("Phone numbers index written successfully.")

    print("SUCCESS: All atomic uniqueness indices deployed to Firebase Realtime Database!")

if __name__ == "__main__":
    main()
