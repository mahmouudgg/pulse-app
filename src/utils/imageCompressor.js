/**
 * Ultra-efficient Client-Side Base64 Image Compressor
 * Resizes and compresses images using HTML5 Canvas
 * Drops high-res photos down to ~30KB - 70KB so they store 100% FREE in Firebase Realtime Database!
 */
export function compressImageToBase64(fileOrBase64, maxWidth = 800, maxHeight = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!fileOrBase64) {
      return reject(new Error('لم يتم توفير أي صورة للضغط.'));
    }

    const processImage = (src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Maintain aspect ratio within bounds
        if (width > maxWidth || height > maxHeight) {
          if (width / maxWidth > height / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          reject(err);
        }
      };
      img.src = src;
    };

    if (typeof fileOrBase64 === 'string') {
      processImage(fileOrBase64);
    } else if (fileOrBase64 instanceof Blob || fileOrBase64 instanceof File) {
      const reader = new FileReader();
      reader.onerror = (err) => reject(err);
      reader.onload = (e) => {
        processImage(e.target.result);
      };
      reader.readAsDataURL(fileOrBase64);
    } else {
      reject(new Error('نوع ملف غير صالح'));
    }
  });
}

// Dedicated presets
export async function compressAvatar(fileOrBase64) {
  return compressImageToBase64(fileOrBase64, 300, 300, 0.78);
}

export async function compressCover(fileOrBase64) {
  return compressImageToBase64(fileOrBase64, 960, 420, 0.76);
}
