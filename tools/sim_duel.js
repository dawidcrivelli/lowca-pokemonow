#!/usr/bin/env node
/* Pojedynek A vs B: % wygranych, średnio rund, ile tur na ruch (po nazwie) każdej strony + przykładowa walka.
   użycie: node tools/sim_duel.js Charizard Gyarados [N] */
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { autoBattle } = require(process.env.ENGINE || '../js/battle.js');
const [an, bn, N = 1000] = process.argv.slice(2), by = n => SPECIES.find(s => s.name === n), [a, b] = [by(an), by(bn)];
let wins = 0, rounds = 0; const used = { a: {}, b: {} };
for (let i = 0; i < N; i++) {
  const B = autoBattle(a, b); wins += B.winner === B.a; rounds += B.round - 1;
  for (const e of B.events) if (e.m && e.as) used[e.as][e.m.n || e.m.id] = (used[e.as][e.m.n || e.m.id] || 0) + 1;
}
console.log(`${an} wygrywa ${(100 * wins / N).toFixed(0)}%, średnio ${(rounds / N).toFixed(1)} rund`);
for (const k of ['a', 'b']) console.log(k === 'a' ? an : bn, Object.entries(used[k]).map(([m, n]) => `${m} ${(n / N).toFixed(1)}`).join(', '));
autoBattle(a, b).events.forEach(e => console.log(' ', e.round, e.text));
