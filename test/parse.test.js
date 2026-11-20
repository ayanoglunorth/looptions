const test = require('node:test');
const assert = require('node:assert');
const DS = require('../src/core/parse.js');

test('parses SRT with comma millis and multi-line cue', () => {
  const srt = '1\r\n00:00:01,500 --> 00:00:03,000\r\nMerhaba\r\ndünya\r\n\r\n2\r\n00:01:00,000 --> 00:01:02,250\r\nİkinci\r\n';
  assert.deepStrictEqual(DS.parseSubtitle(srt), [
    { start: 1.5, end: 3, text: 'Merhaba\ndünya' },
    { start: 60, end: 62.25, text: 'İkinci' },
  ]);
});

test('parses VTT with header, short timestamps, cue ids and settings', () => {
  const vtt = 'WEBVTT\n\nNOTE comment\n\nintro\n00:01.000 --> 00:02.000 align:start line:90%\n<i>Hello</i> there\n\n00:00:03.000 --> 00:00:04.000\nBye\n';
  assert.deepStrictEqual(DS.parseSubtitle(vtt), [
    { start: 1, end: 2, text: 'Hello there' },
    { start: 3, end: 4, text: 'Bye' },
  ]);
});

test('returns cues sorted by start', () => {
  const srt = '1\n00:00:05,000 --> 00:00:06,000\nB\n\n2\n00:00:01,000 --> 00:00:02,000\nA\n';
  assert.deepStrictEqual(DS.parseSubtitle(srt).map(c => c.text), ['A', 'B']);
});

test('decodes UTF-8 with BOM', () => {
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('şğı', 'utf8')]);
  assert.strictEqual(DS.decodeSubtitle(bytes.buffer), 'şğı');
});

test('falls back to windows-1254 for invalid UTF-8', () => {
  // "şğİ" in windows-1254
  const bytes = new Uint8Array([0xfe, 0xf0, 0xdd]);
  assert.strictEqual(DS.decodeSubtitle(bytes.buffer), 'şğİ');
});

test('findCue returns active cue or null', () => {
  const cues = [{ start: 1, end: 2, text: 'a' }, { start: 3, end: 5, text: 'b' }];
  assert.strictEqual(DS.findCue(cues, 0.5), null);
  assert.strictEqual(DS.findCue(cues, 1.2).text, 'a');
  assert.strictEqual(DS.findCue(cues, 2.5), null);
  assert.strictEqual(DS.findCue(cues, 4.99).text, 'b');
  assert.strictEqual(DS.findCue(cues, 9), null);
});

const LINES = [{ start: 1, end: 3 }, { start: 3, end: 5 }, { start: 8, end: 10 }];

test('seekTarget: repeat, prev and next around lines and gaps', () => {
  assert.strictEqual(DS.seekTarget(LINES, 4, 'repeat'), 3);
  assert.strictEqual(DS.seekTarget(LINES, 4, 'prev'), 1);   // inside line 2: line 1
  assert.strictEqual(DS.seekTarget(LINES, 6, 'repeat'), 3); // gap: the line just heard
  assert.strictEqual(DS.seekTarget(LINES, 6, 'prev'), 3);
  assert.strictEqual(DS.seekTarget(LINES, 4, 'next'), 8);
  assert.strictEqual(DS.seekTarget(LINES, 9, 'next'), null);
  assert.strictEqual(DS.seekTarget(LINES, 0.5, 'repeat'), null);
  assert.strictEqual(DS.seekTarget(LINES, 2, 'prev'), 1);   // first line: stays on it
  assert.strictEqual(DS.seekTarget(LINES, 0.5, 'next'), 1);
});

test('crossedLineEnd: only a normal step past the line end counts', () => {
  assert.strictEqual(DS.crossedLineEnd(LINES, 2.99, 3.01), 3);
  assert.strictEqual(DS.crossedLineEnd(LINES, 2, 2.02), null);
  assert.strictEqual(DS.crossedLineEnd(LINES, 2, 9), null);   // a seek is not playback
  assert.strictEqual(DS.crossedLineEnd(LINES, 6, 6.02), null); // gap
  assert.strictEqual(DS.crossedLineEnd(LINES, 3.01, 2.99), null); // backwards
});
