import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Description, DirStats, Manifest, Profile, Ranking } from "./types.js";
import type { SifterConfig } from "./config.js";
import { gatherEvidence } from "./evidence.js";
import { generateJson, type OllamaOptions } from "./ollama.js";

const DESCRIBE_SCHEMA = {
  type: "object",
  properties: { description: { type: "string" } },
  required: ["description"],
};

const RANK_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    rationale: { type: "string" },
    action: { type: "string", enum: ["review", "skim", "skip"] },
    novelty: { type: "boolean" },
    noveltyName: { type: "string" },
  },
  required: ["score", "rationale", "action", "novelty"],
};

function loadCache<T>(outDir: string, file: string): Record<string, T> {
  const p = join(outDir, file);
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, "utf8")) as Record<string, T>;
}

function saveCache<T>(outDir: string, file: string, cache: Record<string, T>): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, file), JSON.stringify(cache));
}

/** Select which dirs go to the LLM stages: representatives only, meaningful only. */
export function selectTargets(
  m: Manifest,
  stats: Map<string, DirStats>,
  subsumed: Set<string>,
  cfg: SifterConfig,
): string[] {
  const targets = m.dirs
    .map((d) => d.path)
    .filter((p) => p !== "" && !subsumed.has(p))
    .filter((p) => (stats.get(p)?.fileCount ?? 0) >= cfg.minFiles)
    // Depth heuristic: describe folders near the top; deep internals ride along
    // with their ancestors. Depth ≤ 3 keeps prompts tractable on big archives.
    .filter((p) => p.split("/").length <= 3);
  return cfg.limit > 0 ? targets.slice(0, cfg.limit) : targets;
}

export async function describeStage(
  m: Manifest,
  targets: string[],
  cfg: SifterConfig,
  ollama: OllamaOptions,
  stats: Map<string, DirStats>,
  onProgress: (done: number, total: number, path: string) => void,
): Promise<Description[]> {
  const cache = loadCache<Description>(cfg.out, "describe-cache.json");
  const results: Description[] = [];
  let done = 0;
  for (const path of targets) {
    const key = `${stats.get(path)?.fingerprint}|t${cfg.tier}|${ollama.model}`;
    const hit = cache[key];
    if (hit) {
      results.push({ ...hit, path });
      onProgress(++done, targets.length, path + " (cached)");
      continue;
    }
    const { text } = await gatherEvidence(m, path, cfg);
    if (cfg.dryRun) {
      onProgress(++done, targets.length, path + " (dry-run)");
      continue;
    }
    const prompt =
      `You are cataloguing an old personal archive. Based ONLY on the evidence below, ` +
      `write 1-3 sentences describing what this folder appears to be (project? backup? ` +
      `notes? media? code? for what purpose, roughly when?). Be concrete, admit uncertainty.\n\n${text}`;
    const out = await generateJson<{ description: string }>(ollama, prompt, DESCRIBE_SCHEMA);
    const desc: Description = { path, description: out.description, evidenceTier: cfg.tier, model: ollama.model };
    cache[key] = desc;
    results.push(desc);
    if (done % 10 === 0) saveCache(cfg.out, "describe-cache.json", cache);
    onProgress(++done, targets.length, path);
  }
  saveCache(cfg.out, "describe-cache.json", cache);
  return results;
}

export async function rankStage(
  m: Manifest,
  descriptions: Description[],
  profile: Profile,
  cfg: SifterConfig,
  ollama: OllamaOptions,
  stats: Map<string, DirStats>,
  onProgress: (done: number, total: number, path: string) => void,
): Promise<Ranking[]> {
  const cache = loadCache<Ranking>(cfg.out, "rank-cache.json");
  const profileBlock =
    `Owner's goal: ${profile.statement}\n` +
    (profile.projects.length ? `Known projects: ${profile.projects.join(", ")}\n` : "") +
    (profile.topics.length ? `Topics of interest: ${profile.topics.join(", ")}\n` : "") +
    (profile.terms.length ? `Key terms: ${profile.terms.join(", ")}\n` : "");
  const profileHash = Buffer.from(profileBlock).byteLength.toString(36) + profile.name;

  const results: Ranking[] = [];
  let done = 0;
  for (const d of descriptions) {
    const key = `${stats.get(d.path)?.fingerprint}|t${cfg.tier}|${ollama.model}|${profileHash}`;
    const hit = cache[key];
    if (hit) {
      results.push({ ...hit, path: d.path });
      onProgress(++done, descriptions.length, d.path + " (cached)");
      continue;
    }
    if (cfg.dryRun) {
      onProgress(++done, descriptions.length, d.path + " (dry-run)");
      continue;
    }
    const prompt =
      `You are triaging an old personal archive for its owner.\n\n${profileBlock}\n` +
      `Folder: /${d.path}\nWhat it appears to be: ${d.description}\n\n` +
      `Score this folder's relevance to the owner's goal from 0-100. ` +
      `Choose an action: "review" (likely treasure), "skim" (maybe), "skip" (framework scratch, dependencies, media dumps, other people's work). ` +
      `Set novelty=true ONLY if this looks like a substantial project/creation of the owner's that is NOT in the known projects list ` +
      `(if so, put its apparent name in noveltyName). One-sentence rationale.`;
    const out = await generateJson<Omit<Ranking, "path" | "model">>(ollama, prompt, RANK_SCHEMA);
    const r: Ranking = { ...out, path: d.path, model: ollama.model };
    cache[key] = r;
    results.push(r);
    if (done % 10 === 0) saveCache(cfg.out, "rank-cache.json", cache);
    onProgress(++done, descriptions.length, d.path);
  }
  saveCache(cfg.out, "rank-cache.json", cache);
  return results;
}
