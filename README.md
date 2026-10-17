# ArchiveTuna

<img src="https://archivetuna.dev/logo.png" width="440" alt="ArchiveTuna: a silver-blue tuna with archive drawings and digital fragments.">

**Digital archaeology for the things you made, collected, and forgot.**

Point ArchiveTuna at an old folder tree. It inventories what survives, groups
folders with matching metadata, and uses a local Ollama model to describe and
rank the work against your interests. You get a review queue, explanations,
and leads on projects you may have forgotten.

ArchiveTuna never moves or deletes your originals. Core triage writes to its
output directory. The optional STL workflow writes previews and YAML sidecars
beside the models you select.

[Documentation](https://archivetuna.dev/docs/) ·
[Example report](https://archivetuna.dev/docs/example/) ·
[npm](https://www.npmjs.com/package/archivetuna)

## Install

Requires **Node.js 22+**. Inventory and duplicate analysis work without Ollama.
Descriptions and rankings require a downloaded local model served by Ollama.

```sh
npm install -g archivetuna
archivetuna --help
```

Version 0.2.0 is available on npm.

## Start with an inventory

```sh
archivetuna scan "/path/to/old-work" --out ./archive-review
archivetuna dupes --out ./archive-review
```

Read `archive-review/dupes.md`. Matching relative filenames and sizes are
**duplicate candidates**, not proof of identical contents. ArchiveTuna keeps
every candidate eligible for review. It does not perform content-hash verification.

## Find work worth revisiting

```sh
archivetuna init profile.yaml
# Edit profile.yaml: describe your goals, projects, topics, and search terms.

ollama pull gemma4:12b
archivetuna doctor --model gemma4:12b

archivetuna run "/path/to/old-work" --profile profile.yaml --out ./archive-review --dry-run
archivetuna run "/path/to/old-work" --profile profile.yaml --out ./archive-review --limit 20
```

Choose a model that fits your machine with `--model NAME`; the default is
`gemma4:12b`. The local Ollama service must be running. `doctor` reports optional
STL tools separately; their absence does not prevent archive triage.

The default T1 tier sends names and metadata to the local model, without reading
archive file contents. Dry-run previews planned evidence and writes; it makes
no model requests, reads no archive file contents, and writes nothing. It still
reads directory metadata, configuration, profiles, and existing stage files.

## What you get

| File | Purpose |
| --- | --- |
| `report.md` | Ranked folders, actions, reasons, and descriptions |
| `novel.md` | Substantial work the model thinks is absent from your known-project list |
| `dupes.md` / `dupes.json` | Metadata matches and same-name folder relationships |
| `report.json` | Machine-readable analysis |
| `manifest.json` and stage files | Saved scan, results, and resumable caches |

Scores and novelty flags are model judgments to review. They are not statements
of ownership, proof of value, or instructions to delete anything.

Descriptions cover folders through depth 3 by default; `--max-depth N` changes
that. A folder's evidence can include deeper descendants. Root-level files are
included. `--limit N` caps folders in stable path order.

## Privacy and evidence

| Tier | Evidence supplied to the local model |
| --- | --- |
| T0 | Folder paths and subfolder names |
| T1 (default) | T0 plus filenames, byte sizes, and extension counts |
| T2 | T1 plus up to 3 text samples of 4 KiB each per folder |
| T3 | T1 plus full text of up to 20 eligible files, at most 64 KiB each and 256 KiB total per folder |

T2 considers recognized text extensions up to 1 MiB. T3 skips files that do not
fit its bounds; it does not silently truncate them to T2 samples. Binary-like
files containing NUL bytes are skipped. Caps are configurable.

ArchiveTuna accepts only loopback Ollama origins, rejects known cloud-model
names and remote-model metadata, and refuses HTTP redirects. Use a local Ollama
server with downloaded models; do not put a cloud-forwarding proxy on that
endpoint. For additional protection, run Ollama with `OLLAMA_NO_CLOUD=1`.
Model downloads need network access. Local reports and profiles can contain
sensitive paths and text-derived information; share them deliberately.

See [privacy and evidence](https://archivetuna.dev/docs/privacy/) for the exact boundaries.

## Run stages separately

```sh
archivetuna scan "/path/to/old-work" --out ./archive-review
archivetuna describe --out ./archive-review --limit 20
archivetuna rank --profile profile.yaml --out ./archive-review --limit 20
archivetuna report --out ./archive-review --limit 20
archivetuna status --out ./archive-review
```

Use the same analysis settings across stages. `rank` consumes saved descriptions;
`report` consumes saved descriptions and rankings without model calls or archive
content reads. Mismatched scans/settings are rejected before reports are
replaced. Re-running `run` reuses cache entries only when their actual evidence,
folder context, model selection, and profile match.

## STL models

Requires **f3d** and **ImageMagick** for rendering. Vision descriptions also need
a downloaded Ollama model with image support. Use `F3D` and `MAGICK` environment
variables when the executables are not discoverable.

```sh
archivetuna models "/path/to/models" --dry-run
archivetuna models "/path/to/models" --model YOUR_LOCAL_VISION_MODEL
archivetuna models collage "/path/to/models"
archivetuna models meta "/path/to/models" --no-vision
```

Writes `part-collage.png` and `part.stl.yaml` beside each STL. Existing outputs
are skipped, including human notes. Facts-only metadata needs neither a collage
nor Ollama. Vision sends the collage and filename/path clues to the local model.
This explicit image workflow is separate from the text evidence tiers.

## Configuration and migration

Put overrides in `archivetuna.config.json` in the working directory.
See the [configuration reference](https://archivetuna.dev/docs/configuration/).

ArchiveTuna was previously called **Sifter**. The source folder may still be named
`sifter`. The command is now `archivetuna`; bare directory arguments print a
hint instead of launching STL processing. Legacy `sifter.config.json` is read
with a warning. Top-level `collage` and `meta` remain deprecated aliases.

The output default is now `./archivetuna-out`. Use `--out ./sifter-out` to
reuse an old manifest, then rerun describe/rank. Old model caches are intentionally
ignored because their identity checks were incomplete.

## Development and release

```sh
pnpm install
pnpm test
pnpm pack:smoke
pnpm --dir site install
pnpm site:build
```

The npm package is the repository root. The FilePress site is `site/`;
`docs/guide/` supplies its `/docs` pages. Maintainers can find release instructions in `docs/RELEASE.md` in the source checkout.
Everything integration and additional file modes are planned, not implemented.

**Sibling tool:** [MediaTuna](https://mediatuna.dev) makes older video and audio
usable in modern formats while retaining available dates and tags. ArchiveTuna
helps you discover what you have; MediaTuna helps keep that media playable.

MIT licensed. Part of [Catalyst Forge](https://catalystforge.com/tools/).
