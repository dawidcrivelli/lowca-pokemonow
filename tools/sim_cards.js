#!/usr/bin/env node
/* Karty: komputer kontra komputer na losowych drużynach Podstawowych — długość gry i kto wygrywa.  użycie: node tools/sim_cards.js */
const { SPECIES } = require('../js/species.js');
global.SPECIES = SPECIES;
const C = require('../js/cards.js');
const basics = SPECIES.filter(s => s.card.st === 0), pick = n => Array.from({ length: n }, () => basics[Math.floor(Math.random() * basics.length)]);
const turns = [], evo = [0], fx = { cond: 0, checkup: 0, self: 0 }, N = 3000;
for (let i = 0; i < N; i++) {
  const D = C.newDuel(pick(C.TEAM), pick(C.TEAM));
  while (!D.winner && D.n < 200) for (const e of C.cpuTurn(D)) { if (e.evolve) evo[0]++; if (e.cond) fx.cond++; if (e.on && !e.attack) fx.checkup++; if (e.self) fx.self++; }
  turns.push(D.n);
}
turns.sort((a, b) => a - b);
console.log('tury: mediana', turns[N / 2], 'p90', turns[Math.floor(N * .9)], 'max', turns[N - 1], '· ewolucji na grę', (evo[0] / N).toFixed(1), '· na grę: stany', (fx.cond / N).toFixed(2), 'między turami', (fx.checkup / N).toFixed(2), 'dezorientacja w siebie', (fx.self / N).toFixed(2));
const D = C.newDuel([SPECIES[24]], [SPECIES[6]]);   // Pikachu vs Squirtle
while (!D.winner) for (const e of C.cpuTurn(D)) console.log(D.n, e.text);
