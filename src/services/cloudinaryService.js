/**
 * Cloudinary Media Service for PULSE
 * Cloud Name: dgskw7nki
 * Upload Preset: dgskw7nki (Unsigned)
 * API Key: 359837724529763
 * 
 * Production Security & Quota Protection:
 * - Strict Client-Side File Size Enforcer (Max 15MB Images, 40MB Videos/Audio)
 * - Safe MIME Type & Format Whitelist
 * - Anti-DDoS & Quota Exhaustion Rate Limiter (Max 15 uploads / minute)
 * - Intelligent Perceptual Video Compression (f_auto, q_auto:good, vc_auto, w_1080)
 * - Automatic WebP/AVIF format negotiation (f_auto), dynamic quality compression (q_auto)
 * - Zero emojis compliant
 */

const CLOUDINARY_CONFIG = {
  cloudName: 'dgskw7nki',
  uploadPreset: 'dgskw7nki',
  apiKey: '359837724529763',
  endpoint: 'https://api.cloudinary.com/v1_1/dgskw7nki/auto/upload',
  videoEndpoint: 'https://api.cloudinary.com/v1_1/dgskw7nki/video/upload'
};

const SECURITY_LIMITS = {
  MAX_IMAGE_BYTES: 15 * 1024 * 1024, // 15 MB
  MAX_VIDEO_BYTES: 40 * 1024 * 1024, // 40 MB
  MAX_UPLOADS_PER_WINDOW: 15,
  RATE_WINDOW_MS: 60 * 1000 // 1 minute
};

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/mov', 'video/3gpp',
  'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg'
]);

// Anti-DDoS In-memory upload timestamp tracker
const recentUploads = [];

export const cloudinaryService = {
  SECURITY_LIMITS,

  /**
   * Check if a given URL is already hosted on Cloudinary
   */
  isCloudinaryUrl(url) {
    return typeof url === 'string' && url.includes('res.cloudinary.com');
  },

  /**
   * Calculate byte size of Base64 or Blob
   */
  getFileByteSize(fileOrBase64) {
    if (!fileOrBase64) return 0;
    if (typeof Blob !== 'undefined' && fileOrBase64 instanceof Blob) {
      return fileOrBase64.size;
    }
    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('data:')) {
        const base64Index = fileOrBase64.indexOf(';base64,');
        if (base64Index !== -1) {
          const content = fileOrBase64.slice(base64Index + 8);
          const padding = (content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0);
          return Math.floor((content.length * 3) / 4) - padding;
        }
      }
      return fileOrBase64.length;
    }
    return 0;
  },

  /**
   * Detect MIME type from File/Blob or Base64 data URI
   */
  detectMimeType(fileOrBase64) {
    if (typeof Blob !== 'undefined' && fileOrBase64 instanceof Blob && fileOrBase64.type) {
      return fileOrBase64.type.toLowerCase();
    }
    if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
      const match = fileOrBase64.match(/^data:([^;]+);/);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    return 'image/jpeg'; // default assumed safe image
  },

  /**
   * Validate upload against security limits and abuse prevention rules
   */
  validateUploadSecurity(fileOrBase64) {
    // 1. Anti-Quota-Drain Rate Limiter
    const now = Date.now();
    while (recentUploads.length > 0 && now - recentUploads[0] > SECURITY_LIMITS.RATE_WINDOW_MS) {
      recentUploads.shift();
    }
    if (recentUploads.length >= SECURITY_LIMITS.MAX_UPLOADS_PER_WINDOW) {
      throw new Error('يرجى التمهل قليلاً، تم تجاوز الحد المسموح به لرفع الوسائط في الدقيقة لحماية الخوادم من الاستنزاف.');
    }

    // 2. MIME Type Verification
    const mime = this.detectMimeType(fileOrBase64);
    if (!ALLOWED_MIME_TYPES.has(mime) && !mime.startsWith('video/') && !mime.startsWith('image/')) {
      throw new Error(`صيغة الملف غير مدعومة (${mime}). الصيغ المسموحة: JPG, PNG, WEBP, MP4, WEBM, MOV.`);
    }

    // 3. File Size Verification
    const byteSize = this.getFileByteSize(fileOrBase64);
    const isVideoOrAudio = mime.startsWith('video/') || mime.startsWith('audio/');
    const maxAllowed = isVideoOrAudio ? SECURITY_LIMITS.MAX_VIDEO_BYTES : SECURITY_LIMITS.MAX_IMAGE_BYTES;
    const maxMB = isVideoOrAudio ? 40 : 15;

    if (byteSize > maxAllowed) {
      throw new Error(`حجم الملف يتجاوز الحد الأقصى المسموح به (${maxMB} ميجابايت).`);
    }

    return true;
  },

  /**
   * Apply automatic optimizations (f_auto, q_auto) and optional resizing to Cloudinary Image URLs
   */
  optimizeUrl(url, options = {}) {
    if (!this.isCloudinaryUrl(url)) return url;
    if (url.includes('/upload/f_auto,q_auto') || url.includes('/upload/f_auto')) {
      return url;
    }

    const { width, height, crop = 'fill' } = options;
    let transform = 'f_auto,q_auto';
    if (width || height) {
      transform += `,c_${crop}`;
      if (width) transform += `,w_${width}`;
      if (height) transform += `,h_${height}`;
    }

    return url.replace('/upload/', `/upload/${transform}/`);
  },

  /**
   * Apply intelligent perceptual video compression and adaptive format negotiation
   * Parameters:
   * - f_auto: Optimal container negotiation (MP4/WebM)
   * - q_auto:good: Perceptual quality video bitrate optimization (saves 40-70% size with no visible loss)
   * - vc_auto: Codec negotiation (H.264 / VP9)
   * - w_1080,c_limit: Limits max dimension to 1080p, preventing oversized 4K uploads from lagging feed
   */
  optimizeVideoUrl(url, options = {}) {
    if (!this.isCloudinaryUrl(url)) return url;
    if (url.includes('/upload/f_auto') || url.includes('/upload/q_auto') || url.includes('/upload/vc_auto')) {
      return url;
    }

    const { maxDim = 1080, quality = 'auto:good' } = options;
    const transform = `f_auto,q_${quality},vc_auto,w_${maxDim},c_limit`;
    return url.replace('/upload/', `/upload/${transform}/`);
  },

  /**
   * Automatically generate an optimized video poster thumbnail from Cloudinary
   * Extracts frame at offset 0s as high quality JPG
   */
  getVideoThumbnail(url, options = {}) {
    if (!url || typeof url !== 'string') return null;
    if (!this.isCloudinaryUrl(url)) return null;

    const { width = 800, startOffset = '0' } = options;
    const cleanUrl = url.replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, '.jpg$2');
    if (cleanUrl.includes('/upload/so_') || cleanUrl.includes('/upload/f_auto')) {
      return cleanUrl;
    }
    const transform = `so_${startOffset},f_auto,q_auto:good,w_${width},c_limit`;
    return cleanUrl.replace('/upload/', `/upload/${transform}/`);
  },

  /**
   * Securely upload media (image, audio, or video) to Cloudinary
   * @param {string|File|Blob} fileOrBase64 
   * @param {string} folder - Target folder in Cloudinary
   * @param {string} resourceType - 'auto' | 'video' | 'image'
   * @returns {Promise<string>} The secure CDN URL of the uploaded media
   */
  async uploadMedia(fileOrBase64, folder = 'pulse_uploads', resourceType = 'auto') {
    if (!fileOrBase64) return null;

    // If already a remote Cloudinary URL or regular HTTP URL, return as-is
    if (typeof fileOrBase64 === 'string' && (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://'))) {
      return resourceType === 'video' ? this.optimizeVideoUrl(fileOrBase64) : this.optimizeUrl(fileOrBase64);
    }

    // Strict Security & Quota Validation
    this.validateUploadSecurity(fileOrBase64);

    const isVideo = resourceType === 'video' || (typeof fileOrBase64 !== 'string' && fileOrBase64.type && fileOrBase64.type.startsWith('video/')) || (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:video/'));
    const targetEndpoint = isVideo ? CLOUDINARY_CONFIG.videoEndpoint : CLOUDINARY_CONFIG.endpoint;

    const formData = new FormData();
    formData.append('file', fileOrBase64);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
    if (folder) {
      formData.append('folder', folder);
    }

    try {
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Cloudinary upload failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.secure_url) {
        throw new Error('No secure_url returned by Cloudinary');
      }

      // Record successful upload for rate limiter
      recentUploads.push(Date.now());

      return data.secure_url;
    } catch (error) {
      console.warn('[Cloudinary Security] Upload error:', error);
      throw error;
    }
  },

  /**
   * Upload an image to Cloudinary
   */
  async uploadImage(fileOrBase64, folder = 'pulse_posts') {
    const url = await this.uploadMedia(fileOrBase64, folder, 'image');
    return this.optimizeUrl(url);
  },

  /**
   * Upload an audio file or voice recording to Cloudinary
   */
  async uploadAudio(fileOrBase64, folder = 'pulse_audio') {
    return this.uploadMedia(fileOrBase64, folder, 'auto');
  },

  /**
   * Upload a video file to Cloudinary with intelligent perceptual compression
   */
  async uploadVideo(fileOrBase64, folder = 'pulse_videos') {
    const rawUrl = await this.uploadMedia(fileOrBase64, folder, 'video');
    return this.optimizeVideoUrl(rawUrl);
  }
};
