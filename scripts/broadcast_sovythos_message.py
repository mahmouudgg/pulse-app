# -*- coding: utf-8 -*-
"""
Broadcast Outreach Message from Sovythos to All Users via Server and Firebase RTDB
Encourages all users to return, engage, and test Sovythos's newly upgraded intelligence.
STRICT COMPLIANCE: ZERO EMOJIS.
"""

import sys
import os
import time
import re
import json
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r"C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\scripts")

import pulse_server
from pulse_server import rtdb_get, rtdb_put, rtdb_patch, pulse_cipher, OFFICIAL_SOVYTHOS

def get_friendly_name(display_name, username):
    # Strip plane-1 symbols, math script, emojis
    cleaned_display = re.sub(r'[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]', '', display_name or '')
    name = (cleaned_display or username or '').strip()
    first = name.split()[0] if name.split() else ''
    clean = re.sub(r'[^\w\u0600-\u06FF]', '', first).strip()
    if clean:
        return clean
    clean_user = re.sub(r'[^\w\u0600-\u06FF]', '', username or '').strip()
    return clean_user if clean_user else 'يا غالي'

def broadcast():
    print("=" * 60)
    print("SOVYTHOS PLATFORM-WIDE OUTREACH BROADCAST")
    print("Sending direct invitation messages to all users via Firebase RTDB")
    print("=" * 60)

    users_data = rtdb_get("users") or {}
    if not isinstance(users_data, dict):
        print("Error: Could not retrieve users from RTDB.")
        return

    now_sec = time.time()
    now_ms = int(now_sec * 1000)
    now_iso = datetime.now(timezone.utc).isoformat()

    sent_count = 0
    skipped_count = 0

    # User message template (STRICT ZERO EMOJIS)
    message_template = (
        "مساء الفل يا {name}، سوفيثوس بيمسي عليك ومستنيك تنور نبض من تاني. "
        "عقل المنصة اتطور واتحدث بالكامل، وبقيت جاهز أسمعك وأفكر معاك في أي كود أو فكرة أو فضفضة بتركيز وذكاء حقيقي. "
        "التايم لاين والخاص مستنيينك، ادخل وشاركنا نبضتك وقولي إيه جديدك النهاردة، مستنيك."
    )

    for idx, (uid, u) in enumerate(users_data.items()):
        if not isinstance(u, dict):
            continue

        # Skip Sovythos himself
        if uid == OFFICIAL_SOVYTHOS["uid"]:
            continue

        # Skip banned accounts
        if u.get("isBanned") is True:
            skipped_count += 1
            print(f"Skipping banned user {uid}")
            continue

        username = u.get("username") or "user"
        display_name = u.get("displayName") or username
        friendly_name = get_friendly_name(display_name, username)

        dm_text = message_template.format(name=friendly_name)

        # Enforce strict zero emojis / plane 1 characters in text
        dm_text = re.sub(r'[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]', '', dm_text).strip()

        conv_id = f"{min(OFFICIAL_SOVYTHOS['uid'], uid)}_{max(OFFICIAL_SOVYTHOS['uid'], uid)}"
        key = f"pulse_secret_{conv_id}"

        encrypted_content = pulse_cipher(dm_text, key)
        encrypted_preview = pulse_cipher(dm_text[:100], key)

        msg_id = f"msg_sovy_broadcast_{now_ms}_{idx:03d}"

        # 1. Fetch existing unread count
        existing_conv = rtdb_get(f"conversations/{conv_id}") or {}
        current_unread = 0
        if isinstance(existing_conv, dict):
            unread_map = existing_conv.get("unread") or {}
            if isinstance(unread_map, dict):
                current_unread = unread_map.get(uid, 0)

        # 2. Save Message Payload
        msg_payload = {
            "id": msg_id,
            "conversationId": conv_id,
            "senderId": OFFICIAL_SOVYTHOS["uid"],
            "recipientId": uid,
            "senderName": OFFICIAL_SOVYTHOS["displayName"],
            "senderUsername": OFFICIAL_SOVYTHOS["username"],
            "senderAvatar": OFFICIAL_SOVYTHOS["avatar"],
            "type": "text",
            "content": encrypted_content,
            "text": dm_text[:85],
            "voiceDuration": 0,
            "sharedPost": None,
            "timestamp": now_ms,
            "createdAt": now_iso,
            "isRead": False,
            "read": False,
            "isSovythosAutoReply": True
        }
        rtdb_put(f"messages/{conv_id}/{msg_id}", msg_payload)

        # 3. Save / Update Conversation Payload
        conv_payload = {
            "id": conv_id,
            "isRequest": False,
            "isAccepted": True,
            "requestedBy": None,
            "participants": {
                OFFICIAL_SOVYTHOS["uid"]: True,
                uid: True
            },
            "participantDetails": {
                OFFICIAL_SOVYTHOS["uid"]: {
                    "uid": OFFICIAL_SOVYTHOS["uid"],
                    "displayName": OFFICIAL_SOVYTHOS["displayName"],
                    "username": OFFICIAL_SOVYTHOS["username"],
                    "avatar": OFFICIAL_SOVYTHOS["avatar"],
                    "isFounder": False,
                    "isVerified": True,
                    "pioneerNumber": None
                },
                uid: {
                    "uid": uid,
                    "displayName": display_name,
                    "username": username,
                    "avatar": u.get("avatar") or None,
                    "isFounder": u.get("isFounder", False),
                    "isVerified": bool(u.get("isVerified") or u.get("isPro") or u.get("isFounder")),
                    "pioneerNumber": u.get("pioneerNumber", None)
                }
            },
            "lastMessage": {
                "id": msg_id,
                "senderId": OFFICIAL_SOVYTHOS["uid"],
                "text": encrypted_preview,
                "type": "text",
                "timestamp": now_ms
            },
            "lastMessageText": dm_text[:85],
            "unread": {
                uid: current_unread + 1,
                OFFICIAL_SOVYTHOS["uid"]: 0
            },
            "updatedAt": now_ms,
            "lastTimestamp": now_ms
        }
        rtdb_put(f"conversations/{conv_id}", conv_payload)

        # 4. Save In-App Notification
        notif_id = f"notif_sovy_dm_{now_ms}_{idx:03d}"
        notif_payload = {
            "id": notif_id,
            "type": "message",
            "text": "أرسل لك سوفيثوس رسالة خاصة",
            "preview": dm_text[:85],
            "conversationId": conv_id,
            "createdAt": now_iso,
            "timestamp": now_ms,
            "read": False,
            "actor": {
                "uid": OFFICIAL_SOVYTHOS["uid"],
                "username": OFFICIAL_SOVYTHOS["username"],
                "displayName": OFFICIAL_SOVYTHOS["displayName"],
                "avatar": OFFICIAL_SOVYTHOS["avatar"],
                "isVerified": True,
                "isFounder": False
            }
        }
        rtdb_put(f"notifications/{uid}/{notif_id}", notif_payload)

        sent_count += 1
        print(f"[{sent_count}] Sent message to @{username} ({uid})")

    # Record broadcast batch in Sovythos profile
    rtdb_put(f"users/{OFFICIAL_SOVYTHOS['uid']}/lastBroadcast", {
        "timestamp": now_ms,
        "date": now_iso,
        "recipientsCount": sent_count,
        "summary": "Platform-wide engagement invitation"
    })

    print("=" * 60)
    print(f"SUCCESS: Sovythos broadcast delivered to {sent_count} users (Skipped: {skipped_count}).")
    print("=" * 60)

if __name__ == "__main__":
    broadcast()
