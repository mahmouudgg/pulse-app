import React from 'react';

/**
 * High-definition SVG Flag of Egypt (جمهورية مصر العربية)
 */
export function EgyptFlag({ className = "w-6 h-4" }) {
  return (
    <svg
      viewBox="0 0 900 600"
      className={`${className} rounded-[2px] shadow-sm flex-shrink-0 border border-neutral-700/60 overflow-hidden`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top Red Band */}
      <rect width="900" height="200" fill="#CE1126" />
      {/* Middle White Band */}
      <rect y="200" width="900" height="200" fill="#FFFFFF" />
      {/* Bottom Black Band */}
      <rect y="400" width="900" height="200" fill="#000000" />
      {/* Eagle of Saladin (Golden) */}
      <g transform="translate(450, 300) scale(0.65)">
        <path
          d="M -40,-80 C -30,-60 -20,-30 -15,10 C -25,25 -30,50 -20,70 C -10,85 10,85 20,70 C 30,50 25,25 15,10 C 20,-30 30,-60 40,-80 C 20,-70 5,-65 0,-60 C -5,-65 -20,-70 -40,-80 Z"
          fill="#C09300"
        />
        {/* Shield */}
        <path
          d="M -16,-20 L 16,-20 L 14,35 L 0,48 L -14,35 Z"
          fill="#FFFFFF"
          stroke="#C09300"
          strokeWidth="3"
        />
        {/* Head & Crown */}
        <circle cx="0" cy="-75" r="14" fill="#C09300" />
        <path d="M 0,-75 L 12,-70 L 0,-65 Z" fill="#C09300" />
        {/* Tail feathers */}
        <path d="M -15,70 L 0,95 L 15,70 Z" fill="#C09300" />
      </g>
    </svg>
  );
}

/**
 * High-definition SVG Flag of International English (UK / US)
 */
export function EnglishFlag({ className = "w-6 h-4" }) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={`${className} rounded-[2px] shadow-sm flex-shrink-0 border border-neutral-700/60 overflow-hidden`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id="uk-flag-clip">
        <rect width="60" height="30" />
      </clipPath>
      <g clipPath="url(#uk-flag-clip)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

export default function CountryFlags({ code = '+20', className = "w-5 h-3.5" }) {
  if (code === '+20' || code === 'EG') {
    return <EgyptFlag className={className} />;
  }
  if (code === '+1' || code === 'US' || code === 'EN') {
    return <EnglishFlag className={className} />;
  }
  return <EgyptFlag className={className} />;
}
