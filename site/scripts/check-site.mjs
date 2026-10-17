import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.join(site, 'build');
const nav = JSON.parse(fs.readFileSync(path.resolve(site, '../docs/guide/_nav.json'), 'utf8'));
const required = ['index.html', 'docs/index.html', ...nav.map(item => 'docs/' + item.id + '/index.html')];
for (const file of required) if (!fs.existsSync(path.join(build, file))) throw new Error('Missing route: ' + file);
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]); }
const errors = [];
let links = 0;
for (const file of walk(build).filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(build, file).split(path.sep).join('/');
  const base = 'https://local.invalid/' + (relative.endsWith('index.html') ? relative.slice(0, -10) : relative);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&');
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;
    const url = new URL(href, base);
    let target = path.resolve(build, '.' + decodeURIComponent(url.pathname));
    if (target !== build && !target.startsWith(build + path.sep)) { errors.push(relative + ': outside build ' + href); continue; }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    else if (!fs.existsSync(target) && fs.existsSync(target + '.html')) target += '.html';
    if (!fs.existsSync(target)) { errors.push(relative + ': missing ' + href); continue; }
    if (url.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!fs.readFileSync(target, 'utf8').includes('id="' + id + '"')) errors.push(relative + ': missing anchor ' + href);
    }
    links++;
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log('Verified ' + required.length + ' routes and ' + links + ' local links/assets.');
