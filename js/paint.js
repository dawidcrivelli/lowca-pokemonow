/* ================= KOLOROWANKA =================
   Z oficjalnej grafiki Pokémona: czarne kontury (ciemne piksele + brzeg sylwetki) i pola między nimi.
   Narzędzia dla 4–6 lat: 🪣 wiadro (dotknij pole), 🖌️ pędzel, który nie wychodzi z pola, w którym zaczął (🔒; bez kłódki: swobodnie),
   🪄 magia (prawdziwe kolory Pokémona: dotknij pole albo maluj), ↶ cofnij, 👁 podgląd oryginału (przytrzymaj), 🗑️ od nowa.
   Bez zależności: Paint.open(host, src, { onSound, onChange }) → { destroy, dataURL }. Obrazek musi pozwalać na odczyt (CORS / data:). */
(function () {
'use strict';
const S = 640;                    // płótno S×S
const DARK = 40;                  // jasność (0–255) poniżej = zawsze kontur
const EDGE = .72, EDGE_MIN = 28;  // kontur: jaśniejsze otoczenie (× EDGE) i różnica co najmniej EDGE_MIN
const SOLID = 110;                // przezroczystość powyżej = Pokémon, poniżej = tło
const TINY = 24;                  // mniejsze pola doklejone do konturu (okruchy po cieniowaniu)
const COLORS = ['#E53935', '#FB8C00', '#FDD835', '#7CB342', '#2E7D32', '#4FC3F7', '#1E63D6', '#8E24AA', '#F48FB1', '#8D6E63', '#9E9E9E', '#212121', '#FFFFFF'];
const SIZES = [10, 26];

/* kontury i pola: label[i] = numer pola (0 = tło na zewnątrz, 1… = pola), -1 = kontur */
function analyse(img) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  const k = Math.min(S / img.naturalWidth, S / img.naturalHeight) * .94, w = img.naturalWidth * k, h = img.naturalHeight * k;
  g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  const orig = g.getImageData(0, 0, S, S), d = orig.data, N = S * S;
  const solid = new Uint8Array(N), line = new Uint8Array(N), lum = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    solid[i] = d[i * 4 + 3] >= SOLID;
    lum[i] = solid[i] ? .3 * d[i * 4] + .59 * d[i * 4 + 1] + .11 * d[i * 4 + 2] : 255;   // tło liczy się jak białe
  }
  /* kontur = piksel wyraźnie ciemniejszy niż jego otoczenie (średnia w kwadracie 2R+1), albo bardzo ciemny;
     dzięki temu ciemne plamy (Gengar, czarne łapy Lucario) zostają polami, a jasne linie (Mewtwo) się nie rwą */
  const R = 6, W = S + 1, sum = new Float64Array(W * W);
  for (let y = 0; y < S; y++) for (let x = 0, row = 0; x < S; x++) { row += lum[y * S + x]; sum[(y + 1) * W + x + 1] = sum[y * W + x + 1] + row; }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x; if (!solid[i]) continue;
    const x0 = Math.max(0, x - R), x1 = Math.min(S, x + R + 1), y0 = Math.max(0, y - R), y1 = Math.min(S, y + R + 1);
    const mean = (sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0]) / ((x1 - x0) * (y1 - y0));
    if (lum[i] < DARK || (lum[i] < mean * EDGE && mean - lum[i] > EDGE_MIN)) line[i] = 1;
  }
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {   // brzeg sylwetki
    const i = y * S + x;
    if (solid[i] && (!solid[i - 1] || !solid[i + 1] || !solid[i - S] || !solid[i + S])) line[i] = 1;
  }
  const thick = line.slice();   // pogrubienie o 1 px: domyka szczeliny w konturze
  for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
    const i = y * S + x;
    if (!line[i] && (line[i - 1] || line[i + 1] || line[i - S] || line[i + S])) thick[i] = 1;
  }
  const label = new Int32Array(N).fill(-2), stack = new Int32Array(N), sizes = [];
  let n = 0;
  for (let s = 0; s < N; s++) {
    if (label[s] !== -2) continue;
    if (thick[s]) { label[s] = -1; continue; }
    const inside = solid[s], id = n++;
    let top = 0, cnt = 0; stack[top++] = s; label[s] = id;
    while (top) {
      const i = stack[--top]; cnt++;
      const x = i % S;
      for (const j of [x > 0 ? i - 1 : -1, x < S - 1 ? i + 1 : -1, i - S, i + S]) {
        if (j < 0 || j >= N || label[j] !== -2 || thick[j] || solid[j] !== inside) continue;
        label[j] = id; stack[top++] = j;
      }
    }
    sizes[id] = cnt;
  }
  for (let i = 0; i < N; i++) if (label[i] >= 0 && sizes[label[i]] < TINY) { label[i] = -1; thick[i] = 1; }
  const lines = new ImageData(S, S);   // czarne kontury, reszta przezroczysta
  for (let i = 0; i < N; i++) if (thick[i]) lines.data[i * 4 + 3] = 255;
  return { orig, label, lines };
}

function open(host, src, opts = {}) {
  host.innerHTML = `<div class="paint">
    <div class="pt-bar">
      <button data-tool="fill" class="on" title="Wiadro: dotknij pole">🪣</button>
      <button data-tool="brush" title="Pędzel">🖌️</button>
      <button data-tool="magic" title="Magia: prawdziwe kolory">🪄</button>
      <span class="pt-sp"></span>
      <button data-size="1" class="pt-size" title="Grubość pędzla">⬤</button>
      <button data-lock="1" class="on" title="Nie wychodź za linie">🔒</button>
      <button data-undo="1" title="Cofnij">↶</button>
      <button data-peek="1" title="Przytrzymaj: jak wygląda naprawdę">👁</button>
      <button data-clear="1" title="Od nowa">🗑️</button>
    </div>
    <div class="pt-stage"><canvas width="${S}" height="${S}"></canvas><img class="pt-peek" alt="" hidden><div class="pt-wait">✏️ Rysuję kontury…</div></div>
    <div class="pt-colors">${COLORS.map((c, i) => `<button data-color="${c}" class="${i ? '' : 'on'}" style="--c:${c}" aria-label="kolor"></button>`).join('')}</div>
  </div>`;
  const root = host.firstElementChild, cv = root.querySelector('canvas'), g = cv.getContext('2d', { willReadFrequently: true });
  const st = { tool: 'fill', color: COLORS[0], size: 1, lock: true, A: null, paint: null, undo: [], strokeId: null, last: null };
  const lineCv = document.createElement('canvas'); lineCv.width = lineCv.height = S;
  const sound = (f, v) => opts.onSound?.(f, v);

  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    st.A = analyse(img);
    lineCv.getContext('2d').putImageData(st.A.lines, 0, 0);
    st.paint = new ImageData(S, S); st.paint.data.fill(255);
    root.querySelector('.pt-peek').src = src;
    root.querySelector('.pt-wait').remove();
    draw();
  };
  img.onerror = () => { root.querySelector('.pt-wait').textContent = '😕 Nie udało się wczytać obrazka.'; };
  img.src = src;

  function draw() { g.putImageData(st.paint, 0, 0); g.drawImage(lineCv, 0, 0); }
  const rgb = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
  function setPx(i, col) {   // col: [r,g,b] albo null = magia (oryginał; tło zostaje białe)
    const p = st.paint.data, o = st.A.orig.data, j = i * 4;
    if (col) { p[j] = col[0]; p[j + 1] = col[1]; p[j + 2] = col[2]; }
    else if (st.A.label[i] === 0 || o[j + 3] < SOLID) { p[j] = p[j + 1] = p[j + 2] = 255; }
    else { p[j] = o[j]; p[j + 1] = o[j + 1]; p[j + 2] = o[j + 2]; }
  }
  const colNow = () => st.tool === 'magic' ? null : rgb(st.color);
  function fill(id) {
    const L = st.A.label, col = colNow();
    for (let i = 0; i < L.length; i++) if (L[i] === id) setPx(i, col);
    draw(); sound(st.tool === 'magic' ? 880 : 660, .07); opts.onChange?.();
  }
  function dab(x, y) {
    const r = SIZES[st.size], L = st.A.label, col = colNow();
    for (let yy = Math.max(0, y - r | 0); yy <= Math.min(S - 1, y + r); yy++) for (let xx = Math.max(0, x - r | 0); xx <= Math.min(S - 1, x + r); xx++) {
      if ((xx - x) ** 2 + (yy - y) ** 2 > r * r) continue;
      const i = yy * S + xx;
      if (L[i] < 0 || (st.strokeId !== null && L[i] !== st.strokeId)) continue;
      setPx(i, col);
    }
  }
  /* pole pod palcem; na konturze: najbliższe pole w promieniu kilku pikseli */
  function regionAt(x, y) {
    const L = st.A.label;
    for (let r = 0; r <= 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < S && yy < S && L[yy * S + xx] >= 0) return L[yy * S + xx];
    }
    return null;
  }
  const pos = e => { const b = cv.getBoundingClientRect(); return [Math.round((e.clientX - b.left) / b.width * S), Math.round((e.clientY - b.top) / b.height * S)]; };
  function snapshot() { st.undo.push(st.paint.data.slice()); if (st.undo.length > 25) st.undo.shift(); }

  cv.addEventListener('pointerdown', e => {
    if (!st.A) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const [x, y] = pos(e), id = regionAt(x, y);
    snapshot();
    if (st.tool === 'fill') { if (id !== null) fill(id); st.last = null; return; }
    st.strokeId = st.lock || st.tool === 'magic' ? id : null;   // magia zawsze w polu: dotknięcie = całe pole
    st.last = [x, y]; st.moved = false;
    dab(x, y); draw();
  });
  cv.addEventListener('pointermove', e => {
    if (!st.last) return;
    const [x, y] = pos(e), [x0, y0] = st.last, dist = Math.hypot(x - x0, y - y0), step = Math.max(1, SIZES[st.size] / 3);
    for (let t = step; t <= dist; t += step) dab(x0 + (x - x0) * t / dist, y0 + (y - y0) * t / dist);
    if (dist >= step) { st.last = [x, y]; st.moved = true; draw(); }
  });
  const end = () => {
    if (!st.last) return;
    if (st.tool === 'magic' && !st.moved && st.strokeId !== null) fill(st.strokeId);   // magia: dotknięcie = całe pole
    else opts.onChange?.();
    st.last = null; st.strokeId = null;
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

  root.querySelector('.pt-bar').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !st.A) return;
    const d = b.dataset;
    if (d.tool) { st.tool = d.tool; root.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x === b)); sound(520, .04); }
    if (d.size) { st.size = 1 - st.size; b.classList.toggle('small', !st.size); sound(440, .04); }
    if (d.lock) { st.lock = !st.lock; b.classList.toggle('on', st.lock); b.textContent = st.lock ? '🔒' : '🔓'; sound(st.lock ? 600 : 400, .05); }
    if (d.undo && st.undo.length) { st.paint.data.set(st.undo.pop()); draw(); sound(380, .05); }
    if (d.clear) { snapshot(); st.paint.data.fill(255); draw(); sound(300, .08); }
  });
  const peek = root.querySelector('.pt-peek'), pb = root.querySelector('[data-peek]');
  pb.addEventListener('pointerdown', () => { peek.hidden = false; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) pb.addEventListener(ev, () => { peek.hidden = true; });
  root.querySelector('.pt-colors').addEventListener('click', e => {
    const b = e.target.closest('[data-color]'); if (!b) return;
    st.color = b.dataset.color; root.querySelectorAll('[data-color]').forEach(x => x.classList.toggle('on', x === b));
    if (st.tool === 'magic') { st.tool = 'fill'; root.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === 'fill')); }   // kolor po magii: z powrotem wiadro
    sound(500 + COLORS.indexOf(st.color) * 25, .04);
  });
  return { destroy: () => { host.innerHTML = ''; }, dataURL: () => cv.toDataURL('image/png'), state: st };
}

window.Paint = { open, analyse, COLORS };
})();
