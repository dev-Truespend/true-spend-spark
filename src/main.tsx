import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA Service Worker - register only in production, clean up in dev
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
          
          // Force check for updates every 10 seconds (aggressive)
          setInterval(() => {
            registration.update();
            console.log('[PWA] 🔍 Checking for updates...');
          }, 10000);

          // Listen for SW activation messages (force reload)
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SW_ACTIVATED' && 
                event.data.action === 'RELOAD_REQUIRED') {
              console.log('[PWA] 🔄 New version activated, reloading in 1 second...');
              setTimeout(() => window.location.reload(), 1000);
            }
          });

          // Detect when a new service worker is waiting
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is ready, dispatch event
                  console.log('[PWA] 📦 New version available');
                  window.dispatchEvent(new CustomEvent('swUpdateAvailable', { detail: registration }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  } else {
    // In development, ensure no stale SW or caches interfere with Vite modules
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    console.log('[PWA] Dev mode: unregistered service workers and cleared caches');
  }
}

createRoot(document.getElementById("root")!).render(<App />);
