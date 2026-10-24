"""
PULSE Live Notifications & Action Daemon
---------------------------------------
Runs continuously in the background, listening to Firebase Realtime Database
for real-time notifications and messages.
Delivers native OS notifications with profile pictures, rich previews,
and interactive action buttons (Like, Reply, Follow back).
No need to keep the app open!
"""

import sys
import os
import time
import json
import urllib.request
import urllib.error
import subprocess

FIREBASE_URL = "https://sahra-f4ec6-default-rtdb.firebaseio.com"
POLL_INTERVAL = 3.0  # seconds

seen_notification_ids = set()
seen_message_ids = set()

def send_windows_toast(title, message, avatar_url=None, action_type="like", item_id=None):
    """
    Dispatches a rich Windows Toast Notification with avatar image and interactive buttons
    via PowerShell without any third-party pip dependencies.
    """
    clean_title = title.replace('"', '`"').replace("'", "''")
    clean_message = message.replace('"', '`"').replace("'", "''")

    # Define action buttons based on notification type
    if action_type == "follow":
        btn1 = "رد المتابعة (Follow back)"
        btn2 = "عرض الملف (View Profile)"
    elif action_type == "comment" or action_type == "reply":
        btn1 = "رد (Reply)"
        btn2 = "إعجاب (Like)"
    else:
        btn1 = "إعجاب (Like)"
        btn2 = "فتح في PULSE (Open Pulse)"

    ps_script = f"""
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

    $template = @"
    <toast duration="short">
        <visual>
            <binding template="ToastGeneric">
                <text hint-maxLines="1">{clean_title}</text>
                <text>{clean_message}</text>
                {"<image placement='appLogoOverride' hint-crop='circle' src='" + avatar_url + "'/>" if avatar_url and avatar_url.startswith('http') else ""}
            </binding>
        </visual>
        <actions>
            <action content="{btn1}" arguments="action=btn1&amp;id={item_id}" activationType="foreground"/>
            <action content="{btn2}" arguments="action=btn2&amp;id={item_id}" activationType="foreground"/>
        </actions>
    </toast>
"@

    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("PULSE.Network")
    $notifier.Show($toast)
    """

    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5
        )
    except Exception as e:
        print(f"[!] Notification dispatch notice: {e}")

def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'PulseNotificationDaemon/1.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = resp.read().decode('utf-8')
            if data and data != 'null':
                return json.loads(data)
    except Exception:
        pass
    return None

def check_notifications():
    global seen_notification_ids
    data = fetch_json(f"{FIREBASE_URL}/notifications.json")
    if not data or not isinstance(data, dict):
        return

    for key, notif in data.items():
        if not notif or not isinstance(notif, dict):
            continue
        notif_id = notif.get('id') or key
        if notif_id in seen_notification_ids:
            continue

        seen_notification_ids.add(notif_id)

        # Skip historical notifications on first boot
        if len(seen_notification_ids) > 50 and not getattr(check_notifications, "_initialized", False):
            continue

        actor_name = notif.get('actorName') or notif.get('actor', {}).get('displayName') or 'PULSE User'
        actor_avatar = notif.get('actorAvatar') or notif.get('actor', {}).get('avatar')
        notif_type = notif.get('type', 'general')
        message = notif.get('message') or notif.get('text') or ''

        if notif_type == 'like':
            title = f"{actor_name} أعجب بنبضتك"
            action = 'like'
        elif notif_type == 'comment' or notif_type == 'reply':
            title = f"{actor_name} رد على نبضتك"
            action = 'reply'
        elif notif_type == 'follow':
            title = f"{actor_name} بدأ في متابعتك"
            action = 'follow'
        elif notif_type == 'repost':
            title = f"{actor_name} أعاد نشر نبضتك"
            action = 'repost'
        else:
            title = f"إشعار جديد من {actor_name}"
            action = 'general'

        print(f"[+] Delivering push notification: {title} - {message}")
        send_windows_toast(title, message or title, actor_avatar, action, notif_id)

    check_notifications._initialized = True

def check_messages():
    global seen_message_ids
    data = fetch_json(f"{FIREBASE_URL}/messages.json")
    if not data or not isinstance(data, dict):
        return

    for conv_id, conv_data in data.items():
        if not conv_data or not isinstance(conv_data, dict):
            continue
        messages = conv_data.get('messages', conv_data)
        if isinstance(messages, dict):
            for msg_id, msg in messages.items():
                if not msg or not isinstance(msg, dict):
                    continue
                uid = msg.get('id') or msg_id
                if uid in seen_message_ids:
                    continue
                seen_message_ids.add(uid)

                if getattr(check_messages, "_initialized", False):
                    sender_name = msg.get('senderName', 'رسالة جديدة')
                    text = msg.get('text', 'أرسل لك رسالة خاصة')
                    avatar = msg.get('senderAvatar')
                    send_windows_toast(f"رسالة من {sender_name}", text, avatar, "reply", uid)

    check_messages._initialized = True

def main():
    print("=" * 60)
    print(" PULSE Live Notification Daemon Running (Background Service)")
    print(" Listening to Firebase RTDB for real-time alerts & chats...")
    print("=" * 60)

    # Initial priming run
    check_notifications()
    check_messages()

    while True:
        try:
            check_notifications()
            check_messages()
            time.sleep(POLL_INTERVAL)
        except KeyboardInterrupt:
            print("\nDaemon terminated by user.")
            break
        except Exception as e:
            time.sleep(POLL_INTERVAL)

if __name__ == '__main__':
    main()
