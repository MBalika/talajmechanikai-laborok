#!/bin/bash
# Kéz-ellenőrzés mind a 17 videóra (vagy a megadottakra), 0,5 ütemenként, legfeljebb 3 párhuzamosan (gate.sh)
cd /home/claude/work
SH=${SHOTS:---shots}; [ "$SH" = none ] && SH=""
node tools/tf_totals.mjs > /tmp/tot.txt
while IFS=$'\t' read -r d out title; do
  [ -n "$1" ] && ! echo " $* " | grep -q " $d " && continue
  read -r _ sec _ _ bpm < <(grep "^$d " /tmp/tot.txt)
  bars=$(python3 -c "print(int($sec*$bpm/240))")
  bash tools/gate.sh timeout 4000 python3 tools/${CHK:-handcheck}.py videos/$d/dist/$out.html $bpm 0 $bars ${STEP:-0.5} qa/${PFX:-hc}_${d#tf_}.json $SH > qa/${PFX:-hc}_${d#tf_}.txt 2>&1 &
  sleep 2
done < tools/tf_list.txt
wait
for f in qa/hc_*.txt; do echo "== $f $(grep -E 'hibás' $f) $(grep -c PAGEERR $f)"; done
