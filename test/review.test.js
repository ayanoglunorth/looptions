const test = require('node:test');
const assert = require('node:assert');
const DS = require('../src/core/review.js');

const DAY = 864e5, NOW = 1e12;
const W = (word, translation, extra = {}) => ({ word, translation, from: 'en', to: 'tr', context: '', at: Math.random(), ...extra });

test('dueWords: no due field means due now; future ones wait; oldest first; capped', () => {
  const ws = [W('a', 'x'), W('b', 'y', { due: NOW + DAY }), W('c', 'z', { due: NOW - 5 }), W('d', 'q', { due: NOW - 50 })];
  assert.deepStrictEqual(DS.dueWords(ws, NOW).map(w => w.word), ['a', 'd', 'c']);
  assert.strictEqual(DS.dueWords(ws, NOW, 2).length, 2);
});

test('gradeWord: right moves up and waits 3/7/21 days, wrong goes to box 1 for a day', () => {
  let w = DS.gradeWord(W('a', 'x'), true, NOW);
  assert.deepStrictEqual([w.box, w.due], [2, NOW + 3 * DAY]);
  w = DS.gradeWord(w, true, NOW); assert.deepStrictEqual([w.box, w.due], [3, NOW + 7 * DAY]);
  w = DS.gradeWord(w, true, NOW); w = DS.gradeWord(w, true, NOW);
  assert.deepStrictEqual([w.box, w.due], [4, NOW + 21 * DAY]); // box 4 stays
  w = DS.gradeWord(w, false, NOW);
  assert.deepStrictEqual([w.box, w.due], [1, NOW + DAY]);
});

test('blankContext: whole word only, case-insensitive, null when absent', () => {
  assert.strictEqual(DS.blankContext(W('run', 'koş', { context: 'They Run fast.' })), 'They ____ fast.');
  assert.strictEqual(DS.blankContext(W('run', 'koş', { context: 'A runner.' })), null);
  assert.strictEqual(DS.blankContext(W('run', 'koş', { context: '' })), null);
  assert.strictEqual(DS.blankContext(W('c++', 'x', { context: 'I like c++ a lot' })), 'I like ____ a lot');
});

test('makeQuestion: card with too few words, choice with 4 options, cloze when the sentence has the word', () => {
  const ws = ['a1', 'b2', 'c3', 'd4', 'e5'].map((x, i) => W(x, 'tr' + i, { context: i === 0 ? 'say a1 now' : '' }));
  assert.strictEqual(DS.makeQuestion(ws[0], ws.slice(0, 3), () => 0.9).type, 'card');
  const c = DS.makeQuestion(ws[1], ws, () => 0.9);
  assert.strictEqual(c.type, 'choice');
  assert.strictEqual(c.options.length, 4);
  assert.ok(c.options.includes(c.answer));
  assert.strictEqual(new Set(c.options).size, 4);
  const k = DS.makeQuestion(ws[0], ws, () => 0.1);
  assert.strictEqual(k.type, 'cloze');
  assert.strictEqual(k.prompt, 'say ____ now');
  assert.ok(k.options.includes('a1') && k.answer === 'a1');
});

test('makeQuestion: distractors never come from another language pair', () => {
  const ws = [W('a', 'x'), ...['b', 'c', 'd', 'e'].map(w => W(w, 'y' + w, { from: 'de' }))];
  assert.strictEqual(DS.makeQuestion(ws[0], ws).type, 'card');
});

test('makeSession pairs due words with questions', () => {
  const ws = [W('a', 'x'), W('b', 'y', { due: NOW + DAY })];
  const s = DS.makeSession(ws, NOW);
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].word.word, 'a');
});
