#!/bin/bash
# Kulcsképkocka-lapok mind a 17 videóhoz (vagy a megadottakhoz): 12 egyenletes időpont, 3 oszlopos mozaik → qa/<dir>_kf.jpg
cd /home/claude/work
node tools/tf_totals.mjs > /tmp/tot.txt
while IFS=$'\t' read -r d out title; do
  [ -n "$1" ] && ! echo " $* " | grep -q " $d " && continue
  read -r _ sec _ _ bpm < <(grep "^$d " /tmp/tot.txt)
  ts=$(python3 -c "print(' '.join(f'{$sec*(k+0.5)/12:.2f}' for k in range(12)))")
  ( rm -f qa/${d}_kfn_*; BPM=$bpm bash tools/gate.sh timeout 3000 python3 kit/shoot.py videos/$d/dist/$out.html qa/${d}_kfn $ts >/dev/null 2>&1; python3 kit/mosaic.py "qa/${d}_kfn_0*.jpg" qa/${d}_kf.jpg 3 >/dev/null && echo "KF $d $(ls qa/${d}_kfn_0* | wc -l)" ) &
  sleep 2
done < tools/tf_list.txt
wait; echo KF_KESZ
