# Duplicate candidates

ArchiveTuna compares sets of relative filenames and byte sizes. It hashes those
metadata sets for grouping; it does not hash file contents.

Two files named notes.txt with the same byte size can contain different text.
A matching folder fingerprint therefore means matching metadata, not confirmed
identical content. All matching folders remain eligible for model review.

## Relationships

| Label | Meaning |
| --- | --- |
| Matching metadata | The folders have the same recursive relative filename/size entries |
| Superset | One metadata set contains every entry in the other, plus additional entries |
| Diverged | Both folders contain entries absent from the other |
| Name-collision | Folders share a name but have very little matching metadata |

Global matching groups can contain differently named folders. Other pairwise
comparisons are between same-name folders. Groups above 25 same-name folders
are skipped to avoid an explosion of generic-name comparisons. Empty folders
are excluded. Parent/child comparisons are excluded from pairwise results.

Modification times are recorded in the inventory, but are not used as evidence
that one copy is authoritative. Copies and exports often alter dates.

## Read the extra entries

A superset report includes a sample of extra paths. Those can be a useful lead:
a later prototype, an extra essay, a forgotten design. Diverged folders deserve
review on both sides.

Run duplicate analysis without a model:

```sh
archivetuna scan "/path/to/archive" --out ./review
archivetuna dupes --out ./review
```

The command writes dupes.md and dupes.json without replacing ranked reports.
Content verification and deletion automation are not implemented.
