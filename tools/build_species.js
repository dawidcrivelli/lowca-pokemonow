#!/usr/bin/env node
/* tmp/pokeapi/ (node tools/fetch.js) + tools/horizons.json (Pokémony z Horyzontów) + tools/famous.json (sławne z gen. 4–9) + tools/movies.json (filmy) + tools/pl.json (polskie podpowiedzi i ciekawostki) + tools/attacks_pl.json → js/species.js
   tmp/en.json: angielskie opisy z Pokédexu, źródło tłumaczeń do tools/pl.json. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'tmp', 'pokeapi'), LAST = 151, TYPES = 18;
const HZ = require('./horizons.json'), FAM = require('./famous.json'), MOV = require('./movies.json'), pick = require('./pick_cards.js'), MV = require('./moves.js');
const MOVES_PL = (f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {})(path.join(__dirname, 'moves_pl.json'));
const IDS = [...Array.from({ length: LAST }, (_, i) => i + 1), ...HZ.hz, ...HZ.s2, ...HZ.family, ...FAM.fam, ...FAM.family, ...MOV.m12, ...MOV.family].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
const load = p => JSON.parse(fs.readFileSync(path.join(DIR, p.replace(/\//g, '_') + '.json')));
const en = arr => arr.filter(x => x.language.name === 'en');
const clean = s => s.replace(/[\f\n­]+/g, ' ').replace(/\s+/g, ' ').trim();
// rzadkość 1–4: legendarne 4, reszta wg sumy statystyk bazowych
const rarity = (sp, bst) => sp.is_legendary || sp.is_mythical ? 4 : bst >= 480 ? 3 : bst >= 380 ? 2 : 1;

/* karta z zestawu „151” (numer karty = numer w Pokédexie), dla reszty z tools/pick_cards.js: tylko to, czego używa js/cards.js
   img obrazek spoza „151” · t typ energii · st etap 0/1/2 · ex (2 nagrody) · weak/res typ · ret koszt odwrotu · atk [nazwa, koszt „LLC”, obrażenia, „”|„+”|„×”, fx?]
   fx: efekty z opisu ataku, których używa js/cards.js: cond stan rywala (coin: tylko przy orle) · fail reszka = nic · heal · bench obrażenia na ławce · self w siebie · disc zrzut energii
   Reszta opisów (talia, ręka, stadion…) pomijana. */
const COND = { Poisoned: 'poison', Burned: 'burn', Paralyzed: 'paralyze', Asleep: 'sleep', Confused: 'confuse' };
function cardFx(t = '') {
  const num = re => +(t.match(re)?.[1]) || undefined, c = t.match(/(?:opponent's Active Pokémon|Defending Pokémon) is now (\w+)/)?.[1];
  const fx = { cond: COND[c], coin: COND[c] && /^Flip a coin\. If heads, (your opponent's Active|the Defending) Pokémon is now/.test(t) ? 1 : 0,
    fail: /^Flip a coin\. If tails, this attack does nothing\.?$/.test(t) ? 1 : 0, heal: num(/Heal (\d+) damage from this Pokémon/),
    bench: num(/(\d+) damage to 1 of your opponent's Benched Pokémon/), self: num(/does (\d+) damage to itself/),
    disc: /Discard all Energy from this Pokémon/.test(t) ? 99 : num(/Discard (\d+) (?:\w+ )?Energy from this Pokémon/) || (/Discard an? (?:\w+ )?Energy from this Pokémon/.test(t) ? 1 : 0) };
  const out = Object.fromEntries(Object.entries(fx).filter(([, v]) => v));
  return Object.keys(out).length ? out : undefined;
}
const ENERGY = { Grass: 'G', Fire: 'R', Water: 'W', Lightning: 'L', Psychic: 'P', Fighting: 'F', Darkness: 'D', Metal: 'M', Colorless: 'C', Dragon: 'N' };
const ATK_PL = (f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {})(path.join(__dirname, 'attacks_pl.json'));
const TCG = Object.fromEntries(load('tcg_sv3pt5').map(c => [c.number, c]));
function card(i, name) {
  const c = i <= LAST ? TCG[i] : pick(i, name), hp = +c.hp;
  let atk = (c.attacks || []).filter(a => a.damage || cardFx(a.text)?.cond || cardFx(a.text)?.heal)   // bez obrażeń: tylko ze stanem albo leczeniem
    .map(a => [ATK_PL[a.name] || a.name, a.cost.map(e => ENERGY[e]).join(''), +(a.damage.match(/\d+/)?.[0] || 0), a.damage.replace(/\d+/, ''), cardFx(a.text)].filter(x => x !== undefined));
  if (!atk.length) atk = [[ATK_PL.Tackle || 'Tackle', 'CC', Math.max(10, Math.round(hp / 40) * 10), '']];   // same zdolności (Magikarp, Mew ex…) → prosty atak
  return { img: i <= LAST ? undefined : c.images.small, hp, t: ENERGY[c.types[0]], st: ['Basic', 'Stage 1', 'Stage 2'].findIndex(s => c.subtypes.includes(s)), ex: c.subtypes.includes('ex') || c.subtypes.includes('V') || undefined,
    weak: ENERGY[c.weaknesses?.[0]?.type], res: ENERGY[c.resistances?.[0]?.type], ret: c.convertedRetreatCost || 0, atk };
}

/* ruch do areny (js/battle.js): n nazwa · t typ · c p fizyczny / s specjalny / x bez obrażeń · p moc · a celność (brak = zawsze trafia) · pp · pr priorytet
   ail stan (poison burn paralysis sleep freeze confusion) · ch szansa stanu [%] · st [[statystyka, stopnie]] · sc szansa zmiany · self zmiana u siebie
   drain % obrażeń (ujemne = odrzut) · heal % życia · hits [min, max] · fl szansa na wzdrygnięcie · cr premia do krytyka
   chg tura ładowania · rch tura odpoczynku · fix stałe obrażenia (liczba | 'level' | 'half') · ohko */
const CLS = { physical: 'p', special: 's', status: 'x' }, AIL = ['poison', 'burn', 'paralysis', 'sleep', 'freeze', 'confusion'];
const STAT = { attack: 'atk', defense: 'def', 'special-attack': 'satk', 'special-defense': 'sdef', speed: 'spd', accuracy: 'acc', evasion: 'eva' };
const MOVES = {};
function move(name) {
  if (MOVES[name]) return name;
  const m = load(`move/${name}`), x = m.meta, cat = x.category.name, ail = AIL.includes(x.ailment.name) ? x.ailment.name : undefined;
  const st = m.stat_changes.map(s => [STAT[s.stat.name], s.change]);
  MOVES[name] = { n: MOVES_PL[name] || en(m.names)[0].name, t: m.type.name, c: CLS[m.damage_class.name], p: m.power || undefined, a: m.accuracy || undefined, pp: m.pp,
    pr: m.priority || undefined, ail, ch: ail && (x.ailment_chance || 100), st: st.length ? st : undefined, sc: st.length ? x.stat_chance || 100 : undefined,
    self: st.length && (m.target.name === 'user' || cat === 'damage+raise') ? 1 : undefined, drain: x.drain || undefined, heal: x.healing || undefined,
    hits: x.min_hits ? [x.min_hits, x.max_hits] : undefined, fl: x.flinch_chance || undefined, cr: x.crit_rate || undefined,
    chg: MV.CHARGE.includes(name) ? 1 : undefined, rch: MV.RECHARGE.includes(name) ? 1 : undefined, fix: MV.FIXED[name], ohko: cat === 'ohko' ? 1 : undefined };
  return name;
}
const moveset = (p, types) => MV.pickMoves(types, MV.learnset(p).moves, n => load(`move/${n}`)).map(m => move(m.name));

const mons = [];
for (const i of IDS) {
  const p = load(`pokemon/${i}`), sp = load(`pokemon-species/${i}`);
  const st = Object.fromEntries(p.stats.map(s => [s.stat.name, s.base_stat]));
  const bst = Object.values(st).reduce((a, b) => a + b, 0);
  const flav = en(sp.flavor_text_entries), red = flav.find(f => f.version.name === 'red') || flav[0];
  mons.push({
    id: i, name: en(sp.names)[0].name, hz: HZ.hz.includes(i) ? 1 : HZ.s2.includes(i) ? 2 : undefined, fam: [...FAM.fam, ...FAM.family].includes(i) || undefined, m12: MOV.m12.includes(i) || undefined, types: p.types.map(t => t.type.name),
    hp: st.hp, atk: st.attack, def: st.defense, satk: st['special-attack'], sdef: st['special-defense'], spd: st.speed,
    m: p.height / 10, kg: p.weight / 10, rarity: rarity(sp, bst),
    from: (n => IDS.includes(n) ? n : null)(+sp.evolves_from_species?.url.match(/(\d+)\/$/)[1]),   // Pichu & co. spoza listy pomijamy
    legend: sp.is_legendary || sp.is_mythical || undefined,
    genus: en(sp.genera)[0].genus, flavor: clean(red.flavor_text), card: card(i, en(sp.names)[0].name), mv: moveset(p, p.types.map(t => t.type.name)),
  });
}
// typ atakujący → {typ broniący: mnożnik}; tylko odstępstwa od 1
const CHART = {};
for (let i = 1; i <= TYPES; i++) {
  const t = load(`type/${i}`), r = t.damage_relations, row = CHART[t.name] = {};
  for (const [k, v] of [['double_damage_to', 2], ['half_damage_to', .5], ['no_damage_to', 0]]) for (const x of r[k]) row[x.name] = v;
}

fs.writeFileSync(path.join(__dirname, '..', 'tmp', 'en.json'), JSON.stringify(mons.map(({ id, name, types, genus, flavor, from }) =>
  ({ id, name, types, genus, flavor, from: from && mons.find(m => m.id === from).name })), null, 1));
const plFile = path.join(__dirname, 'pl.json'), PL = fs.existsSync(plFile) ? JSON.parse(fs.readFileSync(plFile)) : {};
const rows = mons.map(({ genus, flavor, ...m }) => JSON.stringify({ ...m, ...PL[m.id] }));
fs.writeFileSync(path.join(__dirname, '..', 'js', 'species.js'), `/* ================= POKÉDEX: 151 Pokémonów z 1. generacji + Pokémony z serialu Horyzonty (hz: sezon, w którym widać je w serialu) + sławne z gen. 4–9 z ewolucjami (fam) + z filmu „Arceus i Klejnot Życia” (m12) =================
   Wygenerowane: node tools/build_species.js  (dane: PokeAPI, teksty: tools/pl.json)
   hp/atk/def/satk/sdef/spd = statystyki bazowe z gier · m = wzrost, kg = waga · from = z kogo ewoluuje
   mv: 4 ruchy do areny (klucze MOVES, opis pól w tools/build_species.js) · CHART: typ ataku → {typ obrońcy: mnożnik}, brak wpisu = ×1
   card: karta z zestawu „Pokémon 151” (Scarlet & Violet, 2023) albo card.img, opis pól w tools/build_species.js
   Obrazki i głosy z repozytoriów PokeAPI na GitHubie, karty z images.pokemontcg.io (CORS dozwolony, potrzebny arenie 3D) */
const POKEAPI_RAW = 'https://raw.githubusercontent.com/PokeAPI/';
const ART_URL = id => \`\${POKEAPI_RAW}sprites/master/sprites/pokemon/other/official-artwork/\${id}.png\`;   // duża grafika, ~100 kB
const SPRITE_URL = id => \`\${POKEAPI_RAW}sprites/master/sprites/pokemon/\${id}.png\`;                     // piksele z gier, ~1 kB
const CRY_URL = id => \`\${POKEAPI_RAW}cries/main/cries/pokemon/\${id <= ${LAST} ? 'legacy' : 'latest'}/\${id}.ogg\`;   // Kanto: głos z Red/Blue
// karta: ~150 kB / ~1 MB; duża wersja: pokemontcg.io „_hires”, scrydex „/large”
const CARD_URL = (sp, big) => (sp.card.img || \`https://images.pokemontcg.io/sv3pt5/\${sp.id}.png\`).replace(/\\.png$|\\/small$/, m => big ? (m === '.png' ? '_hires.png' : '/large') : m);
const CHART = ${JSON.stringify(CHART)};
const MOVES = {
  ${Object.entries(MOVES).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n  ')},
};
const SPECIES = [
  ${rows.join(',\n  ')},
];
if (typeof module !== 'undefined') module.exports = { CHART, MOVES, SPECIES, ART_URL, SPRITE_URL, CRY_URL, CARD_URL };
`);
console.log('-> js/species.js', mons.length);
