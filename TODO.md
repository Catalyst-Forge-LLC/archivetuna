# ArchiveTuna backlog

This backlog starts with the consolidation feature discussed on 2026-10-28. It is not a reconstruction of all historical work. Current shipped behavior remains documented in [README.md](README.md) and [the guide](docs/guide/getting-started.md).

## Consolidation workspace

Source of truth: [delivery spec](specs/archive-consolidation.md), [integration contracts](specs/archive-consolidation-integrations.md), and [decision/session ledger](appledger/README.md). The [planning review](specs/archive-consolidation-review.md) records source inspection, resolved findings, and validation limits.

- [ ] Review the draft, accepted direction, proposed architecture, and open policy choices. No implementation acceptance is implied by this planning task.
- [ ] M0: validate Everything/ES capabilities, runtime/catalog storage, UI distribution/launcher, filesystem guarantees, provider schemas, and synthetic fixtures.
- [ ] M1: deliver a local SvelteKit review app with multi-root inventory, exact duplicate verification, folder comparison, saved decisions/rules, and plan preview/export.
- [ ] M2: add guarded local Ollama/Ollanet enrichment and MediaTuna artifacts-only provider operations.
- [ ] M3: choose the removal/preservation policy and deliver audited PowerShell execution, reconciliation, cancellation, recovery, and fault-injection checks.
- [ ] M4: add MediaTuna MCP interoperability, optional report import, installation/compatibility checks, documentation, accessibility, and measured performance checks.

Each milestone must satisfy its linked acceptance criteria. New commands, services, and UI described in the spec are proposed. Preserve the existing analysis commands' behavior; do not run a mutation trial against a personal archive.

## Inputs needed before real-file execution

- [ ] Trusted destinations, intentional backups/protected locations, and organization rules.
- [ ] Supported reversible removal policy; quarantine is only a proposal, and permanent deletion/purge is future scope.
- [ ] Metadata-preservation requirements and cloud-placeholder hydration policy.

These inputs do not block review of the specification or synthetic-fixture development. Follow [the release contract](docs/RELEASE.md) for any future publication; this planning work does not publish or deploy anything.
