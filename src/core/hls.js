// HLS subtitle renditions: master playlist -> media playlist -> WebVTT segments -> one cue list.
(() => {
  const DS = (globalThis.DS ||= {});
  const attrs = line => Object.fromEntries([...line.matchAll(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g)].map(([, k, v]) => [k, v.replace(/^"|"$/g, '')]));

  DS.parseMasterPlaylist = (text, base) => text.split(/\r?\n/)
    .filter(l => l.startsWith('#EXT-X-MEDIA:') && /TYPE=SUBTITLES/.test(l))
    .map(l => attrs(l.slice(13)))
    .filter(a => a.URI)
    .map(a => ({ url: new URL(a.URI, base).href, lang: a.LANGUAGE || '', label: a.NAME || a.LANGUAGE || '' }));

  DS.parseMediaPlaylist = (text, base) => text.split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => new URL(l, base).href);

  const clock = s => { const [h, m, x] = s.split(':'); return +h * 3600 + +m * 60 + +x; };

  // Cue times are shifted by each segment's MPEGTS relative to the first segment.
  // shortcut: assumes the player's time zero is the first segment's MPEGTS (true for hls.js/VOD); per-track offset fixes the rest.
  DS.mergeHlsSegments = texts => {
    let base = null;
    const seen = new Set(), cues = [];
    for (const text of texts) {
      const m = text.match(/X-TIMESTAMP-MAP=([^\r\n]+)/);
      let shift = 0;
      if (m) {
        const mpegts = +(m[1].match(/MPEGTS:(\d+)/)?.[1] || 0);
        const local = clock(m[1].match(/LOCAL:([\d:.]+)/)?.[1] || '0:0:0');
        base ??= mpegts / 90000 - local;
        shift = mpegts / 90000 - local - base;
      }
      for (const c of DS.parseSubtitle(text)) {
        const cue = { start: +(c.start + shift).toFixed(3), end: +(c.end + shift).toFixed(3), text: c.text };
        const k = cue.start + '|' + cue.text;
        if (!seen.has(k)) { seen.add(k); cues.push(cue); }
      }
    }
    return cues.sort((a, b) => a.start - b.start);
  };

  if (typeof module === 'object') module.exports = DS;
})();
