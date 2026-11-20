// Builds the Chrome Web Store package: node scripts/pack.js
// The Store takes the listing name and summary from manifest.json and does not let the dashboard change them, so the
// package gets the Store name; the repo's own manifest keeps the plain "Looptions" name.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STORE_NAME = 'Dual Subtitles - Looptions';
const STORE_SUMMARY = 'Watch videos with two subtitle languages at once. Click a word to translate it, save it, and practice it later.';
const root = path.join(__dirname, '..');

try { execFileSync(process.execPath, [path.join(__dirname, 'check-release.js')], { stdio: 'inherit' }); }
catch { console.error('Release check failed: fix the items above first.'); process.exit(1); }

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
manifest.name = STORE_NAME;
manifest.description = STORE_SUMMARY;
if (STORE_NAME.length > 75 || STORE_SUMMARY.length > 132) throw new Error('name or summary too long for the Store');

const out = path.join(root, 'dist', `looptions-${manifest.version}`);
fs.rmSync(out, { recursive: true, force: true });
for (const item of ['icons', 'fonts', 'pages', 'popup', 'src']) fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));

const zip = `${out}.zip`;
fs.rmSync(zip, { force: true });
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}'`], { stdio: 'inherit' });
  console.log(`Store package: ${zip}`);
} else console.log(`Folder ready, zip it yourself: ${out}`);
