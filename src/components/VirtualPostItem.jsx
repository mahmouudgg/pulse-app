import React from 'react';

/**
 * PULSE Official 120Hz GPU Virtual Windowing Item
 * Uses native content-visibility: auto for butter-smooth 120Hz scrolling
 * without destroying offscreen React DOM nodes or audio/video streams.
 */
export default function VirtualPostItem({ children, minHeight = 160 }) {
  return (
    <div
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: `auto ${minHeight}px`
      }}
      className="transform-gpu"
    >
      {children}
    </div>
  );
}
