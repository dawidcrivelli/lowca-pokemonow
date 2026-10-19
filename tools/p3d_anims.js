#!/usr/bin/env node
/* Które modele z Pokemon-3D-api mają animacje z gry, których użyje arena (js/arena3d.js: klipy pasujące do kości modelu).
   Czyta tylko nagłówek JSON każdego .glb (zapytania Range), wynik w tmp/p3d_anims.json.  użycie: node tools/p3d_anims.js */
const fs = require('fs'), path = require('path');
const { SPECIES } = require('../js/species.js');
const P3D = '429de1288cea0d43f5b4f56305d2276e94239d65', URL = id => `https://raw.githubusercontent.com/Pokemon-3D-api/assets/${P3D}/models/opt/regular/${id}.glb`;
const OUT = path.join(__dirname, '../tmp/p3d_anims.json'), OWN_TRACKS = .9;   // jak w arena3d.js
const KEYS = { wait: /battlewait01_loop$|defaultwait01_loop$|waitA01|aidle$/, lunge: /_attack01$|buturi01|fight_b$/, cast: /rangeattack01$|_attack02$|tokusyu01|fight_d$/, hit: /damage01$/, ko: /down01_start$|\dko$/ };
const get = async (id, a, b) => { const r = await fetch(URL(id), { headers: { Range: `bytes=${a}-${b}` } }); return r.status === 206 || r.ok ? Buffer.from(await r.arrayBuffer()) : null; };
async function info(id) {
  const h = await get(id, 0, 19); if (!h || h.toString('ascii', 0, 4) !== 'glTF') return null;
  const j = JSON.parse((await get(id, 20, 19 + h.readUInt32LE(12))).toString());
  // nazwy kości jak w three.js (bez spacji i kropek), ścieżki klipu: kanały → węzły
  const san = n => (n || '').replace(/\s/g, '_').replace(/[\[\]\.:\/]/g, ''), names = new Set(j.nodes.map(n => san(n.name)));
  const own = (j.animations || []).filter(a => a.channels.filter(c => names.has(san(j.nodes[c.target.node]?.name))).length >= OWN_TRACKS * a.channels.length && a.channels.length);
  return { clips: (j.animations || []).length, names: (j.animations || []).slice(0, 4).map(a => a.name), own: Object.keys(KEYS).filter(k => own.some(a => KEYS[k].test(a.name)) || k === 'wait' && own.length === 1) };
}
(async () => {
  const res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : {};
  for (let i = 0; i < SPECIES.length; i += 16) await Promise.all(SPECIES.slice(i, i + 16).filter(s => !(s.id in res)).map(async s => { res[s.id] = await info(s.id).catch(() => null); }));
  fs.writeFileSync(OUT, JSON.stringify(res));
  const by = f => SPECIES.filter(s => f(res[s.id])), name = s => s.name;
  console.log(`modeli: ${by(r => r).length}/${SPECIES.length}, bez modelu: ${by(r => !r).map(name).join(', ')}`);
  console.log(`pełne ruchy (czekanie + atak + cios): ${by(r => r && ['wait', 'lunge', 'hit'].every(k => r.own.includes(k))).map(name).join(', ')}`);
  console.log(`tylko część: ${by(r => r && r.own.length && !['wait', 'lunge', 'hit'].every(k => r.own.includes(k))).map(s => `${s.name} (${res[s.id].own})`).join(', ')}`);
  console.log(`klipy bez nazw z gry: ${by(r => r && r.clips && !r.own.length).map(s => `${s.name} [${res[s.id].names.join(' | ')}]`).join(', ')}`);
})();
