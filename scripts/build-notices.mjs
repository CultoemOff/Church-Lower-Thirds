// Writes THIRD-PARTY-NOTICES.txt for a packaged app: every package in its node_modules with
// its license text, the Node.js runtime and the fonts that ship with the program.
//   node scripts/build-notices.mjs <packaged app dir> <output file>
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const [appDir = repo, out = join(repo, 'THIRD-PARTY-NOTICES.txt')] = process.argv.slice(2);

/** Every installed package, scoped ones and nested copies included. */
function packages(modules, found = []) {
  if (!existsSync(modules)) return found;
  for (const name of readdirSync(modules)) {
    if (name.startsWith('.')) continue;
    const dir = join(modules, name);
    if (name.startsWith('@')) {
      for (const sub of readdirSync(dir)) add(join(dir, sub), found);
    } else add(dir, found);
  }
  return found;
}
function add(dir, found) {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) return;
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  const text = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f));
  found.push({
    name: pkg.name,
    version: pkg.version,
    license: typeof pkg.license === 'string' ? pkg.license : pkg.license?.type || 'see package',
    home:
      typeof pkg.repository === 'string'
        ? pkg.repository
        : pkg.repository?.url || pkg.homepage || '',
    text: text ? readFileSync(join(dir, text), 'utf8').trim() : '',
  });
  packages(join(dir, 'node_modules'), found);
}

const list = packages(join(appDir, 'node_modules')).sort((a, b) =>
  `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
);
if (!list.length) throw new Error(`No packages found in ${join(appDir, 'node_modules')}`);
const seen = new Set();
const rule = '-'.repeat(76);
const parts = [
  'CHURCH LOWER THIRDS BY CULTO EM OFF',
  'Third-party notices / Avisos de componentes de terceiros',
  '',
  'Church Lower Thirds includes the open-source components and typefaces listed below.',
  'Each one is governed by its own license, reproduced here; the license of Church',
  'Lower Thirds itself (LICENSE.txt) does not apply to them.',
  '',
  rule,
  'Node.js (runtime)',
  'License: MIT, with third-party components under their own licenses',
  'https://github.com/nodejs/node/blob/main/LICENSE',
  '',
  'Copyright Node.js contributors. All rights reserved.',
];
for (const p of list) {
  const id = `${p.name}@${p.version}`;
  if (seen.has(id)) continue;
  seen.add(id);
  parts.push('', rule, id, `License: ${p.license}`);
  if (p.home) parts.push(p.home.replace(/^git\+/, '').replace(/\.git$/, ''));
  parts.push(
    '',
    p.text || `(No license file in the package; see its page for the ${p.license} text.)`,
  );
}
const ofl = join(repo, 'src', 'web', 'fonts', 'OFL.txt');
parts.push(
  '',
  rule,
  'Typefaces shipped with the program (folder "fonts")',
  'License: SIL Open Font License 1.1',
  '',
  existsSync(ofl) ? readFileSync(ofl, 'utf8').trim() : 'See fonts/OFL.txt in the program folder.',
  '',
);
writeFileSync(out, parts.join('\n'));
console.log(`${out}: ${seen.size} packages`);
