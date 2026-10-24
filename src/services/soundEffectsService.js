/**
 * PULSE Sound Effects Service
 * Synthetic sound generators permanently disabled per user architecture directive.
 * Safe silent no-op interface preserves full API contract compatibility.
 */

class SoundEffectsService {
  constructor() {
    this.isEnabled = false;
  }

  initFromStorage() {}
  setEnabled() {}
  getAudioContext() { return null; }

  // Synthetic effects silenced
  likePop() {}
  counterTick() {}
  refreshSnap() {}
  tabTap() {}
  dismissWhoosh() {}
  repostTwist() {}
  bookmarkSave() {}
  composeSend() {}
  deleteTrash() {}
}

export const soundEffectsService = new SoundEffectsService();
