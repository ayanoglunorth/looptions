// Run before a Store upload: node scripts/check-release.js. Fails while development shortcuts are still in the package.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? (['node_modules', '.git', 'docs', 'test', 'scripts', 'supabase'].includes(e.name) ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]));
const problems = [];
for (const f of walk(root).filter(f => /\.(js|html|json)$/.test(f))) {
  const t = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f);
  if (t.includes('WORKER_SUBDOMAIN')) problems.push(`${rel}: translation server URL is still a placeholder`);
  if (t.includes('EXTENSION_ID')) problems.push(`${rel}: Chrome Web Store address (QR code on the PDF sheet) is still a placeholder`);
  if (t.includes('translate.googleapis.com')) problems.push(`${rel}: unofficial Google translate endpoint is still in the code`);
}
console.log(problems.length ? problems.join('\n') : 'release check passed');
process.exit(problems.length ? 1 : 0);
