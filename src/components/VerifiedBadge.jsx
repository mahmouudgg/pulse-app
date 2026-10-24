import React from 'react';
import { Check } from 'lucide-react';

/**
 * Unified Threads/Instagram Verified Badge
 * Solid #0095F6 blue circle with a crisp white checkmark
 */
export default function VerifiedBadge({ size = 14, className = '', title = 'موثق' }) {
  const iconSize = Math.max(7, Math.round(size * 0.62));
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#0095F6] flex-shrink-0 align-middle ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`
      }}
      title={title}
    >
      <Check size={iconSize} className="text-white stroke-[3.5]" />
    </span>
  );
}
