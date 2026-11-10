#!/bin/bash
# MP4 a képkockákból és a zenéből: bash tools/mp4encode.sh <kocka_mappa> <zene.mp3> <ki.mp4> [fps=25] [crf=24]
set -e
D=$1; A=$2; O=$3; FPS=${4:-25}; CRF=${5:-24}
ffmpeg -v error -y -framerate $FPS -i "$D/f_%05d.jpg" -i "$A" -map 0:v -map 1:a -c:v libx264 -preset veryfast -crf $CRF -pix_fmt yuv420p -profile:v high -level 4.0 \
  -movflags +faststart -c:a aac -b:a 160k -shortest "$O"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$O"
