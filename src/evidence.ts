import { open, lstat } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import type { Manifest, FileEntry } from "./types.js";
import type { ArchiveTunaConfig } from "./config.js";

const TEXT_EXTS = new Set([
  ".md", ".txt", ".markdown", ".rst", ".adoc", ".ff", ".json", ".yaml",
  ".yml", ".xml", ".html", ".htm", ".csv", ".js", ".ts", ".py", ".rb",
  ".php", ".java", ".cs", ".sql", ".sh", ".bat", ".ini", ".cfg", ".conf",
  ".log", ".readme", ".doc1", ".text",
]);
export const filePath = (f: FileEntry): string => [f.dir, f.name].filter(Boolean).join("/");
export function filesIn(m: Manifest, dir: string): FileEntry[] {
  return m.files.filter(f => dir === "" || f.dir === dir || f.dir.startsWith(dir + "/"));
}
export function planEvidence(m: Manifest, dir: string, cfg: ArchiveTunaConfig): Array<{ file: FileEntry; bytes: number }> {
  if (cfg.tier < 2) return [];
  const candidates = filesIn(m, dir).filter(f => TEXT_EXTS.has(f.ext) && f.size > 0 &&
    f.size <= (cfg.tier === 3 ? cfg.fullTextMaxBytesPerFile : 1024 * 1024))
    .sort((a, b) => Number(a.dir !== dir) - Number(b.dir !== dir) || a.size - b.size || filePath(a).localeCompare(filePath(b)));
  const result: Array<{ file: FileEntry; bytes: number }> = [];
  let remaining = cfg.fullTextMaxTotalBytes;
  for (const file of candidates) {
    if (result.length >= (cfg.tier === 3 ? cfg.fullTextMaxFiles : cfg.sampleFilesPerDir)) break;
    if (cfg.tier === 3 && file.size > remaining) continue;
    const bytes = cfg.tier === 3 ? file.size : Math.min(file.size, cfg.sampleBytesPerFile);
    if (bytes === 0) continue;
    result.push({ file, bytes });
    remaining -= bytes;
  }
  return result;
}
export async function gatherEvidence(m: Manifest, dir: string, cfg: ArchiveTunaConfig): Promise<{ text: string; filesConsidered: string[] }> {
  const prefix = dir ? dir + "/" : "";
  const lines = ["Folder name: " + (dir.split("/").pop() || "(root)"), "Folder path: /" + dir];
  const subNames = m.dirs.filter(d => d.path !== dir && d.path.startsWith(prefix))
    .map(d => d.path.slice(prefix.length)).filter(p => !p.includes("/")).sort().slice(0, cfg.maxNamesInEvidence);
  if (subNames.length) lines.push("Subfolders: " + subNames.join(", "));
  const files = filesIn(m, dir).sort((a, b) => Number(a.dir !== dir) - Number(b.dir !== dir) || filePath(a).localeCompare(filePath(b)));
  if (cfg.tier >= 1) {
    lines.push("Files (name, size): " + files.slice(0, cfg.maxNamesInEvidence)
      .map(f => filePath(f).slice(prefix.length) + " (" + f.size + "b)").join(", "));
    const hist = new Map<string, number>();
    for (const f of files) hist.set(f.ext || "(none)", (hist.get(f.ext || "(none)") ?? 0) + 1);
    lines.push("Total files: " + files.length + ". Extension histogram: " +
      [...hist].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([e, n]) => e + ":" + n).join(" "));
  }
  const filesConsidered: string[] = [];
  for (const { file, bytes } of planEvidence(m, dir, cfg)) {
    const name = filePath(file);
    if (cfg.dryRun) { lines.push("Would read: " + name + " (up to " + bytes + " bytes)"); continue; }
    const full = resolve(m.root, file.dir, file.name);
    const rel = relative(resolve(m.root), full);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Evidence path escapes archive root: " + name);
    try {
      if (!(await lstat(full)).isFile()) continue;
      const fh = await open(full, "r");
      try {
        const buf = Buffer.alloc(bytes);
        let used = 0;
        while (used < bytes) {
          const r = await fh.read(buf, used, bytes - used, used);
          if (!r.bytesRead) break;
          used += r.bytesRead;
        }
        const actual = buf.subarray(0, used);
        if (actual.includes(0)) { lines.push("Skipped binary-like text file: " + name); continue; }
        const text = actual.toString("utf8").trim();
        if (text) { filesConsidered.push(name); lines.push("--- " + (cfg.tier === 3 ? "Text" : "Sample") + " from " + name + " ---\n" + text); }
      } finally { await fh.close(); }
    } catch { lines.push("Unreadable evidence: " + name); }
  }
  return { text: lines.join("\n"), filesConsidered };
}
