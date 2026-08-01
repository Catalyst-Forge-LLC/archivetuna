import { opendir, stat } from "node:fs/promises";
import { join, relative, basename, extname, sep } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import type { DirEntry, FileEntry, Manifest } from "./types.js";

export interface InventoryOptions {
  prune: string[];
  onProgress?: (dirs: number, files: number) => void;
}

/** Stage 0: walk the tree, folders + file metadata only. Never reads content. */
export async function inventory(root: string, opts: InventoryOptions): Promise<Manifest> {
  const pruneSet = new Set(opts.prune.map((s) => s.toLowerCase()));
  const dirs: DirEntry[] = [];
  const files: FileEntry[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const rel = relative(root, current).split(sep).join("/");
    dirs.push({ path: rel, name: basename(current) || rel, depth: rel === "" ? 0 : rel.split("/").length });

    let dir;
    try {
      dir = await opendir(current);
    } catch {
      continue; // permission or transient error: record the dir, skip children
    }
    for await (const entry of dir) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (pruneSet.has(entry.name.toLowerCase())) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        let size = 0;
        let mtimeMs = 0;
        try {
          const s = await stat(full);
          size = s.size;
          mtimeMs = s.mtimeMs;
        } catch {
          /* keep zeros */
        }
        files.push({
          dir: rel,
          name: entry.name,
          ext: extname(entry.name).toLowerCase(),
          size,
          mtimeMs,
        });
      }
    }
    if (opts.onProgress && dirs.length % 200 === 0) opts.onProgress(dirs.length, files.length);
  }

  return { root, scannedAt: new Date().toISOString(), tier: 0, dirs, files };
}

export function saveManifest(outDir: string, m: Manifest): string {
  mkdirSync(outDir, { recursive: true });
  const p = join(outDir, "manifest.json");
  writeFileSync(p, JSON.stringify(m));
  return p;
}
