#!/bin/bash
cd /home/claude/work; mkdir -p qa/posters
for spec in "01 tm_szemeloszlas Szemeloszlasi_vizsgalat" "02 tm_folyasi Folyasi_hatar" "03 tm_sodrasi Sodrasi_hatar" "04 tm_zsugorodasi Zsugorodasi_hatar" "05 tm_szerves Szervesanyag_tartalom" "06 tm_kompresszio Kompresszios_vizsgalat" "07 tm_konszolidacio Konszolidacios_vizsgalat" "08 tm_nyiras Kozvetlen_nyirovizsgalat" "09 tx_triax Triaxialis_vizsgalat"; do
  read -r n d f <<< "$spec"; rm -f qa/posters/p${n}_*
  BPM=110 bash tools/gate.sh timeout 600 python3 kit/shoot.py videos/$d/dist/$f.html qa/posters/p$n b7.2 > /dev/null 2>&1
  python3 -c "
from PIL import Image; import glob
f=sorted(glob.glob('qa/posters/p${n}_*.jpg'))[0]; Image.open(f).convert('RGB').resize((1280,720), Image.LANCZOS).save('qa/posters/p${n}.jpg', quality=82, optimize=True, progressive=True)"
  echo "POSTER $n"
done
