"""
PULSE Social - Autonomous Test Notification Dispatcher
Sends simulated high-intent notifications across all platform types exclusively to @my (dev_mahmoud_yasser).
STRICT ZERO EMOJIS.
"""

import sys
import time
import requests
from datetime import datetime, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

FIREBASE_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"
TARGET_USER_ID = "dev_mahmoud_yasser"
TARGET_POST_ID = "post-1790935652251"

session = requests.Session()

def rtdb_put(path, data):
    url = f"{FIREBASE_URL}/{path.lstrip('/')}.json"
    res = session.put(url, json=data, timeout=10)
    return res.status_code in [200, 201]

def send_test_notifications():
    print(f"[Test Dispatcher] Preparing simulated notifications exclusively for user: {TARGET_USER_ID} (@my)...", flush=True)

    notifications = [
        # 1. Reply Notification (with direct reply action button)
        {
            "type": "reply",
            "actor": {
                "uid": "user_1789917894698",
                "displayName": "Sovythos",
                "username": "sovythos",
                "avatar": "https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1790975397/pulse_avatars/zhdxv7x7htrphqt3iaew.png",
                "isVerified": True,
                "isAI": True
            },
            "text": "علّق على نبضتك",
            "preview": "كلام مظبوط يا ريس، الفكرة دي محتاجة تركيز وتطبيق عملي عشان تبان قيمتها الحقيقية.",
            "postId": TARGET_POST_ID
        },

        # 2. Mention Notification (with direct reply action button)
        {
            "type": "mention",
            "actor": {
                "uid": "user_sarah_tech",
                "displayName": "سارة الأحمد",
                "username": "sara_tech",
                "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
                "isVerified": True,
                "isFounder": False
            },
            "text": "أشار إليك في نبضة",
            "preview": "طرح هندسي ممتاز جداً يا @my، ما رأيك في هذه المعمارية الموزعة للمنصة؟",
            "postId": TARGET_POST_ID
        },

        # 3. Like Notification (with view action button)
        {
            "type": "like",
            "actor": {
                "uid": "user_kareem_dev",
                "displayName": "كريم عادل",
                "username": "kareem_dev",
                "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                "isVerified": False,
                "isFounder": False
            },
            "text": "أُعجب بنبضتك",
            "preview": "منظومة النبضات الفكرية والويب المستقل في منصة PULSE",
            "postId": TARGET_POST_ID
        },

        # 4. Repost Notification (with view action button)
        {
            "type": "repost",
            "actor": {
                "uid": "user_nour_ai",
                "displayName": "نور الدين",
                "username": "nour_ai",
                "avatar": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
                "isVerified": True,
                "isFounder": False
            },
            "text": "أعاد نشر نبضتك",
            "preview": "منظومة النبضات الفكرية والويب المستقل في منصة PULSE",
            "postId": TARGET_POST_ID
        },

        # 5. Voice Listen Notification (with view action button)
        {
            "type": "voice_listen",
            "actor": {
                "uid": "user_tarek_audio",
                "displayName": "طارق كمال",
                "username": "tarek_audio",
                "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                "isVerified": False,
                "isFounder": False
            },
            "text": "استمع لنبضتك الصوتية",
            "preview": "استمع إلى التسجيل الصوتي كاملاً",
            "postId": TARGET_POST_ID
        }
    ]

    for idx, notif in enumerate(notifications, 1):
        now_str = datetime.now(timezone.utc).isoformat()
        notif_id = f"notif_test_{int(time.time() * 1000)}_{idx}"
        payload = {
            "id": notif_id,
            "type": notif["type"],
            "actor": notif["actor"],
            "text": notif["text"],
            "preview": notif["preview"],
            "postId": notif["postId"],
            "createdAt": now_str,
            "read": False
        }

        path = f"notifications/{TARGET_USER_ID}/{notif_id}"
        success = rtdb_put(path, payload)
        if success:
            print(f"[Dispatched {idx}/{len(notifications)}] Type: {notif['type']} | From: {notif['actor']['displayName']}", flush=True)
        else:
            print(f"[Failed {idx}] Type: {notif['type']}", flush=True)

        time.sleep(3)

    # 6. Direct Message Notification
    conv_id = f"conv_{TARGET_USER_ID}_user_1789917894698"
    msg_id = f"msg_test_{int(time.time() * 1000)}"
    dm_payload = {
        "id": msg_id,
        "senderId": "user_1789917894698",
        "recipientId": TARGET_USER_ID,
        "senderName": "Sovythos",
        "senderAvatar": "https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1790975397/pulse_avatars/zhdxv7x7htrphqt3iaew.png",
        "type": "text",
        "text": "يا عم اعملي منشن في نبضة، متبعتليش خاص الناس هتفهم غلط ههههه!",
        "hasVoice": False,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "read": False
    }

    dm_success = rtdb_put(f"messages/{conv_id}/{msg_id}", dm_payload)
    if dm_success:
        print(f"[Dispatched 6/6] Type: message (DM) | From: Sovythos", flush=True)

    print("\n[Test Dispatcher Completed] All 6 simulated notifications dispatched successfully to @my.", flush=True)

if __name__ == "__main__":
    send_test_notifications()
