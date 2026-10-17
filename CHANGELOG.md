# Changelog

## 0.2.0 — ArchiveTuna release candidate

- Rename Sifter to ArchiveTuna, with a new executable, output default, and config name.
- Add init, doctor, standard help/version flags, strict argument validation, and explicit models commands.
- Make dry-run free of archive content reads, inference calls, and writes.
- Keep metadata-only duplicate candidates eligible for review; label all comparisons accurately.
- Hash actual evidence, folder context, model selection, and complete profile content for cache identity.
- Rebuild reports from matching saved analysis; reject stale results without replacing existing reports.
- Give T3 bounded full-text behavior distinct from T2 samples.
- Add loopback/model-locality checks, redirect refusal, inference timeouts, and response validation.
- Save standalone duplicate reports; expose scan warnings and exclude the output directory from inventory.
- Preserve existing STL outputs and notes; support portable renderer discovery and facts-only metadata.
- Prepare a restricted npm package, generic example profile, MIT license, regression tests, and pack smoke test.
- Add a FilePress landing page and shared Markdown documentation at /docs.

## 0.1.0 — Sifter prototype

Local folder inventory, metadata comparisons, Ollama descriptions and ranking,
plus STL collages and YAML sidecars. Unpublished prototype.
