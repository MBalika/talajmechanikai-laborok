#!/bin/bash
cd /home/claude/work
run() { d=$1; f=$2; e=$3
  bash tools/gate.sh timeout 1800 python3 tools/errscan.py videos/$d/dist/$f.html 110 0 $e 1 > qa/err_$d.log 2>&1
  bash tools/gate.sh timeout 2400 python3 tools/handcheck.py videos/$d/dist/$f.html 110 8 $e 0.5 qa/hc_$d.json > qa/hc_$d.log 2>&1
  echo "QA_DONE $d"; }
run tm_szemeloszlas Szemeloszlasi_vizsgalat 60 &
run tm_folyasi Folyasi_hatar 48 &
run tm_sodrasi Sodrasi_hatar 40 &
wait
run tm_zsugorodasi Zsugorodasi_hatar 41 &
run tm_szerves Szervesanyag_tartalom 40 &
run tm_kompresszio Kompresszios_vizsgalat 52 &
wait
run tm_konszolidacio Konszolidacios_vizsgalat 44 &
run tm_nyiras Kozvetlen_nyirovizsgalat 46 &
run tx_triax Triaxialis_vizsgalat 48 &
wait; echo ALL_QA_DONE
