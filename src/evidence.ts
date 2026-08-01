import { open } from "node:fs/promises";
import { join } from "node:path";
import type { Manifest } from "./types.js";
import type { SifterConfig } from "./config.js";

const TEXT_EXTS = new Set([
  ".md", ".txt", ".markdown", ".rst", ".adoc", ".ff",
  ".json", ".yaml", ".yml", ".xml", ".html", ".htm", ".csv",
  ".js", ".ts", ".py", ".rb", ".php", ".java", ".cs", ".sql", ".sh", ".bat",
  ".ini", ".cfg", ".conf", ".log", ".readme", ".doc1", ".text",
]);

/**
 * Build the evidence block for one folder, honoring the privacy tier as a hard
 * boundary: this function is the ONLY place file contents are ever read, and
 * it reads nothing below tier 2.
 */
export async function gatherEvidence(
  m: Manifest,
  dirPath: string,
  cfg: SifterConfig,
): Promise<{ text: string; filesConsidered: string[] }> {
  const lines: string[] = [];
  const dirName = dirPath.split("/").pop() ?? dirPath;
  lines.push(`Folder name: ${dirName}`);
  lines.push(`Folder path: /${dirPath}`);

  // T0+: subfolder names (the tree is always evidence).
  const subNames = m.dirs
    .filter((d) => d.path.startsWith(dirPath + "/"))
    .map((d) => d.path.slice(dirPath.length + 1))
    .filter((p) => !p.includes("/"))
    .slice(0, cfg.maxNamesInEvidence);
  if (subNames.length > 0) lines.push(`Subfolders: ${subNames.join(", ")}`);

  const files = m.files.filter((f) => f.dir === dirPath || f.dir.startsWith(dirPath + "/"));
  const filesConsidered: string[] = [];

  if (cfg.tier >= 1) {
    // File names (direct children first, then notable deeper ones), ext histogram, sizes.
    const direct = files.filter((f) => f.dir === dirPath);
    const deeper = files.filter((f) => f.dir !== dirPath);
    const named = [...direct, ...deeper].slice(0, cfg.maxNamesInEvidence);
    if (named.length > 0) {
      lines.push(
        "Files (name, size): " +
          named.map((f) => `${f.dir === dirPath ? "" : f.dir.slice(dirPath.length + 1) + "/"}${f.name} (${f.size}b)`).join(", "),
      );
    }
    const extCount = new Map<string, number>();
    for (const f of files) extCount.set(f.ext || "(none)", (extCount.get(f.ext || "(none)") ?? 0) + 1);
    const hist = [...extCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([e, c]) => `${e}:${c}`).join(" ");
    lines.push(`Total files: ${files.length}. Extension histogram: ${hist}`);
  }

  if (cfg.tier >= 2) {
    // Sampled content from small text files, size-capped. Tier 3 raises the caps in config.
    const candidates = files
      .filter((f) => TEXT_EXTS.has(f.ext) && f.size > 0 && f.size < 1024 * 1024)
      .sort((a, b) => (a.dir === dirPath ? 0 : 1) - (b.dir === dirPath ? 0 : 1) || a.size - b.size)
      .slice(0, cfg.sampleFilesPerDir);
    for (const f of candidates) {
      const full = join(m.root, f.dir.split("/").join("/"), f.name);
      try {
        const fh = await open(full, "r");
        const buf = Buffer.alloc(Math.min(cfg.sampleBytesPerFile, f.size));
        await fh.read(buf, 0, buf.length, 0);
        await fh.close();
        const text = buf.toString("utf8").replace(/\u0000/g, "").trim();
        if (text.length > 0) {
          filesConsidered.push(`${f.dir}/${f.name}`);
          lines.push(`--- Sample from ${f.name} ---\n${text}`);
        }
      } catch {
        /* unreadable: skip */
      }
    }
  }

  return { text: lines.join("\n"), filesConsidered };
}
