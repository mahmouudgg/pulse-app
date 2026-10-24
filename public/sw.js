// PULSE Web Platform Service Worker v1.0.0
const CACHE_NAME = 'pulse-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/pulse_mockup_feed.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip firebase RTDB/external analytics from aggressive caching
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin.includes('firebaseio.com') || url.origin.includes('qrserver.com') || url.origin.includes('ipapi.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache).catch(() => {});
        });
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});
