#!/usr/bin/env node
/* Testy komputera w walce (js/battle.js).  użycie: node tools/test_ai.js */
const assert = require('assert');
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { newBattle, aiMove } = require('../js/battle.js');
const by = n => SPECIES.find(s => s.name === n), NO_RANDOM = () => .99;   // > TUNE.ai.random: zawsze najlepszy ruch
const pick = (a, b) => { const B = newBattle(by(a), by(b), NO_RANDOM); return B.a.moves[aiMove(B, B.a, B.b)].k; };

// osłabienie, które niczego nie zmienia: Charizard i tak jest szybszy od Gyaradosa → Groźna Mina bez sensu
assert.notStrictEqual(pick('Charizard', 'Gyarados'), 'scary-face');
// cios lepszy niż wzmocnienie, gdy wzmocnienie słabo pomaga
assert.notStrictEqual(pick('Gyarados', 'Charizard'), 'dragon-dance');
console.log('ok');
