/* ================= ARENA 3D (widok opcjonalny) =================
   Tylko prezentacja: te same zdarzenia z playRound() co widok 2D, paski życia i dziennik zostają w HTML.
   Pokémony stoją jako wytłoczone obrazki (oficjalne grafiki z PokeAPI) na terenie z low-poly.
   Three.js ładowany dopiero przy pierwszej walce 3D. Brak WebGL / pliku → zostaje widok 2D.
   Usunięcie: skasuj ten plik, vendor/three.min.js oraz linie z „Arena3D” w app.js, index.html, sw.js i css.

        kamera (lekko krąży, trzęsie się przy mocnym ciosie)
             \
      [ A ] ---GAP--- · ---GAP--- [ B ]      A patrzy w +x, B w −x, obaj lekko obróceni do kamery
      ~~~~~~~~~~~~ teren wg ARENAS ~~~~~~~~~~~~ */
window.Arena3D = (() => {
  const THREE_SRC = 'vendor/three.min.js';
  const ok = (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; } })();
  const GAP = 2.2, YAW = 0.35;                    // połowa dystansu między zawodnikami; obrót 3/4 do kamery
  const H_MAX = 2.4, RATIO_MIN = 0.5;              // wysokość większego; najmniejszy ułamek
  const DODGE = { back: .9, up: 1.1 };  // unik: odskok do tyłu i w górę z obrotem
  const CV_W = 400, CV_H = 400;  // płótno obrazka (grafiki są kwadratowe)
  const SLAB = { depth: .035, cell: 4, inset: 3, shade: .62 };  // wytłoczony rysunek: grubość × wysokość, komórka konturu [px], próbka koloru w głąb [komórki], jasność boków
  const GROUND_EPS = .03;  // leżący nad gruntem, nie w nim (inaczej migocze)
  const ANIM_MS = 440, HIT_DELAY = 170, BIG_HIT = 60, SHAKE = 0.22, LUNGE = 0.9;
  const SHOT_MS = 380, BOLT_TOP = 7, BADGE = .55;   // lot pocisku; wysokość, z której spada piorun; wielkość ikony stanu
  const ORBIT = 0.32, ORBIT_MS = 9000, CAM_Y = 2.7, CAM_D = 7.8, LOOK_Y = 1.3;
  const PIXEL_RATIO_MAX = 2, SHADOW_MAP = 1024;
  /* Każdy teren z battle.js ma kilka wyglądów (biomów), losowanych na walkę.
     props: element tła → ile sztuk; far: dalekie tło → szansa; rock: kolory skał; herd/fly: typy ciał dalekich rysunków;
     fog: [od, do]; light: jasność; tint: false = bez zachodu/chmur na niebie */
  const B_ = (sky, ground, props, far, o = {}) => ({ sky, ground, props, far, ...o });
  const THEMES = {
    plains: [B_(0xCFE8F7, 0xC9B56E, { hill: 7, grass: 16, boulder: 5, cycad: 4, leafy: 3 }, { volcano: .5, herd: .7, flyer: .4, clouds: 1 }),
      B_(0xC4E4F5, 0x8DB860, { hill: 6, grass: 20, flower: 10, leafy: 4, nest: 1 }, { herd: .6, flyer: .5, clouds: 1, rainbow: .35 }),
      B_(0xE9D7B8, 0xB9926A, { mesa: 4, boulder: 8, bones: 2, grass: 6, dead: 2 }, { herd: .4, flyer: .4, clouds: .4 })],
    forest: [B_(0xB9DCC0, 0x5E8A45, { pine: 9, leafy: 7, fern: 10, log: 3, cycad: 3, mushroom: 4 }, { mountains: 1, clouds: .5, flyer: .2 }),
      B_(0x9FCFA0, 0x3F6E32, { jungle: 9, bigleaf: 10, horsetail: 8, fern: 8, flower: 4 }, { mist: 1, flyer: .4, rain: .3 }, { fog: [7, 24] }),
      B_(0xC8DCE8, 0x6E8A58, { pine: 8, boulder: 6, spire: 3, fern: 5 }, { mountains: 1, waterfall: .6, clouds: .8 }),
      B_(0xDCE6EE, 0xEEF3F6, { snowpine: 10, snowmound: 6, ice: 3, log: 2 }, { mountains: 1, snow: 1 })],
    swamp: [B_(0xBCCBA8, 0x6C7447, { pool: 5, reed: 16, dead: 4, fern: 6, cycad: 3 }, { volcano: .35, herd: .5, clouds: .6 }),
      B_(0xA9C7B0, 0x4E6B4A, { pool: 7, mangrove: 7, reed: 8, fern: 4 }, { fireflies: 1, mist: 1, flyer: .3 }),
      B_(0xA8B39A, 0x5C6440, { pool: 6, dead: 8, reed: 10, mushroom: 4 }, { dragonflies: 1, mist: 1, herd: .4, rain: .3 }, { fog: [6, 22] })],
    coast: [B_(0xBDE7F7, 0xE6D39C, { palm: 6, rock: 7, grass: 6, nest: 1 }, { flyer: .8, clouds: 1, waves: 1 }, { water: 0x3F9FCB }),
      B_(0xC9D6DE, 0x8F887C, { boulder: 8, spire: 4, tidepool: 4, grass: 4 }, { flyer: .6, waves: 1, clouds: .8 }, { water: 0x2F6F8F }),
      B_(0xC2EEF2, 0xF0E2B0, { palm: 4, cycad: 4, reed: 6, flower: 4 }, { flyer: .7, waves: 1, rainbow: .3, clouds: 1 }, { water: 0x2FC0C8 }),
      B_(0xDCE8F0, 0xEEF3F6, { snowmound: 6, ice: 6, icefloe: 7 }, { snow: 1, mountains: .8, waves: 1 }, { water: 0x3D6F8F })],
    deep: [B_(0x0E4A6E, 0x2A4F63, { weed: 16 }, { bubbles: 1, swimmers: .6 }),
      B_(0x1B7FA6, 0xD8C58E, { coral: 14, weed: 5, rock: 4 }, { bubbles: 1, fish: 1, swimmers: .5 }, { light: .8 }),
      B_(0x145C5E, 0x3A5A48, { kelp: 22, rock: 5 }, { bubbles: 1, fish: .7, swimmers: .6 }),
      B_(0x05182E, 0x101E2A, { crystal: 9, rock: 6 }, { jelly: 1, glow: 1 }, { light: .45 }),
      B_(0x0F5A7A, 0x5B6A6A, { rock: 8, shell: 6, weed: 6 }, { ammonites: 1, bubbles: 1 })].map(t => ({ ...t, under: 1, tint: false })),
    cliffs: [B_(0xE3CFAE, 0x9A8670, { spire: 9, boulder: 7, grass: 5 }, { mountains: 1, flyer: .9, volcano: .3, clouds: .7 }),
      B_(0xF0C9A0, 0xB8744A, { mesa: 5, spire: 6, boulder: 5 }, { flyer: .9, clouds: .5 }, { rock: [0xC0703E, 0xB0603A, 0xD08A5A] }),
      B_(0xD9E4EE, 0xDDE3E8, { spire: 8, snowmound: 5, boulder: 4 }, { mountains: 1, flyer: .7, snow: .7 }, { rock: [0xB8BEC6, 0xCDD3DA, 0xA8AFB8] }),
      B_(0xCFE3DA, 0x8A8A70, { spire: 6, fern: 6, pine: 4 }, { waterfall: 1, rainbow: .5, flyer: .8 })],
    desert: [B_(0xF3DDB0, 0xE3C18A, { dune: 8, bones: 2, boulder: 3, dead: 2 }, { flyer: .3, clouds: .2 }),
      B_(0xF0D2A8, 0xD09A62, { mesa: 6, boulder: 5, grass: 3, bones: 1 }, { herd: .4, flyer: .5 }, { rock: [0xC0703E, 0xB0603A, 0xD08A5A] })],
    volcano: [B_(0x6E4A48, 0x4A3C38, { lava: 6, blackrock: 8, vent: 3, dead: 3 }, { eruption: 1, embers: 1 }, { tint: false, fog: [8, 28] }),
      B_(0x8A7A74, 0x5E5550, { blackrock: 8, vent: 4, dead: 5, lava: 3 }, { volcano: 1, ash: 1 }, { tint: false })],
    tundra: [B_(0xDCE8F0, 0xF2F6F8, { snowmound: 8, ice: 5, snowpine: 4, boulder: 3 }, { mountains: 1, snow: 1, herd: .7 }, { herd: ['ice'] }),
      B_(0xCFE0EC, 0xE4EEF4, { ice: 10, snowmound: 6 }, { mountains: 1, snow: .6, herd: .5 }, { herd: ['ice'] })],
  };
  const SKY_TINTS = [0, 0, 0xF6B183, 0xDDE3EA], TINT_MIX = .45;   // zwykły dzień ×2, zachód słońca, pochmurno
  const HERD = ['normal', 'grass', 'ground'], FLYERS = ['flying'], SWIMMERS = ['water'];   // typy Pokémonów w dalekim tle
  const RAINBOW = [0xE84A4A, 0xF29B38, 0xF5D547, 0x5DBB63, 0x4A8FE0, 0x8A5AC8];
  let loading = null, S = null;
  const load = () => loading = loading || new Promise((res, rej) => window.THREE ? res()
    : document.head.append(Object.assign(document.createElement('script'), { src: THREE_SRC, onload: res, onerror: rej })));

  /* ---------- klocki ---------- */
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const phong = c => new THREE.MeshPhongMaterial({ color: c, flatShading: true, shininess: 6, side: THREE.DoubleSide });
  function mesh(g, geo, m, p, s) {
    const o = new THREE.Mesh(geo, m); o.position.copy(p); if (s) o.scale.set(...s);
    o.castShadow = true; g.add(o); return o;
  }
  // walec/stożek od punktu a do b, promienie r0 (w a) i r1 (w b)
  function limb(g, m, a, b, r0, r1 = r0) {
    const d = b.clone().sub(a), o = mesh(g, new THREE.CylinderGeometry(r1, r0, d.length(), 6), m, a.clone().addScaledVector(d, .5));
    o.quaternion.setFromUnitVectors(V(0, 1), d.normalize()); return o;
  }
  /* ---------- obrazek: płaska tablica, albo (depth > 0) bryła: obrazek z przodu i z tyłu + ścianki wzdłuż konturu ---------- */
  function billboard(g, sp, H, depth = 0) {
    const cv = Object.assign(document.createElement('canvas'), { width: CV_W, height: CV_H }), img = new Image(), tex = new THREE.CanvasTexture(cv);
    const W = H * CV_W / CV_H, d = depth / 2, walls = new THREE.BufferGeometry();
    const face = new THREE.MeshBasicMaterial({ map: tex, transparent: !depth, alphaTest: .4, side: THREE.DoubleSide });
    for (const z of depth ? [-d, d] : [0]) mesh(g, new THREE.PlaneGeometry(W, H), face, V(0, H * .5, z)).castShadow = false;
    if (depth) mesh(g, walls, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), V(0, 0)).castShadow = false;
    img.onload = () => {
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0, CV_W, CV_H); tex.needsUpdate = true;
      if (depth) extrude(c.getImageData(0, 0, CV_W, CV_H).data, walls, W, H, d);
    };
    img.crossOrigin = 'anonymous'; img.src = ART_URL(sp.id);   // CORS: bez tego getImageData() rzuca wyjątek
    return {};
  }
  /* ścianki boczne: siatka komórek maski alfa; tam, gdzie pełna komórka graniczy z pustą, stawiamy prostokąt w kolorze rysunku
     (brany kilka komórek w głąb, żeby nie był czarnym konturem), przyciemniony — jak wytłoczone przedmioty w Minecrafcie */
  function extrude(px, geo, W, H, d) {
    const C = SLAB.cell, nx = CV_W / C, ny = CV_H / C, k = (i, j) => ((j * C + C / 2) * CV_W + i * C + C / 2) * 4;
    const full = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && px[k(i, j) + 3] > 100;
    const X = u => (u / nx - .5) * W, Y = v => (1 - v / ny) * H, pos = [], col = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (full(i, j))
      for (const [di, dj, x0, y0, x1, y1] of [[1, 0, i + 1, j, i + 1, j + 1], [-1, 0, i, j, i, j + 1], [0, 1, i, j + 1, i + 1, j + 1], [0, -1, i, j, i + 1, j]]) {
        if (full(i + di, j + dj)) continue;
        const [si, sj] = full(i - di * SLAB.inset, j - dj * SLAB.inset) ? [i - di * SLAB.inset, j - dj * SLAB.inset] : [i, j];
        const [a, b] = [[X(x0), Y(y0)], [X(x1), Y(y1)]], rgb = [0, 1, 2].map(n => px[k(si, sj) + n] / 255 * SLAB.shade);
        for (const [p, z] of [[a, -d], [b, -d], [b, d], [a, -d], [b, d], [a, d]]) { pos.push(p[0], p[1], z); col.push(...rgb); }
      }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }

  /* ---------- zawodnik ---------- */
  function fighter(sp, side, H, theme) {
    const root = new THREE.Group(), inner = new THREE.Group(), body = new THREE.Group();
    root.add(inner); inner.add(body); billboard(body, sp, H, H * SLAB.depth);
    const water = sp.types.includes('water'), fly = sp.types.includes('flying');
    const dir = side === 'a' ? 1 : -1, lift = fly ? 1.2 : water && theme.under ? .5 : water ? .15 : 0;
    root.position.set(-dir * GAP, lift, 0);
    root.rotation.y = side === 'a' ? -YAW : Math.PI + YAW;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(H * .45, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(-dir * GAP, .02, 0); S.scene.add(shadow, root);
    const mats = []; root.traverse(c => c.material && mats.push(c.material));
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false })); badge.scale.setScalar(BADGE); badge.visible = false; S.scene.add(badge);
    return { root, inner, shadow, badge, H, dir, lift, mats, x0: -dir * GAP, anim: null, ko: false, won: false, phase: Math.random() * 6, swim: water || fly };
  }

  /* ---------- teren ---------- */
  function terrain(theme, rnd, marineSide) {
    const sc = S.scene, pick = l => l[Math.floor(rnd() * l.length)];
    const add = (geo, c, p, s, r = 0, g = sc) => { const o = new THREE.Mesh(geo, phong(c)); o.position.copy(p); if (s) o.scale.set(...s); o.rotation.y = r; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const cone = (r, h, n = 6) => new THREE.ConeGeometry(r, h, n), cyl = (r0, r1, h) => new THREE.CylinderGeometry(r1, r0, h, 6);
    const ICO = new THREE.IcosahedronGeometry(1, 0), BLOB = new THREE.IcosahedronGeometry(1, 1), GREENS = [0x3F6E3A, 0x4E7F3C, 0x5F8F45, 0x6E9A3A];
    const ROCK = theme.rock || [0xA89A80, 0x9A9186, 0xB3A58C], SNOW = 0xF4F8FB, ICE = [0xBFE3F2, 0xA8D4EA, 0xD6EEF8];
    const see = (o, opacity, glow) => { Object.assign(o.material, { transparent: true, opacity, depthWrite: false }); o.castShadow = false; if (glow) o.material.emissive.setHex(glow); return o; };
    const flat = (geo, c, p, opacity = 1) => { const o = add(geo, c, p); o.rotation.x = -Math.PI / 2; o.castShadow = false; if (opacity < 1) see(o, opacity); return o; };
    flat(new THREE.CircleGeometry(40, 24), theme.ground, V(0, 0));
    if (theme.water) flat(new THREE.PlaneGeometry(marineSide ? 40 : 3.5, marineSide ? 30 : 2.2), theme.water, V(marineSide * 20.5 || -1.5, .03, marineSide ? 0 : -3.5), .85);
    // wachlarz liści/paproci: stożki odchylone od pionu dookoła p
    const fronds = (p, n, len, tilt, c) => { const g = new THREE.Group(); g.position.copy(p); sc.add(g);
      for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI + rnd(), f = add(cone(.1 * len, len, 4), c, V(Math.cos(a) * len * .45, 0, Math.sin(a) * len * .45), [1, 1, .35], 0, g);
        f.rotation.set(0, -a, 0); f.rotateZ(-tilt); } };
    const sway = (o, amp, speed) => { const r0 = o.rotation.z, ph = rnd() * 6; S.anims.push((dt, now) => { o.rotation.z = r0 + amp * Math.sin(now / speed + ph); }); };
    // pionowy „słupek” z geometrią zaczepioną u dołu (kołysze się od podstawy: wodorosty, skrzypy)
    const stalk = (geo, c, p) => { geo.translate(0, geo.parameters.height / 2, 0); return add(geo, c, p); };
    const PROPS = {
      hill: (p, k) => add(BLOB, pick([0x9DB36A, 0xAFBF6E, 0x8DA85E]), p.setZ(p.z - 8), [3.5 * k, 1.1 * k, 2.5 * k]),
      dune: (p, k) => add(BLOB, pick([0xE8C98E, 0xDDB97C, 0xF0D39C]), p.setZ(p.z - 4), [3 * k, .8 * k, 2 * k], rnd() * 6),
      grass: (p, k) => { for (let i = 0; i < 3; i++) add(cone(.05, .55 * k, 4), pick(GREENS), V(p.x + rnd() * .3, .27 * k, p.z + rnd() * .3)); },
      flower: (p, k) => { for (let i = 0; i < 4; i++) { const q = V(p.x + rnd(), 0, p.z + rnd()); add(cyl(.02, .02, .4), 0x4E7F3C, q.clone().setY(.2));
        add(BLOB, pick([0xF26D8C, 0xF5D547, 0xFFFFFF, 0xB07CE8, 0xF29B38]), q.setY(.42), [.09, .07, .09]); } },
      boulder: (p, k) => add(ICO, pick(ROCK), p.setY(.3 * k), [.8 * k, .55 * k, .7 * k], rnd() * 6),
      rock: (p, k) => add(ICO, pick(theme.under ? [0x6E7A80, 0x5E6A70] : [0x8E8A80, 0xA59D8E]), p.setY(.2 * k), [.5 * k, .4 * k, .5 * k], rnd() * 6),
      blackrock: (p, k) => add(ICO, pick([0x2E2826, 0x3A3230, 0x252020]), p.setY(.35 * k), [.9 * k, .6 * k, .8 * k], rnd() * 6),
      spire: (p, k) => add(cone(1.1 * k, 5 * k, 5), pick(ROCK), p.setZ(p.z - 4).setY(2.5 * k), null, rnd() * 6),
      mesa: (p, k) => { const q = p.setZ(p.z - 7), h = 2.5 * k; for (let i = 0; i < 3; i++) add(cyl(2.4 * k - i * .3, 2.2 * k - i * .3, h / 3), ROCK[i % ROCK.length], q.clone().setY(h / 6 + i * h / 3)); },
      pine: (p, k) => { add(cyl(.18, .12, 1.4), 0x6E4B33, p.clone().setY(.7), [k, k, k]); add(cone(.9, 2.2), pick(GREENS), p.clone().setY(1.5 + k), [k, k, k]); add(cone(.6, 1.6), pick(GREENS), p.clone().setY(2.3 + 1.4 * k), [k, k, k]); },
      snowpine: (p, k) => { add(cyl(.18, .12, 1.4), 0x6E4B33, p.clone().setY(.7), [k, k, k]); add(cone(.9, 2.2), 0x3F5E4A, p.clone().setY(1.5 + k), [k, k, k]);
        add(cone(.55, 1), SNOW, p.clone().setY(2.1 + 1.4 * k), [k, k, k]); add(cone(.6, 1.6), 0x3F5E4A, p.clone().setY(2.3 + 1.4 * k), [k * .8, k * .8, k * .8]); add(cone(.3, .6), SNOW, p.clone().setY(2.7 + 1.9 * k), [k, k, k]); },
      leafy: (p, k) => { add(cyl(.22, .14, 1.8), 0x6E4B33, p.clone().setY(.9 * k), [k, k, k]); for (let i = 0; i < 3; i++) add(BLOB, pick(GREENS), V(p.x + (rnd() - .5) * k, 2 * k + rnd() * .6 * k, p.z + (rnd() - .5) * k), [.9 * k, .75 * k, .9 * k]); },
      jungle: (p, k) => { const h = 4 * k; add(cyl(.3, .2, h), 0x5A4030, p.clone().setY(h / 2)); add(BLOB, pick(GREENS), p.clone().setY(h), [2 * k, .7 * k, 2 * k]);
        for (let i = 0; i < 3; i++) add(cyl(.02, .02, 1.5 * k), 0x4E7F3C, V(p.x + (rnd() - .5) * 2.4 * k, h - .8 * k, p.z + (rnd() - .5) * 1.5 * k)); },
      bigleaf: (p, k) => fronds(p.clone().setY(.05), 5, 1.4 * k, 1, pick(GREENS)),
      horsetail: (p, k) => { for (let i = 0; i < 3; i++) sway(stalk(cyl(.05, .04, 1.6 * k), pick([0x6E9A3A, 0x7EA84A]), V(p.x + rnd() * .5, 0, p.z + rnd() * .5)), .05, 900); },
      mangrove: (p, k) => { const top = p.clone().setY(1.4 * k); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + rnd(); limb(sc, phong(0x5A4838), top, V(p.x + Math.cos(a) * k, 0, p.z + Math.sin(a) * k), .1, .06); }
        limb(sc, phong(0x5A4838), top, top.clone().setY(2.8 * k), .14, .1); add(BLOB, pick(GREENS), top.clone().setY(3 * k), [1.5 * k, .8 * k, 1.5 * k]); },
      cycad: (p, k) => { add(cyl(.3, .25, .9), 0x7A5A3A, p.clone().setY(.45 * k), [k, k, k]); fronds(p.clone().setY(.9 * k), 7, 1.3 * k, 1.1, pick(GREENS)); },
      fern: (p, k) => fronds(p.clone().setY(.05), 6, .8 * k, 1.2, pick(GREENS)),
      mushroom: (p, k) => { for (let i = 0; i < 3; i++) { const q = V(p.x + rnd() * .6, 0, p.z + rnd() * .6), s = .6 + rnd() * .6; add(cyl(.06, .05, .3 * s), 0xF2E8D8, q.clone().setY(.15 * s));
        add(new THREE.SphereGeometry(.2 * s, 8, 4, 0, 2 * Math.PI, 0, Math.PI / 2), pick([0xD8402E, 0xE08A3A, 0xB8865A]), q.setY(.28 * s)); } },
      palm: (p, k) => { const lean = (rnd() - .5) * .8, top = V(p.x + lean * 1.5 * k, 2.3 * k, p.z); limb(sc, phong(0x8A6A48), p.clone(), top, .16, .1);
        fronds(top, 7, 1.6 * k, 1.9, pick(GREENS)); },
      log: (p, k) => { const o = add(cyl(.22, .22, 2 * k), 0x6B4A30, p.setY(.2)); o.rotation.set(0, rnd() * 3, Math.PI / 2); },
      dead: (p, k) => { const c = phong(0x6D6457), top = p.clone().setY(2.6 * k); limb(sc, c, p.clone(), top, .16, .08);
        for (const s of [-1, 1]) limb(sc, c, top.clone().setY(top.y - .8 * k), V(p.x + s * .8 * k, top.y + .1, p.z + (rnd() - .5)), .07, .03); },
      reed: (p, k) => { for (let i = 0; i < 4; i++) add(cone(.05, 1.3 * k, 4), pick([0x7C8A4A, 0x8C9A52]), V(p.x + rnd() * .4, .65 * k, p.z + rnd() * .4)); },
      pool: (p, k) => { flat(new THREE.CircleGeometry(1.6 * k, 10), 0x4F7466, p.clone().setY(.03), .85);
        for (let i = 0; i < 3; i++) flat(new THREE.CircleGeometry(.25, 7), 0x5E9A4A, V(p.x + (rnd() - .5) * 1.8 * k, .05, p.z + (rnd() - .5) * 1.2 * k)); },
      tidepool: (p, k) => { flat(new THREE.CircleGeometry(1 * k, 9), 0x3F8FAF, p.clone().setY(.03), .8); for (let i = 0; i < 4; i++) add(ICO, pick(ROCK), V(p.x + (rnd() - .5) * 2 * k, .15, p.z + (rnd() - .5) * 2 * k), [.3, .25, .3]);
        add(BLOB, 0xE86A4A, V(p.x, .08, p.z), [.12, .05, .12]); },
      nest: (p, k) => { const t = add(new THREE.TorusGeometry(.5, .18, 6, 12), 0x8A6A40, p.clone().setY(.15)); t.rotation.x = -Math.PI / 2;
        for (let i = 0; i < 3; i++) add(BLOB, pick([0xF4ECD8, 0xE8DCC0, 0xDDE8D0]), V(p.x + (i - 1) * .22, .25, p.z + (rnd() - .5) * .2), [.14, .2, .14]); },
      bones: (p, k) => { for (let i = 0; i < 5; i++) { const r = add(new THREE.TorusGeometry(.6 * k, .05, 4, 10, Math.PI), 0xF2EBDD, V(p.x + i * .3 * k, 0, p.z)); r.rotation.y = Math.PI / 2; }
        add(BLOB, 0xF2EBDD, V(p.x - .6 * k, .3 * k, p.z), [.5 * k, .3 * k, .3 * k]); },
      snowmound: (p, k) => add(BLOB, SNOW, p.setY(0), [1.4 * k, .5 * k, 1.1 * k], rnd() * 6),
      ice: (p, k) => see(add(ICO, pick(ICE), p.setY(.4 * k), [.6 * k, .9 * k, .6 * k], rnd() * 6), .85),
      icefloe: (p, k) => { if (!marineSide) return; const o = flat(new THREE.CircleGeometry(.8 * k, 6), SNOW, V(marineSide * (3 + rnd() * 12), .06, p.z + 4 + rnd() * 4));
        S.anims.push((dt, now) => { o.position.y = .06 + .03 * Math.sin(now / 800 + p.x); }); },
      lava: (p, k) => { const o = flat(new THREE.CircleGeometry(1.2 * k, 9), 0xFF6A1A, p.clone().setY(.04)); o.material.emissive.setHex(0xC83A00);
        S.anims.push((dt, now) => o.material.emissive.setRGB(.8 + .2 * Math.sin(now / 300 + p.x), .25, 0)); },
      vent: (p, k) => { add(cone(.6 * k, .7 * k, 6), 0x3A3230, p.clone().setY(.35 * k)); smoke(p.clone().setY(.7 * k), 4, .3, 4, 0x9A9590); },
      weed: (p, k) => sway(stalk(cone(.12, 2.4 * k, 4), pick([0x2F7A5A, 0x3F8A4A]), p), .12, 1200),
      kelp: (p, k) => sway(stalk(cyl(.12, .06, 4 + 3 * k), pick([0x5A7A2A, 0x6A6A2A, 0x4A6A30]), p), .1, 1500 + rnd() * 600),
      coral: (p, k) => { const c = pick([0xF26D8C, 0xF29B38, 0xB07CE8, 0xF5D547, 0x4ACBC0]), q = p.setZ(p.z + 2);
        if (rnd() < .5) for (let i = 0; i < 4; i++) limb(sc, phong(c), q.clone(), V(q.x + (rnd() - .5) * 1.2 * k, (.6 + rnd()) * k, q.z + (rnd() - .5) * .6), .08, .04);
        else add(BLOB, c, q.setY(.25 * k), [.5 * k, .35 * k, .5 * k]); },
      crystal: (p, k) => { for (let i = 0; i < 3; i++) { const o = see(add(cone(.2 * k, 1.4 * k, 5), pick([0x7AE0FF, 0xB07CFF]), V(p.x + rnd() * .5, .6 * k, p.z + rnd() * .5)), .85, 0x3A6AA0); o.rotation.z = (rnd() - .5) * .6; } },
      shell: (p, k) => { const o = add(new THREE.TorusGeometry(.25 * k, .1 * k, 6, 12), 0xE8D8B8, p.setY(.1)); o.rotation.x = -Math.PI / 2 + .3; },
    };
    // unoszące się cząstki: dym, bąble, popiół, żar (dy > 0 w górę), śnieg/deszcz (dy < 0)
    function smoke(at, n, size, top, c) { const ps = Array.from({ length: n }, (_, i) => see(add(BLOB, c, at.clone().setY(at.y + i * top / n), [size, size, size]), .6));
      S.anims.push(dt => ps.forEach(o => { o.position.y += dt * .7; o.position.x += dt * .2; o.scale.addScalar(dt * size); if (o.position.y > at.y + top) { o.position.copy(at); o.scale.setScalar(size); } })); }
    const drift = (n, c, size, dy, glow = 0, box = [16, 9, 10]) => { const ps = Array.from({ length: n }, () => see(add(BLOB, c, V((rnd() - .5) * box[0], rnd() * box[1], 2 - rnd() * box[2]), [size, size * (dy < -2 ? 6 : 1), size]), .85, glow));
      S.anims.push((dt, now) => ps.forEach((o, i) => { o.position.y += dy * dt; o.position.x += Math.sin(now / 900 + i) * dt * .3; if (o.position.y > box[1]) o.position.y = 0; if (o.position.y < 0) o.position.y = box[1]; })); };
    const spot = () => { const x = (rnd() - .5) * 26; return V(marineSide ? -marineSide * Math.abs(x) : x, 0, theme.under ? -2 - rnd() * 9 : -4 - rnd() * 12); };   // wybrzeże: tylko po stronie lądu; pod wodą bliżej (mgła)
    for (const [name, n] of Object.entries(theme.props)) for (let i = 0; i < n; i++) PROPS[name](spot(), .7 + rnd());
    // rysunek gatunku jako daleka tablica (stado, latające, pływające); obracana do kamery w loop()
    const of = test => SPECIES.filter(test), body = l => of(s => s.types.some(t => l.includes(t)));
    const cutout = (pool, p, H, dir) => { const g = new THREE.Group(); g.position.copy(p); g.scale.x = dir; sc.add(g); S.faces.push(g); billboard(g, pick(pool), H); return g; };
    const across = (pool, n, y, H, speed, bob) => { for (let i = 0; i < n; i++) { const dir = rnd() < .5 ? 1 : -1, y0 = y + rnd() * 2, g = cutout(pool, V((rnd() - .5) * 24, y0, -6 - rnd() * 8), H * (1 + rnd() * .6), dir);
      S.anims.push((dt, now) => { g.position.x += dir * dt * speed; g.position.y = y0 + bob * Math.sin(now / 600 + i); if (Math.abs(g.position.x) > 16) g.position.x = -dir * 16; }); } };
    const peak = (x, z, r, h, c) => { add(cone(r, h, 5), c, V(x, h / 2 - .5, z), null, rnd() * 6); add(cone(r * .32, h * .3, 5), SNOW, V(x, h * .85 - .5, z)); };
    const FAR = {
      volcano: () => { const x = (rnd() - .5) * 24; add(cone(6, 7, 8), 0x5A4A42, V(x, 3.5, -27)); add(cone(1.3, 1.5, 8), 0xD8572A, V(x, 6.4, -27)); smoke(V(x, 7, -27), 6, .8, 6, 0x8A8580); },
      eruption: () => { const x = (rnd() - .5) * 16; add(cone(8, 10, 8), 0x3A302C, V(x, 5, -28)); const top = add(cone(1.8, 1.2, 8), 0xFF5A10, V(x, 9.6, -28)); top.material.emissive.setHex(0xFF3A00);
        smoke(V(x, 10, -28), 8, 1.2, 8, 0x4A4240); },
      mountains: () => { for (let i = 0; i < 5; i++) peak((i - 2) * 9 + rnd() * 4, -30 - rnd() * 4, 5 + rnd() * 4, 8 + rnd() * 5, pick([0x7C8A9A, 0x8C96A2, 0x9AA3AA])); },
      clouds: () => { for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set((rnd() - .5) * 40, 8 + rnd() * 3, -14 - rnd() * 10); sc.add(g);
        for (let j = 0; j < 4; j++) add(BLOB, 0xFFFFFF, V(j * 1.1, rnd() * .6, rnd()), [1.2, .8, .9], 0, g).castShadow = false;
        S.anims.push(dt => { g.position.x += dt * .35; if (g.position.x > 24) g.position.x = -24; }); } },
      rainbow: () => RAINBOW.forEach((c, i) => { const o = see(add(new THREE.TorusGeometry(16 - i * .5, .25, 4, 40, Math.PI), c, V((rnd() - .5) * 4, -1, -32)), .45); o.material.fog = false; }),
      waterfall: () => { const x = (rnd() - .5) * 14; add(cone(4, 11, 5), pick(ROCK), V(x - 2.5, 5, -20)); add(cone(4, 10, 5), pick(ROCK), V(x + 2.5, 4.5, -20));
        for (let i = 0; i < 4; i++) { const o = see(add(new THREE.PlaneGeometry(.5, 9), 0xDFF4FF, V(x - .75 + i * .5, 4.5, -18.5)), .7);
          S.anims.push((dt, now) => { o.material.opacity = .5 + .3 * Math.sin(now / 150 + i * 1.7); }); }
        flat(new THREE.CircleGeometry(2.2, 10), 0x6FB5D5, V(x, .04, -17.5), .9); smoke(V(x, .2, -17.2), 5, .5, 1.5, 0xFFFFFF); },
      herd: () => { const dir = rnd() < .5 ? 1 : -1; for (let i = 0; i < 2 + rnd() * 3; i++) { const g = cutout(body(theme.herd || HERD), V((rnd() - .5) * 16, 0, -13 - rnd() * 5), 1.4 + rnd(), dir);
        S.anims.push(dt => { g.position.x += dir * dt * .12; }); } },
      flyer: () => across(body(FLYERS), 1 + rnd() * 2, 5, 1, 1.4, .4),
      dragonflies: () => across(of(s => s.types.includes('bug') && s.types.includes('flying')), 2, 1.5, .5, 2, .3),
      swimmers: () => across(body(SWIMMERS), 1 + rnd() * 2, 2, 1, .8, .3),
      ammonites: () => across(of(s => s.name.startsWith('Omast') || s.name === 'Omanyte'), 6, 1, .5, .5, .3),
      fish: () => { for (let s = 0; s < 2; s++) { const g = new THREE.Group(), c = pick([0xF5D547, 0xF29B38, 0x9AD8F0, 0xE8E8E8]), cx = (rnd() - .5) * 10, cy = 2 + rnd() * 3, cz = -5 - rnd() * 5; sc.add(g);
        for (let i = 0; i < 12; i++) { const f = add(cone(.08, .3, 4), c, V((rnd() - .5) * 1.5, (rnd() - .5) * .8, (rnd() - .5) * 1.5), null, 0, g); f.rotation.z = -Math.PI / 2; f.castShadow = false; }
        S.anims.push((dt, now) => { const t = now / 3000 + s * 3; g.position.set(cx + 4 * Math.cos(t), cy + .5 * Math.sin(t * 2), cz + 2 * Math.sin(t)); g.rotation.y = -t + Math.PI / 2; }); } },
      jelly: () => { for (let i = 0; i < 6; i++) { const g = new THREE.Group(), c = pick([0xFF7AD0, 0x7AE0FF, 0xB07CFF]), y0 = 1 + rnd() * 4; g.position.set((rnd() - .5) * 14, y0, -3 - rnd() * 8); sc.add(g);
        see(add(new THREE.SphereGeometry(.35, 10, 5, 0, 2 * Math.PI, 0, Math.PI / 2), c, V(0, 0, 0), null, 0, g), .7, c);
        for (let j = 0; j < 4; j++) see(add(cyl(.02, .01, .8), c, V((j - 1.5) * .12, -.4, 0), null, 0, g), .6, c);
        S.anims.push((dt, now) => { g.position.y = y0 + .4 * Math.sin(now / 1100 + i); }); } },
      glow: () => drift(30, 0x9AF0FF, .04, .15, 0x6AD8FF),
      bubbles: () => drift(24, 0xDDF3FF, .05, .8, 0, [12, 6, 6]),
      fireflies: () => drift(26, 0xFFF08A, .05, .05, 0xFFD84A, [16, 3, 10]),
      embers: () => drift(30, 0xFF7A2A, .06, .9, 0xFF4A00),
      ash: () => drift(40, 0x6A6260, .05, -.4),
      snow: () => drift(60, 0xFFFFFF, .06, -.7),
      rain: () => drift(60, 0xB8D4E8, .015, -9),
      mist: () => { for (let i = 0; i < 5; i++) { const o = see(add(BLOB, 0xFFFFFF, V((rnd() - .5) * 24, .4, -3 - rnd() * 10), [4, .5, 2]), .25);
        S.anims.push(dt => { o.position.x += dt * .2; if (o.position.x > 14) o.position.x = -14; }); } },
      waves: () => { if (!marineSide) return; for (let i = 0; i < 3; i++) { const o = flat(new THREE.PlaneGeometry(.18, 30), 0xFFFFFF, V(marineSide * (.8 + i * 1.2), .05, 0), .7);
        S.anims.push((dt, now) => { const t = now / 1400 + i * 2.1; o.position.x = marineSide * (.8 + i * 1.2 + .4 * Math.sin(t)); o.material.opacity = .35 + .35 * Math.sin(t); }); } },
    };
    for (const [name, p] of Object.entries(theme.far || {})) if (rnd() < p) FAR[name]();
  }

  /* ---------- start / stop ---------- */
  // look: numer wyglądu terenu (testy), domyślnie losowy
  async function start(grid, B, look) {
    const host = grid.closest('.arena'), stage = Object.assign(document.createElement('div'), { className: 'stage3d' });
    host.classList.add('v3d'); grid.before(stage); stage.append(grid);
    try { await load(); } catch { host.classList.remove('v3d'); stage.before(grid); stage.remove(); return; } // brak pliku → 2D
    if (!stage.isConnected) return;
    stop();
    const key = Object.keys(ARENAS).find(k => ARENAS[k] === B.arena), list = THEMES[key] || THEMES.plains, theme = list[look ?? Math.floor(Math.random() * list.length)];
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(PIXEL_RATIO_MAX, devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.prepend(renderer.domElement);
    const tint = theme.tint === false ? 0 : SKY_TINTS[Math.floor(Math.random() * SKY_TINTS.length)], sky = new THREE.Color(theme.sky);
    if (tint) sky.lerp(new THREE.Color(tint), TINT_MIX);
    const scene = new THREE.Scene(); scene.background = sky; scene.fog = new THREE.Fog(sky, ...(theme.fog || (theme.under ? [10, 28] : [10, 34])));
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
    S = { renderer, scene, camera, stage, theme, parts: [], todo: [], anims: [], faces: [], shake: 0, t0: performance.now() };
    scene.add(new THREE.HemisphereLight(0xFFFFFF, theme.ground, theme.light || (theme.under ? .6 : .75)));
    const sun = new THREE.DirectionalLight(0xFFFFFF, theme.under ? .45 : .7); sun.position.set(4, 9, 6); sun.castShadow = true; if (tint) sun.color.lerp(new THREE.Color(tint), TINT_MIX);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -3 }); sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP); sun.shadow.radius = 4;
    scene.add(sun);
    let seed = 1 + Math.floor(Math.random() * 2147483646); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cube = s => Math.cbrt(s.kg || 100), big = Math.max(cube(B.a.s), cube(B.b.s));
    const Hof = s => H_MAX * Math.max(RATIO_MIN, cube(s) / big);
    S.side = { a: fighter(B.a.s, 'a', Hof(B.a.s), theme), b: fighter(B.b.s, 'b', Hof(B.b.s), theme) };
    S.byId = { [B.a.id]: S.side.a, [B.b.id]: S.side.b };
    const sea = [B.a, B.b].map((p, i) => p.s.types.includes('water') ? (i ? 1 : -1) : 0).find(Boolean) || 0;
    terrain(theme, rnd, key === 'coast' ? sea : 0);
    S.ro = new ResizeObserver(() => { const { clientWidth: w, clientHeight: h } = stage; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
    S.ro.observe(stage);
    S.raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!S) return;
    cancelAnimationFrame(S.raf); S.ro.disconnect();
    S.scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); } });
    S.renderer.dispose(); S.renderer.forceContextLoss(); S.renderer.domElement.remove(); S = null;
  }

  /* ---------- animacje ---------- */
  const play = (f, k, ms = ANIM_MS) => { if (!f.ko) f.anim = { k, t0: performance.now(), ms }; };
  const soon = (ms, fn) => S.todo.push([performance.now() + ms, fn]);
  const rn = (k = 1) => (Math.random() - .5) * k;
  const mid = f => V(f.root.position.x, f.lift + f.H * .45, 0);   // środek ciała
  // chmura cząstek wokół f; g: grawitacja (ujemna = unoszą się, np. ogień, leczenie), up: prędkość w górę, life: [s]
  function burst(f, n, color, { g = 6, up = 1, life = .6, size = .09 } = {}) {
    const m = new THREE.MeshBasicMaterial({ color }), geo = new THREE.IcosahedronGeometry(size, 0), c = mid(f);
    for (let i = 0; i < n; i++) {
      const o = new THREE.Mesh(geo, m); o.position.set(c.x + rn(.8), c.y + rn(f.H * .8), rn(.8));
      S.scene.add(o); S.parts.push({ o, v: V(rn(3), up * (1 + Math.random() * 2.5), rn(2)), t: 0, g, life });
    }
  }
  // pocisk od a do b (łuk), po dolocie → done(); z ogonem cząstek
  function shoot(a, b, color, done, { size = .22, ms = SHOT_MS, arc = .6, from } = {}) {
    const o = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), new THREE.MeshBasicMaterial({ color })), p0 = from || mid(a), p1 = mid(b), t0 = performance.now();
    S.scene.add(o);
    S.anims.push(function fly(dt, now) {
      const t = Math.min(1, (now - t0) / ms); o.position.lerpVectors(p0, p1, t).y += arc * Math.sin(Math.PI * t);
      if (Math.random() < .6) { const q = new THREE.Mesh(o.geometry, o.material); q.position.copy(o.position); q.scale.setScalar(.5); S.scene.add(q); S.parts.push({ o: q, v: V(rn(.5), rn(.5), rn(.5)), t: 0, g: 0, life: .25 }); }
      if (t < 1) return;
      S.scene.remove(o); S.anims.splice(S.anims.indexOf(fly), 1); done();
    });
  }
  // krótkotrwały obiekt: znika po ms, co klatkę step(t 0…1)
  function flashObj(o, ms, step) {
    const t0 = performance.now(); S.scene.add(o);
    S.anims.push(function f(dt, now) { const t = Math.min(1, (now - t0) / ms); step?.(t); if (t >= 1) { S.scene.remove(o); S.anims.splice(S.anims.indexOf(f), 1); } });
  }
  // piorun z nieba: łamana z walców
  function bolt(f, color) {
    const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color, transparent: true }), c = mid(f);
    let p = V(c.x + rn(), BOLT_TOP, 0);
    for (let i = 1; i <= 6; i++) { const q = i === 6 ? c.clone() : V(c.x + rn(1.2), BOLT_TOP - (BOLT_TOP - c.y) * i / 6, rn(.4)); limb(g, m, p, q, .07); p = q; }
    flashObj(g, 260, t => { m.opacity = 1 - t; });
  }
  // fala psychiczna: rozszerzający się pierścień
  function ring(f, color) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }), o = new THREE.Mesh(new THREE.TorusGeometry(.5, .06, 6, 24), m);
    o.position.copy(mid(f)); o.rotation.y = Math.PI / 2;
    flashObj(o, 500, t => { o.scale.setScalar(.4 + 1.8 * t); m.opacity = 1 - t; });
  }
  // wzmocnienie / osłabienie: poziomy pierścień wokół zawodnika, wznosi się (w górę) albo opada (w dół)
  function aura(f, color, up) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }), o = new THREE.Mesh(new THREE.TorusGeometry(.55, .05, 6, 28), m);
    const c = mid(f), h = c.y * 1.6; o.rotation.x = Math.PI / 2;
    flashObj(o, 650, t => { o.position.set(c.x, up ? h * t : h * (1 - t), c.z); o.scale.setScalar(1 + .3 * Math.sin(t * Math.PI)); m.opacity = 1 - t * t; });
  }
  // ikona stanu (emoji) jako tekstura sprite'a
  const EMOJI = {};
  function setBadge(f, icon) {
    f.badge.visible = !!icon && !f.ko; if (!icon || f.badgeIcon === icon) return;
    f.badgeIcon = icon;
    f.badge.material.map = EMOJI[icon] ||= (() => { const cv = Object.assign(document.createElement('canvas'), { width: 128, height: 128 }), c = cv.getContext('2d');
      c.font = '100px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(icon, 64, 72); return new THREE.CanvasTexture(cv); })();
    f.badge.material.needsUpdate = true;
  }
  function animate(f, now, dt) {
    const a = f.anim, t = a ? Math.min(1, (now - a.t0) / a.ms) : 1, s = Math.sin(Math.PI * t);
    let dx = 0, dy = 0, dz = 0, rz = 0, ry = 0, sy = 1, flash = 0, glow = 0;
    if (a) ({
      lunge: () => { dx = f.dir * LUNGE * s; rz = -.18 * s; },
      hit: () => { dx = -f.dir * .35 * s; flash = 1 - t; },
      dodge: () => { dx = -f.dir * DODGE.back * s; dy = DODGE.up * s; ry = 2 * Math.PI * t; },
      cast: () => { sy = 1 - .16 * s; glow = s; },
      ko: () => { rz = Math.PI / 2 * t; dy = -f.lift * t; flash = 1 - t; },
    })[a.k]();
    if (a && t >= 1 && a.k !== 'ko') f.anim = null;
    f.ko = f.ko || (a && a.k === 'ko' && t >= 1);
    if (f.ko) { rz = Math.PI / 2; dy = -f.lift; }
    const tm = now / 1000 + f.phase;
    if (!f.ko) sy *= 1 + .025 * Math.sin(tm * 3);
    if (f.swim && !f.ko) dy += .12 * Math.sin(tm * 2);
    if (f.won) dy += Math.abs(Math.sin(tm * 5)) * .25;
    f.root.position.set(f.x0 + dx, f.lift + dy, dz); f.shadow.position.set(f.x0 + dx, .02, dz);
    [f.inner.rotation.x, f.inner.rotation.z] = a?.k === 'ko' || f.ko ? [rz, 0] : [0, rz];
    f.inner.scale.y = sy; f.inner.rotation.y = ry;
    f.badge.position.set(f.x0 + dx, f.lift + dy + f.H + BADGE * (.7 + .08 * Math.sin(tm * 4)), dz);   // ikona stanu nad głową
    for (const m of f.mats) m.emissive ? m.emissive.setRGB(flash * .8, glow * .35, 0) : m.color.setRGB(1, 1 - flash * .6, 1 - flash * .6);
    if (a?.k === 'ko' || f.ko) {   // przewrócony obraca się wokół stóp → podnieś, żeby leżał NA ziemi, nie pod nią
      f.root.updateMatrixWorld(true);
      f.root.position.y -= Math.min(0, new THREE.Box3().setFromObject(f.inner).min.y - GROUND_EPS);
    }
  }
  function loop(now) {
    if (!S) return;
    if (!S.stage.isConnected) return stop();
    S.raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - (S.last || now)) / 1000); S.last = now;
    S.todo = S.todo.filter(([at, fn]) => at > now || void fn());
    const th = ORBIT * Math.sin((now - S.t0) / ORBIT_MS * 2 * Math.PI), c = S.camera;
    const d = CAM_D / Math.min(1, c.aspect / 1.5);  // wąski ekran telefonu → kamera dalej
    c.position.set(d * Math.sin(th) + (Math.random() - .5) * S.shake, CAM_Y + (Math.random() - .5) * S.shake, d * Math.cos(th));
    c.lookAt(0, LOOK_Y, 0); S.shake *= .88;
    for (const f of Object.values(S.byId)) animate(f, now, dt);
    S.parts = S.parts.filter(p => { p.t += dt; p.v.y -= p.g * dt; p.o.position.addScaledVector(p.v, dt); p.o.scale.setScalar(Math.max(.01, 1 - p.t / p.life));
      return p.t < p.life || void S.scene.remove(p.o); });
    for (const fn of [...S.anims]) fn(dt, now);
    for (const g of S.faces) g.quaternion.copy(c.quaternion);   // dalekie rysunki zawsze przodem do kamery
    S.renderer.render(S.scene, c);
  }

  /* ---------- zdarzenia z silnika walki (js/battle.js) ----------
     ruch: fizyczny = wypad + wybuch w kolorze typu; specjalny / stan = „rzucenie” + pocisk; ⚡ piorun z nieba, 🔮 pierścienie, 🪨 głazy z góry, 🏜️ wstrząs
     stan: ikona nad głową (z ev.st), trucizna i oparzenie = cząstki co turę; statystyki: cząstki w górę (czerwone) / w dół (niebieskie) */
  const col = t => new THREE.Color(TYPES[t]?.[2] || '#FFFFFF').getHex();
  const STATUS_COL = { poison: 0xA33EA1, burn: 0xEE8130, paralysis: 0xF7D02C, sleep: 0xC8D0FF, freeze: 0x96D9D6, confusion: 0xF95587 };
  function impact(ev, d) {
    const dust = S.theme.water || S.theme.under ? 0xE8F6FF : S.theme.ground;
    if (ev.damage) { play(d, 'hit'); burst(d, ev.damage >= BIG_HIT ? 14 : 7, dust); burst(d, 8, col(ev.m.t)); if (ev.eff >= 2 || ev.crit) S.shake = SHAKE; }
  }
  function event(ev) {
    if (!S) return;
    const a = S.side[ev.as], d = S.side[ev.ds], m = ev.m, t = m?.t;
    if (ev.tick) burst(a, 12, STATUS_COL[ev.tick], { g: -2, up: .3, life: .8 }), play(a, 'hit');
    else if (ev.charge) { play(a, 'cast', ANIM_MS * 2); burst(a, 16, col(t), { g: -3, up: .2, life: 1 }); }
    else if (ev.heal || ev.drain) burst(a, 14, 0x6EE07A, { g: -3, up: .3, life: .9 });
    else if (ev.stat) {
      const f = S.side[ev.on], c = ev.n > 0 ? 0xFF6A5A : 0x5A8CFF;
      burst(f, ev.n ? 22 : 6, c, { g: ev.n > 0 ? -4 : 6, up: ev.n > 0 ? .2 : -.2, life: .9 });
      if (ev.n) { aura(f, c, ev.n > 0); soon(180, () => aura(f, ev.n > 0 ? 0xFFC14A : 0x9CC0FF, ev.n > 0)); if (ev.n > 0) play(f, 'cast'); }
    }
    else if (ev.status) burst(S.side[ev.on], 16, STATUS_COL[ev.status], { g: -1, up: .4, life: 1 });
    else if (ev.skip) burst(a, 6, STATUS_COL[ev.skip] || 0xFFFFFF, { g: -1, up: .3 });
    else if (ev.selfHit) play(a, 'hit');
    else if (m && ev.miss) { play(a, m.c === 'p' ? 'lunge' : 'cast'); soon(HIT_DELAY, () => play(d, 'dodge', ANIM_MS * 1.4)); }
    else if (m) {
      const hit = () => impact(ev, d);
      if (m.c === 'p') { play(a, 'lunge'); soon(HIT_DELAY, hit); }
      else play(a, 'cast');
      if (m.c === 'x' && !m.ail) burst(m.self ? a : d, 10, col(t), { g: -2, up: .3 });   // np. Agility, Growl
      else if (t === 'electric') soon(HIT_DELAY, () => { bolt(d, 0xFFF27A); if (m.c !== 'p') hit(); });
      else if (t === 'psychic') [0, 150, 300].forEach(ms => soon(ms, () => ring(d, col(t)))), m.c !== 'p' && soon(HIT_DELAY * 2, hit);
      else if (t === 'rock' && m.c !== 'p') shoot(a, d, 0x8C7B5A, hit, { size: .35, from: mid(d).add(V(rn(), 4, 0)), arc: 0 });
      else if (t === 'ground') { S.shake = SHAKE; burst(d, 16, 0xA07845, { up: .6 }); if (m.c !== 'p') soon(HIT_DELAY, hit); }
      else if (m.c !== 'p') shoot(a, d, col(t), hit);
    }
    for (const k of ['a', 'b']) {
      const f = S.side[k];
      if (ev.hp && ev.hp[k] === 0 && !f.ko && f.anim?.k !== 'ko') soon(HIT_DELAY * 2, () => play(f, 'ko', ANIM_MS * 2));
      if (ev.st) setBadge(f, ev.hp?.[k] === 0 ? null : ev.st[k] && STATUS[ev.st[k]][0]);
    }
  }
  function win(id) {
    if (!S) return;
    for (const [k, f] of Object.entries(S.byId)) k === String(id) ? f.won = true : f.ko || play(f, 'ko', ANIM_MS * 2);   // klucze obiektu to napisy, id Pokémona to liczba
  }
  return { ok, start, stop, event, win, get S() { return S; } };   // S: stan sceny dla testów (tmp/steps_ko.js)
})();
