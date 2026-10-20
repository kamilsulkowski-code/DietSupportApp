/* Generated as dist/sw.js by scripts/build_pwa.mjs. Do not rename the deployed worker. */
const BUILD = '236e59d94a3c556710c9';
const BASE = new URL('./', self.registration.scope);
const PREFIX = 'forma-pwa:' + BASE.href + ':';
const CACHE = PREFIX + BUILD;
const FILES = [
  'index.html', 'pwa.js', 'pwa.css', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const SHELL = new URL('index.html', BASE).href;
const STATIC = new Set(FILES.filter(path => path !== 'index.html').map(path => new URL(path, BASE).href));

function safeResponse(response, html = false) {
  return response.status === 200 && response.type !== 'opaque' && !response.redirected &&
    (!html || (response.headers.get('content-type') || '').includes('text/html'));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Only fetch public, canonical URLs. Never cache requests carrying auth/link parameters.
    const entries = await Promise.all(FILES.map(async path => {
      const url = new URL(path, BASE).href;
      const response = await fetch(url, {cache: 'no-store', credentials: 'omit'});
      if (!safeResponse(response, path === 'index.html')) throw new Error('Incomplete PWA shell: ' + path);
      // Drain each body immediately so parallel precaching cannot hold HTTP connections open.
      const bytes = await response.arrayBuffer();
      return [url, new Response(bytes, {status: response.status, statusText: response.statusText, headers: response.headers})];
    }));
    const cache = await caches.open(CACHE);
    await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
    // Updates wait until the user explicitly chooses to activate them.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

async function networkFirst(request, key, html, mayCache) {
  try {
    const response = await fetch(request, {cache: 'no-store'});
    if (mayCache && safeResponse(response, html)) {
      try { const cache = await caches.open(CACHE); await cache.put(key, response.clone()); }
      catch { /* A full/disabled cache must not break a successful online request. */ }
    }
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('authorization')) return;
  const url = new URL(request.url);
  if (url.origin !== BASE.origin) return;
  // Do not intercept Supabase, CDN scripts, arbitrary paths, config, version.json or the worker itself.
  if (request.mode === 'navigate' && (url.pathname === BASE.pathname || url.pathname === new URL(SHELL).pathname)) {
    event.respondWith(networkFirst(request, SHELL, true, !url.search));
  } else if (!url.search && STATIC.has(url.href)) {
    event.respondWith(networkFirst(request, url.href, false, true));
  }
});
