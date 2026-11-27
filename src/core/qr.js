// QR code generator for the export page: byte mode, error correction M, versions 1-10 (URLs up to ~210 bytes). Pure; runs in Node too.
// DS.qrMatrix(text) -> rows of booleans (true = dark); DS.qrSvg(text) -> an SVG string with a 4-module quiet zone.
(() => {
  const DS = (globalThis.DS ||= {});
  const DATA = [0, 16, 28, 44, 64, 86, 108, 124, 154, 182, 216]; // data codewords per version at level M
  const EC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]; // error-correction codewords per block
  const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
  const ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  // Reed-Solomon over GF(256), polynomial 0x11D.
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  const generator = n => {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(g.length + 1).fill(0);
      g.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i]); });
      g = next;
    }
    return g;
  };
  const remainder = (data, n) => {
    const g = generator(n), r = new Array(n).fill(0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      for (let i = 0; i < n; i++) r[i] ^= mul(g[i + 1], f);
    }
    return r;
  };

  // Data and error-correction codewords, interleaved across blocks.
  const codewords = (bytes, v) => {
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4);
    put(bytes.length, v < 10 ? 8 : 16);
    bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, DATA[v] * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let pad = 0xec; data.length < DATA[v]; pad ^= 0xec ^ 0x11) data.push(pad);
    const nb = BLOCKS[v], short = Math.floor(DATA[v] / nb), longFrom = nb - (DATA[v] % nb);
    const blocks = [];
    for (let i = 0, at = 0; i < nb; i++) { const len = short + (i >= longFrom ? 1 : 0); blocks.push(data.slice(at, at + len)); at += len; }
    const ecs = blocks.map(b => remainder(b, EC[v]));
    const out = [];
    for (let i = 0; i <= short; i++) blocks.forEach(b => { if (i < b.length) out.push(b[i]); });
    for (let i = 0; i < EC[v]; i++) ecs.forEach(e => out.push(e[i]));
    return out;
  };

  const MASKS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  // Lower is better: long runs, 2x2 blocks and dark/light imbalance (the finder-lookalike rule is left out; any mask still scans).
  const penalty = m => {
    const n = m.length;
    let p = 0, dark = 0;
    for (let a = 0; a < n; a++) {
      for (const get of [(i) => m[a][i], (i) => m[i][a]]) {
        for (let i = 0, run = 1; i < n; i++) {
          if (m[a][i]) dark++;
          if (i && get(i) === get(i - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
        }
      }
    }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    return p + Math.floor(Math.abs(dark / 2 - (n * n) / 4) / (n * n / 20)) * 10 / 2;
  };

  DS.qrMatrix = text => {
    const bytes = [...new TextEncoder().encode(text)];
    let v = 1;
    while (v <= 10 && bytes.length > DATA[v] - (v < 10 ? 2 : 3)) v++;
    if (v > 10) throw new Error('QR: text too long');
    const size = 17 + 4 * v;
    const grid = Array.from({ length: size }, () => new Array(size).fill(false));
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { if (x >= 0 && y >= 0 && x < size && y < size) { grid[y][x] = dark; fixed[y][x] = true; } };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); }
    }
    const pos = ALIGN[v];
    for (const cy of pos) {
      for (const cx of pos) {
        if ((cx === 6 && cy === 6) || (cx === 6 && cy === pos.at(-1)) || (cx === pos.at(-1) && cy === 6)) continue;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
    const format = mask => { // level M is 00; 5 data bits + 10 BCH bits, xor 0x5412
      let rem = mask;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = ((mask << 10) | rem) ^ 0x5412, bit = i => ((bits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    format(0); // reserves the format area before data goes in
    if (v >= 7) {
      let rem = v;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (v << 12) | rem;
      for (let i = 0; i < 18; i++) { const d = ((bits >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, d); set(b, a, d); }
    }
    const words = codewords(bytes, v);
    for (let i = 0, right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j, y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
          if (!fixed[y][x] && i < words.length * 8) { grid[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
        }
      }
    }
    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      const m = grid.map(r => r.slice());
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
      const keep = grid.map(r => r.slice());
      for (let y = 0; y < size; y++) grid[y] = m[y];
      format(mask);
      const score = penalty(grid);
      if (!best || score < best.score) best = { score, m: grid.map(r => r.slice()) };
      for (let y = 0; y < size; y++) grid[y] = keep[y];
    }
    return best.m;
  };

  DS.qrSvg = (text, { dark = '#2d2134', light = 'none' } = {}) => {
    const m = DS.qrMatrix(text), q = 4, n = m.length + 2 * q;
    let d = '';
    m.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + q} ${y + q}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
  };

  if (typeof module === 'object') module.exports = DS;
})();
