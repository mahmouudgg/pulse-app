/**
 * PULSE Intelligent Video Optimization & Pre-Processing Utility
 * Extracts duration, dimensions, and generates sharp frame 0 poster thumbnail.
 * Prepares video for Cloudinary perceptual quality compression (f_auto, q_auto:good, vc_auto).
 * Zero emojis compliant.
 */

export function formatVideoDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Extract video metadata and generate poster thumbnail frame on client side
 * @param {File|Blob} videoFile 
 * @param {number} maxDimension - Max width/height for the poster thumbnail
 * @returns {Promise<{ duration: number, formattedDuration: string, width: number, height: number, poster: string, sizeBytes: number, formattedSize: string }>}
 */
export function processVideoPreUpload(videoFile, maxDimension = 800) {
  return new Promise((resolve, reject) => {
    if (!videoFile) {
      return reject(new Error('لم يتم توفير أي ملف فيديو.'));
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    };

    video.onloadedmetadata = () => {
      // Seek slightly into the video (0.3s or 10% of duration) to avoid pure black initial frame
      const seekTime = Math.min(0.5, Math.max(0.1, (video.duration || 0) * 0.05));
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        // Scale down poster if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const posterBase64 = canvas.toDataURL('image/jpeg', 0.82);
        const durationSec = video.duration || 0;

        cleanup();

        resolve({
          duration: durationSec,
          formattedDuration: formatVideoDuration(durationSec),
          width: video.videoWidth,
          height: video.videoHeight,
          poster: posterBase64,
          sizeBytes: videoFile.size || 0,
          formattedSize: formatFileSize(videoFile.size || 0)
        });
      } catch (err) {
        cleanup();
        resolve({
          duration: video.duration || 0,
          formattedDuration: formatVideoDuration(video.duration || 0),
          width: video.videoWidth || 640,
          height: video.videoHeight || 360,
          poster: null,
          sizeBytes: videoFile.size || 0,
          formattedSize: formatFileSize(videoFile.size || 0)
        });
      }
    };

    video.onerror = (e) => {
      cleanup();
      reject(new Error('تعذر قراءة بيانات الفيديو أو الصيغة غير مدعومة.'));
    };

    // Timeout safety
    setTimeout(() => {
      cleanup();
      if (!video.videoWidth) {
        reject(new Error('استغرق فحص الفيديو وقتاً أطول من المتوقع.'));
      }
    }, 10000);
  });
}
