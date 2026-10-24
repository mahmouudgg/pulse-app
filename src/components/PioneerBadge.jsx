import React from 'react';
import { Compass } from 'lucide-react';

/**
 * Founding Pioneer Badge (Exclusive to the first 10,000 users)
 * PULSE Official aesthetic with subtle violet/cyan glow and member rank #
 */
export default function PioneerBadge({ number, size = 'sm', showLabel = false, className = '', username = '', uid = '' }) {
  // Never show pioneer badge for official platform accounts or founder
  const isOfficial = username === 'my' || username === 'pulse' || username === 'sovythos' || 
    uid === 'dev_mahmoud_yasser' || uid === 'user_1789828179039' || uid === 'user_1789917894698';
  if (isOfficial) return null;

  const numVal = Number(number);
  if (isNaN(numVal) || numVal <= 1) return null;

  if (size === 'xs') {
    return (
      <span
        title={`رائد فكري من الأوائل: العضو رقم #${numVal}`}
        className={`inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-md font-mono text-[9px] font-medium tracking-tight select-none bg-[#141416] border border-[#242426] text-neutral-400 ${className}`}
      >
        <Compass size={8.5} className="text-neutral-500 stroke-[2]" />
        <span>#{numVal}</span>
      </span>
    );
  }

  return (
    <span
      title={`رائد فكري من الأوائل: العضو رقم #${numVal} من أول 10,000 في PULSE`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium tracking-wide select-none bg-white/[0.04] border border-white/10 text-neutral-300 ${className}`}
    >
      <Compass size={9.5} className="text-neutral-400 stroke-[2]" />
      <span>{showLabel ? `PIONEER #${numVal}` : `#${numVal}`}</span>
    </span>
  );
}
