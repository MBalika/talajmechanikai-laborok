#!/bin/bash
# Kulcsképkocka-lapok a „Síkalapokat érő hatások” videóihoz: 12 egyenletes időpont, 3 oszlopos mozaik → qa/<dir>_kf.jpg
# használat: bash tools/kf_h.sh "h1_dinamikus Hatasok_1_Dinamikus 157 96" …
cd /home/claude/work
for spec in "$@"; do
  read -r d out sec bpm <<< "$spec"
  ts=$(python3 -c "print(' '.join(f'{$sec*(k+0.5)/12:.2f}' for k in range(12)))")
  rm -f qa/${d}_kfn_*
  BPM=$bpm bash tools/gate.sh timeout 3000 python3 kit/shoot.py videos/$d/dist/$out.html qa/${d}_kfn $ts >/dev/null 2>&1
  python3 kit/mosaic.py "qa/${d}_kfn_0*.jpg" qa/${d}_kf.jpg 3 >/dev/null && echo "KF $d $(ls qa/${d}_kfn_0* | wc -l)"
done
echo KF_KESZ
