import os

FILE_PATH = r'C:\Users\DELL\.gemini\antigravity\scratch\pulse-app\src\services\notificationService.js'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Add import
if 'notificationPreferencesService' not in c:
    c = c.replace(
        "import { App } from '@capacitor/app';",
        "import { App } from '@capacitor/app';\nimport { notificationPreferencesService } from './notificationPreferencesService';"
    )
    print("Added import")

# 2. Add preference check in addNotification
target_add = """    if (!targetUserId || !actor) return null;
    // Strict PULSE Official rule: Never notify oneself!
    if (targetUserId === actor.uid) return null;"""

replacement_add = """    if (!targetUserId || !actor) return null;
    // Strict PULSE Official rule: Never notify oneself!
    if (targetUserId === actor.uid) return null;

    // Granular Notification Preferences check
    try {
      let isActorFollowed = false;
      const allUsers = JSON.parse(localStorage.getItem('pulse_users_v2') || '[]');
      const targetUser = allUsers.find((u) => u.uid === targetUserId);
      if (targetUser && Array.isArray(targetUser.following)) {
        isActorFollowed = targetUser.following.includes(actor.uid);
      }
      if (!notificationPreferencesService.shouldDeliverNotification(targetUserId, type, isActorFollowed)) {
        return null;
      }
    } catch (prefErr) {
      console.warn('Preference check error:', prefErr);
    }"""

if target_add in c and "Granular Notification Preferences check" not in c:
    c = c.replace(target_add, replacement_add)
    print("Added check to addNotification")

# 3. Add check in processNotification
target_proc = """    const processNotification = (notif) => {
      if (!notif || !notif.id) return;
      this.saveToLocalCache(userId, notif);"""

replacement_proc = """    const processNotification = (notif) => {
      if (!notif || !notif.id) return;

      // Granular Notification Preferences check
      try {
        let isActorFollowed = false;
        const allUsers = JSON.parse(localStorage.getItem('pulse_users_v2') || '[]');
        const targetUser = allUsers.find((u) => u.uid === userId);
        if (targetUser && Array.isArray(targetUser.following)) {
          isActorFollowed = targetUser.following.includes(notif.actor?.uid);
        }
        if (!notificationPreferencesService.shouldDeliverNotification(userId, notif.type, isActorFollowed)) {
          return;
        }
      } catch (prefErr) {
        console.warn('Cloud preference check error:', prefErr);
      }

      this.saveToLocalCache(userId, notif);"""

if target_proc in c:
    c = c.replace(target_proc, replacement_proc)
    print("Added check to processNotification")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(c)

print("Done patching notificationService.js")
