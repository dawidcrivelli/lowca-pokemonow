/* ================= ODGŁOSY WALKI – nagrania CC0 (sounds/, źródła: sounds/CREDITS.md); okrzyków Pokémonów nie ma: brzmiały źle
   sfx('hit' | 'whoosh' | 'splash' | 'bubble') */
const SOUND_DIR = 'sounds/';
const SOUNDS = { bubble: 3, splash: 2, hit: 3, whoosh: 3 };   // odgłos → liczba wariantów (losowany)
/* <audio> zamiast WebAudio, bo działa też z file:// */
const sfx = name => new Audio(`${SOUND_DIR}${name}_${Math.floor(Math.random() * SOUNDS[name])}.mp3`).play().catch(() => {});
if (typeof module !== 'undefined') module.exports = { SOUND_DIR, SOUNDS, sfx };
