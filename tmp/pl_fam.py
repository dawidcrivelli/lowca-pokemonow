# polskie teksty dla sławnych Pokémonów z gen. 4–9 (tmp/famous.json) → dopisuje do tmp/pl.json; nazwy ataków z kart: tmp/attacks_pl.json
import json
PL = {
443: ("Pokémon Lądowy Rekin", "Mały, granatowy smoczek z wielką paszczą i płetwą na grzbiecie, trochę jak rekin.", "Mieszka w ciepłych jaskiniach i wyskakuje na zdobycz, która podejdzie za blisko."),
444: ("Pokémon Jaskinia", "Granatowy smok-rekin z płetwami na łokciach i ostrymi zębami.", "Zbiera błyszczące kamienie i chowa je w swojej jaskini."),
445: ("Pokémon Odrzutowiec", "Duży granatowy smok-rekin z czerwonym brzuchem i płetwami jak skrzydła odrzutowca.", "Składa ręce i leci tak szybko jak odrzutowiec. W serialu to Pokémon mistrzyni Cynthii."),
447: ("Pokémon Emanacja", "Mały, niebiesko-czarny piesek-szakal z czarną maską, stoi na dwóch łapach.", "Wyczuwa uczucia innych i wysyła fale aury, gdy się boi albo cieszy."),
448: ("Pokémon Aura", "Niebiesko-czarny wojownik podobny do szakala, z kolcami na rękach i piersi.", "Widzi aurę — energię wszystkiego, co żyje — i rozumie ludzką mowę. W serialu to partner Asha."),
570: ("Pokémon Sprytny Lis", "Mały szaro-czarny lisek z czerwonymi oczami i czerwonym czubkiem na głowie.", "Zamienia się w ludzi albo inne Pokémony, żeby płatać figle."),
571: ("Pokémon Lis Iluzji", "Duży czarny lis z długą czerwono-czarną grzywą, chodzi na dwóch łapach.", "Potrafi pokazać wszystkim złudzenie — jego iluzja może wyglądać jak cały krajobraz!"),
656: ("Pokémon Bąbelkowa Żaba", "Mała niebieska żabka z białą pianą wokół szyi jak szalik.", "Pianka na szyi chroni jego ciało. W serialu to pierwszy Pokémon Asha z Kalos."),
657: ("Pokémon Bąbelkowa Żaba", "Niebieska, smukła żaba z białą pianą i długimi nogami.", "Rzuca kamyczkami owiniętymi w pianę i trafia w cel z 30 metrów."),
658: ("Pokémon Ninja", "Granatowa żaba-ninja z różowym językiem owiniętym wokół szyi jak szalik.", "Robi wodne gwiazdki ninja, które tną nawet metal. Pojawia się i znika jak prawdziwy ninja!"),
700: ("Pokémon Wstążka", "Różowo-biały lisek-kot z niebieskimi oczami i długimi wstążkami jak czułki.", "To ewolucja Eevee. Wstążkami wysyła kojącą aurę, która uspokaja kłótnie."),
722: ("Pokémon Trawiaste Pióro", "Mała, okrągła sówka z zielonym listkiem jak muszka pod dziobem.", "Za dnia zbiera energię ze słońca, a nocą atakuje. W serialu to Pokémon Asha z Alola."),
723: ("Pokémon Pióro Ostrze", "Brązowo-biała sowa z liśćmi-ostrzami na skrzydłach i fryzurą jak grzywka.", "Dba o swoje pióra jak elegant — rzuca nimi jak ostrymi nożami."),
724: ("Pokémon Pióro Strzała", "Wysoka sowa-łucznik w zielonym kapturze z liści.", "Wyciąga pióro ze skrzydła, napina pnącze jak łuk i trafia w cel ze 100 metrów."),
725: ("Pokémon Ognisty Kot", "Mały czarny kotek w czerwone paski, z żółtymi oczami.", "Liże swoje futro i podpala je, żeby strzelać ognistymi kulkami. W serialu to Pokémon Asha z Alola."),
726: ("Pokémon Ognisty Kot", "Czarno-czerwony kot z dzwonkiem z ognia na szyi.", "Dzwonek na szyi to płomień, który bije jasno, gdy Torracat strzela ogniem."),
727: ("Pokémon Zapaśnik", "Duży tygrys-zapaśnik na dwóch łapach, z płonącym pasem mistrza.", "Lubi walczyć jak zapaśnik w ringu. Płonący pas na brzuchu daje mu siłę."),
778: ("Pokémon Przebieraniec", "Malutki Pokémon schowany pod szmatką przebraną za Pikachu, z krzywym uszkiem.", "Przebiera się za Pikachu, bo bardzo chce, żeby wszyscy go lubili. Nikt nie wie, co jest pod szmatką!"),
813: ("Pokémon Królik", "Biały króliczek z czerwonym noskiem i pomarańczowymi uszkami.", "Biega tak szybko, że ma gorące łapki — zostawia za sobą małe płomyki."),
814: ("Pokémon Królik", "Szaro-biały królik w opasce, z futrem jak bluza z kapturem.", "Kopie ognistą kulkę z łatwością, jak piłkarz piłkę."),
815: ("Pokémon Napastnik", "Wysoki biały królik-piłkarz z płonącymi łapami i pomarańczową grzywą.", "Podbija kamyk, aż zapali się w ognistą piłkę, i strzela nią w rywala jak gola."),
885: ("Pokémon Błąkający się", "Mały zielono-szary smoczek-duszek z pomarańczowymi oczami.", "To duch dawnego Pokémona, który żył w morzu. Lubi straszyć ludzi dla zabawy."),
886: ("Pokémon Opiekun", "Zielono-szary smok-duch z głową jak trójkąt, na której nosi małego Dreepy.", "Opiekuje się Dreepy i wozi go na głowie, aż maluch dorośnie."),
887: ("Pokémon Niewidzialny", "Duży zielony smok-duch z rogami jak odrzutowiec, w których siedzą Dreepy.", "Wystrzeliwuje Dreepy z rogów szybciej niż samochód wyścigowy. Dreepy to uwielbiają!"),
}
ATK = {}
for f, new in [('tmp/pl.json', {str(k): dict(zip(('kind', 'hint', 'fact'), v)) for k, v in PL.items()}), ('tmp/attacks_pl.json', ATK)]:
    d = json.load(open(f)); d.update(new); json.dump(d, open(f, 'w'), ensure_ascii=False, indent=1)
