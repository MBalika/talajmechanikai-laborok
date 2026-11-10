#!/bin/bash
cd /home/claude/work
for spec in "tm_szemeloszlas Szemeloszlasi_vizsgalat" "tm_folyasi Folyasi_hatar" "tm_sodrasi Sodrasi_hatar" "tm_zsugorodasi Zsugorodasi_hatar" "tm_szerves Szervesanyag_tartalom" "tm_kompresszio Kompresszios_vizsgalat" "tm_konszolidacio Konszolidacios_vizsgalat" "tm_nyiras Kozvetlen_nyirovizsgalat"; do
  read -r d f <<< "$spec"
  ( bash tools/gate.sh timeout 1500 python3 tools/readload.py videos/$d/dist/$f.html 110 13 0.2 qa/read_$d.json > qa/read_$d.log 2>&1; echo "READ_DONE $d" ) &
done
wait; echo ALL_READ_DONE
