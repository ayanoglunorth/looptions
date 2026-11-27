const test = require('node:test');
const assert = require('node:assert');
const DS = require('../src/core/qr.js');

test('qrMatrix: size grows with the text, finder patterns sit in three corners', () => {
  assert.strictEqual(DS.qrMatrix('https://a.co').length, 21); // version 1
  assert.strictEqual(DS.qrMatrix('x'.repeat(98)).length, 17 + 4 * 6);
  assert.throws(() => DS.qrMatrix('x'.repeat(300)), /too long/);
  const m = DS.qrMatrix('https://example.com/looptions'), n = m.length;
  const finder = (x, y) => [0, 1, 2, 3, 4, 5, 6].every(i => m[y][x + i] && m[y + 6][x + i] && m[y + i][x] && m[y + i][x + 6]) && !m[y + 1][x + 1] && m[y + 2][x + 2] && m[y + 3][x + 3];
  assert.ok(finder(0, 0) && finder(n - 7, 0) && finder(0, n - 7));
  assert.ok(m[n - 8][8]); // the always-dark module
});

test('qrMatrix: format bits are a valid BCH codeword for level M', () => {
  const m = DS.qrMatrix('https://example.com/looptions');
  let bits = 0;
  [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]].forEach(([x, y], i) => { if (m[y][x]) bits |= 1 << i; });
  const word = bits ^ 0x5412;
  let rem = word >>> 10;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  assert.strictEqual(rem & 0x3ff, word & 0x3ff);
  assert.strictEqual(word >>> 13, 0); // level M = 00
});

test('qrSvg is one path inside a quiet zone', () => {
  const svg = DS.qrSvg('https://a.co');
  assert.match(svg, /viewBox="0 0 29 29"/);
  assert.strictEqual((svg.match(/<path/g) || []).length, 1);
});
