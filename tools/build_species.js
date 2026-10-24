#!/usr/bin/env node
/* tmp/pokeapi/ (node tools/fetch.js) + tools/horizons.json (Pokémony z Horyzontów) + tools/famous.json (sławne z gen. 4–9) + tools/movies.json (filmy) + tools/academy.json (Battle Academy 2022) + tools/pl.json (polskie podpowiedzi i ciekawostki) + tools/attacks_pl.json → js/species.js
   tmp/en.json: angielskie opisy z Pokédexu, źródło tłumaczeń do tools/pl.json. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'tmp', 'pokeapi'), TYPES = 18;
const HZ = require('./horizons.json'), FAM = require('./famous.json'), MOV = require('./movies.json'), BA = require('./academy.json'), pick = require('./pick_cards.js'), MV = require('./moves.js');
const MOVES_PL = (f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {})(path.join(__dirname, 'moves_pl.json'));
const { IDS, HZ1, HZ2, LAST } = require('./ids.js');
const load = p => JSON.parse(fs.readFileSync(path.join(DIR, p.replace(/\//g, '_') + '.json')));
const en = arr => arr.filter(x => x.language.name === 'en');
const clean = s => s.replace(/[\f\n­]+/g, ' ').replace(/\s+/g, ' ').trim();
// rzadkość 1–4: legendarne 4, reszta wg sumy statystyk bazowych
const rarity = (sp, bst) => sp.is_legendary || sp.is_mythical ? 4 : bst >= 480 ? 3 : bst >= 380 ? 2 : 1;

/* karta z zestawu „151” (numer karty = numer w Pokédexie), dla reszty z tools/pick_cards.js: tylko to, czego używa js/cards.js
   img obrazek spoza „151” · t typ energii · st etap 0/1/2 · ex (2 nagrody) · weak/res typ · ret koszt odwrotu · atk [nazwa, koszt „LLC”, obrażenia, „”|„+”|„×”, fx?]
   fx: efekty z opisu ataku, których używa js/cards.js: cond stan rywala (coin: tylko przy orle) · fail reszka = nic · heal · bench obrażenia na ławce · self w siebie · disc zrzut energii
       foedisc zrzut energii rywala (fdcoin: przy orle) · lock odpoczynek w następnej turze (1 = żaden atak, 2 = tylko ten) · foelock rywal nie atakuje w następnej turze
       guard ochrona w następnej turze rywala: −guard obrażeń (999 = wcale; gcoin: przy orle, gbasic: tylko od Podstawowych, gko: tylko gdy ten atak pokonał rywala)
       by — od czego zależą obrażenia „×” (obrażenia × liczba) i „+” (x więcej, raz albo za każdą sztukę):
         flips n monet · tails rzuty do reszki · coin orzeł · en energia tego Pokémona · mydmg / foedmg jego rany (×10) · foeen energia rywala · team / bench / foebench Pokémony
         hurt jest ranny · foehurt rywal ranny · foecond rywal ze stanem (cond: tylko ten) · foeex rywal ex / V · foetype rywal typu (t) · behind mniej nagród niż rywal · opt „możesz” (+ odpoczynek)
       Bez rozpoznanego warunku „×” i „+” zostają przy rzucie monetą. Reszta opisów (talia, ręka, stadion…) pomijana. */
const COND = { Poisoned: 'poison', Burned: 'burn', Paralyzed: 'paralyze', Asleep: 'sleep', Confused: 'confuse' };
const TYPE_E = { Grass: 'G', Fire: 'R', Water: 'W', Lightning: 'L', Psychic: 'P', Fighting: 'F', Darkness: 'D', Metal: 'M', Colorless: 'C', Dragon: 'N' };
// od czego zależą obrażenia „×” / „+” (patrz opis fx wyżej)
function dmgBy(t) {
  const each = (re, by) => re.test(t) && { by }, x = +(t.match(/does (\d+) more damage/)?.[1]) || undefined;
  const r = (/^Flip (\d) coins\. This attack does \d+ (?:more )?damage for each heads/.exec(t) && { by: 'flips', n: +RegExp.$1 })
    || each(/^Flip a coin until you get tails\. This attack does \d+ (?:more )?damage for each heads/, 'tails')
    || each(/for each (?:\w+ )?Energy attached to this Pokémon/, 'en') || each(/for each damage counter on this Pokémon/, 'mydmg')
    || each(/for each damage counter on your opponent's Active Pokémon/, 'foedmg') || each(/for each (?:\w+ )?Energy attached to your opponent's Active Pokémon/, 'foeen')
    || each(/for each of your opponent's Benched Pokémon/, 'foebench') || each(/for each of your Benched Pokémon/, 'bench') || each(/for each of your Pokémon in play/, 'team')
    || each(/^Flip a coin\. If heads, this attack does \d+ more damage/, 'coin') || each(/^If this Pokémon has any damage counters on it/, 'hurt')
    || each(/^If your opponent's Active Pokémon (?:already )?has any damage counters on it/, 'foehurt')
    || (/^If your opponent's Active Pokémon is (Burned|Poisoned|Asleep|Paralyzed|Confused), this attack/.exec(t) && { by: 'foecond', cond: COND[RegExp.$1] })
    || each(/^If your opponent's Active Pokémon is affected by a Special Condition/, 'foecond')
    || each(/^If your opponent's Active Pokémon is a Pokémon (?:ex|V)/, 'foeex')
    || (/^If your opponent's Active Pokémon is an? (\w+) Pokémon, this attack/.exec(t) && TYPE_E[RegExp.$1] && { by: 'foetype', t: TYPE_E[RegExp.$1] })
    || each(/^If you have more Prize cards remaining than your opponent/, 'behind') || each(/^You may do \d+ more damage\. If you do, during your next turn, this Pokémon can't attack/, 'opt');
  return r && { ...r, x };
}
function cardFx(t = '', name = '') {
  const num = re => +(t.match(re)?.[1]) || undefined, c = t.match(/(?:opponent's Active Pokémon|Defending Pokémon) is now (\w+)/)?.[1];
  const guard = /prevent all damage (?:from and effects of attacks )?done to this Pokémon/.test(t) ? 999 : num(/During your opponent's next turn, this Pokémon takes (\d+) less damage from attacks/);
  const fx = { cond: COND[c], coin: COND[c] && /^Flip a coin\. If heads, (your opponent's Active|the Defending) Pokémon is now/.test(t) ? 1 : 0,
    fail: /^Flip a coin\. If tails, this attack does nothing\./.test(t) ? 1 : 0,   // ten sam rzut może dawać coś przy orle (np. ochronę) heal: num(/Heal (\d+) damage from this Pokémon/),
    bench: num(/(\d+) damage to 1 of your opponent's Benched Pokémon/), self: num(/does (\d+) damage to itself/),
    disc: /Discard all Energy from this Pokémon/.test(t) ? 99 : num(/Discard (\d+) (?:\w+ )?Energy from this Pokémon/) || (/Discard an? (?:\w+ )?Energy from this Pokémon/.test(t) ? 1 : 0),
    foedisc: /[Dd]iscard an? (?:\w+ )?Energy from your opponent's Active Pokémon/.test(t) ? 1 : 0, fdcoin: /^Flip a coin\. If heads, discard an? (?:\w+ )?Energy from your opponent's Active/.test(t) ? 1 : 0,
    lock: /this Pokémon can't attack/.test(t) && /During your next turn|during your next turn/.test(t) ? 1 : name && t.includes(`During your next turn, this Pokémon can't use ${name}`) ? 2 : 0,
    foelock: /During your opponent's next turn, the Defending Pokémon can't attack/.test(t) ? 1 : 0,
    guard, gcoin: guard && /^Flip a coin\. If heads, during your opponent's next turn/.test(t) ? 1 : 0, gbasic: guard && /by attacks from Basic Pokémon/.test(t) ? 1 : 0,
    gko: guard && /^If your opponent's Pokémon is Knocked Out by damage from this attack/.test(t) ? 1 : 0,   // „If tails, nothing. If heads, …”: rzut już w fail
    ...dmgBy(t) };
  const out = Object.fromEntries(Object.entries(fx).filter(([, v]) => v));
  return Object.keys(out).length ? out : undefined;
}
const ENERGY = { Grass: 'G', Fire: 'R', Water: 'W', Lightning: 'L', Psychic: 'P', Fighting: 'F', Darkness: 'D', Metal: 'M', Colorless: 'C', Dragon: 'N' };
const ATK_PL = (f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {})(path.join(__dirname, 'attacks_pl.json'));
const TCG = Object.fromEntries(load('tcg_sv3pt5').map(c => [c.number, c]));
function card(i, name) {
  const c = i <= LAST ? TCG[i] : pick(i, name), hp = +c.hp;
  let atk = (c.attacks || []).filter(a => a.damage || ['cond', 'heal', 'guard'].some(k => cardFx(a.text, a.name)?.[k]))   // bez obrażeń: tylko ze stanem, leczeniem albo ochroną
    .map(a => [ATK_PL[a.name] || a.name, a.cost.map(e => ENERGY[e]).join(''), +((a.damage || '').match(/\d+/)?.[0] || 0), (a.damage || '').replace(/\d+/, ''), cardFx(a.text, a.name)].filter(x => x !== undefined));
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
const moveset = (p, types) => (st => MV.pickMoves(types, MV.learnset(p).moves, n => load(`move/${n}`), { physical: st.atk, special: st.satk }))(baseStats(p)).map(m => move(m.name));

// formy Mega (arena): n nazwa · art numer grafiki w PokeAPI · typy i statystyki bazowe jak wyżej; ruchy te same co zwykłej formy
const MEGA = /^(?!.*female).*-mega(-[xyz])?$/;   // samica Meowstic: ta sama Mega co samiec
const baseStats = p => (st => ({ hp: st.hp, atk: st.attack, def: st.defense, satk: st['special-attack'], sdef: st['special-defense'], spd: st.speed }))(Object.fromEntries(p.stats.map(s => [s.stat.name, s.base_stat])));
const megas = (sp, name) => (m => m.length ? m : undefined)(sp.varieties.filter(v => MEGA.test(v.pokemon.name)).map(v => load(`pokemon/${v.pokemon.name}`))
  .map(p => ({ n: `Mega ${name}${(p.name.match(MEGA)[1] || '').toUpperCase().replace('-', ' ')}`, art: p.id, types: p.types.map(t => t.type.name), ...baseStats(p), kg: p.weight / 10 })));
const mons = [];
for (const i of IDS) {
  const p = load(`pokemon/${i}`), sp = load(`pokemon-species/${i}`);
  const st = Object.fromEntries(p.stats.map(s => [s.stat.name, s.base_stat]));
  const bst = Object.values(st).reduce((a, b) => a + b, 0);
  const flav = en(sp.flavor_text_entries), red = flav.find(f => f.version.name === 'red') || flav[0];
  mons.push({
    id: i, name: en(sp.names)[0].name, hz1: HZ1.includes(i) || undefined, hz2: HZ2.includes(i) || undefined, fam: [...FAM.fam, ...FAM.family].includes(i) || undefined, m12: MOV.m12.includes(i) || undefined, ba: [...BA.pikachu, ...BA.eevee, ...BA.cinderace].includes(i) || undefined, types: p.types.map(t => t.type.name),
    hp: st.hp, atk: st.attack, def: st.defense, satk: st['special-attack'], sdef: st['special-defense'], spd: st.speed,
    m: p.height / 10, kg: p.weight / 10, rarity: rarity(sp, bst),
    from: (n => IDS.includes(n) ? n : null)(+sp.evolves_from_species?.url.match(/(\d+)\/$/)[1]),   // Pichu & co. spoza listy pomijamy
    legend: sp.is_legendary || sp.is_mythical || undefined,
    mega: megas(sp, en(sp.names)[0].name),
    genus: en(sp.genera)[0].genus, flavor: clean(red.flavor_text), card: card(i, en(sp.names)[0].name), vars: (v => v.length ? v : undefined)(pick.variants(i)), mv: moveset(p, p.types.map(t => t.type.name)),
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
fs.writeFileSync(path.join(__dirname, '..', 'js', 'species.js'), `/* ================= POKÉDEX: 151 Pokémonów z 1. generacji + Pokémony z serialu Horyzonty (hz1 / hz2: sezon, w którym widać je w serialu) + sławne z gen. 4–9 z ewolucjami (fam) + z filmu „Arceus i Klejnot Życia” (m12) + z talii Battle Academy 2022 (ba) =================
   Wygenerowane: node tools/build_species.js  (dane: PokeAPI, teksty: tools/pl.json)
   hp/atk/def/satk/sdef/spd = statystyki bazowe z gier · m = wzrost, kg = waga · from = z kogo ewoluuje
   mv: 4 ruchy do areny (klucze MOVES, opis pól w tools/build_species.js) · CHART: typ ataku → {typ obrońcy: mnożnik}, brak wpisu = ×1
   card: karta z zestawu „Pokémon 151” (Scarlet & Violet, 2023) albo card.img, opis pól w tools/build_species.js
   Obrazki i głosy z repozytoriów PokeAPI na GitHubie, karty z images.pokemontcg.io (CORS dozwolony, potrzebny arenie 3D) */
const POKEAPI_RAW = 'https://raw.githubusercontent.com/PokeAPI/';
const ART_URL = id => \`\${POKEAPI_RAW}sprites/master/sprites/pokemon/other/official-artwork/\${id}.png\`;   // duża grafika, ~100 kB
const SPRITE_URL = id => \`\${POKEAPI_RAW}sprites/master/sprites/pokemon/\${id}.png\`;                     // piksele z gier, ~1 kB
// karta: ~150 kB / ~1 MB; duża wersja: pokemontcg.io „_hires”, scrydex „/large”
const CARD_URL = (sp, big) => (sp.card.img || \`https://images.pokemontcg.io/sv3pt5/\${sp.id}.png\`).replace(/\\.png$|\\/small$/, m => big ? (m === '.png' ? '_hires.png' : '/large') : m);
const CHART = ${JSON.stringify(CHART)};
const MOVES = {
  ${Object.entries(MOVES).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n  ')},
};
const SPECIES = [
  ${rows.join(',\n  ')},
];
// Horyzonty sezon 2 („The Search for Laqua”), odcinki jak na Netflixie: [tytuł, aktywne Pokémony]
const EPISODES = ${JSON.stringify(HZ.titles.map((t, i) => [t, HZ.ep[i + 1]]))};
if (typeof module !== 'undefined') module.exports = { CHART, MOVES, SPECIES, EPISODES, ART_URL, SPRITE_URL, CARD_URL };
`);
console.log('-> js/species.js', mons.length);
