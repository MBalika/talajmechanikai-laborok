#!/bin/bash
# A „Síkalapokat érő hatások” videósorozat forráscsomagja (kit, tools, videos/h*), build-kimenetek és mentések nélkül
cd /home/claude/work
out=${1:-/mnt/user-data/outputs/hatasok/hatasok_forras.zip}
mkdir -p "$(dirname "$out")"; rm -f "$out"
zip -qr "$out" EMBERFIGURA_README.txt VIDEO_BRIEF_H.md package.json kit tools videos/h1_dinamikus videos/h2_foldrengesek videos/h3_uregek videos/h4_kimosas videos/h5_fagy videos/h6_osszefoglalo \
  -x "*/dist/*" "*/_pre/*" "*.pre_*" "*.mp3" "*.wav" "*/node_modules/*" "*__pycache__*" "*.orig" "*.bak"
unzip -l "$out" | tail -1; ls -la "$out"
