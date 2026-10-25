import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * PULSE Official Tactile Precision Haptics & Sensory Engine for PULSE
 * Powers AAA micro-interactions: tabs, likes, bookmarks, counters, and swipe gestures.
 */
export const hapticsService = {
  isNative: Capacitor.isNativePlatform(),

  // Very subtle micro-click (buttons, tabs, toggles) ~10ms
  async light() {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {
      // safe fallback
    }
  },

  // Satisfying tactile feedback (likes, bookmarks, reposts) ~25ms
  async medium() {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(22);
      }
    } catch {
      // safe fallback
    }
  },

  // Solid mechanical pulse (pull-to-refresh snap, voice recording start/stop) ~45ms
  async heavy() {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(45);
      }
    } catch {
      // safe fallback
    }
  },

  // Micro-tick for drag thresholds, scrubbing, and swipe release
  async selection() {
    try {
      if (this.isNative) {
        await Haptics.selectionStart();
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // safe fallback
    }
  },

  // AAA Micro-Delight: Double-Tap & Like Pop
  like() {
    this.medium();
  },

  // AAA Micro-Delight: Pull to Refresh Trigger Snap
  refresh() {
    this.heavy();
  },

  // AAA Micro-Delight: Odometer Counter Roll Tick
  counter() {
    this.selection();
  },

  // AAA Micro-Delight: Bottom Tab Tap
  tab() {
    this.light();
  },

  // AAA Micro-Delight: Swipe-to-dismiss Whoosh
  dismiss() {
    this.selection();
  },

  // Double pulse for successful actions (reply sent, verified, post created)
  async success() {
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([12, 40, 20]);
      }
    } catch {
      // safe fallback
    }
  },

  // Warning pulse
  async error() {
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Error });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    } catch {
      // safe fallback
    }
  }
};
