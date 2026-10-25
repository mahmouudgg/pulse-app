import React, { useState, useRef } from 'react';
import { hapticsService } from '../services/hapticsService';
import { useLanguage } from '../context/LanguageContext';

/**
 * Threads / iOS PULSE Official Grade Back Swipe Gesture Wrapper
 * Supports:
 * - Natural Left-to-Right swipe (iOS standard back navigation)
 * - Right-edge-inward swipe for RTL
 * - Generous touch start zones (left 45% of screen or right edge)
 * - Velocity tracking for flick/fling dismiss
 * - Zero conflict with vertical feeds
 */
export default function SwipeBackWrapper({ onBack, children, className = '' }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [passedThreshold, setPassedThreshold] = useState(false);
  const [activeDirection, setActiveDirection] = useState('right'); // 'right' (left->right) or 'left' (right->left)

  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocityX = useRef(0);
  const isValidStart = useRef(false);
  const hasDecidedDirection = useRef(false);
  const isHorizontalGesture = useRef(false);
  const swipeMode = useRef('right'); // 'right' or 'left'

  const DISMISS_THRESHOLD = 75; // px distance to trigger dismiss
  const FLING_VELOCITY = 0.45; // px/ms flick threshold

  const handleTouchStart = (e) => {
    if (!onBack || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;
    const touchX = touch.clientX;

    // Generous touch zones:
    // 1. Left side (up to 45% of screen width) for iOS-style swipe right
    // 2. Right side (within 85px of right edge) for RTL swipe left
    const isLeftZone = touchX < Math.max(screenWidth * 0.45, 120);
    const isRightEdge = touchX > screenWidth - 85;

    if (isLeftZone || isRightEdge) {
      startX.current = touchX;
      startY.current = touch.clientY;
      lastX.current = touchX;
      lastTime.current = performance.now();
      velocityX.current = 0;
      isValidStart.current = true;
      hasDecidedDirection.current = false;
      isHorizontalGesture.current = false;
      swipeMode.current = isRightEdge ? 'left' : 'right';
    } else {
      isValidStart.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!isValidStart.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startX.current;
    const diffY = touch.clientY - startY.current;

    // Track instantaneous velocity
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 8) {
      const dx = touch.clientX - lastX.current;
      velocityX.current = dx / dt;
      lastX.current = touch.clientX;
      lastTime.current = now;
    }

    // Direction lock: decide whether it's horizontal swipe or vertical scroll
    if (!hasDecidedDirection.current) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        hasDecidedDirection.current = true;
        const isSwipingRight = diffX > 0 && swipeMode.current === 'right';
        const isSwipingLeft = diffX < 0 && swipeMode.current === 'left';

        if (Math.abs(diffX) > Math.abs(diffY) && (isSwipingRight || isSwipingLeft)) {
          isHorizontalGesture.current = true;
          setActiveDirection(swipeMode.current);
          setIsDragging(true);
        } else {
          isValidStart.current = false;
          return;
        }
      }
      return;
    }

    if (!isHorizontalGesture.current) return;

    // Measure drag distance according to swipe mode
    const distance = swipeMode.current === 'right' ? diffX : -diffX;
    if (distance > 0) {
      // Damped rubber-banding past threshold
      const damped = distance > DISMISS_THRESHOLD
        ? DISMISS_THRESHOLD + Math.pow(distance - DISMISS_THRESHOLD, 0.72)
        : distance;

      setDragOffset(damped);

      if (damped >= DISMISS_THRESHOLD && !passedThreshold) {
        setPassedThreshold(true);
        try { hapticsService.selection?.(); } catch {}
      } else if (damped < DISMISS_THRESHOLD && passedThreshold) {
        setPassedThreshold(false);
      }
    } else {
      setDragOffset(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isValidStart.current || !isHorizontalGesture.current) {
      reset();
      return;
    }

    const inwardVelocity = swipeMode.current === 'right' ? velocityX.current : -velocityX.current;
    const shouldDismiss = dragOffset >= DISMISS_THRESHOLD || inwardVelocity > FLING_VELOCITY;

    if (shouldDismiss) {
      try { hapticsService.light?.(); } catch {}
      // Slide out smoothly
      setDragOffset(window.innerWidth);
      setTimeout(() => {
        if (onBack) onBack();
      }, 160);
    } else {
      // Spring back smoothly
      setDragOffset(0);
    }

    reset();
  };

  const reset = () => {
    setIsDragging(false);
    setPassedThreshold(false);
    isValidStart.current = false;
    hasDecidedDirection.current = false;
    isHorizontalGesture.current = false;
  };

  const transformX = activeDirection === 'right' ? dragOffset : -dragOffset;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        transform: dragOffset > 0 ? `translate3d(${transformX}px, 0, 0)` : undefined,
        opacity: isDragging ? Math.max(0.75, 1 - (dragOffset / (window.innerWidth * 1.5))) : 1,
        transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.24s ease-out'
      }}
      className={`min-h-screen ${isDragging ? 'will-change-transform' : ''} ${
        isDragging ? (activeDirection === 'right' ? 'back-swipe-shadow' : 'back-swipe-shadow-rtl') : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
