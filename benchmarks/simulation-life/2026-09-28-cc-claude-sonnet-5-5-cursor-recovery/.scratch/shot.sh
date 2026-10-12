#!/bin/zsh
# usage: shot.sh script.js out.jpg   (script must console.log "B64:" + base64 as its last line)
cd "$(dirname "$0")/.."
dev-browser --browser garden-check --timeout 150 run "$1" > .scratch/last.out 2>&1
grep -v '^B64:' .scratch/last.out | cut -c1-1500
grep '^B64:' .scratch/last.out | tail -1 | sed 's/^B64://' | base64 -d > "$2"
ls -la "$2"
