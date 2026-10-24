import React from 'react';

export default function PulseLogo({ size = 32, className = '', animated = true, withCard = false }) {
  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none flex-shrink-0 tap-press ${className}`} 
      style={{ width: size, height: size }}
      aria-label="PULSE"
    >
      <svg 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_12px_rgba(255,255,255,0.18)]"
      >
        {withCard && (
          <>
            <rect width="64" height="64" rx="18" fill="#000000" />
            <rect x="0.5" y="0.5" width="63" height="63" rx="17.5" stroke="#26262B" strokeWidth="1" />
          </>
        )}
        {/* Harmonic Vector Pulse Bars */}
        <line 
          x1="17" y1="24" x2="17" y2="40" 
          stroke="#FFFFFF" 
          strokeWidth="4" 
          strokeLinecap="round"
          className={animated ? 'animate-pulse-bar-1' : ''}
          style={{ transformOrigin: '17px 32px' }}
        />
        <line 
          x1="24.5" y1="16" x2="24.5" y2="48" 
          stroke="#FFFFFF" 
          strokeWidth="4.2" 
          strokeLinecap="round"
          className={animated ? 'animate-pulse-bar-2' : ''}
          style={{ transformOrigin: '24.5px 32px' }}
        />
        <line 
          x1="32" y1="10" x2="32" y2="54" 
          stroke="#FFFFFF" 
          strokeWidth="4.5" 
          strokeLinecap="round"
          className={animated ? 'animate-pulse-bar-3' : ''}
          style={{ transformOrigin: '32px 32px' }}
        />
        <line 
          x1="39.5" y1="16" x2="39.5" y2="48" 
          stroke="#FFFFFF" 
          strokeWidth="4.2" 
          strokeLinecap="round"
          className={animated ? 'animate-pulse-bar-4' : ''}
          style={{ transformOrigin: '39.5px 32px' }}
        />
        <line 
          x1="47" y1="24" x2="47" y2="40" 
          stroke="#FFFFFF" 
          strokeWidth="4" 
          strokeLinecap="round"
          className={animated ? 'animate-pulse-bar-5' : ''}
          style={{ transformOrigin: '47px 32px' }}
        />
      </svg>
    </div>
  );
}
