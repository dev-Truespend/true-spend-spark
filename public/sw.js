/**
 * Smart Service Worker - Production Ready
 * Strategy: Network-First for HTML/API, Cache-First with background updates for assets
 * Version: __BUILD_TIMESTAMP__ (replaced at build time)
 */

const CACHE_VERSION = '__BUILD_TIMESTAMP__';
const CACHE_NAMES = {
  static: `truespend-static-${CACHE_VERSION}`,
  api: `truespend-api-${CACHE_VERSION}`,
  runtime: `truespend-runtime-${CACHE_VERSION}`,
};

// Resources to precache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

let currentBuildId = null;

console.log(`[SW ${CACHE_VERSION}] Smart caching service worker loaded`);

// ============= INSTALL =============
self.addEventListener('install', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Installing...`);
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log(`[SW ${CACHE_VERSION}] Precaching resources`);
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// ============= ACTIVATE =============
self.addEventListener('activate', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Activating...`);
  
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log(`[SW ${CACHE_VERSION}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );

      // Take control of all clients immediately
      await self.clients.claim();
      console.log(`[SW ${CACHE_VERSION}] Activated and claimed clients`);

      // Fetch initial buildId
      try {
        const response = await fetch('/meta.json', { cache: 'no-store' });
        const data = await response.json();
        currentBuildId = data.buildId;
        console.log(`[SW ${CACHE_VERSION}] Current buildId: ${currentBuildId}`);
      } catch (error) {
        console.error(`[SW ${CACHE_VERSION}] Failed to fetch initial buildId:`, error);
      }
    })()
  );
});

// ============= FETCH =============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Check for updates on HTML requests
  if (isHTMLRequest(request)) {
    checkForAppUpdate();
  }

  // Route to appropriate caching strategy
  if (isHTMLRequest(request)) {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.runtime));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.api));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirstWithBackgroundUpdate(request, CACHE_NAMES.static));
  } else if (isImageOrFont(url)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.runtime));
  } else {
    event.respondWith(networkFirstStrategy(request, CACHE_NAMES.runtime));
  }
});

// ============= MESSAGE HANDLER =============
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    console.log(`[SW ${CACHE_VERSION}] Received SKIP_WAITING message`);
    self.skipWaiting();
  }
});

// ============= CACHING STRATEGIES =============

/**
 * Network-First: Try network, fall back to cache if offline
 * Used for: HTML, API calls
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW ${CACHE_VERSION}] Network failed, trying cache for:`, request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, return offline page or error
    if (isHTMLRequest(request)) {
      return new Response(
        '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
}

/**
 * Cache-First with Background Update: Serve from cache, update in background
 * Used for: Static assets (JS, CSS)
 */
async function cacheFirstWithBackgroundUpdate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  // Fetch and update cache in background (don't await)
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      caches.open(cacheName).then(cache => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  }).catch(() => {
    // Silently fail background updates
  });
  
  // Return cached version immediately, or wait for network if no cache
  return cachedResponse || fetchPromise;
}

/**
 * Stale-While-Revalidate: Serve cached version, fetch fresh in background
 * Used for: Images, fonts
 */
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      caches.open(cacheName).then(cache => {
        cache.put(request, networkResponse.clone());
      });
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// ============= HELPER FUNCTIONS =============

function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || 
         url.pathname.includes('/functions/') ||
         url.hostname.includes('supabase.co');
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/assets/') || 
         url.pathname.match(/\.(js|css)$/);
}

function isImageOrFont(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf)$/);
}

/**
 * Check if app has been updated (new buildId)
 */
async function checkForAppUpdate() {
  try {
    const response = await fetch('/meta.json', { cache: 'no-store' });
    const data = await response.json();
    
    if (!currentBuildId) {
      currentBuildId = data.buildId;
      return;
    }
    
    if (data.buildId !== currentBuildId) {
      console.log(`[SW ${CACHE_VERSION}] 🎉 New version detected: ${data.buildId}`);
      
      // Notify all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'UPDATE_AVAILABLE',
          buildId: data.buildId,
          oldBuildId: currentBuildId
        });
      });
      
      // Update current buildId
      currentBuildId = data.buildId;
    }
  } catch (error) {
    console.error(`[SW ${CACHE_VERSION}] Failed to check for updates:`, error);
  }
}

console.log(`[SW ${CACHE_VERSION}] Smart caching service worker ready`);
