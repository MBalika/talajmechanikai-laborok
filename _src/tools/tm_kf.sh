#!/bin/bash
cd /home/claude/work
for spec in "$@"; do read -r d f sec <<< "$spec"
  ( ts=$(python3 -c "print(' '.join(f'{$sec*(k+0.5)/15:.2f}' for k in range(15)))"); rm -f qa/kf_${d}_*
    BPM=110 bash tools/gate.sh timeout 1500 python3 kit/shoot.py videos/$d/dist/$f.html qa/kf_$d $ts >/dev/null 2>&1
    python3 tools/sheet.py "qa/kf_${d}_*.jpg" qa/KF_$d.jpg 15; echo "KF $d" ) &
done; wait; echo KF_ALL
