import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Global Unhandled Rejection & Error Protection
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[PULSE System] Intercepted unhandled promise rejection:', event.reason);
    // Prevent unhandled rejection crashes from taking down app runtime
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.warn('[PULSE System] Caught uncaught window error:', event.message);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
