// sw.js — Weekly Feast service worker
// Caches the app shell so it loads offline and installs as a PWA.
// Bump CACHE_NAME whenever you upload new versions of the files
// so users get the update on next visit.

const CACHE_NAME = 'weekly-feast-v1';

// Files to cache on install. Paths are relative to the repo root.
// If you rename index.html or add new pages, add them here.
const PRECACHE_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── Install: cache the app shell ─────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_FILES))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ── Activate: delete old caches ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // take control immediately
  );
});

// ── Fetch: serve from cache, fall back to network ─────────────────
// Strategy: Cache First for app shell files, Network First for
// everything else (Google Fonts, etc.) so you always get the
// latest when online but still work offline.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For same-origin requests (our app files): cache first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        // Not in cache yet — fetch and cache it
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For external requests (Google Fonts, etc.): network first, cache as fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
