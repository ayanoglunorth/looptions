// Builds the Chrome Web Store package: node scripts/pack.js
// The Store takes the listing name and summary from manifest.json and does not let the dashboard change them, so the
// package gets the Store name; the repo's own manifest keeps the plain "Looptions" name.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STORE_NAME = 'Looptions - Dual Subtitles & Language Learning';
const STORE_SUMMARY = 'Watch videos with synced dual subtitles. Click words to translate, save with sentences, and practice with spaced repetition.';
const root = path.join(__dirname, '..');

try { execFileSync(process.execPath, [path.join(__dirname, 'check-release.js')], { stdio: 'inherit' }); }
catch { console.error('Release check failed: fix the items above first.'); process.exit(1); }

// Summary per language. The Store reads the language list from _locales, so each one gets its own dashboard tab for the long description.
const SUMMARIES = {
  en: STORE_SUMMARY,
  tr: 'Videoları senkronize çift altyazıyla izle. Kelimeye tıkla, çevir, cümlesiyle kaydet ve aralıklı tekrarla pratik yap.',
  es: 'Mira videos con subtítulos dobles sincronizados. Haz clic en una palabra para traducirla, guardarla y practicarla después.',
  de: 'Videos mit synchronen Doppel-Untertiteln ansehen. Wörter anklicken, übersetzen, mit Satz speichern und gezielt wiederholen.',
  fr: "Regardez des vidéos avec deux sous-titres synchronisés. Cliquez sur un mot pour le traduire, l'enregistrer et le réviser.",
  ru: 'Смотрите видео с двойными субтитрами. Нажимайте на слова для перевода, сохраняйте с контекстом и повторяйте по интервалам.',
};
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
manifest.name = '__MSG_extName__';
manifest.description = '__MSG_extDescription__';
manifest.default_locale = 'en';
if (STORE_NAME.length > 75) throw new Error('name too long for the Store');
for (const [l, s] of Object.entries(SUMMARIES)) if (s.length > 132) throw new Error(`summary (${l}) too long for the Store`);

const out = path.join(root, 'dist', `looptions-${manifest.version}`);
fs.rmSync(out, { recursive: true, force: true });
for (const item of ['icons', 'fonts', 'pages', 'popup', 'src']) fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
for (const [l, s] of Object.entries(SUMMARIES)) {
  fs.mkdirSync(path.join(out, '_locales', l), { recursive: true });
  fs.writeFileSync(path.join(out, '_locales', l, 'messages.json'), JSON.stringify({ extName: { message: STORE_NAME }, extDescription: { message: s } }, null, 2));
}

const zip = `${out}.zip`;
fs.rmSync(zip, { force: true });
if (process.platform === 'win32') {
  // Windows tar writes forward-slash entry names; Compress-Archive (PS 5.1) writes backslashes, which zip readers can mishandle.
  // Full path: Git Bash puts GNU tar first on PATH, which reads "E:" as a remote host and cannot write zips.
  execFileSync(path.join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-a', '-c', '-f', zip, '-C', out, ...fs.readdirSync(out)], { stdio: 'inherit' });
  console.log(`Store package: ${zip}`);
} else console.log(`Folder ready, zip it yourself: ${out}`);
