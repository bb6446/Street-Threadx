
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Suppress benign Vite HMR websocket errors that can trigger unhandled rejection overlays
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && 
      (event.reason.message?.includes('WebSocket') || 
       event.reason === 'WebSocket closed without opened.')) {
    event.preventDefault();
    console.warn('Suppressed benign HMR websocket error:', event.reason);
  }
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
