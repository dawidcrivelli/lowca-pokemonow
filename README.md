# Łowca Pokémonów

Gra dla dzieci: wpisz imię Pokémona, rzuć Poké Ballem, złap go do Pokédexu, wystaw na arenę.
Wersja Pokémon [Łowcy Dinozaurów](https://dawidcrivelli.github.io/lowca-dinozaurow/) (gałąź `pokemon`).

**Zagraj:** https://dawidcrivelli.github.io/lowca-pokemonow/

## Co jest w środku

- **151 Pokémonów z Kanto** (Red/Blue, seria Indigo) i **Pokémony z serialu Horyzonty** (łuk „Liko and Roy's Departure”, odc. 1–25,
  z ewolucjami; filtr 📺 Horyzonty; lista: `tmp/horizons.json`) oraz **10 najsłynniejszych z nowszych gier** (Lucario, Greninja, Mimikyu,
  Sylveon, Garchomp, Dragapult, Decidueye, Zoroark, Cinderace, Incineroar, z ewolucjami; filtr 🌟 Sławne; lista: `tmp/famous.json`)
  — niezłapane to czarne sylwetki: „Kto to za Pokémon?”.
- **Polskie podpowiedzi i ciekawostki** z Pokédexu; filtr po typach; wyszukiwarka odporna na literówki.
- **Poké Ball wg rzadkości**: Poké / Great / Ultra / Master Ball (legendarne).
- **Arena** — jak w grach, na poziomie 50: 4 ruchy z gry (Scarlet/Violet, wybór: `tmp/moves.js`), wzór na obrażenia, premia za własny typ,
  tabela typów, stany (☠️ 🔥 ⚡ 💤 🧊 💫), zmiany statystyk, ładowanie i odpoczynek; życie ×2,5, żeby walka trwała ~5 rund.
  Teren daje premię swoim typom (Wyspa Cynamonowa: 🔥…). Tryby ▶️ oglądam / 👆 walczę (4 przyciski ruchów z PP), widok 2D albo 3D
  (pociski w kolorze typu, pioruny, ikony stanów). Komputer wybiera ruch o największych oczekiwanych obrażeniach albo stan / wzmocnienie.
- **Karty** z zestawu „Pokémon 151” (Scarlet & Violet, 2023), dla Horyzontów z innych zestawów (`tmp/pick_cards.js`);
  niezłapane: rewers z sylwetką. U góry przełącznik 🎨 Pokémony / 🃏 Karty
  (siatka i karta Pokémona); dotknij karty lub obrazka → pełny ekran.
- **Walka kartami** (🃏 w nagłówku) — uproszczone zasady Battle Academy: drużyna 3 Pokémonów Podstawowych, co turę
  energia, ewolucja (tylko w złapane!), odwrót, ataki z prawdziwym kosztem i obrażeniami, słabość ×2, 3 nagrody (ex daje 2).
  Efekty z opisu ataku: stany (☠️ 🔥 💤 ⚡ 💫, jak w grze), leczenie, obrażenia na ławce i w siebie, zrzut energii.
- **Oryginalne okrzyki** z Red/Blue.
- **Tryb rodzica** — przytrzymaj ⚙️ przez sekundę: dotknięcie kafelka łapie albo wypuszcza Pokémona, zapis/odczyt pliku, reset.

## Uruchomienie

Otwórz `index.html` w przeglądarce — bez budowania. Obrazki i głosy ładują się z repozytoriów [PokeAPI](https://github.com/PokeAPI), karty z [pokemontcg.io](https://pokemontcg.io) (potrzebny internet przy pierwszym obejrzeniu).

## Struktura

| plik | co robi |
|---|---|
| `js/species.js` | Pokédex (generowany: `node tmp/fetch.js && node tmp/build_species.js`; polskie teksty w `tmp/pl.json` — dopisują je `tmp/pl_hz.py`, `tmp/pl_fam.py` — nazwy ataków w `tmp/attacks_pl.json`, ruchów w `tmp/moves_pl.json`) |
| `js/battle.js` | typy, stany, tereny, silnik walki i komputer, bez DOM; strojenie: `TUNE`, potem `node tmp/sim.js` |
| `js/cards.js` | zasady walki kartami, bez DOM; `node tmp/sim_cards.js` — długość gier komputer vs komputer |
| `js/app.js` | interfejs: łowy, Pokédex, karty, arena, walka kartami, tryb rodzica |
| `js/arena3d.js`, `vendor/three.min.js` | widok walki 3D: wytłoczone grafiki Pokémonów na terenie low-poly |
| `js/voices.js`, `sounds/` | okrzyki (PokeAPI) i odgłosy walki (CC0) |

Zrzuty ekranu: `node tmp/ui_shot.js [ui_steps_3d.json | ui_steps_cards.json]`.

Pokémon © Nintendo / Game Freak / The Pokémon Company. Fanowska, niekomercyjna gra dla dzieci.
