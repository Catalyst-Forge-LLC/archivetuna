# STL models

Models mode creates a visual catalog of STL files: a five-view collage followed
by a YAML sidecar with machine facts and an optional local vision description.

## Setup

Install f3d and ImageMagick for collage rendering. ArchiveTuna checks PATH,
the F3D/MAGICK environment overrides, and common Windows installation locations.
Doctor reports their availability.

Vision needs a downloaded local Ollama model that supports images. Select it
explicitly with --model when your normal triage model lacks that capability.

## Commands

```sh
archivetuna models "/path/to/models" --dry-run
archivetuna models "/path/to/models" --model YOUR_LOCAL_VISION_MODEL
archivetuna models collage "/path/to/models"
archivetuna models meta "/path/to/models" --no-vision
archivetuna models collage "/path/to/part.stl" --out ./preview
```

The combined workflow and meta require a directory. Only collage accepts a
single file. --out is supported only for a single-file collage; batch artifacts
always go beside their STLs. --limit caps each stage's batch.

## Outputs

- part-collage.png: top, front, left, right, and perspective views, with filename/date.
- part.stl.yaml: path, size, filesystem date, model provenance, description/tags
  when vision succeeds, and a human notes block.

Filesystem dates may reflect copying or recovery rather than creation.
Filename and nearby folder names are clues, not guaranteed facts.

Existing collages and sidecars are skipped. Notes are not rewritten. To redo
an output, deliberately move that output aside first; there is no automatic
overwrite flag. A facts-only sidecar is also considered existing, so a later
vision run will skip it.

## Failure and retry

Rendering failures are logged per file. Vision failures do not create a
completed sidecar, so a later run can retry. Meta with vision skips files lacking
a collage. A batch with failed or missing-collage entries exits nonzero.

Facts-only meta needs no collage, renderer, or Ollama. Dry-run previews both
adjacent outputs without opening STL/image contents or running external tools.
