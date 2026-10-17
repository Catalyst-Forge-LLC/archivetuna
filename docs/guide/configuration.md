# Commands and configuration

Run archivetuna --help for the executable's command summary. Settings come from
defaults, then archivetuna.config.json in the working directory, then CLI flags.

## Commands

| Command | Inputs | Writes |
| --- | --- | --- |
| init [file] | Packaged starter profile | New profile; refuses overwrite |
| scan root | Directory metadata | manifest.json |
| dupes | Saved manifest | dupes.md, dupes.json |
| describe | Saved manifest and tier-appropriate evidence | Description cache/snapshot |
| rank --profile file | Saved descriptions and profile | Ranking cache/snapshot and reports |
| report | Matching saved descriptions/rankings | Reports only |
| run root --profile file | Archive and profile | Complete scan/analysis/reports |
| status | Output directory | Nothing |
| doctor | Local Ollama and renderer availability | Nothing |
| models [collage/meta] target | STL files and optional collages | Adjacent model outputs |

## Flags

--out selects core output/cache location. --tier selects T0–T3.
--model selects the exact local Ollama tag. --limit caps selected folders or
per-stage model batches; zero means unlimited. --max-depth changes folder
selection depth. --no-vision is for models only. --dry-run previews the
supported command without writes/inference/archive-content reads.
--help/-h and --version/-v work without a config or model.

Run and rank require --profile. Report accepts it as an optional consistency
check against the saved ranking profile. Unsupported flags and extra positional
arguments are errors.

## Configuration defaults

```json
{
  "out": "./archivetuna-out",
  "tier": 1,
  "model": "gemma4:12b",
  "ollamaUrl": "http://localhost:11434",
  "limit": 0,
  "maxDepth": 3,
  "minFiles": 1,
  "sampleFilesPerDir": 3,
  "sampleBytesPerFile": 4096,
  "fullTextMaxFiles": 20,
  "fullTextMaxBytesPerFile": 65536,
  "fullTextMaxTotalBytes": 262144,
  "maxNamesInEvidence": 80,
  "dryRun": false
}
```

Counts and byte caps must be nonnegative integers. Tier must be 0, 1, 2, or 3.
Unknown settings are rejected. The prune array replaces the built-in list:
node_modules, .git, .svn, .hg, __pycache__, bower_components, vendor, pods,
.gradle, .idea, .vs, .settings, .nuget, dist, .cache, $recycle.bin,
and system volume information. Matching is case-insensitive on every platform.

The current output directory is excluded independently of the prune list.
Core outputs cannot use the archive root itself as their directory.

## Migration from Sifter

The product and executable are ArchiveTuna/archivetuna. The source folder may
remain sifter. Rename sifter.config.json to archivetuna.config.json; legacy
config is still read with a warning if the new name does not exist.

Use --out ./sifter-out to read an old manifest. Rerun describe and rank to
create the new caches/snapshots. The old model cache format is intentionally
ignored. Bare paths no longer run STL processing. Use models explicitly.
Top-level collage/meta remain deprecated aliases.

Everything backends, find, content-hash verification, and additional file modes
are not implemented in 0.2.0.
