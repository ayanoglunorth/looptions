// Runs in every frame: finds <video> and its text tracks, hears from main-world.js, picks two tracks, drives the overlay.
(() => {
  const DS = globalThis.DS;
  const token = Math.random().toString(36).slice(2, 8); // keeps texttrack ids unique across frames
  const local = new Map();      // id -> TextTrack living in this frame
  const localText = new Map();  // url -> subtitle body already seen by main-world.js
  const sent = new Set();       // track ids already reported to background
  const sources = new Map();    // id -> () => cues[]
  const pagePending = new Map();
  const failed = new Set();     // track ids whose last load failed; skipped so a fallback can show
  const relabel = new Map();    // track id -> real language, when the downloaded text disagrees with the track's label
  const textCache = new Map();  // url -> Promise<text>; survives resets so nothing is downloaded twice
  const RETRY_MS = [15000, 60000, 180000];
  const watched = new WeakSet();
  const DEFAULT_PREFS = DS.DEFAULT_PREFS;
  let data = { tracks: [], sel: {} };
  let allTracks = [];
  let prefs = DEFAULT_PREFS;
  // Site switches (Siteler tab) are keyed by the top page's host, also inside an iframe player.
  const host = DS.siteHost(location.ancestorOrigins?.length ? location.ancestorOrigins[location.ancestorOrigins.length - 1] : location.href);
  const siteOn = key => DS.siteOn(prefs, host, key);
  const on = () => prefs.enabled && siteOn('ext');
  let overlay = null;
  let myFrame = -1;
  let reqId = 0;

  const send = msg => chrome.runtime.sendMessage(msg).catch(() => null);
  const toPage = msg => document.dispatchEvent(new CustomEvent('looptions:to-page', { detail: JSON.stringify(msg) }));
  const fileName = url => { try { return decodeURIComponent(url.split(/[?#]/)[0].split('/').pop()); } catch { return url; } };
  const langCode = (...hints) => {
    for (const h of hints) {
      const code = String(h || '').toLowerCase().split(/[-_]/)[0];
      const n = DS.normLang(h) || (/^[a-z]{2}$/.test(code) ? code : '');
      if (n) return n;
    }
    return '';
  };

  function report(tracks) {
    const fresh = tracks.filter(t => !sent.has(t.id));
    fresh.forEach(t => sent.add(t.id));
    if (fresh.length) send({ type: 'add', tracks: fresh });
  }

  function scan() {
    const found = [];
    for (const v of document.querySelectorAll('video')) {
      if (!watched.has(v)) {
        watched.add(v);
        v.textTracks.addEventListener('addtrack', () => { scan(); apply(); });
      }
      const owned = new Set();
      for (const el of v.querySelectorAll('track[src]')) {
        owned.add(el.track);
        found.push({ id: el.src, url: el.src, source: 'track', lang: langCode(el.srclang, el.label, el.src), label: el.label || el.srclang || fileName(el.src) });
      }
      for (const t of v.textTracks) {
        if (owned.has(t) || !/subtitles|captions/.test(t.kind)) continue;
        let id = [...local].find(([, x]) => x === t)?.[0];
        if (!id) local.set((id = `tt:${token}:${local.size}`), t);
        found.push({ id, source: 'texttrack', lang: langCode(t.language, t.label), label: t.label || t.language || 'Track' });
      }
    }
    report(found);
  }

  // ---- messages from main-world.js ----

  document.addEventListener('looptions:to-ext', e => {
    let m; try { m = JSON.parse(e.detail); } catch { return; }
    if (m.kind === 'reset') { sent.clear(); sources.clear(); localText.clear(); failed.clear(); send({ type: 'reset' }); }
    if (m.kind === 'subtitle') {
      localText.set(m.url, m.text);
      report([{ id: m.url, url: m.url, source: 'network', lang: langCode(m.url) || DS.guessLang(m.text), label: fileName(m.url) }]);
    }
    if (m.kind === 'tracks') {
      // The page can forge this event, so only known fields pass (never `format`, which would make background fetch it as an HLS playlist).
      if (!Array.isArray(m.tracks)) return;
      report(m.tracks.filter(t => t && typeof t.url === 'string').map(t => ({
        id: String(t.id || t.url), url: t.url, source: String(t.source || 'network'), ...(t.fetchIn === 'page' && { fetchIn: 'page' }),
        lang: langCode(t.lang, t.label, t.url), label: String(t.label || fileName(t.url)),
      })));
    }
    if (m.kind === 'fetched') { pagePending.get(m.id)?.(m); pagePending.delete(m.id); }
  });

  // Fetch from the page itself: carries its cookies and Referer, but is bound by CORS.
  const pageFetch = url => new Promise(resolve => {
    const id = ++reqId;
    pagePending.set(id, resolve);
    toPage({ kind: 'fetch', id, url });
    setTimeout(() => pagePending.delete(id) && resolve({ error: 'timeout' }), 20000);
  });

  function loadText(track) {
    if (localText.has(track.url)) return Promise.resolve(localText.get(track.url));
    if (!textCache.has(track.url)) {
      const p = fetchText(track);
      p.catch(() => textCache.delete(track.url));
      textCache.set(track.url, p);
    }
    return textCache.get(track.url);
  }

  async function fetchText(track) {
    if (track.fetchIn !== 'page') {
      const r = await send({ type: 'fetch', url: track.url, format: track.format });
      if (r?.text) return r.text;
      if (track.format === 'hls') throw new Error(r?.error || 'hls fetch failed');
    }
    const r = await pageFetch(track.url);
    if (r.text != null) return r.text;
    throw new Error(r.error);
  }

  // ---- word translation: our translation server via background.js (only clicked words are sent) ----

  const translateText = (text, from, to) => send({ type: 'lookup', word: text, from, to })
    .then(r => { if (!r?.text) throw new Error(r?.error || 'Çeviri yok'); return r.text; });

  // Click-to-translate: only the clicked word is sent, never the whole track.
  const wordCache = new Map();
  function lookupWord(word, role, lines) {
    const pair = DS.lookupPair(role, lines, prefs);
    if (!pair) return Promise.reject(new Error('no language pair'));
    const k = `${pair.from}>${pair.to}:${word.toLowerCase()}`;
    if (!wordCache.has(k)) {
      const p = translateText(word, pair.from, pair.to);
      p.catch(() => wordCache.delete(k));
      wordCache.set(k, p);
    }
    return wordCache.get(k);
  }

  // Saved words live in chrome.storage.local ('words', newest first); the same word+pair is kept once.
  async function saveWord({ word, translation, role, context }, lines) {
    const pair = DS.lookupPair(role, lines, prefs);
    if (!pair) return;
    await storeWord({ word, translation, from: pair.from, to: pair.to, context });
  }

  // Written by background.js, which queues writes so concurrent frames cannot overwrite each other.
  async function storeWord(w) {
    const r = await send({ type: 'addWord', w });
    if (!r?.ok) throw new Error(r?.error || 'save failed');
  }

  // ---- pre-video quiz: English learners with a Turkish native language only ----

  const QUIZ_MAX_START_S = 60; // a subtitle that arrives later than this finds the viewer already watching: no quiz
  const quizDone = new Set();  // subtitle ids already handled; the card shows once per subtitle file
  let primaryTrack = null;
  const QUIZ_LOAD_TIMEOUT_MS = 15000; // the video is held paused while the quiz loads; never longer than this
  const QUIZ_SETTLE_MS = 1500; // a text track's cue list must stay the same this long before the quiz reads it
  const settle = { id: null, len: 0, at: 0 };
  let quizBusy = false, loadSince = 0;
  const quizOn = () => on() && siteOn('quiz') && prefs.preQuiz !== false && DS.quizPair(prefs);

  // Called every frame by the overlay. True while the quiz is still being prepared (the loading pill shows and the video is held);
  // starts the quiz the moment the English cues are in.
  function quizTick() {
    const p = primaryTrack;
    if (!quizOn() || !p || p.lang !== 'en') return loadSince = 0, false;
    if (quizBusy) return true; // the card is about to open
    if (quizDone.has(p.id)) return loadSince = 0, false;
    const video = pickVideo();
    const cues = getSource(p)?.();
    if (!video || !cues || video.currentTime > QUIZ_MAX_START_S) return loadSince = 0, false;
    // Hover previews (muted, thumbnail-sized) must not use up the quiz: the same subtitle id comes back on the real player.
    // Not marked done, so unmuting within the first minute still brings the quiz.
    // shortcut: muted/size is a guess at "preview"; a viewer who starts a video muted gets the quiz only after unmuting.
    if (video.muted || video.getBoundingClientRect().width < 400) return loadSince = 0, false;
    loadSince ||= Date.now();
    if (cues.length) {
      // A page-fed text track gets its cues piece by piece; wait until the list stops growing so the quiz sees the whole film.
      if (settle.id !== p.id || settle.len !== cues.length) Object.assign(settle, { id: p.id, len: cues.length, at: Date.now() });
      const settled = p.source !== 'texttrack' || Date.now() - settle.at > QUIZ_SETTLE_MS;
      if (settled || Date.now() - loadSince > QUIZ_LOAD_TIMEOUT_MS) startQuiz(p, video, cues);
      return true;
    }
    if (Date.now() - loadSince > QUIZ_LOAD_TIMEOUT_MS) { quizDone.add(p.id); loadSince = 0; return false; }
    return true;
  }
  function quizCancel() { if (primaryTrack) quizDone.add(primaryTrack.id); loadSince = 0; }

  async function startQuiz(track, video, cues) {
    quizDone.add(track.id);
    quizBusy = true;
    try {
      const { vocab = {} } = await chrome.storage.local.get('vocab');
      const words = DS.pickQuizWords(cues.map(c => c.text), Math.max(0, DS.LEVELS.indexOf(prefs.level)), vocab, DS.quizSize(prefs));
      if (words.length < DS.QUIZ_MIN || video.currentTime > QUIZ_MAX_START_S) return;
      // Meanings are fetched three at a time; the one the viewer is waiting for (urgent) goes first.
      const meanings = DS.limitedFetcher(w => translateText(w, 'en', 'tr'), 3);
      overlay?.showQuiz({
        words, translate: (w, urgent) => meanings.get(w, urgent), onDone: saveVocab,
        onSave: ({ word, translation }) => storeWord({ word, translation, from: 'en', to: 'tr', context: '' }),
      });
    } finally { quizBusy = false; }
  }

  // 'k' = knew it, 'l' = learning; either way the word is not asked again.
  async function saveVocab(answers) {
    if (!answers.length) return;
    await send({ type: 'addVocab', answers });
  }

  // ---- cue sources ----

  function getSource(track) {
    if (!track) return null;
    if (sources.has(track.id)) return sources.get(track.id);
    let fn = null;
    if (track.source === 'texttrack') {
      const t = local.get(track.id);
      if (!t) return null; // lives in another frame
      if (t.mode === 'disabled') t.mode = 'hidden'; // hidden still loads cues but does not paint them
      let n = -1, arr = [];
      fn = () => {
        if (t.cues && t.cues.length !== n) {
          n = t.cues.length;
          arr = [...t.cues].map(c => ({ start: c.startTime, end: c.endTime, text: DS.cleanText((c.text || '').replace(/<[^>]+>/g, '')) }))
            .sort((a, b) => a.start - b.start);
        }
        return arr;
      };
    } else {
      if (track.fetchIn === 'page' && track.frameId !== myFrame) return null; // only its own page can fetch it
      let arr = [], tries = 0;
      // On failure (e.g. YouTube's HTTP 429 on translations) show a fallback and retry slowly; never hammer the host.
      const load = () => loadText(track).then(
        text => {
          arr = DS.parseAny(text);
          const real = DS.checkLang(text, track.lang);
          if (real !== track.lang) { relabel.set(track.id, real); failed.delete(track.id); apply(); } // mislabelled: pick again by its real language
          else if (failed.delete(track.id)) apply();
        },
        e => {
          console.warn('[looptions] fetch failed', track.url, String(e));
          if (!failed.has(track.id)) { failed.add(track.id); apply(); }
          if (tries < RETRY_MS.length) setTimeout(load, RETRY_MS[tries++]);
        },
      );
      load();
      fn = () => arr;
    }
    sources.set(track.id, fn);
    return fn;
  }

  function pickVideo() {
    let best = null, area = 0;
    for (const v of document.querySelectorAll('video')) {
      const r = v.getBoundingClientRect();
      if (r.width * r.height > area) { area = r.width * r.height; best = v; }
    }
    return area >= 200 * 100 ? best : null;
  }

  const hiddenNative = new Set(); // native tracks we hid, shown again when the extension is switched off
  function hideNative(video) {
    for (const t of video.textTracks) if (t.mode === 'showing') { t.mode = 'hidden'; hiddenNative.add(t); }
    if (document.getElementById('looptions-hide')) return;
    const s = document.createElement('style');
    s.id = 'looptions-hide';
    s.textContent = '.jw-captions,.vjs-text-track-display,.plyr__captions,.art-subtitle,' +
      '.ytp-caption-window-container,.player-timedtext{display:none!important}';
    (document.head || document.documentElement).appendChild(s);
  }

  function apply() {
    const { sel } = data;
    // Tracks found by this frame first: on a page with several players each one shows its own subtitles.
    const mine = t => t.frameId === myFrame ? 0 : 1;
    const usable = data.tracks.filter(t => !failed.has(t.id)).map(t => relabel.has(t.id) ? { ...t, lang: relabel.get(t.id) } : t);
    allTracks = usable.sort((a, b) => mine(a) - mine(b));
    const [p, s] = DS.pickTracks(allTracks, sel, prefs);
    primaryTrack = p;
    const video = on() && pickVideo(); // off: no video, so nothing is fetched or translated
    // The menu switch turns Looptions off for this video only; another video (or another src) starts on again.
    if (offVideo && (video !== offVideo || videoKey(video) !== offKey)) offVideo = null;
    // A video spoken in the viewer's own language starts off, unless they switched it on themselves.
    if (video && !offVideo && userOnKey !== videoKey(video) && DS.spokenNative(allTracks, prefs)) { offVideo = video; offKey = videoKey(video); }
    const off = !!offVideo;
    const lines = !video || off ? [] : [
      { getCues: getSource(s), offset: sel.offsetSecondary || 0, role: 'secondary', lang: s?.lang },
      { getCues: getSource(p), offset: sel.offsetPrimary || 0, role: 'primary', lang: p?.lang },
    ].filter(l => l.getCues);
    if (off) {
      hiddenNative.forEach(t => { t.mode = 'showing'; }); hiddenNative.clear();
      document.getElementById('looptions-hide')?.remove();
    }
    if (!video || (!off && !lines.length)) {
      overlay?.destroy(); overlay = null; document.getElementById('looptions-hide')?.remove();
      if (!on()) { hiddenNative.forEach(t => { t.mode = 'showing'; }); hiddenNative.clear(); }
      return;
    }
    if (!off) hideNative(video);
    noteSeen();
    const notice = missingNotice(video, off, p, s);
    (overlay ||= DS.createOverlay()).set({
      video, lines, size: prefs.size, mode: prefs.mode, align: prefs.align, font: prefs.font, look: DS.lookVars(prefs),
      logo: prefs.logo, prefs: { ...prefs, enabled: !off }, sel, onPrefs: p => 'enabled' in p ? setVideoOff(!p.enabled, video) : setPrefs(p), onSel: patch => send({ type: 'setSel', sel: { ...data.sel, ...patch } }),
      onWord: (w, role) => lookupWord(w, role, lines), onSave: info => saveWord(info, lines),
      quizTick: quizOn() && !off ? quizTick : undefined, quizCancel, notice,
    });
  }

  // "No subtitles in the second language": shown once per video, after the track list has had time to fill. We never translate whole subtitles.
  const NOTICE_DELAY_MS = 4000;
  let missingKey = '', noticeKey = '', noticeTimer = 0;
  function missingNotice(video, off, p, s) {
    const key = video && !off && p && !s && data.sel.secondaryId !== 'none' ? videoKey(video) : '';
    missingKey = key;
    if (!key) noticeKey = '';
    else if (noticeKey !== key && !noticeTimer) {
      noticeTimer = setTimeout(() => { noticeTimer = 0; if (missingKey === key) { noticeKey = key; apply(); } }, NOTICE_DELAY_MS);
    }
    if (noticeKey !== key || !key) return null;
    let name = prefs.secondary;
    try { name = new Intl.DisplayNames([DS.uiLang(prefs)], { type: 'language' }).of(prefs.secondary); } catch {}
    return { id: key, text: DS.t('Bu videoda {0} altyazı yok', DS.uiLang(prefs), name) };
  }

  // Sites where Looptions showed subtitles, kept only in chrome.storage.local so the settings page can list them (never sent anywhere).
  let seenNoted = false;
  function noteSeen() {
    if (seenNoted || !host) return;
    seenNoted = true;
    chrome.storage.local.get('seenSites').then(({ seenSites = {} }) => {
      seenSites[host] = Date.now();
      const keep = Object.entries(seenSites).sort((a, b) => b[1] - a[1]).slice(0, 50);
      return chrome.storage.local.set({ seenSites: Object.fromEntries(keep) });
    }).catch(() => {});
  }

  let offVideo = null, offKey = '', userOnKey = '';
  const videoKey = v => v.currentSrc || v.src;
  function setVideoOff(off, video) {
    offVideo = off ? video : null;
    offKey = off ? videoKey(video) : '';
    userOnKey = off ? '' : videoKey(video);
    apply();
  }
  document.addEventListener('loadstart', () => offVideo && apply(), true); // same <video> element, new source

  // Menu edits show at once; the write to storage is debounced (sync quota) and our own echo is ignored meanwhile.
  let editing = false, saveTimer = 0;
  function setPrefs(patch) {
    prefs = { ...prefs, ...patch };
    editing = true;
    apply();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => chrome.storage.sync.set({ prefs }).finally(() => { editing = false; }), 200);
  }

  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (msg.type === 'update') { data = { tracks: msg.tracks, sel: msg.sel }; apply(); }
    if (msg.type === 'toggle') overlay?.toggle();
    if (msg.type === 'act') isVideoAct(msg.act) ? videoAct(msg.act) : overlay?.act(msg.act);
  });
  const isVideoAct = act => DS.PLAY_KEYS.some(k => k.act === act && k.plain);
  // Speed / seek on this frame's main video, with or without subtitles. False when the frame has no video, so the key is relayed to other frames.
  function videoAct(act) {
    const video = pickVideo();
    if (!video) return false;
    const secs = Math.max(0.1, +prefs.seekSecs || 5);
    const r = DS.videoAct(act, video, secs, +prefs.speedStep || 0.25);
    if (r.rate != null) video.playbackRate = r.rate; else video.currentTime = r.time;
    // The icon says which act it was; the tag shows only the amount.
    if (r.rate != null) overlay?.flash(`${String(r.rate).replace('.', ',')}×`, act);
    else overlay?.flash(`${String(secs).replace('.', ',')} ${DS.t('sn', DS.uiLang(prefs))}`, act);
    return true;
  }
  // Whichever frame has focus hears the key; background relays it so the frame holding the overlay toggles.
  // Capture phase on window: runs before players that stop key events from bubbling.
  // Players treat any key activity like a mouse move and reveal their controls, so the shortcut's lone modifier
  // presses, its held-key repeats and its key releases must not reach the page either.
  const MODS = { Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Meta: 'Meta' };
  let swallowUps = false; // set by a handled shortcut, cleared once every modifier is released
  const ourMod = e => MODS[e.key] && !DS.typing(e)
    && [prefs.toggleKey, ...DS.PLAY_KEYS.map(k => prefs[k.pref])].some(c => c?.split('+').includes(MODS[e.key]));
  addEventListener('keydown', e => {
    if (!on()) return;
    if (ourMod(e)) return e.stopPropagation();
    const combo = DS.keyFromEvent(e);
    if (!combo) return;
    const typing = DS.typing(e); // bare-key shortcuts must never fire while the user is typing
    const play = combo === prefs.toggleKey ? null : DS.PLAY_KEYS.find(k => prefs[k.pref] === combo && (k.plain ? !typing : (e.ctrlKey || e.altKey || e.metaKey)));
    if (combo !== prefs.toggleKey && !play) return;
    e.preventDefault();
    e.stopPropagation();
    swallowUps = true;
    if (e.repeat) return;
    if (play?.plain && videoAct(play.act)) return;
    send(play ? { type: 'act', act: play.act } : { type: 'toggle' });
  }, true);
  addEventListener('keyup', e => {
    if (!on() || !(swallowUps || ourMod(e))) return;
    e.stopPropagation();
    if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) swallowUps = false;
  }, true);

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'sync' && ch.prefs && !editing) {
      prefs = DS.mergePrefs(ch.prefs.newValue);
      toPage({ kind: 'prefs', langs: [prefs.primary, prefs.secondary] });
      apply();
    }
  });

  let timer = 0;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => { scan(); apply(); }, 500);
  }).observe(document.documentElement, { childList: true, subtree: true });

  (async () => {
    prefs = DS.mergePrefs((await chrome.storage.sync.get('prefs')).prefs);
    const hello = await send({ type: 'hello' });
    if (hello) { myFrame = hello.frameId; data = { tracks: hello.tracks, sel: hello.sel }; }
    toPage({ kind: 'prefs', langs: [prefs.primary, prefs.secondary] });
    toPage({ kind: 'hello' }); // main-world.js replays what it saw before this script loaded
    scan();
    apply();
  })();
})();
