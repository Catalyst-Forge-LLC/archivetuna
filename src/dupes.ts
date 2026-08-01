import { createHash } from "node:crypto";
import type { DirStats, DupePair, IdenticalCluster, Manifest } from "./types.js";

/** Build per-directory recursive stats and fingerprints from the manifest. */
export function buildDirStats(m: Manifest): Map<string, DirStats> {
  const stats = new Map<string, DirStats>();
  for (const d of m.dirs) {
    stats.set(d.path, { path: d.path, fileCount: 0, totalSize: 0, fingerprint: "", childKeys: new Set() });
  }
  // Every file contributes to its own dir and every ancestor dir.
  for (const f of m.files) {
    const full = f.dir === "" ? f.name : `${f.dir}/${f.name}`;
    let dir = f.dir;
    // walk up: '', 'a', 'a/b', ...
    for (;;) {
      const s = stats.get(dir);
      if (s) {
        const relFromDir = dir === "" ? full : full.slice(dir.length + 1);
        s.childKeys.add(`${relFromDir}|${f.size}`);
        s.fileCount += 1;
        s.totalSize += f.size;
      }
      if (dir === "") break;
      const idx = dir.lastIndexOf("/");
      dir = idx === -1 ? "" : dir.slice(0, idx);
    }
  }
  for (const s of stats.values()) {
    const sorted = [...s.childKeys].sort();
    s.fingerprint = createHash("sha256").update(sorted.join("\n")).digest("hex");
  }
  return stats;
}

export interface DupeResult {
  clusters: IdenticalCluster[];
  pairs: DupePair[];
  /** Paths subsumed by an identical-cluster representative (excluded from LLM stages). */
  subsumed: Set<string>;
}

function jaccard(a: Set<string>, b: Set<string>): { j: number; shared: number } {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const k of small) if (large.has(k)) shared++;
  const union = a.size + b.size - shared;
  return { j: union === 0 ? 0 : shared / union, shared };
}

function isNested(a: string, b: string): boolean {
  return a.startsWith(b + "/") || b.startsWith(a + "/") || a === b;
}

function sample(set: Set<string>, other: Set<string>, n: number): string[] {
  const out: string[] = [];
  for (const k of set) {
    if (!other.has(k)) {
      out.push(k.split("|")[0]!);
      if (out.length >= n) break;
    }
  }
  return out;
}

/** Stage 1: identical clusters (global) + same-name pair classification. */
export function analyzeDupes(m: Manifest, statsMap: Map<string, DirStats>): DupeResult {
  const nonTrivial = [...statsMap.values()].filter((s) => s.fileCount > 0 && s.path !== "");

  // --- identical clusters, global, by fingerprint ---
  const byFp = new Map<string, DirStats[]>();
  for (const s of nonTrivial) {
    const arr = byFp.get(s.fingerprint);
    if (arr) arr.push(s);
    else byFp.set(s.fingerprint, [s]);
  }
  const clusters: IdenticalCluster[] = [];
  const subsumed = new Set<string>();
  for (const group of byFp.values()) {
    if (group.length < 2) continue;
    // Drop members nested inside other members (parent/child with same content set).
    const members = group.filter((g) => !group.some((o) => o !== g && g.path.startsWith(o.path + "/")));
    if (members.length < 2) continue;
    members.sort((a, b) => a.path.length - b.path.length);
    const rep = members[0]!;
    const copies = members.slice(1).map((c) => c.path);
    for (const c of copies) subsumed.add(c);
    clusters.push({
      fingerprint: rep.fingerprint,
      representative: rep.path,
      copies,
      fileCount: rep.fileCount,
      totalSize: rep.totalSize,
    });
  }

  // --- same-name comparisons ---
  const byName = new Map<string, DirStats[]>();
  for (const s of nonTrivial) {
    const name = (s.path.split("/").pop() ?? s.path).toLowerCase();
    const arr = byName.get(name);
    if (arr) arr.push(s);
    else byName.set(name, [s]);
  }

  const pairs: DupePair[] = [];
  for (const group of byName.values()) {
    if (group.length < 2 || group.length > 25) continue; // huge groups: generic names like 'images'
    for (let i = 0; i < group.length; i++) {
      for (let k = i + 1; k < group.length; k++) {
        const a = group[i]!;
        const b = group[k]!;
        if (isNested(a.path, b.path)) continue;
        if (a.fingerprint === b.fingerprint) continue; // already clustered
        const { j, shared } = jaccard(a.childKeys, b.childKeys);
        const onlyInA = a.childKeys.size - shared;
        const onlyInB = b.childKeys.size - shared;
        let kind: DupePair["kind"];
        if (shared > 0 && onlyInB === 0 && onlyInA > 0) kind = "superset";
        else if (shared > 0 && onlyInA === 0 && onlyInB > 0) {
          // normalize: A is always the superset side
          pairs.push({
            kind: "superset", a: b.path, b: a.path, jaccard: j,
            onlyInA: onlyInB, onlyInB: onlyInA, shared,
            onlyInASample: sample(b.childKeys, a.childKeys, 8),
            onlyInBSample: [],
          });
          continue;
        } else if (j >= 0.3) kind = "diverged";
        else if (j < 0.1) kind = "name-collision";
        else kind = "diverged"; // gray zone 0.1–0.3: treat as diverged (safer to review both)
        pairs.push({
          kind, a: a.path, b: b.path, jaccard: j, onlyInA, onlyInB, shared,
          onlyInASample: sample(a.childKeys, b.childKeys, 8),
          onlyInBSample: sample(b.childKeys, a.childKeys, 8),
        });
      }
    }
  }
  pairs.sort((x, y) => y.jaccard - x.jaccard);
  return { clusters, pairs, subsumed };
}
