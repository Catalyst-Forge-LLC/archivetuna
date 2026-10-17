export interface FileEntry {
  /** Directory path relative to root ('' = root). */
  dir: string;
  name: string;
  ext: string;
  size: number;
  /** Stored but never treated as authoritative — exports/copies overwrite mtimes. */
  mtimeMs: number;
}

export interface DirEntry {
  /** Path relative to root ('' = root). */
  path: string;
  name: string;
  depth: number;
}

export interface Manifest {
  root: string;
  scannedAt: string;
  backend?: "walk";
  warnings?: string[];
  tier: number;
  dirs: DirEntry[];
  files: FileEntry[];
}

export interface DirStats {
  path: string;
  fileCount: number;
  totalSize: number;
  /** sha256 over sorted (relpath|size) child entries. */
  fingerprint: string;
  /** Set of "relpath|size" keys for similarity math. */
  childKeys: Set<string>;
}

export type DupeKind = "superset" | "diverged" | "name-collision";

export interface DupePair {
  kind: DupeKind;
  a: string;
  b: string;
  jaccard: number;
  onlyInA: number;
  onlyInB: number;
  shared: number;
  /** Small samples of the unique child paths, for the report. */
  onlyInASample: string[];
  onlyInBSample: string[];
}

export interface MetadataCluster {
  fingerprint: string;
  representative: string;
  copies: string[];
  fileCount: number;
  totalSize: number;
}

export interface Description {
  path: string;
  description: string;
  evidenceTier: number;
  model: string;
}

export interface Ranking {
  path: string;
  score: number;
  rationale: string;
  action: "review" | "skim" | "skip";
  novelty: boolean;
  noveltyName?: string;
  model: string;
}

export interface Profile {
  name: string;
  statement: string;
  terms: string[];
  topics: string[];
  projects: string[];
}
