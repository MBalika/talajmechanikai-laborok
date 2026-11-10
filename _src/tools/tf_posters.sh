#!/bin/bash
# a weboldal indexképei: videónként egy felirat nélküli 3D-kép (dir kulcs idő_s)
cd /home/claude/work
run() { d=$1; k=$2; t=$3; f=$(ls videos/$d/dist/*_video.html); bash tools/gate.sh timeout 1200 python3 tools/tf_poster.py "$f" $t qa/poster/$k.jpg; }
L=( "tf_hord hordozhato 33.6" "tf_gsp gepispiral 61.33" "tf_hsa uregescso 31.5" "tf_gbs geobor 24" "tf_cptu cptu 27.93" "tf_dp dp 34.72"
    "tf_spt spt 22.12" "tf_vst szarnyas 48.0" "tf_pmt pressziometer 41.9" "tf_dmt dmt 94.29" "tf_emi geo-em 22.2" "tf_gpr geo-gpr 84.4"
    "tf_ert geo-ert 21.2" "tf_mag geo-mag 31.03" "tf_ref geo-refrakcio 97.24" "tf_rfl geo-reflexio 83.2" "tf_masw geo-masw 39.2" )
for x in "${L[@]}"; do set -- $x; [ -n "$ONLY" ] && [[ " $ONLY " != *" $2 "* ]] && continue; run $1 $2 $3 & sleep 2; done; wait
