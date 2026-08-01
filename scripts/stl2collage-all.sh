#!/usr/bin/env bash
# stl2collage-all.sh <folder> [outdir] — run stl2collage.sh on every STL
# under <folder> (recursive). Collages land in <outdir> (default:
# <folder>/_collages), named after the STL's relative path so duplicate
# basenames in different subfolders can't collide. Skips STLs whose
# collage already exists, so it's safe to re-run incrementally.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="${1:?usage: stl2collage-all.sh <folder> [outdir]}"
outdir="${2:-$src/_collages}"
mkdir -p "$outdir"

count=0 skipped=0 failed=0
while IFS= read -r -d '' stl; do
  rel="${stl#"$src"/}"
  flat="$(printf '%s' "${rel%.*}" | tr '/\\ ' '___')"
  final="$outdir/$flat-collage.png"
  if [[ -f "$final" ]]; then
    skipped=$((skipped+1)); continue
  fi
  tmp="$outdir/.tmp-$flat"
  mkdir -p "$tmp"
  if bash "$here/stl2collage.sh" "$stl" "$tmp" >/dev/null 2>&1; then
    mv "$tmp"/*-collage.png "$final"
    count=$((count+1))
    echo "OK   $rel"
  else
    failed=$((failed+1))
    echo "FAIL $rel" >&2
  fi
  rm -rf "$tmp"
done < <(find "$src" -type f -iname '*.stl' -not -path '*/_collages/*' -print0)

echo "----"
echo "rendered: $count  skipped(existing): $skipped  failed: $failed"
echo "collages: $outdir"
