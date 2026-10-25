import React from 'react';
import { storageService } from '../services/storageService';
import { isSafeUrl } from '../utils/securityCrypto';
import { useSafeLink } from '../context/SafeLinkContext';

/**
 * PULSE Official RichTextRenderer
 * Detects and renders:
 * 1. @mentions -> Clickable, opens profile directly, no underlines, subtle opacity
 * 2. #hashtags -> Filterable topic tags
 * 3. URLs -> Clickable external links protected by SafeLinkModal & Chrome Custom Tabs
 */
export default function RichTextRenderer({
  text = '',
  className = '',
  mentionClassName = 'text-[#0095F6] font-medium hover:underline cursor-pointer inline-block select-text',
  linkClassName = '',
  onOpenUserProfile = null,
  onTagClick = null
}) {
  const { openSafeLink } = useSafeLink();

  if (!text) return null;

  // Regex to match mentions (@username), hashtags (#topic), or URLs
  const tokenRegex = /(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_\u0600-\u06FF]+|https?:\/\/[^\s]+)/g;

  const parts = text.split(tokenRegex);

  const handleMentionClick = (e, usernameWithoutAt) => {
    e.stopPropagation();
    if (!onOpenUserProfile) return;
    const targetUser = storageService.getUserByUsername(usernameWithoutAt);
    if (targetUser) {
      onOpenUserProfile(targetUser);
    } else {
      // Mock minimal user if not yet in cache
      onOpenUserProfile({
        uid: 'user_' + usernameWithoutAt,
        username: usernameWithoutAt,
        displayName: usernameWithoutAt
      });
    }
  };

  const handleTagClick = (e, tagWithoutHash) => {
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(tagWithoutHash);
    }
  };

  return (
    <span className={className} dir="auto">
      {parts.map((part, index) => {
        if (!part) return null;

        // @mention - Threads Blue (#0095F6)
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          return (
            <span
              key={index}
              onClick={(e) => handleMentionClick(e, username)}
              className={mentionClassName}
              title={`الملف الشخصي لـ @${username}`}
            >
              {part}
            </span>
          );
        }

        // #hashtag
        if (part.startsWith('#') && part.length > 1) {
          const tag = part.slice(1);
          return (
            <span
              key={index}
              onClick={(e) => handleTagClick(e, tag)}
              className="text-neutral-300 font-semibold cursor-pointer transition-colors hover:text-white inline-block select-text"
            >
              {part}
            </span>
          );
        }

        // URL with Strict Protocol Sanitization & Interstitial Modal
        if ((part.startsWith('http://') || part.startsWith('https://')) && isSafeUrl(part)) {
          return (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openSafeLink(part);
              }}
              className={linkClassName || "text-neutral-300 hover:text-white transition-colors underline decoration-neutral-600 underline-offset-2 break-all inline cursor-pointer select-text text-start font-normal"}
              title={`فتح الرابط بأمان: ${part}`}
            >
              {part.length > 35 ? part.slice(0, 35) + '...' : part}
            </button>
          );
        }

        // Standard Text
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
