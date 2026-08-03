# Everything (`es.exe`) as a Sifter inventory backend

*Spec addendum, 2026-08-03. Voidtools Everything is already on Sam's
machine (`C:\Program Files\Everything\es.exe`, ES 1.1.0.30). It was used
once as a one-off for the CAD maps (`OBJECT` / `PRODUCT` → TSV dumps),
but Sifter's Stage 0 still walks with Node `opendir` + `stat`. This note
specifies how to wire Everything in properly — optional, Windows-only,
same Manifest shape, same privacy tiers.*

---

## 1. Why

Stage 0 is pure metadata: relative path, name, extension, size, mtime.
That is exactly what Everything's NTFS USN index already holds for every
indexed volume. On a warm index, `es.exe` can return hundreds of
thousands of rows in under a second; the Node walker on
`E:\archives\old-workspace` took ~10 seconds for 30k files, and Google
Drive / network mounts are much worse because every `stat` is a remote
round-trip.

Everything also unlocks queries Stage 0 cannot do today without walking
the whole tree first: "every `.stl` under `Z:\`", "every folder named
`Invoices`", "every `Reality.doc`", "every file matching profile terms."
Those are lead-surfacing and collage/meta targeting jobs.

**Non-goals:** do not replace Ollama stages; do not read file contents
through Everything; do not make Everything required. Node walk stays
the portable default and the fallback.

## 2. Detection and config

```
SIFTER_ES          path to es.exe (default: look on PATH, then
                   "C:\Program Files\Everything\es.exe")
--backend walk|es|auto   (default auto: use es when available +
                          Everything is running + root is under an
                          indexed volume; else walk)
```

Health check before use:

1. Resolve `es.exe`.
2. `es -get-result-count ""` (or a cheap probe) — fails if the Everything
   service/IPC is down.
3. Confirm the scan root is searchable: `es -path <root> -n 1` returns
   at least the root or a child. If zero results on a known-nonempty
   path, fall back to walk and warn ("root not in Everything index").

Log which backend ran into `manifest.json` as `backend: "es" | "walk"`.

## 3. Stage 0 — inventory via `es`

### 3.1 Query shape

Two queries under `-path <absolute-root>`, both exported as TSV with
explicit columns and ISO dates:

```bash
# files
es -path "<root>" /a-d -csv -size -date-modified -date-format 1 \
   -size-format 1 -full-path-and-name

# folders
es -path "<root>" /ad  -csv -date-modified -date-format 1 \
   -full-path-and-name
```

(`-csv` / `-tsv` are both available; prefer TSV if commas in paths are
common. Paths with quotes/newlines must be handled; reject or escape
rows that don't parse cleanly.)

Sort is optional (`-s` path-ascending) for deterministic manifests.

### 3.2 Mapping into `Manifest`

Reuse the existing types in `src/types.ts`. For each file row:

| es column | Manifest field |
| --- | --- |
| full path | derive `dir` (relative to root, `/`-joined) + `name` |
| size (bytes) | `size` |
| date-modified (ISO) | `mtimeMs` |
| (from name) | `ext` |

For each folder row: `path`, `name`, `depth` as today. Always include
the root as `path: ""`.

Apply the existing prune list **after** the dump (filter any path
segment matching `node_modules`, `.git`, etc.). Do not rely on
Everything's own excludes matching Sifter's — they may differ.

### 3.3 Semantics to preserve

- **mtimes still lie.** Store them; never treat as authoritative
  (standing Stage 0 caveat). Everything's dates are the same filesystem
  dates the walker would have read.
- **No content.** Stage 0 via es must not use Everything's optional
  content indexing. Filename/size/date only — keeps T0/T1 privacy
  boundaries intact.
- **Resumability.** Write the same `manifest.json`. Downstream stages
  (`dupes`, `describe`, `rank`) stay unchanged.

### 3.4 Acceptance

On a path already indexed, `sifter scan <root> --backend es` produces a
Manifest whose file count and total bytes are within noise of
`--backend walk` (allow small deltas for transient files / junctions).
`sifter dupes` on either manifest should yield the same identical-
cluster count within a small tolerance. Document any systematic
differences (reparse points, offline cloud placeholders).

## 4. Beyond Stage 0 — higher-leverage uses

These are the wins that justify the integration beyond speed.

### 4.1 Global lead surfacing (`sifter find` / `sifter leads`)

New command, read-only, no LLM required:

```bash
sifter find --ext stl --under Z:/Google Drive/data/Projects
sifter find --name Reality.doc
sifter find --profile profiles/corpus.yaml --terms
```

Implementation: build an Everything query from flags / profile
`projects` + `terms` (filename and path match), export TSV, group by
parent folder, emit a short Markdown lead list. This is the CAD-map
one-off, productized — and the right tool when the question is "where
else does X live?" rather than "rank this whole tree."

Privacy: still names/paths/sizes only unless the user later opts into
a describe pass on the hit folders.

### 4.2 Collage / meta targeting

`sifter collage <dir>` and `sifter meta <dir>` currently recurse with
Node. Optional fast path:

```bash
es -path "<dir>" /a-d ext:stl -s
```

Feed that list into the existing collage/meta batch. Huge win on
`OBJECT` / `PRODUCT` / `3dprinter`-scale trees, and lets a future
`sifter collage --under Z:/... --name "*watch*"` target by query.

### 4.3 Profile-aware prefilter before describe/rank

Before Stage 2 spends GPU on thousands of folders, optionally ask
Everything which folders under the root match profile terms (project
names, coinages, known filenames). Boost those paths into the describe
queue and demote obvious noise (`node_modules` already pruned; also
`Copy of`, `backup`, installer ISOs, etc. via negative terms). This
does not replace ranking — it shrinks the candidate set.

### 4.4 Incremental rescan

Everything tracks USN changes. A later enhancement: store
`scannedAt` + a content hash of the es result set; on `--incremental`,
re-query and diff against the cached manifest (added / removed /
size-changed files only), then re-fingerprint only affected folder
subtrees. Walk-backend incremental remains harder; es makes it cheap.

## 5. CLI surface (proposed)

| Flag / command | Behavior |
| --- | --- |
| `--backend auto\|es\|walk` | Stage 0 backend selection |
| `sifter scan …` | unchanged contract; backend is an implementation detail |
| `sifter find <query…>` | new; es-backed lead search (errors clearly if es unavailable) |
| `sifter status` | add: es path, Everything IPC up/down, whether last manifest used es |

`sifter find` is the only command that *requires* Everything. Everything
else must keep working on walk alone (Linux/macOS, unindexed volumes,
CI).

## 6. Implementation sketch

```
src/inventory.ts          keep walkInventory()
src/inventory-es.ts       new: runEs(), parseEsTsv(), toManifest()
src/inventory-auto.ts     probe + dispatch
src/find.ts               new: profile/term/ext queries → leads.md
src/cli.ts                --backend, find subcommand, status lines
```

Spawn `es.exe` with `child_process.spawn` (never shell-interpolate
paths). Prefer argv array + `-path`. Cap with `-n` only for probes;
full inventory must not silently truncate — if Everything's max
results setting could clip, detect via `-get-result-count` vs returned
rows and fail loudly.

## 7. Risks and constraints

- **Windows-only.** Guard with runtime check; never pretend to work
  elsewhere.
- **Index coverage.** Cloud placeholders (Google Drive streaming),
  excluded NTFS folders, and volumes Everything isn't watching will
  look empty. Always compare counts or offer `--backend walk`.
- **IPC dependency.** Everything must be running. Cold start of
  Everything.exe is out of scope; warn and fall back.
- **Path canonicalization.** Everything returns Windows paths; Manifest
  stays relative with `/`. Normalize carefully (`Z:\` vs `Z:/`,
  trailing separators, case).
- **Privacy posture unchanged.** es is local IPC to a local index.
  Still nothing leaves the machine. Do not enable Everything HTTP
  server as part of this design.
- **License / redistribution.** Do not bundle `es.exe`; detect and
  call the installed copy. Document the dependency in the README.

## 8. Suggested rollout

1. **M1 — drop-in Stage 0.** `--backend es` writes a compatible
   `manifest.json`; `dupes`/`describe`/`rank` unchanged. Prove parity
   on `E:\archives\old-workspace`.
2. **M2 — `sifter find`.** Replace the ad-hoc CAD TSV workflow; use it
   next time a lead like "find every invoice folder" appears.
3. **M3 — collage/meta query path + profile prefilter.** Only after M1
   is trusted.
4. **M4 — incremental.** Optional; after manifests are large enough
   that full rescan hurts.

## 9. Acceptance for M1

- [ ] `sifter scan <root> --backend es` succeeds when Everything is up
      and the root is indexed
- [ ] Falls back or errors clearly when es/IPC/index missing
- [ ] `manifest.json` consumed by existing `dupes` without code changes
- [ ] File count within tolerance of `--backend walk` on a local NTFS fixture
- [ ] README documents Everything as an optional Windows accelerator
- [ ] `--dry-run` states which backend would be used and why

---

*Related: one-off precedent in `what-over-how/drafts/kindred-thinkers.md`
(CAD maps via Everything/es.exe); main Sifter spec at
`what-over-how/drafts/sifter-spec.md`; current walker in
`src/inventory.ts`.*
