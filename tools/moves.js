/* Ruchy do areny: learnset z gry (pierwsza wersja z VERSIONS, w której Pokémon jest), poziom ≤ LEVEL.
   Wybór 4 ruchów: najmocniejszy ruch każdego własnego typu, najmocniejszy innego typu, jeden z efektem (stan / statystyki / leczenie), reszta najmocniejsze.
   Pomijamy ruchy, których silnik (js/battle.js) nie obsługuje: SKIP_CATEGORIES, SKIP. */
const VERSIONS = ['scarlet-violet', 'lets-go-pikachu-lets-go-eevee', 'sword-shield', 'ultra-sun-ultra-moon', 'red-blue'];
const LEVEL = 50, SLOTS = 4;
const SKIP_CATEGORIES = ['force-switch', 'field-effect', 'whole-field-effect', 'unique', 'swagger'];
const SKIP = ['explosion', 'self-destruct', 'misty-explosion', 'memento', 'final-gambit', 'counter', 'mirror-coat', 'metal-burst', 'bide',
  'dream-eater', 'focus-punch', 'belch', 'last-resort', 'fake-out', 'first-impression', 'snore', 'sleep-talk', 'natural-gift', 'fling',
  'rage', 'thrash', 'petal-dance', 'outrage', 'uproar', 'rollout', 'ice-ball', 'fury-cutter', 'present', 'magnitude', 'spit-up', 'stockpile',
  'rest', 'endeavor', 'pain-split', 'curse', 'transform', 'mimic', 'sketch', 'metronome', 'mirror-move', 'copycat', 'assist', 'me-first',
  'endure', 'detect', 'protect', 'substitute', 'baton-pass', 'teleport', 'splash', 'celebrate', 'hold-hands', 'helping-hand', 'shed-tail',
  'wish', 'healing-wish', 'lunar-dance', 'destiny-bond', 'perish-song', 'grudge', 'spite', 'encore', 'disable', 'torment', 'taunt',
  'foresight', 'odor-sleuth', 'miracle-eye', 'lock-on', 'mind-reader', 'future-sight', 'doom-desire', 'focus-energy', 'laser-focus',
  'bind', 'wrap', 'fire-spin', 'whirlpool', 'sand-tomb', 'clamp', 'infestation', 'magma-storm', 'snap-trap', 'thunder-cage', 'leech-seed',
  'yawn', 'nightmare', 'ingrain', 'aqua-ring', 'safeguard', 'mist', 'reflect', 'light-screen', 'aurora-veil', 'haze', 'refresh', 'heal-bell',
  'psych-up', 'role-play', 'skill-swap', 'power-trick', 'power-split', 'guard-split', 'guard-swap', 'power-swap', 'heart-swap', 'tera-blast',
  'tera-starstorm', 'hyperspace-fury', 'dragon-tail', 'circle-throw', 'u-turn', 'volt-switch', 'flip-turn', 'parting-shot', 'chilly-reception',
  'revival-blessing', 'doodle', 'trick', 'switcheroo', 'bestow', 'covet', 'thief', 'knock-off', 'recycle', 'stuff-cheeks', 'teatime',
  'charge', 'electrify', 'magnet-rise', 'telekinesis', 'gravity', 'trick-room', 'wonder-room', 'magic-room', 'follow-me', 'rage-powder',
  'ally-switch', 'after-you', 'quash', 'round', 'echoed-voice', 'retaliate', 'payback', 'revenge', 'avalanche', 'assurance', 'stomping-tantrum',
  'lash-out', 'burning-jealousy', 'rage-fist', 'last-respects', 'pursuit', 'sucker-punch', 'upper-hand', 'dig', 'dive', 'fly', 'bounce',
  'phantom-force', 'shadow-force', 'sky-drop', 'meteor-beam', 'electro-shot', 'geomancy', 'freeze-shock', 'ice-burn', 'razor-wind'];
// dwuturowe: tura ładowania, potem cios · po ciosie tura odpoczynku
const CHARGE = ['solar-beam', 'solar-blade', 'sky-attack', 'skull-bash'];
const RECHARGE = ['hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant', 'rock-wrecker', 'roar-of-time', 'prismatic-laser', 'eternabeam', 'meteor-assault'];
// stałe obrażenia: poziom (= LEVEL) albo liczba; 'half' = połowa życia rywala
const FIXED = { 'seismic-toss': 'level', 'night-shade': 'level', 'dragon-rage': 40, 'sonic-boom': 20, 'super-fang': 'half', 'ruination': 'half', 'psywave': 'level' };

// learnset: [{ name, level }] z pierwszej wersji, w której Pokémon uczy się ruchów z poziomem
function learnset(p) {
  for (const vg of VERSIONS) {
    const out = p.moves.flatMap(m => m.version_group_details.filter(d => d.version_group.name === vg && d.move_learn_method.name === 'level-up' && d.level_learned_at <= LEVEL)
      .map(d => ({ name: m.move.name, level: d.level_learned_at })));
    if (out.length) return { vg, moves: out };
  }
  return { vg: null, moves: [] };
}
const usable = m => m && !SKIP.includes(m.name) && !SKIP_CATEGORIES.includes(m.meta?.category?.name) && m.meta;
const damaging = m => m.power || FIXED[m.name] || m.meta.category.name === 'ohko';
const effect = m => !damaging(m) && ['ailment', 'net-good-stats', 'heal'].includes(m.meta.category.name);
const strength = m => (FIXED[m.name] ? 60 : m.power || 0) * (m.accuracy || 100) / 100 * (CHARGE.includes(m.name) || RECHARGE.includes(m.name) ? .5 : 1) * (m.meta.min_hits ? 3 : 1);

// types: typy Pokémona; get(name) → dane ruchu z PokeAPI
function pickMoves(types, list, get) {
  const all = [...new Map(list.map(l => [l.name, get(l.name)])).values()].filter(usable), pick = [];
  const add = m => m && !pick.includes(m) && pick.length < SLOTS && pick.push(m);
  const best = f => all.filter(m => damaging(m) && f(m)).sort((a, b) => strength(b) - strength(a))[0];
  types.forEach(t => add(best(m => m.type.name === t)));
  add(best(m => !types.includes(m.type.name) && m.type.name !== 'normal') || best(m => !types.includes(m.type.name)));
  add(all.filter(effect).sort((a, b) => list.find(l => l.name === b.name).level - list.find(l => l.name === a.name).level)[0]);   // najpóźniej poznany
  while (pick.length < SLOTS && best(m => !pick.includes(m))) add(best(m => !pick.includes(m)));
  if (!pick.some(damaging)) pick.push(get('tackle'));   // np. Magikarp: sam Splash
  return pick.slice(0, SLOTS);
}
module.exports = { VERSIONS, LEVEL, CHARGE, RECHARGE, FIXED, learnset, pickMoves };
