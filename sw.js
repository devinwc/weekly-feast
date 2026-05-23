// sw.js — Weekly Feast service worker
// Bumped to v3 to force a fresh cache install and pick up all recent changes.

const CACHE_NAME = 'weekly-feast-v3';

const PRECACHE_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── Install: cache the app shell ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_FILES))
      .then(() => self.skipWaiting())
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
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Never intercept Supabase API calls — always go to network
  if (url.hostname.includes('supabase.co')) return;

  // Never cache non-http(s) schemes (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // App shell files (same origin): network first so updates deploy immediately,
  // fall back to cache for offline support.
  if (url.origin === self.location.origin) {
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
    return;
  }

  // External requests (Google Fonts, CDN, etc.): network first, cache as fallback
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
