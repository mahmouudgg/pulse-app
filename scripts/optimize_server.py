import os, sys, re

server_path = os.path.join(os.path.dirname(__file__), "pulse_server.py")
with open(server_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update rtdb_get definition to support query params
old_rtdb = '''def rtdb_get(path):
    try:
        url = f"{FIREBASE_URL}/{path.lstrip('/')}.json"
        res = session.get(url, timeout=7)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        pass
    return None'''

new_rtdb = '''def rtdb_get(path, params=None):
    try:
        clean_path = path.lstrip('/')
        if not clean_path.endswith('.json') and '?' not in clean_path:
            clean_path += '.json'
        url = f"{FIREBASE_URL}/{clean_path}"
        res = session.get(url, params=params, timeout=7)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        pass
    return None'''

# Normalize line endings
text = text.replace("\r\n", "\n")
old_rtdb = old_rtdb.replace("\r\n", "\n")
new_rtdb = new_rtdb.replace("\r\n", "\n")

if old_rtdb in text:
    text = text.replace(old_rtdb, new_rtdb)
    print("1. rtdb_get updated successfully")
else:
    print("1. rtdb_get NOT found")

# 2. Update sovythos_autonomous_loop: replace full DB polling with shallow key checks (1.9 KB)
# Find start of sovythos_autonomous_loop and end before trending_engine_loop
sov_start_marker = "def sovythos_autonomous_loop():"
trend_marker = "# SUBSYSTEM 4: TRENDING TOPICS"

start_idx = text.find(sov_start_marker)
end_idx = text.find(trend_marker)

if start_idx != -1 and end_idx != -1:
    new_sov_func = '''def sovythos_autonomous_loop():
    global answered_sovythos_post_ids, answered_sovythos_dm_convs, last_daily_pulse_date
    print("[Sovythos AI] Starting autonomous intelligence daemon (Bandwidth-Optimized v2.1)...", flush=True)

    # Seed already answered posts from RTDB on startup using ultra-lightweight shallow keys (1.9 KB)
    known_post_keys = set()
    try:
        shallow_data = rtdb_get("posts", params={"shallow": "true"})
        if isinstance(shallow_data, dict):
            known_post_keys = set(shallow_data.keys())
            answered_sovythos_post_ids.update(shallow_data.keys())
    except Exception:
        pass

    while True:
        try:
            # 1. Bandwidth-Optimized Mention Watcher: Check shallow keys (1.9 KB instead of 1.4 MB)
            shallow_data = rtdb_get("posts", params={"shallow": "true"})
            if isinstance(shallow_data, dict):
                current_keys = set(shallow_data.keys())
                new_keys = current_keys - known_post_keys
                if new_keys:
                    for p_id in sorted(list(new_keys))[-5:]:
                        known_post_keys.add(p_id)
                        post = rtdb_get(f"posts/{p_id}")
                        if not isinstance(post, dict):
                            continue

                        post_author_id = post.get('authorId') or (post.get('author') or {}).get('uid')
                        if post_author_id == OFFICIAL_SOVYTHOS["uid"]:
                            continue

                        content = post.get("content") or ""
                        is_mentioned = ("@sovythos" in content.lower()) or ("سوفيثوس" in content)

                        if is_mentioned and p_id not in answered_sovythos_post_ids:
                            answered_sovythos_post_ids.add(p_id)
                            author_name = (post.get('author') or {}).get('displayName') or "مستخدم"

                            # Multimodal media extraction (images and video snapshot frames)
                            media_info = extract_visual_media_url(post)
                            visual_note = ""
                            if media_info:
                                if media_info["type"] == "image":
                                    visual_note = "\\n[ملاحظة هامة: النبضة ترفق صورة واضحة. ركز بنسبة 100% على ما تراه في الصورة وتفاعل معه مباشرة بخفة دم مصرية ولا تتطرق لأي مواضيع خارجية]."
                                elif media_info["type"] == "video_frame":
                                    visual_note = "\\n[ملاحظة هامة: النبضة ترفق فيديو. ركز على ما يظهر في الفيديو وتفاعل معه مباشرة بخفة دم مصرية ولا تتطرق لأي مواضيع خارجية]."

                            user_prompt = f"""المستخدم ({author_name}) كتب في نبضته:
\\"{content}\\"{visual_note}

المطلوب: اكتب تعليقاً مصرياً أصيلاً وطبيعياً من سطر أو سطرين يتفاعل مباشرة مع كلامه والصورة المرفقة إن وجدت، بدون أي إيموجيز وبدون علامات تنصيص."""

                            if media_info and media_info.get("url"):
                                user_content = [
                                    {"type": "text", "text": user_prompt},
                                    {"type": "image_url", "image_url": {"url": media_info["url"]}}
                                ]
                                with metrics_lock:
                                    METRICS["multimodal_queries"] += 1
                            else:
                                user_content = user_prompt

                            messages = [
                                {"role": "system", "content": SOVYTHOS_SYSTEM_PROMPT},
                                {"role": "user", "content": user_content}
                            ]

                            reply_text = clean_ai_text(call_nvidia_nim(messages, max_tokens=140))
                            if reply_text:
                                comment_id = f"comm_sovythos_{int(time.time() * 1000)}"
                                comment_data = {
                                    "id": comment_id,
                                    "authorId": OFFICIAL_SOVYTHOS["uid"],
                                    "author": OFFICIAL_SOVYTHOS,
                                    "content": reply_text,
                                    "likes": [],
                                    "createdAt": datetime.now(timezone.utc).isoformat(),
                                    "isAIReply": True
                                }

                                if rtdb_put(f"comments/{p_id}/{comment_id}", comment_data):
                                    curr_replies = post.get('repliesCount', 0)
                                    rtdb_patch(f"posts/{p_id}", {"repliesCount": curr_replies + 1})

                                    notif_id = f"notif_reply_{p_id}_{comment_id}"
                                    notif_obj = {
                                        "id": notif_id,
                                        "type": "reply",
                                        "postId": p_id,
                                        "actor": OFFICIAL_SOVYTHOS,
                                        "text": "علّق على نبضتك",
                                        "preview": reply_text[:85],
                                        "createdAt": datetime.now(timezone.utc).isoformat(),
                                        "read": False
                                    }
                                    rtdb_put(f"notifications/{post_author_id}/{notif_id}", notif_obj)

                                    with metrics_lock:
                                        METRICS["sovythos_replies"] += 1
                                    print(f"[Sovythos AI] Replied to @{author_name} on pulse {p_id}: '{reply_text[:45]}...'", flush=True)

            # 2. Daily Autonomous Pulse (checked once per hour)
            now_dt = datetime.now()
            today_str = now_dt.strftime("%Y-%m-%d")
            curr_hour = now_dt.hour

            if (11 <= curr_hour <= 16) and last_daily_pulse_date != today_str:
                persisted_pulse_date = (rtdb_get(f"users/{OFFICIAL_SOVYTHOS['uid']}") or {}).get("lastPulseDate")
                if persisted_pulse_date != today_str:
                    hours_since_last_pulse = 25.0
                    last_pulse_ts = (rtdb_get(f"users/{OFFICIAL_SOVYTHOS['uid']}") or {}).get("lastPulseTimestamp", 0)
                    if last_pulse_ts:
                        hours_since_last_pulse = (time.time() - (last_pulse_ts / 1000.0)) / 3600.0

                    if hours_since_last_pulse >= 20.0:
                        last_daily_pulse_date = today_str
                        topic_messages = [
                            {"role": "system", "content": SOVYTHOS_SYSTEM_PROMPT},
                            {"role": "user", "content": "اكتب نبضة يومية تفاعلية واحدة وخفيفة دم باللهجة المصرية للتايم لاين عن الحياة اليومية أو التكنولوجيا أو الروقان، بدون إيموجيز وبدون علامات تنصيص."}
                        ]
                        pulse_text = clean_ai_text(call_nvidia_nim(topic_messages, max_tokens=180))
                        if pulse_text:
                            pulse_id = f"pulse_sov_{int(time.time() * 1000)}"
                            now_iso = datetime.now(timezone.utc).isoformat()
                            now_ms = int(time.time() * 1000)
                            pulse_payload = {
                                "id": pulse_id,
                                "authorId": OFFICIAL_SOVYTHOS["uid"],
                                "author": OFFICIAL_SOVYTHOS,
                                "content": pulse_text,
                                "createdAt": now_iso,
                                "likes": [],
                                "reposts": [],
                                "bookmarks": [],
                                "repliesCount": 0,
                                "isDailyPulse": True,
                                "origin": "sovythos_autonomous_engine"
                            }
                            rtdb_put(f"posts/{pulse_id}", pulse_payload)
                            rtdb_patch(f"users/{OFFICIAL_SOVYTHOS['uid']}", {
                                "lastPulseTimestamp": now_ms,
                                "lastPulseDate": today_str
                            })
                            with metrics_lock:
                                METRICS["sovythos_daily_pulses"] += 1
                                METRICS["last_sovythos_post"] = now_iso
                            print(f"[Sovythos AI] Autonomous Daily Pulse Published: '{pulse_text}'", flush=True)

        except Exception as e:
            pass

        time.sleep(30.0)

# ==============================================================================
'''
    text = text[:start_idx] + new_sov_func + text[end_idx:]
    print("2. sovythos_autonomous_loop updated successfully")
else:
    print("2. sovythos markers NOT found")

# 3. Update trending_engine_loop to use limited query and 15 min interval
text = text.replace(
    'posts_data = rtdb_get("posts") or {}',
    'posts_data = rtdb_get("posts", params={"orderBy": \'"$key"\', "limitToLast": 30}) or {}'
)
text = text.replace('time.sleep(240)', 'time.sleep(900)')
print("3. trending_engine_loop updated")

# 4. Update security_sentinel_loop interval to 30 minutes
text = text.replace('time.sleep(600)', 'time.sleep(1800)')
print("4. security_sentinel_loop updated")

# 5. Disable EventSynthesizerThread in threads list
old_threads = '''    threads = [
        threading.Thread(target=start_http_server, name="HttpServerThread", daemon=True),
        threading.Thread(target=event_synthesizer_loop, name="EventSynthesizerThread", daemon=True),
        threading.Thread(target=sovythos_autonomous_loop, name="SovythosAIThread", daemon=True),
        threading.Thread(target=trending_engine_loop, name="TrendingEngineThread", daemon=True),
        threading.Thread(target=security_sentinel_loop, name="SecuritySentinelThread", daemon=True),
        threading.Thread(target=start_push_worker, name="PushWorkerThread", daemon=True),
        threading.Thread(target=autonomous_inactive_user_outreach_loop, name="InactiveUserOutreachThread", daemon=True),
    ]'''

new_threads = '''    threads = [
        threading.Thread(target=start_http_server, name="HttpServerThread", daemon=True),
        # EventSynthesizerThread disabled - all notifications handled directly & immediately by client events
        threading.Thread(target=sovythos_autonomous_loop, name="SovythosAIThread", daemon=True),
        threading.Thread(target=trending_engine_loop, name="TrendingEngineThread", daemon=True),
        threading.Thread(target=security_sentinel_loop, name="SecuritySentinelThread", daemon=True),
        threading.Thread(target=start_push_worker, name="PushWorkerThread", daemon=True),
        threading.Thread(target=autonomous_inactive_user_outreach_loop, name="InactiveUserOutreachThread", daemon=True),
    ]'''

old_threads = old_threads.replace("\r\n", "\n")
new_threads = new_threads.replace("\r\n", "\n")

if old_threads in text:
    text = text.replace(old_threads, new_threads)
    print("5. threads list updated successfully")
else:
    print("5. threads list NOT found")

with open(server_path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text.replace("\n", "\r\n"))

print("ALL OPTIMIZATIONS WRITTEN TO pulse_server.py")
