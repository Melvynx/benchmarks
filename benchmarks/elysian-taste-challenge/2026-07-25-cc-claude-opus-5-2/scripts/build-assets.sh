#!/usr/bin/env bash
# Derives the web image library for the Elysian experience from the four source
# plates in assets/. Crops are hand-chosen from the source artwork so that the
# page can use fragments of each world (a bust, a pediment, a volcano, a river)
# rather than dropping whole rectangles onto the page.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets"
OUT="$ROOT/public/img"
mkdir -p "$OUT"

ff() { ffmpeg -y -loglevel error "$@"; }

# ---- full plates -------------------------------------------------------------
ff -i "$SRC/still-life.png" -vf "scale=2200:-1:flags=lanczos" -q:v 3 "$OUT/plate-still-life.jpg"
ff -i "$SRC/scholar.png"    -vf "scale=1456:-1:flags=lanczos" -q:v 3 "$OUT/plate-scholar.jpg"
ff -i "$SRC/temple.png"     -vf "scale=1456:-1:flags=lanczos" -q:v 3 "$OUT/plate-temple.jpg"
ff -i "$SRC/valley.png"     -vf "scale=1456:-1:flags=lanczos" -q:v 3 "$OUT/plate-valley.jpg"

# small blurred placeholders, used as the low-frequency layer beneath big art
for n in still-life scholar temple valley; do
  ff -i "$OUT/plate-$n.jpg" -vf "scale=32:-1,gblur=sigma=1.2" -q:v 8 "$OUT/tiny-$n.jpg"
done

# ---- fragments ---------------------------------------------------------------
# still-life (2944x1648)
ff -i "$SRC/still-life.png" -vf "crop=700:960:2140:220,scale=560:-1:flags=lanczos"  -q:v 4 "$OUT/frag-bust.jpg"
ff -i "$SRC/still-life.png" -vf "crop=380:430:1140:830,scale=480:-1:flags=lanczos"  -q:v 4 "$OUT/frag-head.jpg"
ff -i "$SRC/still-life.png" -vf "crop=900:780:180:300,scale=680:-1:flags=lanczos"   -q:v 4 "$OUT/frag-frame.jpg"
ff -i "$SRC/still-life.png" -vf "crop=520:560:1520:640,scale=480:-1:flags=lanczos"  -q:v 4 "$OUT/frag-amphora.jpg"
ff -i "$SRC/still-life.png" -vf "crop=760:420:1080:60,scale=680:-1:flags=lanczos"   -q:v 4 "$OUT/frag-parthenon.jpg"
ff -i "$SRC/still-life.png" -vf "crop=620:520:60:1080,scale=520:-1:flags=lanczos"   -q:v 4 "$OUT/frag-books.jpg"

# scholar (1456x816)
ff -i "$SRC/scholar.png" -vf "crop=250:600:55:70,scale=380:-1:flags=lanczos"   -q:v 4 "$OUT/frag-vase.jpg"
ff -i "$SRC/scholar.png" -vf "crop=520:380:690:50,scale=560:-1:flags=lanczos"  -q:v 4 "$OUT/frag-volcano.jpg"
ff -i "$SRC/scholar.png" -vf "crop=330:430:360:100,scale=440:-1:flags=lanczos" -q:v 4 "$OUT/frag-scholar-head.jpg"
ff -i "$SRC/scholar.png" -vf "crop=430:290:520:250,scale=520:-1:flags=lanczos" -q:v 4 "$OUT/frag-portico.jpg"

# temple (1456x816)
ff -i "$SRC/temple.png" -vf "crop=900:270:280:35,scale=760:-1:flags=lanczos"   -q:v 4 "$OUT/frag-pediment.jpg"
ff -i "$SRC/temple.png" -vf "crop=260:420:640:400,scale=380:-1:flags=lanczos"  -q:v 4 "$OUT/frag-door.jpg"
ff -i "$SRC/temple.png" -vf "crop=420:360:130:460,scale=440:-1:flags=lanczos"  -q:v 4 "$OUT/frag-blossom.jpg"

# valley (1456x816)
ff -i "$SRC/valley.png" -vf "crop=300:400:830:210,scale=400:-1:flags=lanczos"  -q:v 4 "$OUT/frag-tree.jpg"
ff -i "$SRC/valley.png" -vf "crop=680:400:390:50,scale=680:-1:flags=lanczos"   -q:v 4 "$OUT/frag-peaks.jpg"
ff -i "$SRC/valley.png" -vf "crop=860:230:300:586,scale=760:-1:flags=lanczos"  -q:v 4 "$OUT/frag-river.jpg"

# ---- social / favicon --------------------------------------------------------
ff -i "$SRC/temple.png" -vf "crop=1456:764:0:26,scale=1200:-1:flags=lanczos" -q:v 4 "$OUT/og.jpg"

ls -la "$OUT"
du -sh "$OUT"
