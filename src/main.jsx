import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CompositeAppProviders from './context/CompositeAppProviders.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CompositeAppProviders>
        <App />
      </CompositeAppProviders>
    </BrowserRouter>
  </StrictMode>,
)

// Auto-recover from dynamic import chunk mismatches on new deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Yeni sürüm tespit edildi, sayfa güncelleniyor...');
  window.location.reload();
});

// Register Service Worker for PWA with auto-update
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.update();
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Yeni sürüm yüklendi, sayfa güncelleniyor...');
              window.location.reload();
            }
          });
        }
      });
    }).catch(err => {
      console.log('SW registration error:', err);
    });
  });
}