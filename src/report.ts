import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Description, Manifest, Ranking } from "./types.js";
import type { DupeResult } from "./dupes.js";
import type { ArchiveTunaConfig } from "./config.js";
import { writeJson } from "./storage.js";
const esc = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("|", "&#124;").replaceAll("`", "&#96;").replace(/[\r\n]+/g, " ");
const folder = (p: string): string => "/" + esc(p);
export function writeDupeReports(m: Manifest, dupes: DupeResult, out: string): string[] {
  mkdirSync(out, { recursive: true });
  let md = "# ArchiveTuna duplicate candidates\n\nRoot: " + esc(m.root) + "\n\n" +
    "These comparisons use relative filenames and byte sizes, not file contents. Matching metadata is not proof of identical files. All candidates remain eligible for review.\n\n" +
    "## Matching metadata (" + dupes.clusters.length + " groups)\n\n";
  for (const c of dupes.clusters) {
    md += "- **" + folder(c.representative) + "** (" + c.fileCount + " files, " + c.totalSize + " bytes) matches:\n";
    for (const copy of c.copies) md += "  - " + folder(copy) + "\n";
  }
  md += "\n## Same-name relationships (" + dupes.pairs.length + ")\n\n";
  for (const p of dupes.pairs) {
    md += "- **" + p.kind + "**: " + folder(p.a) + " / " + folder(p.b) +
      " — " + p.shared + " shared name/size entries; " + p.onlyInA + " left-only, " + p.onlyInB + " right-only.\n";
    if (p.onlyInASample.length) md += "  - Left-only sample: " + p.onlyInASample.map(esc).join(", ") + "\n";
    if (p.onlyInBSample.length) md += "  - Right-only sample: " + p.onlyInBSample.map(esc).join(", ") + "\n";
  }
  md += "\nSuperset means a superset of metadata entries. Same-name groups larger than 25 folders are omitted from pairwise comparisons. Empty folders are not duplicate candidates.\n";
  if (m.warnings?.length) md += "\n## Scan warnings\n\n" + m.warnings.map(w => "- " + esc(w)).join("\n") + "\n";
  const paths = [join(out, "dupes.md"), join(out, "dupes.json")];
  writeFileSync(paths[0]!, md);
  writeJson(paths[1]!, { root: m.root, comparison: "relative-path-and-size", contentVerified: false, clusters: dupes.clusters, pairs: dupes.pairs, warnings: m.warnings ?? [] });
  return paths;
}
export function writeReports(m: Manifest, dupes: DupeResult, descriptions: Description[], rankings: Ranking[], cfg: ArchiveTunaConfig): string[] {
  mkdirSync(cfg.out, { recursive: true });
  const ranked = [...rankings].sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const byPath = new Map(descriptions.map(d => [d.path, d]));
  const header = "> ArchiveTuna · T" + cfg.tier + " · model " + esc(cfg.model) + " · Root: " + esc(m.root) +
    "\n> Model judgments are review leads. Original files are not moved or deleted.\n\n";
  let md = "# ArchiveTuna review queue\n\n" + header + "| Score | Action | Folder | Why |\n|---|---|---|---|\n";
  for (const r of ranked) md += "| " + r.score + " | " + r.action + " | " + folder(r.path) +
    (r.novelty ? " **[NOVEL]**" : "") + " | " + esc(r.rationale) + " |\n";
  if (!ranked.length) md += "\nNo folders were ranked for this scan/settings.\n";
  md += "\n## Descriptions\n\n";
  for (const r of ranked) {
    const d = byPath.get(r.path);
    if (d) md += "- **" + folder(r.path) + "** — " + esc(d.description) + "\n";
  }
  if (m.warnings?.length) md += "\n## Scan warnings\n\n" + m.warnings.map(w => "- " + esc(w)).join("\n") + "\n";
  let novel = "# ArchiveTuna novelty candidates\n\n" + header;
  const candidates = ranked.filter(r => r.novelty);
  for (const r of candidates) novel += "- **" + folder(r.path) + "**" + (r.noveltyName ? " — " + esc(r.noveltyName) : "") +
    "\n  " + esc(byPath.get(r.path)?.description ?? r.rationale) + "\n";
  if (!candidates.length) novel += "None flagged.\n";
  const paths = [join(cfg.out, "report.md"), join(cfg.out, "novel.md"), join(cfg.out, "report.json")];
  writeFileSync(paths[0]!, md); writeFileSync(paths[1]!, novel);
  writeJson(paths[2]!, { schema: 2, root: m.root, tier: cfg.tier, model: cfg.model, generatedAt: new Date().toISOString(),
    rankings: ranked, descriptions, dupes: { comparison: "relative-path-and-size", contentVerified: false, clusters: dupes.clusters, pairs: dupes.pairs }, warnings: m.warnings ?? [] });
  return [...paths, ...writeDupeReports(m, dupes, cfg.out)];
}
