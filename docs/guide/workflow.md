# Archive workflow

The core workflow has five stages: inventory, duplicate analysis, description,
ranking, and report writing. Each leaves original archive files untouched.

## One command

```sh
archivetuna run "/path/to/archive" --profile profile.yaml --out ./review
```

Run validates the profile, scans file metadata, compares folder inventories,
describes selected folders, ranks them, and writes reports.

## Separate stages

```sh
archivetuna scan "/path/to/archive" --out ./review
archivetuna dupes --out ./review
archivetuna describe --out ./review --tier 1 --limit 20
archivetuna rank --profile profile.yaml --out ./review --tier 1 --limit 20
archivetuna report --out ./review --tier 1 --limit 20
```

Rank consumes saved descriptions. Report consumes saved descriptions and
rankings; it does not contact Ollama or reread archive contents. You can supply
--profile to report to verify that rankings used that exact profile.

Use the same model, tier, limits, depth, and evidence settings across the
analysis stages. Report refuses mismatched results before replacing reports.

## Coverage

By default, selected folders have at least one descendant file and are at
most three path segments below the archive root. Root-level files also get
a root review entry. A selected folder's evidence includes eligible descendants,
subject to the evidence caps.

--max-depth changes the selection depth. --limit caps the number of folders
in stable path order; it is a workload limit, not a relevance prefilter.
Metadata-match candidates remain in the queue. Directory symlinks are not followed.
Unreadable directories and failed metadata reads are listed as scan warnings.

## Resume and refresh

Successful model results are cached after each folder. If inference fails,
fix the problem and rerun the same command. Previously completed matching
entries can be reused. A completed stage also writes a result snapshot.

Description caches include the actual evidence, folder/root context, model,
and tier. Ranking caches include the full profile and description. Text tiers
reread their planned text evidence to determine whether the description cache
still matches. Old Sifter caches are ignored.

Scan again when the tree changes. A saved report describes the saved scan and
analysis, not a live view of the filesystem. A fresh scan requires fresh stage
snapshots, though matching individual model cache entries can still be reused.

## Outputs

- report.md: ranked folders, reasons, actions, and descriptions.
- novel.md: unfamiliar work the model considers substantial.
- dupes.md and dupes.json: metadata relationships.
- report.json: complete machine-readable analysis.
- manifest.json: metadata inventory and warnings.
- descriptions.json and rankings.json: completed-stage snapshots.
- describe-cache-v2.json and rank-cache-v2.json: reusable model results.

Scores and novelty are judgments, not proof of authorship or significance.
Review the sources before making preservation decisions.
