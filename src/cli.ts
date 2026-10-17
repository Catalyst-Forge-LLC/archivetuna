#!/usr/bin/env node
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, basename, dirname, extname } from "node:path";
import { parseArgs } from "node:util";
import { loadConfig, loadProfile, type ArchiveTunaConfig } from "./config.js";
import { inventory, saveManifest } from "./inventory.js";
import { buildDirStats, analyzeDupes } from "./dupes.js";
import { checkHealth, localEndpoint } from "./ollama.js";
import { describeStage, rankStage, selectTargets, loadDescriptions, loadResults } from "./stages.js";
import { writeReports, writeDupeReports } from "./report.js";
import { collageBatch, renderCollage, walkStl, renderTools } from "./collage.js";
import { metaBatch } from "./sidecar.js";
import { gatherEvidence } from "./evidence.js";
import { readJson } from "./storage.js";
import type { Manifest } from "./types.js";

function usage(): void {
  console.log(`ArchiveTuna — digital archaeology for the things you made, collected, and forgot.

Usage:
  archivetuna init [profile.yaml]       create a starter profile (default profile.yaml)
  archivetuna scan <root>               inventory names and metadata; no model needed
  archivetuna dupes                     save duplicate candidates from the manifest
  archivetuna run <root> --profile FILE scan, describe, rank, and write reports
  archivetuna describe                  describe folders in the saved manifest
  archivetuna rank --profile FILE       rank saved descriptions
  archivetuna report                    rebuild reports from matching saved results
  archivetuna status                    show saved manifest and analysis files
  archivetuna doctor                    check local Ollama and optional render tools
  archivetuna models <dir>              STL collages then YAML sidecars
  archivetuna models collage <stl|dir>   collages only
  archivetuna models meta <dir>         sidecars only

Options:
  --out DIR        triage output/cache directory (default ./archivetuna-out)
                   models collage <file>: optional output directory
  --profile FILE   owner profile, required for run/rank; optional match check for report
  --tier 0|1|2|3   folder names / metadata / samples / bounded full text (default 1)
  --model NAME     downloaded local Ollama model (default gemma4:12b)
  --limit N        folder or per-stage model batch limit; 0 means unlimited
  --max-depth N    deepest folder to describe (default 3)
  --no-vision      models: machine facts without vision inference
  --dry-run        preview reads/writes; no archive content reads, model calls, or writes
  --help, -h       show help
  --version, -v    show version

Config: archivetuna.config.json in the current directory.
Duplicate matches use names and sizes, never proof of identical contents.
`);
}
function loadManifest(cfg: ArchiveTunaConfig): Manifest {
  const path = join(cfg.out, "manifest.json");
  if (!existsSync(path)) throw new Error("No manifest. Run 'archivetuna scan <root>' first, with the same --out.");
  const m = readJson<Manifest>(path);
  if (!m || typeof m.root !== "string" || !Array.isArray(m.dirs) || !Array.isArray(m.files)) throw new Error("Invalid manifest: " + path);
  return m;
}
function directory(value: string | undefined): string {
  if (!value) throw new Error("Missing directory. See archivetuna --help.");
  const p = resolve(value);
  if (!statSync(p).isDirectory()) throw new Error("Expected a directory: " + value);
  return p;
}
const progress = (done: number, total: number, path: string) => console.log("  " + done + "/" + total + " /" + path);
async function main(): Promise<void> {
  const { positionals, values } = parseArgs({ allowPositionals: true, strict: true, options: {
    out: { type: "string" }, profile: { type: "string" }, tier: { type: "string" },
    model: { type: "string" }, limit: { type: "string" }, "max-depth": { type: "string" },
    "no-vision": { type: "boolean" }, "dry-run": { type: "boolean" },
    help: { type: "boolean", short: "h" }, version: { type: "boolean", short: "v" },
  } });
  if (values.version) { console.log(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version); return; }
  let [cmd = "help", ...args] = positionals;
  if (values.help || cmd === "help") { usage(); return; }
  const commands = ["init", "run", "scan", "dupes", "describe", "rank", "report", "status", "doctor", "models", "collage", "meta"];
  if (!commands.includes(cmd)) {
    throw new Error(existsSync(cmd) ? "Choose 'archivetuna run <dir> --profile FILE' for triage or 'archivetuna models <dir>' for STL processing." : "Unknown command: " + cmd + ". See archivetuna --help.");
  }
  if (cmd === "collage" || cmd === "meta") {
    console.warn("Deprecated alias; use archivetuna models " + cmd + ".");
    args = [cmd, ...args]; cmd = "models";
  }
  const allowed: Record<string, string[]> = {
    init: ["dry-run"], scan: ["out", "dry-run"], dupes: ["out", "dry-run"],
    run: ["out", "profile", "tier", "model", "limit", "max-depth", "dry-run"],
    describe: ["out", "tier", "model", "limit", "max-depth", "dry-run"],
    rank: ["out", "profile", "tier", "model", "limit", "max-depth", "dry-run"],
    report: ["out", "profile", "tier", "model", "limit", "max-depth", "dry-run"],
    status: ["out"], doctor: ["model"], models: ["out", "model", "limit", "no-vision", "dry-run"],
  };
  for (const flag of Object.keys(values)) if (!allowed[cmd]!.includes(flag)) throw new Error("--" + flag + " is not supported by " + cmd + ".");
  if (cmd !== "models" && args.length > (["run", "scan", "init"].includes(cmd) ? 1 : 0)) throw new Error("Unexpected arguments for " + cmd + ".");
  const overrides: Partial<ArchiveTunaConfig> = {};
  if (values.out !== undefined) overrides.out = values.out;
  if (values.model !== undefined) overrides.model = values.model;
  if (values.tier !== undefined) overrides.tier = Number(values.tier) as ArchiveTunaConfig["tier"];
  if (values.limit !== undefined) overrides.limit = Number(values.limit);
  if (values["max-depth"] !== undefined) overrides.maxDepth = Number(values["max-depth"]);
  if (values["dry-run"]) overrides.dryRun = true;
  const cfg = loadConfig(process.cwd(), overrides);
  const ollama = { url: cfg.ollamaUrl, model: cfg.model };
  if (cmd === "init") {
    const path = resolve(args[0] ?? "profile.yaml");
    if (existsSync(path)) throw new Error("Profile already exists: " + path);
    if (cfg.dryRun) { console.log("Would write starter profile: " + path); return; }
    writeFileSync(path, readFileSync(new URL("../profiles/starter.yaml", import.meta.url)), { flag: "wx" });
    console.log("Created " + path + ". Edit it to describe what you want to rediscover."); return;
  }
  if (cmd === "status") {
    console.log("Output: " + cfg.out);
    for (const file of ["manifest.json", "descriptions.json", "rankings.json", "report.md"]) console.log(file + ": " + (existsSync(join(cfg.out, file)) ? "present" : "missing"));
    return;
  }
  if (cmd === "doctor") {
    console.log("Node " + process.versions.node + "; inventory and duplicate analysis need no model.");
    const health = await checkHealth(ollama);
    console.log("Ollama: " + health.message);
    for (const tool of renderTools()) console.log(tool.name + ": " + (tool.ok ? tool.path : "not found (optional; STL rendering only)"));
    if (!health.ok) process.exitCode = 1;
    return;
  }
  if (cmd === "models") {
    const mode = ["collage", "meta"].includes(args[0] ?? "") ? args.shift()! : "all";
    if (args.length !== 1) throw new Error("Expected one STL path/directory. See archivetuna models --help.");
    const target = resolve(args[0]!);
    const isDir = statSync(target).isDirectory();
    if (!isDir && (mode !== "collage" || extname(target).toLowerCase() !== ".stl")) throw new Error("Only models collage accepts a single STL file.");
    if (values.out && (isDir || mode !== "collage")) throw new Error("--out is supported only for a single STL collage; batch artifacts are adjacent.");
    if (cfg.dryRun) {
      let n = 0;
      for (const stl of isDir ? walkStl(target) : [target]) {
        if (cfg.limit && n >= cfg.limit) break;
        const base = basename(stl, extname(stl));
        const png = join(values.out ? cfg.out : dirname(stl), base + "-collage.png");
        const yaml = join(dirname(stl), base + ".stl.yaml");
        const collageNeeded = mode !== "meta" && !existsSync(png);
        const metaNeeded = mode !== "collage" && !existsSync(yaml);
        if (!collageNeeded && !metaNeeded) continue;
        n++;
        if (collageNeeded) console.log("Would read STL and write collage: " + stl + " -> " + png);
        if (metaNeeded) console.log("Would write " + yaml + (values["no-vision"] ? " (file metadata only)" : "; would read collage and send image + filename/path clues to local model " + cfg.model));
      }
      console.log("Dry-run: no content read, model calls, or writes."); return;
    }
    if (mode !== "collage" && !values["no-vision"]) {
      const h = await checkHealth(ollama); if (!h.ok) throw new Error(h.message);
    }
    if (mode !== "meta") {
      if (isDir) {
        const r = collageBatch(target, console.log, cfg.limit); console.log(JSON.stringify(r)); if (r.failed) process.exitCode = 1;
      } else console.log(renderCollage(target, values.out ? cfg.out : undefined));
    }
    if (mode !== "collage") {
      const r = await metaBatch(target, ollama, { vision: !values["no-vision"], limit: cfg.limit }, console.log);
      console.log(JSON.stringify(r)); if (r.failed || r.missingCollage) process.exitCode = 1;
    }
    return;
  }
  const profile = values.profile ? loadProfile(values.profile) : undefined;
  if (["rank", "run"].includes(cmd) && !profile) throw new Error(cmd + " requires --profile FILE. Create one with archivetuna init.");
  if (["run", "describe", "rank"].includes(cmd)) localEndpoint(ollama);
  const m = ["scan", "run"].includes(cmd) ? await inventory(directory(args[0]), { prune: cfg.prune, exclude: [cfg.out] }) : loadManifest(cfg);
  if (m.warnings?.length) console.warn(m.warnings.length + " scan warning(s):\n" + m.warnings.join("\n"));
  if (cmd === "scan") {
    console.log(m.dirs.length + " folders; " + m.files.length + " files.");
    console.log(cfg.dryRun ? "Would write " + join(cfg.out, "manifest.json") + "; metadata read only." : saveManifest(cfg.out, m)); return;
  }
  const stats = buildDirStats(m), dupes = analyzeDupes(m, stats);
  const targets = selectTargets(m, stats, dupes.subsumed, cfg);
  if (cfg.dryRun) {
    if (["run", "describe"].includes(cmd)) for (const target of targets) console.log((await gatherEvidence(m, target, cfg)).text + "\n");
    if (cmd === "rank") console.log("Would rank " + loadDescriptions(m, cfg).length + " saved descriptions using profile " + profile!.name + ".");
    if (cmd === "report") { const r = loadResults(m, cfg, profile); console.log("Would rebuild reports with " + r.rankings.length + " rankings."); }
    console.log("Would write " + (cmd === "dupes" ? "dupes.md and dupes.json" : cmd === "describe" ? "description caches" : cmd === "rank" ? "ranking caches and reports" : "reports/caches") + " under " + cfg.out);
    console.log("Dry-run: no archive content read, model calls, or writes."); return;
  }
  if (cmd === "dupes") { console.log(writeDupeReports(m, dupes, cfg.out).join("\n")); return; }
  if (cmd === "report") {
    const r = loadResults(m, cfg, profile); console.log(writeReports(m, dupes, r.descriptions, r.rankings, cfg).join("\n")); return;
  }
  const descriptions = cmd === "rank" ? loadDescriptions(m, cfg) : undefined;
  if (cmd === "run") saveManifest(cfg.out, m);
  const desc = descriptions ?? await describeStage(m, targets, cfg, ollama, stats, progress);
  if (cmd === "describe") { console.log("Saved " + desc.length + " descriptions."); return; }
  const rankings = await rankStage(m, desc, profile!, cfg, ollama, stats, progress);
  console.log(writeReports(m, dupes, desc, rankings, cfg).join("\n"));
}
main().catch(err => { console.error("ArchiveTuna: " + (err as Error).message); process.exitCode = 1; });
