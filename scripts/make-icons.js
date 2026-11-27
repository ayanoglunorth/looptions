// Renders the Looptions 1A Dark logo as icons/icon-{16,32,48,128,512}.png. No dependencies.
// Usage: node scripts/make-icons.js [outDir]   (default: icons)
// Geometry is defined in the 128x128 logo grid; 8x supersampled for razor-sharp edges at all sizes.
const fs = require('fs'), zlib = require('zlib');
const OUT = process.argv[2] || 'icons';
const SS = 8;

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lerp = (a, b, t) => { const k = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
const blend = (base, over, alpha) => lerp(base, over, alpha);

const BG_A = hex('#3E2854'), BG_B = hex('#1E132B'), GLOW = hex('#F27A36');
const BACK_A = hex('#FF9B54'), BACK_B = hex('#E85E24');
const CARD = hex('#FFFDFB'), INK = hex('#2D2134'), ORANGE = hex('#F27A36'), LILAC = hex('#9D8CE0');

// Signed distance to a rounded rect (<= 0 inside).
const sdRect = (px, py, x, y, w, h, r) => {
  const qx = Math.abs(px - x - w / 2) - (w / 2 - r);
  const qy = Math.abs(py - y - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

const png = size => {
  const scale = 128 / size;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  // Slight bolding of inner pills at tiny sizes (16px) so they stay crisp in Chrome's toolbar.
  const pillPad = size <= 16 ? 1.1 : size <= 32 ? 0.5 : 0;

  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0;
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
        const x = (i + (si + 0.5) / SS) * scale;
        const y = (j + (sj + 0.5) / SS) * scale;
        if (sdRect(x, y, 0, 0, 128, 128, 30) > 0) continue;

        // Background: linear gradient (#3E2854 -> #1E132B) + soft top-right peach glow.
        const tBg = ((x - 15.36) * 97.28 + (y - 7.68) * 115.2) / (97.28 * 97.28 + 115.2 * 115.2);
        let col = lerp(BG_A, BG_B, tBg);
        const gd = Math.hypot(x - 104.96, y - 23.04) / 74.24;
        if (gd < 1) col = blend(col, GLOW, 0.28 * (1 - gd));

        // Back card (top-right) punched out by front card + 6px cutout gap.
        const inCut = sdRect(x, y, 16, 38, 74, 74, 22) <= 0;
        if (!inCut && sdRect(x, y, 44, 22, 62, 62, 17) <= 0) {
          const tBack = ((x - 44) + (y - 22)) / 124;
          col = lerp(BACK_A, BACK_B, tBack);
        }

        // Front card (bottom-left) + 3 subtitle pills.
        if (sdRect(x, y, 22, 44, 62, 62, 17) <= 0) {
          col = CARD;
          const ph = 9.5 + pillPad * 2, pr = ph / 2;
          if (sdRect(x, y, 33, 64 - pillPad, 21, ph, pr) <= 0) col = INK;
          else if (sdRect(x, y, 57.5, 64 - pillPad, 15.5, ph, pr) <= 0) col = ORANGE;
          else if (sdRect(x, y, 33, 78 - pillPad, 31, ph, pr) <= 0) col = LILAC;
        }

        r += col[0]; g += col[1]; b += col[2]; a++;
      }
      const o = j * (size * 4 + 1) + 1 + i * 4;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round(255 * a / (SS * SS));
    }
  }

  const crcT = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = buf => { let c = ~0; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
  const chunk = (t, d) => {
    const b = Buffer.concat([Buffer.from(t), d]), o = Buffer.alloc(4);
    o.writeUInt32BE(d.length);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(b));
    return Buffer.concat([o, b, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

fs.mkdirSync(OUT, { recursive: true });
for (const s of [16, 32, 48, 128, 512]) fs.writeFileSync(`${OUT}/icon-${s}.png`, png(s));
console.log('Generated icons in', OUT);
