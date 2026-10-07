// DawaPOS Service Worker - offline app shell + smart caching
const CACHE = 'dawapos-v3';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app1.js',
  'app2.js',
  'app3.js',
  'pwa.js',
  'manifest.json',
  'icon.svg',
  'logo.svg',
  'cross.svg'
];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Supabase API / realtime: always network. The app already handles
  // offline gracefully via localStorage + queued sync.
  if (url.hostname.endsWith('supabase.co')) return;

  // Page navigations: network-first, fall back to cached app shell offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Same-origin files and CDN libraries: cache-first, then network (and cache the result)
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok && (url.origin === self.location.origin || CDN_HOSTS.includes(url.hostname))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
