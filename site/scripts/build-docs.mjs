import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(site, '../docs/guide');
const output = path.resolve(site, 'docs/dist');
if (output !== path.join(site, 'docs', 'dist')) throw new Error('Unexpected docs output');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
fs.copyFileSync(path.join(site, 'theme.css'), path.join(output, 'assets/theme.css'));
fs.copyFileSync(path.join(site, 'docs/assets/docs.css'), path.join(output, 'assets/docs.css'));
const nav = JSON.parse(fs.readFileSync(path.join(source, '_nav.json'), 'utf8'));
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const route = (id) => id === 'getting-started' ? '/docs/' : '/docs/' + id + '/';
for (const [index, entry] of nav.entries()) {
  const headings = [];
  const ids = new Map();
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const plain = text.replace(/<[^>]*>/g, '');
    const base = plain.toLowerCase().replace(/&[^;]+;/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'section';
    const count = ids.get(base) || 0;
    ids.set(base, count + 1);
    const id = count ? base + '-' + count : base;
    if (depth === 2) headings.push({ title: plain, id });
    return '<h' + depth + ' id="' + id + '">' + text + '</h' + depth + '>\n';
  };
  const originalLink = renderer.link;
  renderer.link = function (token) {
    let href = token.href;
    const match = /^([\w-]+)\.md(#.*)?$/.exec(href);
    if (match) href = route(match[1]) + (match[2] || '');
    return originalLink.call(this, { ...token, href });
  };
  const content = marked.parse(fs.readFileSync(path.join(source, entry.id + '.md'), 'utf8'), { renderer });
  const navHtml = nav.map(item => '<a href="' + route(item.id) + '"' + (item.id === entry.id ? ' aria-current="page"' : '') + '>' + escape(item.title) + '</a>').join('');
  const previous = nav[index - 1];
  const next = nav[index + 1];
  const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escape(entry.title) + ' · ArchiveTuna</title><meta name="description" content="ArchiveTuna guide: ' + escape(entry.title) + '. Digital archaeology with local models."><link rel="canonical" href="https://archivetuna.dev' + route(entry.id) + '"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/docs/assets/theme.css"><link rel="stylesheet" href="/docs/assets/docs.css"></head><body><a class="skip-link" href="#main">Skip to content</a><header class="docs-header"><a class="docs-brand" href="/"><img src="/logo.png" width="74" height="36" alt="">ArchiveTuna <span>Field guide</span></a><a href="/">Home ↗</a></header><div class="docs-layout"><nav class="docs-sidebar" aria-label="Documentation"><p class="docs-label">EXPLORE THE GUIDE</p>' + navHtml + '</nav><details class="docs-mobile"><summary>In this guide</summary><nav aria-label="Documentation">' + navHtml + '</nav></details><main id="main" class="docs-content">' + content + '<nav class="docs-pagination" aria-label="Previous and next">' + (previous ? '<a href="' + route(previous.id) + '">← ' + escape(previous.title) + '</a>' : '<span></span>') + (next ? '<a href="' + route(next.id) + '">' + escape(next.title) + ' →</a>' : '') + '</nav></main><aside class="docs-toc"><p class="docs-label">ON THIS PAGE</p>' + headings.map(h => '<a href="#' + h.id + '">' + h.title + '</a>').join('') + '</aside></div><footer class="docs-footer">ArchiveTuna · Local tools. Lasting digital life. <a href="https://www.npmjs.com/package/archivetuna">Get ArchiveTuna on npm ↗</a></footer></body></html>';
  const dir = path.join(output, entry.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  if (entry.id === 'getting-started') fs.writeFileSync(path.join(output, 'index.html'), html);
}
console.log('Built ' + nav.length + ' documentation pages and the /docs entry.');
