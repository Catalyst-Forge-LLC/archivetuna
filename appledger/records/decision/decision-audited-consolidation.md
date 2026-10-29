---
format_version: 0.1.0
id: decision-audited-consolidation
kind: decision
title: Review combined move and duplicate-removal plans with audited script execution
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
  choice: Support consolidation into trusted folders, including moves and duplicate removal, with generated/runnable shell scripts and strong reporting of actions and surviving locations.
  rationale: The user needs to reason about file organization and execute reviewed decisions with a durable history.
  alternatives:
    - A static duplicate report viewer
    - Manual file operations with no recorded plan
  authority: Explicit user requirements in the 2026-10-28 conversation.
---

Actual trusted destinations, backup exceptions, removal mode, and preservation requirements remain unresolved. No authorization to run a particular real-file plan is implied.
