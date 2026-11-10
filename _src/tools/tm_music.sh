#!/bin/bash
# tm_music.sh <videómappa> <stílus> – vágások a shots.js b0-iból, events.json, zene, mp3
set -e
cd "$1"; BPM=$(grep -o "mkTime([0-9]*" timeline.js | grep -o "[0-9]*$")
CUTS=$(python3 -c "
import re;b=[float(x) for x in re.findall(r'b0: ([0-9.]+)', open('shots.js').read())];bt=60/$BPM*4
print([round(x*bt,3) for x in b if x>0])")
node dump.mjs "$CUTS"
python3 ../../kit/music_live3.py events.json music.json music.wav --style "$2" > music.log 2>&1
ffmpeg -y -loglevel error -i music.wav -codec:a libmp3lame -b:a 160k music.mp3
echo "MUSIC_OK $1 $(ffprobe -v error -show_entries format=duration -of csv=p=0 music.mp3)"
