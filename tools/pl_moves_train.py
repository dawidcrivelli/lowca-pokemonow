# nazwy ruchów odblokowanych treningiem (poziomy 55–100, tools/moves.js) → tools/moves_pl.json
import json
MOVES = {"giga-impact": "Giga Uderzenie", "magnetic-flux": "Strumień Magnetyczny", "psystrike": "Psychiczne Uderzenie", "eruption": "Erupcja",
 "teeter-dance": "Chwiejny Taniec", "roar-of-time": "Ryk Czasu", "spacial-rend": "Rozdarcie Przestrzeni", "dark-void": "Mroczna Pustka",
 "judgment": "Sąd Ostateczny", "attract": "Urok", "glare": "Groźne Spojrzenie", "plasma-fists": "Plazmowe Pięści", "burn-up": "Wypalenie",
 "aura-wheel": "Koło Aury", "psychic-fangs": "Psychiczne Kły"}
d = json.load(open('tools/moves_pl.json')); d.update(MOVES); json.dump(d, open('tools/moves_pl.json', 'w'), ensure_ascii=False, indent=1)
