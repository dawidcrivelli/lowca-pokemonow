# Łowca Pokémonów

Gra dla dzieci: wpisz imię Pokémona, rzuć Poké Ballem, złap go do Pokédexu, wystaw na arenę.
Wersja Pokémon [Łowcy Dinozaurów](https://dawidcrivelli.github.io/lowca-dinozaurow/) (gałąź `pokemon`).

**Zagraj:** https://dawidcrivelli.github.io/lowca-pokemonow/

## Co jest w środku

- **514 Pokémonów**: 151 z Kanto (Red/Blue, seria Indigo), z **2. sezonu Horyzontów** („The Search for Laqua”, HZ046–HZ089) te aktywne w odcinkach
  (wymienione w fabule), z 1. sezonu te, które pojawiają się też w 2. (lista: `tools/horizons.json`), z filmu **„Arceus i Klejnot Życia”** (2009; `tools/movies.json`), z talii **Battle Academy 2022** (Pikachu V, Eevee V, Cinderace V; `tools/academy.json`) oraz **10 najsłynniejszych z nowszych gier** (Lucario, Greninja, Mimikyu,
  Sylveon, Garchomp, Dragapult, Decidueye, Zoroark, Cinderace, Incineroar; `tools/famous.json`) — wszystkie z ewolucjami potrzebnymi kartom.
  Dwa filtry naraz: seria / serial (⭐ 🗺️ Kanto, 📺 Horyzonty 1 / 2, 🎬 Arceus (film), 🃏 Battle Academy, 🌟 Sławne) × typ. Niezłapane to czarne sylwetki: „Kto to za Pokémon?”; przytrzymaj sylwetkę, a pokaże kolor i imię (z dźwiękiem: czyta je na głos).
- **Polskie podpowiedzi i ciekawostki** z Pokédexu; filtr po typach; wyszukiwarka odporna na literówki.
- **Poké Ball wg rzadkości**: Poké / Great / Ultra / Master Ball (legendarne).
- **📺 Odcinki** (w nagłówku) — Horyzonty 2 jak na Netflixie (1–44): Pokémony z odcinka w kolorze, imię po przytrzymaniu („jak się nazywał ten dzisiaj?”);
  pamięta ostatni odcinek, ◀ ▶ następny, lista wszystkich z miniaturkami.
- **Arena** (⚔️ w oknie Pokémona) — jak w grach, na poziomie 50: 4 ruchy z gry (Scarlet/Violet, wybór: `tools/moves.js`), wzór na obrażenia, premia za własny typ,
  tabela typów, stany (☠️ 🔥 ⚡ 💤 🧊 💫), zmiany statystyk, ładowanie i odpoczynek; życie ×2,5, żeby walka trwała ~5 rund.
  Teren daje premię swoim typom (Wyspa Cynamonowa: 🔥…). Tryby ▶️ oglądam / 👆 walczę (4 przyciski ruchów z PP), widok 3D
  (pociski w kolorze typu, pioruny, ikony stanów). Forma (jeden przycisk): ⚪ zwykła → 🧬 Mega (50 form, statystyki z gier) →
  💎 Tera (jeden typ, w nim premia ×2); rywal w tej samej formie, jeśli ją ma. Komputer wybiera ruch o największych oczekiwanych obrażeniach albo stan / wzmocnienie
  (każdą statystykę wzmacnia najwyżej raz i nigdy dwa takie ruchy z rzędu); zmienione statystyki widać pod paskiem życia (👊+1 💨+1).
- **Karty** z zestawu „Pokémon 151” (Scarlet & Violet, 2023), dla Horyzontów z innych zestawów (`tools/pick_cards.js`);
  niezłapane: rewers z sylwetką. U góry przełącznik 🎨 Pokémony / 🃏 Karty
  (siatka i karta Pokémona); dotknij karty lub obrazka → pełny ekran.
  W oknie złapanego Pokémona ✨ karty specjalne do obejrzenia: Mega (XY, Mega Evolution) i V / VMAX / VSTAR (`variants` w `tools/pick_cards.js`).
- **Walka kartami** (🃏 w oknie Pokémona) — uproszczone zasady Battle Academy: drużyna 3 Pokémonów Podstawowych, co turę
  energia (dochodzi sama; gdy nie ma nic do zrobienia, tura kończy się sama), ewolucja (tylko w złapane — komputer też, żeby było uczciwie), odwrót, ataki z prawdziwym kosztem i obrażeniami, słabość ×2, 3 nagrody (ex daje 2).
  Efekty z opisu ataku: stany (☠️ 🔥 💤 ⚡ 💫, jak w grze), leczenie, obrażenia na ławce i w siebie, zrzut energii.
- **Trening** — Twój Pokémon (🙂 Ty) zdobywa EXP po każdej walce na arenie: za wygraną zależnie od siły rywala (równy ~25, słabeusz ~1–3,
  silniejszy do 50), za przegraną trochę. 50 EXP = poziom wyżej (statystyki jak w grach), limit poziom 60 (⭐10). Wytrenowane mają znaczek ⭐N (na kafelkach w Pokédexie linijka ⭐N · EXP),
  w karcie pasek EXP; strojenie: `TRAIN` w `js/battle.js`. Walka kartami bez zmian.
- **Tryb rodzica** — przytrzymaj ⚙️ przez sekundę: dotknięcie kafelka łapie albo wypuszcza Pokémona, trening wł./wył. (wyłączony: wszyscy na poziomie 50, EXP zostaje), zerowanie treningu, zapis/odczyt pliku, reset.

## Uruchomienie

Otwórz `index.html` w przeglądarce — bez budowania. Obrazki i głosy ładują się z repozytoriów [PokeAPI](https://github.com/PokeAPI), karty z [pokemontcg.io](https://pokemontcg.io) (potrzebny internet przy pierwszym obejrzeniu).

## Struktura

| plik | co robi |
|---|---|
| `js/species.js` | Pokédex (generowany: `node tools/fetch.js && node tools/build_species.js`; polskie teksty w `tools/pl.json`, nazwy ataków w `tools/attacks_pl.json`, ruchów w `tools/moves_pl.json`) |
| `js/battle.js` | typy, stany, tereny, silnik walki i komputer, bez DOM; strojenie: `TUNE`, potem `node tools/sim.js` |
| `js/cards.js` | zasady walki kartami, bez DOM; `node tools/sim_cards.js` — długość gier komputer vs komputer |
| `js/app.js` | interfejs: łowy, Pokédex, karty, arena, walka kartami, tryb rodzica |
| `js/arena3d.js`, `vendor/three.min.js` | widok walki 3D: wytłoczone grafiki Pokémonów na terenie low-poly |
| `js/sfx.js`, `sounds/` | odgłosy walki (CC0) |

Zrzuty ekranu: `node tools/ui_shot.js [ui_steps_3d.json | ui_steps_cards.json]` → `tmp/`.

`tools/` — skrypty i dane źródłowe (w repo); `tmp/` — cache i wyniki (`tmp/pokeapi/`, `tmp/en.json`, zrzuty), poza repo.

Pokémon © Nintendo / Game Freak / The Pokémon Company. Fanowska, niekomercyjna gra dla dzieci.
