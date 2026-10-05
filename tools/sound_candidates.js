#!/usr/bin/env node
/* Kandydaci na odgłosy walki do tools/sounds.html: po 3 z Freesound (tylko CC0, licencja sprawdzana na stronie nagrania)
   + paczki CC0 Kenney / OpenGameArt (rozpakowane w tmp/snd/) + obecne dźwięki gry do porównania.
   użycie: node tools/sound_candidates.js → tmp/snd/candidates.js */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'tmp', 'snd'), FS = 'https://freesound.org', PER_SLOT = 3, MAX_S = 3;
const CC0 = 'creativecommons.org/publicdomain/zero';
// moment walki → [zapytania Freesound (po kolei, aż będzie PER_SLOT), pliki z paczek (względem tmp/snd/)]
const SLOTS = {
  hit: [['punch', 'hit impact'], ['impact-sounds/Audio/impactPunch_medium_000.ogg', 'impact-sounds/Audio/impactSoft_heavy_000.ogg']],
  hit_big: [['heavy punch', 'big impact'], ['impact-sounds/Audio/impactPunch_heavy_000.ogg']],
  miss: [['whoosh'], []],
  ko: [['body fall', 'thud'], ['impact-sounds/Audio/impactSoft_heavy_002.ogg']],
  fire: [['fireball', 'fire whoosh', 'flame'], ['rpg/spell_fire_01.ogg', 'rpg/spell_fire_03.ogg']],
  water: [['water splash', 'splash'], []],
  electric: [['electric zap', 'zap', 'electricity'], ['sci-fi-sounds/Audio/forceField_000.ogg']],
  grass: [['leaves', 'rustle', 'vine whip'], []],
  ice: [['ice', 'freeze', 'ice crack'], ['impact-sounds/Audio/impactGlass_light_000.ogg']],
  psychic: [['magic spell', 'spell'], ['rpg/spell_01.ogg', 'rpg/spell_02.ogg']],
  ghost: [['ghost', 'spooky'], []],
  rock: [['rock impact', 'rocks', 'rumble'], ['rpg/stones_01.ogg', 'impact-sounds/Audio/impactMining_000.ogg']],
  poison: [['acid', 'bubbles', 'poison'], ['rpg/creature_slime_01.ogg']],
  dragon: [['dragon roar', 'roar'], ['rpg/creature_roar_01.ogg', 'rpg/creature_roar_02.ogg']],
  fairy: [['sparkle', 'chime', 'twinkle'], []],
  flying: [['wind gust', 'wing flap', 'wind'], []],
  steel: [['metal clang', 'sword clash'], ['impact-sounds/Audio/impactMetal_heavy_000.ogg']],
  dark: [['dark magic', 'evil'], []],
  bug: [['insect buzz', 'buzz'], []],
  heal: [['heal', 'healing', 'restore'], []],
  stat_up: [['power up', 'powerup', 'level up'], []],
  stat_down: [['power down', 'powerdown', 'debuff'], []],
  charge: [['charge up', 'charging', 'energy charge'], []],
  transform: [['transformation', 'magic transform', 'crystal'], ['impact-sounds/Audio/impactBell_heavy_000.ogg']],
};
const NOW = { hit: ['hit_0', 'hit_1', 'hit_2'], miss: ['whoosh_0', 'whoosh_1', 'whoosh_2'], water: ['splash_0', 'splash_1'] };   // obecne: sounds/*.mp3

const get = u => fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.text());
async function freesound(qs) {
  const f = encodeURIComponent(`license:"Creative Commons 0" duration:[0 TO ${MAX_S}]`), ids = [], out = [];
  for (const q of qs) ids.push(...[...(await get(`${FS}/search/?q=${encodeURIComponent(q)}&f=${f}&s=Rating+highest+first`)).matchAll(/previews\/\d+\/(\d+)_\d+-lq\.mp3/g)].map(m => m[1]));
  for (const id of new Set(ids)) {
    if (out.length >= PER_SLOT) break;
    const page = await get(`${FS}/s/${id}/`);
    if (!page.includes(CC0)) continue;   // filtr wyszukiwarki to za mało: sprawdzamy licencję nagrania
    const mp3 = page.match(/https:\/\/cdn\.freesound\.org\/previews\/\d+\/\d+_\d+-hq\.mp3/)?.[0], who = page.match(/\/people\/([^/]+)\/sounds\//)?.[1];
    const name = page.match(/<title>Freesound - (.+?) by [^<]+<\/title>/)?.[1] || id;
    if (mp3) out.push({ src: mp3, name, by: who, url: `${FS}/s/${id}/` });
  }
  return out;
}
(async () => {
  const C = {};
  for (const [slot, [qs, local]] of Object.entries(SLOTS)) {
    C[slot] = [...(NOW[slot] || []).map(n => ({ src: `../sounds/${n}.mp3`, name: `obecny ${n}`, by: 'gra' })),
      ...local.filter(f => fs.existsSync(path.join(DIR, f))).map(f => ({ src: `../tmp/snd/${f}`, name: path.basename(f), by: f.startsWith('rpg/') ? 'rubberduck (OGA)' : 'Kenney' })),
      ...await freesound(qs)];
    console.log(slot, C[slot].length);
  }
  fs.writeFileSync(path.join(DIR, 'candidates.js'), `window.CANDS = ${JSON.stringify(C, null, 1)};\n`);
})();
