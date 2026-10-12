#!/bin/zsh
# usage: ./sheet.sh out.png t1 t2 ... (uses out/stills/t<sec>.png, 3 columns)
out=$1; shift
inputs=(); filters=""; i=0
for s in "$@"; do
  f=$(printf "out/stills/t%.2f.png" $s)
  inputs+=(-i $f)
  filters+="[$i:v]scale=640:360[v$i];"
  i=$((i+1))
done
n=$i; cols=3; rows=$(( (n+cols-1)/cols ))
layout=""; for ((j=0;j<n;j++)); do x=$(( (j%cols)*640 )); y=$(( (j/cols)*360 )); layout+="${x}_${y}|"; done
stack=""; for ((j=0;j<n;j++)); do stack+="[v$j]"; done
ffmpeg -v error -y "${inputs[@]}" -filter_complex "${filters}${stack}xstack=inputs=${n}:layout=${layout%|}:fill=gray" $out
