#!/bin/bash
# a kész videók és a forrás átmásolása a weboldal-repóba
set -e
W=/home/claude/work; S=/home/claude/talajmechanikai-laborok
i=1; for spec in "tm_szemeloszlas Szemeloszlasi_vizsgalat" "tm_folyasi Folyasi_hatar" "tm_sodrasi Sodrasi_hatar" "tm_zsugorodasi Zsugorodasi_hatar" "tm_szerves Szervesanyag_tartalom" "tm_kompresszio Kompresszios_vizsgalat" "tm_konszolidacio Konszolidacios_vizsgalat" "tm_nyiras Kozvetlen_nyirovizsgalat" "tx_triax Triaxialis_vizsgalat"; do
  read -r d f <<< "$spec"; cp $W/videos/$d/dist/$f.html $S/videok/0${i}_$f.html; i=$((i+1)); done
cpx() { rm -rf "$2"; mkdir -p "$2"; cp -a "$1"/. "$2"/; find "$2" \( -name dist -o -name node_modules \) -type d -prune -exec rm -rf {} +; find "$2" \( -name "*.wav" -o -name "*.npz" -o -name music.log \) -delete; }
cpx $W/kit $S/_src/kit
cpx $W/tools $S/_src/tools
for d in tm_lab tm_szemeloszlas tm_folyasi tm_sodrasi tm_zsugorodasi tm_szerves tm_kompresszio tm_konszolidacio tm_nyiras tx_triax; do
  cpx $W/videos/$d $S/_src/videos/$d; done
du -sh $S/videok $S/_src
