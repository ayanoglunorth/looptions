const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
require('../src/core/lang.js');
require('../src/core/vocab.js');
const DS = require('../src/core/i18n.js');

const holes = s => (s.match(/\{\d\}/g) || []).sort().join();

test('every row has all six languages with the same placeholders', () => {
  const seen = new Set();
  for (const r of DS.I18N_ROWS) {
    assert.strictEqual(r.length, 6, r[0]);
    assert.ok(r.every(s => typeof s === 'string' && s.trim()), r[0]);
    assert.ok(!seen.has(r[0]), 'duplicate key: ' + r[0]);
    seen.add(r[0]);
    for (const s of r) assert.strictEqual(holes(s), holes(r[0]), s);
  }
});

test('t fills placeholders, keeps Turkish, falls back to the source', () => {
  assert.strictEqual(DS.t('{0} kelime kayıtlı', 'de', 3), '3 Wörter gespeichert');
  assert.strictEqual(DS.t('{0} kelime kayıtlı', 'tr', 3), '3 kelime kayıtlı');
  assert.strictEqual(DS.t('bilinmeyen metin', 'fr'), 'bilinmeyen metin');
});

test('uiLang follows the native language', () => {
  assert.strictEqual(DS.uiLang({ secondary: 'ru' }), 'ru');
  assert.strictEqual(DS.uiLang({ secondary: 'tr' }), 'tr');
  assert.strictEqual(DS.uiLang({ secondary: 'xx' }), 'en');
  for (const l of DS.LANGS) assert.strictEqual(DS.uiLang({ secondary: l }), l);
});

test('option labels are translated', () => {
  const labels = [...DS.PLAY_KEYS, ...DS.LOGO_CORNERS, ...DS.STYLES].map(x => x.label)
    .concat(DS.STYLES.map(x => x.note), DS.LEVEL_LABELS, DS.FONTS.filter(f => f.id === 'roboto' || f.id === 'system').map(f => f.label));
  for (const l of labels) assert.ok(l in DS.I18N.en, 'missing: ' + l);
});

// Every visible text and labelled attribute in the extension pages must have a row (or sit inside a whole-innerHTML row).
test('page texts all have translations', () => {
  const skip = new Set(['Loop', 'tions', 'Looptions', '%', 'youtube.com', 'TR', 'EN', '1', '2', '3', '4', '5']);
  const missing = [];
  const wholes = Object.keys(DS.I18N.en).filter(k => k.includes('<'));
  for (const f of ['popup/popup.html', 'pages/options.html', 'pages/welcome.html']) {
    let html = fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, '');
    for (const w of wholes) html = html.replace(w, '');
    const texts = [...html.matchAll(/>([^<>]+)</g)].map(m => m[1].trim().replace(/\s+/g, ' '))
      .concat([...html.matchAll(/(?:aria-label|title|placeholder)="([^"]+)"/g)].map(m => m[1]));
    for (const s of texts) if (s && !skip.has(s) && /\p{L}/u.test(s) && !/^[\d,]+ sn$/.test(s) && !(s in DS.I18N.en)) missing.push(`${f}: ${s}`);
  }
  assert.deepStrictEqual(missing, []);
});
