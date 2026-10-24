/* ================= ARENA – silnik walki (bez DOM) =================
   Jak w grach, na poziomie LEVEL (trening: do TRAIN.max, s.lv): statystyki z bazowych (js/species.js), 4 ruchy z gry (sp.mv → MOVES), wzór na obrażenia z gier,
   premia za własny typ (STAB), formy Mega / Tera (forms), tabela typów (CHART), stany (trucizna, oparzenie, paraliż, sen, zamrożenie, dezorientacja), stopnie statystyk.
   Zdarzenie (ev) opisuje jedną rzecz na scenie: ruch, pudło, stan, ładowanie, obrażenia od trucizny… — widok 2D i 3D tylko je odtwarzają.
   Strojenie: node tools/sim.js */
const LEVEL = 50, ROUNDS = 15;
const TUNE = {
  hp: 2.5,               // życie × hp: w grach walka na poziomie 50 trwa ~2 tury, za krótko, żeby zobaczyć stany i animacje
  stab: 1.5, tera: 2, crit: [1 / 24, 1 / 8, 1 / 2], critMult: 1.5, roll: [.85, .15],   // krytyk wg premii ruchu (0, 1, 2+); losowo ×[.85, 1]
  arena: 1.2, sleep: [1, 3], confuse: [2, 5], selfHit: 1 / 3, selfHitPower: 40, para: .25, thaw: .2,
  poison: 1 / 8, burn: 1 / 16, struggle: 50, struggleRecoil: 1 / 4, ohkoAcc: 30,
  ai: { random: .15, status: .3, horizon: 3, tempo: .5 },   // komputer: czasem losowo, wartość stanu (× życia rywala); wzmocnienie: ile tur liczy się zysk, ile ciosu warte uderzanie pierwszym
};
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/* trening (tryb rodzica może wyłączyć): poziom od LEVEL do max, perLevel EXP na poziom.
   EXP za wygraną = win × (siła rywala / własna)³, w granicach [minMult, maxMult]; przegrana: lose × tyle. Siła = suma statystyk z poziomem. */
const TRAIN = { max: 60, perLevel: 50, win: 25, lose: .2, minMult: .05, maxMult: 2, moveStep: 5 };
const levelOf = xp => Math.min(TRAIN.max, LEVEL + Math.floor((xp || 0) / TRAIN.perLevel));
/* ruchy: statystyki rosną tylko do TRAIN.max, ale każda ⭐ otwiera ruchy o moveStep poziomów dalej (⭐2 → do 60, ⭐10 → do 100);
   s.mvx (tools/build_species.js): [[poziom ruchów, 4 ruchy], …] */
const movesAt = (s, lv = LEVEL) => (s.mvx || []).reduce((mv, [L, m]) => L <= LEVEL + TRAIN.moveStep * (lv - LEVEL) ? m : mv, s.mv);
const power = f => Object.values(f.st).reduce((t, v) => t + v, 0) + f.hp0 / TUNE.hp;
const xpGain = (me, foe, won) => Math.max(won ? 1 : 0, Math.round(TRAIN.win * clampN((power(foe) / power(me)) ** 3, TRAIN.minMult, TRAIN.maxMult) * (won ? 1 : TRAIN.lose)));

// typ → [nazwa, ikona, kolor]
const TYPES = {
  normal: ['Normalny', '⚪', '#A8A77A'], fire: ['Ognisty', '🔥', '#EE8130'], water: ['Wodny', '💧', '#6390F0'], grass: ['Trawiasty', '🌿', '#7AC74C'],
  electric: ['Elektryczny', '⚡', '#F7D02C'], ice: ['Lodowy', '❄️', '#96D9D6'], fighting: ['Walczący', '🥊', '#C22E28'], poison: ['Trujący', '☠️', '#A33EA1'],
  ground: ['Ziemny', '🏜️', '#E2BF65'], flying: ['Latający', '🪽', '#A98FF3'], psychic: ['Psychiczny', '🔮', '#F95587'], bug: ['Robaczy', '🐛', '#A6B91A'],
  rock: ['Kamienny', '🪨', '#B6A136'], ghost: ['Duch', '👻', '#735797'], dragon: ['Smoczy', '🐉', '#6F35FC'], dark: ['Mroczny', '🌑', '#705746'],
  steel: ['Stalowy', '⚙️', '#B7B7CE'], fairy: ['Wróżkowy', '🧚', '#D685AD'],
};
// stan → [ikona, nazwa, typy odporne]
const STATUS = {
  poison: ['☠️', 'zatruty', ['poison', 'steel']], burn: ['🔥', 'oparzony', ['fire']], paralysis: ['⚡', 'sparaliżowany', ['electric']],
  sleep: ['💤', 'śpi', []], freeze: ['🧊', 'zamrożony', ['ice']], confusion: ['💫', 'zdezorientowany', []],
};
const STAT_ICON = { atk: '👊', def: '🛡️', satk: '✨', sdef: '🔰', spd: '💨', acc: '🎯', eva: '🌀' };   // widok: znaczki zmienionych statystyk
const STAT_PL = { atk: 'atak', def: 'obrona', satk: 'atak specjalny', sdef: 'obrona specjalna', spd: 'szybkość', acc: 'celność', eva: 'uniki' };
// klucze jak THEMES w arena3d.js; types: ruchy tych typów dostają premię ×TUNE.arena
const ARENAS = {
  plains: { name: 'Wielka łąka', icon: '🌾', types: ['normal', 'electric', 'psychic'] },
  forest: { name: 'Las Viridian', icon: '🌲', types: ['grass', 'bug'] },
  swamp: { name: 'Trujące bagna', icon: '🪷', types: ['poison', 'ghost'] },
  coast: { name: 'Plaża', icon: '🏝️', types: ['water', 'flying'] },
  deep: { name: 'Głębiny', icon: '🌊', types: ['water', 'dragon'] },
  cliffs: { name: 'Góra Księżycowa', icon: '⛰️', types: ['rock', 'flying', 'fairy'] },
  desert: { name: 'Pustynia', icon: '🏜️', types: ['ground', 'fighting'] },
  volcano: { name: 'Wyspa Cynamonowa', icon: '🌋', types: ['fire', 'dragon'] },
  tundra: { name: 'Lodowe wyspy', icon: '❄️', types: ['ice', 'psychic'] },
};
for (const a of Object.values(ARENAS)) a.desc = `Premia dla: ${a.types.map(t => TYPES[t][1] + ' ' + TYPES[t][0]).join(', ')}.`;
const STRUGGLE = { n: 'Szamotanina', t: 'normal', c: 'p', p: TUNE.struggle, pp: 1 };   // gdy skończą się PP

/* ---------- statystyki na poziomie L (domyślnie LEVEL, z treningu: s.lv; IV 31, bez EV) ---------- */
const lvStat = (b, L = LEVEL) => Math.floor((2 * b + 31) * L / 100) + 5;
const lvHP = (b, L = LEVEL) => Math.floor((Math.floor((2 * b + 31) * L / 100) + L + 10) * TUNE.hp);
const statsOf = s => { const L = s.lv || LEVEL; return { hp: lvHP(s.hp, L), attack: lvStat(Math.max(s.atk, s.satk), L), defense: lvStat((s.def + s.sdef) / 2, L), speed: lvStat(s.spd, L) }; };
// mnożnik typu t na obrońcę o typach def: Ognisty na Trawiasty/Robaczy = ×4, Normalny na Ducha = ×0
const typeMult = (t, def) => def.reduce((m, d) => m * (CHART[t]?.[d] ?? 1), 1);   // CHART[t] brak: cios bez typu (dezorientacja)
// stopień −6…+6 → mnożnik; celność i uniki mają łagodniejszą skalę
const stageMult = (n, base = 2) => n >= 0 ? (base + n) / base : base / (base - n);

/* ---------- teren: losowy spośród pasujących do typów zawodników ---------- */
function pickArena(a, b, rnd = Math.random) {
  const types = [...a.s.types, ...b.s.types], fit = Object.values(ARENAS).filter(ar => ar.types.some(t => types.includes(t)));
  return fit.length ? fit[Math.floor(rnd() * fit.length)] : ARENAS.plains;
}

/* ---------- formy: [zwykła, ...Mega, Tera]; Mega ma własne typy i statystyki, Tera = jeden typ w obronie (pierwszy), w nim STAB ×TUNE.tera, pozostałe typy zachowują zwykły STAB — jak w grach ---------- */
const forms = s => [s, ...(s.mega || []).map(m => ({ ...s, ...m, name: m.n, mega: undefined, form: 'mega' })), { ...s, types: s.types.slice(0, 1), stab: s.types, tera: s.types[0], name: `${s.name} 💎`, form: 'tera' }];
// rywal w tej samej formie co gracz, jeśli ją ma (Mega: pierwsza z jego Meg), inaczej zwykły
const formLike = (s, f) => forms(s).find(x => x.form && x.form === f.form) || s;

/* ---------- zawodnik ---------- */
function fighter(s) {
  const L = s.lv || LEVEL, st = { atk: lvStat(s.atk, L), def: lvStat(s.def, L), satk: lvStat(s.satk, L), sdef: lvStat(s.sdef, L), spd: lvStat(s.spd, L) }, hp = lvHP(s.hp, L);
  return { s, lv: L, id: s.id, name: s.name, st, hp, hp0: hp, moves: s.mv.map(k => ({ k, m: MOVES[k], pp: MOVES[k].pp })),
    stage: { atk: 0, def: 0, satk: 0, sdef: 0, spd: 0, acc: 0, eva: 0 }, status: null, sleep: 0, confused: 0, charging: null, recharge: false };
}
function newBattle(sa, sb, rnd = Math.random) {
  const a = fighter(sa), b = fighter(sb);
  return { a, b, arena: pickArena(a, b, rnd), round: 1, events: [], winner: null, rnd };
}
const eff = (f, k) => f.st[k] * stageMult(f.stage[k]) * (k === 'spd' && f.status === 'paralysis' ? .5 : 1);
const intRange = (rnd, [lo, hi]) => lo + Math.floor(rnd() * (hi - lo + 1));

/* obrażenia jednego trafienia; opts.avg → średnia bez losowania (dla komputera) */
function damageOf(B, att, def, m, { crit = false, avg = false } = {}) {
  if (m.fix) return m.fix === 'level' ? att.lv : m.fix === 'half' ? Math.max(1, Math.floor(def.hp / 2)) : m.fix;
  const phys = m.c === 'p', [ak, dk] = phys ? ['atk', 'def'] : ['satk', 'sdef'];
  const A = crit ? att.st[ak] * Math.max(1, stageMult(att.stage[ak])) : eff(att, ak), D = crit ? def.st[dk] * Math.min(1, stageMult(def.stage[dk])) : eff(def, dk);
  let d = Math.floor(Math.floor(Math.floor(2 * att.lv / 5 + 2) * m.p * A / D) / 50) + 2;
  d *= (att.s.tera === m.t ? TUNE.tera : (att.s.stab || att.s.types).includes(m.t) ? TUNE.stab : 1) * typeMult(m.t, def.s.types) * (B.arena.types.includes(m.t) ? TUNE.arena : 1);
  d *= (crit ? TUNE.critMult : 1) * (phys && att.status === 'burn' ? .5 : 1) * (avg ? TUNE.roll[0] + TUNE.roll[1] / 2 : TUNE.roll[0] + B.rnd() * TUNE.roll[1]);
  return typeMult(m.t, def.s.types) ? Math.max(1, Math.floor(d)) : 0;
}
const hits = (B, att, def, m) => !m.a && !m.ohko || B.rnd() * 100 < (m.ohko ? TUNE.ohkoAcc : m.a * stageMult(att.stage.acc - def.stage.eva, 3));

/* ---------- zdarzenia: każde niesie stan obu stron po sobie (hp, stan, zmienione statystyki sg) — widok animuje je po kolei ---------- */
const side = (B, f) => f === B.a ? 'a' : 'b';
const stages = f => Object.fromEntries(Object.entries(f.stage).filter(([, n]) => n));
const emitter = (B, att, def, out) => o => (out.push({ round: B.round, as: side(B, att), ds: side(B, def), att: att.id, def: def.id, ...o,
  hp: { a: B.a.hp, b: B.b.hp }, st: { a: B.a.status || (B.a.confused ? 'confusion' : null), b: B.b.status || (B.b.confused ? 'confusion' : null) }, sg: { a: stages(B.a), b: stages(B.b) } }), out);
/* ---------- stany i statystyki; on = strona, której dotyczy ---------- */
function inflict(B, f, ail, E) {
  if (ail === 'confusion') {
    if (f.confused) return false;
    f.confused = intRange(B.rnd, TUNE.confuse); E({ status: ail, on: side(B, f), text: `💫 ${f.name} jest zdezorientowany!` }); return true;
  }
  if (f.status || f.hp <= 0 || STATUS[ail][2].some(t => f.s.types.includes(t))) return false;
  f.status = ail; if (ail === 'sleep') f.sleep = intRange(B.rnd, TUNE.sleep);
  E({ status: ail, on: side(B, f), text: `${STATUS[ail][0]} ${f.name}: ${STATUS[ail][1]}!` }); return true;
}
function boost(B, f, st, E) {
  for (const [k, n] of st) {
    const was = f.stage[k]; f.stage[k] = clampN(was + n, -6, 6);
    E({ stat: k, n: f.stage[k] - was, on: side(B, f),
      text: f.stage[k] === was ? `${f.name}: ${STAT_PL[k]} już się nie zmieni.` : `${n > 0 ? '⬆️' : '⬇️'} ${f.name}: ${STAT_PL[k]} ${n > 0 ? 'rośnie' : 'spada'}${Math.abs(n) > 1 ? ' mocno' : ''}!` });
  }
}

/* ---------- jeden ruch; zwraca zdarzenia ---------- */
function useMove(B, att, def, slot) {
  const rnd = B.rnd, out = [], E = emitter(B, att, def, out);
  if (att.recharge) { att.recharge = false; return E({ skip: 'recharge', text: `😮‍💨 ${att.name} musi odpocząć.` }); }
  if (att.status === 'sleep') {   // sleep = ile tur jeszcze śpi
    if (att.sleep-- > 0) return E({ skip: 'sleep', text: `💤 ${att.name} śpi.` });
    att.status = null; E({ wake: true, text: `☀️ ${att.name} się budzi!` });
  }
  if (att.status === 'freeze') {
    if (rnd() >= TUNE.thaw) return E({ skip: 'freeze', text: `🧊 ${att.name} jest zamrożony!` });
    att.status = null; E({ wake: true, text: `💧 ${att.name} odmarza!` });
  }
  if (att.flinch) { att.flinch = false; return E({ skip: 'flinch', text: `😖 ${att.name} się wzdrygnął i nie atakuje!` }); }
  if (att.status === 'paralysis' && rnd() < TUNE.para) return E({ skip: 'paralysis', text: `⚡ ${att.name} jest sparaliżowany i nie może się ruszyć!` });
  if (att.confused) {   // confused = ile tur jeszcze
    if (!--att.confused) E({ wake: true, text: `${att.name} już nie jest zdezorientowany.` });
    else if (rnd() < TUNE.selfHit) {
      const d = damageOf(B, att, att, { t: '???', c: 'p', p: TUNE.selfHitPower }); att.hp = Math.max(0, att.hp - d);
      return E({ selfHit: true, damage: d, text: `💫 ${att.name} rani sam siebie (${d})!` });
    }
  }
  const mv = att.charging || (att.moves.every(x => !x.pp) ? { m: STRUGGLE } : att.moves[slot]), m = mv.m;
  if (!att.charging && mv.pp) mv.pp--;
  att.lastX = m.c === 'x';   // ruch bez obrażeń: komputer w następnej turze atakuje (aiMove)
  const ev = { move: mv.k, m };
  if (m.chg && !att.charging) { att.charging = mv; return E({ ...ev, charge: true, text: `✨ ${att.name} ładuje: ${m.n}…` }); }
  att.charging = null;
  if (!hits(B, att, def, m)) return E({ ...ev, miss: true, text: `💨 ${att.name}: ${m.n} — pudło!` });
  if (m.c === 'x') {   // bez obrażeń: stan, statystyki, leczenie
    if (m.heal) { const h = Math.min(att.hp0 - att.hp, Math.floor(att.hp0 * m.heal / 100)); att.hp += h; E({ ...ev, heal: h, text: `💚 ${att.name}: ${m.n} — +${h} życia.` }); }
    else E({ ...ev, text: `${att.name}: ${m.n}!` });
    if (m.ail && !inflict(B, def, m.ail, E)) E({ ...ev, fail: true, text: `…ale nic się nie dzieje.` });
    if (m.st) boost(B, m.self ? att : def, m.st, E);
    return out;
  }
  // z obrażeniami
  const tm = typeMult(m.t, def.s.types), n = m.hits ? (m.hits[0] === m.hits[1] ? m.hits[0] : [2, 2, 3, 3, 4, 5][Math.floor(rnd() * 6)]) : 1;
  let total = 0, crit = false;
  if (m.ohko && tm) total = def.hp;
  else for (let i = 0; i < n && def.hp - total > 0; i++) {
    const c = !m.fix && rnd() < TUNE.crit[Math.min(2, m.cr || 0)]; crit ||= c;
    total += damageOf(B, att, def, m, { crit: c });
  }
  total = Math.min(def.hp, total); def.hp -= total;
  const notes = [crit && '✨ krytyczny', n > 1 && `${n}×`, tm >= 2 && '💥 super skuteczny!', tm && tm < 1 && '😕 mało skuteczny', !tm && '🚫 nie działa', m.ohko && tm && '💀 nokaut jednym ciosem!'].filter(Boolean);
  E({ ...ev, damage: total, crit, eff: tm, hits: n, text: `${att.name}: ${m.n}${notes.length ? ' (' + notes.join(', ') + ')' : ''} — ${total} obrażeń.` });
  if (m.drain && total) {
    const d = Math.max(1, Math.floor(total * Math.abs(m.drain) / 100));
    if (m.drain > 0) { const h = Math.min(att.hp0 - att.hp, d); att.hp += h; E({ drain: h, text: `💚 ${att.name} wysysa ${h} życia.` }); }
    else { att.hp = Math.max(0, att.hp - d); E({ recoil: d, text: `💢 ${att.name} obrywa rykoszetem (${d}).` }); }
  }
  if (m === STRUGGLE) { const d = Math.floor(att.hp0 * TUNE.struggleRecoil); att.hp = Math.max(0, att.hp - d); E({ recoil: d, text: `💢 ${att.name} obrywa rykoszetem (${d}).` }); }
  if (def.hp > 0 && total) {
    if (m.ail && rnd() * 100 < m.ch) inflict(B, def, m.ail, E);
    if (m.fl && !def.moved && rnd() * 100 < m.fl) def.flinch = true;   // tylko na tego, kto jeszcze nie ruszył
    if (def.status === 'freeze' && m.t === 'fire') { def.status = null; E({ wake: true, on: side(B, def), text: `💧 ${def.name} odmarza!` }); }
  }
  if (m.st && rnd() * 100 < m.sc && (m.self ? att : def).hp > 0) boost(B, m.self ? att : def, m.st, E);
  if (m.rch) att.recharge = true;
  return out;
}
// koniec rundy: trucizna i oparzenie
function tick(B, f, out) {
  if (f.hp <= 0 || !['poison', 'burn'].includes(f.status)) return;
  const d = Math.max(1, Math.floor(f.hp0 * TUNE[f.status])); f.hp = Math.max(0, f.hp - d);
  emitter(B, f, f, out)({ tick: f.status, damage: d, text: `${STATUS[f.status][0]} ${f.name} traci ${d} życia (${STATUS[f.status][1]}).` });
}

/* ---------- komputer: wartość ruchu ≈ oczekiwane obrażenia (dobicie = najpewniejszy cios), stan wg TUNE.ai, wzmocnienie wg boostGain, leczenie wg healGain.
   Każda statystyka najwyżej raz, nigdy dwa ruchy bez obrażeń z rzędu – inaczej walka to seria „atak rośnie!” bez ciosów. ---------- */
/* wzmocnienie / osłabienie warte tyle, ile zmienia walkę: przyrost moich najlepszych obrażeń i spadek jego, razy tury, które mi zostały,
   plus część ciosu, gdy zaczynam uderzać pierwszy. Np. Groźna Mina szybszego Charizarda = 0, atak +1 bez ruchów fizycznych = 0 */
const best = (B, x, y) => Math.max(0, ...x.moves.filter(v => v.m.c !== 'x' && !v.m.ohko).map(v => damageOf(B, x, y, v.m, { avg: true }) * (v.m.a || 100) / 100));
function boostGain(B, me, foe, m) {
  const faster = () => eff(me, 'spd') > eff(foe, 'spd'), f = m.self ? me : foe, was = f.stage, a0 = best(B, me, foe), d0 = best(B, foe, me), s0 = faster();
  f.stage = { ...was }; for (const [k, n] of m.st) f.stage[k] = clampN(f.stage[k] + n, -6, 6);
  const a1 = best(B, me, foe), d1 = best(B, foe, me), s1 = faster(); f.stage = was;
  const turns = clampN(Math.ceil(me.hp / Math.max(1, d0)) - 1, 0, TUNE.ai.horizon);
  return (a1 - a0 + d0 - d1) * turns + (s1 && !s0 ? a1 * TUNE.ai.tempo : 0);
}
/* leczenie: tura bez ciosu za h życia, czyli h / d tur rywala (d: jego najlepszy cios), w których dalej biję po a.
   Opłaca się, gdy oddaje więcej, niż rywal zabiera na turę; prawie pełne życie → małe h → cios. */
function healGain(B, me, foe, m) {
  const h = Math.min(me.hp0 - me.hp, Math.floor(me.hp0 * m.heal / 100));
  return best(B, me, foe) * h / Math.max(1, best(B, foe, me));
}
function aiMove(B, me, foe) {
  const rnd = B.rnd, K = TUNE.ai, ok = me.moves.map((x, i) => [x, i]).filter(([x]) => x.pp);
  if (!ok.length) return 0;
  if (rnd() < K.random) { const r = ok.filter(([x]) => !me.lastX || x.m.c !== 'x'); if (r.length) return r[Math.floor(rnd() * r.length)][1]; }
  const score = ({ m }) => {
    const acc = m.a ? m.a / 100 : m.ohko ? TUNE.ohkoAcc / 100 : 1;
    if (m.c !== 'x') {
      const d = (m.ohko ? (typeMult(m.t, foe.s.types) ? foe.hp : 0) : damageOf(B, me, foe, m, { avg: true }) * (m.hits ? 3 : 1)) / (m.chg || m.rch ? 2 : 1);
      return d >= foe.hp ? foe.hp * (1 + acc) : d * acc;
    }
    if (me.lastX) return 0;   // po ruchu bez obrażeń: cios
    let v = 0;
    if (m.heal) v += healGain(B, me, foe, m);
    if (m.ail && !(m.ail === 'confusion' ? foe.confused : foe.status) && !STATUS[m.ail][2].some(t => foe.s.types.includes(t))) v += foe.hp0 * K.status * acc;
    if (m.st && me.hp > me.hp0 / 2 && m.st.some(([k, n]) => m.self ? n > 0 && me.stage[k] < 1 : n < 0 && foe.stage[k] > -1)) v += boostGain(B, me, foe, m);
    return v;
  };
  return ok.reduce((b, c) => score(c[0]) > score(b[0]) ? c : b)[1];
}

/* ---------- runda: kolejność wg priorytetu ruchu, potem szybkości; moveA = numer ruchu gracza albo undefined (komputer) ---------- */
function playRound(B, moveA) {
  const { a, b, rnd } = B, out = [];
  const pick = { [a.id]: moveA ?? aiMove(B, a, b), [b.id]: aiMove(B, b, a) };
  const prio = f => f.charging || f.recharge ? 0 : f.moves[pick[f.id]]?.m.pr || 0;
  const order = [a, b].sort((x, y) => prio(y) - prio(x) || eff(y, 'spd') - eff(x, 'spd') || rnd() - .5);
  a.moved = b.moved = false;
  for (const att of order) {
    const def = att === a ? b : a;
    att.moved = true;
    if (att.hp > 0 && def.hp > 0) out.push(...useMove(B, att, def, pick[att.id]));
  }
  a.flinch = b.flinch = false;
  for (const f of order) tick(B, f, out);
  B.round++;
  if (a.hp <= 0 || b.hp <= 0) B.winner = a.hp > 0 ? a : b.hp > 0 ? b : order[1];   // obaj padli: wygrywa ten, kto ruszał się drugi
  else if (B.round > ROUNDS) {
    const ar = a.hp / a.hp0, br = b.hp / b.hp0;
    B.winner = Math.abs(ar - br) < .001 ? (rnd() < .5 ? a : b) : ar > br ? a : b;
    out.push({ round: ROUNDS, timeout: true, text: `⏱️ Koniec czasu: ${B.winner.name} zachował więcej sił.` });
  }
  B.events.push(...out);
  return out;
}
function autoBattle(sa, sb, rnd) {
  const B = newBattle(sa, sb, rnd);
  while (!B.winner) playRound(B);
  return B;
}

if (typeof module !== 'undefined') module.exports = { LEVEL, TUNE, TRAIN, levelOf, xpGain, movesAt, TYPES, STATUS, ARENAS, STAT_ICON, statsOf, typeMult, forms, formLike, newBattle, playRound, autoBattle, aiMove };
