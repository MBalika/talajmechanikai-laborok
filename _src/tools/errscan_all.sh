#!/bin/bash
# Futásidejű hibák keresése mind a 17 videóban (renderAt 0,5 ütemenként), legfeljebb 3 párhuzamosan
cd /home/claude/work
node tools/tf_totals.mjs > /tmp/tot.txt
while IFS=$'\t' read -r d out title; do
  [ -n "$1" ] && ! echo " $* " | grep -q " $d " && continue
  read -r _ sec _ _ bpm < <(grep "^$d " /tmp/tot.txt)
  bars=$(python3 -c "print($sec*$bpm/240)")
  ( bash tools/gate.sh timeout 1500 python3 tools/errscan.py videos/$d/dist/$out.html $bpm 0 $bars 0.5 > qa/err_${d#tf_}.txt 2>&1; echo "$d: $(grep -c HIBA qa/err_${d#tf_}.txt) hiba $(tail -1 qa/err_${d#tf_}.txt)" ) &
  sleep 2
done < tools/tf_list.txt
wait
