// ══════════════════════════════════════════
// Service worker — keep what blocky needs on the device
//
// Models, engines and libraries (everything under assets/) are large and do not change:
// they are downloaded once, kept, and served from the device from then on.
// The app's own pages and code are asked from the network first, so a new version shows
// at once, and come from the kept copy when there is no network.
//
// A file under assets/ that changes must change its name, or ASSETS must be renamed below:
// a kept file is never asked for again.
// ══════════════════════════════════════════

const ASSETS = 'blocky-assets-v1';
const APP = 'blocky-app-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== ASSETS && n !== APP).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // the radio stream and anything else from outside
  if (req.headers.has('range')) return;

  if (url.pathname.includes('/assets/')) e.respondWith(keptFirst(req));
  else e.respondWith(networkFirst(req));
});

async function keptFirst(req) {
  const cache = await caches.open(ASSETS);
  const kept = await cache.match(req.url);
  if (kept) return kept;
  const res = await fetch(req);
  if (res.ok) cache.put(req.url, res.clone()).catch(() => {});   // a full disk must not break the page
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(APP);
  try {
    // 'no-cache': ask the server each time whether the file changed. The host lets browsers keep
    // a file for ten minutes, each on its own clock: old and new code could run together.
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const kept = await cache.match(req, { ignoreSearch: true });
    if (kept) return kept;
    throw err;
  }
}
