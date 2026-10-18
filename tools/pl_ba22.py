# polskie teksty dla Pokémonów z talii Battle Academy 2022 (tools/academy.json) → tools/pl.json; nazwy ataków z kart → tools/attacks_pl.json, ruchów → tools/moves_pl.json
import json
PL = {
491: ("Pokémon Czarnej Dziury", "Czarny cień z białą grzywą jak dym, czerwonym kołnierzem i jednym niebieskim okiem.", "Wysyła ludziom koszmary, ale robi to, żeby chronić swój dom. W talii Eevee V z Battle Academy."),
494: ("Pokémon Zwycięstwa", "Malutki, kremowo-pomarańczowy stworek z wielkimi uszami w kształcie litery V.", "Daje nieskończoną energię temu, kogo polubi. Kto go spotka, wygrywa każdą zabawę!"),
522: ("Pokémon Elektryczny", "Czarny źrebaczek w białe pasy jak zebra, z grzywą w kształcie błyskawicy.", "Gdy jego grzywa zaczyna świecić, wie, że nadchodzi burza. Ładuje się prądem z piorunów."),
523: ("Pokémon Grom", "Czarna zebra w białe paski z białą grzywą jak błyskawica.", "Biega szybko jak błyskawica, a gdy pędzi, słychać grzmoty. W talii Pikachu V z Battle Academy."),
636: ("Pokémon Pochodnia", "Puchata, biała gąsienica z pięcioma czerwonymi rożkami na głowie.", "Z rożków bucha ogień, którym odstrasza wrogów. Mieszka u stóp wulkanów."),
637: ("Pokémon Słońce", "Wielka ćma z sześcioma pomarańczowymi skrzydłami i białym, puchatym futerkiem.", "Gdy ziemia była zimna i ciemna, jego płonące skrzydła grzały ją jak drugie słońce."),
776: ("Pokémon Bomba Skorupy", "Czerwony żółw-smok z kolczastą skorupą przypominającą wulkan.", "Jego skorupa wybucha, gdy ktoś ją uderzy — dlatego lepiej go nie zaczepiać od tyłu!"),
807: ("Pokémon Błysk", "Kot-wojownik w żółto-czarne paski, z wielkimi łapami pełnymi prądu.", "Biega szybko jak piorun i strzela prądem z pazurów. W talii Pikachu V z Battle Academy."),
862: ("Pokémon Blokada", "Czarno-biały zwierz jak borsuk-punk, z długim językiem i grzywą na głowie.", "Krzyżuje ręce i staje jak mur, żeby zablokować każdy atak. W talii Eevee V z Battle Academy."),
}
ATK = {"Bouncy Circle": "Sprężyste Kółko", "Static Shock": "Elektrowstrząs Statyczny", "Double-Edge": "Podwójne Ostrze", "Dark Slumber": "Mroczny Sen",
 "Night Cyclone": "Nocny Cyklon", "Singe Off": "Opalenie", "Dark Cutter": "Mroczne Ostrze", "Double-Edged Slash": "Obosieczne Cięcie",
 "Flame Cloak": "Płomienny Płaszcz", "Steam Artillery": "Parowa Artyleria", "Shocking Knuckle": "Porażająca Pięść", "Strong Volt": "Mocne Napięcie",
 "Darkness Fang": "Kieł Ciemności", "Scarring Shout": "Raniący Okrzyk", "Punk Smash": "Punkowy Cios", "Furious Kicks": "Wściekłe Kopnięcia",
 "Eerie Tentacles": "Upiorne Macki", "Triple Smash": "Potrójne Uderzenie"}
MOVES = {"v-create": "V-Kreacja", "shell-trap": "Pułapka w Skorupie", "thunder-punch": "Piorunujący Cios", "snarl": "Warknięcie"}
d = json.load(open('tools/pl.json')); d.update({str(k): dict(zip(('kind', 'hint', 'fact'), v)) for k, v in PL.items()}); json.dump(d, open('tools/pl.json', 'w'), ensure_ascii=False, indent=1)
for f, new in [('tools/attacks_pl.json', ATK), ('tools/moves_pl.json', MOVES)]:
    d = json.load(open(f)); d.update(new); json.dump(d, open(f, 'w'), ensure_ascii=False, indent=1)
