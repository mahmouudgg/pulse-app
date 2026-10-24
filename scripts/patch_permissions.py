# Patch fcmService.js and notificationService.js for clean on-demand permissions

# 1. fcmService.js
p_fcm = r'src/services/fcmService.js'
with open(p_fcm, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace premature permission prompt in init()
old_perm_block = '''      // 3. Request System Push Permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
        permStatus = await PushNotifications.requestPermissions();
      }

      const localPerm = await LocalNotifications.checkPermissions();
      if (localPerm.display === 'prompt' || localPerm.display === 'prompt-with-rationale') {
        await LocalNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted:', permStatus.receive);
        return;
      }'''

new_perm_block = '''      // 3. Check System Push Permissions (Contextual / On-Demand: do not barrage user on cold launch)
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission not yet granted. Will be requested on demand.');
        return;
      }'''

if old_perm_block in text:
    text = text.replace(old_perm_block, new_perm_block)
    print('Patched fcmService.js init perm block (LF)')
elif old_perm_block.replace('\n', '\r\n') in text:
    text = text.replace(old_perm_block.replace('\n', '\r\n'), new_perm_block)
    print('Patched fcmService.js init perm block (CRLF)')
else:
    print('fcmService.js old_perm_block not found')

# Remove automatic web prompt in initWebPermissions
old_web = '''  initWebPermissions() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }'''

new_web = '''  initWebPermissions() {
    // Only check, do not pop up prompt on startup
    if (typeof window !== 'undefined' && 'Notification' in window) {
      console.log('Web notification permission state:', Notification.permission);
    }
  },

  async requestSystemPermissions() {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await PushNotifications.requestPermissions();
        await LocalNotifications.requestPermissions();
        if (res.receive === 'granted') {
          await PushNotifications.register();
          return true;
        }
      } catch (e) {
        console.warn('Error requesting native push permissions:', e);
      }
      return false;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }'''

if old_web in text:
    text = text.replace(old_web, new_web)
    print('Patched fcmService.js initWebPermissions (LF)')
elif old_web.replace('\n', '\r\n') in text:
    text = text.replace(old_web.replace('\n', '\r\n'), new_web)
    print('Patched fcmService.js initWebPermissions (CRLF)')
else:
    print('fcmService.js old_web not found')

with open(p_fcm, 'w', encoding='utf-8') as f:
    f.write(text)

# 2. notificationService.js
p_notif = r'src/services/notificationService.js'
with open(p_notif, 'r', encoding='utf-8') as f:
    text2 = f.read()

# Replace lines in initSystemNotifications
old_notif_perm = '''        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }'''

new_notif_perm = '''        const perm = await LocalNotifications.checkPermissions();
        // Channels can be created in advance without interrupting user'''

if old_notif_perm in text2:
    text2 = text2.replace(old_notif_perm, new_notif_perm)
    print('Patched notificationService.js initSystemNotifications (LF)')
elif old_notif_perm.replace('\n', '\r\n') in text2:
    text2 = text2.replace(old_notif_perm.replace('\n', '\r\n'), new_notif_perm)
    print('Patched notificationService.js initSystemNotifications (CRLF)')

# Replace web prompt in initSystemNotifications
old_web_prompt = '''      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }'''

new_web_prompt = '''      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        // Web notifications checked passively
      }'''

if old_web_prompt in text2:
    text2 = text2.replace(old_web_prompt, new_web_prompt)
    print('Patched notificationService.js web prompt (LF)')
elif old_web_prompt.replace('\n', '\r\n') in text2:
    text2 = text2.replace(old_web_prompt.replace('\n', '\r\n'), new_web_prompt)
    print('Patched notificationService.js web prompt (CRLF)')

# In sendNativeNotification, only schedule if already granted (or silently skip rather than popping a system dialog unexpectedly)
old_sched = '''        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }'''

new_sched = '''        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          return; // Skip native alert silently if permission not granted yet
        }'''

if old_sched in text2:
    text2 = text2.replace(old_sched, new_sched)
    print('Patched notificationService.js sendNativeNotification (LF)')
elif old_sched.replace('\n', '\r\n') in text2:
    text2 = text2.replace(old_sched.replace('\n', '\r\n'), new_sched)
    print('Patched notificationService.js sendNativeNotification (CRLF)')

with open(p_notif, 'w', encoding='utf-8') as f:
    f.write(text2)

print('Permission overhaul complete for fcmService & notificationService.')
