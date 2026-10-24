/**
 * PULSE Device & Geolocation Intelligence Engine
 * Provides accurate, client-side parsing of hardware, OS, browser, and approximate location.
 */

// Generate or retrieve persistent Session ID for this browser/device
export function getOrCreateSessionId() {
  const KEY = 'pulse_device_session_id_v1';
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

// Parse User-Agent for human-readable Device, OS, and Browser
export function getDeviceInfo() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  let os = 'Unknown OS';
  let deviceType = 'desktop';
  let deviceModel = '';

  // 1. Detect Operating System & Device Model
  if (/Android/i.test(ua)) {
    os = 'Android';
    deviceType = 'mobile';
    const match = ua.match(/Android\s+([\d.]+)/i);
    if (match) os = `Android ${match[1]}`;

    // Extract device model (e.g. SM-S928B, Pixel 8, Redmi Note)
    const modelMatch = ua.match(/;\s*([^;)]+)\s*Build/i);
    if (modelMatch && modelMatch[1]) {
      deviceModel = modelMatch[1].trim();
    } else {
      deviceModel = 'Android Phone';
    }
  } else if (/iPhone/i.test(ua)) {
    os = 'iOS (iPhone)';
    deviceType = 'mobile';
    deviceModel = 'iPhone';
    const match = ua.match(/OS\s+([\d_]+)/i);
    if (match) os = `iOS ${match[1].replace(/_/g, '.')}`;
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    deviceType = 'tablet';
    deviceModel = 'iPad';
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'desktop';
    deviceModel = 'Windows PC';
    if (/Windows NT 10.0/i.test(ua)) os = 'Windows 11 / 10';
    else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
    else os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'desktop';
    deviceModel = 'Mac';
    os = 'macOS';
    const match = ua.match(/Mac OS X\s+([\d_]+)/i);
    if (match) os = `macOS ${match[1].replace(/_/g, '.')}`;
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop';
    deviceModel = 'Linux Machine';
    os = 'Linux';
  }

  // 2. Detect Browser
  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/SamsungBrowser\//i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = 'Opera';
  }

  // Capacitor native app detection
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
    browser = 'PULSE Mobile App';
  }

  // Friendly human readable display name
  let friendlyName = deviceModel ? `${deviceModel} (${browser})` : `${os} (${browser})`;
  if (deviceType === 'desktop') {
    friendlyName = `${browser} على ${os}`;
  } else if (deviceType === 'mobile' && deviceModel) {
    friendlyName = `${deviceModel}`;
  }

  return {
    sessionId: getOrCreateSessionId(),
    deviceName: friendlyName,
    deviceType,
    deviceModel: deviceModel || os,
    os,
    browser,
    userAgent: ua.slice(0, 150)
  };
}

// Approximate Geolocation via IP (Cached in sessionStorage to prevent rate limits)
export async function getApproximateLocation() {
  const CACHE_KEY = 'pulse_cached_geo_loc';
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // Fallback based on client timezone
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  let fallbackLocation = 'مصر';
  if (tz.includes('Cairo')) fallbackLocation = 'القاهرة، مصر';
  else if (tz.includes('Riyadh')) fallbackLocation = 'الرياض، السعودية';
  else if (tz.includes('Dubai')) fallbackLocation = 'دبي، الإمارات';
  else if (tz.includes('London')) fallbackLocation = 'لندن، المملكة المتحدة';
  else if (tz.includes('New_York') || tz.includes('Los_Angeles')) fallbackLocation = 'الولايات المتحدة';
  else if (tz) fallbackLocation = tz.replace(/_/g, ' ');

  // Attempt lightweight IP lookup with 2000ms timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || '';
      const country = data.country_name || '';
      const locStr = city && country ? `${city}، ${country}` : (city || country || fallbackLocation);
      const result = {
        city: city || '',
        country: country || '',
        location: locStr,
        ip: data.ip ? data.ip.replace(/\.\d+$/, '.xxx') : 'مخفي'
      };
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
      } catch {}
      return result;
    }
  } catch {
    // Timeout or network offline
  }

  const defaultResult = {
    city: '',
    country: '',
    location: fallbackLocation,
    ip: 'مخفي'
  };
  return defaultResult;
}
