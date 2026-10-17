# Write a profile

A profile tells ArchiveTuna what you hope to recover. It is a YAML file with a
required statement and optional name, projects, topics, and terms.

```yaml
name: My design archive
statement: >
  Find original designs, prototype notes, and unfinished tools I might
  revisit. Business records that explain a project's history also matter.
  Rank downloaded tutorials and third-party dependencies lower.
projects:
  - Garden sensor
  - Workshop organizer
topics:
  - product design
  - electronics
terms:
  - prototype
  - field notes
```

Create a generic starter with archivetuna init. Existing files are never
overwritten. The package includes profiles/starter.yaml; the personal corpus
profile used during Sifter development is excluded from npm.

## Describe value in your own words

Explain what counts as worthwhile. An archive can hold valuable history in
ordinary invoices, proposals, or meeting notes. Naming those interests helps
the model avoid treating them as administrative noise.

List known projects so novelty can point toward unfamiliar substantial work.
Topics and terms provide additional context; they are not deterministic filters
or Everything searches.

## Iterate

Run a small batch, read its reasons, and revise the profile. A same-length edit
still changes the ranking cache identity. You can rerank saved descriptions:

```sh
archivetuna rank --profile profile.yaml --out ./review --limit 20
```

Keep the analysis settings used by describe. If descriptions lack useful
evidence, rerun describe with a deliberately chosen tier, then rank again.

Profiles are local but may contain personal interests and project names.
Review them before sharing.
