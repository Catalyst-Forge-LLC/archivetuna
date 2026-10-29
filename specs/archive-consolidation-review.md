# Consolidation planning review

**Date:** 2026-10-28 (America/New_York)  
**Scope:** Documentation and source-grounded specification review  
**Verdict:** Ready for owner review and M0 validation; implementation not started

Reviewed [the delivery spec](archive-consolidation.md) and [integration contracts](archive-consolidation-integrations.md) using ForgeTrail's verifier, feasibility, acceptance, and ambiguity dimensions. Two read-only agent reviews covered integration feasibility and execution/data-preservation risks. Their initial verdicts were REVISE; both approved the revised specification for review/M0 validation. Agent review is not owner approval or runtime evidence.

## Findings resolved

| Finding | Resolution |
| --- | --- |
| Independent MediaTuna process could not resolve policy IDs | A versioned policy artifact carries actual authorized inputs, evidence/output limits, and resolved model identity; provider validates caller authority and rejects unknown policy. |
| Existing npm packaging could omit the new UI | M0 chooses distribution/launcher; AC17 installs and launches the prepared UI artifact without sibling checkouts. |
| Legacy photo CLI writes conflict with artifacts-only parity | Conformance applies to the proposed machine interface with explicit output policy; legacy CLI behavior is preserved. |
| Different workspaces/bundles could remove each other's survivors | Machine-level coordination covers all callers and survivor identities; unsupported shared-root coordination blocks destruction. |
| Approval receipt lacked trusted authority | Protected local authorization record, explicit bindings/expiry/revocation, and confirmation on a new execution machine. Edited scripts are outside executor guarantees. |
| Planned moves could invalidate every downstream step | Authorized graph includes expected verified postconditions; unexpected external drift blocks the chain. |
| Acceptance rule prohibited ordinary previews | Bulk/list payload restriction separated from bounded authorized preview endpoints. |
| Durable provider jobs were scheduled too late | Required in M2; M4 adds the MCP transport. |
| Permanent deletion conflicted with initial non-goals | M3 uses a selected reversible policy; purge/permanent deletion needs future scope. |

## Validation performed

- Inspected ArchiveTuna's inventory, types, duplicate analysis, evidence, model boundary, stage caches, current workflow, and release contract.
- Inspected relevant MediaTuna Everything, duplicate-report, photo, job, archival, and trash integration behavior; inspected Ollanet discovery/inference exports and limitations.
- Confirmed the installed Everything 1.5 local IPC version probe during discovery. A sandboxed attempt could not reach IPC; the read-only check outside the sandbox succeeded. No exhaustive inventory or content hashing was performed.
- Checked current official Everything CLI/SDK/duplicate-search documentation and used those as design references, with installed-capability checks still required in M0.
- Validated local Markdown references/anchors, code-fence balance, and 20 unique unchecked acceptance IDs against the staged documents and existing repository source.
- Ran `appledger check` and `appledger orient` on the planning records. Format/orientation checks establish ledger consistency, not feature completion.

## Not performed

No feature code, app scaffold, dependency installation, root filesystem scan, model inference, file move/deletion, runtime regression suite, site build, package publication, Git push, or deployment was performed for this specification. Runtime/platform/model-quality checks remain implementation work. The current `pnpm test` verifier is documented; the future combined verifier is explicitly marked as a deliverable.

## Next review

Review the proposed technical choices and open decisions in the main spec. M0 must validate runtime/catalog packaging, installed integration capabilities, preservation/coordination guarantees, and synthetic fixtures. User-specific trusted destinations and reversible-removal policy are needed before real-file execution. Keep the delivery spec Draft until its scope is accepted; no phase transition is recorded here.
