#!/usr/bin/env bash
# Music edit (drops on 5s and 17s) + procedural SFX, music ducked under SFX, two-pass loudnorm to -14 LUFS / -1 dBTP.
set -euo pipefail
cd "$(dirname "$0")"

ffmpeg -v error -y -i music-a.mp3 -filter_complex "\
[0:a]asplit=2[x][y];\
[x]atrim=start=11.02:end=28.02,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.004,afade=t=out:st=16.992:d=0.008[a];\
[y]atrim=start=16.02:end=44.02,asetpts=PTS-STARTPTS,afade=t=out:st=27.2:d=0.8[b];\
[a][b]concat=n=2:v=0:a=1,aresample=48000[m]" -map "[m]" -c:a pcm_s16le music-edit.wav

GRAPH="[0:a]volume=0.72[mu];[1:a]volume=1.0,asplit=2[sx][sc];\
[mu][sc]sidechaincompress=threshold=0.08:ratio=3:attack=4:release=220:makeup=1[duck];\
[duck][sx]amix=inputs=2:normalize=0:duration=first,atrim=end=45"

stats="$(ffmpeg -hide_banner -nostats -i music-edit.wav -i sfx.wav -filter_complex "$GRAPH,loudnorm=I=-14:TP=-1:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
get() { printf '%s' "$stats" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }

ffmpeg -v error -y -i music-edit.wav -i sfx.wav -filter_complex \
  "$GRAPH,loudnorm=I=-14:TP=-1:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000,alimiter=limit=0.82:attack=1:release=60:level=false" \
  -c:a pcm_s16le mix.wav

ffmpeg -hide_banner -nostats -i mix.wav -af loudnorm=I=-14:TP=-1:print_format=summary -f null - 2>&1 | grep -E 'Input (Integrated|True Peak|LRA)'
