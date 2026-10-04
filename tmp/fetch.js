#!/usr/bin/env node
/* Pobiera z PokeAPI dane 1. generacji + Pokémonów z Horyzontów (tmp/horizons.json) i sławnych (tmp/famous.json) oraz tabelę typów,
   a z pokemon-tcg-data karty z zestawów SERIES (tmp/pick_cards.js) do tmp/pokeapi/
   (cache: ponowne uruchomienie nic nie pobiera). Gdy pokeapi.co nie odpowiada: kopia statyczna PokeAPI/api-data na GitHubie (MIRROR). */
const fs = require('fs'), path = require('path');
const API = 'https://pokeapi.co/api/v2/', MIRROR = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2/', DIR = path.join(__dirname, 'pokeapi'), LAST = 151, TYPES = 18;
const TCG = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/';   // api.pokemontcg.io bywa niedostępne
const { SERIES } = require('./pick_cards.js'), { learnset } = require('./moves.js'), HZ = require('./horizons.json'), FAM = require('./famous.json');
const IDS = [...Array.from({ length: LAST }, (_, i) => i + 1), ...HZ.hz, ...HZ.family, ...FAM.fam, ...FAM.family].filter((v, i, a) => a.indexOf(v) === i);
const load = p => JSON.parse(fs.readFileSync(path.join(DIR, p.replace(/\//g, '_') + '.json')));
// mirror: katalogi po numerze, nie po nazwie (ruchy: numer z adresu w danych Pokémona)
const MOVE_NO = {}, mirror = p => MIRROR + p.replace(/^move\/([a-z0-9-]+)$/, (_, n) => 'move/' + MOVE_NO[n]) + '/index.json';
async function get(p, url) {
  const f = path.join(DIR, p.replace(/\//g, '_') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f));
  const j = url ? await (await fetch(url)).json() : await fetch(API + p).then(r => r.json()).catch(() => fetch(mirror(p)).then(r => r.json()));
  fs.writeFileSync(f, JSON.stringify(j));
  return j;
}
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  for (const i of IDS) {
    const p = await get(`pokemon/${i}`); await get(`pokemon-species/${i}`);
    for (const m of p.moves) MOVE_NO[m.move.name] = +m.move.url.match(/(\d+)\/$/)[1];
  }
  MOVE_NO.tackle ||= 33;
  const moves = new Set(['tackle', ...IDS.flatMap(i => learnset(load(`pokemon/${i}`)).moves.map(m => m.name))]);   // ruchy do areny: tmp/moves.js
  for (const m of moves) await get(`move/${m}`);
  for (let i = 1; i <= TYPES; i++) await get(`type/${i}`);
  const sets = (await get('tcg_sets', TCG + 'sets/en.json')).filter(s => SERIES.includes(s.series));
  for (const s of sets) await get(`tcg_${s.id}`, `${TCG}cards/en/${s.id}.json`);
  console.log('ok', fs.readdirSync(DIR).length);
})();
