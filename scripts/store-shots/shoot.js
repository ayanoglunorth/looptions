// Captures all unified dark English Chrome Web Store assets:
// - Final Promo Tile (440x280)
// - Marquee v2 Banner (1400x560)
// - All 8 unified screenshots (1280x800) using all 5 user scenes + real Looptions UI
// Run: node scripts/store-shots/shoot.js [outDir] [optional filter...]
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), http = require('http');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9336, HTTP_PORT = 5191;
const here = __dirname, root = path.join(here, '..', '..');
const out = process.argv[2] || path.join(root, 'docs', 'store', 'screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const mock = fs.readFileSync(path.join(here, 'mock.js'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

const startServer = () => new Promise(resolve => {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/__mock.js') { res.setHeader('content-type', 'text/javascript'); return res.end(mock); }
    const f = u.startsWith('/h/') ? path.join(here, u) : path.join(root, u);
    fs.readFile(f, (e, b) => {
      if (e) { res.statusCode = 404; return res.end('nf'); }
      res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
      if (u.endsWith('.html')) b = Buffer.from(b.toString().replace(/<script src="[^"]*src\/core\/lang\.js">/, m => '<script src="/__mock.js"></script>' + m));
      res.end(b);
    });
  });
  srv.listen(HTTP_PORT, '127.0.0.1', () => resolve(srv));
});

const BASE = `http://127.0.0.1:${HTTP_PORT}`;
const HIDE_DOCK = `(() => { const d = document.getElementById('f')?.contentDocument; const nav = d?.querySelector('nav'); if (nav) nav.style.display = 'none'; })()`;
const OPEN_PRACTICE = `(() => { const d = document.getElementById('f')?.contentDocument; const nav = d?.querySelector('nav'); if (nav) nav.style.display = 'none'; d?.getElementById('practiceBtn')?.click(); })()`;

const SHOTS = [
  { file: 'promo-tile-440x280.png', url: `${BASE}/h/tile.html`, vp: [440, 280], wait: 400 },
  {
    file: 'marquee-v2-1400x560.png',
    url: `${BASE}/h/marquee-v2.html?set=en`,
    vp: [1400, 560],
    // Click "reacio" on the white top Spanish line inside marquee-v2's real overlay
    click: [1098, 392],
    wait: 700,
  },
  { file: '01-overlay-en.png', url: `${BASE}/h/shot-01-overlay.html?set=en`, vp: [1280, 800], wait: 500 },
  {
    file: '02-tip-en.png',
    url: `${BASE}/h/shot-02-tip.html?set=en`,
    vp: [1280, 800],
    // Click "reacio" on the white top Spanish line (stage top:214, h:465, lift:7%, size:122)
    click: [754, 558],
    wait: 700,
  },
  { file: '03-swap-en.png', url: `${BASE}/h/shot-03-swap.html?set=en`, vp: [1280, 800], wait: 500 },
  { file: '04-quiz-en.png', url: `${BASE}/h/shot-04-quiz.html?set=en`, vp: [1280, 800], wait: 500 },
  { file: '05-prep-en.png', url: `${BASE}/h/shot-05-prep.html?set=en`, vp: [1280, 800], wait: 500 },
  { file: '06-words-en.png', url: `${BASE}/h/shot-06-words.html?set=en`, vp: [1280, 800], eval: HIDE_DOCK, wait: 600 },
  { file: '07-practice-en.png', url: `${BASE}/h/shot-07-practice.html?set=en`, vp: [1280, 800], eval: OPEN_PRACTICE, wait: 700 },
  { file: '08-popup-en.png', url: `${BASE}/h/shot-08-popup.html?set=en`, vp: [1280, 800], wait: 600 },
];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const srv = await startServer();
  const proc = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=' + path.join(process.env.TEMP, 'shoot-profile-v4'),
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    'about:blank'
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 40; i++) {
    try {
      const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
      ws = new WebSocket(t.webSocketDebuggerUrl);
      break;
    } catch { await sleep(250); }
  }
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');

  const clickAt = async (x, y) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  };

  const filter = process.argv.slice(3);
  const list = filter.length ? SHOTS.filter(s => filter.some(f => s.file.includes(f))) : SHOTS;
  for (const s of list) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.vp[0], height: s.vp[1], deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: s.url });
    await sleep(1600);
    if (s.eval) await send('Runtime.evaluate', { expression: s.eval });
    if (s.click) await clickAt(s.click[0], s.click[1]);
    await sleep(s.wait || 500);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const dest = path.join(out, s.file);
    const buf = Buffer.from(r.result.data, 'base64');
    for (let attempt = 0; attempt < 5; attempt++) {
      try { fs.writeFileSync(dest, buf); break; }
      catch (err) { if (attempt === 4) throw err; await sleep(300); }
    }
    console.log('saved', s.file);
  }

  ws.close();
  proc.kill();
  srv.close();
})();
