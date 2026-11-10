#!/bin/bash
# Mind a 17 videó újraépítése (csak jelenet/felirat): node kit/build.mjs
cd /home/claude/work
while IFS=$'\t' read -r d out title; do
  [ -n "$1" ] && ! echo " $* " | grep -q " $d " && continue
  node kit/build.mjs videos/$d "$out" "$title" > /tmp/b_$d.log 2>&1 && echo "OK $d" || { echo "HIBA $d"; tail -5 /tmp/b_$d.log; }
done < tools/tf_list.txt
