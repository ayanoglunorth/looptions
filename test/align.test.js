const test = require('node:test');
const assert = require('node:assert');
const DS = require('../src/core/parse.js');

const c = (start, end, text) => ({ start, end, text });
const view = cues => cues.map(x => [x.start, x.end, x.text]);

test('alignCues gives the other track the anchor track\'s boundaries', () => {
  const anchor = [c(0, 2, 'A1'), c(2, 4, 'A2')];
  const other = [c(0.3, 2.5, 'B1'), c(2.5, 4, 'B2')];
  assert.deepStrictEqual(view(DS.alignCues(anchor, other)), [[0, 2, 'B1'], [2, 4, 'B2']]);
});

test('each other cue goes to the anchor cue it overlaps most, several are joined', () => {
  const anchor = [c(0, 4, 'A1'), c(4, 5, 'A2')];
  const other = [c(0, 1, 'x'), c(1, 4.4, 'y'), c(4.5, 5, 'z')];
  assert.deepStrictEqual(view(DS.alignCues(anchor, other)), [[0, 4, 'x y'], [4, 5, 'z']]);
});

test('an anchor cue that got nothing borrows the other cue it overlaps most (no blank bottom line)', () => {
  const anchor = [c(0, 2, 'We will give'), c(2, 3, 'a hundred thousand!')];
  const other = [c(0, 3, '100 bin vereceğiz.')];
  assert.deepStrictEqual(view(DS.alignCues(anchor, other)), [[0, 2, '100 bin vereceğiz.'], [2, 3, '100 bin vereceğiz.']]);
});

test('other cues in an anchor gap keep their own timing', () => {
  const anchor = [c(0, 1, 'A1'), c(5, 6, 'A2')];
  const other = [c(0, 1, 'x'), c(2, 3, 'gap'), c(5, 6, 'z')];
  assert.deepStrictEqual(view(DS.alignCues(anchor, other)), [[0, 1, 'x'], [2, 3, 'gap'], [5, 6, 'z']]);
});

test('shift moves the other track into anchor time (per-line offsets)', () => {
  const anchor = [c(10, 12, 'A')];
  const other = [c(9, 11, 'late')]; // with shift +1 it covers 10..12
  assert.deepStrictEqual(view(DS.alignCues(anchor, other, 1)), [[10, 12, 'late']]);
});

test('aligned text follows later edits of the source cues (progressive translation)', () => {
  const other = [c(0, 1, '')];
  const aligned = DS.alignCues([c(0, 1, 'A')], other);
  other[0].text = 'çeviri';
  assert.strictEqual(aligned[0].text, 'çeviri');
});
