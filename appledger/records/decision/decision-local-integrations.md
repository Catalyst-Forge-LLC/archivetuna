---
format_version: 0.1.0
id: decision-local-integrations
kind: decision
title: Use Everything, Ollama/Ollanet, and MediaTuna as local integrations
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
  choice: Prefer Everything discovery on Windows, local model classification using Ollama and Ollanet discovery, and reusable MediaTuna capabilities with an MCP interface.
  rationale: The user requested reuse of existing local tools and models, with less reliance on cloud processing and duplicated functionality.
  alternatives:
    - Depend exclusively on imported Auslogics reports
    - Require cloud inference
    - Reimplement media processing inside ArchiveTuna
  authority: User requirements and accepted direction in the 2026-10-28 planning conversation.
---

Provider interfaces, capability negotiation, evidence policy, and packaging remain proposed in [the integration contracts](../../../specs/archive-consolidation-integrations.md). Optional-dependency behavior and a cloud-free initial scope are specified recommendations.
