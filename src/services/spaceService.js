import { database } from './firebase';
import { ref, onValue, set, get, update, remove } from 'firebase/database';
import { storageService } from './storageService';

const SPACES_LOCAL_KEY = 'pulse_live_spaces_cache';

class AudioStreamManager {
  constructor() {
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.animFrameId = null;
    this.isRecording = false;
  }

  async start({ onSpeakingChange, onVolume }) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Microphone access not supported in this environment');
        return false;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }
        const source = this.audioCtx.createMediaStreamSource(this.stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        let wasSpeaking = false;

        const checkAudio = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 80);

          if (onVolume) onVolume(normalized);

          const isSpeaking = avg > 12;
          if (isSpeaking !== wasSpeaking) {
            wasSpeaking = isSpeaking;
            if (onSpeakingChange) onSpeakingChange(isSpeaking);
          }

          this.animFrameId = requestAnimationFrame(checkAudio);
        };

        this.animFrameId = requestAnimationFrame(checkAudio);
      }

      // Initialize MediaRecorder to record live session for archive
      if (window.MediaRecorder) {
        try {
          this.recordedChunks = [];
          this.mediaRecorder = new MediaRecorder(this.stream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.recordedChunks.push(e.data);
            }
          };
          this.mediaRecorder.start(1000);
          this.isRecording = true;
        } catch (recErr) {
          console.warn('MediaRecorder error in Live Space:', recErr);
        }
      }

      return true;
    } catch (err) {
      console.warn('Microphone permission or init error:', err);
      return false;
    }
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
      this.analyser = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    let audioBlobUrl = null;
    if (this.mediaRecorder && this.isRecording) {
      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        if (this.recordedChunks.length > 0) {
          const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
          audioBlobUrl = URL.createObjectURL(blob);
        }
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
      }
      this.mediaRecorder = null;
      this.isRecording = false;
    }

    return audioBlobUrl;
  }
}

export const audioStreamManager = new AudioStreamManager();

export const spaceService = {
  // Subscribe to all live spaces
  subscribeToSpaces(callback) {
    try {
      const spacesRef = ref(database, 'spaces');
      return onValue(spacesRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.values(val).filter((s) => s && s.status === 'live');
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          try {
            localStorage.setItem(SPACES_LOCAL_KEY, JSON.stringify(list));
          } catch {}
          if (callback) callback(list);
        } else {
          if (callback) callback([]);
        }
      }, (error) => {
        console.warn('Firebase spaces subscription error:', error);
        // Fallback to local cache
        try {
          const cached = JSON.parse(localStorage.getItem(SPACES_LOCAL_KEY)) || [];
          if (callback) callback(cached);
        } catch {
          if (callback) callback([]);
        }
      });
    } catch (err) {
      console.warn('subscribeToSpaces error:', err);
      if (callback) callback([]);
      return () => {};
    }
  },

  // Subscribe to a single space
  subscribeToSpace(spaceId, callback) {
    if (!spaceId) return () => {};
    try {
      const spaceRef = ref(database, `spaces/${spaceId}`);
      return onValue(spaceRef, (snapshot) => {
        const val = snapshot.val();
        if (callback) callback(val);
      }, (error) => {
        console.warn('Firebase space item subscription notice:', error);
      });
    } catch (err) {
      console.warn('subscribeToSpace error:', err);
      return () => {};
    }
  },

  // Create a new Live Space
  async createSpace({ title, topic = 'فكر وتطوير', currentUser }) {
    if (!currentUser) throw new Error('يجب تسجيل الدخول لإنشاء مجلس حي');

    const spaceId = `space_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isFounder = currentUser.isFounder || currentUser.username === 'my';

    const spaceData = {
      id: spaceId,
      title: title?.trim() || 'مجلس فكري مفتوح',
      topic: topic?.trim() || 'عام',
      status: 'live',
      createdAt: Date.now(),
      host: {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'مستخدم PULSE',
        username: currentUser.username || 'user',
        avatar: currentUser.avatar || null,
        isFounder: isFounder,
        pioneerNumber: currentUser.pioneerNumber || (isFounder ? 1 : null)
      },
      speakers: {
        [currentUser.uid]: {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'مستخدم PULSE',
          username: currentUser.username || 'user',
          avatar: currentUser.avatar || null,
          isFounder: isFounder,
          pioneerNumber: currentUser.pioneerNumber || (isFounder ? 1 : null),
          role: 'host',
          isMuted: false,
          isSpeaking: false,
          joinedAt: Date.now()
        }
      },
      listeners: {},
      handRaises: {},
      stats: {
        totalListeners: 1,
        peakListeners: 1
      },
      archivedPostId: null
    };

    try {
      await set(ref(database, `spaces/${spaceId}`), spaceData);
    } catch (err) {
      console.warn('Firebase createSpace notice (local cached):', err);
    }

    return spaceData;
  },

  // Join a Live Space as a listener
  async joinSpace(spaceId, currentUser) {
    if (!spaceId || !currentUser) return;
    try {
      const isFounder = currentUser.isFounder || currentUser.username === 'my';
      const listenerData = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'مستمع',
        username: currentUser.username || 'listener',
        avatar: currentUser.avatar || null,
        isFounder: isFounder,
        pioneerNumber: currentUser.pioneerNumber || (isFounder ? 1 : null),
        joinedAt: Date.now()
      };
      await set(ref(database, `spaces/${spaceId}/listeners/${currentUser.uid}`), listenerData);
    } catch (err) {
      console.warn('joinSpace notice:', err);
    }
  },

  // Leave a Live Space
  async leaveSpace(spaceId, currentUser) {
    if (!spaceId || !currentUser) return;
    try {
      await remove(ref(database, `spaces/${spaceId}/listeners/${currentUser.uid}`));
      await remove(ref(database, `spaces/${spaceId}/handRaises/${currentUser.uid}`));
    } catch (err) {
      console.warn('leaveSpace notice:', err);
    }
  },

  // Raise / lower hand to request speaking on the stage
  async toggleHandRaise(spaceId, currentUser, raised = true) {
    if (!spaceId || !currentUser) return;
    try {
      if (raised) {
        const isFounder = currentUser.isFounder || currentUser.username === 'my';
        await set(ref(database, `spaces/${spaceId}/handRaises/${currentUser.uid}`), {
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'مستمع',
          username: currentUser.username || 'listener',
          avatar: currentUser.avatar || null,
          isFounder: isFounder,
          pioneerNumber: currentUser.pioneerNumber || (isFounder ? 1 : null),
          raisedAt: Date.now()
        });
      } else {
        await remove(ref(database, `spaces/${spaceId}/handRaises/${currentUser.uid}`));
      }
    } catch (err) {
      console.warn('toggleHandRaise notice:', err);
    }
  },

  // Promote a listener to speaker stage (Host only)
  async promoteToSpeaker(spaceId, user) {
    if (!spaceId || !user) return;
    try {
      const isFounder = user.isFounder || user.username === 'my';
      const speakerData = {
        uid: user.uid,
        displayName: user.displayName,
        username: user.username,
        avatar: user.avatar || null,
        isFounder: isFounder,
        pioneerNumber: user.pioneerNumber || (isFounder ? 1 : null),
        role: 'speaker',
        isMuted: false,
        isSpeaking: false,
        joinedAt: Date.now()
      };
      await set(ref(database, `spaces/${spaceId}/speakers/${user.uid}`), speakerData);
      await remove(ref(database, `spaces/${spaceId}/listeners/${user.uid}`));
      await remove(ref(database, `spaces/${spaceId}/handRaises/${user.uid}`));
    } catch (err) {
      console.warn('promoteToSpeaker notice:', err);
    }
  },

  // Demote speaker back to listener
  async demoteToListener(spaceId, user) {
    if (!spaceId || !user) return;
    try {
      await remove(ref(database, `spaces/${spaceId}/speakers/${user.uid}`));
      const isFounder = user.isFounder || user.username === 'my';
      await set(ref(database, `spaces/${spaceId}/listeners/${user.uid}`), {
        uid: user.uid,
        displayName: user.displayName,
        username: user.username,
        avatar: user.avatar || null,
        isFounder: isFounder,
        pioneerNumber: user.pioneerNumber || (isFounder ? 1 : null),
        joinedAt: Date.now()
      });
    } catch (err) {
      console.warn('demoteToListener notice:', err);
    }
  },

  // Toggle speaker mute state
  async setMute(spaceId, uid, isMuted) {
    if (!spaceId || !uid) return;
    try {
      await update(ref(database, `spaces/${spaceId}/speakers/${uid}`), { isMuted });
    } catch (err) {
      console.warn('setMute notice:', err);
    }
  },

  // Set speaker live waveform activity
  async setSpeaking(spaceId, uid, isSpeaking) {
    if (!spaceId || !uid) return;
    try {
      await update(ref(database, `spaces/${spaceId}/speakers/${uid}`), { isSpeaking });
    } catch (err) {
      console.warn('setSpeaking notice:', err);
    }
  },

  // End Live Space and Auto-Archive to Timeline as a Voice Pulse
  async endAndArchiveSpace(space, recordedAudioUrl = null, durationSeconds = 90) {
    if (!space || !space.id) return null;

    try {
      // 1. Mark space as ended in Firebase
      await update(ref(database, `spaces/${space.id}`), {
        status: 'ended',
        endedAt: Date.now()
      });

      // 2. Package and publish to Timeline as a Voice Pulse
      const postId = `pulse_live_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const archivePost = {
        id: postId,
        author: space.host,
        authorId: space.host.uid,
        content: `تسجيل المجلس الفكري الحي: "${space.title}"\n#PULSE_LiveSpace #مجلس_حي`,
        createdAt: Date.now(),
        hasVoice: true,
        voiceDuration: durationSeconds || 120,
        voiceAudioUrl: recordedAudioUrl || 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
        likes: [],
        reposts: [],
        repliesCount: 0,
        voiceListens: 1,
        tags: ['PULSE_LiveSpace', 'مجلس_حي'],
        spaceId: space.id,
        isLiveSpaceArchive: true
      };

      storageService.savePost(archivePost);

      // Link archive post id in space record
      await update(ref(database, `spaces/${space.id}`), {
        archivedPostId: postId
      });

      return archivePost;
    } catch (err) {
      console.warn('endAndArchiveSpace notice:', err);
      return null;
    }
  }
};
