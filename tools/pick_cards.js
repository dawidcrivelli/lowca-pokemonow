/* karta dla Pokémonów spoza 1. generacji: najwcześniejszy zestaw z SERIES (w tej kolejności), zwykła rzadkość, bez ex, jeśli się da.
   użycie: require('./pick_cards.js')(id, nazwa) → karta z pokemon-tcg-data (z polem set) */
const fs = require('fs'), path = require('path'), DIR = path.join(__dirname, '..', 'tmp', 'pokeapi');
const load = f => JSON.parse(fs.readFileSync(path.join(DIR, f + '.json')));
const SERIES = ['Scarlet & Violet', 'Mega Evolution', 'Sword & Shield', 'Sun & Moon'];   // Hatenna, Rayquaza, Kleavor nie mają kart SV; Pichu, Happiny, Giratina, Arceus – zwykłe dopiero w SM
const PLAIN = ['Common', 'Uncommon', 'Rare'];
const rank = s => SERIES.indexOf(s.series) * 2 + (s.id.endsWith('p'));   // promki (svp, swshp) na koniec serii
let all;   // leniwie: fetch.js wczytuje SERIES, zanim pobierze karty
const cards = () => all ||= load('tcg_sets').filter(s => SERIES.includes(s.series)).sort((a, b) => rank(a) - rank(b) || a.releaseDate.localeCompare(b.releaseDate))
  .flatMap(s => load('tcg_' + s.id).map(c => ({ ...c, set: s.id, old: s.series === 'Sun & Moon' })));
// gdy nie ma zwykłej karty: „Galarian …” (Perrserker, Runerigus), „Ethan's …” (Pichu), „… V” (Arceus) – w tej kolejności
const alt = (c, name) => c.name === 'Galarian ' + name ? 4 : c.name.endsWith("'s " + name) ? 6 : c.name === name + ' V' ? 8 : c.name === name ? 0 : -1;
const score = c => (c.subtypes.includes('ex') || c.subtypes.includes('V') ? 2 : 0) + (PLAIN.includes(c.rarity) ? 0 : 1) + c.alt + (c.old ? 20 : 0);   // Sun & Moon tylko w ostateczności
/* karty specjalne do obejrzenia w oknie Pokémona: Mega (XY „M …-EX”, Mega Evolution „Mega … ex”) i V / VMAX / VSTAR;
   po jednej na nazwę (i typ: M Charizard-EX X i Y nazywają się tak samo), zwykła grafika zamiast ilustracji i tęczowych, od najstarszej */
const VAR_SERIES = ['XY', 'Sword & Shield', 'Mega Evolution'], VAR = ['MEGA', 'V', 'VMAX', 'VSTAR'];
const FANCY = /Ultra|Secret|Rainbow|Illustration|Hyper|Gallery|Shiny|Promo|Classic/;
let vall;
const variants = id => {
  const best = new Map();
  for (const c of vall ||= load('tcg_sets').filter(s => VAR_SERIES.includes(s.series)).sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .flatMap(s => load('tcg_' + s.id).filter(c => c.supertype === 'Pokémon' && c.subtypes?.some(t => VAR.includes(t)))))
    if (c.nationalPokedexNumbers?.includes(id)) {
      const k = c.name + c.types?.[0], b = best.get(k);
      if (!b || FANCY.test(b.rarity) && !FANCY.test(c.rarity)) best.set(k, c);
    }
  return [...best.values()].map(c => c.images.small);
};
module.exports = Object.assign((id, name) => cards().map(c => ({ ...c, alt: alt(c, name) })).filter(c => c.supertype === 'Pokémon' && c.nationalPokedexNumbers?.includes(id) && c.alt >= 0)
  .reduce((best, c) => !best || score(c) < score(best) ? c : best, null), { SERIES, VAR_SERIES, variants });
if (require.main === module) {
  const HZ = require('./horizons.json'), FAM = require('./famous.json'), MOV = require('./movies.json');
  for (const id of [...HZ.hz, ...HZ.s2, ...HZ.family, ...FAM.fam, ...FAM.family, ...MOV.m12, ...MOV.family].filter(i => i > 151)) {
    const sp = load('pokemon-species_' + id), name = sp.names.find(n => n.language.name === 'en').name, c = module.exports(id, name);
    console.log(id, name, c ? `${c.set}/${c.number} ${c.rarity} ${c.subtypes} hp${c.hp} ${c.evolvesFrom || ''}` : '— BRAK');
  }
}
