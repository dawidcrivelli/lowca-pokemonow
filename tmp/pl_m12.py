# nazwy ruchów (tmp/moves_pl.json) i ataków z kart (tmp/attacks_pl.json) dla Pokémonów z filmu „Arceus i Klejnot Życia” (tmp/movies.json);
# polskie podpowiedzi i ciekawostki tych Pokémonów są wprost w tmp/pl.json
import json
MOVES = {"thunder-shock": "Elektrowstrząs", "supersonic": "Ultradźwięki", "howl": "Wycie", "thunder": "Grom", "extreme-speed": "Superszybkość"}
ATK = {"Zapping Draw": "Elektryczne Dobranie", "Toxic": "Toksyna", "Superpowered Throw": "Superrzut", "Stun Spore": "Paraliżujące Zarodniki",
 "Energy Straw": "Słomka Energii", "Body Slam": "Przygniecenie", "Mega Impact": "Megauderzenie", "Headbang": "Uderzenie Głową",
 "Tiny Bolt": "Mały Piorun", "Flash Impact": "Błyskawiczne Uderzenie", "Rapid Spin": "Szybki Obrót", "Mind Bend": "Zakręcenie Umysłu",
 "Enhanced Blade": "Wzmocnione Ostrze", "Chop": "Siekanie", "Heat Blow": "Gorący Cios", "Tailspin Away": "Odlot w Korkociągu",
 "Everyone Discharge": "Wspólne Wyładowanie", "Whap Down": "Trzepnięcie", "Nosh": "Chrupanie", "Loom Over": "Groźne Pochylenie",
 "Toxic Sting": "Trujące Żądło", "Triple Nose": "Potrójny Nos", "Iron Buster": "Żelazny Pogromca", "Buster Tail": "Ogon Pogromcy",
 "Teleportation Burst": "Teleportujący Wybuch", "Prize Count": "Liczenie Nagród", "Steel Burst": "Stalowy Wybuch", "Shred": "Rozszarpanie",
 "Power Edge": "Ostrze Mocy"}
for f, new in [('tmp/attacks_pl.json', ATK), ('tmp/moves_pl.json', MOVES)]:
    d = json.load(open(f)); d.update(new); json.dump(d, open(f, 'w'), ensure_ascii=False, indent=1)
