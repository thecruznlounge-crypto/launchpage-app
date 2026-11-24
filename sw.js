/* LaunchPage.link service worker — offline-first app shell */
const VERSION = 'launchpage-v2.1.0';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css',
  './js/config.js', './js/icons.js', './js/data.js', './js/zip.js', './js/store.js', './js/app.js', './js/studio.js', './js/hunnyhive.js',
  './img/icon-192.png', './img/icon-512.png', './img/icon-maskable-512.png', './img/apple-touch-icon.png', './img/favicon-32.png', './img/launches/merkuri.jpg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase/CDN go straight to network
  if (req.mode === 'navigate') {
    // network-first for pages so deploys show up, cached shell when offline
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // stale-while-revalidate for static assets
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }).catch(() => cached);
    return cached || net;
  }));
});
