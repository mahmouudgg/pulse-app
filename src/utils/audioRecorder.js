/**
 * Real Microphone Audio Recording Utility
 * Uses HTML5 MediaRecorder and AudioContext
 */

let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;

export const startRecording = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('الميكروفون غير مدعوم في هذا المتصفح أو الجهاز');
    }

    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });

    audioChunks = [];
    
    // Choose the best supported MIME type
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    }

    try {
      mediaRecorder = new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 28000 });
    } catch {
      mediaRecorder = new MediaRecorder(audioStream, { mimeType });
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start(250); // Slice into 250ms chunks
    return true;
  } catch (error) {
    console.error('Microphone error:', error);
    throw error;
  }
};

export const stopRecording = () => {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      return reject(new Error('لا يوجد تسجيل نشط'));
    }

    mediaRecorder.onstop = () => {
      try {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        // Stop all tracks to turn off the microphone light
        if (audioStream) {
          audioStream.getTracks().forEach((track) => track.stop());
        }

        // Convert to Base64 so it can be saved persistently in localStorage / Firebase Realtime DB
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result;
          resolve({
            blob: audioBlob,
            dataUrl: base64Audio,
            mimeType: mediaRecorder.mimeType
          });
        };
        reader.onerror = (err) => reject(err);
      } catch (err) {
        reject(err);
      }
    };

    mediaRecorder.stop();
  });
};
