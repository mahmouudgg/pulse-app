"""
PULSE Official Announcement Broadcaster
Publishes genuine organic update pulse from @pulse and notifies all users.
Strictly ZERO EMOJIS.
"""

import sys
import time
import json
from datetime import datetime, timezone
import requests

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
        sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
    except Exception:
        pass

FIREBASE_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"

OFFICIAL_PULSE = {
    "uid": "user_1789828179039",
    "email": "my0919175@gmail.com",
    "username": "pulse",
    "displayName": "PULSE",
    "avatar": "https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1790976187/pulse_avatars/xkcwnhipezmchkxil20v.png",
    "bio": "الحساب الرسمي لمنصة PULSE. هنا تلتقي الأفكار وتنطلق النبضات.",
    "website": "https://pulse.app",
    "location": "CAIRO, EGYPT",
    "isVerified": True,
    "isFounder": False,
    "isOfficial": True,
    "isPioneer": False
}

PULSE_CONTENT = """تحديث كبير ومهم في PULSE وصل دلوقتي لكل الناس على التايم لاين.

خلال الساعات اللي فاتت اشتغلنا على إعادة هندسة المنصة بالكامل علشان التجربة تكون أنضف وأخف بكتير وبنفس معايير التطبيقات العالمية:

1. ترويق كامل للعين والواجهة:
شيلنا كل بؤر التشتيت، الوميض المتقطع، وكل ومضات التنبيهات اللي كانت بتعمل زحمة للعين، ونضفنا التطبيق من أي كبسولات أو وسوم ذكاء اصطناعي مش مكانها. التصميم دلوقتي رايق وهادي جدا.

2. سلاسة وحركات موحدة (120 إطار في الثانية):
كل الموديلز، القوائم السفلية، والانتقالات بقت بفيزياء حركة موحدة وناعمة جدا، مع اهتزازات لمسية حقيقية مضبوطة في كل دوسة زرار وتنقل بين التبويبات.

3. مزامنة فورية وشاملة للملفات الشخصية:
نبضات أي بروفايل تدخله بتعمل مزامنة تلقائية كاملة ومباشرة في الكاش خلال أجزاء من الثانية، بدون ما تحتاج تتصفح الفيد كله.

4. حماية واستهلاك ذكي فائق للبيانات:
هندسة استهلاك الكوتا والبيانات تم تقليصها لأدنى حد ممكن، التطبيق سريع وخفيف على باقتك مهما زاد المحتوى وعدد النبضات.

5. دعم رفع الفيديوهات مع ضغط ذكي:
تقدر ترفع نبضاتك مع فيديوهات بجودة عالية HD مع تقليل الحجم تلقائيا للحفاظ على السرعة والاستهلاك.

النسخة الجديدة المحدثة من التطبيق (Pulse-v1.0.apk) جاهزة دلوقتي.
تقدر تدخل في رسالة خاصة للمطور ومؤسس المنصة محمود ياسر (@my) وهيبعتلك رابط التحميل المباشر للتحديث فورا."""

session = requests.Session()
session.headers.update({"User-Agent": "PulseServer-OfficialAnnouncer/1.0"})

def run():
    print("[Announcer] Fetching users list from Firebase RTDB...", flush=True)
    res = session.get(f"{FIREBASE_URL}/users.json?shallow=true", timeout=10)
    if res.status_code != 200:
        print(f"[Announcer] Error fetching users: {res.status_code} {res.text}", flush=True)
        return

    users_keys = list((res.json() or {}).keys())
    print(f"[Announcer] Total target users: {len(users_keys)}", flush=True)

    # 1. Publish the Official Pulse
    now_ms = int(time.time() * 1000)
    pulse_id = f"pulse_official_release_{now_ms}"
    now_iso = datetime.now(timezone.utc).isoformat()

    pulse_payload = {
        "id": pulse_id,
        "authorId": OFFICIAL_PULSE["uid"],
        "author": OFFICIAL_PULSE,
        "content": PULSE_CONTENT,
        "createdAt": now_iso,
        "likes": [],
        "reposts": [],
        "bookmarks": [],
        "repliesCount": 0,
        "isOfficial": True,
        "isOfficialPromo": True,
        "sponsorLabel": "إعلان رسمي",
        "origin": "pulse_official_announcement"
    }

    print(f"[Announcer] Publishing official pulse {pulse_id}...", flush=True)
    post_res = session.put(f"{FIREBASE_URL}/posts/{pulse_id}.json", json=pulse_payload, timeout=10)
    if post_res.status_code in [200, 204]:
        print("[Announcer] Pulse published successfully to RTDB!", flush=True)
    else:
        print(f"[Announcer] Failed to publish pulse: {post_res.status_code}", flush=True)
        return

    # 2. Broadcast notification to all registered users
    notif_success_count = 0
    notif_title = "نبضة رسمية: تحديث كبير وتطويرات شاملة في PULSE"
    notif_preview = "ترويق الواجهة، فيزياء 120 إطار، مزامنة البروفايلات، وضغط الفيديوهات..."

    for uid in users_keys:
        notif_id = f"notif_update_{now_ms}_{uid[-6:]}"
        notif_payload = {
            "id": notif_id,
            "type": "official",
            "postId": pulse_id,
            "actor": {
                "uid": OFFICIAL_PULSE["uid"],
                "displayName": OFFICIAL_PULSE["displayName"],
                "username": OFFICIAL_PULSE["username"],
                "avatar": OFFICIAL_PULSE["avatar"],
                "isVerified": True,
                "isOfficial": True
            },
            "text": notif_title,
            "preview": notif_preview,
            "createdAt": now_iso,
            "read": False
        }

        notif_res = session.put(f"{FIREBASE_URL}/notifications/{uid}/{notif_id}.json", json=notif_payload, timeout=5)
        if notif_res.status_code in [200, 204]:
            notif_success_count += 1

    print(f"[Announcer] Successfully broadcasted notification to {notif_success_count}/{len(users_keys)} users.", flush=True)
    print("[Announcer] All operations completed with ZERO fake metrics and ZERO emojis.", flush=True)

if __name__ == "__main__":
    run()
