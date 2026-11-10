#!/bin/bash
cd /home/claude/work
bash tools/gate.sh timeout 3000 python3 tools/handcheck.py videos/tf_dp/dist/06_DP_veroszondazas_video.html 120 0 60 0.5 qa/hc_dp.json --shots > qa/hc_dp.txt 2>&1 &
bash tools/gate.sh timeout 3000 python3 tools/handcheck.py videos/tf_spt/dist/07_SPT_szondazas_video.html 116 0 57 0.5 qa/hc_spt.json --shots > qa/hc_spt.txt 2>&1 &
bash tools/gate.sh timeout 3000 python3 tools/handcheck.py videos/tf_hsa/dist/03_Ureges_csospiral_video.html 80 0 38 0.25 qa/hc_hsa.json --shots > qa/hc_hsa.txt 2>&1 &
wait
for f in qa/hc_dp.txt qa/hc_spt.txt qa/hc_hsa.txt; do echo "== $f"; grep -E "hibás|képek|ERR" $f; done
