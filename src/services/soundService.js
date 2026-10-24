/**
 * Sound & Music Service for PULSE
 * Pure Real-Audio Architecture matching Threads, TikTok & Snapchat sound systems
 * 
 * Rules:
 * - Zero fake/synthesized/placeholder songs.
 * - Only genuine audio files uploaded by platform or users to Cloudinary.
 * - Persisted in Firebase Realtime Database ('custom_sounds' and 'official_sounds').
 * - Real-time audio playback using standard HTML5 Audio with error handling.
 * - Zero emojis compliant.
 */

import { cloudinaryService } from './cloudinaryService';
import { database } from './firebase';
import { ref, set, get, onValue, push } from 'firebase/database';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';

// Verified platform sounds registry (Wiped clean - zero preloaded songs)
export const VERIFIED_PLATFORM_SOUNDS = [];

let globalAudioElement = null;
let currentPlayingSoundId = null;
let currentPlayingSound = null;
const audioListeners = new Set();

export const soundService = {
  /**
   * Fetch all real sounds from Firebase RTDB (both custom and verified)
   */
  async getAllSounds() {
    let custom = [];
    try {
      const soundsRef = ref(database, 'custom_sounds');
      const snap = await get(soundsRef);
      if (snap.exists()) {
        const val = snap.val();
        custom = Object.entries(val).map(([id, s]) => ({ id, ...s }));
      }
    } catch (e) {
      console.warn('[SoundService] Custom sounds fetch error:', e);
    }

    // Merge with local storage cached uploads (purging any legacy deleted starter tracks)
    try {
      const rawLocal = JSON.parse(localStorage.getItem('pulse_custom_sounds') || '[]');
      if (Array.isArray(rawLocal) && rawLocal.length > 0) {
        const local = rawLocal.filter(item => 
          item && 
          item.id !== 'pulse_real_01' && 
          item.id !== 'pulse_real_02' && 
          !item.audioUrl?.includes('h6drk5gelivcwwp8ods5') &&
          !item.artist?.includes('المرشدي') &&
          !item.title?.includes('Acoustic Wave')
        );
        if (local.length !== rawLocal.length) {
          localStorage.setItem('pulse_custom_sounds', JSON.stringify(local));
        }
        const existingIds = new Set(custom.map(s => s.id));
        local.forEach(item => {
          if (item && item.id && !existingIds.has(item.id)) {
            custom.push(item);
          }
        });
      }
    } catch {}

    // Combine verified platform sounds with custom sounds
    const existingAudioUrls = new Set(custom.map(s => s.audioUrl));
    const combined = [...custom];
    VERIFIED_PLATFORM_SOUNDS.forEach(v => {
      if (!existingAudioUrls.has(v.audioUrl)) {
        combined.push(v);
      }
    });

    return combined;
  },

  /**
   * Get trending real sounds (sorted by real uses count)
   */
  async getTrendingSounds() {
    const all = await this.getAllSounds();
    return all.sort((a, b) => (b.usesCount || 0) - (a.usesCount || 0));
  },

  /**
   * Get user-uploaded sounds (sorted by newest creation date)
   */
  async getCustomSounds() {
    const all = await this.getAllSounds();
    return all
      .filter(s => s.isCustom || s.creatorUid)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },

  /**
   * Upload and register a new custom sound to Cloudinary and Firebase
   */
  async uploadCustomSound({ audioFileOrBase64, title, artist, coverFileOrBase64 = null, user = null, duration = '0:30' }) {
    if (!audioFileOrBase64) {
      throw new Error('يرجى تحديد ملف صوتي صالح.');
    }
    if (!title || !title.trim()) {
      throw new Error('يرجى إدخال اسم الصوت.');
    }

    // 1. Upload Real Audio to Cloudinary
    let cloudAudioUrl = null;
    try {
      cloudAudioUrl = await cloudinaryService.uploadAudio(audioFileOrBase64, 'pulse_sounds');
    } catch (err) {
      console.warn('[SoundService] Cloudinary audio upload failed:', err);
      if (typeof audioFileOrBase64 === 'string' && audioFileOrBase64.startsWith('http')) {
        cloudAudioUrl = audioFileOrBase64;
      } else {
        throw new Error('فشل رفع الملف الصوتي إلى Cloudinary: ' + (err.message || 'خطأ اتصال'));
      }
    }

    // 2. Upload Cover Art to Cloudinary
    let cloudCoverUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
    if (coverFileOrBase64) {
      try {
        cloudCoverUrl = await cloudinaryService.uploadImage(coverFileOrBase64, 'pulse_sound_covers');
      } catch (err) {
        console.warn('[SoundService] Cover image upload error, using default cover:', err);
      }
    }

    const soundId = 'sound_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newSound = {
      id: soundId,
      title: title.trim(),
      artist: artist?.trim() || user?.displayName || user?.username || 'مستخدم PULSE',
      duration: duration || '0:30',
      coverUrl: cloudCoverUrl,
      audioUrl: cloudAudioUrl,
      isCustom: true,
      creatorUid: user?.uid || 'anonymous',
      creatorUsername: user?.username || 'user',
      usesCount: 1,
      createdAt: new Date().toISOString()
    };

    // 3. Persist to Firebase RTDB
    try {
      const soundRef = ref(database, `custom_sounds/${soundId}`);
      await set(soundRef, newSound);
    } catch (e) {
      console.warn('[SoundService] Firebase RTDB save error, using local storage fallback:', e);
    }

    // Cache locally
    try {
      const existing = JSON.parse(localStorage.getItem('pulse_custom_sounds') || '[]');
      existing.unshift(newSound);
      localStorage.setItem('pulse_custom_sounds', JSON.stringify(existing.slice(0, 50)));
    } catch {}

    return newSound;
  },

  /**
   * Search all real sounds
   */
  async searchSounds(query = '') {
    const q = query.trim().toLowerCase();
    const all = await this.getAllSounds();
    if (!q) return all;

    return all.filter((s) => {
      const t = (s.title || '').toLowerCase();
      const a = (s.artist || '').toLowerCase();
      return t.includes(q) || a.includes(q);
    });
  },

  /**
   * Subscribe to audio playback state changes
   */
  subscribe(callback) {
    audioListeners.add(callback);
    return () => audioListeners.delete(callback);
  },

  _notifyListeners(state) {
    audioListeners.forEach((cb) => {
      try { cb(state); } catch {}
    });
  },

  _updateMediaSession(sound, state = 'playing') {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        if (sound && state !== 'none') {
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: sound.title || 'PULSE Audio',
            artist: sound.artist || 'PULSE Originals',
            album: 'PULSE Music',
            artwork: [
              { src: sound.coverUrl || DEFAULT_AVATAR, sizes: '512x512', type: 'image/png' }
            ]
          });
          navigator.mediaSession.playbackState = state;
          navigator.mediaSession.setActionHandler('play', () => soundService.resume());
          navigator.mediaSession.setActionHandler('pause', () => soundService.pause());
          navigator.mediaSession.setActionHandler('stop', () => soundService.stopPreview());
        } else {
          navigator.mediaSession.playbackState = 'none';
        }
      } catch (e) {
        console.warn('[SoundService] MediaSession error:', e);
      }
    }
  },

  /**
   * Play or Pause a real sound preview using native HTML5 Audio
   */
  async playPreview(sound) {
    if (!sound) return;

    if (currentPlayingSoundId === sound.id) {
      if (globalAudioElement && !globalAudioElement.paused) {
        this.pause();
      } else {
        this.resume();
      }
      return;
    }

    this.stopPreview();

    if (!globalAudioElement) {
      globalAudioElement = new Audio();
      globalAudioElement.addEventListener('ended', () => {
        currentPlayingSoundId = null;
        currentPlayingSound = null;
        this._updateMediaSession(null, 'none');
        this._notifyListeners({ playingId: null, isPlaying: false, sound: null });
      });
      globalAudioElement.addEventListener('error', () => {
        console.warn('[SoundService] Audio playback error for sound:', sound.id);
        currentPlayingSoundId = null;
        currentPlayingSound = null;
        this._updateMediaSession(null, 'none');
        this._notifyListeners({ playingId: null, isPlaying: false, sound: null, error: true });
      });
    }

    currentPlayingSoundId = sound.id;
    currentPlayingSound = sound;
    this._updateMediaSession(sound, 'playing');
    this._notifyListeners({ playingId: sound.id, isPlaying: true, sound, isPaused: false });

    if (sound.audioUrl && sound.audioUrl.startsWith('http')) {
      try {
        globalAudioElement.src = sound.audioUrl;
        await globalAudioElement.play();
      } catch (err) {
        console.warn('[SoundService] Native audio playback failed:', err);
        currentPlayingSoundId = null;
        currentPlayingSound = null;
        this._updateMediaSession(null, 'none');
        this._notifyListeners({ playingId: null, isPlaying: false, sound: null, error: true });
      }
    } else {
      console.warn('[SoundService] Sound has no valid audioUrl:', sound);
      currentPlayingSoundId = null;
      currentPlayingSound = null;
      this._updateMediaSession(null, 'none');
      this._notifyListeners({ playingId: null, isPlaying: false, sound: null, error: true });
    }
  },

  pause() {
    if (globalAudioElement && !globalAudioElement.paused) {
      try { globalAudioElement.pause(); } catch {}
      this._updateMediaSession(currentPlayingSound, 'paused');
      this._notifyListeners({
        playingId: currentPlayingSoundId,
        isPlaying: false,
        sound: currentPlayingSound,
        isPaused: true
      });
    }
  },

  resume() {
    if (globalAudioElement && globalAudioElement.paused && currentPlayingSound) {
      globalAudioElement.play().catch(console.warn);
      this._updateMediaSession(currentPlayingSound, 'playing');
      this._notifyListeners({
        playingId: currentPlayingSoundId,
        isPlaying: true,
        sound: currentPlayingSound,
        isPaused: false
      });
    }
  },

  togglePlay() {
    if (!currentPlayingSound) return;
    if (globalAudioElement && !globalAudioElement.paused) {
      this.pause();
    } else {
      this.resume();
    }
  },

  stopPreview() {
    if (globalAudioElement) {
      try {
        globalAudioElement.pause();
        globalAudioElement.currentTime = 0;
      } catch {}
    }
    currentPlayingSoundId = null;
    currentPlayingSound = null;
    this._updateMediaSession(null, 'none');
    this._notifyListeners({ playingId: null, isPlaying: false, sound: null, isPaused: false });
  },

  getPlayingSoundId() {
    return currentPlayingSoundId;
  },

  getCurrentSound() {
    return currentPlayingSound;
  }
};
