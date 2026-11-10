#!/bin/bash
# gate.sh <parancs…> – a gépen (2 CPU, 7 GB) egyszerre legfeljebb 3 böngészős (Chromium/Playwright) folyamat fusson.
# Minden shoot.py / readload.py / shot.py / qa futtatást ezen keresztül indíts:  bash /home/claude/work/tools/gate.sh python3 kit/shoot.py …
while true; do
  for i in 1 2 3; do
    exec 9>/tmp/gate.$i.lock
    if flock -n 9; then "$@"; rc=$?; flock -u 9; exec 9>&-; exit $rc; fi
    exec 9>&-
  done
  sleep 3
done
