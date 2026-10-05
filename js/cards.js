/* ================= KARTY – uproszczona gra karciana (bez DOM) =================
   Zasady jak w Battle Academy, bez talii do dociągania:
   - drużyna: do 3 Pokémonów Podstawowych (Basic); pierwszy walczy (aktywny), reszta czeka na ławce
   - w swojej turze: 1× dołącz energię do aktywnego, 1× ewoluuj go (nie w turze, w której wszedł), 1× odwrót (zapłać energią),
     na koniec atak (koszt = liczba energii) — atak kończy turę
   - słabość ×2, odporność −30; „×” = obrażenia za każdego orła z 2 rzutów, „+” = orzeł dokłada drugie tyle
   - efekty z opisu ataku (fx, tools/build_species.js): stany, leczenie, obrażenia na ławce i w siebie, zrzut energii
   - stany jak w grze: zatruty −10 i oparzony −20 (potem rzut: orzeł leczy) między turami; śpiący: rzut, orzeł budzi;
     sparaliżowany: przechodzi po swojej następnej turze; śpiący i sparaliżowany nie atakuje ani nie ucieka;
     zdezorientowany: przy ataku rzut, reszka = 30 w siebie i koniec. Ewolucja i odwrót leczą stany.
   - pokonany Pokémon daje 1 nagrodę (ex: 2); wygrywa, kto zbierze PRIZES albo pokona wszystkich
   Stan:  D = { me, cpu, who: 'me'|'cpu', n: nr tury, winner }
          strona = { team: [{ sp, dmg, en, since, poison, burn, cond: 'sleep'|'paralyze'|'confuse', paraN }], prizes, did: {energy, evolve, retreat} } */
const PRIZES = 3, TEAM = 3;
const RESIST = 30, WEAK = 2, FLIPS = 2;
const POISON = 10, BURN = 20, CONFUSE_SELF = 30;
const ENERGY_ICON = { G: '🌿', R: '🔥', W: '💧', L: '⚡', P: '🔮', F: '👊', D: '🌑', M: '⚙️', C: '⚪', N: '🐉' };
const COND_ICON = { poison: '☠️', burn: '🔥', sleep: '💤', paralyze: '⚡', confuse: '💫' };
const COND_PL = { poison: 'zatruty', burn: 'oparzony', sleep: 'zasypia', paralyze: 'sparaliżowany', confuse: 'zdezorientowany' };

const FIRST_EVOLVE_TURN = 3;   // nikt nie ewoluuje w swojej pierwszej turze (tury 1 i 2)
const cardsSide = team => ({ team: team.map(sp => ({ sp, dmg: 0, en: 0, since: FIRST_EVOLVE_TURN - 1 })), prizes: 0, did: {} });
const newDuel = (mine, theirs) => ({ me: cardsSide(mine), cpu: cardsSide(theirs), who: 'me', n: 1, winner: null });
const other = who => who === 'me' ? 'cpu' : 'me';
const foe = (D, who = D.who) => D[other(who)];
const active = (D, who = D.who) => D[who].team[0];
const canPay = (m, cost) => m.en >= cost.length;
const canAct = m => m.cond !== 'sleep' && m.cond !== 'paralyze';
const conds = m => [m.poison && 'poison', m.burn && 'burn', m.cond].filter(Boolean);
const heal = m => Object.assign(m, { poison: false, burn: false, cond: null });
const heads = rnd => rnd() < .5;
// ewolucje aktywnego; have = czy gracz ma tego Pokémona (CPU: wszystkie)
const evolutionsOf = (D, have = () => true) => {
  const m = active(D);
  return D[D.who].did.evolve || m.since >= D.n ? [] : SPECIES.filter(s => s.from === m.sp.id && have(s));
};

function attachEnergy(D) {
  const s = D[D.who]; if (s.did.energy) return null;
  s.did.energy = true; active(D).en++;
  return { text: `${ENERGY_ICON[active(D).sp.card.t]} ${active(D).sp.name} dostaje energię (${active(D).en}).` };
}
function evolve(D, to) {
  const m = active(D), from = m.sp;
  if (!evolutionsOf(D).includes(to)) return null;
  Object.assign(heal(m), { sp: to, since: D.n }); D[D.who].did.evolve = true;
  return { evolve: true, text: `🧬 ${from.name} ewoluuje w ${to.name}!` };
}
function retreat(D, i) {
  const s = D[D.who], m = s.team[0], cost = m.sp.card.ret;
  if (s.did.retreat || !s.team[i] || m.en < cost || !canAct(m)) return null;
  m.en -= cost; heal(m); [s.team[0], s.team[i]] = [s.team[i], s.team[0]]; s.did.retreat = true;
  return { text: `↩️ ${m.sp.name} wraca na ławkę, walczy ${s.team[0].sp.name}.` };
}
/* obrażenia dla Pokémona w drużynie `who` (i = miejsce); pokonany schodzi, przeciwnik bierze nagrody → dopisuje do ev.text */
function hurt(D, who, i, dmg, ev) {
  const s = D[who], t = s.team[i]; if (!t || !dmg) return;
  t.dmg += dmg;
  if (t.dmg < t.sp.card.hp) return;
  const won = t.sp.card.ex ? 2 : 1, by = other(who);
  D[by].prizes += won; s.team.splice(i, 1);
  (ev.ko ||= []).push(t.sp); ev.text += ` ${t.sp.name} pokonany! +${won} 🎴`;
  if (D[by].prizes >= PRIZES || !s.team.length) D.winner = D.winner || by;
  else if (!i) ev.text += ` Wchodzi ${s.team[0].sp.name}.`;
}
/* atak: obrażenia z karty × słabość − odporność, potem efekty z fx */
function cardAttack(D, k, rnd = Math.random) {
  const m = active(D), [name, cost, base, kind, fx = {}] = m.sp.card.atk[k] || [], who = D.who, def = foe(D), t = def.team[0];
  if (!name || !canPay(m, cost) || !canAct(m)) return null;
  const ev = { attack: true, dmg: 0, on: other(who), text: `${m.sp.name}: ${name}` };
  if (m.cond === 'confuse' && !heads(rnd)) { ev.text += ` — 💫 reszka, rani sam siebie (${CONFUSE_SELF})!`; ev.self = true; hurt(D, who, 0, CONFUSE_SELF, ev); return ev; }
  if (fx.fail && !heads(rnd)) { ev.text += ' — 🪙 reszka, nic się nie dzieje.'; return ev; }
  const flips = kind ? Array.from({ length: FLIPS }, () => heads(rnd)).filter(Boolean).length : 0;
  let dmg = kind === '×' ? base * flips : kind === '+' ? base * (1 + Math.min(1, flips)) : base;
  const notes = kind ? [`🪙 ${flips}× orzeł`] : [];
  if (dmg && t.sp.card.weak === m.sp.card.t) { dmg *= WEAK; notes.push('💥 słabość ×2'); }
  if (dmg && t.sp.card.res === m.sp.card.t) { dmg = Math.max(0, dmg - RESIST); notes.push(`🛡️ odporność −${RESIST}`); }
  ev.dmg = dmg; ev.text += `${notes.length ? ' (' + notes.join(', ') + ')' : ''}${dmg ? ` — ${dmg} obrażeń.` : '!'}`;
  hurt(D, other(who), 0, dmg, ev);
  if (fx.cond && def.team[0] === t && (!fx.coin || heads(rnd))) {
    if (fx.cond === 'poison' || fx.cond === 'burn') t[fx.cond] = true; else Object.assign(t, { cond: fx.cond, paraN: D.n });
    ev.cond = fx.cond; ev.text += ` ${COND_ICON[fx.cond]} ${t.sp.name}: ${COND_PL[fx.cond]}!`;
  } else if (fx.cond && fx.coin) ev.text += ' 🪙 reszka.';
  if (fx.heal && m.dmg) { const h = Math.min(m.dmg, fx.heal); m.dmg -= h; ev.heal = h; ev.text += ` 💚 +${h}.`; }
  if (fx.disc) { m.en = Math.max(0, m.en - fx.disc); ev.text += ` Zrzuca energię.`; }
  if (fx.bench && def.team.length > 1) { ev.text += ` Ławka: ${def.team[1].sp.name} −${fx.bench}.`; hurt(D, other(who), 1, fx.bench, ev); }
  if (fx.self) { ev.text += ` 💢 W siebie −${fx.self}.`; hurt(D, who, 0, fx.self, ev); }
  return ev;
}
/* między turami: trucizna, oparzenie, sen; paraliż mija po turze właściciela → lista zdarzeń */
function checkup(D, rnd) {
  const evs = [];
  for (const who of ['me', 'cpu']) {
    const m = D[who].team[0]; if (!m || D.winner) continue;
    const ev = { on: who, text: '' }, say = s => ev.text += (ev.text ? ' ' : '') + s;
    if (m.poison) { say(`☠️ ${m.sp.name} traci ${POISON} (trucizna).`); ev.dmg = POISON; }
    if (m.burn) { const cured = heads(rnd); say(`🔥 ${m.sp.name} traci ${BURN} (oparzenie)${cured ? ', 🪙 orzeł — już nie płonie' : ''}.`); ev.dmg = (ev.dmg || 0) + BURN; m.burn = !cured; }
    if (m.cond === 'sleep' && heads(rnd)) { m.cond = null; say(`☀️ ${m.sp.name} się budzi (🪙 orzeł).`); }
    if (m.cond === 'paralyze' && who === D.who && D.n > m.paraN) { m.cond = null; say(`${m.sp.name} może się już ruszać.`); }
    if (!ev.text) continue;
    hurt(D, who, 0, ev.dmg, ev); evs.push(ev);
  }
  return evs;
}
function endTurn(D, rnd = Math.random) {
  if (D.winner) return [];
  const evs = checkup(D, rnd);
  if (!D.winner) { D.who = other(D.who); D[D.who].did = {}; D.n++; }
  return evs;
}
/* tura komputera: ewolucja, energia, najlepszy atak, na który go stać (obrażenia + premia za stan / leczenie) → lista zdarzeń */
function cpuTurn(D, rnd = Math.random) {
  const evs = [], push = e => e && evs.push(e), evo = evolutionsOf(D);
  if (evo.length) push(evolve(D, evo[Math.floor(rnd() * evo.length)]));
  push(attachEnergy(D));
  const m = active(D), t = foe(D).team[0];
  const value = ([, , dmg, kind, fx = {}]) => dmg * (kind ? 1.25 : 1) * (fx.fail ? .5 : 1) + (fx.cond && !conds(t).includes(fx.cond) ? 20 : 0) + (fx.heal && m.dmg ? Math.min(m.dmg, fx.heal) : 0) - (fx.self || 0) / 2;
  const atk = m.sp.card.atk.map((a, k) => [a, k]).filter(([a]) => canPay(m, a[1])).sort((x, y) => value(y[0]) - value(x[0]))[0];
  if (atk && canAct(m)) push(cardAttack(D, atk[1], rnd));
  evs.push(...endTurn(D, rnd));
  return evs;
}

if (typeof module !== 'undefined') module.exports = { PRIZES, TEAM, ENERGY_ICON, COND_ICON, newDuel, active, foe, canPay, canAct, conds, evolutionsOf, attachEnergy, evolve, retreat, cardAttack, endTurn, cpuTurn };
