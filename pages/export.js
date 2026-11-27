// Word notebook as a printable sheet: grouped by language pair, A to Z, with the sentence each word came from.
(async () => {
  const DS = globalThis.DS;
  const $ = id => document.getElementById(id);
  // The Store address goes here once the listing is live; until then the sheet carries no QR (scripts/check-release.js fails on the placeholder).
  const STORE_URL = globalThis.STORE_URL || 'https://chromewebstore.google.com/detail/jijepgjadamcdinhnbimmegagddommoe';
  const prefs = DS.mergePrefs((await chrome.storage.sync.get('prefs')).prefs);
  const ui = DS.uiLang(prefs);
  const t = (s, ...a) => DS.t(s, ui, ...a);
  const words = (await chrome.storage.local.get('words')).words || [];
  document.documentElement.lang = ui;
  document.title = t('Looptions – Kelime defterim');
  DS.localize(document.body, ui);

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const names = new Intl.DisplayNames([ui], { type: 'language' });
  const name = c => { const n = names.of(c) || c; return n[0].toLocaleUpperCase(ui) + n.slice(1); };
  const date = ms => new Date(ms).toLocaleDateString(ui, { day: 'numeric', month: 'short', year: 'numeric' });
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  $('meta').textContent = date(Date.now());
  $('printBtn').disabled = !words.length;
  $('printBtn').addEventListener('click', () => print());

  // Entries sit under their first letter, accents ignored (Ç under C), A to Z within each language pair.
  const letterOf = (w, from) => (w.word.normalize('NFD').replace(/\p{M}/gu, '')[0] || '#').toLocaleUpperCase(from);
  const pairs = [...new Set(words.map(w => `${w.from}-${w.to}`))];
  const groups = pairs.map(p => {
    const [from, to] = p.split('-');
    const sec = el('section', 'group');
    sec.append(el('h2', null, `${name(from)} → ${name(to)}`));
    const cols = el('div', 'letters');
    const sorted = words.filter(x => `${x.from}-${x.to}` === p).sort((a, b) => a.word.localeCompare(b.word, from));
    let letter = null, block = null;
    for (const w of sorted) {
      const l = letterOf(w, from);
      if (l !== letter) { letter = l; block = el('section', 'letter'); block.append(el('h3', null, l)); cols.append(block); }
      const entry = el('div', 'entry');
      const head = el('p');
      head.append(el('b', null, w.word), el('span', 'tr', w.translation || ''));
      entry.append(head);
      if (w.context) {
        const ctx = el('p', 'ctx');
        w.context.split(new RegExp(`((?<![\\p{L}])${esc(w.word)}(?![\\p{L}]))`, 'iu')).forEach((part, i) => ctx.append(i % 2 ? el('mark', null, part) : part));
        entry.append(ctx);
      }
      block.append(entry);
    }
    sec.append(cols);
    return sec;
  });
  $('groups').replaceChildren(...(groups.length ? groups : [el('p', 'empty', t('Henüz kelime yok'))]));

  $('qrImg').innerHTML = DS.qrSvg(STORE_URL);
  $('qr').hidden = false;
})();
