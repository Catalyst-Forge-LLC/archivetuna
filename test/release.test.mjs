import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inventory } from '../dist/inventory.js';
import { analyzeDupes, buildDirStats } from '../dist/dupes.js';
import { DEFAULTS, loadConfig, loadProfile } from '../dist/config.js';
import { gatherEvidence, planEvidence } from '../dist/evidence.js';
import { selectTargets, describeStage, rankStage } from '../dist/stages.js';
import { localEndpoint, checkHealth } from '../dist/ollama.js';

const exec = promisify(execFile), cli = resolve('dist/cli.js');
const fixtures = [];
function fixture() {
  const p = mkdtempSync(join(tmpdir(), 'archivetuna-test-')); fixtures.push(p); return p;
}
function tree() {
  const cwd = fixture(), root = join(cwd, 'archive');
  mkdirSync(root);
  for (const folder of ['A', 'B']) { mkdirSync(join(root, folder)); writeFileSync(join(root, folder, 'notes.txt'), folder.repeat(12)); }
  return { cwd, root, out: join(cwd, 'out') };
}
async function run(cwd, ...args) { return exec(process.execPath, [cli, ...args], { cwd, timeout: 20000 }); }
let server, url, generations = [];
before(async () => {
  server = createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'fixture:latest' }, { name: 'proxy:latest' }] }));
    if (req.url === '/api/show') return res.end(JSON.stringify(body.model === 'proxy:latest' ? { remote_host: 'https://example.com' } : { details: { format: 'gguf' } }));
    if (req.url === '/api/generate') {
      generations.push(body);
      const result = body.format.properties.description ? { description: 'Original project notes: ' + body.prompt.slice(-20) } :
        { score: body.prompt.includes('orange') ? 40 : 90, rationale: 'Matches the owner profile.', action: 'review', novelty: true, noveltyName: 'Fixture project' };
      return res.end(JSON.stringify({ response: JSON.stringify(result) }));
    }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  url = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await new Promise(r => server.close(r));
  for (const p of fixtures) {
    const rel = relative(resolve(tmpdir()), resolve(p));
    assert(!rel.startsWith('..') && !isAbsolute(rel) && rel.startsWith('archivetuna-test-'));
    rmSync(p, { recursive: true, force: true });
  }
});
test('help, version, strict arguments, and bare directory never start processing', async () => {
  const cwd = fixture();
  assert.match((await run(cwd, '--help')).stdout, /ArchiveTuna/);
  assert.match((await run(cwd, '--version')).stdout, /^0\.2\.0/);
  for (const args of [[cwd], ['models', cwd, '--bogus'], ['run', cwd], ['describe', '--tier', '4'], ['describe', '--limit', '-1'], ['scan', cwd, '--no-vision']]) {
    await assert.rejects(run(cwd, ...args));
  }
  assert.deepEqual(readdirSync(cwd), []);
});
test('init writes a generic profile, never overwrites, and dry-run writes nothing', async () => {
  const cwd = fixture();
  await run(cwd, 'init', '--dry-run'); assert.deepEqual(readdirSync(cwd), []);
  await run(cwd, 'init');
  assert.equal(loadProfile(join(cwd, 'profile.yaml')).name, 'My archive');
  await assert.rejects(run(cwd, 'init'));
});
test('configuration and profile structure reject invalid values early', () => {
  const cwd = fixture();
  writeFileSync(join(cwd, 'archivetuna.config.json'), JSON.stringify({ sampleBytesPerFile: -4 }));
  assert.throws(() => loadConfig(cwd, {}), /nonnegative/);
  writeFileSync(join(cwd, 'profile.yaml'), 'statement: hello\nprojects: not-an-array\n');
  assert.throws(() => loadProfile(join(cwd, 'profile.yaml')), /array/);
});
test('different contents with equal names and sizes remain separate review targets', async () => {
  const { root } = tree(), m = await inventory(root, { prune: [] }), stats = buildDirStats(m), dupes = analyzeDupes(m, stats);
  assert.equal(dupes.clusters.length, 1);
  assert.equal(dupes.subsumed.size, 0);
  assert.deepEqual(selectTargets(m, stats, dupes.subsumed, DEFAULTS), ['A', 'B']);
});
test('inventory excludes its own output and rejects nonexistent roots', async () => {
  const { root } = tree();
  mkdirSync(join(root, 'out')); writeFileSync(join(root, 'out', 'report.md'), 'old output');
  const m = await inventory(root, { prune: [], exclude: [join(root, 'out')] });
  assert.equal(m.files.length, 2);
  await assert.rejects(inventory(join(root, 'missing'), { prune: [] }));
  await assert.rejects(inventory(root, { prune: [], exclude: [root] }), /output directory/);
});
test('privacy tiers, root-level evidence, and distinct bounded T3 behavior', async () => {
  const { root } = tree();
  writeFileSync(join(root, 'root.txt'), 'root evidence');
  writeFileSync(join(root, 'A', 'long.txt'), 'X'.repeat(6000));
  const m = await inventory(root, { prune: [] });
  const t0 = await gatherEvidence(m, 'A', { ...DEFAULTS, tier: 0 });
  const t1 = await gatherEvidence(m, 'A', { ...DEFAULTS, tier: 1 });
  const t2 = await gatherEvidence(m, 'A', { ...DEFAULTS, tier: 2 });
  const t3 = await gatherEvidence(m, 'A', { ...DEFAULTS, tier: 3 });
  assert(!t0.text.includes('notes.txt')); assert(t1.text.includes('notes.txt')); assert(!t1.text.includes('A'.repeat(12)));
  assert(t2.text.includes('X'.repeat(4096))); assert(!t2.text.includes('X'.repeat(4097)));
  assert(t3.text.includes('X'.repeat(6000)));
  assert.equal(planEvidence(m, 'A', { ...DEFAULTS, tier: 3, fullTextMaxTotalBytes: 20 }).length, 1);
  assert((await gatherEvidence(m, '', { ...DEFAULTS, tier: 1 })).text.includes('root.txt'));
  const dry = await gatherEvidence(m, 'A', { ...DEFAULTS, tier: 3, dryRun: true });
  assert(dry.text.includes('Would read:')); assert(!dry.text.includes('A'.repeat(12))); assert.deepEqual(dry.filesConsidered, []);
});
test('all command dry-runs leave archive and outputs unchanged', async () => {
  const { cwd, root, out } = tree();
  writeFileSync(join(cwd, 'profile.yaml'), 'statement: Recover my projects\n');
  await run(cwd, 'scan', root, '--out', out, '--dry-run'); assert(!existsSync(out));
  await run(cwd, 'run', root, '--profile', join(cwd, 'profile.yaml'), '--tier', '3', '--out', out, '--dry-run');
  assert(!existsSync(out));
  writeFileSync(join(root, 'part.stl'), 'solid fixture\nendsolid fixture\n');
  for (const args of [['models', root], ['models', 'meta', root, '--no-vision'], ['models', 'collage', root]]) await run(cwd, ...args, '--dry-run');
  assert(!existsSync(join(root, 'part.stl.yaml'))); assert(!existsSync(join(root, 'part-collage.png')));
  await run(cwd, 'scan', root, '--out', out);
  await run(cwd, 'dupes', '--out', out, '--dry-run');
  await run(cwd, 'describe', '--out', out, '--tier', '3', '--dry-run');
  assert.deepEqual(readdirSync(out), ['manifest.json']);
});
test('facts-only STL metadata works without rendering and preserves existing notes', async () => {
  const cwd = fixture();
  writeFileSync(join(cwd, 'part.stl'), 'solid fixture\nendsolid fixture\n');
  await run(cwd, 'models', 'meta', cwd, '--no-vision');
  const sidecar = join(cwd, 'part.stl.yaml');
  assert.match(readFileSync(sidecar, 'utf8'), /described_by: null/);
  writeFileSync(sidecar, 'notes:\n  story: keep this\n');
  await run(cwd, 'models', 'meta', cwd, '--no-vision');
  assert.equal(readFileSync(sidecar, 'utf8'), 'notes:\n  story: keep this\n');
});
test('local inference rejects remote endpoints, cloud names, proxy models, and incorrect tags', async () => {
  for (const remote of ['https://ollama.com', 'http://192.168.1.2:11434', 'http://localhost:11434/path', 'http://localhost:11434?x=1']) {
    assert.throws(() => localEndpoint({ url: remote, model: 'fixture' }));
  }
  assert.throws(() => localEndpoint({ url, model: 'fixture:cloud' }));
  assert.equal((await checkHealth({ url, model: 'fixture' })).ok, true);
  assert.equal((await checkHealth({ url, model: 'fixture:wrong' })).ok, false);
  assert.equal((await checkHealth({ url, model: 'proxy:latest' })).ok, false);
});
test('cache identity includes actual text, folder context, and full profile content', async () => {
  const { root, out } = tree(), m = await inventory(root, { prune: [] }), stats = buildDirStats(m);
  const cfg = { ...DEFAULTS, out, tier: 2, model: 'fixture:latest', ollamaUrl: url }, o = { url, model: cfg.model };
  let beforeCalls = generations.length;
  const descriptions = await describeStage(m, ['A', 'B'], cfg, o, stats, () => {});
  assert.equal(generations.length - beforeCalls, 2);
  await describeStage(m, ['A', 'B'], cfg, o, stats, () => {}); assert.equal(generations.length - beforeCalls, 2);
  writeFileSync(join(root, 'A', 'notes.txt'), 'C'.repeat(12));
  await describeStage(m, ['A'], cfg, o, stats, () => {}); assert.equal(generations.length - beforeCalls, 3);
  const p = { name: 'same', statement: 'apples', terms: [], topics: [], projects: [] };
  beforeCalls = generations.length;
  const first = await rankStage(m, descriptions, p, cfg, o, stats, () => {});
  const second = await rankStage(m, descriptions, { ...p, statement: 'orange' }, cfg, o, stats, () => {});
  assert.equal(generations.length - beforeCalls, 4);
  assert.notEqual(first[0].score, second[0].score);
});
test('staged CLI workflow rebuilds cached reports offline and refuses stale/profile mismatches', async () => {
  const { cwd, root, out } = tree();
  writeFileSync(join(cwd, 'archivetuna.config.json'), JSON.stringify({ model: 'fixture:latest', ollamaUrl: url }));
  const profile = join(cwd, 'profile.yaml'); writeFileSync(profile, 'name: same\nstatement: apples\n');
  await run(cwd, 'scan', root, '--out', out);
  await run(cwd, 'dupes', '--out', out); assert(existsSync(join(out, 'dupes.md')));
  assert(!existsSync(join(out, 'report.json')));
  await run(cwd, 'describe', '--out', out);
  await run(cwd, 'rank', '--profile', profile, '--out', out);
  const prior = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8'));
  const beforeCalls = generations.length;
  await run(cwd, 'report', '--out', out);
  assert.equal(generations.length, beforeCalls);
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')).rankings, prior.rankings);
  const before = readFileSync(join(out, 'report.json'), 'utf8');
  await run(cwd, 'rank', '--profile', profile, '--out', out, '--dry-run');
  await run(cwd, 'report', '--out', out, '--dry-run');
  assert.equal(readFileSync(join(out, 'report.json'), 'utf8'), before);
  writeFileSync(profile, 'name: same\nstatement: orange\n');
  await assert.rejects(run(cwd, 'report', '--out', out, '--profile', profile));
  await assert.rejects(run(cwd, 'report', '--out', out, '--tier', '3'));
  assert.equal(readFileSync(join(out, 'report.json'), 'utf8'), before);
  await run(cwd, 'run', root, '--out', out, '--profile', profile);
  assert.equal(JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')).rankings[0].score, 40);
});
