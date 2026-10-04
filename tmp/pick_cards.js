/* karta dla Pokémonów spoza 1. generacji: najwcześniejszy zestaw z SERIES (w tej kolejności), zwykła rzadkość, bez ex, jeśli się da.
   użycie: require('./pick_cards.js')(id, nazwa) → karta z pokemon-tcg-data (z polem set) */
const fs = require('fs'), path = require('path'), DIR = path.join(__dirname, 'pokeapi');
const load = f => JSON.parse(fs.readFileSync(path.join(DIR, f + '.json')));
const SERIES = ['Scarlet & Violet', 'Mega Evolution', 'Sword & Shield'];   // Hatenna, Rayquaza, Kleavor nie mają kart SV
const PLAIN = ['Common', 'Uncommon', 'Rare'];
const rank = s => SERIES.indexOf(s.series) * 2 + (s.id.endsWith('p'));   // promki (svp, swshp) na koniec serii
let all;   // leniwie: fetch.js wczytuje SERIES, zanim pobierze karty
const cards = () => all ||= load('tcg_sets').filter(s => SERIES.includes(s.series)).sort((a, b) => rank(a) - rank(b) || a.releaseDate.localeCompare(b.releaseDate))
  .flatMap(s => load('tcg_' + s.id).map(c => ({ ...c, set: s.id })));
// Perrserker, Runerigus: istnieją tylko jako „Galarian …” → takie karty dopiero, gdy nie ma zwykłej
const score = c => (c.subtypes.includes('ex') ? 2 : 0) + (PLAIN.includes(c.rarity) ? 0 : 1) + (c.name.startsWith('Galarian ') ? 4 : 0);
module.exports = Object.assign((id, name) => cards().filter(c => c.supertype === 'Pokémon' && c.nationalPokedexNumbers?.includes(id) && (c.name === name || c.name === 'Galarian ' + name))
  .reduce((best, c) => !best || score(c) < score(best) ? c : best, null), { SERIES });
if (require.main === module) {
  const HZ = require('./horizons.json'), FAM = require('./famous.json'), MOV = require('./movies.json');
  for (const id of [...HZ.hz, ...HZ.s2, ...HZ.family, ...FAM.fam, ...FAM.family, ...MOV.m12, ...MOV.family].filter(i => i > 151)) {
    const sp = load('pokemon-species_' + id), name = sp.names.find(n => n.language.name === 'en').name, c = module.exports(id, name);
    console.log(id, name, c ? `${c.set}/${c.number} ${c.rarity} ${c.subtypes} hp${c.hp} ${c.evolvesFrom || ''}` : '— BRAK');
  }
}
