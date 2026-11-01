#!/usr/bin/env python3
"""Karty TCG do druku: PDF z kartami w prawdziwym rozmiarze (63×88 mm), domyślnie 3×3 na A4, z linijką do kalibracji.

Bez instalowania czegokolwiek: sam Python 3 (na macOS: python3 z Xcode Command Line Tools).
Obrazki z images.pokemontcg.io (skany wysokiej rozdzielczości, ~734×1024 px ≈ 300 dpi), w pamięci podręcznej obok skryptu.

użycie:
  python3 tools/print_cards.py tools/ba2020_missing.txt                # → karty_do_druku.pdf
  python3 tools/print_cards.py lista.txt --scale 1.03                   # drukarka zmniejsza o 3 % → powiększ
  python3 tools/print_cards.py lista.txt --calibrate                    # tylko strona z linijkami (bez kart)

kalibracja: wydrukuj w skali 100 % (w Podglądzie: „Skala: 100%”, NIE „Dopasuj”), zmierz prawdziwą linijką linię „100 mm”.
  (odcinek 0–10 na dolnej linijce). Wyszło X mm → nowa skala = obecna × 100 / X (skrypt wypisuje to na stronie). Osobno w pionie: --scale-y.

szukanie innych kart (baza pokemon-tcg-data z GitHuba, za pierwszym razem ~1 min, potem z pamięci):
  python3 tools/print_cards.py --find pikachu                           # wszystkie wydania: gotowe wiersze do listy
  python3 tools/print_cards.py --find "charizard ex" --set 151          # zawężenie: fragment nazwy zestawu albo jego id
  python3 tools/print_cards.py --find snorlax --preview                 # katalog do obejrzenia: znalezione.pdf, małe karty z podpisami

lista (plik tekstowy), jedna karta na wiersz, # = komentarz:
  3  sm115 19        ilość, zestaw (id z pokemontcg.io), numer w zestawie
  1  smp SM65        promki: numer z literami
  1  sv3pt5-25       albo id karty z pokemontcg.io (zestaw-numer)
  2  https://…/x.png albo ścieżka do pliku PNG/JPG — dowolny obrazek karty
"""
import argparse, hashlib, json, os, re, signal, struct, subprocess, sys, unicodedata, urllib.error, urllib.request, zlib

MM = 72 / 25.4                      # punkty PDF na milimetr
CARD = (63.0, 88.0)                 # rozmiar karty Pokémon TCG w mm
PAPER = {'a4': (210.0, 297.0), 'letter': (215.9, 279.4)}
URL = 'https://images.pokemontcg.io/{set}/{num}_hires.png'
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '..', 'tmp', 'card_cache') if os.path.basename(HERE) == 'tools' else os.path.join(HERE, 'card_cache')   # w repo: tmp/


# ---------------- lista kart ----------------
def read_list(path):
    cards = []
    for ln, line in enumerate(open(path, encoding='utf-8'), 1):
        line = line.split('#', 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if not parts[0].isdigit():
            sys.exit(f'{path}:{ln}: na początku wiersza ma być ilość, np. „2 sm115 19”')
        n, rest = int(parts[0]), parts[1:]
        if len(rest) == 1 and re.fullmatch(r'[a-z0-9]+-[A-Za-z0-9]+', rest[0]) and not os.path.exists(rest[0]):
            src = URL.format(set=rest[0].split('-')[0], num=rest[0].split('-', 1)[1])
        elif len(rest) == 1:                                # adres albo plik
            src = rest[0]
        elif len(rest) == 2:
            src = URL.format(set=rest[0], num=rest[1])
        else:
            sys.exit(f'{path}:{ln}: nie rozumiem „{line}” (ilość zestaw numer)')
        cards += [src] * n
    return cards


def fetch(src):
    if not re.match(r'https?://', src):
        return open(os.path.expanduser(src), 'rb').read()
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, hashlib.sha1(src.encode()).hexdigest()[:16] + os.path.splitext(src)[1])
    if not os.path.exists(f):
        print('pobieram', src)
        req = urllib.request.Request(src, headers={'User-Agent': 'print_cards/1.0'})
        try:
            data = urllib.request.urlopen(req, timeout=60).read()
        except urllib.error.HTTPError as e:
            sys.exit(f'nie ma takiej karty: {src} ({e.code}) — sprawdź zestaw i numer na https://pokemontcg.io')
        except Exception:                                  # Python z python.org bez certyfikatów: systemowy curl
            r = subprocess.run(['curl', '-fsSL', src], capture_output=True)
            if r.returncode:
                sys.exit(f'nie udało się pobrać {src}: {r.stderr.decode().strip()}')
            data = r.stdout
        open(f, 'wb').write(data)
    return open(f, 'rb').read()


# ---------------- obrazki → obiekty PDF ----------------
def jpeg_image(data):
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            break
        m, ln = data[i + 1], struct.unpack('>H', data[i + 2:i + 4])[0]
        if m in (0xC0, 0xC1, 0xC2):
            h, w, comps = struct.unpack('>HHB', data[i + 5:i + 10])
            cs = {1: '/DeviceGray', 3: '/DeviceRGB', 4: '/DeviceCMYK'}[comps]
            return dict(w=w, h=h, cs=cs, bpc=8, filt='/DCTDecode', data=data, smask=None)
        i += 2 + ln
    sys.exit('zły plik JPG')


def png_image(data):
    """PNG 8-bit bez przeplotu: RGB idzie do PDF bez dekodowania (filtr PNG = predyktor PDF); przezroczystość → osobna maska."""
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        sys.exit('obrazek nie jest PNG ani JPG')
    pos, idat, plte, trns = 8, [], None, None
    while pos < len(data):
        ln, typ = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, bd, ct, _, _, il = struct.unpack('>IIBBBBB', body)
        elif typ == b'PLTE':
            plte = body
        elif typ == b'tRNS':
            trns = body
        elif typ == b'IDAT':
            idat.append(body)
        pos += 12 + ln
    if bd != 8 or il:
        sys.exit(f'PNG {bd}-bit / z przeplotem — przekonwertuj na JPG (np. w Podglądzie: Eksportuj…)')
    raw = b''.join(idat)
    if ct in (0, 2) or (ct == 3 and not trns):            # bez przezroczystości: wprost
        colors = {0: 1, 2: 3, 3: 1}[ct]
        cs = '/DeviceGray' if ct == 0 else '/DeviceRGB' if ct == 2 else f'[/Indexed /DeviceRGB {len(plte) // 3 - 1} <{plte.hex()}>]'
        return dict(w=w, h=h, cs=cs, bpc=8, filt='/FlateDecode', data=raw, smask=None,
                    parms=f'<< /Predictor 15 /Colors {colors} /BitsPerComponent 8 /Columns {w} >>')
    bpp = {3: 1, 4: 2, 6: 4}[ct]
    pix = unfilter(zlib.decompress(raw), w, h, bpp)
    if ct == 6:
        rgb, a = bytearray(w * h * 3), bytearray(w * h)
        rgb[0::3], rgb[1::3], rgb[2::3], a[:] = pix[0::4], pix[1::4], pix[2::4], pix[3::4]
        color, cs = rgb, '/DeviceRGB'
    elif ct == 4:
        color, a, cs = pix[0::2], pix[1::2], '/DeviceGray'
    else:                                                  # paleta z przezroczystością
        alpha = trns + b'\xff' * (256 - len(trns))
        color, a = pix, bytes(pix).translate(alpha)
        cs = f'[/Indexed /DeviceRGB {len(plte) // 3 - 1} <{plte.hex()}>]'
    if min(a) == 255:
        a = None
    mask = a and dict(w=w, h=h, cs='/DeviceGray', bpc=8, filt='/FlateDecode', data=zlib.compress(bytes(a)), smask=None)
    return dict(w=w, h=h, cs=cs, bpc=8, filt='/FlateDecode', data=zlib.compress(bytes(color)), smask=mask)


def unfilter(raw, w, h, bpp):
    stride, out, prev = w * bpp, bytearray(), bytearray(w * bpp)
    for y in range(h):
        f, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        if f == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:
            line = bytearray((a + b) & 255 for a, b in zip(line, prev))
        elif f == 3:
            for i in range(stride):
                line[i] = (line[i] + ((line[i - bpp] if i >= bpp else 0) + prev[i]) // 2) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b, c = prev[i], prev[i - bpp] if i >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        out += line
        prev = line
    return out


def load_image(src):
    data = fetch(src)
    return jpeg_image(data) if data[:2] == b'\xff\xd8' else png_image(data)


# ---------------- PDF ----------------
class PDF:
    def __init__(self):
        self.objs = []

    def add(self, body):                                   # body: bytes; zwraca numer obiektu
        self.objs.append(body)
        return len(self.objs)

    def stream(self, dict_str, data):
        return self.add(f'<< {dict_str} /Length {len(data)} >>\nstream\n'.encode() + data + b'\nendstream')

    def image(self, im):
        sm = f' /SMask {self.image(im["smask"])} 0 R' if im.get('smask') else ''
        parms = f' /DecodeParms {im["parms"]}' if im.get('parms') else ''
        return self.stream(f'/Type /XObject /Subtype /Image /Width {im["w"]} /Height {im["h"]} /ColorSpace {im["cs"]} '
                           f'/BitsPerComponent {im["bpc"]} /Filter {im["filt"]}{parms}{sm}', im['data'])

    def save(self, path, pages_ops, size, images, font):
        pages_id = len(self.objs) + 1 + len(pages_ops) * 2 + 1
        kids = []
        xo = ' '.join(f'/Im{i} {o} 0 R' for i, o in images.items())
        for ops in pages_ops:
            c = self.stream('/Filter /FlateDecode', zlib.compress(ops.encode('latin-1')))
            kids.append(self.add(f'<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {size[0]:.2f} {size[1]:.2f}] '
                                 f'/Resources << /XObject << {xo} >> /Font << /F1 {font} 0 R >> >> /Contents {c} 0 R >>'.encode()))
        catalog = self.add(f'<< /Type /Catalog /Pages {pages_id} 0 R >>'.encode())
        assert self.add(f'<< /Type /Pages /Kids [{" ".join(f"{k} 0 R" for k in kids)}] /Count {len(kids)} >>'.encode()) == pages_id
        out, offs = bytearray(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'), []
        for i, body in enumerate(self.objs, 1):
            offs.append(len(out))
            out += f'{i} 0 obj\n'.encode() + body + b'\nendobj\n'
        x = len(out)
        out += f'xref\n0 {len(self.objs) + 1}\n0000000000 65535 f \n'.encode() + ''.join(f'{o:010d} 00000 n \n' for o in offs).encode()
        out += f'trailer\n<< /Size {len(self.objs) + 1} /Root {catalog} 0 R >>\nstartxref\n{x}\n%%EOF\n'.encode()
        open(path, 'wb').write(out)


def txt(x, y, s, size=7):                                  # tekst bez polskich znaków (czcionka standardowa PDF)
    s = s.translate(str.maketrans('ąćęłńóśźżĄĆĘŁŃÓŚŹŻ×→', 'acelnoszzACELNOSZZx>')).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
    return f'BT /F1 {size} Tf {x:.2f} {y:.2f} Td ({s}) Tj ET\n'


def ruler(x, y, length, sx, sy, vertical=False):
    """linijka w mm (po skalowaniu); 0 w (x, y) — punkty PDF; kreski co 1 mm, dłuższe co 5 i 10"""
    o = '0 g 0.25 w\n'
    for mm in range(0, length + 1):
        t = 3.2 if mm % 10 == 0 else 2.0 if mm % 5 == 0 else 1.1
        if vertical:
            p = y + mm * MM * sy
            o += f'{x:.2f} {p:.2f} m {x + t * MM:.2f} {p:.2f} l S\n'
            if mm % 10 == 0:
                o += txt(x + 3.6 * MM, p - 2, str(mm // 10), 5.5)
        else:
            p = x + mm * MM * sx
            o += f'{p:.2f} {y:.2f} m {p:.2f} {y + t * MM:.2f} l S\n'
            if mm % 10 == 0:
                o += txt(p - 1.5, y + 3.6 * MM, str(mm // 10), 5.5)
    if vertical:
        o += f'{x:.2f} {y:.2f} m {x:.2f} {y + length * MM * sy:.2f} l S\n'
    else:
        o += f'{x:.2f} {y:.2f} m {x + length * MM * sx:.2f} {y:.2f} l S\n'
    return o


# ---------------- szukanie kart ----------------
DATA = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/'
SMALL = 'https://images.pokemontcg.io/{set}/{num}.png'   # mała wersja (~245×342) do katalogu


def get_json(url, f):
    if not os.path.exists(f):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'print_cards/1.0'}), timeout=60).read()
        except Exception:
            r = subprocess.run(['curl', '-fsSL', url], capture_output=True)
            if r.returncode:
                sys.exit(f'nie udało się pobrać {url}: {r.stderr.decode().strip()}')
            data = r.stdout
        open(f, 'wb').write(data)
    return json.load(open(f, encoding='utf-8'))


def card_index(refresh=False):
    """[nazwa, zestaw, numer, nazwa zestawu, data, hp, rzadkość, podtypy] dla wszystkich kart; jeden plik w pamięci podręcznej"""
    d = os.path.join(CACHE, 'data')
    os.makedirs(d, exist_ok=True)
    idx = os.path.join(d, 'index.json')
    if refresh:
        for f in os.listdir(d):
            os.remove(os.path.join(d, f))
    if os.path.exists(idx):
        return json.load(open(idx, encoding='utf-8'))
    sets = get_json(DATA + 'sets/en.json', os.path.join(d, 'sets.json'))
    print(f'pierwsze szukanie: pobieram listy kart z {len(sets)} zestawów (raz, potem z pamięci)…', file=sys.stderr)
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(12) as ex:
        per_set = list(ex.map(lambda st: get_json(f'{DATA}cards/en/{st["id"]}.json', os.path.join(d, st['id'] + '.json')), sets))
    rows = [[c['name'], st['id'], c['number'], st['name'], st['releaseDate'].replace('/', '-'), c.get('hp', ''), c.get('rarity', ''), ' '.join(c.get('subtypes', []))]
            for st, cards in zip(sets, per_set) for c in cards]
    json.dump(rows, open(idx, 'w', encoding='utf-8'))
    for st in sets:                                        # zostaje tylko indeks (~5 MB zamiast ~100 MB)
        os.remove(os.path.join(d, st['id'] + '.json'))
    return rows


def fold(t):
    return unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()


def find(query, set_filter, refresh):
    words = fold(query).split()
    sf = set_filter and fold(set_filter)
    hits = [r for r in card_index(refresh) if all(w in fold(r[0]) for w in words) and (not sf or sf in fold(r[3]) or sf == r[1])]
    return sorted(hits, key=lambda r: (r[4], r[1], int(re.sub(r'\D', '', r[2]) or 0), r[2]))


def main():
    if hasattr(signal, 'SIGPIPE'):
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)   # „| head” bez błędu
    ap = argparse.ArgumentParser(description='Karty TCG do druku (PDF, prawdziwy rozmiar, linijka do kalibracji)')
    ap.add_argument('lista', nargs='?', help='plik z listą kart (ilość zestaw numer)')
    ap.add_argument('-o', '--out', default='karty_do_druku.pdf')
    ap.add_argument('--scale', type=float, default=1.0, help='poprawka skali, np. 1.03 = +3 %% (drukarka zmniejsza)')
    ap.add_argument('--scale-y', type=float, help='osobna poprawka w pionie (domyślnie = --scale)')
    ap.add_argument('--paper', choices=PAPER, default='a4')
    ap.add_argument('--cols', type=int, default=3)
    ap.add_argument('--rows', type=int, default=3)
    ap.add_argument('--gap', type=float, default=0.0, help='odstęp między kartami w mm (0 = jedno cięcie dzieli dwie karty)')
    ap.add_argument('--no-lines', action='store_true', help='bez cienkich linii cięcia wokół kart')
    ap.add_argument('--calibrate', action='store_true', help='tylko strona kalibracji (linijki 150 mm i 250 mm + ramka karty)')
    ap.add_argument('--find', metavar='NAZWA', help='szukaj karty po angielskiej nazwie, np. "pikachu" albo "charizard ex"')
    ap.add_argument('--set', metavar='ZESTAW', help='przy --find: fragment nazwy zestawu („151”, „Hidden Fates”) albo id (sv3pt5)')
    ap.add_argument('--preview', action='store_true', help='przy --find: PDF z małymi kartami i podpisami do wyboru (znalezione.pdf)')
    ap.add_argument('--refresh', action='store_true', help='przy --find: pobierz bazę kart od nowa (nowe zestawy)')
    a = ap.parse_args()
    if a.find:
        hits = find(a.find, a.set, a.refresh)
        if not hits:
            sys.exit(f'nic dla „{a.find}”' + (f' w „{a.set}”' if a.set else '') + ' — nazwy kart są po angielsku (np. Snorlax, Mr. Mime, Charizard ex)')
        for name, st, num, sname, date, hp, rar, sub in hits:
            print(f'1  {st:<7} {num:<6} # {name} — {sname} ({date[:7]})' + (f' · HP {hp}' if hp else '') + (f' · {rar}' if rar else '') + (f' · {sub}' if sub else ''))
        print(f'# znaleziono: {len(hits)} — skopiuj wybrane wiersze do listy (pierwsza liczba = ile sztuk)', file=sys.stderr)
        if not a.preview:
            return
        a.cards = [(SMALL.format(set=h[1], num=h[2]), f'{h[1]} {h[2]}  ({h[4][:4]})') for h in hits]
        a.scale, a.scale_y, a.cols, a.rows, a.gap, a.no_lines = 0.5, None, 5, 5, 12.0, True
        if a.out == 'karty_do_druku.pdf':
            a.out = 'znalezione.pdf'
    sx, sy = a.scale, a.scale_y or a.scale
    pw, ph = PAPER[a.paper]
    W, H = pw * MM, ph * MM
    cw, ch = CARD[0] * MM * sx, CARD[1] * MM * sy
    gx, gy = a.gap * MM * sx, a.gap * MM * sy
    gw, gh = a.cols * cw + (a.cols - 1) * gx, a.rows * ch + (a.rows - 1) * gy
    x0, y0 = (W - gw) / 2, (H - gh) / 2                    # siatka na środku strony
    if x0 < 4 * MM or y0 < 9 * MM:
        sys.exit(f'{a.cols}×{a.rows} kart w skali {sx:.3f}/{sy:.3f} nie mieści się na {a.paper} z miejscem na linijkę — zmniejsz --cols/--rows')

    pdf = PDF()
    font = pdf.add(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    info = f'skala X {sx:.3f}  Y {sy:.3f}  karta {CARD[0]:g}x{CARD[1]:g} mm  papier {a.paper.upper()}'
    howto = 'Drukuj w skali 100% (nie "Dopasuj"). Zmierz linijka odcinek 0-10 (100 mm): ma X mm -> nowa skala = obecna x 100 / X'

    def frame(ops, bottom_len):                            # linijki w marginesach + opis
        ops += ruler(x0, y0 - 8.2 * MM, bottom_len, sx, sy)
        ops += txt(x0 + (bottom_len + 2) * MM * sx, y0 - 8 * MM, f'{bottom_len} mm', 6)
        if x0 > 7 * MM:
            vl = min(int(gh / MM / sy) // 10 * 10, 250)
            ops += ruler(x0 - 6.4 * MM, y0, vl, sx, sy, vertical=True)
        ops += txt(x0, H - y0 + 3 * MM, info, 6.5) if H - y0 + 6 * MM < H else ''
        ops += txt(x0, y0 - 11.5 * MM, howto, 6) if y0 > 13 * MM else ''
        return ops

    if a.calibrate or not (a.lista or a.find):
        ops = frame('', min(int(gw / MM / sx) // 10 * 10, 150))
        ops += f'0 g 0.4 w {x0:.2f} {H / 2 - ch / 2:.2f} {cw:.2f} {ch:.2f} re S\n'
        ops += txt(x0 + 3 * MM, H / 2, f'ramka karty: {CARD[0]:g} x {CARD[1]:g} mm', 8)
        ops += ruler(x0 + cw + 10 * MM, H / 2 - 50 * MM * sy, 100, sx, sy, vertical=True)
        ops += txt(x0 + cw + 16 * MM, H / 2 + 52 * MM * sy, '100 mm (pion)', 7)
        ops += ruler(x0 + cw + 20 * MM, H / 2 - 70 * MM * sy, 100, sx, sy)
        ops += txt(x0 + cw + 20 * MM, H / 2 - 74 * MM * sy, '100 mm (poziom)', 7)
        pdf.save(a.out, [ops], (W, H), {}, font)
        print(f'zapisano {a.out}: strona kalibracji ({info})')
        return

    labels = dict(getattr(a, 'cards', []))
    cards = list(labels) if labels else read_list(a.lista)
    if not cards:
        sys.exit('lista jest pusta')
    images, ids = {}, {}
    for src in dict.fromkeys(cards):                      # każdy obrazek raz w PDF
        ids[src] = len(images)
        images[ids[src]] = pdf.image(load_image(src))
    per, pages = a.cols * a.rows, []
    for p in range(0, len(cards), per):
        ops = ''
        for i, src in enumerate(cards[p:p + per]):
            c, r = i % a.cols, i // a.cols
            x, y = x0 + c * (cw + gx), H - y0 - (r + 1) * ch - r * gy
            ops += f'q {cw:.3f} 0 0 {ch:.3f} {x:.3f} {y:.3f} cm /Im{ids[src]} Do Q\n'
            if not a.no_lines:
                ops += f'0.6 G 0.2 w {x:.3f} {y:.3f} {cw:.3f} {ch:.3f} re S\n'
            if src in labels:
                ops += '0 g ' + txt(x, y - 3.8 * MM, labels[src], 7.5)
        # znaczniki cięcia w marginesie na przedłużeniu krawędzi kart (z odstępem: obie krawędzie)
        ops += '0 G 0.3 w\n'
        for xx in sorted({x0 + c * (cw + gx) + d for c in range(a.cols) for d in (0, cw)}):
            ops += f'{xx:.2f} {H - y0 + 1 * MM:.2f} m {xx:.2f} {H - y0 + 3 * MM:.2f} l S\n'
        for yy in sorted({H - y0 - r * (ch + gy) - d for r in range(a.rows) for d in (0, ch)}):
            ops += f'{x0 + gw + 1 * MM:.2f} {yy:.2f} m {x0 + gw + 3 * MM:.2f} {yy:.2f} l S\n'
        ops += txt(W - 25 * MM, 5 * MM, f'strona {p // per + 1}/{(len(cards) + per - 1) // per}', 6)
        pages.append(ops if labels else frame(ops, min(int(gw / MM / sx) // 10 * 10, 150)))   # katalog: bez linijek
    pdf.save(a.out, pages, (W, H), images, font)
    print(f'zapisano {a.out}: {len(cards)} kart ({len(images)} różnych) na {len(pages)} str. — {info}')


if __name__ == '__main__':
    main()
