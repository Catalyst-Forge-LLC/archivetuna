import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import type { Profile } from "./types.js";

export interface ArchiveTunaConfig {
  out: string;
  tier: 0 | 1 | 2 | 3;
  model: string;
  ollamaUrl: string;
  prune: string[];
  limit: number;
  sampleFilesPerDir: number;
  sampleBytesPerFile: number;
  fullTextMaxFiles: number;
  fullTextMaxBytesPerFile: number;
  fullTextMaxTotalBytes: number;
  maxNamesInEvidence: number;
  minFiles: number;
  maxDepth: number;
  dryRun: boolean;
}
export const DEFAULT_PRUNE = [
  "node_modules", ".git", ".svn", ".hg", "__pycache__", "bower_components",
  "vendor", "pods", ".gradle", ".idea", ".vs", ".settings", ".nuget",
  "dist", ".cache", "$recycle.bin", "system volume information",
];
export const DEFAULTS: ArchiveTunaConfig = {
  out: "./archivetuna-out", tier: 1, model: "gemma4:12b",
  ollamaUrl: "http://localhost:11434", prune: DEFAULT_PRUNE,
  limit: 0, sampleFilesPerDir: 3, sampleBytesPerFile: 4096,
  fullTextMaxFiles: 20, fullTextMaxBytesPerFile: 65536,
  fullTextMaxTotalBytes: 262144, maxNamesInEvidence: 80,
  minFiles: 1, maxDepth: 3, dryRun: false,
};
export function loadConfig(cwd: string, overrides: Partial<ArchiveTunaConfig>): ArchiveTunaConfig {
  let fileCfg: Partial<ArchiveTunaConfig> = {};
  const current = resolve(cwd, "archivetuna.config.json");
  const legacy = resolve(cwd, "sifter.config.json");
  const p = existsSync(current) ? current : legacy;
  if (existsSync(p)) {
    if (p === legacy) console.warn("Using legacy sifter.config.json; rename it to archivetuna.config.json.");
    const parsed: unknown = JSON.parse(readFileSync(p, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Config must be an object.");
    for (const key of Object.keys(parsed)) if (!(key in DEFAULTS)) throw new Error("Unknown config setting: " + key);
    fileCfg = parsed as Partial<ArchiveTunaConfig>;
  }
  const cfg = { ...DEFAULTS, ...fileCfg, ...overrides };
  if (![0, 1, 2, 3].includes(cfg.tier)) throw new Error("tier must be an integer from 0 to 3.");
  for (const key of ["limit", "sampleFilesPerDir", "sampleBytesPerFile", "fullTextMaxFiles",
    "fullTextMaxBytesPerFile", "fullTextMaxTotalBytes", "maxNamesInEvidence", "minFiles", "maxDepth"] as const) {
    if (!Number.isSafeInteger(cfg[key]) || cfg[key] < 0) throw new Error(key + " must be a nonnegative integer.");
  }
  for (const key of ["out", "model", "ollamaUrl"] as const) {
    if (typeof cfg[key] !== "string" || !cfg[key].trim()) throw new Error(key + " must be a nonempty string.");
  }
  if (typeof cfg.dryRun !== "boolean") throw new Error("dryRun must be boolean.");
  if (!Array.isArray(cfg.prune) || cfg.prune.some(s => typeof s !== "string")) throw new Error("prune must be an array of names.");
  cfg.prune = cfg.prune.map(s => s.toLowerCase());
  cfg.out = resolve(cwd, cfg.out);
  return cfg;
}
export function loadProfile(path: string): Profile {
  const data = YAML.parse(readFileSync(path, "utf8")) as Partial<Profile> | null;
  if (!data || typeof data.statement !== "string" || !data.statement.trim()) {
    throw new Error("Profile must include a nonempty 'statement' string.");
  }
  if (data.name !== undefined && typeof data.name !== "string") throw new Error("Profile name must be a string.");
  for (const key of ["terms", "topics", "projects"] as const) {
    if (data[key] !== undefined && (!Array.isArray(data[key]) || data[key].some(x => typeof x !== "string"))) {
      throw new Error("Profile " + key + " must be an array of strings.");
    }
  }
  return { name: data.name ?? "unnamed profile", statement: data.statement,
    terms: data.terms ?? [], topics: data.topics ?? [], projects: data.projects ?? [] };
}
