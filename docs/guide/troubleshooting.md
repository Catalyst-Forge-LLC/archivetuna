# Troubleshooting

## Ollama is not ready

Start the local service, check ollama list, and run archivetuna doctor.
Use --model with the exact installed tag; a different tag in the same model
family does not satisfy the request. A smaller downloaded model may fit your
hardware better. ArchiveTuna does not automatically download or select models.

Cloud models and remote endpoints are unsupported. Configure a downloaded model
on loopback. Doctor exits nonzero when required model checks fail; missing
optional render tools are printed separately.

## Saved results do not match

Use the same --out, tier, model, limit, max-depth, and evidence settings that
produced the stage snapshots. A new scan changes the snapshot identity.
Run describe followed by rank, or rerun run. Existing matching model-cache
entries can still be reused. Report deliberately refuses stale results rather
than replacing a useful report with empty or unrelated rankings.

## A folder is missing

Inspect manifest.json and its warnings. Check the prune list, file count,
max-depth, and limit. The scanner does not follow directory symlinks.
Unreadable paths are reported. Selection limits use path order, not relevance.
Names beyond the evidence cap can exist in the manifest without appearing in
the model prompt.

## Rendering fails

Run doctor. Install f3d and ImageMagick, or set F3D/MAGICK to their executable
paths. Try models collage on one STL. Nonzero renderer exits count as failures;
existing outputs are skipped. Facts-only models meta --no-vision works without
rendering.

## Vision adds nothing to an existing sidecar

Existing sidecars are preserved, including those originally created with
--no-vision. Move the generated sidecar aside deliberately if you want to
regenerate it, and retain any human notes yourself.

## CLI installation problems

Check node --version (22+), then archivetuna --version. The npm package should
contain dist/cli.js and the archivetuna executable mapping. If the name is still
a reservation package, use the source setup until the real release is published.

## Slow large archives

Start with --limit 20 and metadata-only T1. The walker visits the tree even when
model work is limited. JSON manifests, repeated folder evidence scans, and
same-name comparisons can become expensive on very large archives. Everything
and incremental scan support remain future work.

## Reports are not a backup

Keep original files in your normal backup process. ArchiveTuna's reports are
an aid to discovery and review. Its sibling MediaTuna helps older video and
audio remain playable; converted copies also do not replace original backups.
