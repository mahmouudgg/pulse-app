/**
 * Ultra-Luxury 1080x1920 Story Generator for Instagram Stories & TikTok
 * Pure HTML5 Canvas rendering for 100% pixel-perfect output without external library bloat.
 */

import { DEFAULT_AVATAR } from './defaultAvatar';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Helper to safely load images for canvas
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Text wrapping utility with Arabic/English bidi support
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// Helper to draw rounded rectangle
function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Generates an HD 1080x1920 Story Canvas
 * @param {Object} post - The post data object
 * @param {Object} options - Theme & styling options
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderStoryCanvas(post, options = {}) {
  const { theme = 'obsidian' } = options; // 'obsidian' | 'pulse' | 'gold'
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  const author = post.author || {};
  const isFounder = author.isFounder || author.username === 'my';
  const isVerified = author.isVerified;

  // 1. Background Fill
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Luxury Atmosphere Lighting
  const topGlow = ctx.createRadialGradient(540, 360, 20, 540, 360, 600);
  if (theme === 'gold' || isFounder) {
    topGlow.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
    topGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.03)');
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (theme === 'pulse') {
    topGlow.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    topGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    topGlow.addColorStop(0, 'rgba(38, 38, 38, 0.35)');
    topGlow.addColorStop(0.6, 'rgba(20, 20, 20, 0.1)');
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Top Header: Official PULSE Branding
  const headerY = 190;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw concentric Pulse Logo symbol
  const logoCenterX = 540;
  const logoCenterY = headerY - 50;

  // Pulse wave rings
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, 32, -Math.PI * 0.75, Math.PI * 0.75);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, 20, -Math.PI * 0.75, Math.PI * 0.75);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Pulse Wordmark
  ctx.font = '800 46px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('PULSE', 540, headerY + 15);

  // Subtitle
  ctx.font = '500 22px "Readex Pro", system-ui, sans-serif';
  ctx.fillStyle = '#737373';
  ctx.fillText('نبض الأفكار والحوار الصوتي الحر', 540, headerY + 60);
  ctx.restore();

  // 4. Main Glassmorphism Card
  const cardX = 70;
  const cardWidth = 940;
  const cardY = 360;
  const cardRadius = 40;

  // Calculate dynamic text lines to size the card smoothly
  ctx.font = '500 38px "Readex Pro", system-ui, sans-serif';
  const textLines = wrapText(ctx, post.content || '', cardWidth - 120);
  
  // Dynamic card height
  let contentHeight = textLines.length * 58 + 40;
  if (post.hasVoice) contentHeight += 160;
  const cardHeight = Math.max(760, Math.min(1060, 260 + contentHeight));

  // Card Drop Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 20;

  // Card Background
  ctx.fillStyle = '#0D0D0D';
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, true, false);
  ctx.restore();

  // Card Border
  ctx.strokeStyle = isFounder ? '#3B331A' : '#222222';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius, false, true);

  // 5. Author Header inside Card
  const authorY = cardY + 70;
  const avatarSize = 100;
  const avatarX = cardX + 60;

  // Load and draw avatar
  const avatarImg = await loadImage(author.avatar || DEFAULT_AVATAR);
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, authorY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, avatarX, authorY, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = '#222222';
    ctx.fillRect(avatarX, authorY, avatarSize, avatarSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((author.displayName || 'P')[0], avatarX + avatarSize / 2, authorY + avatarSize / 2);
  }
  ctx.restore();

  // Avatar Border Ring
  ctx.strokeStyle = isFounder ? '#F59E0B' : '#333333';
  ctx.lineWidth = isFounder ? 3 : 2;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, authorY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Author Name & Badges
  const infoX = avatarX + avatarSize + 30;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Display Name
  ctx.font = '700 36px "Readex Pro", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(author.displayName || 'مستخدم PULSE', infoX, authorY + 6);

  const nameWidth = ctx.measureText(author.displayName || 'مستخدم PULSE').width;

  // Founder Badge or Verified Checkmark
  if (isFounder) {
    const badgeX = infoX + nameWidth + 18;
    const badgeY = authorY + 8;
    ctx.fillStyle = '#F59E0B';
    roundRect(ctx, badgeX, badgeY, 175, 34, 8, true, false);
    ctx.font = '800 16px "Plus Jakarta Sans", monospace';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FOUNDER & DEV', badgeX + 87.5, badgeY + 17);
  } else if (isVerified) {
    const badgeX = infoX + nameWidth + 16;
    const badgeY = authorY + 14;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(badgeX + 12, badgeY + 12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(badgeX + 7, badgeY + 12);
    ctx.lineTo(badgeX + 11, badgeY + 16);
    ctx.lineTo(badgeX + 17, badgeY + 8);
    ctx.stroke();
  }

  // Handle (@username)
  ctx.font = '500 24px "Plus Jakarta Sans", monospace';
  ctx.fillStyle = '#737373';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`@${author.username || 'user'}`, infoX, authorY + 54);
  ctx.restore();

  // Divider Line inside Card
  ctx.strokeStyle = '#1F1F1F';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, authorY + avatarSize + 35);
  ctx.lineTo(cardX + cardWidth - 60, authorY + avatarSize + 35);
  ctx.stroke();

  // 6. Post Content (Text)
  const textStartY = authorY + avatarSize + 75;
  ctx.save();
  ctx.font = '500 38px "Readex Pro", sans-serif';
  ctx.fillStyle = '#F5F5F5';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  
  // Render text lines right-aligned for Arabic
  let currentY = textStartY;
  for (let i = 0; i < Math.min(textLines.length, 8); i++) {
    ctx.fillText(textLines[i], cardX + cardWidth - 60, currentY);
    currentY += 56;
  }
  ctx.restore();

  // 7. Voice Pulse Graphic (If post has voice)
  if (post.hasVoice) {
    currentY += 30;
    const voiceBoxX = cardX + 60;
    const voiceBoxWidth = cardWidth - 120;
    const voiceBoxHeight = 110;

    // Pill background
    ctx.fillStyle = '#141414';
    roundRect(ctx, voiceBoxX, currentY, voiceBoxWidth, voiceBoxHeight, 24, true, false);
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 1.5;
    roundRect(ctx, voiceBoxX, currentY, voiceBoxWidth, voiceBoxHeight, 24, false, true);

    // Audio soundwave bars
    const barWidth = 6;
    const barGap = 10;
    const barsCount = 28;
    const barsStartX = voiceBoxX + 40;
    const barsCenterY = currentY + voiceBoxHeight / 2;

    const mockHeights = [
      16, 28, 48, 64, 38, 22, 54, 72, 86, 68,
      44, 30, 60, 78, 50, 32, 24, 58, 80, 62,
      36, 20, 48, 66, 40, 24, 18, 12
    ];

    for (let b = 0; b < barsCount; b++) {
      const bh = mockHeights[b % mockHeights.length] * 0.75;
      const bx = barsStartX + b * (barWidth + barGap);
      ctx.fillStyle = b > 14 ? '#737373' : '#FFFFFF';
      roundRect(ctx, bx, barsCenterY - bh / 2, barWidth, bh, 3, true, false);
    }

    // Voice label
    ctx.save();
    ctx.font = '600 24px "Readex Pro", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('نبضة صوتية مسجلة', voiceBoxX + voiceBoxWidth - 35, barsCenterY - 12);

    ctx.font = '400 18px "Readex Pro", sans-serif';
    ctx.fillStyle = '#A3A3A3';
    ctx.fillText('استمع للرأي بصوت الكاتب على تطبيق PULSE', voiceBoxX + voiceBoxWidth - 35, barsCenterY + 18);
    ctx.restore();

    currentY += voiceBoxHeight;
  }



  // 9. Bottom Story Footer / Call To Action
  const footerY = 1680;

  // Clean White CTA Pill
  const ctaWidth = 460;
  const ctaHeight = 74;
  const ctaX = (1080 - ctaWidth) / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(255, 255, 255, 0.15)';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, ctaX, footerY, ctaWidth, ctaHeight, 37, true, false);
  ctx.restore();

  ctx.save();
  ctx.font = '800 24px "Readex Pro", "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('حمّل PULSE وشارك برأيك', 540, footerY + ctaHeight / 2);

  // Sub-footer text
  ctx.font = '500 20px "Readex Pro", sans-serif';
  ctx.fillStyle = '#525252';
  ctx.fillText('منصة التواصل الفكري والصوتي • Pulse App', 540, footerY + ctaHeight + 45);
  ctx.restore();

  return canvas;
}

/**
 * Exports canvas to PNG Blob
 */
export function getCanvasBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}

/**
 * Downloads / Saves the canvas directly to device storage
 */
export async function downloadStoryImage(canvas, filename = 'pulse-story.png') {
  const dataUrl = canvas.toDataURL('image/png');
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

  if (Capacitor.isNativePlatform()) {
    try {
      const saved = await Filesystem.writeFile({
        path: `Download/${filename}`,
        data: base64Data,
        directory: Directory.ExternalStorage,
        recursive: true
      });
      return { success: true, uri: saved.uri, native: true };
    } catch (err) {
      try {
        const saved = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        return { success: true, uri: saved.uri, native: true };
      } catch (e2) {
        console.warn('Filesystem write notice:', e2);
      }
    }
  }

  // Web fallback:
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return { success: true, native: false };
}

/**
 * Shares the rendered story canvas directly via Native Share Sheet (Instagram / TikTok)
 */
export async function shareStoryImage(canvas, post) {
  const filename = `pulse-story-${post.id || Date.now()}.png`;
  const dataUrl = canvas.toDataURL('image/png');
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

  if (Capacitor.isNativePlatform()) {
    try {
      // Write file into Cache directory for ContentProvider sharing
      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: `نبضة ${post.author?.displayName || ''} على PULSE`,
        text: 'شاهد هذه النبضة على تطبيق PULSE',
        url: fileResult.uri,
        dialogTitle: 'مشاركة إلى Instagram Stories أو التطبيقات الأخرى'
      });

      return { success: true, method: 'native_share' };
    } catch (err) {
      console.warn('Capacitor native share notice:', err);
      if (err.name === 'AbortError' || err.message?.includes('canceled') || err.message?.includes('closed')) {
        return { success: false, aborted: true };
      }
    }
  }

  // Web fallback via navigator.share or download
  try {
    const blob = await getCanvasBlob(canvas);
    if (blob && navigator.canShare) {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `نبضة ${post.author?.displayName || ''} على PULSE`,
          text: 'شاهد هذه النبضة على تطبيق PULSE',
          files: [file]
        });
        return { success: true, method: 'web_share' };
      }
    }
  } catch (err) {
    console.warn('Web share notice:', err);
  }

  await downloadStoryImage(canvas, filename);
  return { success: true, method: 'download' };
}
