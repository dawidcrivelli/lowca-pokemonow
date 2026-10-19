#!/usr/bin/env node
/* Testy komputera w walce (js/battle.js).  użycie: node tools/test_ai.js */
const assert = require('assert');
const { CHART, MOVES, SPECIES } = require('../js/species.js');
Object.assign(global, { CHART, MOVES });
const { newBattle, aiMove } = require('../js/battle.js');
const by = n => SPECIES.find(s => s.name === n), NO_RANDOM = () => .99;   // > TUNE.ai.random: zawsze najlepszy ruch
const pick = (a, b, hp = 1) => { const B = newBattle(a.id ? a : by(a), by(b), NO_RANDOM); B.a.hp = Math.round(B.a.hp0 * hp); return B.a.moves[aiMove(B, B.a, B.b)].k; };

// osłabienie, które niczego nie zmienia: Charizard i tak jest szybszy od Gyaradosa → Groźna Mina bez sensu
assert.notStrictEqual(pick('Charizard', 'Gyarados'), 'scary-face');
// Taniec Smoka (atak +1, szybkość +1) bez ruchów fizycznych daje tylko szybkość — mniej niż cios
assert.notStrictEqual(pick({ ...by('Gyarados'), mv: ['hydro-pump', 'hurricane', 'dragon-dance', 'surf'] }, 'Charizard'), 'dragon-dance');
// z ruchami fizycznymi Taniec Smoka się opłaca, jak w grach
assert.strictEqual(pick('Gyarados', 'Charizard'), 'dragon-dance');
// Fotosynteza: przy prawie pełnym życiu nie ma czego leczyć → cios; przy 40% oddaje połowę życia, więcej niż Miotacz Płomieni zabiera → leczy się
assert.notStrictEqual(pick('Venusaur', 'Charizard', .9), 'synthesis');
assert.strictEqual(pick('Venusaur', 'Charizard', .4), 'synthesis');
console.log('ok');
