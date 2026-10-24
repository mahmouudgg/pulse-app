import React, { createContext, useContext, useState, useCallback } from 'react';
import SafeLinkModal from '../components/SafeLinkModal';

const SafeLinkContext = createContext({
  openSafeLink: () => {}
});

export function SafeLinkProvider({ children, lang = 'ar' }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    url: ''
  });

  const openSafeLink = useCallback((url) => {
    if (!url) return;
    setModalState({
      isOpen: true,
      url: typeof url === 'string' ? url.trim() : ''
    });
  }, []);

  const closeSafeLink = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <SafeLinkContext.Provider value={{ openSafeLink }}>
      {children}
      <SafeLinkModal
        isOpen={modalState.isOpen}
        url={modalState.url}
        onClose={closeSafeLink}
        lang={lang}
      />
    </SafeLinkContext.Provider>
  );
}

export function useSafeLink() {
  const context = useContext(SafeLinkContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      openSafeLink: (url) => {
        if (typeof window !== 'undefined' && url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    };
  }
  return context;
}
