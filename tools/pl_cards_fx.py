# nazwy ataków ochronnych (bez obrażeń, dodane razem z efektami z opisu ataku) → tools/attacks_pl.json
import json
ATK = {"Rigidify": "Zesztywnienie", "Fluffy Guard": "Puszysta Osłona", "Hide": "Ukrycie", "Protect": "Ochrona", "Slight Splash": "Lekki Plusk"}
d = json.load(open('tools/attacks_pl.json')); d.update(ATK); json.dump(d, open('tools/attacks_pl.json', 'w'), ensure_ascii=False, indent=1)
