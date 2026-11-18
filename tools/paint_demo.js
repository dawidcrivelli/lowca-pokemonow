#!/usr/bin/env node
/* Demo kolorowanki do obejrzenia bez aplikacji: jedna strona z wbudowanymi obrazkami (data:), js/paint.js i css/paint.css.
   użycie: NODE_USE_ENV_PROXY=1 node tools/paint_demo.js [id…] → tmp/paint_demo.html */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const { SPECIES, ART_URL } = require('../js/species.js');
const ids = process.argv.slice(2).map(Number).filter(Boolean);
const IDS = ids.length ? ids : [25, 26, 1, 4, 7, 133, 6, 94, 39, 143, 448, 150];
(async () => {
  const pics = [];
  for (const id of IDS) {
    const f = path.join(root, 'tmp', 'paint', id + '.png');
    if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from(await (await fetch(ART_URL(id))).arrayBuffer()));
    pics.push({ id, name: SPECIES.find(s => s.id === id)?.name || '#' + id, src: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') });
  }
  const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Kolorowanka Pokémon — demo</title><style>
body{margin:0;font-family:system-ui,sans-serif;background:#F6EFE0;color:#1F2A44}
main{max-width:560px;margin:0 auto;padding:10px 12px 30px}
h1{font-size:20px;margin:4px 0 8px}
.pick{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px}
.pick button{flex:none;width:64px;height:64px;border-radius:14px;border:3px solid #D6CDB8;background:#fff;padding:2px}
.pick button.on{border-color:#1F2A44;background:#FFE58A}.pick img{width:100%;height:100%;object-fit:contain}
.help{font-size:13px;line-height:1.45;color:#5B6478;margin-top:12px}
${fs.readFileSync(path.join(root, 'css', 'paint.css'), 'utf8')}</style></head><body><main>
<h1>🎨 Kolorowanka — demo</h1>
<div class="pick">${pics.map((p, i) => `<button data-i="${i}" class="${i ? '' : 'on'}" title="${p.name}"><img src="${p.src}" alt="${p.name}"></button>`).join('')}</div>
<div id="host"></div>
<p class="help">🪣 dotknij pole — wypełni się kolorem · 🖌️ maluj palcem, 🔒 = nie wychodzi z pola, w którym zaczął (🔓 swobodnie) · ⬤ grubość ·
🪄 magia: prawdziwe kolory (dotknij pole albo maluj) · ↶ cofnij · 👁 przytrzymaj: oryginał · 🗑️ od nowa.</p>
</main><script>
const PICS = ${JSON.stringify(pics.map(p => p.src))};
let ctx = null; const AC = window.AudioContext && new AudioContext();
const beep = (f, v) => { try { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; g.gain.setValueAtTime(v * .5, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .12); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + .13); } catch (e) {} };
${fs.readFileSync(path.join(root, 'js', 'paint.js'), 'utf8')}
const show = i => { ctx = Paint.open(document.getElementById('host'), PICS[i], { onSound: beep }); };
document.querySelector('.pick').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
  document.querySelectorAll('.pick button').forEach(x => x.classList.toggle('on', x === b)); show(+b.dataset.i); });
show(0);
</script></body></html>`;
  const out = path.join(root, 'tmp', 'paint_demo.html');
  fs.writeFileSync(out, html); console.log(out, Math.round(html.length / 1024) + ' kB');
})();
