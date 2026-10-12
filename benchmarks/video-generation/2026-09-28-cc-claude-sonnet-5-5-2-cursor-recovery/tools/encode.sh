#!/bin/sh
set -e
cd "$(dirname "$0")/.."
ffmpeg -y -hide_banner -loglevel warning -framerate 60 -i "$HOME/.dev-browser/tmp/wsq0bo-f%05d.png" -i build/audio.wav \
  -vf "scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 -r 60 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -af "volume=-2.5dB,alimiter=limit=0.6:attack=2:release=40:level=disabled" -c:a aac -b:a 192k -ar 44100 -t 45 -movflags +faststart video.mp4
echo encoded
