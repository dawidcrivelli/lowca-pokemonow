/* Offline: pliki aplikacji z pamięci podręcznej, w tle odświeżane z sieci (stale-while-revalidate).
   Obrazki i głosy z PokeAPI trafiają do pamięci przy pierwszym obejrzeniu. Zmień VERSION przy wydaniu, żeby wyczyścić stare pliki. */
importScripts('js/voices.js');   // SOUNDS: lista nagrań do pamięci offline
const VERSION = 'poke-v10';
const CORE = ['./', 'index.html', 'css/app.css', 'js/species.js', 'js/battle.js', 'js/cards.js', 'js/voices.js', 'js/arena3d.js', 'vendor/three.min.js', 'js/app.js', 'manifest.json', 'icon.svg',
  ...Object.entries(SOUNDS).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => `${SOUND_DIR}${k}_${i}.mp3`))];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
