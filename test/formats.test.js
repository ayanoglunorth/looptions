const test = require('node:test');
const assert = require('node:assert');
const DS = require('../src/core/parse.js');

test('parseAny reads YouTube json3', () => {
  const json = JSON.stringify({ events: [
    { tStartMs: 0, dDurationMs: 1000 },
    { tStartMs: 1500, dDurationMs: 2000, segs: [{ utf8: 'Hello ' }, { utf8: 'world' }] },
    { tStartMs: 4000, dDurationMs: 500, segs: [{ utf8: '\n' }] },
  ] });
  assert.deepStrictEqual(DS.parseAny(json), [{ start: 1.5, end: 3.5, text: 'Hello world' }]);
});

test('parseAny reads TTML with tick rate, line breaks and entities', () => {
  const ttml = '<?xml version="1.0"?><tt xmlns="http://www.w3.org/ns/ttml" ttp:tickRate="10000000"><body><div>' +
    '<p begin="10000000t" end="25000000t" region="r1"><span>Tom &amp; Jerry</span><br/>run</p>' +
    '<p begin="00:00:03.000" dur="1.5s">Bye&#39;s</p></div></body></tt>';
  assert.deepStrictEqual(DS.parseAny(ttml), [
    { start: 1, end: 2.5, text: 'Tom & Jerry\nrun' },
    { start: 3, end: 4.5, text: "Bye's" },
  ]);
});

test('speaker-change markers (>>) are removed in every format', () => {
  const json = JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: '>> so we went' }, { utf8: '\n>> no way' }] }] });
  assert.strictEqual(DS.parseAny(json)[0].text, 'so we went\nno way');
  assert.strictEqual(DS.parseAny('WEBVTT\n\n00:01.000 --> 00:02.000\n&gt;&gt; Hi\n')[0].text, 'Hi');
  assert.strictEqual(DS.parseAny('<tt><body><p begin="1s" end="2s">&gt;&gt; Yo</p></body></tt>')[0].text, 'Yo');
  assert.strictEqual(DS.cleanText('a >> b'), 'a >> b'); // only at line start
});

test('zero-width characters and space runs are cleaned', () => {
  assert.strictEqual(DS.cleanText('​​​ ​Bu Manchester ​ ​​ ​​ ​100 bin​ ​​'), 'Bu Manchester 100 bin');
  assert.strictEqual(DS.cleanText(' a  b \n  c '), 'a b\nc');
});

test('parseAny falls through to SRT/VTT', () => {
  assert.strictEqual(DS.parseAny('WEBVTT\n\n00:01.000 --> 00:02.000\nHi\n')[0].text, 'Hi');
});

test('cuesToVtt round-trips through parseSubtitle', () => {
  const cues = [{ start: 61.5, end: 3725.25, text: 'a\nb' }];
  assert.deepStrictEqual(DS.parseSubtitle(DS.cuesToVtt(cues)), cues);
});
