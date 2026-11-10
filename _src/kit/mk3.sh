#!/bin/bash
# kit/mk3.sh <video_dir> <OutName> "<Title>"  – zene (music3.py) + build
set -e
cd /home/claude/work/videos/$1
node dump.mjs
python3 ../../kit/music3.py events.json music.json music.wav
ffmpeg -v error -y -i music.wav -b:a 160k music.mp3
cd /home/claude/work
node kit/build.mjs videos/$1 "$2" "$3"
