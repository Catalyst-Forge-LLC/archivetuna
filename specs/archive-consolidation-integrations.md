# ArchiveTuna consolidation: integration contracts

**Status:** Proposed contracts; not implemented  
**Date:** 2026-10-28  
**Parent:** [Consolidation delivery spec](archive-consolidation.md)

This companion defines boundaries shared with Everything, Ollanet, and MediaTuna. It does not authorize modifications or releases in sibling repositories. Implementation work there must be coordinated explicitly. Examples use fictional data. Exported API names below are proposed unless identified as existing.

## 1. Inventory provider contract

Inventory providers expose a versioned descriptor, `probe`, `inventory`, and cancellation. ArchiveTuna owns catalog IDs, root permissions, completeness semantics, hashing policy, and persisted observations.

```ts
interface InventoryCapabilities {
  contractVersion: 1;
  provider: 'walk' | 'everything';
  providerVersion: string;
  serverVersion?: string;
  instance?: string;
  structuredFields: string[];
  nativeContentDuplicates: boolean;
  supportsCancellation: boolean;
}

interface InventoryRequest {
  jobId: string;
  rootIds: string[];        // resolved from the authorized workspace
  exclusionsRevision: string;
  mode: 'metadata' | 'content-candidates';
  hydration: 'skip' | 'allow-selected';
}

type Coverage = 'complete' | 'partial' | 'unavailable' | 'unknown';
// Completion includes coverage per root, query scope, backend capabilities,
// start/end timestamps, returned/expected counts where meaningful, and errors.
```

Every adapter emits bounded batches and a final completion record. A missing final record means interrupted/incomplete. Root coverage refers to the configured discovery scope; it is not a guarantee that every byte on a drive was indexed. Store excludes and discovery limitations with the snapshot. Mutable filesystem scans are not atomic snapshots; content identity is independently checked before mutation.

### Everything implementation constraints

- Detect the installed `es.exe` separately from the running Everything instance. Capture both versions and the successful instance. Prefer local IPC; do not enable HTTP/ETP servers or change indexing settings automatically.
- Probe fields, date/size units, CSV/JSON support, timeout behavior, native duplicate/hash queries, and result-count semantics using synthetic fixtures. Server version alone does not establish CLI capability. The discovery interface must work with the installed older CLI or declare the missing capability.
- Spawn with an argument array and hidden window. Query escaping and shell escaping are separate concerns: preserve literal filename characters and quote the Everything query language correctly. Do not concatenate untrusted paths into shell source.
- Prefer bulk scoped inventory to a query per input file. Stream with backpressure and a CSV parser supporting quoted fields; never assume a newline is always a record boundary. Fail closed on malformed/truncated records. Disable silent result caps; reconcile counts and inspect completion/errors.
- Verify scoped roots against known filesystem observations or explicit coverage configuration. An empty query result may mean an unindexed root, unavailable drive, permission failure, or unloaded database. Provide a walker fallback with a recorded reason.
- Native `dupe:size;sha256` can accelerate exact grouping when available. Record stable group keys/content evidence, and revalidate before execution. If hash-property output/completeness is unsupported, inventory exact sizes and hash candidate groups in ArchiveTuna.
- Cancel long content queries cleanly without treating partial results as complete. Refresh duplicate discovery after catalog-affecting changes; do not assume a previous duplicate result set includes newly added files.
- Track cloud placeholders and offline files. Metadata inventory does not authorize content hydration. Hashing and thumbnail extraction obey the workspace hydration policy.

MediaTuna's current implementation is useful source material, not a complete adapter:

| Existing behavior | Required change for ArchiveTuna |
| --- | --- |
| `searchEverything` defaults to 50 results | Explicit complete/bounded result semantics; no silent omission. |
| `runEs` is synchronous with a 16 MiB output ceiling | Worker execution, streaming, cancellation, and error/completion records. |
| CSV parsing splits lines; string queries split whitespace | Proper record parser and typed query builder. |
| Duplicate lookup filters extensions and hashes only size-only matches | Exact grouping across names/extensions; same-name matches require verification too. |
| Node hash path limits candidates to 25 | No hidden verification cap; partial work remains visibly incomplete. |

Source references: [MediaTuna adapter](https://github.com/Catalyst-Forge-LLC/mediatuna/blob/main/lib/everything.js), [duplicate reporting](https://github.com/Catalyst-Forge-LLC/mediatuna/blob/main/lib/dupe-report.js). These links identify the upstream paths; observations were made against the local checkout on the date above and may differ from the published branch.

## 2. Model discovery and inference contract

Use Ollanet's Node API on the server/worker side. Public exports inspected in the local source include `scanNetwork`, `discoverHosts`, `resolveTarget`, `listTargets`, `runPrompt`, `ollamaChat`, `ollamaTags`, and `ollamaShow`. Exact package/version compatibility is checked in M0; local source availability does not prove the installed package exposes the same surface.

Separate discovery from inference authorization:

1. The user chooses discovery scope; start with loopback/configured targets. Network/Tailscale discovery is explicit and LAN sweeping is separately opt-in.
2. Discovery lists host/model capabilities with provenance and last check time. It sends health/model-list probes, not archive contents.
3. The user selects and trusts an endpoint and model for a bounded evidence policy. Resolve aliases once for the job and persist the resolved endpoint; later alias changes cannot silently reroute work.
4. Before sending evidence, inspect model metadata/capabilities and enforce ArchiveTuna's redirect/cloud/locality policy. A user-managed machine's deployment remains part of the trust boundary.
5. Run bounded structured inference and validate its output. Persist provenance and results in ArchiveTuna's store; avoid duplicate hidden transcripts in provider defaults.

```ts
interface ModelTask {
  jobId: string;
  operation: 'describe' | 'classify' | 'suggest-destination';
  targetId: string;           // explicit trusted target
  resolvedEndpoint: string;
  model: string;
  modelDigest?: string;
  evidencePolicyRevision: string;
  promptRevision: string;
  resultSchemaRevision: string;
  evidenceArtifactIds: string[];
  contextRevision: string;    // folders, rules, and human notes
}
```

Use explicit configuration and `save: false` where applicable; `runPrompt` currently saves transcripts by default. Disable unsolicited stdout output in a machine protocol. An app-owned adapter supplies bounded response sizes, timeout/abort semantics, structured progress, and error classes. Do not pass archive data through unrestricted provider calls that bypass policy.

Current Ollanet integration gaps to resolve: `ollamaChat` has text-only public message types, no public caller AbortSignal/token callback, and stdout-oriented streaming. Schema formatting is exposed through settings, but image transport and durable job cancellation need a tested adapter or upstream extension. Its fetch layer does not itself enforce ArchiveTuna's redirect or cloud-model restrictions. Discovery through Ollanet can coexist with a guarded direct Ollama inference adapter until an equivalent upstream contract exists.

A timeout or unsupported capability marks the job blocked/failed with a retry path. Do not claim a local model can classify images merely because it appears in an inventory. Model names, scores, and capabilities are rechecked when target configuration changes. Unknown locality is shown as unresolved; choosing a discovered endpoint does not prove its backend is local.

Reference: [Ollanet Node API](https://github.com/Catalyst-Forge-LLC/ollanet/blob/main/docs/library-api-spec.md). ArchiveTuna's [existing local-model checks](../src/ollama.ts) remain the baseline to preserve.

## 3. MediaTuna capability provider

### Ownership

ArchiveTuna owns inventory scope, user decisions, organization rules, consolidation plans, authorization, cross-file dependencies, moves/removals, and audit history. MediaTuna owns media inspection, classification, previews, conversion logic, and its operation artifacts. Ollanet discovers/resolves model targets; ArchiveTuna's selected evidence policy must survive the provider boundary.

A versioned provider descriptor advertises operations, input/output schema versions, accepted media types, prerequisites, side effects, model needs, cancellation behavior, and output-location control. ArchiveTuna negotiates required capabilities and marks unsupported operations unavailable. It must not infer capability from a package name or parse a human CLI table as the long-term contract.

Initial operations:

| Operation | Output | Allowed effects |
| --- | --- | --- |
| `media.probe` | Container/codec, dimensions/duration, metadata, dates with source attribution | Read selected files; write only job artifacts if needed. |
| `media.preview` | Thumbnail/contact sheet/waveform artifact references as supported | Read selected files; write to declared artifact root. |
| `media.classification.import` | Existing photo sidecar/index facts plus human annotations and provenance | Read existing sidecars/indexes. |
| `media.classify` | Category, description, tags, uncertainty, model/prompt provenance | Bounded approved model evidence; write result artifacts only. |
| `media.conversion.plan` | Proposed output, resource/prerequisite checks, preservation limits | Read/preflight only; follow-on scope. |
| `media.convert` | Verified derivative artifacts and provenance | Explicit follow-on output job; never removes source as a classification side effect. |

Converted or perceptually similar files do not satisfy ArchiveTuna's byte-identical removal rule. Keep their original/derivative relationship in the catalog. Video timestamps and duration checks must not be relabeled as complete content equivalence.

### Requests, results, and jobs

```ts
interface MediaJobRequest {
  contractVersion: 1;
  requestId: string;          // idempotency key, bound to input digest
  operation: string;         // advertised operation only
  inputManifest: string;     // validated absolute path to app-created JSON
  inputDigest: string;
  outputRoot: string;        // app-created, authorized job directory
  outputPolicy: 'artifacts-only';
  policyArtifact: string;     // versioned app-created JSON, resolvable by provider
  policyDigest: string;       // bound into the job/request identity
  modelTargetId?: string;     // traceable identifier, not sufficient authorization
  evidencePolicyRevision: string;
}

interface JobHandle {
  contractVersion: 1;
  providerId: 'mediatuna';
  providerVersion: string;
  jobId: string;
  state: 'queued' | 'running' | 'cancel-requested' | 'cancelled'
    | 'succeeded' | 'partial' | 'failed' | 'needs-reconciliation';
}
// Results include schema version, input version/digest, facts/suggestions,
// warnings, provenance, and relative artifact references with media type/hash.
```

Inputs refer to an exact file list with expected observations and permissions. Existing current CLI directory recursion must not silently expand the authorized set. Validate every artifact path under the job output root, including resolved symlink/reparse targets. Enforce size/type limits and reject unexpected files/results. Human sidecars are authoritative inputs; they are not rewritten in artifacts-only mode.

The policy artifact contains the resolved model endpoint/name/digest and required capabilities, authorized input IDs/paths/versions, allowed evidence types and byte/image limits, hydration policy, output root/effects, expiry, and redirect/cloud restrictions. A local provider can read the app-created artifact; an MCP caller must transfer an equivalent validated policy payload through the negotiated local interface. The provider verifies its digest against the request and checks the requesting client's authority against its configured local access policy. A digest establishes consistency, not trust by itself. Missing, unknown, stale, or unresolvable policy references fail; do not load the provider's own broader defaults. Runtime credentials, if required, use the configured secret channel and are excluded from exported logs/policy artifacts.

The provider returns a job handle promptly. Persistent worker state outlives the UI, CLI caller, and MCP session. Offer submit, status, events after sequence, result, cancel, and resume/reconcile operations. Retry with the same request ID and input digest returns the same job; reusing an ID for changed input is an error. Cancel means stop scheduling and reach a safe checkpoint; resume uses recorded cache/input identity and never blindly repeats a completed side effect.

Current MediaTuna `lib/jobs.js` is an in-process scheduler, and Photo Desk holds child-process state in memory. Durable jobs and restart reconciliation are new M2 prerequisites. Define worker lifetime, lock ownership, disk format, stale-worker detection, and artifact retention before advertising restart-safe behavior. M4 adds MCP transport over that foundation. Provider stderr is diagnostic data; stdout is reserved for the chosen structured protocol.

### Implementation adapters

- Start with a local adapter invoking a versioned MediaTuna machine interface via `spawn`/`execFile`, never a shell command string. Reuse underlying library functions behind that interface where their behavior matches the contract.
- Add an MCP server exposing capabilities, short read operations, job submission, status/events/results, cancellation, and reconciliation over those same services. Prefer local stdio for the initial server; no network service or cloud deployment is required.
- Validate schemas and authorization in the provider independently of MCP tool annotations. MCP is an access interface, not permission to bypass policy. Long jobs use durable handles rather than relying on one indefinitely open tool call.
- ArchiveTuna can use its direct provider adapter while MCP serves other callers; maintain conformance tests so the two adapters do not diverge. Keep conversion jobs separate from ArchiveTuna's destructive consolidation executor.
- The provider must report and enforce the same selected model endpoint/evidence policy. Until MediaTuna supports trusted non-loopback targets under that policy, expose only the supported loopback capability; never weaken guards silently.

MediaTuna currently writes photo YAML sidecars beside originals and `.index` files inside the scanned root. Add a result-only/artifacts-only mode before using its classifier in ArchiveTuna's read-only analysis workflow. Imported human corrections must survive rescans.

Its current archive/trash helpers also require review before reuse: cross-volume archival currently copies then removes without content verification, and the PowerShell trash helper embeds a JSON-quoted path in script source. JSON quoting is not PowerShell escaping. Consolidation must use the parent's verified-copy protocol and literal-path/argument handling rather than inheriting these semantics.

MediaTuna's earlier [agent design](https://github.com/Catalyst-Forge-LLC/mediatuna/blob/main/specs/agents.md) deferred MCP and library imports. This proposed integration revisits that decision for a concrete consumer, with durable jobs and shared contracts; it does not claim an MCP server exists today.

## 4. Conformance and failure cases

| Area | Minimum fixture/check |
| --- | --- |
| Everything | >50 results; large streamed output; exact bytes across names/extensions; literal query punctuation; malformed/truncated CSV; absent instance; nonindexed/cloud roots; cancel; version/capability mismatch. |
| Models | Fake local servers for schema failure, oversized output, redirects, cloud metadata, unexpected endpoints, cancellation, changed aliases/digests, absent vision support, and forbidden evidence transfers. |
| Media | Sidecars with human notes; unsupported formats; missing ffmpeg/CLIP/Ollama; caller disconnect; worker crash/restart; identical repeated submission; altered request ID payload; malicious/escaping artifact references. |
| Policy | Read-only analysis cannot modify originals or sidecars. Provider requests cannot expand selected roots or model targets. MCP/direct adapter tests produce equivalent facts, effects, and provenance. |

Use the parent's [verifier and acceptance criteria](archive-consolidation.md#11-verifier-and-acceptance-criteria). Sibling implementation work must add its own package tests and conformance fixtures. Mock integrations passing does not prove the installed binaries, real model quality, or platform filesystem behavior; report those checks separately.

## 5. External references

Checked during planning on 2026-10-28:

- [Everything CLI](https://www.voidtools.com/support/everything/command_line_interface/): local query/export interface and version/instance options. Current web documentation may describe flags newer than the installed ES binary.
- [Everything SDK](https://www.voidtools.com/support/everything/sdk/): DLL/IPC alternative; not required for the initial CLI adapter.
- [Everything duplicate search](https://www.voidtools.com/support/everything/find_duplicates/): size-first SHA-256 grouping and refresh behavior.
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools): structured tool inputs/results. Pin a mutually supported protocol/SDK version during implementation; the application job contract is independent of that choice.

## Implementation summary

Not implemented. Provider schemas and proposed names require review and fixture validation before they become public compatibility promises.
