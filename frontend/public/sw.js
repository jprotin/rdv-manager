const CACHE_NAME = 'rdv-manager-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache non-GET or chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  // API calls: network first, fallback to cached response
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell: cache first, then network
  event.respondWith(
    caches.match(request).then(
      (cached) => cached || fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
    )
  );
});

// Background sync: push unsynced local data when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-rdv') {
    event.waitUntil(
      self.clients.matchAll().then((clients) =>
        clients.forEach((client) => client.postMessage({ type: 'SYNC_REQUESTED' }))
      )
    );
  }
});
