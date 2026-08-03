# Sifter

Local-first archive triage. Point it at an old folder tree and get back a
ranked review report: what each folder appears to be, which ones match
what you care about, which are duplicates of each other, and which look
like substantial work you forgot you had.

**Nothing leaves your machine.** All inference runs on a local model via
Ollama (`localhost:11434`). Privacy tiers are hard boundaries in code:

- **T0** — the model sees folder names only
- **T1** (default) — + file names, sizes, extension histograms
- **T2** — + sampled content from a few small text files per folder
- **T3** — + full text of small text files

`--dry-run` shows exactly what would be read at the chosen tier.

## Duplicate handling

Folder fingerprints (recursive name+size sets) classify same-name folders
as **identical** (copies collapsed to one representative), **superset**
(one contains everything in the other plus more — the diff is listed,
because the "more" is what to review), **diverged** (both have unique
material — review both, picking one loses data), or **name-collision**
(same name, unrelated content). mtimes are recorded but never trusted:
exports and copies overwrite them.

## Usage

```bash
pnpm install
pnpm sifter run E:/archives/old-stuff --profile profiles/corpus.yaml --tier 1
# stagewise:
pnpm sifter scan E:/archives/old-stuff
pnpm sifter dupes
pnpm sifter status
```

Outputs in `./sifter-out/`: `report.md` (ranked review queue),
`dupes.md`, `novel.md` (projects the profile didn't know about),
`report.json` (machine-readable), plus resumable stage caches.

A profile is a small YAML file: a statement of what you're looking for,
plus known projects, topics, and terms. See `profiles/corpus.yaml`.

## Spec

Full spec: `what-over-how/drafts/sifter-spec.md` (v1 deviations: JSON
caches instead of SQLite, sha256 instead of BLAKE3, same-name pairwise
comparison instead of global MinHash).

Optional Windows accelerator (not implemented yet): Voidtools Everything
via `es.exe` as a Stage 0 backend and lead-finder — see
[`docs/everything-backend.md`](docs/everything-backend.md).
