# Privacy and evidence

ArchiveTuna's core stages distinguish metadata from archive content. The tier
controls what the local model can receive. Inventory always records paths,
sizes, extensions, and filesystem modification times without reading contents.

| Tier | Model evidence | Default bounds per selected folder |
| --- | --- | --- |
| T0 | Folder paths and subfolder names | Up to 80 subfolder names |
| T1 | T0 plus filenames, sizes, extension counts | Up to 80 file names; up to 12 extension groups |
| T2 | T1 plus text excerpts | Up to 3 files, 4 KiB per sample |
| T3 | T1 plus complete small text files | Up to 20 files, 64 KiB per file, 256 KiB total |

T2 selects recognized text extensions with sizes above zero and at most 1 MiB.
T3 includes only files that fit its per-file and total bounds. It skips oversized
files instead of partially including them. Selection favors direct children,
then smaller files, with stable path ordering. Binary-like files containing
NUL bytes are skipped. These are byte limits, not model token limits.

The recognized text extensions include Markdown, plain text, JSON, YAML, HTML,
CSV, common source code, and configuration/log files. PDFs, DOCX, images, and
arbitrary binary formats are not extracted by core triage.

## Dry-run

--dry-run reads directory metadata, config/profile files, and any saved stage
files required by the command. It lists planned text reads and byte limits.
It does not open archive file contents, contact a model, or write files.

A preview describes planned access based on the saved/current inventory;
files can become unreadable or change before a later real run.

## Local inference

Only Ollama origins on localhost, 127.0.0.1, or [::1] are accepted.
ArchiveTuna rejects known cloud model names and models advertising remote
metadata, checks the exact requested tag, and refuses HTTP redirects.

Use a local Ollama service and downloaded models. A custom proxy on loopback
can hide its upstream behavior; ArchiveTuna cannot establish what arbitrary
server software does. For a local-only Ollama installation, disable its cloud
features with OLLAMA_NO_CLOUD=1 and restart the service. Model downloads are a
separate network operation.

ArchiveTuna has no analytics or automatic archive upload. Reports, descriptions,
profiles, and model caches stay on disk and can reveal private context.
Share reviewed outputs deliberately.

## STL inspection is explicit

Models mode is separate from T0–T3. Rendering reads STL geometry through local
f3d and ImageMagick. Vision sends the collage plus filename and nearby path clues
to the configured local model. --no-vision writes machine facts without inference.
The CLI rejects text-tier flags for models mode to avoid implying they limit images.

See [STL models](models.md) for output locations and skip behavior.
