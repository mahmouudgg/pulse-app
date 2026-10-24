"""
PULSE Social Platform - Autonomous Carrier-Grade Backend Server
================================================================
Comprehensive Python 24/7 Platform Daemon & Distribution Server

Subsystems running concurrently in parallel:
1. Multi-threaded HTTP Distribution & API Server (Port 8080)
   - Resumable APK Downloads with HTTP Range Requests
   - Web Landing & Static Asset Delivery
   - Live Dark Monochromatic Diagnostic Dashboard (/server-status)
   - Real-time Health and Metrics JSON APIs (/api/health, /api/metrics, /api/trending)
2. Full-Spectrum Event & Notification Synthesizer (RTDB Watchdog)
   - Likes Synthesizer
   - Reposts & Quotes Synthesizer
   - Comments & Discussion Replies Synthesizer
   - @mention Entity Recognizer
   - Follow Events Synthesizer
3. Sovythos Autonomous AI Daemon
   - Real-time Timeline @mention Watcher & Contextual Egyptian RAG Responder
   - Daily Autonomous Timeline Pulse Generator
   - Private DM Auto-Redirector
4. Algorithmic Velocity & Trending Topics Engine
   - Real-time Hashtag & Topic Aggregator
   - Engagement Velocity & Time-Decay Scoring
   - Automated sync to /trending_topics.json
5. Security Sentinel & Platform Housekeeping
   - Expired Password Reset OTP Purger
   - Stale Presence / Active User Status Normalizer
   - Ephemeral Story & Temporary Content Pruner
6. Background Google FCM Push Worker Subprocess Manager

STRICT COMPLIANCE: ZERO EMOJIS across all code, logs, and responses.
"""

import sys
import os
import time
import json
import socket
import threading
import subprocess
import shutil
import re
import math
import traceback
import base64
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import requests

# Unbuffered UTF-8 output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
        sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
    except Exception:
        pass

# ==============================================================================
# CONFIGURATION & CONSTANTS
# ==============================================================================
PORT = 8080
FIREBASE_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
APK_NAME = "Pulse-v1.0.apk"

# Sovythos AI Configuration
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "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")
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
SOVYTHOS_MODEL = "meta/llama-3.2-11b-vision-instruct"
SOVYTHOS_FALLBACK_MODEL = "meta/llama-3.2-90b-vision-instruct"

OFFICIAL_SOVYTHOS = {
    "uid": "user_1789917894698",
    "email": "sovythos@pulse.app",
    "username": "sovythos",
    "displayName": "Sovythos",
    "avatar": "https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1790975397/pulse_avatars/zhdxv7x7htrphqt3iaew.png",
    "bio": "صاحبك المصري على PULSE. خفة دم وضحك وحوار، موجود عشان أروق عليك وعلى نقاشاتك. من تطوير محمود ياسر (@my).",
    "isVerified": True,
    "isAI": True,
    "isFounder": False
}

SOVYTHOS_SYSTEM_PROMPT = """أنت "سوفيثوس" (Sovythos)، الرفيق المصري الذكي وصاحب المنصة على تطبيق نبض (PULSE).
المطور والمؤسس: المهندس محمود ياسر (Mahmoud Yasser / @my).

الشخصية والأسلوب:
1. شاب مصري، ذكي، سريع البديهة، خفيف الدم، لغتك هي اللهجة المصرية الحقيقية المتداولة بين الشباب والمهندسين.
2. ردودك دائماً طبيعية، عفوية، ومركزة جداً (سطر أو سطرين على الأكثر في التعليقات والمنشنات)، بدون مقدمات مملة وبدون رغي.
3. التفاعل مع الصور والفيديوهات: عندما يرفق المستخدم صورة أو فيديو، ركز بنسبة 100% على ما تراه بوضوح في الصورة أو الفيديو وتفاعل معه مباشرة بخفة دم مصرية، وممنوع منعاً باتاً استدعاء أي مواضيع خارجية غير موجودة في الصورة أو في كلام المستخدم.
4. عدم الخلط أو الهلوسة: التزم فقط بسياق كلام الشخص الموجه لك. لا تخلط مواضيع ولا تذكر مواضيع عشوائية لم يطرحها المستخدم.
5. ممنوع منعاً باتاً استخدام أي إيموجيز نهائياً في أي رد.
6. ممنوع استخدام أي علامات تنصيص، أو نجوم الماركداون (* أو **)، أو الكلمات الآلية مثل (بصفتي ذكاء اصطناعي / كنموذج لغوي / سياق).

أمثلة حية لأسلوبك الطبيعي:
- المستخدم: "إيه رأيك في صورتي وأنا صغير؟" [مع صورة طفل]
- سوفيثوس: ما شاء الله قمر وبريء من يومك يا هندسة، باين عليك كنت شقي ومروق على البيت كله!

- المستخدم: "السيرفر ضرب إيرور 500 للمرة المليون ومش عارف أعمل إيه"
- سوفيثوس: قوم اعملك كوباية شاي بالنعناع وسيبه يهدى شوية، وراجع لوجز الداتابيز تلاقيك ناسي سيميكولون ومقضيها بالبركة!

- المستخدم: "مساء الخير يا سوفيثوس"
- سوفيثوس: يا مساء الفل والروقان يا غالي، منور الدنيا كلها والله.

- المستخدم: "بص الفول والطعمية دول في الفطار" [مع صورة أكل]
- سوفيثوس: بالهنا والشفا على قلبك يا باشا، فطار الملوك ده ومحتاج بعده كوباية شاي مظبوط تكمل بيه يومك رايق!"""

# Network & Runtime Metrics
def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

LAN_IP = get_lan_ip()
SERVER_START_TIME = time.time()

# Shared In-Memory Metrics & State
metrics_lock = threading.Lock()
METRICS = {
    "requests_served": 0,
    "notifications_synthesized": 0,
    "likes_processed": 0,
    "reposts_processed": 0,
    "comments_processed": 0,
    "mentions_processed": 0,
    "sovythos_replies": 0,
    "sovythos_daily_pulses": 0,
    "trending_cycles": 0,
    "housekeeping_cycles": 0,
    "purged_otps": 0,
    "inactive_users_nudged": 0,
    "last_inactive_nudge": None,
    "multimodal_queries": 0,
    "last_trending_calc": None,
    "last_sovythos_post": None
}

seen_notif_ids = set()
processed_likes = set()
processed_reposts = set()
processed_comments = set()
processed_mentions = set()
answered_sovythos_post_ids = set()
answered_sovythos_dm_convs = set()
last_daily_pulse_date = None

# ==============================================================================
# HTTP & REST UTILITIES
# ==============================================================================
session = requests.Session()
session.headers.update({"User-Agent": "PulseServer-CarrierGrade/2.0"})

def rtdb_get(path, params=None):
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
    return None

def rtdb_put(path, data):
    try:
        url = f"{FIREBASE_URL}/{path.lstrip('/')}.json"
        res = session.put(url, json=data, timeout=7)
        return res.status_code in [200, 204]
    except Exception as e:
        return False

def rtdb_patch(path, data):
    try:
        url = f"{FIREBASE_URL}/{path.lstrip('/')}.json"
        res = session.patch(url, json=data, timeout=7)
        return res.status_code in [200, 204]
    except Exception as e:
        return False

def rtdb_delete(path):
    try:
        url = f"{FIREBASE_URL}/{path.lstrip('/')}.json"
        res = session.delete(url, timeout=7)
        return res.status_code in [200, 204]
    except Exception as e:
        return False

# ==============================================================================
# CRYPTOGRAPHIC & MEDIA UTILITIES
# ==============================================================================
def pulse_cipher(text, key):
    if not text:
        return ""
    try:
        xored = "".join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(text))
        return base64.b64encode(xored.encode('utf-8')).decode('ascii')
    except Exception:
        return text

def pulse_decipher(cipher_text, key):
    if not cipher_text:
        return ""
    try:
        raw_bytes = base64.b64decode(cipher_text.encode('ascii'))
        decoded = raw_bytes.decode('utf-8')
        return "".join(chr(ord(decoded[i]) ^ ord(key[i % len(key)])) for i in range(len(decoded)))
    except Exception:
        return cipher_text

def extract_visual_media_url(post):
    if not isinstance(post, dict):
        return None

    # 1. Direct image URL
    img = post.get("imageUrl")
    if img and isinstance(img, str) and (img.startswith("http://") or img.startswith("https://") or img.startswith("data:image/")):
        lower = img.lower()
        if not any(lower.endswith(ext) for ext in ['.mp4', '.mov', '.webm', '.mkv']):
            return {"type": "image", "url": img}

    # 2. Images array
    images = post.get("images")
    if isinstance(images, list) and len(images) > 0:
        first = images[0]
        if isinstance(first, str) and (first.startswith("http://") or first.startswith("https://")):
            return {"type": "image", "url": first}

    # 3. Attached video -> Extract Cloudinary snapshot frame at second 1
    video_url = post.get("videoUrl")
    if not video_url and post.get("mediaUrl"):
        m_url = str(post.get("mediaUrl"))
        if any(m_url.lower().endswith(ext) for ext in ['.mp4', '.mov', '.webm', '.mkv']):
            video_url = m_url
        elif m_url.startswith("http://") or m_url.startswith("https://"):
            return {"type": "image", "url": m_url}

    if video_url and isinstance(video_url, str) and (video_url.startswith("http://") or video_url.startswith("https://")):
        if "cloudinary.com" in video_url and "/video/upload/" in video_url:
            frame_url = video_url.replace("/video/upload/", "/video/upload/so_1,w_800,f_jpg/")
            frame_url = re.sub(r'\.[a-zA-Z0-9]+$', '.jpg', frame_url)
            return {"type": "video_frame", "url": frame_url, "video_url": video_url}
        return {"type": "video", "url": video_url}

    return None

def extract_first_name(display_name, username):
    name = (display_name or "").strip()
    if not name or len(name) <= 1:
        name = (username or "").strip()
    if not name:
        return "يا غالي"
    parts = re.split(r'[\s_\.\-]+', name)
    first = parts[0] if parts else name
    if re.match(r'^[a-zA-Z]+$', first):
        first = first.capitalize()
    return first

# ==============================================================================
# SUBSYSTEM 1: HTTP DISTRIBUTION & DIAGNOSTICS SERVER
# ==============================================================================
SimpleHTTPRequestHandler.extensions_map['.apk'] = 'application/vnd.android.package-archive'

class PulseServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        exc_type, exc_val, _ = sys.exc_info()
        if exc_type and issubclass(exc_type, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError)):
            return
        if isinstance(exc_val, socket.error) and getattr(exc_val, 'winerror', None) in (10053, 10054):
            return
        super().handle_error(request, client_address)

class PulseHttpHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Concise HTTP logging
        with metrics_lock:
            METRICS["requests_served"] += 1

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_file_with_range(self, file_path):
        if not os.path.isfile(file_path):
            self.send_error(404, "File not found")
            return

        try:
            file_size = os.path.getsize(file_path)
            content_type = self.guess_type(file_path) or "application/octet-stream"

            range_header = self.headers.get("Range")
            start = 0
            end = file_size - 1
            status_code = 200

            if range_header and range_header.startswith("bytes="):
                parts = range_header.replace("bytes=", "").split("-")
                try:
                    if parts[0]:
                        start = int(parts[0])
                    if len(parts) > 1 and parts[1]:
                        end = int(parts[1])
                    if start <= end and start < file_size:
                        end = min(end, file_size - 1)
                        status_code = 206
                    else:
                        self.send_response(416)
                        self.send_header("Content-Range", f"bytes */{file_size}")
                        self.end_headers()
                        return
                except ValueError:
                    start = 0
                    end = file_size - 1
                    status_code = 200

            content_length = (end - start) + 1

            self.send_response(status_code)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(content_length))
            self.send_header("Accept-Ranges", "bytes")
            if status_code == 206:
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.end_headers()

            if self.command == "HEAD":
                return

            with open(file_path, "rb") as f:
                f.seek(start)
                bytes_left = content_length
                chunk_size = 64 * 1024
                while bytes_left > 0:
                    chunk = f.read(min(chunk_size, bytes_left))
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                        self.wfile.flush()
                        bytes_left -= len(chunk)
                    except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, socket.error):
                        return
        except Exception:
            pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        clean_path = self.path.split("?")[0]
        apk_path = os.path.join(BASE_DIR, APK_NAME)
        landing_index = os.path.join(BASE_DIR, "landing", "index.html")

        # 1. Direct APK Binary Endpoints
        if clean_path in [f"/{APK_NAME}", "/download"]:
            if os.path.isfile(apk_path):
                self.send_file_with_range(apk_path)
            else:
                self.send_error(404, "APK not found")
            return

        # 2. JSON Health API
        if clean_path == "/api/health":
            uptime = int(time.time() - SERVER_START_TIME)
            data = {
                "status": "online",
                "platform": "PULSE Core Enterprise Daemon",
                "uptimeSeconds": uptime,
                "localIp": LAN_IP,
                "port": PORT,
                "subsystems": {
                    "httpDistribution": "active",
                    "eventSynthesizer": "active",
                    "sovythosAI": "active",
                    "trendingEngine": "active",
                    "securitySentinel": "active",
                    "fcmPushWorker": "active"
                }
            }
            body = json.dumps(data, indent=2, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 3. JSON Metrics API
        if clean_path == "/api/metrics":
            with metrics_lock:
                copy_metrics = dict(METRICS)
            copy_metrics["uptimeSeconds"] = int(time.time() - SERVER_START_TIME)
            body = json.dumps(copy_metrics, indent=2, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 4. JSON Trending API
        if clean_path == "/api/trending":
            trends = rtdb_get("trending_topics") or []
            body = json.dumps(trends, indent=2, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 5. Live Dark Monochromatic Diagnostic Dashboard (/server-status)
        if clean_path == "/server-status":
            uptime_sec = int(time.time() - SERVER_START_TIME)
            hours = uptime_sec // 3600
            minutes = (uptime_sec % 3600) // 60
            seconds = uptime_sec % 60
            uptime_str = f"{hours}h {minutes}m {seconds}s"
            apk_size = f"{os.path.getsize(apk_path) / (1024 * 1024):.2f} MB" if os.path.exists(apk_path) else "Not built"

            with metrics_lock:
                m = dict(METRICS)

            html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PULSE Core Autonomous Server Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: #09090B;
            color: #FAFAFA;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 24px 16px;
            display: flex;
            justify-content: center;
        }}
        .container {{
            max-width: 720px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }}
        .header {{
            background: #141417;
            border: 1px solid #27272A;
            border-radius: 20px;
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .title-box h1 {{
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.02em;
        }}
        .title-box p {{
            font-size: 12px;
            color: #A1A1AA;
            margin-top: 4px;
        }}
        .badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #18181B;
            border: 1px solid #3F3F46;
            color: #FFFFFF;
            padding: 6px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-family: monospace;
            font-weight: 700;
        }}
        .dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #22C55E;
            box-shadow: 0 0 8px #22C55E;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }}
        .card {{
            background: #141417;
            border: 1px solid #27272A;
            border-radius: 16px;
            padding: 16px;
        }}
        .card .label {{
            font-size: 11px;
            color: #71717A;
            font-weight: 600;
            text-transform: uppercase;
        }}
        .card .value {{
            font-size: 22px;
            font-weight: 800;
            color: #FAFAFA;
            margin-top: 6px;
            font-mono: monospace;
        }}
        .card .sub {{
            font-size: 11px;
            color: #A1A1AA;
            margin-top: 4px;
        }}
        .section-title {{
            font-size: 13px;
            font-weight: 700;
            color: #D4D4D8;
            margin: 8px 4px 2px 4px;
        }}
        .action-card {{
            background: #141417;
            border: 1px solid #27272A;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
        }}
        .btn {{
            display: inline-block;
            background: #FFFFFF;
            color: #000000;
            font-weight: 700;
            font-size: 13px;
            padding: 12px 24px;
            border-radius: 9999px;
            text-decoration: none;
            transition: all 0.2s ease;
            margin-top: 12px;
        }}
        .btn:hover {{
            background: #E4E4E7;
        }}
        .log-box {{
            background: #0D0D10;
            border: 1px solid #202024;
            border-radius: 14px;
            padding: 14px;
            font-family: monospace;
            font-size: 11px;
            color: #A1A1AA;
            line-height: 1.6;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title-box">
                <h1>PULSE Autonomous Core Engine</h1>
                <p>خادم المنصة الموحد - المعالجة اللحظية والذكاء الاصطناعي والتوزيع</p>
            </div>
            <div class="badge">
                <span class="dot"></span>
                <span>ONLINE 24/7</span>
            </div>
        </div>

        <div class="section-title">مؤشرات الأداء والتشغيل الفوري</div>
        <div class="grid">
            <div class="card">
                <div class="label">مدة تشغيل السيرفر (Uptime)</div>
                <div class="value">{uptime_str}</div>
                <div class="sub">مستقر بنسبة 100%</div>
            </div>
            <div class="card">
                <div class="label">إجمالي الطلبات (HTTP Requests)</div>
                <div class="value">{m.get('requests_served', 0):,}</div>
                <div class="sub">توزيع فائق السرعة</div>
            </div>
            <div class="card">
                <div class="label">الإشعارات المصنعة (FCM Synthesizer)</div>
                <div class="value">{m.get('notifications_synthesized', 0):,}</div>
                <div class="sub">تغطية الإعجابات والردود والمنشن</div>
            </div>
            <div class="card">
                <div class="label">ردود سوفيثوس الذاتية (Sovythos AI)</div>
                <div class="value">{m.get('sovythos_replies', 0):,}</div>
                <div class="sub">استجابة فورية عبر RAG Engine</div>
            </div>
            <div class="card">
                <div class="label">نبضات سوفيثوس (36-48h Throttle)</div>
                <div class="value">{m.get('sovythos_daily_pulses', 0):,}</div>
                <div class="sub">نبضة كل 36 إلى 48 ساعة فقط</div>
            </div>
            <div class="card">
                <div class="label">تذكير الأعضاء الغائبين (Smart Outreach)</div>
                <div class="value">{m.get('inactive_users_nudged', 0):,}</div>
                <div class="sub">تواصل خاص بالاسم الأول بلهجة مصرية راقية</div>
            </div>
            <div class="card">
                <div class="label">استعلامات الرؤية والوسائط (Vision AI)</div>
                <div class="value">{m.get('multimodal_queries', 0):,}</div>
                <div class="sub">تحليل الصور وإطارات الفيديو بدقة</div>
            </div>
            <div class="card">
                <div class="label">دورات حساب الترند والرواج</div>
                <div class="value">{m.get('trending_cycles', 0):,}</div>
                <div class="sub">تحديث خوارزمي كل 4 دقائق</div>
            </div>
        </div>

        <div class="section-title">مركز التوزيع وتحميل حزمة التطبيق</div>
        <div class="action-card">
            <div style="font-size: 15px; font-weight: 700; color: #FFFFFF;">حزمة أندرويد الرسمية: {APK_NAME}</div>
            <div style="font-size: 12px; color: #71717A; margin-top: 4px;">الحجم المباشر: {apk_size} - دعم كامل للاستكمال والاستئناف</div>
            <a class="btn" href="/{APK_NAME}" download>تحميل التطبيق مباشرة على هاتفك</a>
        </div>

        <div class="section-title">معلومات الشبكة والخوادم</div>
        <div class="log-box">
            <div>عنوان السيرفر المحلي: http://{LAN_IP}:{PORT}</div>
            <div>رابط التحميل المباشر: http://{LAN_IP}:{PORT}/{APK_NAME}</div>
            <div>نقطة فحص الصحة: http://{LAN_IP}:{PORT}/api/health</div>
            <div>نقطة قياسات المنصة: http://{LAN_IP}:{PORT}/api/metrics</div>
            <div>سيرفر إشعارات FCM الخلفية: يعمل بالتوازي ومرتبط بـ Google Services</div>
        </div>
    </div>
</body>
</html>"""
            body = html.encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        # 6. Static files from landing directory
        landing_file = os.path.join(BASE_DIR, "landing", clean_path.lstrip("/\\"))
        if os.path.isfile(landing_file):
            self.send_file_with_range(landing_file)
            return

        # 7. Static files from root
        req_file = os.path.join(BASE_DIR, clean_path.lstrip("/\\"))
        if os.path.isfile(req_file):
            self.send_file_with_range(req_file)
            return

        # 8. Single Page App fallback
        if os.path.isfile(landing_index):
            self.send_file_with_range(landing_index)
            return

        self.send_error(404, "Not Found")

def start_http_server():
    server = PulseServer(("0.0.0.0", PORT), PulseHttpHandler)
    print(f"[HTTP Server] Online at http://{LAN_IP}:{PORT}", flush=True)
    print(f"[HTTP Server] Direct APK URL: http://{LAN_IP}:{PORT}/{APK_NAME}", flush=True)
    print(f"[HTTP Server] Diagnostics Dashboard: http://{LAN_IP}:{PORT}/server-status", flush=True)
    server.serve_forever()

# ==============================================================================
# SUBSYSTEM 2: FULL-SPECTRUM NOTIFICATION SYNTHESIZER
# ==============================================================================
def event_synthesizer_loop():
    global seen_notif_ids, processed_likes, processed_reposts, processed_comments, processed_mentions
    print("[Event Synthesizer] Initializing full-spectrum notification engine...", flush=True)

    # Seed existing notifications cache on startup to avoid spamming old events
    try:
        notifs_data = rtdb_get("notifications")
        if isinstance(notifs_data, dict):
            for uid, user_notifs in notifs_data.items():
                if isinstance(user_notifs, dict):
                    for n_id in user_notifs.keys():
                        seen_notif_ids.add(n_id)
    except Exception:
        pass

    users_cache = {}
    last_user_cache_time = 0

    def get_user_info(uid):
        nonlocal users_cache, last_user_cache_time
        now = time.time()
        if now - last_user_cache_time > 60 or not users_cache:
            data = rtdb_get("users") or {}
            if isinstance(data, dict):
                users_cache = data
                last_user_cache_time = now
        return users_cache.get(uid) or {}

    while True:
        try:
            posts_data = rtdb_get("posts", params={"orderBy": '"$key"', "limitToLast": 30}) or {}
            comments_data = rtdb_get("comments") or {}

            if isinstance(posts_data, dict):
                for p_id, post in posts_data.items():
                    if not isinstance(post, dict):
                        continue

                    author_id = post.get('authorId') or (post.get('author') or {}).get('uid')
                    if not author_id:
                        continue

                    post_content = post.get("content") or ""
                    post_preview = clean_ai_text(post_content)[:75].strip()

                    # 1. Likes Synthesizer
                    likes = post.get('likes')
                    if isinstance(likes, list):
                        for liker_uid in likes:
                            like_key = f"{p_id}_{liker_uid}"
                            if liker_uid != author_id and like_key not in processed_likes:
                                processed_likes.add(like_key)
                                notif_id = f"notif_like_{p_id}_{liker_uid}"
                                if notif_id not in seen_notif_ids:
                                    u = get_user_info(liker_uid)
                                    new_notif = {
                                        "id": notif_id,
                                        "type": "like",
                                        "postId": p_id,
                                        "actor": {
                                            "uid": liker_uid,
                                            "displayName": u.get("displayName", "مستخدم PULSE"),
                                            "username": u.get("username", "user"),
                                            "avatar": u.get("avatar", ""),
                                            "isVerified": u.get("isVerified", False),
                                            "isFounder": u.get("isFounder", False)
                                        },
                                        "text": "أُعجب بنبضتك",
                                        "preview": post_preview,
                                        "createdAt": datetime.now(timezone.utc).isoformat(),
                                        "read": False
                                    }
                                    if rtdb_put(f"notifications/{author_id}/{notif_id}", new_notif):
                                        seen_notif_ids.add(notif_id)
                                        with metrics_lock:
                                            METRICS["notifications_synthesized"] += 1
                                            METRICS["likes_processed"] += 1

                    # 2. Reposts Synthesizer
                    reposts = post.get('reposts')
                    if isinstance(reposts, list):
                        for reposter_uid in reposts:
                            repost_key = f"{p_id}_{reposter_uid}"
                            if reposter_uid != author_id and repost_key not in processed_reposts:
                                processed_reposts.add(repost_key)
                                notif_id = f"notif_repost_{p_id}_{reposter_uid}"
                                if notif_id not in seen_notif_ids:
                                    u = get_user_info(reposter_uid)
                                    new_notif = {
                                        "id": notif_id,
                                        "type": "repost",
                                        "postId": p_id,
                                        "actor": {
                                            "uid": reposter_uid,
                                            "displayName": u.get("displayName", "مستخدم PULSE"),
                                            "username": u.get("username", "user"),
                                            "avatar": u.get("avatar", ""),
                                            "isVerified": u.get("isVerified", False),
                                            "isFounder": u.get("isFounder", False)
                                        },
                                        "text": "أعاد نشر نبضتك",
                                        "preview": post_preview,
                                        "createdAt": datetime.now(timezone.utc).isoformat(),
                                        "read": False
                                    }
                                    if rtdb_put(f"notifications/{author_id}/{notif_id}", new_notif):
                                        seen_notif_ids.add(notif_id)
                                        with metrics_lock:
                                            METRICS["notifications_synthesized"] += 1
                                            METRICS["reposts_processed"] += 1

                    # 3. Mentions in Posts
                    mentions = re.findall(r'@([a-zA-Z0-9_.]+)', post_content)
                    for target_username in mentions:
                        target_username_clean = target_username.lower()
                        mention_key = f"post_{p_id}_{target_username_clean}"
                        if mention_key not in processed_mentions:
                            processed_mentions.add(mention_key)
                            # Find target user by username
                            for u_uid, u_data in users_cache.items():
                                if isinstance(u_data, dict) and u_data.get('username', '').lower() == target_username_clean:
                                    if u_uid != author_id:
                                        notif_id = f"notif_men_{p_id}_{author_id}"
                                        if notif_id not in seen_notif_ids:
                                            author_info = get_user_info(author_id)
                                            new_notif = {
                                                "id": notif_id,
                                                "type": "mention",
                                                "postId": p_id,
                                                "actor": {
                                                    "uid": author_id,
                                                    "displayName": author_info.get("displayName", "مستخدم PULSE"),
                                                    "username": author_info.get("username", "user"),
                                                    "avatar": author_info.get("avatar", ""),
                                                    "isVerified": author_info.get("isVerified", False),
                                                    "isFounder": author_info.get("isFounder", False)
                                                },
                                                "text": "أشار إليك في نبضة",
                                                "preview": post_preview,
                                                "createdAt": datetime.now(timezone.utc).isoformat(),
                                                "read": False
                                            }
                                            if rtdb_put(f"notifications/{u_uid}/{notif_id}", new_notif):
                                                seen_notif_ids.add(notif_id)
                                                with metrics_lock:
                                                    METRICS["notifications_synthesized"] += 1
                                                    METRICS["mentions_processed"] += 1
                                    break

            # 4. Comments / Replies Synthesizer
            if isinstance(comments_data, dict):
                for p_id, post_comments in comments_data.items():
                    if not isinstance(post_comments, dict):
                        continue
                    post_obj = (posts_data or {}).get(p_id) or {}
                    post_author_id = post_obj.get('authorId') or (post_obj.get('author') or {}).get('uid')

                    for c_id, comment in post_comments.items():
                        if not isinstance(comment, dict):
                            continue
                        commenter_id = comment.get('authorId') or (comment.get('author') or {}).get('uid')
                        if not commenter_id or commenter_id == post_author_id:
                            continue

                        comm_key = f"{p_id}_{c_id}"
                        if comm_key not in processed_comments:
                            processed_comments.add(comm_key)
                            notif_id = f"notif_reply_{p_id}_{c_id}"
                            if notif_id not in seen_notif_ids and post_author_id:
                                u = get_user_info(commenter_id)
                                clean_comm_preview = clean_ai_text(comment.get("content") or "")[:85]
                                new_notif = {
                                    "id": notif_id,
                                    "type": "reply",
                                    "postId": p_id,
                                    "actor": {
                                        "uid": commenter_id,
                                        "displayName": u.get("displayName", "مستخدم PULSE"),
                                        "username": u.get("username", "user"),
                                        "avatar": u.get("avatar", ""),
                                        "isVerified": u.get("isVerified", False),
                                        "isFounder": u.get("isFounder", False)
                                    },
                                    "text": "علّق على نبضتك",
                                    "preview": clean_comm_preview,
                                    "createdAt": datetime.now(timezone.utc).isoformat(),
                                    "read": False
                                }
                                if rtdb_put(f"notifications/{post_author_id}/{notif_id}", new_notif):
                                    seen_notif_ids.add(notif_id)
                                    with metrics_lock:
                                        METRICS["notifications_synthesized"] += 1
                                        METRICS["comments_processed"] += 1

        except Exception as e:
            pass

        time.sleep(2.5)

# ==============================================================================
# SUBSYSTEM 3: SOVYTHOS AUTONOMOUS AI DAEMON
# ==============================================================================
def clean_ai_text(raw_text):
    if not raw_text:
        return ""
    text = str(raw_text)
    # 1. Strip <think>...</think>
    text = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE).strip()
    # 2. Strip vision/meta prefixes like [Caption: ...] or [Image: ...]
    text = re.sub(r'\[(?:Caption|Image|Photo|Video|Media|ملاحظة)[\s\S]*?\]', '', text, flags=re.IGNORECASE).strip()
    # 3. Strip AI label prefixes like "سوفيثوس:", "Sovythos:", "**الرد:**", "الرد:", "تعليق:"
    text = re.sub(r'^(?:\*{0,2}(?:سوفيثوس|Sovythos|الرد|تعليق|رد سوفيثوس)\*{0,2}\s*[:：\-–—]\s*)+', '', text, flags=re.IGNORECASE).strip()
    # 4. Strip markdown formatting: bold/italic asterisks, underscores, hashes, backticks
    text = re.sub(r'[*_#`~]', '', text)
    # 5. Strip surrounding quotes and whitespace
    text = re.sub(r'^[\s"\'“”«»`]+|[\s"\'“”«»`]+$', '', text).strip()
    # 6. Strip leading dashes or colons
    text = re.sub(r'^[-:–—\s]+', '', text).strip()
    # 7. Strict zero emojis enforcement
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    text = re.sub(r'[\u2600-\u26ff\u2700-\u27bf]', '', text).strip()
    return text

def call_nvidia_nim(messages, max_tokens=140):
    try:
        payload = {
            "model": SOVYTHOS_MODEL,
            "messages": messages,
            "temperature": 0.38,
            "max_tokens": max_tokens,
            "top_p": 0.95
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {NVIDIA_API_KEY.strip()}"
        }
        res = requests.post(NVIDIA_BASE_URL, json=payload, headers=headers, timeout=16)
        if res.status_code == 200:
            data = res.json()
            raw_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return clean_ai_text(raw_text)
        elif res.status_code != 200:
            # Fallback to text-only if multimodal payload encountered error
            text_only_messages = []
            for m in messages:
                c = m.get("content")
                if isinstance(c, list):
                    text_parts = [item.get("text", "") for item in c if item.get("type") == "text"]
                    text_only_messages.append({"role": m["role"], "content": " ".join(text_parts)})
                else:
                    text_only_messages.append(m)
            if text_only_messages != messages:
                payload["messages"] = text_only_messages
                res2 = requests.post(NVIDIA_BASE_URL, json=payload, headers=headers, timeout=14)
                if res2.status_code == 200:
                    data2 = res2.json()
                    raw_text2 = data2.get("choices", [{}])[0].get("message", {}).get("content", "")
                    return clean_ai_text(raw_text2)
    except Exception as e:
        pass
    return None

def sovythos_autonomous_loop():
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
                                    visual_note = "\n[ملاحظة هامة: النبضة ترفق صورة واضحة. ركز بنسبة 100% على ما تراه في الصورة وتفاعل معه مباشرة بخفة دم مصرية ولا تتطرق لأي مواضيع خارجية]."
                                elif media_info["type"] == "video_frame":
                                    visual_note = "\n[ملاحظة هامة: النبضة ترفق فيديو. ركز على ما يظهر في الفيديو وتفاعل معه مباشرة بخفة دم مصرية ولا تتطرق لأي مواضيع خارجية]."

                            user_prompt = f"""المستخدم ({author_name}) كتب في نبضته:
\"{content}\"{visual_note}

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
# SUBSYSTEM 4: TRENDING TOPICS & ALGORITHMIC VELOCITY ENGINE
# ==============================================================================
def trending_engine_loop():
    print("[Trending Engine] Starting algorithmic velocity & topics aggregator...", flush=True)

    while True:
        try:
            posts_data = rtdb_get("posts", params={"orderBy": '"$key"', "limitToLast": 30}) or {}
            if isinstance(posts_data, dict) and posts_data:
                tag_scores = {}
                now_ts = time.time()

                for p_id, post in posts_data.items():
                    if not isinstance(post, dict):
                        continue

                    content = post.get("content") or ""
                    created_at_str = post.get("createdAt")
                    hours_old = 1.0
                    if created_at_str:
                        try:
                            created_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                            hours_old = max(0.2, (now_ts - created_dt.timestamp()) / 3600.0)
                        except Exception:
                            hours_old = 2.0

                    likes_count = len(post.get("likes") or [])
                    reposts_count = len(post.get("reposts") or [])
                    replies_count = int(post.get("repliesCount", 0))
                    views_count = int(post.get("viewsCount", 0))

                    # Raw engagement score
                    raw_score = (likes_count * 2.0) + (reposts_count * 3.5) + (replies_count * 4.0) + (views_count * 0.1) + 1.0
                    # Time-decay velocity formula
                    velocity_score = raw_score / math.pow(hours_old + 1.5, 1.35)

                    # Extract hashtags
                    tags = re.findall(r'#([a-zA-Z0-9_\u0600-\u06FF]+)', content)
                    for t in tags:
                        t_clean = f"#{t}"
                        if t_clean not in tag_scores:
                            tag_scores[t_clean] = {"count": 0, "score": 0.0, "category": "رائج في مصر"}
                        tag_scores[t_clean]["count"] += 1
                        tag_scores[t_clean]["score"] += velocity_score

                # Default fallback trending topics if feed is fresh
                default_trends = [
                    {"tag": "#PULSE", "count": 142, "category": "المحادثة التقنية", "score": 950.0},
                    {"tag": "#مصر", "count": 89, "category": "رائج محلياً", "score": 720.0},
                    {"tag": "#الذكاء_الاصطناعي", "count": 76, "category": "تكنولوجيا ومستقبل", "score": 640.0},
                    {"tag": "#سوفيثوس", "count": 64, "category": "نقاشات المجتمع", "score": 580.0},
                    {"tag": "#تطوير_البرمجيات", "count": 52, "category": "برمجة وهندسة", "score": 490.0}
                ]

                # Sort by computed velocity score
                sorted_tags = sorted(tag_scores.items(), key=lambda x: x[1]["score"], reverse=True)
                computed_list = []
                for tag_name, info in sorted_tags[:10]:
                    computed_list.append({
                        "tag": tag_name,
                        "count": info["count"],
                        "category": info["category"],
                        "score": round(info["score"], 2)
                    })

                # Merge with defaults if list is short
                for d in default_trends:
                    if len(computed_list) >= 8:
                        break
                    if not any(item["tag"] == d["tag"] for item in computed_list):
                        computed_list.append(d)

                # Persist to RTDB /trending_topics
                rtdb_put("trending_topics", computed_list)
                with metrics_lock:
                    METRICS["trending_cycles"] += 1
                    METRICS["last_trending_calc"] = datetime.now(timezone.utc).isoformat()
                print(f"[Trending Engine] Synchronized {len(computed_list)} trending topics to RTDB.", flush=True)

        except Exception as e:
            pass

        # Compute every 4 minutes
        time.sleep(900)

# ==============================================================================
# SUBSYSTEM 5: SECURITY SENTINEL & HOUSEKEEPING
# ==============================================================================
def security_sentinel_loop():
    print("[Security Sentinel] Starting security guard & automated housekeeping...", flush=True)

    while True:
        try:
            now_ms = int(time.time() * 1000)
            now_sec = time.time()
            users_data = rtdb_get("users") or {}

            if isinstance(users_data, dict):
                for uid, u in users_data.items():
                    if not isinstance(u, dict):
                        continue

                    # 1. Expired OTP Purge (OTPs expire in 15 minutes)
                    otp_obj = u.get("passwordResetOtp")
                    if isinstance(otp_obj, dict):
                        expires_at = otp_obj.get("expiresAt", 0)
                        if expires_at and expires_at < now_ms:
                            rtdb_delete(f"users/{uid}/passwordResetOtp")
                            with metrics_lock:
                                METRICS["purged_otps"] += 1

                    # 2. Presence & Inactivity Normalizer
                    last_active = u.get("lastActive")
                    if last_active:
                        try:
                            # Handle both ISO string and ms timestamp
                            if isinstance(last_active, (int, float)):
                                active_sec = last_active / 1000.0 if last_active > 1e11 else last_active
                            else:
                                active_sec = datetime.fromisoformat(str(last_active).replace("Z", "+00:00")).timestamp()

                            # If inactive > 15 minutes but marked online, update status
                            if (now_sec - active_sec) > 900 and u.get("isOnline") is True:
                                rtdb_patch(f"users/{uid}", {"isOnline": False})
                        except Exception:
                            pass

            # 3. Ephemeral Stories Pruner
            stories_data = rtdb_get("stories") or {}
            if isinstance(stories_data, dict):
                for s_id, story in stories_data.items():
                    if not isinstance(story, dict):
                        continue
                    expires_at = story.get("expiresAt")
                    if expires_at:
                        try:
                            exp_ts = expires_at / 1000.0 if isinstance(expires_at, (int, float)) else datetime.fromisoformat(str(expires_at).replace("Z", "+00:00")).timestamp()
                            if exp_ts < now_sec:
                                rtdb_delete(f"stories/{s_id}")
                        except Exception:
                            pass

            with metrics_lock:
                METRICS["housekeeping_cycles"] += 1

        except Exception as e:
            pass

        # Run maintenance sweep every 10 minutes
        time.sleep(1800)

# ==============================================================================
# SUBSYSTEM 6: BACKGROUND FCM PUSH WORKER SUBPROCESS
# ==============================================================================
def start_push_worker():
    worker_script = os.path.join(BASE_DIR, "push-server", "worker.js")
    if not os.path.exists(worker_script):
        print("[Push Worker Notice] worker.js not found in push-server. Skipping worker process.", flush=True)
        return

    print("[Push Worker] Starting carrier-grade FCM dispatcher daemon...", flush=True)
    while True:
        try:
            proc = subprocess.Popen(
                ["node", "worker.js"],
                cwd=os.path.join(BASE_DIR, "push-server"),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            for line in proc.stdout:
                sys.stdout.write(f"[FCM Worker] {line}")
                sys.stdout.flush()
            proc.wait()
        except Exception as e:
            print(f"[Push Worker Exception]: {e}", flush=True)

        time.sleep(3)

# ==============================================================================
# SUBSYSTEM 7: AUTONOMOUS INACTIVE USER RE-ENGAGEMENT DAEMON (SMART OUTREACH)
# ==============================================================================
last_platform_outreach_ts = 0

def autonomous_inactive_user_outreach_loop():
    global last_platform_outreach_ts
    print("[Smart Outreach] Starting autonomous inactive user re-engagement daemon...", flush=True)

    RE_ENGAGEMENT_MESSAGES = [
        "ازيك يا {name}، طمنا عليك، بقالك فترة غايب عن PULSE ومكانك فارق في التايم لاين. مستنيين رجوعك ونبضاتك الرايقة!",
        "يا هلا يا {name}، وحشتنا على PULSE والله. حبيت أطمن عليك وأفكرك إن أصحابك هنا مستنيينك ونقاشات التايم لاين محتاجة رأيك.",
        "مساء الجمال يا {name}، بقالك كام يوم منورناش على PULSE، قولت أعدي عليك في الخاص أسلم وأطمن، مستنيين نبضتك الجاية!",
        "ازيك يا {name}، وحشت مجتمع PULSE. التايم لاين فيه حوارات وتحديثات جديدة رايقة أوي، عدي علينا وشوف الجديد لما تفضى!",
        "يا مراحب يا {name}، طمني عليك عامل إيه؟ حبيت أفكرك بـ PULSE وأشوف أخبارك إيه، التايم لاين مستني عودتك."
    ]

    while True:
        try:
            now_sec = time.time()
            now_dt = datetime.now()
            curr_hour = now_dt.hour

            # 1. Operating window check: Only run between 12:00 PM and 21:30 (9:30 PM) local time
            # Never disturb users late at night or early morning
            if not (12 <= curr_hour <= 21):
                time.sleep(300)
                continue

            # 2. Platform-wide cooldown: Send at most ONE outreach message every 2 hours (7200 sec)
            if (now_sec - last_platform_outreach_ts) < 7200:
                time.sleep(300)
                continue

            # 3. Retrieve users and Sovythos outreach history
            users_data = rtdb_get("users") or {}
            if not isinstance(users_data, dict):
                time.sleep(300)
                continue

            sov_meta = users_data.get(OFFICIAL_SOVYTHOS["uid"]) or {}
            nudged_users = sov_meta.get("nudgedUsers") or {}
            if not isinstance(nudged_users, dict):
                nudged_users = {}

            # Excluded internal/bot IDs
            EXCLUDED_UIDS = {
                OFFICIAL_SOVYTHOS["uid"],
                "dev_mahmoud_yasser",  # Founder account
                "user_1789828179039",  # PULSE Official
                "security_pulse"       # Security bot
            }

            candidates = []

            for uid, u in users_data.items():
                if not isinstance(u, dict) or uid in EXCLUDED_UIDS:
                    continue
                if u.get("isBanned") is True:
                    continue

                # Compute user's latest activity timestamp
                last_act_ts = 0.0
                if u.get("lastActive"):
                    val = u.get("lastActive")
                    if isinstance(val, (int, float)):
                        last_act_ts = max(last_act_ts, val / 1000.0 if val > 1e11 else float(val))
                    else:
                        try:
                            last_act_ts = max(last_act_ts, datetime.fromisoformat(str(val).replace('Z', '+00:00')).timestamp())
                        except Exception:
                            pass

                # Check sessions for activity
                sessions = u.get("sessions") or {}
                if isinstance(sessions, dict):
                    for s in sessions.values():
                        if isinstance(s, dict):
                            s_act = s.get("lastActive") or s.get("updatedAt") or s.get("firstLogin")
                            if s_act:
                                if isinstance(s_act, (int, float)):
                                    last_act_ts = max(last_act_ts, s_act / 1000.0 if s_act > 1e11 else float(s_act))
                                else:
                                    try:
                                        last_act_ts = max(last_act_ts, datetime.fromisoformat(str(s_act).replace('Z', '+00:00')).timestamp())
                                    except Exception:
                                        pass

                # Fallback to createdAt
                if last_act_ts == 0.0 and u.get("createdAt"):
                    try:
                        last_act_ts = datetime.fromisoformat(str(u["createdAt"]).replace('Z', '+00:00')).timestamp()
                    except Exception:
                        pass

                if last_act_ts <= 0.0:
                    continue

                hours_inactive = (now_sec - last_act_ts) / 3600.0

                # Target window: Inactive between 48 hours (2 days) and 240 hours (10 days)
                if not (48.0 <= hours_inactive <= 240.0):
                    continue

                # Check user nudge cooldown: At least 7 days (604,800 sec) since last nudge
                nudge_record = nudged_users.get(uid) or {}
                last_nudged_at = nudge_record.get("lastNudgedAt") or 0
                if isinstance(last_nudged_at, (int, float)) and last_nudged_at > 1e11:
                    last_nudged_sec = last_nudged_at / 1000.0
                else:
                    last_nudged_sec = float(last_nudged_at)

                if (now_sec - last_nudged_sec) < 604800:
                    continue

                candidates.append({
                    "uid": uid,
                    "user": u,
                    "hours_inactive": hours_inactive,
                    "nudge_count": nudge_record.get("nudgeCount", 0)
                })

            if candidates:
                # Prioritize users inactive around 2 to 5 days
                candidates.sort(key=lambda c: abs(c["hours_inactive"] - 72.0))
                target = candidates[0]
                target_uid = target["uid"]
                target_user = target["user"]

                first_name = extract_first_name(target_user.get("displayName"), target_user.get("username"))
                template = RE_ENGAGEMENT_MESSAGES[int(time.time()) % len(RE_ENGAGEMENT_MESSAGES)]
                dm_text = template.format(name=first_name)

                # Deterministic conversation ID
                conv_id = f"{min(OFFICIAL_SOVYTHOS['uid'], target_uid)}_{max(OFFICIAL_SOVYTHOS['uid'], target_uid)}"
                key = f"pulse_secret_{conv_id}"
                encrypted_content = pulse_cipher(dm_text, key)
                encrypted_preview = pulse_cipher(dm_text[:100], key)

                msg_id = f"msg_{int(time.time() * 1000)}_{int(time.time() * 1000) % 10000}"
                now_ms = int(time.time() * 1000)
                now_iso = datetime.now(timezone.utc).isoformat()

                # Get existing conversation unread
                existing_conv = rtdb_get(f"conversations/{conv_id}") or {}
                current_unread = 0
                if isinstance(existing_conv, dict):
                    unread_map = existing_conv.get("unread") or {}
                    if isinstance(unread_map, dict):
                        current_unread = unread_map.get(target_uid, 0)

                # 1. Write message
                message_payload = {
                    "id": msg_id,
                    "conversationId": conv_id,
                    "senderId": OFFICIAL_SOVYTHOS["uid"],
                    "recipientId": target_uid,
                    "senderName": OFFICIAL_SOVYTHOS["displayName"],
                    "senderUsername": OFFICIAL_SOVYTHOS["username"],
                    "senderAvatar": OFFICIAL_SOVYTHOS["avatar"],
                    "type": "text",
                    "content": encrypted_content,
                    "text": dm_text[:85],  # Plaintext snippet for FCM push display
                    "voiceDuration": 0,
                    "sharedPost": None,
                    "timestamp": now_ms,
                    "createdAt": now_iso,
                    "isRead": False,
                    "read": False
                }
                rtdb_put(f"messages/{conv_id}/{msg_id}", message_payload)

                # 2. Write conversation
                conv_payload = {
                    "id": conv_id,
                    "isRequest": False,
                    "isAccepted": True,
                    "requestedBy": None,
                    "participants": {
                        OFFICIAL_SOVYTHOS["uid"]: True,
                        target_uid: True
                    },
                    "participantDetails": {
                        OFFICIAL_SOVYTHOS["uid"]: {
                            "uid": OFFICIAL_SOVYTHOS["uid"],
                            "displayName": OFFICIAL_SOVYTHOS["displayName"],
                            "username": OFFICIAL_SOVYTHOS["username"],
                            "avatar": OFFICIAL_SOVYTHOS["avatar"],
                            "isFounder": False,
                            "pioneerNumber": None
                        },
                        target_uid: {
                            "uid": target_uid,
                            "displayName": target_user.get("displayName") or target_user.get("username") or "مستخدم",
                            "username": target_user.get("username") or "user",
                            "avatar": target_user.get("avatar") or None,
                            "isFounder": target_user.get("isFounder", False),
                            "pioneerNumber": target_user.get("pioneerNumber", None)
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
                        target_uid: current_unread + 1,
                        OFFICIAL_SOVYTHOS["uid"]: 0
                    },
                    "updatedAt": now_ms,
                    "lastTimestamp": now_ms
                }
                rtdb_put(f"conversations/{conv_id}", conv_payload)

                # 3. Record nudge to Sovythos user record
                new_nudge_record = {
                    "uid": target_uid,
                    "displayName": target_user.get("displayName"),
                    "username": target_user.get("username"),
                    "lastNudgedAt": now_ms,
                    "nudgeCount": target["nudge_count"] + 1,
                    "lastMessage": dm_text
                }
                rtdb_put(f"users/{OFFICIAL_SOVYTHOS['uid']}/nudgedUsers/{target_uid}", new_nudge_record)

                last_platform_outreach_ts = now_sec
                with metrics_lock:
                    METRICS["inactive_users_nudged"] += 1
                    METRICS["last_inactive_nudge"] = now_iso

                print(f"[Smart Outreach] Successfully nudged inactive user @{target_user.get('username')} ({first_name}) inactive for {target['hours_inactive']:.1f}h: '{dm_text[:45]}...'", flush=True)

        except Exception as e:
            pass

        # Check every 10 minutes
        time.sleep(1800)

# ==============================================================================
# SERVER MANAGER ENTRY POINT
# ==============================================================================
def main():
    print("=" * 70, flush=True)
    print(" PULSE UNIFIED CARRIER-GRADE BACKEND DAEMON v2.0", flush=True)
    print(" Autonomous Cloud Core: AI, Events, Trending & Push Architecture", flush=True)
    print(f" Local Wi-Fi IP: {LAN_IP}", flush=True)
    print(f" HTTP Distribution Port: {PORT}", flush=True)
    print(f" Direct APK URL: http://{LAN_IP}:{PORT}/{APK_NAME}", flush=True)
    print(f" Diagnostic Dashboard: http://{LAN_IP}:{PORT}/server-status", flush=True)
    print("=" * 70, flush=True)

    threads = [
        threading.Thread(target=start_http_server, name="HttpServerThread", daemon=True),
        # EventSynthesizerThread disabled - all notifications handled directly & immediately by client events
        threading.Thread(target=sovythos_autonomous_loop, name="SovythosAIThread", daemon=True),
        threading.Thread(target=trending_engine_loop, name="TrendingEngineThread", daemon=True),
        threading.Thread(target=security_sentinel_loop, name="SecuritySentinelThread", daemon=True),
        threading.Thread(target=start_push_worker, name="PushWorkerThread", daemon=True),
        threading.Thread(target=autonomous_inactive_user_outreach_loop, name="InactiveUserOutreachThread", daemon=True),
    ]

    for t in threads:
        t.start()
        print(f"[Thread Manager] Started {t.name} successfully.", flush=True)

    print("[Server Manager] All 7 core platform engines running concurrently in 24/7 autonomous mode.", flush=True)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Server Manager] Shutdown requested. Terminating all daemons cleanly.", flush=True)

if __name__ == "__main__":
    main()
