#!/usr/bin/env node
/* Pokémony z ruchem leczącym: średnia skuteczność przeciw wszystkim i ile razy na walkę się leczą.
   użycie: node tools/sim_heal.js [plik silnika, domyślnie js/battle.js] — np. porównanie ze starą wersją z git show */
const path = require('path');
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { autoBattle } = require(path.resolve(process.argv[2] || path.join(__dirname, '../js/battle.js')));
const healers = SPECIES.filter(s => s.mv.some(k => MOVES[k].heal));
let wins = 0, fights = 0, heals = 0, hpHealed = 0;
for (const a of healers) for (const b of SPECIES) if (a !== b) for (const B of [autoBattle(a, b)]) {
  fights++; wins += B.winner.id === a.id;
  for (const e of B.events) if (e.heal != null && e.att === a.id) heals++, hpHealed += e.heal;
}
console.log(`${healers.length} z leczeniem: wygrywają ${(100 * wins / fights).toFixed(1)}%, leczą się ${(heals / fights).toFixed(2)}× na walkę, średnio +${(hpHealed / Math.max(1, heals)).toFixed(0)} życia`);
