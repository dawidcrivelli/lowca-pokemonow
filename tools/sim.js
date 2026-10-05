#!/usr/bin/env node
/* Kontrolne pojedynki i ranking na silniku z js/battle.js.  użycie: node tools/sim.js */
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { autoBattle, newBattle, playRound, forms } = require('../js/battle.js');
const N = 400, by = n => SPECIES.find(s => s.name === n);
const winRate = (a, b) => { let w = 0; for (let i = 0; i < N; i++) w += (B => B.winner === B.a)(autoBattle(a, b)); return w / N; };
for (const [a, b] of [['Pikachu', 'Squirtle'], ['Charizard', 'Blastoise'], ['Mewtwo', 'Magikarp'], ['Snorlax', 'Gengar'], ['Gastly', 'Rattata'],
  ['Onix', 'Pikachu'], ['Gyarados', 'Dragonite'], ['Bulbasaur', 'Charmander'], ['Mew', 'Mewtwo'], ['Caterpie', 'Weedle'], ['Sprigatito', 'Fuecoco'], ['Fuecoco', 'Quaxly'], ['Quaxly', 'Sprigatito'], ['Terapagos', 'Rayquaza']])
  console.log(`${a} vs ${b}: ${(100 * winRate(by(a), by(b))).toFixed(0)}%`);
// formy: Mega i Tera przeciw zwykłej formie tego samego Pokémona
for (const n of ['Charizard', 'Gyarados', 'Pikachu', 'Lucario']) console.log(n, forms(by(n)).slice(1).map(f => `${f.name} vs zwykły: ${(100 * winRate(f, by(n))).toFixed(0)}%`).join(', '));
// ranking: średnia skuteczność przeciw wszystkim
const R = SPECIES.map(a => [a.name, SPECIES.reduce((t, b) => t + (a === b ? 0 : autoBattle(a, b).winner.id === a.id), 0) / (SPECIES.length - 1)]).sort((x, y) => y[1] - x[1]);
console.log('top', R.slice(0, 8).map(([n, r]) => `${n} ${(100 * r).toFixed(0)}%`).join(', '));
console.log('dół', R.slice(-5).map(([n, r]) => `${n} ${(100 * r).toFixed(0)}%`).join(', '));
const n = SPECIES.length, rounds = [], kinds = {};
for (let i = 0; i < 2000; i++) {
  const B = autoBattle(SPECIES[i % n], SPECIES[(i * 7 + 3) % n]); rounds.push(B.round - 1);
  for (const e of B.events) for (const k of ['miss', 'crit', 'status', 'stat', 'charge', 'skip', 'tick', 'heal', 'drain', 'recoil', 'selfHit', 'timeout']) if (e[k]) kinds[k] = (kinds[k] || 0) + 1;
}
console.log('średnio rund', (rounds.reduce((a, b) => a + b) / rounds.length).toFixed(1), 'limit czasu', rounds.filter(r => r >= 15).length / 20 + '%');
console.log('zdarzenia na walkę', Object.entries(kinds).map(([k, v]) => `${k} ${(v / 2000).toFixed(2)}`).join(', '));
// przykładowa walka
const B = newBattle(by('Pikachu'), by('Squirtle')); while (!B.winner) playRound(B); B.events.forEach(e => console.log(' ', e.round, e.text));
