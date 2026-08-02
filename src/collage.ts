/**
 * Five-view STL collages: render top/front/left/right/perspective via f3d
 * and montage them with ImageMagick into <name>-collage.png, adjacent to
 * the STL by default. The title strip carries filename + file date, so
 * the image itself keeps its provenance; f3d's own filename banner stays
 * off, and the axes gizmo appears only on the perspective view.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync, mkdtempSync, readdirSync, rmSync, statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative } from "node:path";

const F3D = process.env["F3D"] ?? "C:\\Program Files\\f3d\\bin\\f3d.exe";

const VIEWS = [
  { name: "top", dir: "0,0,-1", axis: false },
  { name: "front", dir: "0,1,0", axis: false },
  { name: "left", dir: "1,0,0", axis: false },
  { name: "right", dir: "-1,0,0", axis: false },
  { name: "perspective", dir: "-1,1,-1", axis: true },
] as const;

let magickPath: string | undefined;
function findMagick(): string {
  if (magickPath) return magickPath;
  if (process.env["MAGICK"]) return (magickPath = process.env["MAGICK"]);
  if (!spawnSync("magick", ["-version"], { stdio: "ignore" }).error) {
    return (magickPath = "magick");
  }
  for (const dir of readdirSync("C:\\Program Files")) {
    if (/^ImageMagick/i.test(dir)) {
      const p = join("C:\\Program Files", dir, "magick.exe");
      if (existsSync(p)) return (magickPath = p);
    }
  }
  throw new Error("ImageMagick not found; set the MAGICK env var");
}

function run(cmd: string, args: string[], what: string): void {
  const r = spawnSync(cmd, args, { stdio: "ignore" });
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${what} failed (exit ${r.status})`);
}

/** Render one STL to <base>-collage.png; returns the collage path. */
export function renderCollage(stl: string, outDir?: string, res = "700,700"): string {
  const magick = findMagick();
  const base = basename(stl, extname(stl));
  const out = join(outDir ?? dirname(stl), `${base}-collage.png`);
  const tmp = mkdtempSync(join(tmpdir(), "stl2collage-"));
  try {
    for (const v of VIEWS) {
      run(F3D, [
        stl,
        `--output=${join(tmp, `${v.name}.png`)}`,
        `--resolution=${res}`,
        "--up=+z",
        `--camera-direction=${v.dir}`,
        "--filename=false",
        `--axis=${v.axis}`,
      ], `f3d (${v.name} view)`);
    }
    const mtime = statSync(stl).mtime.toISOString().slice(0, 10);
    const args = ["montage"];
    for (const v of VIEWS) args.push("-label", v.name, join(tmp, `${v.name}.png`));
    args.push(
      "-tile", "3x2", "-geometry", "+6+6", "-background", "white",
      "-pointsize", "22", "-title", `${base}   \u00b7   file date: ${mtime}`,
      out,
    );
    run(magick, args, "magick montage");
    return out;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** All *.stl under root, depth-first, sorted for stable ordering. */
export function* walkStl(root: string): Generator<string> {
  const entries = readdirSync(root, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) yield* walkStl(p);
    else if (e.isFile() && extname(e.name).toLowerCase() === ".stl") yield p;
  }
}

export interface BatchResult { rendered: number; skipped: number; failed: number }

/** Render every STL under root that lacks a collage. Safe to re-run. */
export function collageBatch(root: string, log: (line: string) => void): BatchResult {
  const res: BatchResult = { rendered: 0, skipped: 0, failed: 0 };
  for (const stl of walkStl(root)) {
    const out = join(dirname(stl), `${basename(stl, extname(stl))}-collage.png`);
    if (existsSync(out)) { res.skipped++; continue; }
    try {
      renderCollage(stl);
      res.rendered++;
      log(`OK   ${relative(root, stl)}`);
    } catch (err) {
      res.failed++;
      log(`FAIL ${relative(root, stl)}: ${(err as Error).message}`);
    }
  }
  return res;
}
