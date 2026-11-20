// SRT/VTT parsing, encoding detection and cue lookup. Shared by content scripts (globalThis.DS) and node tests.
(() => {
  const DS = (globalThis.DS ||= {});
  const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;
  const toSec = m => (+m[1] || 0) * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, '0') / 1000;

  // ">>" marks a speaker change in broadcast and YouTube auto captions; it is noise on screen.
  // Zero-width characters (used for styling by some channels) break space collapsing, so they go too.
  DS.cleanText = s => s.replace(/[​-‍⁠﻿]/g, '').replace(/[ \t ]+/g, ' ')
    .replace(/^ *>> */gm, '').replace(/^ +| +$/gm, '').trim();

  // SRT and VTT share the same block shape: optional id, "a --> b" line, text lines.
  DS.parseSubtitle = text => {
    const cues = [];
    for (const block of text.replace(/\r/g, '').split(/\n{2,}/)) {
      const lines = block.split('\n');
      const i = lines.findIndex(l => l.includes('-->'));
      if (i < 0) continue;
      const [a, b] = lines[i].split('-->');
      const s = a.match(TIME), e = b.match(TIME);
      if (!s || !e) continue;
      const t = DS.cleanText(decodeEntities(lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '')));
      if (t) cues.push({ start: toSec(s), end: toSec(e), text: t });
    }
    return cues.sort((x, y) => x.start - y.start);
  };

  // Turkish SRT files are often windows-1254; UTF-8 is tried strictly first.
  DS.decodeSubtitle = buf => {
    let s;
    try { s = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch { s = new TextDecoder('windows-1254').decode(buf); }
    return s.replace(/^﻿/, '');
  };

  // shortcut: overlapping cues show only the latest-started one, upgrade if a site needs stacked cues.
  DS.findCue = (cues, t) => {
    let lo = 0, hi = cues.length - 1, hit = -1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (cues[m].start <= t) { hit = m; lo = m + 1; } else hi = m - 1;
    }
    return hit >= 0 && cues[hit].end > t ? cues[hit] : null;
  };

  // Where a line-jump key sends the video, in cue time (null when there is nowhere to go). `cues` sorted by start.
  // repeat: the line playing, or the one just heard in a gap. prev: the line before that. next: the next line to start.
  DS.seekTarget = (cues, t, dir) => {
    if (dir === 'next') return cues.find(c => c.start > t + 0.05)?.start ?? null;
    let i = -1;
    while (i + 1 < cues.length && cues[i + 1].start <= t + 0.001) i++;
    if (i < 0) return null;
    return dir === 'prev' && cues[i].end > t ? cues[Math.max(0, i - 1)].start : cues[i].start;
  };

  // The end time of the line that playback just ran past between `from` and `to` (cue time), else null.
  // A jump (scrub, seek) is not "running past": only steps under half a second count.
  DS.crossedLineEnd = (cues, from, to) => {
    if (!(to > from && to - from < 0.5)) return null;
    const c = DS.findCue(cues, from);
    return c && to >= c.end ? c.end : null;
  };

  // Two tracks split sentences at different moments, so their lines change at different times.
  // Re-time `other` onto `anchor`'s boundaries: each other cue joins the anchor cue it overlaps most;
  // cues that overlap no anchor cue keep their own time. `shift` maps other-time into anchor-time.
  // Text is read live from the source cues, so in-place updates (progressive translation) show up.
  DS.alignCues = (anchor, other, shift = 0) => {
    const groups = anchor.map(a => ({ start: a.start, end: a.end, parts: [] }));
    const loose = [];
    const fallback = []; // per anchor cue: the other cue overlapping it most
    let i = 0; // both lists are sorted by start
    for (const o of other) {
      const s = o.start + shift, e = o.end + shift;
      while (i < anchor.length && anchor[i].end <= s) i++;
      let best = -1, most = 0;
      for (let j = i; j < anchor.length && anchor[j].start < e; j++) {
        const overlap = Math.min(e, anchor[j].end) - Math.max(s, anchor[j].start);
        if (overlap > most) { most = overlap; best = j; }
        if (overlap > (fallback[j]?.overlap || 0)) fallback[j] = { o, overlap };
      }
      if (best >= 0) groups[best].parts.push(o); else loose.push({ start: s, end: e, parts: [o] });
    }
    // An anchor cue that got nothing keeps showing the sentence that is still running underneath it.
    groups.forEach((g, j) => { if (!g.parts.length && fallback[j]) g.parts.push(fallback[j].o); });
    return [...groups.filter(g => g.parts.length), ...loose]
      .sort((a, b) => a.start - b.start)
      .map(g => Object.defineProperty(g, 'text', { enumerable: true, get() { return this.parts.map(p => p.text).filter(Boolean).join(' '); } }));
  };

  const decodeEntities = s => s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

  // YouTube timedtext fmt=json3
  const parseJson3 = s => {
    const cues = [];
    for (const e of JSON.parse(s).events || []) {
      const text = DS.cleanText((e.segs || []).map(x => x.utf8 || '').join(''));
      if (text) cues.push({ start: e.tStartMs / 1000, end: (e.tStartMs + (e.dDurationMs || 0)) / 1000, text });
    }
    return cues.sort((x, y) => x.start - y.start);
  };

  // TTML / IMSC / DFXP (Netflix and many broadcasters). Regex based so it also runs in the service worker.
  const parseTTML = s => {
    const tick = +(s.match(/tickRate="(\d+)"/)?.[1] || 10000000);
    const time = v => {
      if (!v) return NaN;
      if (v.endsWith('ms')) return +v.slice(0, -2) / 1000;
      if (v.endsWith('t')) return +v.slice(0, -1) / tick;
      if (v.endsWith('s')) return +v.slice(0, -1);
      const m = v.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
      return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : NaN;
    };
    const cues = [];
    for (const [, attrs, body] of s.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
      const attr = n => attrs.match(new RegExp(`\\b${n}="([^"]+)"`))?.[1];
      const start = time(attr('begin'));
      const end = attr('end') ? time(attr('end')) : start + time(attr('dur'));
      const text = DS.cleanText(decodeEntities(body.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')));
      if (text && !isNaN(start) && !isNaN(end)) cues.push({ start, end, text });
    }
    return cues.sort((x, y) => x.start - y.start);
  };

  DS.parseAny = text => {
    const s = text.trimStart();
    if (s[0] === '{') return parseJson3(s);
    if (/<tt[\s>]/.test(s.slice(0, 2000))) return parseTTML(s);
    return DS.parseSubtitle(s);
  };

  const vttTime = t => {
    const ms = Math.round(t * 1000);
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
  };
  DS.cuesToVtt = cues => 'WEBVTT\n\n' +
    cues.map(c => `${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text.replace(/\n{2,}/g, '\n')}`).join('\n\n') + '\n';

  if (typeof module === 'object') module.exports = DS;
})();
