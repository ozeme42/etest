const CACHE_NAME = 'etest-pwa-v3';
const IMAGE_CACHE_NAME = 'etest-supabase-images-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== IMAGE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Supabase Storage Public Images (Soru resimleri, kırpılmış testler, kapaklar)
  // Cache-First stratejisi: İlk indirmeden sonra kalıcı cihaz önbelleğinden sunar (0 Supabase bandwidth)
  const isSupabaseStorage = url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/');
  if (isSupabaseStorage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cached || new Response('', { status: 408, statusText: 'Image unavailable offline' });
        }
      })
    );
    return;
  }

  // Only handle same-origin http/https requests for remaining assets
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  // SPA Page Navigation: Network first, fallback to cached /index.html or /
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallback = (await caches.match('/index.html')) || (await caches.match('/'));
          if (fallback) return fallback;
          return new Response('Çevrimdışısınız / Sayfa Yüklenemedi', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Static Assets / Other same-origin GET requests
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Ağ Hatası Oluştu', {
          status: 408,
          statusText: 'Request Timeout',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});
