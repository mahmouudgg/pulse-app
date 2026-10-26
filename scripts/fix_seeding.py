# -*- coding: utf-8 -*-
import re
p = r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\scripts\pulse_server.py"
with open(p, "r", encoding="utf-8") as f:
    c = f.read()

# Fix 1: Only seed if last_msg sender was Sovythos
old_seeding = """                    conv = rtdb_get(f"conversations/{conv_id}")
                    if isinstance(conv, dict) and conv.get("lastMessage"):
                        last_msg = conv.get("lastMessage")
                        if isinstance(last_msg, dict) and last_msg.get("id"):
                            answered_dm_msg_ids.add(last_msg.get("id"))"""

new_seeding = """                    conv = rtdb_get(f"conversations/{conv_id}")
                    if isinstance(conv, dict) and conv.get("lastMessage"):
                        last_msg = conv.get("lastMessage")
                        if isinstance(last_msg, dict) and last_msg.get("id"):
                            if last_msg.get("senderId") == OFFICIAL_SOVYTHOS["uid"]:
                                answered_dm_msg_ids.add(last_msg.get("id"))"""

c = c.replace(old_seeding, new_seeding)

# Fix 2: Clean redundant regex lines in reply cleaning
old_clean = """                            reply_clean = clean_ai_text(reply_text)
                            reply_clean = re.sub(r'[\U00010000-\U0010ffff]', '', reply_clean).strip()
                            reply_clean = re.sub(r'[\u2600-\u26ff\u2700-\u27bf]', '', reply_clean).strip()"""

new_clean = """                            reply_clean = clean_ai_text(reply_text)"""

c = c.replace(old_clean, new_clean)

# Also handle if characters were mangled in file
c = re.sub(r'reply_clean = re\.sub\(r\'\[.*?\]\', \'\', reply_clean\)\.strip\(\)\n', '', c)

with open(p, "w", encoding="utf-8") as f:
    f.write(c)

print("Patched seeding and cleaning in pulse_server.py")
