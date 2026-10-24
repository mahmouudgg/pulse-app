import { Browser } from '@capacitor/browser';
import { isSafeUrl } from './securityCrypto';

/**
 * PULSE Official Grade Link Safety & Reputation Engine for PULSE
 * Analyzes links, detects phishing, typosquatting, raw IP targets,
 * dangerous executable payloads, and safely handles external navigation
 * via Chrome Custom Tabs / System Browser.
 */

// Reputable Global Platforms Whitelist
const TRUSTED_DOMAINS = new Set([
  'google.com',
  'www.google.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'github.com',
  'www.github.com',
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'instagram.com',
  'www.instagram.com',
  'threads.net',
  'www.threads.net',
  'facebook.com',
  'www.facebook.com',
  'linkedin.com',
  'www.linkedin.com',
  'apple.com',
  'www.apple.com',
  'microsoft.com',
  'www.microsoft.com',
  'wikipedia.org',
  'www.wikipedia.org',
  'en.wikipedia.org',
  'ar.wikipedia.org',
  'spotify.com',
  'open.spotify.com',
  't.me',
  'telegram.org',
  'whatsapp.com',
  'api.whatsapp.com',
  'wa.me',
  'reddit.com',
  'www.reddit.com',
  'pinterest.com',
  'www.pinterest.com',
  'twitch.tv',
  'www.twitch.tv',
  'tiktok.com',
  'www.tiktok.com',
  'vimeo.com',
  'medium.com',
  'discord.com',
  'discord.gg',
  'cloudinary.com',
  'firebaseapp.com',
  'web.app'
]);

// Dangerous Executables & Script Extensions
const DANGEROUS_EXTENSIONS = [
  '.exe', '.apk', '.bat', '.cmd', '.scr', '.pif', '.application',
  '.gadget', '.msi', '.msp', '.vbs', '.vbe', '.js', '.jse', '.ws',
  '.wsf', '.wsc', '.wsh', '.ps1', '.ps1xml', '.ps2', '.msh', '.msh1',
  '.msh2', '.mshxml', '.msh1xml', '.msh2xml', '.scf', '.lnk', '.inf',
  '.reg', '.jar'
];

// Phishing & Impersonation Keywords
const SUSPICIOUS_BRAND_SPOOFS = [
  'pulsesocial', 'pulse-login', 'pulse-verify', 'pulse-auth',
  'faceb00k', 'instagrarn', 'goog1e', 'paypa1', 'tw1tter',
  'apple-support-verify', 'account-security-update', 'login-verify-now'
];

/**
 * Normalizes raw URL input and ensures valid protocol
 */
export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Deep Analysis of a URL for safety, reputation, and risk tier
 * Returns comprehensive audit info
 */
export function analyzeUrl(rawUrl) {
  const normalized = normalizeUrl(rawUrl);

  // Validate strict protocol safety
  if (!isSafeUrl(normalized)) {
    return {
      isValid: false,
      url: normalized,
      domain: 'Invalid/Dangerous Protocol',
      isHttps: false,
      riskLevel: 'DANGER',
      riskTitleAr: 'رابط غير آمن ومحظور برمجياً',
      riskTitleEn: 'Blocked / Insecure Protocol',
      riskDescriptionAr: 'يحاول هذا الرابط تنفيذ سكريبت أو استخدام بروتوكول غير مصرح به (مثل javascript: أو data:). تم حظره فوراً لحماية جهازك.',
      riskDescriptionEn: 'This link uses a dangerous or non-web protocol. It was blocked to protect your device.',
      isTrusted: false,
      isSuspicious: true,
      isDangerous: true,
      requiresWarning: true
    };
  }

  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase();
    const isHttps = parsed.protocol === 'https:';
    const pathname = parsed.pathname.toLowerCase();

    // Check if hostname is an IPv4 or IPv6 address
    const isIpAddress = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');

    // Check for dangerous file downloads
    const hasDangerousExtension = DANGEROUS_EXTENSIONS.some(ext => pathname.endsWith(ext));

    // Check for spoofing / typosquatting
    const hasSpoofKeyword = SUSPICIOUS_BRAND_SPOOFS.some(kw => hostname.includes(kw));

    // Check if domain is trusted
    const isTrusted = TRUSTED_DOMAINS.has(hostname) && isHttps && !hasDangerousExtension;

    // Determine Risk Classification
    if (hasDangerousExtension || isIpAddress || hasSpoofKeyword) {
      let reasonAr = 'قد يؤدي هذا الرابط لتحميل ملف تنفيذي أو الدخول لخادم غير موثوق.';
      let reasonEn = 'This link points to an IP address or potential malicious file download.';
      if (hasDangerousExtension) {
        reasonAr = 'تحذير أمني شديد: الرابط ينتهي بملف تنفيذي قد يضر بهاتفك أو يثبت برمجيات تجسس.';
        reasonEn = 'Critical Alert: Link points directly to an executable/script file.';
      } else if (hasSpoofKeyword) {
        reasonAr = 'تحذير تصيد واحتيال: يبدو أن هذا الموقع ينتحل هوية موقع شهير لسرقة حساباتك.';
        reasonEn = 'Phishing Alert: Domain may be spoofing a recognized brand.';
      } else if (isIpAddress) {
        reasonAr = 'تحذير: هذا الرابط موجه لعنوان IP خادم مباشر بدلاً من اسم موقع رسمي.';
        reasonEn = 'Warning: Link directs to a raw server IP address instead of a domain name.';
      }

      return {
        isValid: true,
        url: normalized,
        domain: hostname,
        pathname: parsed.pathname,
        isHttps,
        riskLevel: 'DANGER',
        riskTitleAr: 'رابط عالي الخطورة أو مشبوه',
        riskTitleEn: 'High Risk / Suspicious Link',
        riskDescriptionAr: reasonAr,
        riskDescriptionEn: reasonEn,
        isTrusted: false,
        isSuspicious: true,
        isDangerous: true,
        requiresWarning: true
      };
    }

    // Check for unencrypted HTTP
    if (!isHttps) {
      return {
        isValid: true,
        url: normalized,
        domain: hostname,
        pathname: parsed.pathname,
        isHttps: false,
        riskLevel: 'WARNING',
        riskTitleAr: 'اتصال غير مشفر (HTTP)',
        riskTitleEn: 'Unencrypted Connection (HTTP)',
        riskDescriptionAr: 'هذا الموقع لا يستخدم تشفير HTTPS الآمن. أي بيانات أو كلمات مرور تدخلها فيه قد تكون عرضة للتنصت والاعتراض.',
        riskDescriptionEn: 'This website does not use SSL/HTTPS. Information entered there might be intercepted.',
        isTrusted: false,
        isSuspicious: true,
        isDangerous: false,
        requiresWarning: true
      };
    }

    // Trusted Domains
    if (isTrusted) {
      return {
        isValid: true,
        url: normalized,
        domain: hostname,
        pathname: parsed.pathname,
        isHttps: true,
        riskLevel: 'SAFE',
        riskTitleAr: 'منصة معروفة وموثوقة',
        riskTitleEn: 'Recognized & Trusted Platform',
        riskDescriptionAr: 'أنت على وشك مغادرة منصة PULSE والانتقال إلى موقع خارجي موثوق ومشفر.',
        riskDescriptionEn: 'You are leaving PULSE to visit a recognized secure external platform.',
        isTrusted: true,
        isSuspicious: false,
        isDangerous: false,
        requiresWarning: false
      };
    }

    // Standard External HTTPS Website
    return {
      isValid: true,
      url: normalized,
      domain: hostname,
      pathname: parsed.pathname,
      isHttps: true,
      riskLevel: 'STANDARD',
      riskTitleAr: 'موقع خارجي',
      riskTitleEn: 'External Website',
      riskDescriptionAr: 'أنت على وشك مغادرة منصة PULSE والانتقال إلى موقع خارجي. منصة PULSE ليست مسؤولة عن محتوى المواقع الخارجية.',
      riskDescriptionEn: 'You are leaving PULSE. PULSE is not responsible for external content or practices.',
      isTrusted: false,
      isSuspicious: false,
      isDangerous: false,
      requiresWarning: false
    };
  } catch {
    return {
      isValid: false,
      url: normalized,
      domain: 'Malformed URL',
      isHttps: false,
      riskLevel: 'DANGER',
      riskTitleAr: 'رابط تالف أو غير صالح',
      riskTitleEn: 'Invalid / Malformed Link',
      riskDescriptionAr: 'الرابط غير صالح أو به تشويه برمجياً.',
      riskDescriptionEn: 'The provided URL is malformed or invalid.',
      isTrusted: false,
      isSuspicious: true,
      isDangerous: true,
      requiresWarning: true
    };
  }
}

/**
 * Opens a URL in the official native system browser or Chrome Custom Tabs
 * Ensures complete sandboxing and zero disruption to the PULSE React app
 */
export async function openInSafeBrowser(targetUrl) {
  const normalized = normalizeUrl(targetUrl);
  if (!normalized) return false;

  try {
    await Browser.open({
      url: normalized,
      windowName: '_blank',
      toolbarColor: '#000000',
      presentationStyle: 'fullscreen'
    });
    return true;
  } catch (err) {
    console.warn('Capacitor Browser plugin fallback:', err);
    try {
      window.open(normalized, '_system');
      return true;
    } catch {
      window.location.href = normalized;
      return true;
    }
  }
}
