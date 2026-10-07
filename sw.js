// オフラインでも開けるようにするための Service Worker（アプリ本体はネットワーク優先）
const CACHE = 'michi-v1.0.0';
const SHELL = [
  './', 'index.html', 'style.css', 'manifest.json',
  'js/app.js', 'js/util.js', 'js/store.js', 'js/rules.js', 'js/game.js', 'js/sprites.js', 'js/ui.js', 'js/version.js',
  'js/screens/home.js', 'js/screens/gate.js', 'js/screens/back.js', 'js/screens/focus.js', 'js/screens/morning.js',
  'js/screens/forge.js', 'js/screens/record.js', 'js/screens/review.js', 'js/screens/onboard.js', 'js/screens/guide.js',
  'js/screens/about.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
