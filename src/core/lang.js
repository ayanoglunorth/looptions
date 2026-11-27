// Turns track labels, srclang codes or subtitle URLs into ISO 639-1 codes ('' when unknown).
(() => {
  const DS = (globalThis.DS ||= {});
  const NAMES = {
    tr: 'tr tur turkish turkce turk',
    en: 'en eng english ingilizce',
    de: 'de deu ger german deutsch almanca',
    fr: 'fr fra fre french francais fransizca',
    es: 'es spa spanish espanol ispanyolca',
    it: 'ita italian italiano italyanca', // bare "it" omitted: too common in URLs
    pt: 'pt por portuguese portugues portekizce',
    ru: 'ru rus russian rusca',
    ar: 'ar ara arabic arapca',
  };
  // Languages the viewer can pick. Detection (NAMES) still knows more, so other tracks are labelled correctly and just never picked.
  DS.LANGS = ['tr', 'en', 'es', 'ru', 'de', 'fr'];
  // One line per language for the caption previews in popup, welcome and settings pages.
  DS.SAMPLE = {
    en: 'Where were you last night?', tr: 'Dün gece neredeydin?', de: 'Wo warst du letzte Nacht?',
    fr: 'Où étais-tu hier soir ?', es: '¿Dónde estabas anoche?', it: 'Dove eri ieri sera?',
    pt: 'Onde você estava ontem à noite?', ru: 'Где ты был вчера вечером?', ar: 'أين كنت الليلة الماضية؟',
  };
  const LOOKUP = {};
  for (const [code, words] of Object.entries(NAMES)) for (const w of words.split(' ')) LOOKUP[w] = code;


  DS.normLang = s => {
    const name = String(s || '').split(/[?#]/)[0].split('/').pop(); // URLs: file name only
    const tokens = name.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/);
    for (const t of tokens.reverse()) if (LOOKUP[t]) return LOOKUP[t];
    return '';
  };

  // Stop words per language; a subtitle file has plenty of them.
  const STOP = {
    tr: 'bir ve bu ne için ben sen değil mi da de çok var ama şey o biz siz evet hayır',
    en: 'the and you is to of it that what i do not this are was have',
    de: 'der die und ich nicht das ist du sie es ein zu wir was',
    fr: 'le la les et je vous pas est que de un une il ne ce',
    es: 'el la que y no es por los se lo un una qué está',
    it: 'il che non di per sono la è un una mi ti questo',
    pt: 'o que não de você é um uma eu se está os',
  };
  const STOP_SETS = Object.entries(STOP).map(([k, v]) => [k, new Set(v.split(' '))]);

  DS.guessLang = text => {
    const body = text.replace(/^\d+$|^.*-->.*$/gm, '').slice(0, 20000);
    const letters = body.replace(/[^\p{L}]/gu, '').length || 1;
    if ((body.match(/\p{Script=Cyrillic}/gu) || []).length / letters > 0.5) return 'ru';
    if ((body.match(/\p{Script=Arabic}/gu) || []).length / letters > 0.5) return 'ar';
    const words = body.toLocaleLowerCase().split(/[^\p{L}]+/u);
    let best = '', score = 2; // need at least 3 hits
    for (const [lang, set] of STOP_SETS) {
      const n = words.filter(w => set.has(w)).length;
      if (n > score) { best = lang; score = n; }
    }
    return best;
  };

  // Verifies a track's claimed language against its own text. Returns the claimed code, or the real one when the text
  // clearly is another language (>=10 stop-word hits and twice the claimed language's). Too little evidence keeps the claim.
  DS.checkLang = (text, claimed) => {
    const guess = DS.guessLang(text);
    if (!guess || guess === claimed) return claimed;
    if (guess === 'ru' || guess === 'ar') return guess; // a script mismatch is certain
    const set = STOP_SETS.find(([k]) => k === claimed)?.[1];
    if (!set) return claimed; // no word list for the claimed language: cannot judge
    const words = text.replace(/^\d+$|^.*-->.*$/gm, '').slice(0, 20000).toLocaleLowerCase().split(/[^\p{L}]+/u);
    const hits = s => words.filter(w => s.has(w)).length;
    const n = hits(STOP_SETS.find(([k]) => k === guess)[1]);
    return n >= 10 && n >= 2 * hits(set) ? guess : claimed;
  };

  // Language-learning default: the language being learned is the main (top) line.
  // bgOpacity: % multiplier on the style's box alpha. lift: extra % of video height the captions sit higher. logo: corner of the in-player button.
  DS.DEFAULT_PREFS = { primary: 'en', secondary: 'tr', size: 70, mode: 'dual', align: true, enabled: true, toggleKey: 'Ctrl+M', font: 'roboto', style: 'standard', bgOpacity: 70, lift: 3, logo: 'tr', preQuiz: false, level: 'A2', quizSize: 20, autoPause: false,
    keyPrev: 'Alt+Z', keyRepeat: 'Alt+X', keyNext: 'Alt+C', keyAuto: 'Alt+V',
    // Video keys are plain keys, so they start unassigned: the user opts in per key in Advanced settings.
    keySpeedUp: '', keySpeedDown: '', keySeekBack: '', keySeekFwd: '', seekSecs: 5, speedStep: 0.25 };
  // Playback shortcuts: action name (what overlay.act takes), prefs field, label.
  DS.PLAY_KEYS = [
    { act: 'prev', pref: 'keyPrev', label: 'Önceki satır' }, { act: 'repeat', pref: 'keyRepeat', label: 'Satırı tekrarla' },
    { act: 'next', pref: 'keyNext', label: 'Sonraki satır' }, { act: 'auto', pref: 'keyAuto', label: 'Satır sonunda durdur (aç/kapa)' },
    // plain: may be a bare key (no Ctrl/Alt/Meta); only fires when focus is not in a text field. Handled on the video, not the overlay.
    { act: 'seekBack', pref: 'keySeekBack', label: 'Videoyu geri sar', plain: true }, { act: 'seekFwd', pref: 'keySeekFwd', label: 'Videoyu ileri sar', plain: true },
    { act: 'speedUp', pref: 'keySpeedUp', label: 'Videoyu hızlandır', plain: true }, { act: 'speedDown', pref: 'keySpeedDown', label: 'Videoyu yavaşlat', plain: true },
  ];
  // Values the arrow steppers walk through (popup and settings); no free typing.
  DS.STEPS = { seekSecs: [1, 2, 3, 5, 10, 15, 20, 30, 60], speedStep: [0.05, 0.1, 0.25, 0.5, 1] };
  // Next value one arrow press away (dir +1 / -1); a stored value off the list moves to its neighbour on that side.
  DS.stepValue = (pref, cur, dir) => {
    const list = DS.STEPS[pref];
    const i = dir > 0 ? list.findIndex(x => x > cur) : list.findLastIndex(x => x < cur);
    return i < 0 ? (dir > 0 ? list.at(-1) : list[0]) : list[i];
  };
  // New playbackRate / currentTime for a video act; null when it does not apply. Rate stays within 0.25-4, rounded to 0.01 against float drift.
  DS.videoAct = (act, v, secs, step = 0.25) => {
    const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
    if (act === 'speedUp' || act === 'speedDown') return { rate: clamp(Math.round((v.playbackRate + (act === 'speedUp' ? step : -step)) * 100) / 100, 0.25, 4) };
    if (act === 'seekBack' || act === 'seekFwd') return { time: clamp(v.currentTime + (act === 'seekFwd' ? secs : -secs), 0, v.duration || Infinity) };
    return null;
  };
  // Stored prefs over defaults; a language no longer on offer (saved by an older version) falls back to en / tr.
  DS.mergePrefs = stored => {
    const p = { ...DS.DEFAULT_PREFS, ...stored };
    if (!DS.LANGS.includes(p.primary)) p.primary = 'en';
    if (!DS.LANGS.includes(p.secondary)) p.secondary = 'tr';
    if (p.primary === p.secondary) p.secondary = p.primary === 'tr' ? 'en' : 'tr';
    return p;
  };
  // The pre-video quiz only exists for English learners with a Turkish native language.
  DS.quizPair = prefs => prefs.primary === 'en' && prefs.secondary === 'tr';
  // Per-site switches: prefs.sites[host] = { ext: false } turns Looptions off there, { quiz: false } only the quiz. Default on.
  DS.siteHost = url => { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
  DS.siteOn = (prefs, host, key) => prefs.sites?.[host]?.[key] !== false;
  DS.setSite = (sites, host, key, on) => ({ ...sites, [host]: { ...sites?.[host], [key]: on } });
  DS.QUIZ_SIZES = [10, 15, 20, 25, 30];
  DS.quizSize = prefs => (DS.QUIZ_SIZES.includes(prefs?.quizSize) ? prefs.quizSize : 20);
  DS.LOGO_CORNERS = [
    { id: 'tl', label: 'Sol üst' }, { id: 'tr', label: 'Sağ üst' }, { id: 'bl', label: 'Sol alt' }, { id: 'br', label: 'Sağ alt' }, { id: 'off', label: 'Kapalı' },
  ];
  DS.LOGO_IDLE_MS = 3000;
  // Logo is shown while the pointer moved recently, the video is paused, or the menu is open.
  DS.logoVisible = ({ paused, idleMs, menuOpen }) => menuOpen || paused || idleMs < DS.LOGO_IDLE_MS;
  DS.fmtOffset = (s, lang = 'tr') => (s > 0 ? '+' : '') + s.toLocaleString(lang, { minimumFractionDigits: 2 }) + ' ' + (DS.t ? DS.t('sn', lang) : 'sn');
  // Nudge shortcut: moves the primary line (the whole caption block when lines are aligned); the secondary when primary is off.
  DS.nudgeKey = sel => (sel.primaryId === 'none' ? 'offsetSecondary' : 'offsetPrimary');
  DS.nudgeSel = (sel, step) => {
    const k = DS.nudgeKey(sel);
    return { ...sel, [k]: Math.round(((sel[k] || 0) + step) * 100) / 100 };
  };
  // Scales the alpha of an rgba() colour; anything else (transparent, hex) is returned as is.
  DS.scaleAlpha = (color, k) => color.replace(/^rgba\(([^,]+),([^,]+),([^,]+),\s*([\d.]+)\)$/, (_, r, g, b, a) =>
    `rgba(${r.trim()}, ${g.trim()}, ${b.trim()}, ${+Math.min(1, a * k).toFixed(3)})`);

  // Fonts are bundled in /fonts (all SIL OFL 1.1, variable weight, latin + latin-ext so Turkish letters work).
  // `file` null = no download, just the system stack.
  const SYSTEM = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  DS.FONTS = [
    { id: 'roboto', label: 'Roboto (altyazı)', file: 'roboto', family: '"Looptions Roboto", ' + SYSTEM },
    { id: 'system', label: 'Sistem', file: null, family: SYSTEM },
    { id: 'inter', label: 'Inter', file: 'inter', family: '"Looptions Inter", ' + SYSTEM },
    { id: 'dmsans', label: 'DM Sans', file: 'dm-sans', family: '"Looptions DM Sans", ' + SYSTEM },
    { id: 'nunito', label: 'Nunito Sans', file: 'nunito-sans', family: '"Looptions Nunito Sans", ' + SYSTEM },
    { id: 'atkinson', label: 'Atkinson Hyperlegible', file: 'atkinson-hyperlegible-next', family: '"Looptions Atkinson", ' + SYSTEM },
  ];
  DS.FONT_RANGES = {
    latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  };

  // Ready-made looks, modelled on conventions viewers already know. Every value is a CSS custom property
  // used by the overlay and by both previews, so a look is defined once.
  //   bg: one box behind both lines; lbg: a separate box per line; edge: text-stroke colour; scale: size multiplier.
  const LOOK_BASE = { fw: '600', c1: '#fff', c2: '#f5d547', bg: 'transparent', lbg: 'transparent', pad: '0', lpad: '0', rad: '0', shadow: 'none', stroke: '0', edge: '#000', gap: '.16em', bottom: '6%', scale: '1' };
  DS.STYLES = [
    { id: 'standard', label: 'Standart', note: 'Koyu kutu. YouTube gibi.', v: { bg: 'rgba(10, 10, 12, .76)', pad: '.16em .6em .22em', rad: '.35em' } },
    { id: 'cinema', label: 'Sinema', note: 'Kutusuz, yumuşak gölge. Netflix gibi.', v: { fw: '500', shadow: '0 .04em .1em rgba(0,0,0,.9), 0 0 .35em rgba(0,0,0,.55)', bottom: '9%', gap: '.12em' } },
    { id: 'outline', label: 'Kontur', note: 'Kalın siyah çizgi. Blu-ray ve anime gibi.', v: { fw: '700', stroke: '.16em', shadow: '0 .05em .1em rgba(0,0,0,.45)', c2: '#ffe14d', gap: '.1em' } },
    { id: 'lines', label: 'Satır kutuları', note: 'Her satırın kendi kutusu.', v: { lbg: 'rgba(0, 0, 0, .82)', lpad: '.08em .5em .12em', rad: '.22em', gap: '.1em' } },
    { id: 'quiet', label: 'Sade', note: 'Küçük ve hafif, görüntüyü kapatmaz.', v: { fw: '500', shadow: '0 .03em .08em rgba(0,0,0,.85)', scale: '.86', bottom: '5%', gap: '.1em' } },
  ];
  // Plain object of "--name" -> value for a font + style pair; unknown ids fall back to the defaults.
  DS.lookVars = prefs => {
    const f = DS.FONTS.find(x => x.id === prefs.font) || DS.FONTS[0];
    const s = DS.STYLES.find(x => x.id === prefs.style) || DS.STYLES[0];
    const o = { ...LOOK_BASE, ...s.v };
    const k = (prefs.bgOpacity ?? 100) / 100;
    o.bg = DS.scaleAlpha(o.bg, k);
    o.lbg = DS.scaleAlpha(o.lbg, k);
    if (prefs.lift > 0) o.bottom = `calc(${o.bottom} + ${prefs.lift}%)`;
    return { '--ff': f.family, ...Object.fromEntries(Object.entries(o).map(([k, v]) => ['--' + k, v])) };
  };

  // Key combo as text, e.g. "Alt+Shift+X". Letters/digits use the physical key so the combo survives layout switches.
  // '' for a lone modifier, or a combo with no Ctrl/Alt/Meta (that would steal ordinary typing on the page).
  DS.comboFromEvent = e => (e.ctrlKey || e.altKey || e.metaKey) ? DS.keyFromEvent(e) : '';
  // Same, but a bare key (or Shift+key) counts too. Callers must keep these out of text fields (DS.typing).
  DS.keyFromEvent = e => {
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return '';
    const key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3) : /^Digit\d$/.test(e.code) ? e.code.slice(5)
      : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    return [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Meta', key].filter(Boolean).join('+');
  };

  // True when a key event is (probably) typing: focus in a text field (also inside shadow roots), contenteditable, an IME session, or a select.
  DS.typing = e => {
    const t = (e.composedPath?.()[0]) || e.target;
    if (e.isComposing || e.keyCode === 229) return true;
    if (!t || t.nodeType !== 1) return false;
    return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || /^(textbox|searchbox|combobox)$/.test(t.getAttribute('role') || '');
  };

  // Shared by content script and popup so both agree on what is shown: [primary, secondary].
  // Forced tracks (signs and foreign-language bits only) are never picked automatically, only by an explicit id.
  DS.isForced = t => /(^|[^a-z])forced([^a-z]|$)/i.test(`${t.label || ''} ${t.id || ''}`);
  DS.pickTracks = (tracks, sel, prefs) => {
    const pick = (id, lang, not) => id === 'none' ? null
      : tracks.find(t => t.id === id) || tracks.find(t => t.lang && t.lang === lang && t.id !== not && !DS.isForced(t)) || null;
    const p = pick(sel.primaryId, prefs.primary);
    return [p, pick(sel.secondaryId, prefs.secondary, p?.id)];
  };

  // True when the video is spoken in the viewer's native language. YouTube's auto-generated (asr) track is always in the spoken language.
  DS.spokenNative = (tracks, prefs) => tracks.some(t => /^yt:.+:asr$/.test(t.id) && t.lang === prefs.secondary);

  // A caption line cut into words and the text between them, for click-to-translate. Joining every `t` gives the line back.
  DS.splitWords = (text, lang) => [...new Intl.Segmenter(lang || undefined, { granularity: 'word' }).segment(text)]
    .map(s => ({ t: s.segment, word: !!s.isWordLike }));

  // Which way a clicked word translates: its own line's language to the other line's, else to the other preferred language.
  // null when either side is unknown or both are the same.
  DS.lookupPair = (role, lines, prefs) => {
    const from = lines.find(l => l.role === role)?.lang;
    const other = lines.find(l => l.role !== role)?.lang;
    const to = other && other !== from ? other : from === prefs.primary ? prefs.secondary : prefs.primary;
    return from && to && from !== to ? { from, to } : null;
  };

  if (typeof module === 'object') module.exports = DS;
})();
