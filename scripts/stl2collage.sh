#!/usr/bin/env bash
# stl2collage.sh <model.stl> [outdir] — render an STL from five orientations
# (top, front, left, right, perspective) and montage them into one collage.
# Requires: f3d (f3d-app.f3d) and ImageMagick (magick) — both winget-installable.
set -euo pipefail

F3D="${F3D:-/c/Program Files/f3d/bin/f3d.exe}"
MAGICK="${MAGICK:-$(find "/c/Program Files" -maxdepth 2 -iname "magick.exe" 2>/dev/null | head -1)}"
RES="${RES:-700,700}"

stl="$1"
outdir="${2:-.}"
mkdir -p "$outdir"
base="$(basename "${stl%.*}")"

render() { # name camera-direction
  "$F3D" "$stl" --output="$outdir/$base-$1.png" --resolution="$RES" \
    --up=+z --camera-direction="$2" 2>/dev/null
}

render top          "0,0,-1"
render front        "0,1,0"
render left         "1,0,0"
render right        "-1,0,0"
render perspective  "-1,1,-1"

mtime="$(date -r "$stl" +%Y-%m-%d 2>/dev/null || echo unknown)"
title="$base   ·   file date: $mtime"

"$MAGICK" montage \
  -label top         "$outdir/$base-top.png" \
  -label front       "$outdir/$base-front.png" \
  -label left        "$outdir/$base-left.png" \
  -label right       "$outdir/$base-right.png" \
  -label perspective "$outdir/$base-perspective.png" \
  -tile 3x2 -geometry +6+6 -background white -pointsize 22 \
  -title "$title" \
  "$outdir/$base-collage.png"

echo "$outdir/$base-collage.png"
