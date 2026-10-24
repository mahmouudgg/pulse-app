import React from 'react';
import MusicPage from '../pages/MusicPage';

/**
 * MusicPickerModal Adapter
 * Replaces the old legacy bottom-sheet with the unified, full-fledged MusicPage.
 */
export default function MusicPickerModal({
  isOpen,
  onClose,
  onSelectMusic,
  currentUser
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden animate-fade-in">
      <MusicPage
        currentUser={currentUser}
        onBack={onClose}
        onSelectMusicForCompose={onSelectMusic}
      />
    </div>
  );
}
