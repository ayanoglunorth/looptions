// Runs in the page's own JS world (MAIN) at document_start.
// Sees what isolated content scripts cannot: player objects (jwplayer, videojs, Playerjs), fetch/XHR bodies,
// YouTube's player response and Netflix's manifest. Talks to content.js through DOM CustomEvents.
(() => {
  const SUB_URL = /\.(vtt|webvtt|srt)(?:[?#]|$)|sub(title)?s?|caption|altyazi|timedtext/i;
  const SUB_TYPE = /vtt|subrip|ttml|text\/plain|octet-stream/i;
  const NF_FORMATS = ['webvtt-lssdh-ios8', 'imsc1.1', 'dfxp-ls-sdh', 'simplesdh'];

  // ---- pure helpers (unit tested in node) ----

  const looksLikeSubtitle = text => /^﻿?\s*(WEBVTT|\d+\s*\r?\n\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->)/.test(text);

  const parsePlayerjsSubtitle = (value, base) => {
    if (typeof value !== 'string' || !value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean).map(s => {
      const m = s.match(/^\[([^\]]*)\](.+)$/);
      return { url: new URL(m ? m[2] : s, base).href, label: m ? m[1] : '' };
    });
  };

  const extractNetflixTracks = obj => {
    const find = (o, depth) => {
      if (!o || typeof o !== 'object' || depth > 4) return null;
      if (Array.isArray(o.timedtexttracks)) return o;
      for (const v of Object.values(o)) { const r = find(v, depth + 1); if (r) return r; }
      return null;
    };
    const holder = find(obj, 0);
    if (!holder) return null;
    const tracks = [];
    for (const t of holder.timedtexttracks) {
      if (t.isNoneTrack || t.isForcedNarrative || !t.ttDownloadables) continue;
      const fmt = NF_FORMATS.find(f => t.ttDownloadables[f]);
      const dl = fmt && t.ttDownloadables[fmt];
      const url = dl && (dl.urls?.[0]?.url || Object.values(dl.downloadUrls || {})[0]);
      if (!url) continue;
      tracks.push({
        id: 'nf:' + (t.new_track_id || t.id || t.language + fmt), url,
        lang: String(t.language || '').split('-')[0],
        label: (t.languageDescription || t.language) + (t.rawTrackType === 'closedcaptions' ? ' [CC]' : ''),
        source: 'netflix',
      });
    }
    return { movieId: holder.movieId, tracks };
  };

  // The intercepted URL carries YouTube's proof-of-origin token; every other track is derived from it.
  const buildYouTubeTracks = (intercepted, captionTracks, wantLangs) => {
    const make = (code, kind, tlang) => {
      const u = new URL(intercepted);
      u.searchParams.set('lang', code);
      if (kind) u.searchParams.set('kind', kind); else u.searchParams.delete('kind');
      if (tlang) u.searchParams.set('tlang', tlang); else u.searchParams.delete('tlang');
      u.searchParams.set('fmt', 'json3');
      return u.href;
    };
    const name = n => n?.simpleText || (n?.runs || []).map(r => r.text).join('') || '';
    const out = captionTracks.map(c => ({
      id: 'yt:' + c.languageCode + (c.kind ? ':' + c.kind : ''),
      url: make(c.languageCode, c.kind), lang: c.languageCode.split('-')[0], label: name(c.name),
      source: 'youtube', fetchIn: 'page',
    }));
    const src = captionTracks.find(c => !c.kind) || captionTracks[0];
    for (const lang of wantLangs) {
      if (!src || !lang || out.some(t => t.lang === lang)) continue;
      out.push({ id: 'yt:tl:' + lang, url: make(src.languageCode, src.kind, lang), lang, label: 'YouTube çevirisi', source: 'youtube', fetchIn: 'page' });
    }
    return out;
  };

  if (typeof window === 'undefined') {
    module.exports = { looksLikeSubtitle, parsePlayerjsSubtitle, extractNetflixTracks, buildYouTubeTracks };
    return;
  }
  if (window.__looptionsMain) return;
  window.__looptionsMain = true;

  // ---- bridge ----

  const queue = []; // replayed when content.js (document_idle) says hello
  const emit = msg => {
    queue.push(msg);
    if (queue.length > 60) queue.shift();
    document.dispatchEvent(new CustomEvent('looptions:to-ext', { detail: JSON.stringify(msg) }));
  };
  const sentUrls = new Set();
  const emitTracks = tracks => {
    const fresh = tracks.filter(t => t.url && !sentUrls.has(t.id || t.url));
    fresh.forEach(t => sentUrls.add(t.id || t.url));
    if (fresh.length) emit({ kind: 'tracks', tracks: fresh });
  };
  const reset = () => { sentUrls.clear(); queue.length = 0; emit({ kind: 'reset' }); };

  const yt = { url: null, langs: [] };
  const ytBodies = new Map(); // "v|lang|kind|tlang" -> Promise<text> of responses YouTube itself fetched
  const ytKey = u => { const p = new URL(u, location.href).searchParams; return ['v', 'lang', 'kind', 'tlang'].map(k => p.get(k) || '').join('|'); };
  document.addEventListener('looptions:to-page', e => {
    let m; try { m = JSON.parse(e.detail); } catch { return; }
    if (m.kind === 'hello') queue.forEach(q => document.dispatchEvent(new CustomEvent('looptions:to-ext', { detail: JSON.stringify(q) })));
    if (m.kind === 'prefs') { yt.langs = m.langs; if (yt.url) ytEmit(); }
    if (m.kind === 'fetch') {
      // Reuse a body YouTube's player already downloaded: every extra timedtext request counts toward its rate limit.
      const cached = /\/api\/timedtext/.test(m.url) && ytBodies.get(ytKey(m.url));
      (cached || origFetch(m.url, { credentials: 'include' }).then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
        .then(text => emit({ kind: 'fetched', id: m.id, text }), err => emit({ kind: 'fetched', id: m.id, error: String(err) }));
    }
  });

  // Keep patched functions looking native to pages that check toString().
  const disguise = (fn, orig) => {
    try { Object.defineProperty(fn, 'toString', { value: () => Function.prototype.toString.call(orig) }); } catch {}
    return fn;
  };

  // ---- network sniffing: subtitle bodies, YouTube timedtext ----

  const inspect = (url, type, size, getText) => {
    if (!url) return;
    if (/\/api\/timedtext/.test(url) && /youtube\.com$/.test(location.hostname)) {
      const body = getText().then(t => t || Promise.reject(new Error('empty')));
      body.catch(() => ytBodies.delete(ytKey(url)));
      if (ytBodies.size > 30) ytBodies.clear();
      ytBodies.set(ytKey(url), body);
      if (!/[?&]tlang=/.test(url)) { yt.url = url; ytEmit(); }
      return;
    }
    if (!SUB_URL.test(url) && !/vtt|subrip|ttml/i.test(type)) return;
    if (type && !SUB_TYPE.test(type)) return;
    if (size > 3e6) return;
    getText().then(text => {
      if (!looksLikeSubtitle(text) || sentUrls.has(url)) return;
      // A body already decoded with the wrong charset (XHR text) is useless; background refetches the bytes.
      if (text.includes('�')) emitTracks([{ url, source: 'network' }]);
      else { sentUrls.add(url); emit({ kind: 'subtitle', url, text }); }
    }, () => {});
  };

  // Same rule as DS.decodeSubtitle (not reachable from this world): strict UTF-8, else windows-1254.
  const decode = buf => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch { return new TextDecoder('windows-1254').decode(buf); }
  };

  const origFetch = window.fetch;
  window.fetch = disguise(function (...args) {
    const p = origFetch.apply(this, args);
    p.then(r => inspect(r.url, r.headers.get('content-type') || '', +(r.headers.get('content-length') || 0), () => r.ok ? r.clone().arrayBuffer().then(decode) : Promise.reject(new Error('HTTP ' + r.status))), () => {});
    return p;
  }, origFetch);

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = disguise(function (...args) {
    this.addEventListener('load', () => {
      if (this.responseType && this.responseType !== 'text') return;
      inspect(this.responseURL, this.getResponseHeader('content-type') || '', 0, () => this.status < 400 ? Promise.resolve(this.responseText) : Promise.reject(new Error('HTTP ' + this.status)));
    });
    return origSend.apply(this, args);
  }, origSend);

  // ---- player adapters ----

  const scanPlayers = () => {
    const out = [];
    try {
      if (typeof window.jwplayer === 'function') {
        for (const el of document.querySelectorAll('.jwplayer, [id^="jwplayer"]')) {
          const item = window.jwplayer(el.id)?.getPlaylistItem?.();
          for (const t of item?.tracks || []) {
            if (t.file && /captions|subtitles/.test(t.kind || 'captions')) out.push({ url: new URL(t.file, location.href).href, label: t.label || '', lang: t.language || '', source: 'jwplayer' });
          }
        }
      }
    } catch {}
    try {
      for (const p of Object.values(window.videojs?.getPlayers?.() || {})) {
        const list = p?.textTracks?.() || [];
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          if (t.src && /captions|subtitles/.test(t.kind)) out.push({ url: new URL(t.src, location.href).href, label: t.label || '', lang: t.language || '', source: 'videojs' });
        }
      }
    } catch {}
    emitTracks(out);
  };
  setInterval(scanPlayers, 1500);

  // Playerjs (common on Turkish sites) takes subtitles as "[Label]url,[Label]url" in its constructor options.
  let realPlayerjs;
  try {
    Object.defineProperty(window, 'Playerjs', {
      configurable: true,
      get: () => realPlayerjs,
      set: v => {
        realPlayerjs = typeof v !== 'function' ? v : new Proxy(v, {
          construct(target, args, nt) {
            try { emitTracks(parsePlayerjsSubtitle(args[0]?.subtitle, location.href).map(t => ({ ...t, source: 'playerjs' }))); } catch {}
            return Reflect.construct(target, args, nt);
          },
        });
      },
    });
  } catch {}

  // ---- YouTube ----

  function ytEmit() {
    const pr = document.getElementById('movie_player')?.getPlayerResponse?.();
    const list = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (yt.url && list.length) emitTracks(buildYouTubeTracks(yt.url, list, yt.langs));
  }
  if (/(^|\.)youtube\.com$/.test(location.hostname)) {
    document.addEventListener('yt-navigate-start', () => { yt.url = null; reset(); });
    // The timedtext request (with its token) only happens once captions load; ask the player to load them.
    // shortcut: uses the player's undocumented API; if it changes, the user turns captions on once by hand.
    document.addEventListener('yt-navigate-finish', () => setTimeout(() => {
      try {
        const pl = document.getElementById('movie_player');
        const list = pl?.getPlayerResponse?.()?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (!yt.url && list.length) { pl.loadModule?.('captions'); pl.setOption?.('captions', 'track', { languageCode: list[0].languageCode }); }
      } catch {}
    }, 1500));
  }

  // ---- Netflix ----

  if (/(^|\.)netflix\.com$/.test(location.hostname)) {
    let movieId = null;
    const origParse = JSON.parse;
    JSON.parse = disguise(function (text, reviver) {
      const v = origParse.call(this, text, reviver);
      try {
        if (typeof text === 'string' && text.length > 500 && text.includes('timedtexttracks')) {
          const r = extractNetflixTracks(v);
          if (r) {
            if (r.movieId !== movieId) { movieId = r.movieId; reset(); }
            emitTracks(r.tracks);
          }
        }
      } catch {}
      return v;
    }, origParse);
    // Ask the manifest for WebVTT alongside the formats Netflix already requests.
    const origStringify = JSON.stringify;
    JSON.stringify = disguise(function (value, ...rest) {
      try {
        const profiles = value?.params?.profiles || value?.profiles;
        if (Array.isArray(profiles) && profiles.some(p => /imsc|dfxp|simplesdh/.test(p)) && !profiles.includes(NF_FORMATS[0])) profiles.unshift(NF_FORMATS[0]);
      } catch {}
      return origStringify.call(this, value, ...rest);
    }, origStringify);
  }
})();
