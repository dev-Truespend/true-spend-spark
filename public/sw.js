/**
 * Self-Destruct Service Worker
 * This SW unregisters itself and clears all caches on activation.
 * It ensures clean removal of offline functionality.
 */

const SW_VERSION = 'self-destruct-v1';

console.log(`[SW ${SW_VERSION}] Self-destruct service worker loaded`);

// Install immediately
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing self-destruct worker`);
  self.skipWaiting();
});

// Activate and clean up everything
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating - cleaning up and unregistering`);
  
  event.waitUntil(
    (async () => {
      try {
        // Delete all caches
        const cacheNames = await caches.keys();
        console.log(`[SW ${SW_VERSION}] Deleting ${cacheNames.length} caches`);
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`[SW ${SW_VERSION}] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );

        // Take control of all clients
        await self.clients.claim();
        console.log(`[SW ${SW_VERSION}] Claimed all clients`);

        // Get all clients and reload them
        const clients = await self.clients.matchAll({ type: 'window' });
        console.log(`[SW ${SW_VERSION}] Found ${clients.length} clients to reload`);
        
        for (const client of clients) {
          client.navigate(client.url);
        }

        // Unregister this service worker
        const registration = await self.registration;
        const unregistered = await registration.unregister();
        console.log(`[SW ${SW_VERSION}] Unregistered: ${unregistered}`);

      } catch (error) {
        console.error(`[SW ${SW_VERSION}] Cleanup error:`, error);
      }
    })()
  );
});

// Pass all fetch requests through to network (no caching)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

console.log(`[SW ${SW_VERSION}] Self-destruct service worker ready`);

console.log('[SW] Service Worker loaded');
