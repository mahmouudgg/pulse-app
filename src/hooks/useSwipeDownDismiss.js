import { useState, useRef } from 'react';
import { hapticsService } from '../services/hapticsService';

/**
 * PULSE Official / Threads Grade Swipe Down to Dismiss Hook
 * Provides silky-smooth pull-to-dismiss gestures for all modal bottom sheets and cards.
 */
export function useSwipeDownDismiss({ onClose, threshold = 80, enabled = true }) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);
  const isEligible = useRef(false);
  const hasDecided = useRef(false);

  const handleTouchStart = (e) => {
    if (!enabled || isClosing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.target;

    // Do not intercept interactive form elements
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      isEligible.current = false;
      return;
    }

    // Check if inner container is scrolled down
    let el = target;
    let isScrolled = false;
    while (el && el !== e.currentTarget) {
      if (el.scrollTop > 2) {
        isScrolled = true;
        break;
      }
      el = el.parentElement;
    }

    if (isScrolled) {
      isEligible.current = false;
      return;
    }

    startY.current = touch.clientY;
    startX.current = touch.clientX;
    lastY.current = touch.clientY;
    lastTime.current = performance.now();
    velocityY.current = 0;
    isEligible.current = true;
    hasDecided.current = false;
  };

  const handleTouchMove = (e) => {
    if (!isEligible.current || isClosing || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const diffY = touch.clientY - startY.current;
    const diffX = touch.clientX - startX.current;

    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 8) {
      velocityY.current = (touch.clientY - lastY.current) / dt;
      lastY.current = touch.clientY;
      lastTime.current = now;
    }

    if (!hasDecided.current) {
      if (Math.abs(diffY) > 7 || Math.abs(diffX) > 7) {
        hasDecided.current = true;
        // Direction lock: only downward drag where vertical dominates
        if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX) * 1.1) {
          setIsDragging(true);
        } else {
          isEligible.current = false;
          return;
        }
      }
      return;
    }

    if (diffY > 0) {
      // Natural rubber-band resistance
      const damped = diffY > threshold
        ? threshold + Math.pow(diffY - threshold, 0.72)
        : diffY;
      setDragY(damped);
    } else {
      setDragY(diffY * 0.12);
    }
  };

  const handleTouchEnd = () => {
    if (!isEligible.current) return;
    isEligible.current = false;
    setIsDragging(false);

    const shouldDismiss = dragY >= threshold || velocityY.current > 0.45;
    if (shouldDismiss && onClose) {
      setIsClosing(true);
      try { hapticsService.light?.(); } catch {}
      setDragY(window.innerHeight || 800);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragY(0);
      }, 190);
    } else {
      // Spring back
      setDragY(0);
    }
  };

  const containerProps = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
    style: {
      transform: dragY !== 0 ? `translate3d(0, ${Math.max(0, dragY)}px, 0)` : undefined,
      transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)'
    }
  };

  const backdropStyle = {
    opacity: isDragging ? Math.max(0.15, 1 - dragY / 320) : undefined,
    transition: isDragging ? 'none' : 'opacity 0.28s ease'
  };

  return { dragY, isDragging, isClosing, containerProps, backdropStyle };
}
