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

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration error:', err);
    });
  });
}