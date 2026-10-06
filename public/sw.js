const CACHE_NAME = 'gerente-imob-v6.8.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png'
      ]);
    }).catch(err => console.warn('PWA Cache error:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// Cache First Strategy with Network Fallback for assets, 
// Network First for Navigation
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Validate protocol to prevent throwing exceptions on chrome-extension, safari-extension, file, etc.
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // Bypass service worker caching for Vite development files & dev environments
  if (
    url.hostname === 'localhost' || 
    url.hostname.includes('ais-dev-') || 
    url.pathname.includes('/@vite/') || 
    url.pathname.includes('/@fs/') || 
    url.searchParams.has('import') || 
    url.pathname.endsWith('.ts') || 
    url.pathname.endsWith('.tsx') ||
    url.pathname.includes('/src/') ||
    url.pathname.includes('node_modules')
  ) {
    return; // Let browser handle it natively without SW interference
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const matched = await cache.match('/');
          if (matched) return matched;
        } catch (err) {
          console.warn('Navigation fallback match failed:', err);
        }
        // Fallback to fetch again as last resort
        return fetch(event.request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Also fetch in background to update cache (stale-while-revalidate pattern)
        fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache).catch(err => {
                console.warn('Failed to put response to cache:', err);
              });
            }).catch(err => {
              console.warn('Failed to open cache:', err);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    }).catch(() => {
      return fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'PING') {
    event.source.postMessage('PONG');
  }
});
