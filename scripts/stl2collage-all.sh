#!/usr/bin/env bash
# stl2collage-all.sh <folder> — run stl2collage.sh on every STL under
# <folder> (recursive). Each collage lands ADJACENT to its STL as
# <name>-collage.png. Skips STLs whose collage already exists, so it's
# safe to interrupt and re-run incrementally.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="${1:?usage: stl2collage-all.sh <folder>}"

count=0 skipped=0 failed=0
while IFS= read -r -d '' stl; do
  dir="$(dirname "$stl")"
  base="$(basename "${stl%.*}")"
  final="$dir/$base-collage.png"
  if [[ -f "$final" ]]; then
    skipped=$((skipped+1)); continue
  fi
  tmp="$dir/.tmp-stl2collage-$base"
  mkdir -p "$tmp"
  if bash "$here/stl2collage.sh" "$stl" "$tmp" >/dev/null 2>&1; then
    mv "$tmp/$base-collage.png" "$final"
    count=$((count+1))
    echo "OK   ${stl#"$src"/}"
  else
    failed=$((failed+1))
    echo "FAIL ${stl#"$src"/}" >&2
  fi
  rm -rf "$tmp"
done < <(find "$src" -type f -iname '*.stl' -print0)

echo "----"
echo "rendered: $count  skipped(existing): $skipped  failed: $failed"
