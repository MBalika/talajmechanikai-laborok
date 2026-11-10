#!/bin/bash
# A talajfelderítés-sorozat forráscsomagja (kit, tools, videos/tf_*), build-kimenetek és mentések nélkül
cd /home/claude/work
out=${1:-/mnt/user-data/outputs/tf/talajfelderites_forras.zip}
rm -f "$out"
zip -qr "$out" EMBERFIGURA_README.txt README_talajfelderites.md package.json kit tools videos/tf_* \
  -x "*/dist/*" "*/_pre/*" "*.pre_*" "*.mp3" "*.wav" "*/node_modules/*" "*__pycache__*" "*.orig"
unzip -l "$out" | tail -1
