# -*- coding: utf-8 -*-
p = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\scripts\pulse_server.py"
with open(p, "r", encoding="utf-8") as f:
    c = f.read()

target = """                        participants = conv.get("participants", {})
                        user_info = participants.get(sender_id, {})
                        user_name = user_info.get("displayName") or user_info.get("username") or "صاحبي"
                        user_handle = f"@{user_info.get('username', '')}\""""

replacement = """                        participants = conv.get("participants", {})
                        user_info = participants.get(sender_id) if isinstance(participants, dict) else None
                        if not isinstance(user_info, dict):
                            user_info = rtdb_get(f"users/{sender_id}") or {}
                        user_name = user_info.get("displayName") or user_info.get("username") or "صاحبي"
                        user_handle = f"@{user_info.get('username', '')}\""""

c_norm = c.replace("\r\n", "\n")
target_norm = target.replace("\r\n", "\n")
replacement_norm = replacement.replace("\r\n", "\n")

if target_norm in c_norm:
    c_norm = c_norm.replace(target_norm, replacement_norm)
    with open(p, "w", encoding="utf-8") as f:
        f.write(c_norm)
    print("Fixed user_info in pulse_server.py")
else:
    print("Target not found!")
