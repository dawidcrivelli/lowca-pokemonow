/* ================= KARTY – uproszczona gra karciana (bez DOM) =================
   Zasady jak w Battle Academy, bez talii do dociągania:
   - drużyna: do 3 Pokémonów Podstawowych (Basic); pierwszy walczy (aktywny), reszta czeka na ławce
   - w swojej turze: energia do aktywnego dochodzi sama na start tury (1×, jedyny sensowny wybór bez ręki kart), 1× ewoluuj go (nie w turze, w której wszedł), 1× odwrót (zapłać energią),
     na koniec atak (koszt = liczba energii) — atak kończy turę
   - słabość ×2, odporność −30; „×” i „+” wg opisu ataku (fx.by: monety, energia, rany, ławka, stan rywala…), bez rozpoznanego opisu: rzut monetą
   - efekty z opisu ataku (fx, tools/build_species.js): stany, leczenie, obrażenia na ławce i w siebie, zrzut energii (swojej / rywala),
     odpoczynek w następnej turze (lock), ochrona w następnej turze rywala (guard), rywal nie atakuje (foelock) — trwają, aż Pokémon zejdzie lub ewoluuje
   - stany jak w grze: zatruty −10 i oparzony −20 (potem rzut: orzeł leczy) między turami; śpiący: rzut, orzeł budzi;
     sparaliżowany: przechodzi po swojej następnej turze; śpiący i sparaliżowany nie atakuje ani nie ucieka;
     zdezorientowany: przy ataku rzut, reszka = 30 w siebie i koniec. Ewolucja i odwrót leczą stany.
   - pokonany Pokémon daje 1 nagrodę (ex: 2); wygrywa, kto zbierze PRIZES albo pokona wszystkich
   Stan:  D = { me, cpu, who: 'me'|'cpu', n: nr tury, winner }
          strona = { team: [{ sp, dmg, en, since, poison, burn, cond: 'sleep'|'paralyze'|'confuse', paraN, lock: {n, k}, guard: {n, x, basic} }], prizes, did: {energy, evolve, retreat} }
          lock.n / guard.n = numer tury, której dotyczą (lock.k: atak, −1 = każdy) */
const PRIZES = 3, TEAM = 3, MAX_TURNS = 60;   // bez talii nikt nie przegra przez brak kart: po MAX_TURNS wygrywa ten z większą liczbą nagród, potem z mniejszymi ranami
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
const heal = m => Object.assign(m, { poison: false, burn: false, cond: null, lock: null, guard: null });   // odwrót i ewolucja zdejmują stany i efekty ataków
const canUse = (D, m, k) => !(m.lock && m.lock.n === D.n && (m.lock.k < 0 || m.lock.k === k));   // odpoczynek po mocnym ataku
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
/* obrażenia „×” / „+” przed słabością → [obrażenia, opis]; avg: wartość oczekiwana (komputer, bez rzutów) */
function attackDamage(D, m, t, base, kind, fx, rnd, avg) {
  if (!kind) return [base, ''];
  const me = D[D.who], op = foe(D), flip = () => avg ? .5 : +heads(rnd), x = fx.x ?? base;
  let n, note = '';
  switch (fx.by) {
    case 'flips': n = avg ? fx.n / 2 : Array.from({ length: fx.n }, () => heads(rnd)).filter(Boolean).length; note = `🪙 ${n}/${fx.n} orzeł`; break;
    case 'tails': if (avg) n = 1; else { n = 0; while (n < 20 && heads(rnd)) n++; } note = `🪙 ${n}× orzeł`; break;
    case 'coin': n = flip(); note = `🪙 ${n ? 'orzeł' : 'reszka'}`; break;
    case 'en': n = m.en; break;
    case 'mydmg': n = m.dmg / 10; break;
    case 'foedmg': n = t.dmg / 10; break;
    case 'foeen': n = t.en; break;
    case 'bench': n = me.team.length - 1; break;
    case 'team': n = me.team.length; break;
    case 'foebench': n = op.team.length - 1; break;
    case 'hurt': n = +(m.dmg > 0); break;
    case 'foehurt': n = +(t.dmg > 0); break;
    case 'foecond': n = +(fx.cond ? conds(t).includes(fx.cond) : conds(t).length > 0); break;
    case 'foeex': n = +!!t.sp.card.ex; break;
    case 'foetype': n = +(t.sp.card.t === fx.t); break;
    case 'behind': n = +(me.prizes < op.prizes); break;   // więcej nagród do zebrania niż rywal
    case 'opt': n = 1; break;
    default:   // opis nierozpoznany (ręka, talia, stadion…): rzut monetą jak dawniej
      if (kind === '×') { n = avg ? 1 : [0, 0].filter(() => heads(rnd)).length; return [base * n, `🪙 ${n}× orzeł`]; }
      n = flip(); return [base * (1 + n), `🪙 ${n ? 'orzeł' : 'reszka'}`];
  }
  if (kind === '×') return [base * n, note || `${n}× ${base}`];
  return [base + x * n, note || (n ? `+${x * n}` : '')];
}
function cardAttack(D, k, rnd = Math.random) {
  const m = active(D), [name, cost, base, kind, fx = {}] = m.sp.card.atk[k] || [], who = D.who, def = foe(D), t = def.team[0];
  if (!name || !canPay(m, cost) || !canAct(m) || !canUse(D, m, k)) return null;
  const ev = { attack: true, dmg: 0, on: other(who), text: `${m.sp.name}: ${name}` };
  if (m.cond === 'confuse' && !heads(rnd)) { ev.text += ` — 💫 reszka, rani sam siebie (${CONFUSE_SELF})!`; ev.self = true; hurt(D, who, 0, CONFUSE_SELF, ev); return ev; }
  if (fx.fail && !heads(rnd)) { ev.text += ' — 🪙 reszka, nic się nie dzieje.'; return ev; }
  let [dmg, how] = attackDamage(D, m, t, base, kind, fx, rnd);
  const notes = how ? [how] : [];
  if (dmg && t.sp.card.weak === m.sp.card.t) { dmg *= WEAK; notes.push('💥 słabość ×2'); }
  if (dmg && t.sp.card.res === m.sp.card.t) { dmg = Math.max(0, dmg - RESIST); notes.push(`🛡️ odporność −${RESIST}`); }
  const g = t.guard;
  if (dmg && g && g.n === D.n && (!g.basic || m.sp.card.st === 0)) { const cut = Math.min(dmg, g.x); dmg -= cut; notes.push(g.x >= 999 ? '🛡️ pełna ochrona' : `🛡️ ochrona −${cut}`); }
  ev.dmg = dmg; ev.text += `${notes.length ? ' (' + notes.join(', ') + ')' : ''}${dmg ? ` — ${dmg} obrażeń.` : '!'}`;
  hurt(D, other(who), 0, dmg, ev);
  if (fx.cond && def.team[0] === t && (!fx.coin || heads(rnd))) {
    if (fx.cond === 'poison' || fx.cond === 'burn') t[fx.cond] = true; else Object.assign(t, { cond: fx.cond, paraN: D.n });
    ev.cond = fx.cond; ev.text += ` ${COND_ICON[fx.cond]} ${t.sp.name}: ${COND_PL[fx.cond]}!`;
  } else if (fx.cond && fx.coin) ev.text += ' 🪙 reszka.';
  if (fx.heal && m.dmg) { const h = Math.min(m.dmg, fx.heal); m.dmg -= h; ev.heal = h; ev.text += ` 💚 +${h}.`; }
  if (fx.disc) { m.en = Math.max(0, m.en - fx.disc); ev.text += ` Zrzuca energię.`; }
  if (fx.foedisc && t.en && def.team[0] === t && (!fx.fdcoin || heads(rnd))) { t.en--; ev.text += ` ${t.sp.name} traci energię.`; }
  if (fx.lock) { m.lock = { n: D.n + 2, k: fx.lock === 2 ? k : -1 }; ev.text += ` 😮‍💨 W następnej turze ${fx.lock === 2 ? 'nie użyje tego ataku' : 'odpoczywa'}.`; }
  if (fx.foelock && def.team[0] === t) { t.lock = { n: D.n + 1, k: -1 }; ev.text += ` ${t.sp.name} nie zaatakuje w następnej turze.`; }
  if (fx.gko && !ev.ko) {}   // ochrona tylko po pokonaniu rywala
  else if (fx.guard && (!fx.gcoin || heads(rnd))) { m.guard = { n: D.n + 1, x: fx.guard, basic: fx.gbasic }; ev.text += ` 🛡️ W następnej turze rywala: ${fx.guard >= 999 ? 'pełna ochrona' : `−${fx.guard} obrażeń`}.`; }
  else if (fx.guard) ev.text += ' 🪙 reszka — bez ochrony.';
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
  if (!D.winner && D.n >= MAX_TURNS) {   // np. dwa Cloystery z ochroną −80 przy ataku za 80
    const hurt = w => D[w].team.reduce((t, m) => t + m.dmg / m.sp.card.hp, 0) - D[w].team.length;
    D.winner = D.me.prizes !== D.cpu.prizes ? (D.me.prizes > D.cpu.prizes ? 'me' : 'cpu') : hurt('me') <= hurt('cpu') ? 'me' : 'cpu';
    evs.push({ text: `⏱️ Koniec czasu: wygrywa ${D.winner === 'me' ? 'gracz' : 'komputer'} (więcej nagród, mniej ran).` });
    return evs;
  }
  if (!D.winner) { D.who = other(D.who); D[D.who].did = {}; D.n++; evs.push(attachEnergy(D)); }   // nowa tura: energia sama
  return evs;
}
// czy w tej turze da się jeszcze coś zrobić (energia, ewolucja, odwrót, atak)? nie → widok kończy turę sam
function canDoMore(D, have = () => true) {
  const s = D[D.who], m = s.team[0];
  return !s.did.energy || evolutionsOf(D, have).length > 0 || (!s.did.retreat && s.team.length > 1 && m.en >= m.sp.card.ret && canAct(m))
    || (canAct(m) && m.sp.card.atk.some((a, k) => canPay(m, a[1]) && canUse(D, m, k)));
}
/* tura komputera: ewolucja, energia, najlepszy atak, na który go stać (obrażenia + premia za stan / leczenie) → lista zdarzeń
   have: w co komputer może ewoluować — w grze to samo co gracz (złapane), żeby było uczciwie */
function cpuTurn(D, rnd = Math.random, have = () => true) {
  const evs = [], push = e => e && evs.push(e), evo = evolutionsOf(D, have);
  if (evo.length) push(evolve(D, evo[Math.floor(rnd() * evo.length)]));
  push(attachEnergy(D));
  const m = active(D), t = foe(D).team[0];
  // wartość ataku ≈ oczekiwane obrażenia (ze słabością, odpornością, ochroną rywala; dobicie +50) + stan, leczenie, ochrona; minus zrzut energii i odpoczynek
  const value = ([, , base, kind, fx = {}]) => {
    let d = attackDamage(D, m, t, base, kind, fx, rnd, true)[0] * (fx.fail ? .5 : 1);
    if (d && t.sp.card.weak === m.sp.card.t) d *= WEAK;
    if (d && t.sp.card.res === m.sp.card.t) d = Math.max(0, d - RESIST);
    if (t.guard?.n === D.n && (!t.guard.basic || m.sp.card.st === 0)) d = Math.max(0, d - t.guard.x);
    return d + (d >= t.sp.card.hp - t.dmg ? 50 : 0) + (fx.cond && !conds(t).includes(fx.cond) ? 20 : 0) + (fx.heal && m.dmg ? Math.min(m.dmg, fx.heal) : 0)
      + (fx.guard ? Math.min(fx.guard, 60) * (fx.gcoin ? .5 : 1) : 0) - (fx.self || 0) / 2 - Math.min(fx.disc || 0, m.en) * 5 - (fx.lock ? 15 : 0);
  };
  const atk = m.sp.card.atk.map((a, k) => [a, k]).filter(([a, k]) => canPay(m, a[1]) && canUse(D, m, k)).sort((x, y) => value(y[0]) - value(x[0]))[0];
  if (atk && canAct(m)) push(cardAttack(D, atk[1], rnd));
  evs.push(...endTurn(D, rnd));
  return evs;
}

if (typeof module !== 'undefined') module.exports = { PRIZES, TEAM, canUse, attackDamage, ENERGY_ICON, COND_ICON, newDuel, active, foe, canPay, canAct, conds, evolutionsOf, attachEnergy, evolve, retreat, cardAttack, endTurn, canDoMore, cpuTurn };
