// Every ? button in the app must open an answer that exists: its page in the
// built help site, and the section with that id on the page.
//
// Run after building the help site: `node docs-site/build.mjs && node scripts/help-links-test.mjs`

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs-site', 'out', 'help');
if (!existsSync(OUT)) { console.error('Build the help site first: node docs-site/build.mjs'); process.exit(1); }

// doc="page#id", doc={'page#id'}, doc: 'page#id', docsLink('page#id'), helpDoc="..."
const PATTERNS = [
  /\b(?:doc|helpDoc)=["']([^"'{}]+)["']/g,
  /\b(?:doc|helpDoc)=\{\s*["'`]([^"'`$]+)["'`]\s*\}/g,
  /\b(?:doc|helpDoc):\s*["']([^"']+)["']/g,
  /docsLink\(\s*["'`]([^"'`$]+)["'`]/g,
];

// Links chosen in code (doc={editing ? 'a#b' : 'a#c'}, lookup tables of tabs)
// are plain strings: any quoted "page#section" naming a help page counts.
const PAGES = new Set(readdirSync(OUT).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)));
const ANY = /["'`]([a-z0-9-]+)#([a-z0-9-]+)["'`]/g;

const files = readdirSync(join(ROOT, 'src'), { recursive: true })
  .map(String).filter((f) => /\.(jsx?|mjs)$/.test(f));
const uses = new Map(); // doc -> [file:line]
for (const f of files) {
  const lines = readFileSync(join(ROOT, 'src', f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return; // comments show examples, not links
    const found = [...PATTERNS.flatMap((re) => [...line.matchAll(re)].map((m) => m[1])),
      ...[...line.matchAll(ANY)].filter((m) => PAGES.has(m[1])).map((m) => `${m[1]}#${m[2]}`)];
    {
      for (const m of found.map((d) => [null, d])) {
        const doc = m[1].trim();
        if (!uses.has(doc)) uses.set(doc, []);
        uses.get(doc).push(`src/${f}:${i + 1}`);
      }
    }
  });
}

const ids = new Map();
const idsOf = (page) => {
  if (!ids.has(page)) {
    const file = join(OUT, `${page}.html`);
    ids.set(page, existsSync(file) ? new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) : null);
  }
  return ids.get(page);
};

// --json: just list the links, for the browser check.
if (process.argv.includes('--json')) { console.log(JSON.stringify([...uses.keys()].sort())); process.exit(0); }

let bad = 0;
for (const [doc, where] of [...uses].sort()) {
  const [page = 'index', section] = doc.split('#');
  const found = idsOf(page || 'index');
  const problem = !found ? `no page ${page}.html` : section && !found.has(section) ? `no section #${section} on ${page}.html` : '';
  if (problem) { bad++; console.log(`  ✗ ${doc}: ${problem}\n      used at ${where.join(', ')}`); }
}
console.log(`\n${uses.size} help links checked, ${bad} broken`);
if (bad) process.exit(1);
