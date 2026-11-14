/* karta dla Pokémonów spoza 1. generacji: najwcześniejszy zestaw z SERIES (w tej kolejności), zwykła rzadkość, bez ex, jeśli się da.
   użycie: require('./pick_cards.js')(id, nazwa) → karta z pokemon-tcg-data (z polem set) */
const fs = require('fs'), path = require('path'), DIR = path.join(__dirname, '..', 'tmp', 'pokeapi');
const load = f => JSON.parse(fs.readFileSync(path.join(DIR, f + '.json')));
const SERIES = ['Scarlet & Violet', 'Mega Evolution', 'Sword & Shield', 'Sun & Moon'];   // Hatenna, Rayquaza, Kleavor nie mają kart SV; Pichu, Happiny, Giratina, Arceus – zwykłe dopiero w SM
const PLAIN = ['Common', 'Uncommon', 'Rare'];
const rank = s => SERIES.indexOf(s.series) * 2 + (s.id.endsWith('p'));   // promki (svp, swshp) na koniec serii
let all;   // leniwie: fetch.js wczytuje SERIES, zanim pobierze karty
// karta do gry tylko z zestawów do UNTIL: nowy zestaw nie podmienia kart (ich ataki są przetłumaczone w tools/attacks_pl.json); oglądanie (allCards): wszystkie
const UNTIL = '2026/10/31';
const cards = () => all ||= load('tcg_sets').filter(s => SERIES.includes(s.series) && s.releaseDate <= UNTIL).sort((a, b) => rank(a) - rank(b) || a.releaseDate.localeCompare(b.releaseDate))
  .flatMap(s => load('tcg_' + s.id).map(c => ({ ...c, set: s.id, old: s.series === 'Sun & Moon' })));
// gdy nie ma zwykłej karty: „Galarian / Paldean …” (Perrserker, Runerigus, Clodsire), „Ethan's …” (Pichu), „… V” (Arceus) – w tej kolejności
const alt = (c, name) => ['Galarian ', 'Paldean '].some(r => c.name === r + name) ? 4 : c.name.endsWith("'s " + name) ? 6 : c.name === name + ' V' ? 8 : c.name === name ? 0 : -1;
const score = c => (c.subtypes.includes('ex') || c.subtypes.includes('V') ? 2 : 0) + (PLAIN.includes(c.rarity) ? 0 : 1) + c.alt + (c.old ? 20 : 0);   // Sun & Moon tylko w ostateczności
/* wszystkie karty Pokémona do obejrzenia w jego oknie: bez powtórek (ta sama nazwa, HP, ataki i zdolności = ta sama karta w innej grafice),
   z każdej zwykła grafika zamiast ilustracji i tęczowych, od najstarszej; kolejność: rodzaj (VMAX, VSTAR, Mega, ex, GX, V, inne specjalne, zwykłe), potem HP malejąco.
   wynik: ['swsh4/44', …] (images.pokemontcg.io/<to>.png) albo pełny adres (nowsze zestawy ze scrydex), z rodzajem po „|”: 'swsh4/44|VMAX' */
const FANCY = /Ultra|Secret|Rainbow|Illustration|Hyper|Gallery|Shiny|Promo|Classic|Radiant|Amazing|Trainer Gallery/;
const KIND = [['VMAX', c => c.subtypes?.includes('VMAX')], ['VSTAR', c => c.subtypes?.includes('VSTAR')],
  ['Mega', c => c.subtypes?.includes('MEGA') || /^(M |Mega )/.test(c.name)], ['ex', c => c.subtypes?.some(t => t === 'ex' || t === 'EX')],
  ['GX', c => c.subtypes?.includes('GX')], ['V', c => c.subtypes?.some(t => t === 'V' || t === 'V-UNION')],
  ['★', c => c.subtypes?.some(t => ['BREAK', 'LEGEND', 'Prime', 'Level-Up', 'Radiant'].includes(t))], ['', () => true]];
const kindOf = c => KIND.findIndex(([, f]) => f(c));
let every;
const allCards = id => {
  every ||= load('tcg_sets').sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .flatMap(s => load('tcg_' + s.id).filter(c => c.supertype === 'Pokémon').map(c => ({ ...c, date: s.releaseDate })));
  const best = new Map();
  for (const c of every) if (c.nationalPokedexNumbers?.includes(id)) {
    const k = [c.name, c.hp, ...(c.attacks || []).map(a => a.name + a.damage), ...(c.abilities || []).map(a => a.name)].join('|'), b = best.get(k);
    if (!b || FANCY.test(b.rarity || '') && !FANCY.test(c.rarity || '')) best.set(k, c);
  }
  return [...best.values()].map(c => ({ c, k: kindOf(c) })).sort((a, b) => a.k - b.k || (+b.c.hp || 0) - (+a.c.hp || 0) || a.c.date.localeCompare(b.c.date))
    .map(({ c, k }) => c.images.small.replace(/^https:\/\/images\.pokemontcg\.io\/(.+)\.png$/, '$1') + (KIND[k][0] ? '|' + KIND[k][0] : ''));
};
module.exports = Object.assign((id, name) => cards().map(c => ({ ...c, alt: alt(c, name) })).filter(c => c.supertype === 'Pokémon' && c.nationalPokedexNumbers?.includes(id) && c.alt >= 0)
  .reduce((best, c) => !best || score(c) < score(best) ? c : best, null), { SERIES, allCards });
if (require.main === module) {
  for (const id of require('./ids.js').IDS.filter(i => i > 151)) {
    const sp = load('pokemon-species_' + id), name = sp.names.find(n => n.language.name === 'en').name, c = module.exports(id, name);
    console.log(id, name, c ? `${c.set}/${c.number} ${c.rarity} ${c.subtypes} hp${c.hp} ${c.evolvesFrom || ''}` : '— BRAK');
  }
}
