const CACHE_NAME = 'dulce-antojito-cache-v2';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './favicon-192x192.png',
  './favicon.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(oldKey => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (!isSameOrigin) return;

  const isNavigation = event.request.mode === 'navigate';
  const isCoreAsset = /\.(?:html|js|css|json)$/.test(requestUrl.pathname);
  const isImage = /\.(?:png|jpg|jpeg|webp|gif|svg|ico)$/.test(requestUrl.pathname);

  if (isNavigation || isCoreAsset) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isImage) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

function networkFirst(request) {
  return fetch(request)
    .then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    })
    .catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return caches.match('./index.html');
    });
}

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;

    return fetch(request).then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    });
  });
}
