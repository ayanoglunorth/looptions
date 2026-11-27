// Hub: per-tab track registry, subtitle/HLS request sniffing, CORS-free fetching, translation relay.
importScripts('core/parse.js', 'core/lang.js', 'core/hls.js');

const SUB_RE = /\.(vtt|webvtt|srt)(?:[?#]|$)/i;
const key = tabId => 't' + tabId;
const textCache = new Map(); // url -> Promise<text>, avoids fetching a file twice (lang guess, then render)
const MAX_SUB_BYTES = 8e6; // a feature film's subtitles are well under 1 MB; anything bigger is not one
const MAX_HLS_SEGMENTS = 3000;
const seenPlaylists = new Set();
let chain = Promise.resolve(); // serializes read-modify-write on storage.session

async function getTab(tabId) {
  const k = key(tabId);
  return (await chrome.storage.session.get(k))[k] || { tracks: [], sel: {} };
}

function updateTab(tabId, fn) {
  return (chain = chain.then(async () => {
    const d = await getTab(tabId);
    if (fn(d) === false) return d; // no change, no broadcast
    await chrome.storage.session.set({ [key(tabId)]: d });
    chrome.tabs.sendMessage(tabId, { type: 'update', ...d }).catch(() => {});
    return d;
  }).catch(e => console.error(e)));
}

function addTracks(tabId, frameId, tracks) {
  return updateTab(tabId, d => {
    let changed = false;
    for (const t of tracks) {
      const i = d.tracks.findIndex(x => x.id === t.id);
      const cur = d.tracks[i];
      if (i < 0) d.tracks.push({ ...t, frameId });
      // a player/<track> source carries better lang/label info than a sniffed URL, so it replaces it
      else if (t.source !== 'network' && cur.source === 'network') d.tracks[i] = { ...t, frameId };
      else if (!cur.lang && t.lang) cur.lang = t.lang;
      else continue;
      changed = true;
    }
    return changed;
  });
}

const fileName = url => { try { return decodeURIComponent(url.split(/[?#]/)[0].split('/').pop()); } catch { return url; } };

chrome.webRequest.onCompleted.addListener(
  async ({ url, tabId, frameId, statusCode }) => {
    if (tabId < 0 || statusCode >= 400) return;
    if (SUB_RE.test(url)) {
      let lang = DS.normLang(url);
      if (!lang) lang = await fetchText(url).then(DS.guessLang, () => '');
      addTracks(tabId, frameId, [{ id: url, url, lang, label: fileName(url), source: 'network' }]);
    } else if (/\.m3u8(?:[?#]|$)/i.test(url) && !seenPlaylists.has(url)) {
      // Only master playlists list subtitle renditions; each playlist URL is checked once.
      seenPlaylists.add(url);
      if (seenPlaylists.size > 500) seenPlaylists.clear();
      const text = await fetch(url).then(r => r.text(), () => '');
      const subs = DS.parseMasterPlaylist(text, url);
      if (subs.length) {
        addTracks(tabId, frameId, subs.map(s => ({
          id: s.url, url: s.url, format: 'hls', source: 'hls',
          lang: DS.normLang(s.lang) || DS.normLang(s.label), label: s.label,
        })));
      }
    }
  },
  { urls: ['*://*/*.vtt*', '*://*/*.webvtt*', '*://*/*.srt*', '*://*/*.m3u8*'] }
);

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('pages/welcome.html') });
});

// Runs fn after everything queued before it; a failure reaches the caller but does not stall the queue.
function serial(fn) {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}

// Word book and quiz vocabulary are written here, not in content scripts: every frame and tab would otherwise race on the same array.
const addWord = w => serial(async () => {
  const { words = [] } = await chrome.storage.local.get('words');
  if (words.some(x => x.word.toLowerCase() === w.word.toLowerCase() && x.from === w.from && x.to === w.to)) return;
  words.unshift({ word: w.word, translation: w.translation, from: w.from, to: w.to, context: w.context, at: Date.now() });
  await chrome.storage.local.set({ words });
});
const addVocab = answers => serial(async () => {
  const { vocab = {} } = await chrome.storage.local.get('vocab');
  for (const a of answers) vocab[a.word] = a.known ? 'k' : 'l';
  await chrome.storage.local.set({ vocab });
});
const ok = p => p.then(() => ({ ok: true }), e => ({ error: String(e.message || e) }));

const forget = tabId => { chain = chain.then(() => chrome.storage.session.remove(key(tabId))); };
chrome.webRequest.onBeforeRequest.addListener(({ tabId }) => forget(tabId), { urls: ['<all_urls>'], types: ['main_frame'] });
chrome.tabs.onRemoved.addListener(forget);


function fetchText(url) {
  if (!textCache.has(url)) {
    if (textCache.size > 50) textCache.clear();
    // No page Referer/cookies here; content.js falls back to an in-page fetch when this fails.
    // The URL can come from a page (forged track), so: http(s) only, bounded time and size.
    textCache.set(url, (/^https?:\/\//i.test(url) ? fetch(url, { signal: AbortSignal.timeout(20000) }) : Promise.reject(new Error('bad url'))).then(async r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (+r.headers.get('content-length') > MAX_SUB_BYTES) throw new Error('too large');
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX_SUB_BYTES) throw new Error('too large');
      return DS.decodeSubtitle(buf);
    }));
    textCache.get(url).catch(() => textCache.delete(url));
  }
  return textCache.get(url);
}

async function fetchHls(url) {
  const playlist = await fetchText(url);
  // shortcut: a live playlist only yields the segments listed right now; fine for VOD films and series.
  const segs = DS.parseMediaPlaylist(playlist, url).slice(0, MAX_HLS_SEGMENTS);
  const texts = new Array(segs.length);
  let next = 0;
  const worker = async () => { while (next < segs.length) { const i = next++; texts[i] = await fetchText(segs[i]).catch(() => ''); } };
  await Promise.all(Array.from({ length: 6 }, worker));
  segs.forEach(u => textCache.delete(u));
  return DS.cuesToVtt(DS.mergeHlsSegments(texts));
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const tabId = msg.tabId ?? sender.tab?.id;
  const run = {
    hello: () => getTab(tabId).then(d => ({ ...d, frameId: sender.frameId })),
    add: () => addTracks(tabId, sender.frameId, msg.tracks),
    setSel: () => updateTab(tabId, d => { d.sel = msg.sel; }),
    // The shortcut is caught by whichever frame has focus; every frame hears it, so the one with the overlay toggles.
    toggle: () => chrome.tabs.sendMessage(tabId, { type: 'toggle' }).catch(() => {}),
    act: () => chrome.tabs.sendMessage(tabId, { type: 'act', act: msg.act }).catch(() => {}),
    reset: () => updateTab(tabId, d => { d.tracks = []; d.sel = {}; }),
    fetch: () => (msg.format === 'hls' ? fetchHls(msg.url) : fetchText(msg.url)).then(text => ({ text }), e => ({ error: String(e) })),
    addWord: () => ok(addWord(msg.w)),
    addVocab: () => ok(addVocab(msg.answers)),
    // A clicked word or a quiz word. Done here because host_permissions skip CORS.
    lookup: () => lookupWord(msg.word, msg.from, msg.to).then(text => ({ text }), e => ({ error: String(e.message || e) })),
  }[msg.type];
  if (!run) return;
  run().then(reply);
  return true; // async reply
});

// Word translation goes to our Cloudflare Worker (worker/src/index.js), which holds the Microsoft Translator key.
// Only {text, from, to} is sent: no page address, video name or user id.
const LOOKUP_URL = 'https://looptions-lookup.WORKER_SUBDOMAIN.workers.dev';

async function lookupWord(word, from, to) {
  let r;
  try {
    r = await fetch(LOOKUP_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: word, from, to }), signal: AbortSignal.timeout(8000),
    });
  } catch { throw new Error('Çeviri şu an kullanılamıyor'); }
  if (r.status === 404) throw new Error('Çeviri yok');
  if (!r.ok) throw new Error(r.status === 429 ? 'Bu ayki çeviri kotası doldu' : 'Çeviri şu an kullanılamıyor');
  const out = String((await r.json()).text || '').trim();
  if (!out) throw new Error('Çeviri yok');
  return out;
}
