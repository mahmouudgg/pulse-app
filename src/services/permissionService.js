// permissionService.js - Real native permission manager for Android and Web

class PermissionService {
  constructor() {
    this.states = {
      microphone: 'prompt', // 'granted' | 'denied' | 'prompt'
      notifications: 'prompt',
      media: 'granted'
    };
    this.checkAllPermissions();
  }

  async checkAllPermissions() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.states.notifications = Notification.permission;
      if (this.states.notifications === 'default') this.states.notifications = 'prompt';
    }

    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' });
        this.states.microphone = micStatus.state;
        micStatus.onchange = () => {
          this.states.microphone = micStatus.state;
        };
      } catch {
        // query fallback
      }
    }

    return this.states;
  }

  async requestMicrophone() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        this.states.microphone = 'granted';
        return { success: true, state: 'granted' };
      }
      return { success: false, error: 'الميكروفون غير مدعوم على هذا الجهاز.' };
    } catch (err) {
      this.states.microphone = 'denied';
      return { success: false, error: 'تم رفض إذن الميكروفون من إعدادات الهاتف.' };
    }
  }

  async requestNotifications() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        this.states.notifications = res;
        return { success: res === 'granted', state: res };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'الإشعارات غير مدعومة على هذا النظام.' };
  }

  async requestMedia() {
    return { success: true, state: 'granted' };
  }

  getStates() {
    return { ...this.states };
  }
}

export const permissionService = new PermissionService();
