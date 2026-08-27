/* Mardy · 2026 Training — service worker
 *
 * Purpose: make the app launch with no network. Before this, the manifest made
 * it installable but nothing was cached, so every launch was a live fetch of
 * index.html + the Supabase CDN client + Google Fonts. Offline meant a blank
 * page, which defeated the app's entire offline-first data layer.
 *
 * Strategy, deliberately different per asset class:
 *
 *   index.html    network-first, cache fallback.  You redeploy this file often,
 *                 so cache-first would pin you to a stale build. Network-first
 *                 means you always get the newest version when online, and the
 *                 last good copy when not.
 *
 *   everything    cache-first, revalidate in background.  The CDN client,
 *   else         fonts and icons are versioned or immutable; serving them from
 *                 cache is both faster and the thing that makes offline work.
 *
 * Bump CACHE_VERSION on any change here to evict the old cache.
 */
const CACHE_VERSION = 'v1.9';
const CACHE = `training-${CACHE_VERSION}`;

// Fetched on install. Anything that fails is skipped rather than aborting the
// whole install — a missing icon must not stop the shell being cached.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Playfair+Display:wght@400;500;600;700&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        // no-cors so the cross-origin CDN and font requests can be stored as
        // opaque responses; they are still replayable offline.
        const req = new Request(url, url.startsWith('http') ? { mode: 'no-cors' } : {});
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) await cache.put(req, res.clone());
      } catch (e) {
        console.warn('[sw] precache skipped:', url, e && e.message);
      }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('training-') && k !== CACHE)
                          .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isShell = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                      // never cache writes

  const url = new URL(req.url);

  // Supabase API traffic must never be cached — stale training data is worse
  // than no training data, and the app already has its own offline queue.
  if (url.hostname.endsWith('.supabase.co')) return;

  if (isShell(url)) {
    // network-first so a redeploy is picked up immediately
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(req) || await caches.match('./index.html');
        if (cached) return cached;
        return new Response(
          '<h1>Offline</h1><p>No cached copy yet. Open the app once with a connection.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // everything else: cache-first, refresh in the background
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(req, req.url.startsWith(self.location.origin) ? {} : { mode: 'no-cors' });
          if (fresh && (fresh.ok || fresh.type === 'opaque')) {
            const cache = await caches.open(CACHE);
            await cache.put(req, fresh.clone());
          }
        } catch {}
      })());
      return cached;
    }
    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      return new Response('', { status: 504, statusText: 'offline' });
    }
  })());
});
