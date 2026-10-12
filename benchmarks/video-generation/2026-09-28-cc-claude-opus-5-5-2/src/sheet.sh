#!/bin/zsh
# usage: sheet.sh out.jpg t1 t2 t3 t4 ... (renders previews and tiles 2 columns)
out=$1; shift
node src/preview.mjs "$@"
args=(); for t in "$@"; do args+=(-i preview/t$t.jpg); done
n=$#
ffmpeg -loglevel error -y "${args[@]}" -filter_complex "$(for i in $(seq 0 $((n-1))); do printf "[$i]scale=960:540[v$i];"; done)$(for i in $(seq 0 $((n-1))); do printf "[v$i]"; done)concat=n=$n:v=1:a=0,tile=2x$(( (n+1)/2 ))" -frames:v 1 preview/$out
