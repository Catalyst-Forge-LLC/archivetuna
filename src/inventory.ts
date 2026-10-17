import { opendir, stat } from "node:fs/promises";
import { join, relative, basename, extname, sep, resolve } from "node:path";
import type { DirEntry, FileEntry, Manifest } from "./types.js";
import { writeJson } from "./storage.js";
export interface InventoryOptions { prune: string[]; exclude?: string[]; onProgress?: (dirs: number, files: number) => void }
export async function inventory(root: string, opts: InventoryOptions): Promise<Manifest> {
  root = resolve(root);
  if (!(await stat(root)).isDirectory()) throw new Error("Expected an archive directory: " + root);
  const prune = new Set(opts.prune.map(s => s.toLowerCase()));
  const key = (p: string) => process.platform === "win32" ? resolve(p).toLowerCase() : resolve(p);
  const exclude = new Set((opts.exclude ?? []).map(key));
  if (exclude.has(key(root))) throw new Error("The output directory must not be the archive root.");
  const dirs: DirEntry[] = [], files: FileEntry[] = [];
  const warnings: string[] = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop()!;
    const rel = relative(root, current).split(sep).join("/");
    dirs.push({ path: rel, name: basename(current), depth: rel ? rel.split("/").length : 0 });
    let directory;
    try { directory = await opendir(current); }
    catch (e) {
      if (current === root) throw e;
      warnings.push("Cannot read directory: " + rel); continue;
    }
    for await (const entry of directory) {
      const full = join(current, entry.name);
      if (exclude.has(key(full))) continue;
      if (entry.isDirectory()) { if (!prune.has(entry.name.toLowerCase())) stack.push(full); }
      else if (entry.isFile()) {
        try {
          const s = await stat(full);
          files.push({ dir: rel, name: entry.name, ext: extname(entry.name).toLowerCase(), size: s.size, mtimeMs: s.mtimeMs });
        } catch { warnings.push("Cannot stat file: " + [rel, entry.name].filter(Boolean).join("/")); }
      }
    }
    if (opts.onProgress && dirs.length % 200 === 0) opts.onProgress(dirs.length, files.length);
  }
  dirs.sort((a, b) => a.path.localeCompare(b.path));
  files.sort((a, b) => (a.dir + "/" + a.name).localeCompare(b.dir + "/" + b.name));
  return { root, scannedAt: new Date().toISOString(), tier: 0, backend: "walk", dirs, files, warnings };
}
export function saveManifest(out: string, m: Manifest): string {
  const path = join(out, "manifest.json"); writeJson(path, m); return path;
}
