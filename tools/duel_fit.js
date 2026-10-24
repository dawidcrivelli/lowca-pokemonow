#!/usr/bin/env node
/* Walka kartami na telefonie: czy stół i przyciski mieszczą się bez przewijania.
   użycie: node tools/duel_fit.js [szer wys plik.png najgorszy]   (domyślnie 393×740 — Xiaomi 14T w Chrome; 4. argument: 3 rzędy przycisków i długi dziennik)
   Playwright z globalnych modułów (NODE_PATH), Chromium: CHROME=/ścieżka albo domyślny Playwrighta. */
const path = require('path');
const { chromium } = require('playwright');
const [W, H, shot] = [+process.argv[2] || 393, +process.argv[3] || 740, process.argv[4] || path.join(__dirname, '..', 'tmp', 'duel_fit.png')];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const p = await b.newPage({ ignoreHTTPSErrors: true, viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // karty i obrazki z sieci → zastępcze w prawdziwych proporcjach (karta 245×342, grafika 475×475)
  await p.route(/images\.pokemontcg\.io|scrydex|githubusercontent.*\.png/, r => { const card = !/githubusercontent/.test(r.request().url()); const [w, h] = card ? [245, 342] : [96, 96];
    r.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" rx="10" fill="${card ? '#F4D35E' : '#9AD'}"/></svg>` }); });
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.evaluate(() => localStorage.setItem('pokeTracker.v1', JSON.stringify({ caught: Object.fromEntries([25, 26, 4, 5, 6, 7, 8, 133, 150].map(i => [i, { t: 1 }])), settings: { sound: false } })));
  await p.reload(); await p.waitForTimeout(800);
  await p.click('.tile[data-id="25"]'); await p.waitForTimeout(300); await p.click('[data-duel]'); await p.waitForTimeout(300);
  for (const id of [4, 7]) await p.click(`[data-dpick="${id}"]`);
  await p.click('[data-dstart]');
  await p.waitForTimeout(2500);   // obrazki kart (tu się nie ładują — wysokość z aspect-ratio)
  if (process.argv[5]) await p.evaluate(() => { const a = document.querySelector(".d-acts"); const b = a.querySelector(".btn"); for (const t of ["🧬 Charmeleon", "Ognisty Oddech 30 🔥🔥"]) { const c = b.cloneNode(true); c.textContent = t; a.prepend(c); } const l = document.querySelector(".d-log"); l.innerHTML = "<div>Qwilfish: Jadowity Wstrząs (🪙 2× orzeł) — 60 obrażeń. Pikachu pokonany! +1 🎴 Wchodzi Charmander.</div><div>☠️ Charmander traci 10 (trucizna). 🔥 Charmander traci 20 (oparzenie).</div>"; });
  const m = await p.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
    const card = document.querySelector('.modal-card');
    return { card: r('.modal-card'), scroll: card.scrollHeight, client: card.clientHeight, cpu: r('.dz.cpu'), log: r('.d-log'), me: r('.dz.me'), acts: r('.d-acts'), lastBtn: r('.d-acts .btn:last-child'), win: innerHeight };
  });
  console.log(W + 'x' + H, JSON.stringify(m), m.lastBtn && m.lastBtn[1] <= m.win && m.scroll <= m.client + 1 ? 'MIEŚCI SIĘ' : 'TRZEBA PRZEWIJAĆ');
  await p.screenshot({ path: shot });
  console.log('errors', errs); await b.close();
})();
