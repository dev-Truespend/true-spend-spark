// Service Worker for PWA - Phase 1 Enhanced
const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `truespend-static-${CACHE_VERSION}`;
const API_CACHE_NAME = `truespend-api-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `truespend-runtime-${CACHE_VERSION}`;

// Only cache hashed assets - HTML should always be fresh
const STATIC_ASSETS = [
  // Do NOT cache HTML/index - users need latest version
  // Only cache hashed JS/CSS files which change with each build
];

// Cache configuration
const CACHE_CONFIG = {
  maxAge: {
    static: 30 * 24 * 60 * 60 * 1000, // 30 days
    api: 7 * 24 * 60 * 60 * 1000,      // 7 days
    runtime: 24 * 60 * 60 * 1000,      // 1 day
  },
  maxEntries: {
    api: 100,
    runtime: 50,
  },
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => 
              name.startsWith('truespend-') && 
              name !== CACHE_NAME && 
              name !== API_CACHE_NAME && 
              name !== RUNTIME_CACHE_NAME
            )
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Helper: Check if cache entry is expired
async function isCacheExpired(cache, request, maxAge) {
  const response = await cache.match(request);
  if (!response) return true;
  
  const cachedTime = response.headers.get('sw-cache-time');
  if (!cachedTime) return true;
  
  const age = Date.now() - parseInt(cachedTime, 10);
  return age > maxAge;
}

// Helper: Add timestamp to response
function addCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-time', Date.now().toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

// Helper: Limit cache entries
async function limitCacheSize(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    const entriesToDelete = keys.length - maxEntries;
    for (let i = 0; i < entriesToDelete; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${entriesToDelete} entries from ${cacheName}`);
  }
}

// Fetch event - Advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - Stale-while-revalidate with expiration
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const expired = cachedResponse ? await isCacheExpired(cache, request, CACHE_CONFIG.maxAge.api) : true;

        // Fetch from network
        const fetchPromise = fetch(request)
          .then(async (response) => {
            if (response.ok) {
              const responseToCache = addCacheTimestamp(response.clone());
              await cache.put(request, responseToCache);
              await limitCacheSize(API_CACHE_NAME, CACHE_CONFIG.maxEntries.api);
            }
            return response;
          })
          .catch(() => null);

        // Return cached if available and not expired, otherwise wait for network
        if (cachedResponse && !expired) {
          // Return cache immediately, update in background
          fetchPromise.catch(() => {}); // Fire and forget
          return cachedResponse;
        }

        // Wait for network, fallback to expired cache
        const networkResponse = await fetchPromise;
        if (networkResponse) {
          return networkResponse;
        }

        // Network failed, return stale cache if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // No cache, return offline response
        return new Response(
          JSON.stringify({ error: 'Offline', offline: true }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Static assets - Cache ONLY hashed files (cache-busted assets)
  // Do NOT cache HTML or non-hashed files
  const isHashedAsset = /\/assets\/[^/]+-[a-f0-9]+\.(js|css|png|jpg|svg|woff2?)$/i.test(url.pathname);
  
  if (isHashedAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        // Update cache in background if stale
        if (cachedResponse) {
          const expired = await isCacheExpired(cache, request, CACHE_CONFIG.maxAge.static);
          if (expired) {
            fetch(request).then((response) => {
              if (response.ok) {
                const responseToCache = addCacheTimestamp(response.clone());
                cache.put(request, responseToCache);
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }

        // Not in cache, fetch from network
        try {
          const response = await fetch(request);
          if (response.ok && request.method === 'GET') {
            const responseToCache = addCacheTimestamp(response.clone());
            await cache.put(request, responseToCache);
          }
          return response;
        } catch (error) {
          return new Response('Offline', { status: 503 });
        }
      })
    );
    return;
  }

  // Runtime cache - For images and other dynamic assets
  event.respondWith(
    caches.open(RUNTIME_CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        const expired = await isCacheExpired(cache, request, CACHE_CONFIG.maxAge.runtime);
        if (!expired) {
          return cachedResponse;
        }
      }

      try {
        const response = await fetch(request);
        if (response.ok && request.method === 'GET') {
          const responseToCache = addCacheTimestamp(response.clone());
          await cache.put(request, responseToCache);
          await limitCacheSize(RUNTIME_CACHE_NAME, CACHE_CONFIG.maxEntries.runtime);
        }
        return response;
      } catch (error) {
        return cachedResponse || new Response('Offline', { status: 503 });
      }
    })
  );
});

// Background sync for offline actions with retry logic
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(
      // Send message to all clients to process pending actions
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        .then(clients => {
          if (clients.length === 0) {
            console.log('[SW] No clients found for sync message');
            return;
          }
          
          console.log(`[SW] Notifying ${clients.length} clients to sync`);
          const promises = clients.map(client => {
            return new Promise((resolve) => {
              client.postMessage({
                type: 'BACKGROUND_SYNC',
                tag: event.tag,
                timestamp: Date.now()
              });
              resolve();
            });
          });
          
          return Promise.all(promises);
        })
        .catch(error => {
          console.error('[SW] Background sync failed:', error);
          throw error;
        })
    );
  }
});

// Push notification support (Phase 2)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TrueSpend', options)
  );
});

// Listen for skip waiting message from update prompt
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message, activating new service worker');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded');
