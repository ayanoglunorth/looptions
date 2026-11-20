// One-off: renders the logo as icons/icon-{16,32,48,128,512}.png. No dependencies. Flat colours, full-bleed white rounded tile.
// Usage: node scripts/make-icons.js [pills|video] [outDir]   (default: pills, icons)
//   pills = the original mark (two pills low in the tile, where captions sit). video = a dark video frame above the pills.
// Everything is laid out in the 24-unit logo grid; rect edges are snapped to whole pixels up to 48px so small sizes stay crisp.
const fs = require('fs'), zlib = require('zlib');
const VARIANT = process.argv[2] === 'video' ? 'video' : 'pills', OUT = process.argv[3] || 'icons';
const SS = 8, WHITE = [255, 255, 255], INK = [45, 33, 52], ORANGE = [242, 122, 54], LILAC = [165, 148, 227];
// Original mark at 1:1 size (pills 16x4.5 and 11x4.5), moved down 1.5 units so they sit low in the tile where captions sit.
const k = 1, sy = y => y + 1.5;
const PILLS = VARIANT === 'pills'
  ? [{ x: 12 - 8 * k, y: sy(9), w: 16 * k, h: 4.5 * k, c: ORANGE }, { x: 12 - 5.5 * k, y: sy(15), w: 11 * k, h: 4.5 * k, c: LILAC }]
  : [{ x: 4, y: 14.6, w: 16, h: 3.2, c: ORANGE }, { x: 6.5, y: 18.8, w: 11, h: 3.2, c: LILAC }];
const VIDEO = { x: 3, y: 3, w: 18, h: 9.5, r: 3, c: INK };
const PLAY = [[11.1, 6.1], [11.1, 10.4], [14.4, 8.25]];
// Signed distance to a rounded rect (<= 0 inside).
const sdRect = (px, py, x, y, w, h, r) => {
  const qx = Math.abs(px - x - w / 2) - (w / 2 - r), qy = Math.abs(py - y - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
// Signed distance to a convex polygon (counter-clockwise or clockwise, either).
const sdPoly = (px, py, pts) => {
  let out = 1e9, inside = true, sign = 0;
  pts.forEach(([ax, ay], i) => {
    const [bx, by] = pts[(i + 1) % pts.length], ex = bx - ax, ey = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / (ex * ex + ey * ey)));
    out = Math.min(out, Math.hypot(px - ax - ex * t, py - ay - ey * t));
    const c = ex * (py - ay) - ey * (px - ax); if (!sign) sign = Math.sign(c); else if (Math.sign(c) !== sign) inside = false;
  });
  return inside ? -out : out;
};
const png = size => {
  const f = size / 24, snap = size <= 48;
  const rect = s => {
    let x = s.x * f, y = s.y * f, w = s.w * f, h = s.h * f;
    if (snap) { const x1 = Math.round(x + w), y1 = Math.round(y + h); x = Math.round(x); y = Math.round(y); w = x1 - x; h = y1 - y; }
    return { ...s, x, y, w, h, r: s.r !== undefined ? s.r * f : h / 2 };
  };
  const shapes = [...(VARIANT === 'video' ? [rect(VIDEO)] : []), ...PILLS.map(rect)];
  const play = VARIANT === 'video' && size >= 32 ? PLAY.map(([x, y]) => [x * f, y * f]) : null;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0;
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
        const u = i + (si + .5) / SS, v = j + (sj + .5) / SS;
        if (sdRect(u, v, 0, 0, size, size, size / 4) > 0) continue;
        let col = WHITE;
        for (const s of shapes) if (sdRect(u, v, s.x, s.y, s.w, s.h, s.r) <= 0) col = s.c;
        if (play && sdPoly(u, v, play) <= 0.55 * f) col = WHITE;
        r += col[0]; g += col[1]; b += col[2]; a++;
      }
      const o = j * (size * 4 + 1) + 1 + i * 4;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = 255 * a / (SS * SS);
    }
  }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = ~0; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]), o = Buffer.alloc(4); o.writeUInt32BE(d.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([o, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
fs.mkdirSync(OUT, { recursive: true });
for (const s of [16, 32, 48, 128, 512]) fs.writeFileSync(`${OUT}/icon-${s}.png`, png(s));
