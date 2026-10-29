---
format_version: 0.1.0
id: decision-consolidation-architecture-proposal
kind: decision
title: Proposed local app, catalog, provider, and execution architecture
record_status: active
created_at: 2026-10-28T23:52:22Z
updated_at: 2026-10-29T00:07:28Z
recorded_by: { id: codex, type: agent }
visibility: internal
relations:
  - { type: affects, target: app-5b538594-7bd5-416e-813d-7460031ab865 }
claims: []
data:
  status: proposed
  choice: Add apps/archive-desk with a loopback SvelteKit/Node runtime, a local SQLite catalog, persistent jobs, a small MediaTuna provider contract, and immutable manifest-driven PowerShell execution bundles.
  rationale: This supports reusable local integrations and review/history across sessions while retaining the existing CLI analysis contract.
  alternatives:
    - Immediate Tauri packaging
    - JSON-only mutable workspace state
    - MCP as the only app integration transport
  authority: Assistant proposal for user review; runtime, driver, and integration capabilities require M0 validation.
---

Quarantine is proposed, not selected. See [open decisions](../../../specs/archive-consolidation.md#12-open-decisions) and the milestone plan before implementation.
