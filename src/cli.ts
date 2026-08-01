#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig, loadProfile, type SifterConfig } from "./config.js";
import { inventory, saveManifest } from "./inventory.js";
import { buildDirStats, analyzeDupes } from "./dupes.js";
import { checkHealth } from "./ollama.js";
import { describeStage, rankStage, selectTargets } from "./stages.js";
import { writeReports } from "./report.js";
import type { Manifest } from "./types.js";

function parseArgs(argv: string[]): { cmd: string; positional: string[]; flags: Record<string, string | boolean> } {
  const [cmd = "help", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else flags[key] = true;
    } else positional.push(a);
  }
  return { cmd, positional, flags };
}

function usage(): void {
  console.log(`sifter — local-first archive triage (nothing leaves this machine)

Usage:
  sifter run <root>       all stages: scan, dupes, describe, rank, report
  sifter scan <root>      stage 0: inventory (folders + file metadata only)
  sifter dupes            stage 1: duplicate analysis from cached manifest
  sifter describe         stage 2: local-LLM folder descriptions
  sifter rank             stage 3: relevance vs profile
  sifter report           stage 4: write report.md / dupes.md / novel.md / report.json
  sifter status           cache and Ollama health

Flags:
  --out <dir>       output/cache dir (default ./sifter-out)
  --tier <0-3>      privacy tier (default 1; content is read only at 2+)
  --profile <file>  profile YAML (required for rank/run)
  --model <name>    Ollama model (default gemma4:12b)
  --limit <n>       cap number of folders sent to LLM stages
  --dry-run         show what would be read/sent, without doing it
`);
}

function loadManifestOrDie(cfg: SifterConfig): Manifest {
  const p = join(cfg.out, "manifest.json");
  if (!existsSync(p)) {
    console.error(`No manifest at ${p}. Run 'sifter scan <root>' first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf8")) as Manifest;
}

const progress = (label: string) => (done: number, total: number, path: string) => {
  process.stdout.write(`\r${label}: ${done}/${total} ${path.slice(0, 70).padEnd(70)}`);
  if (done === total) process.stdout.write("\n");
};

async function main(): Promise<void> {
  const { cmd, positional, flags } = parseArgs(process.argv.slice(2));
  const overrides: Partial<SifterConfig> = {};
  if (flags["out"]) overrides.out = String(flags["out"]);
  if (flags["tier"]) overrides.tier = Number(flags["tier"]) as SifterConfig["tier"];
  if (flags["model"]) overrides.model = String(flags["model"]);
  if (flags["limit"]) overrides.limit = Number(flags["limit"]);
  if (flags["dry-run"]) overrides.dryRun = true;
  const cfg = loadConfig(process.cwd(), overrides);
  const ollama = { url: cfg.ollamaUrl, model: cfg.model };

  switch (cmd) {
    case "scan": {
      const root = positional[0];
      if (!root) return usage();
      console.log(`Scanning ${root} (tier boundary: metadata only) ...`);
      const m = await inventory(resolve(root), {
        prune: cfg.prune,
        onProgress: (d, f) => process.stdout.write(`\r  dirs: ${d}  files: ${f}`),
      });
      process.stdout.write("\n");
      const p = saveManifest(cfg.out, m);
      console.log(`Manifest: ${p} (${m.dirs.length} dirs, ${m.files.length} files)`);
      break;
    }
    case "dupes": {
      const m = loadManifestOrDie(cfg);
      const stats = buildDirStats(m);
      const res = analyzeDupes(m, stats);
      console.log(`Identical clusters: ${res.clusters.length} (subsuming ${res.subsumed.size} copies)`);
      console.log(`Same-name pairs: ${res.pairs.length} ` +
        `(superset ${res.pairs.filter((p) => p.kind === "superset").length}, ` +
        `diverged ${res.pairs.filter((p) => p.kind === "diverged").length}, ` +
        `collisions ${res.pairs.filter((p) => p.kind === "name-collision").length})`);
      break;
    }
    case "status": {
      console.log(`Config: tier T${cfg.tier}, model ${cfg.model}, out ${cfg.out}`);
      const h = await checkHealth(ollama);
      console.log(h.ok ? `OK: ${h.message}` : `NOT READY: ${h.message}`);
      const mp = join(cfg.out, "manifest.json");
      console.log(existsSync(mp) ? `Manifest present: ${mp}` : "No manifest yet.");
      break;
    }
    case "describe":
    case "rank":
    case "run": {
      let m: Manifest;
      if (cmd === "run") {
        const root = positional[0];
        if (!root) return usage();
        console.log(`[0/4] Scanning ${root} ...`);
        m = await inventory(resolve(root), {
          prune: cfg.prune,
          onProgress: (d, f) => process.stdout.write(`\r  dirs: ${d}  files: ${f}`),
        });
        process.stdout.write("\n");
        saveManifest(cfg.out, m);
      } else {
        m = loadManifestOrDie(cfg);
      }

      const stats = buildDirStats(m);
      const dupes = analyzeDupes(m, stats);
      if (cmd === "run") {
        console.log(`[1/4] Dupes: ${dupes.clusters.length} identical clusters, ${dupes.pairs.length} same-name pairs.`);
      }

      if (!cfg.dryRun) {
        const h = await checkHealth(ollama);
        if (!h.ok) {
          console.error(`Ollama not ready: ${h.message}`);
          process.exit(1);
        }
      }

      const targets = selectTargets(m, stats, dupes.subsumed, cfg);
      console.log(`LLM targets: ${targets.length} folders (representatives, depth<=3, tier T${cfg.tier}${cfg.limit ? `, limit ${cfg.limit}` : ""})`);

      const descriptions = await describeStage(m, targets, cfg, ollama, stats, progress("[2/4] describe"));
      if (cmd === "describe") {
        for (const d of descriptions.slice(0, 20)) console.log(`- /${d.path}: ${d.description}`);
        break;
      }

      const profilePath = flags["profile"] ? String(flags["profile"]) : undefined;
      if (!profilePath) {
        console.error("rank/run requires --profile <file.yaml>");
        process.exit(1);
      }
      const profile = loadProfile(profilePath);
      const rankings = await rankStage(m, descriptions, profile, cfg, ollama, stats, progress("[3/4] rank"));

      const written = writeReports(m, dupes, descriptions, rankings, cfg);
      console.log(`[4/4] Reports:\n` + written.map((w) => `  ${w}`).join("\n"));
      break;
    }
    case "report": {
      const m = loadManifestOrDie(cfg);
      const stats = buildDirStats(m);
      const dupes = analyzeDupes(m, stats);
      // Rebuild from caches only (no LLM calls): use cached describe/rank entries present for current settings.
      console.log("Report from caches requires prior describe+rank with matching tier/model; use 'run' for the full pipeline.");
      const written = writeReports(m, dupes, [], [], cfg);
      console.log(written.map((w) => `  ${w}`).join("\n"));
      break;
    }
    default:
      usage();
  }
}

main().catch((err) => {
  console.error((err as Error).stack ?? String(err));
  process.exit(1);
});
