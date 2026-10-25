import React, { useState, useEffect, useRef } from 'react';
import { hapticsService } from '../services/hapticsService';

/**
 * PULSE-Style PULSE Official Animated Counter Ticker
 * Smoothly rolls up/down when engagement stats (likes, replies, reposts, views) change.
 */
export default function AnimatedCounter({ value = 0, className = '' }) {
  const numValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;
  const [displayValue, setDisplayValue] = useState(numValue);
  const [prevValue, setPrevValue] = useState(numValue);
  const [direction, setDirection] = useState('up');
  const [isAnimating, setIsAnimating] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (numValue !== displayValue) {
      setPrevValue(displayValue);
      setDirection(numValue > displayValue ? 'up' : 'down');
      setIsAnimating(true);
      setDisplayValue(numValue);
      hapticsService.counter();

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 320);

      return () => clearTimeout(timer);
    }
  }, [numValue]);

  if (!isAnimating) {
    return (
      <span className={`inline-block tabular-nums font-mono leading-none ${className}`}>
        {displayValue}
      </span>
    );
  }

  return (
    <span className={`relative inline-flex items-center justify-center overflow-hidden h-[1.15em] tabular-nums font-mono select-none leading-none ${className}`}>
      {/* Outgoing previous value */}
      <span
        key={`prev-${prevValue}`}
        className="inline-block transition-all duration-300 ease-out will-change-transform leading-none opacity-0"
        style={{
          transform: direction === 'up' ? 'translateY(-110%)' : 'translateY(110%)'
        }}
      >
        {prevValue}
      </span>

      {/* Incoming current value */}
      <span
        key={`curr-${displayValue}`}
        className="absolute inset-0 flex items-center justify-center leading-none animate-ticker-roll will-change-transform"
      >
        {displayValue}
      </span>
    </span>
  );
}
