#!/bin/bash
# kit/mk_live.sh <video_dir> <OutName> "<Title>" – hangmintás zene (music_live.py) + build
set -e
cd /home/claude/work/videos/$1
node dump.mjs
python3 ../../kit/music_live.py events.json arrange.json music.wav
ffmpeg -v error -y -i music.wav -b:a 192k music.mp3
cd /home/claude/work
node kit/build.mjs videos/$1 "$2" "$3"
