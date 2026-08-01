import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import type { Profile } from "./types.js";

export interface SifterConfig {
  out: string;
  tier: 0 | 1 | 2 | 3;
  model: string;
  ollamaUrl: string;
  prune: string[];
  /** Max dirs sent to the LLM stages (safety valve; 0 = no limit). */
  limit: number;
  /** T2/T3 sampling caps. */
  sampleFilesPerDir: number;
  sampleBytesPerFile: number;
  /** Evidence caps for prompts. */
  maxNamesInEvidence: number;
  /** Skip dirs with fewer files than this in LLM stages (still in dupe stage). */
  minFiles: number;
  dryRun: boolean;
}

export const DEFAULT_PRUNE = [
  "node_modules", ".git", ".svn", ".hg", "__pycache__", "bower_components",
  "vendor", "pods", ".gradle", ".idea", ".vs", ".settings", ".nuget",
  "dist", ".cache", "$recycle.bin", "system volume information",
];

export const DEFAULTS: SifterConfig = {
  out: "./sifter-out",
  tier: 1,
  model: "gemma4:12b",
  ollamaUrl: "http://localhost:11434",
  prune: DEFAULT_PRUNE,
  limit: 0,
  sampleFilesPerDir: 3,
  sampleBytesPerFile: 4096,
  maxNamesInEvidence: 80,
  minFiles: 1,
  dryRun: false,
};

export function loadConfig(cwd: string, overrides: Partial<SifterConfig>): SifterConfig {
  let fileCfg: Partial<SifterConfig> = {};
  const p = resolve(cwd, "sifter.config.json");
  if (existsSync(p)) {
    fileCfg = JSON.parse(readFileSync(p, "utf8")) as Partial<SifterConfig>;
  }
  const merged = { ...DEFAULTS, ...fileCfg, ...overrides };
  merged.prune = (fileCfg.prune ?? DEFAULTS.prune).map((s) => s.toLowerCase());
  if (overrides.prune) merged.prune = overrides.prune.map((s) => s.toLowerCase());
  return merged;
}

export function loadProfile(path: string): Profile {
  const raw = readFileSync(path, "utf8");
  const data = YAML.parse(raw) as Partial<Profile>;
  if (!data || typeof data.statement !== "string") {
    throw new Error(`Profile at ${path} must include at least a 'statement' string.`);
  }
  return {
    name: data.name ?? "unnamed profile",
    statement: data.statement,
    terms: data.terms ?? [],
    topics: data.topics ?? [],
    projects: data.projects ?? [],
  };
}
