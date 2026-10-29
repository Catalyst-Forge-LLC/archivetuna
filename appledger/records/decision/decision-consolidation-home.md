---
format_version: 0.1.0
id: decision-consolidation-home
kind: decision
title: Build the consolidation workspace in ArchiveTuna
record_status: active
created_at: 2026-10-28T23:52:22Z
updated_at: 2026-10-29T00:07:28Z
recorded_by: { id: codex, type: agent }
visibility: internal
relations:
  - { type: affects, target: app-5b538594-7bd5-416e-813d-7460031ab865 }
claims: []
data:
  status: accepted
  choice: Specify the SvelteKit consolidation review utility as new ArchiveTuna capabilities, with an open-source audience.
  rationale: ArchiveTuna already owns archive inventory and local analysis; the user chose it as the home for the new work.
  alternatives:
    - A separate deduper application
    - Put general file consolidation inside MediaTuna
  authority: Explicit user request on 2026-10-28 to write the spec in ArchiveTuna rather than the deduper folder.
---

This decision establishes product scope and repository destination. It does not approve every technical choice or claim implementation. See [the delivery spec](../../../specs/archive-consolidation.md).
