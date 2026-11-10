#!/bin/bash
cd /home/claude/work
for spec in "$@"; do read -r d f <<< "$spec"; ( bash tools/gate.sh timeout 1500 python3 tools/readload.py videos/$d/dist/$f.html 110 13 0.2 qa/read_$d.json > qa/read_$d.log 2>&1; echo "READ_DONE $d" ) & done; wait; echo ALL_READ_DONE
