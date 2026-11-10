# Triaxiális vizsgálat – animációs oktatóvideó (Talajmechanikai laborok, 1. rész)

Build: `node kit/build.mjs videos/tx_triax Triaxialis_vizsgalat "Triaxiális vizsgálat"` → `videos/tx_triax/dist/Triaxialis_vizsgalat.html`

Zene (fejezetenként váltott stílus):
1. `cd videos/tx_triax && node dump.mjs` (events.json)
2. `python3 ../../kit/music_live3.py events.json music.json /dev/null --style <indiepop|funk|brassy> --stem stems/<stílus>.npz` (egyenként)
3. `python3 ../../kit/music_mix.py events.json music.json music.wav stems`
4. `ffmpeg -i music.wav -codec:a libmp3lame -b:a 160k music.mp3`

Ellenőrzés: `tools/readload.py`, `tools/handcheck.py`, `tools/bodycheck.py`, `tools/errscan.py`, `tools/camshot.py`.

Hangminták: Salamander Grand Piano (CC BY 3.0, Alexander Holm), tonejs-instruments (CC BY 3.0, Nicholaus Brosowsky), Tone.js dobminták.
