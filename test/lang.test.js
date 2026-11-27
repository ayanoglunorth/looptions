const test = require('node:test');
const assert = require('node:assert');
const DS = require('../src/core/lang.js');

test('normalizes codes and labels to ISO 639-1', () => {
  assert.strictEqual(DS.normLang('tr'), 'tr');
  assert.strictEqual(DS.normLang('tur'), 'tr');
  assert.strictEqual(DS.normLang('Türkçe'), 'tr');
  assert.strictEqual(DS.normLang('TURKISH'), 'tr');
  assert.strictEqual(DS.normLang('en-US'), 'en');
  assert.strictEqual(DS.normLang('English [CC]'), 'en');
  assert.strictEqual(DS.normLang('İngilizce'), 'en');
});

test('detects language from subtitle URL file name', () => {
  assert.strictEqual(DS.normLang('https://cdn.x/subs/movie_tr.vtt'), 'tr');
  assert.strictEqual(DS.normLang('https://cdn.x/subs/Movie.English.srt'), 'en');
});

test('pickTracks: explicit id wins, then preferred language, never same track twice', () => {
  const tracks = [
    { id: 'a', lang: 'en' }, { id: 'b', lang: 'tr' }, { id: 'c', lang: 'en' },
  ];
  const prefs = { primary: 'en', secondary: 'en' };
  assert.deepStrictEqual(DS.pickTracks(tracks, {}, prefs).map(t => t?.id), ['a', 'c']);
  assert.deepStrictEqual(DS.pickTracks(tracks, { primaryId: 'b' }, prefs).map(t => t?.id), ['b', 'a']);
  assert.deepStrictEqual(DS.pickTracks(tracks, { secondaryId: 'none' }, prefs).map(t => t?.id), ['a', undefined]);
  assert.deepStrictEqual(DS.pickTracks([], {}, prefs), [null, null]);
});

test('returns empty string for unknown', () => {
  assert.strictEqual(DS.normLang('Subtitle 1'), '');
  assert.strictEqual(DS.normLang(''), '');
});

test('comboFromEvent: needs Ctrl/Alt/Meta, uses physical letter keys', () => {
  const ev = o => ({ key: 'x', code: 'KeyX', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...o });
  assert.strictEqual(DS.comboFromEvent(ev({ altKey: true, shiftKey: true, key: 'X' })), 'Alt+Shift+X');
  assert.strictEqual(DS.comboFromEvent(ev({ ctrlKey: true, key: 'ğ', code: 'BracketLeft' })), 'Ctrl+Ğ');
  assert.strictEqual(DS.comboFromEvent(ev({ ctrlKey: true, key: 'F2', code: 'F2' })), 'Ctrl+F2');
  assert.strictEqual(DS.comboFromEvent(ev({ altKey: true, key: '≈', code: 'KeyX' })), 'Alt+X'); // macOS Option alters e.key
  assert.strictEqual(DS.comboFromEvent(ev({ shiftKey: true })), '');
  assert.strictEqual(DS.comboFromEvent(ev({ altKey: true, key: 'Alt', code: 'AltLeft' })), '');
});

test('lookVars: every style and font resolves, unknown ids fall back', () => {
  for (const s of DS.STYLES) for (const f of DS.FONTS) {
    const v = DS.lookVars({ style: s.id, font: f.id });
    assert.ok(v['--ff'] && v['--c1'] && v['--scale'], `${s.id}/${f.id}`);
  }
  assert.equal(DS.lookVars({ style: 'nope', font: 'nope' })['--bg'], DS.lookVars({ style: 'standard', font: 'system' })['--bg']);
  assert.ok(DS.FONTS.every(f => !f.file || ['latin', 'latin-ext'].every(s => require('node:fs').existsSync(`fonts/${f.file}-${s}.woff2`))));
});

test('scaleAlpha: scales rgba alpha, clamps to 1, leaves other colours alone', () => {
  assert.strictEqual(DS.scaleAlpha('rgba(10, 10, 12, .76)', 0.5), 'rgba(10, 10, 12, 0.38)');
  assert.strictEqual(DS.scaleAlpha('rgba(0, 0, 0, .82)', 1.5), 'rgba(0, 0, 0, 1)');
  assert.strictEqual(DS.scaleAlpha('rgba(10, 10, 12, .76)', 0), 'rgba(10, 10, 12, 0)');
  assert.strictEqual(DS.scaleAlpha('transparent', 0.5), 'transparent');
});

test('lookVars: bgOpacity scales boxes, lift raises captions, old prefs unchanged', () => {
  const L = o => DS.lookVars({ style: 'standard', font: 'system', ...o });
  assert.strictEqual(L({ bgOpacity: 50 })['--bg'], 'rgba(10, 10, 12, 0.38)');
  assert.strictEqual(DS.lookVars({ style: 'lines', font: 'system', bgOpacity: 50 })['--lbg'], 'rgba(0, 0, 0, 0.41)');
  assert.strictEqual(DS.lookVars({ style: 'cinema', font: 'system', bgOpacity: 0 })['--bg'], 'transparent');
  assert.strictEqual(L({})['--bg'], 'rgba(10, 10, 12, 0.76)');
  assert.strictEqual(L({})['--bottom'], '6%');
  assert.strictEqual(L({ lift: 10 })['--bottom'], 'calc(6% + 10%)');
});

test('logoVisible: shown while moving, paused or menu open; hidden when idle and playing', () => {
  const v = o => DS.logoVisible({ paused: false, idleMs: Infinity, menuOpen: false, ...o });
  assert.strictEqual(v({}), false);
  assert.strictEqual(v({ idleMs: 100 }), true);
  assert.strictEqual(v({ idleMs: 3000 }), false);
  assert.strictEqual(v({ paused: true }), true);
  assert.strictEqual(v({ menuOpen: true }), true);
});

test('nudgeSel: shifts the primary offset by step, or the secondary when primary is off', () => {
  assert.deepStrictEqual(DS.nudgeSel({}, 0.25), { offsetPrimary: 0.25 });
  assert.deepStrictEqual(DS.nudgeSel({ offsetPrimary: 0.1 }, -0.25), { offsetPrimary: -0.15 });
  assert.deepStrictEqual(DS.nudgeSel({ primaryId: 'none' }, 0.25), { primaryId: 'none', offsetSecondary: 0.25 });
});

test('fmtOffset: signed seconds with a decimal comma', () => {
  assert.strictEqual(DS.fmtOffset(0.25), '+0,25 sn');
  assert.strictEqual(DS.fmtOffset(-1.5), '-1,50 sn');
  assert.strictEqual(DS.fmtOffset(0), '0,00 sn');
});

test('splitWords: words are marked, everything else is kept so the text rejoins unchanged', () => {
  const text = "Don't go, Türkiye'nin çocukları!\n  Yes.";
  const parts = DS.splitWords(text, 'en');
  assert.strictEqual(parts.map(p => p.t).join(''), text);
  assert.deepStrictEqual(parts.filter(p => p.word).map(p => p.t), ["Don't", 'go', "Türkiye'nin", 'çocukları', 'Yes']);
  assert.deepStrictEqual(DS.splitWords('', 'en'), []);
  assert.ok(DS.splitWords('hello', '').length === 1); // unknown language still works
});

test('lookupPair: from the clicked line to the other line, else to the other preferred language', () => {
  const prefs = { primary: 'en', secondary: 'tr' };
  const both = [{ role: 'primary', lang: 'en' }, { role: 'secondary', lang: 'tr' }];
  assert.deepStrictEqual(DS.lookupPair('primary', both, prefs), { from: 'en', to: 'tr' });
  assert.deepStrictEqual(DS.lookupPair('secondary', both, prefs), { from: 'tr', to: 'en' });
  assert.deepStrictEqual(DS.lookupPair('primary', [{ role: 'primary', lang: 'en' }], prefs), { from: 'en', to: 'tr' });
  assert.deepStrictEqual(DS.lookupPair('secondary', [{ role: 'secondary', lang: 'tr' }], prefs), { from: 'tr', to: 'en' });
  // other line in the same language: fall back to the preferred pair
  assert.deepStrictEqual(DS.lookupPair('primary', [{ role: 'primary', lang: 'en' }, { role: 'secondary', lang: 'en' }], prefs), { from: 'en', to: 'tr' });
  // unknown language, or nothing to translate to
  assert.strictEqual(DS.lookupPair('primary', [{ role: 'primary', lang: '' }], prefs), null);
  assert.strictEqual(DS.lookupPair('primary', [{ role: 'primary', lang: 'en' }], { primary: 'en', secondary: 'en' }), null);
});

test('DEFAULT_PREFS: compact subtitle look with the bundled Roboto', () => {
  const d = DS.DEFAULT_PREFS;
  assert.deepStrictEqual([d.size, d.bgOpacity, d.lift, d.font], [70, 70, 3, 'roboto']);
  assert.ok(DS.FONTS.some(f => f.id === d.font));
});

test('spokenNative: only the YouTube auto-generated track tells the spoken language', () => {
  const prefs = { secondary: 'tr' };
  assert.strictEqual(DS.spokenNative([{ id: 'yt:tr:asr', lang: 'tr' }], prefs), true);
  assert.strictEqual(DS.spokenNative([{ id: 'yt:en:asr', lang: 'en' }, { id: 'yt:tr', lang: 'tr' }], prefs), false);
  assert.strictEqual(DS.spokenNative([{ id: 'yt:tr', lang: 'tr' }], prefs), false);
  assert.strictEqual(DS.spokenNative([{ id: 'yt:tl:tr', lang: 'tr' }], prefs), false);
  assert.strictEqual(DS.spokenNative([], prefs), false);
});

test('quizSize: 10..30 in steps of 5, default 20, anything else falls back to 20', () => {
  assert.deepStrictEqual(DS.QUIZ_SIZES, [10, 15, 20, 25, 30]);
  assert.strictEqual(DS.DEFAULT_PREFS.quizSize, 20);
  assert.strictEqual(DS.quizSize({ quizSize: 30 }), 30);
  assert.strictEqual(DS.quizSize({ quizSize: 7 }), 20);
  assert.strictEqual(DS.quizSize({}), 20);
  assert.strictEqual(DS.quizSize(undefined), 20);
});

test('pickTracks never auto-picks a forced track, but an explicit choice still can', () => {
  const tracks = [
    { id: 'x.tur.forced.vtt', lang: 'tr', label: 'x.tur.forced.vtt' }, { id: 'en', lang: 'en' }, { id: 'tr', lang: 'tr' },
  ];
  const prefs = { primary: 'en', secondary: 'tr' };
  assert.deepStrictEqual(DS.pickTracks(tracks, {}, prefs).map(t => t?.id), ['en', 'tr']);
  assert.deepStrictEqual(DS.pickTracks(tracks.slice(0, 2), {}, prefs).map(t => t?.id), ['en', undefined]);
  assert.deepStrictEqual(DS.pickTracks(tracks, { secondaryId: 'x.tur.forced.vtt' }, prefs).map(t => t?.id), ['en', 'x.tur.forced.vtt']);
});

test('LANGS: six languages; detection still knows others', () => {
  assert.deepStrictEqual([...DS.LANGS].sort(), ['de', 'en', 'es', 'fr', 'ru', 'tr']);
  assert.strictEqual(DS.normLang('Italiano'), 'it');
});

test('mergePrefs: a language no longer on offer falls back, never the same twice', () => {
  assert.deepStrictEqual([DS.mergePrefs({ primary: 'it', secondary: 'ar' })].map(p => [p.primary, p.secondary])[0], ['en', 'tr']);
  assert.strictEqual(DS.mergePrefs({ primary: 'de', secondary: 'fr' }).primary, 'de');
  const same = DS.mergePrefs({ primary: 'tr', secondary: 'tr' });
  assert.notStrictEqual(same.primary, same.secondary);
  assert.strictEqual(DS.mergePrefs(undefined).size, DS.DEFAULT_PREFS.size);
});

test('quizPair: only en -> tr', () => {
  assert.ok(DS.quizPair({ primary: 'en', secondary: 'tr' }));
  assert.ok(!DS.quizPair({ primary: 'es', secondary: 'tr' }));
  assert.ok(!DS.quizPair({ primary: 'en', secondary: 'de' }));
});

test('site switches: default on, set and read per host', () => {
  assert.strictEqual(DS.siteHost('https://www.YouTube.com/watch?v=1'), 'youtube.com');
  assert.strictEqual(DS.siteHost('not a url'), '');
  assert.ok(DS.siteOn({}, 'youtube.com', 'quiz'));
  const sites = DS.setSite(undefined, 'youtube.com', 'quiz', false);
  assert.ok(!DS.siteOn({ sites }, 'youtube.com', 'quiz'));
  assert.ok(DS.siteOn({ sites }, 'youtube.com', 'ext'));
  assert.ok(DS.siteOn({ sites }, 'netflix.com', 'quiz'));
});

test('playback keys: defaults are valid, unique combos', () => {
  const combos = DS.PLAY_KEYS.filter(k => !k.plain).map(k => DS.DEFAULT_PREFS[k.pref]).concat(DS.DEFAULT_PREFS.toggleKey);
  assert.strictEqual(new Set(combos).size, combos.length);
  assert.ok(combos.every(c => /^(Ctrl|Alt|Meta)/.test(c)));
  assert.ok(DS.PLAY_KEYS.filter(k => k.plain).every(k => DS.DEFAULT_PREFS[k.pref] === '')); // bare keys are opt-in
});

test('keyFromEvent / typing: bare keys allowed, never while typing', () => {
  const ev = o => ({ key: '', code: '', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...o });
  assert.strictEqual(DS.keyFromEvent(ev({ key: 'd', code: 'KeyD' })), 'D');
  assert.strictEqual(DS.keyFromEvent(ev({ key: 'Shift', shiftKey: true })), '');
  assert.strictEqual(DS.comboFromEvent(ev({ key: 'd', code: 'KeyD' })), '');
  const el = (tagName, extra = {}) => ({ nodeType: 1, tagName, getAttribute: () => null, ...extra });
  assert.ok(DS.typing({ target: el('INPUT') }));
  assert.ok(DS.typing({ target: el('DIV', { isContentEditable: true }) }));
  assert.ok(DS.typing({ target: el('DIV', { getAttribute: () => 'combobox' }) }));
  assert.ok(DS.typing({ composedPath: () => [el('INPUT')], target: el('DIV') })); // inside a shadow root
  assert.ok(DS.typing({ target: el('BODY'), isComposing: true }));
  assert.ok(!DS.typing({ target: el('BODY') }));
  assert.ok(!DS.typing({ target: el('VIDEO') }));
});

test('videoAct: rate and seek stay in range', () => {
  const v = (playbackRate, currentTime, duration = 100) => ({ playbackRate, currentTime, duration });
  assert.deepStrictEqual(DS.videoAct('speedUp', v(1)), { rate: 1.25 });
  assert.deepStrictEqual(DS.videoAct('speedDown', v(0.25)), { rate: 0.25 });
  assert.deepStrictEqual(DS.videoAct('speedUp', v(4)), { rate: 4 });
  assert.deepStrictEqual(DS.videoAct('seekBack', v(1, 3), 5), { time: 0 });
  assert.deepStrictEqual(DS.videoAct('seekFwd', v(1, 98), 5), { time: 100 });
  assert.deepStrictEqual(DS.videoAct('seekFwd', v(1, 10, NaN), 5), { time: 15 }); // live/unknown duration
  assert.strictEqual(DS.videoAct('prev', v(1, 1)), null);
  assert.deepStrictEqual(DS.videoAct('speedUp', v(1), 5, 0.1), { rate: 1.1 });
  assert.deepStrictEqual(DS.videoAct('speedDown', v(0.3), 5, 0.1), { rate: 0.25 });
  assert.deepStrictEqual(DS.videoAct('speedUp', v(1.1), 5, 0.05), { rate: 1.15 });
});

test('stepValue: arrows walk the list and stop at its ends', () => {
  assert.strictEqual(DS.stepValue('seekSecs', 5, 1), 10);
  assert.strictEqual(DS.stepValue('seekSecs', 5, -1), 3);
  assert.strictEqual(DS.stepValue('seekSecs', 60, 1), 60);
  assert.strictEqual(DS.stepValue('seekSecs', 1, -1), 1);
  assert.strictEqual(DS.stepValue('seekSecs', 7.5, -1), 5); // old free-typed value
  assert.strictEqual(DS.stepValue('speedStep', 0.25, 1), 0.5);
  assert.strictEqual(DS.stepValue('speedStep', 0.05, -1), 0.05);
});
