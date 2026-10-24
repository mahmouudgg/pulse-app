// Permanent Cloudinary hosted ultra-reliable default dark avatar
export const DEFAULT_AVATAR = "https://res.cloudinary.com/dgskw7nki/image/upload/f_auto,q_auto/v1792681479/pulse_avatars/pulse_default_avatar_dark.png";

export function resolveAvatar(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return DEFAULT_AVATAR;
  const trimmed = avatarUrl.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') return DEFAULT_AVATAR;
  
  // Cloudinary hosted images (including official brand vector SVGs and uploaded photos) are always valid
  if (trimmed.includes('res.cloudinary.com')) {
    return trimmed;
  }
  
  // Reject broken legacy local paths or raw data URLs that fail
  if (trimmed.includes('default-avatar') || trimmed.includes('/default_avatar')) {
    return DEFAULT_AVATAR;
  }
  
  return trimmed;
}
