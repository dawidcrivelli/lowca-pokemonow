/* Lista Pokémonów w grze (fetch.js, build_species.js, pick_cards.js): Kanto + Horyzonty + sławne + film + Battle Academy, z ewolucjami potrzebnymi kartom.
   Horyzonty 1 tylko te, które są też w sezonie 2 (dziecko ogląda sezon 2); Horyzonty 2: aktywne w odcinkach (tools/horizons.json). */
const HZ = require('./horizons.json'), FAM = require('./famous.json'), MOV = require('./movies.json'), BA = require('./academy.json'), LAST = 151;
const HZ1 = HZ.hz.filter(i => HZ.s2all.includes(i)), HZ2 = HZ.s2;
const IDS = [...Array.from({ length: LAST }, (_, i) => i + 1), ...HZ1, ...HZ2, ...HZ.family, ...HZ.s2family, ...FAM.fam, ...FAM.family, ...MOV.m12, ...MOV.family, ...BA.pikachu, ...BA.eevee, ...BA.cinderace, ...BA.family]
  .filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
module.exports = { IDS, HZ1, HZ2, LAST };
