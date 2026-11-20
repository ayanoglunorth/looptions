// Store screenshots of the real UI (overlay, popup, settings) with a stubbed chrome API. Run: node serve.js &  then  node shoot.js <outDir> overlay:tr tip:en ...  (set = tr or en). Needs Chrome; no dependencies.
const { spawn } = require('child_process'), fs = require('fs'), path = require('path');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe', PORT = 9333, BASE = 'http://localhost:5188';
const out = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TITLES = {
  en: { overlay: 'Two languages, one screen', tip: 'Click a word, see it', words: 'Save words as you watch', practice: 'Words come back when it is time', popup: 'Your subtitles, your way' },
  tr: { overlay: 'İki dil, tek ekran', tip: 'Kelimeye tıkla, gör', words: 'İzlerken kelime biriktir', practice: 'Kelime zamanı gelince döner', popup: 'Altyazı senin tarzında' },
};
const frame = (src, set, key, w, h, sc, extra = '') => `${BASE}/h/frame.html?src=${encodeURIComponent(src)}&set=${set}&w=${w}&h=${h}&sc=${sc}&title=${encodeURIComponent(TITLES[set][key])}${extra}`;
const SHOTS = set => ({
  overlay: { url: `${BASE}/h/overlay.html?set=${set}&title=${encodeURIComponent(TITLES[set].overlay)}` },
  tip: { url: `${BASE}/h/overlay.html?set=${set}&title=${encodeURIComponent(TITLES[set].tip)}`, click: set === 'en' ? [770, 624] : [694, 624], wait: 900 },
  words: { url: frame('/pages/options.html', set, 'words', 1280, 740, 0.86, '&x=90&y=150') },
  practice: { url: frame('/pages/options.html', set, 'practice', 1280, 640, 0.86, '&x=90&y=150'), inner: "document.getElementById('practiceBtn').click()", wait: 700 },
  tile: { url: `${BASE}/h/tile.html`, vp: [440, 280] },
  popup: { url: frame('/popup/popup.html', set, 'popup', 380, 700, 1, '&x=790&y=40&tw=620'), },
});

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + path.join(process.env.TEMP, 'shoot-profile'), '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 40; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json(); ws = new WebSocket(t.webSocketDebuggerUrl); break; } catch { await sleep(250); } }
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  for (const arg of process.argv.slice(3)) {
    const [name, set] = arg.split(':'); const s = SHOTS(set)[name];
    await send('Emulation.setDeviceMetricsOverride', { width: (s.vp || [1280, 800])[0], height: (s.vp || [1280, 800])[1], deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: s.url }); await sleep(2800);
    if (s.inner) { await send('Runtime.evaluate', { expression: `document.querySelector('iframe').contentDocument.defaultView.eval(${JSON.stringify(s.inner)})` }); }
    if (s.click) for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: s.click[0], y: s.click[1], button: 'left', clickCount: 1 });
    await sleep(s.wait || 400);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, `${name}-${set}.png`), Buffer.from(r.result.data, 'base64'));
    console.log('saved', name, set);
  }
  ws.close(); proc.kill();
})();
