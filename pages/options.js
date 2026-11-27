// Advanced settings: the same prefs the popup edits, plus room for the word notebook.
(async () => {
  const DS = globalThis.DS;
  const $ = id => document.getElementById(id);
  let prefs = DS.mergePrefs((await chrome.storage.sync.get('prefs')).prefs);
  // Text set once at startup stays Turkish and DS.localize (end of render) translates it; text set later goes through t().
  const ui = () => DS.uiLang(prefs);
  const t = (s, ...a) => DS.t(s, ui(), ...a);
  let wordsLang = '';
  let entered = false; // the card entrance plays once, on the first render
  const save = patch => {
    if (patch.primary && patch.primary === prefs.secondary) patch.secondary = prefs.primary; // never the same language twice
    if (patch.secondary && patch.secondary === prefs.primary) patch.primary = prefs.secondary;
    prefs = { ...prefs, ...patch };
    chrome.storage.sync.set({ prefs });
    render();
  };

  for (const id of ['primary', 'secondary']) {
    $(id).addEventListener('change', e => save({ [id]: e.target.value }));
  }

  function render() {
    const on = prefs.enabled !== false;
    $('enabled').setAttribute('aria-checked', on);
    $('powerLabel').textContent = t(on ? 'Açık' : 'Kapalı');
    const names = new Intl.DisplayNames([ui()], { type: 'language' });
    for (const id of ['primary', 'secondary']) $(id).replaceChildren(...DS.LANGS.map(c => new Option(names.of(c), c)));
    $('primary').value = prefs.primary;
    $('secondary').value = prefs.secondary;
    $('pvPrimary').textContent = DS.SAMPLE[prefs.primary] || '';
    $('pvSecondary').textContent = DS.SAMPLE[prefs.secondary] || '';
    $('frame').dataset.mode = prefs.mode;
    $('frame').style.setProperty('--s', prefs.size / 100);
    for (const [k, v] of Object.entries(DS.lookVars(prefs))) $('frame').style.setProperty(k, v);
    $('style').value = prefs.style;
    $('font').value = prefs.font;
    $('styleNote').textContent = t(DS.STYLES.find(x => x.id === prefs.style)?.note || '');
    for (const b of document.querySelectorAll('.segmented button')) b.setAttribute('aria-pressed', b.dataset.mode === prefs.mode);
    $('shortcut').hidden = prefs.mode !== 'swap';
    $('align').checked = prefs.align !== false;
    $('size').value = prefs.size;
    $('sizeOut').value = prefs.size;
    $('bgOpacity').value = prefs.bgOpacity;
    $('bgOpacityOut').value = prefs.bgOpacity;
    $('lift').value = prefs.lift;
    $('liftOut').value = prefs.lift;
    $('logo').value = prefs.logo;
    showKey();
    renderSites();
    showPlayKeys();
    $('autoPause').checked = !!prefs.autoPause;
    document.documentElement.lang = ui();
    document.title = t('Looptions – Gelişmiş ayarlar');
    DS.localize(document.body, ui());
    if (wordsLang !== ui()) { wordsLang = ui(); renderWords(); } // counts and labels follow a native-language change
    for (const box of document.querySelectorAll('.step')) box.querySelector('output').value = String(prefs[box.dataset.pref]).replace('.', ',');
  }

  $('enabled').addEventListener('click', () => save({ enabled: prefs.enabled === false }));
  $('style').replaceChildren(...DS.STYLES.map(x => new Option(x.label, x.id)));
  $('font').replaceChildren(...DS.FONTS.map(x => new Option(x.label, x.id)));
  $('style').addEventListener('change', e => save({ style: e.target.value }));
  $('font').addEventListener('change', e => save({ font: e.target.value }));
  $('size').addEventListener('input', e => save({ size: +e.target.value }));
  $('align').addEventListener('change', e => save({ align: e.target.checked }));
  $('bgOpacity').addEventListener('input', e => save({ bgOpacity: +e.target.value }));
  $('lift').addEventListener('input', e => save({ lift: +e.target.value }));
  $('logo').replaceChildren(...DS.LOGO_CORNERS.map(x => new Option(x.label, x.id)));
  $('logo').addEventListener('change', e => save({ logo: e.target.value }));
  for (const b of document.querySelectorAll('.segmented button')) b.addEventListener('click', () => save({ mode: b.dataset.mode }));

  // Same recorder as the popup: click the chip, press a combo, Esc cancels.
  let recording = false;
  const showKey = () => {
    $('key').textContent = recording ? t('Tuşlara bas…') : prefs.toggleKey.replaceAll('+', ' + ');
    $('key').setAttribute('aria-pressed', recording);
  };
  const stopRecording = () => { recording = false; $('keyHint').textContent = ''; showKey(); };
  $('key').addEventListener('click', () => {
    if (recording) return stopRecording();
    recording = true;
    $('keyHint').textContent = t('Yeni tuş kombinasyonuna bas. Vazgeçmek için Esc.');
    showKey();
  });
  $('key').addEventListener('blur', () => recording && stopRecording());
  document.addEventListener('keydown', e => {
    if (!recording || e.key === 'Tab') return;
    e.preventDefault();
    if (e.key === 'Escape') return stopRecording();
    const combo = DS.comboFromEvent(e);
    if (combo) { stopRecording(); save({ toggleKey: combo }); }
    else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) $('keyHint').textContent = t('Ctrl veya Alt ile birlikte bas, tek tuş sayfada yazmayı bozar.');
  });

  // Playback shortcuts: one chip per DS.PLAY_KEYS entry; click, press a combo, Esc cancels. A combo already used elsewhere is refused.
  const keyText = c => c.replaceAll('Arrow', '').replace('Left', '←').replace('Right', '→').replace('Up', '↑').replace('Down', '↓').replaceAll('+', ' + ');
  let recKey = null;
  const hint = t => { $('playKeyHint').textContent = t; };
  const keyChips = DS.PLAY_KEYS.map(k => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<b></b><button type="button" class="keychip"></button>';
    row.firstChild.textContent = k.label;
    const chip = row.lastChild;
    chip.addEventListener('click', () => { recKey = recKey === k ? null : k; hint(recKey ? t('Yeni tuş kombinasyonuna bas. Vazgeçmek için Esc.') : ''); showPlayKeys(); });
    chip.addEventListener('blur', () => { if (recKey === k) { recKey = null; hint(''); showPlayKeys(); } });
    $(k.plain ? 'videoKeys' : 'playKeys').append(row);
    return [k, chip];
  });
  function showPlayKeys() {
    for (const [k, chip] of keyChips) {
      chip.textContent = recKey === k ? t('Tuşlara bas…') : prefs[k.pref] ? keyText(prefs[k.pref]) : t('Atanmadı');
      chip.setAttribute('aria-pressed', recKey === k);
    }
  }
  document.addEventListener('keydown', e => {
    if (!recKey || e.key === 'Tab') return;
    e.preventDefault();
    if (e.key === 'Escape') { recKey = null; hint(''); return showPlayKeys(); }
    if (recKey.plain && (e.key === 'Backspace' || e.key === 'Delete')) { const k = recKey; recKey = null; hint(''); return save({ [k.pref]: '' }); }
    const combo = recKey.plain ? DS.keyFromEvent(e) : DS.comboFromEvent(e);
    if (combo) {
      const clash = combo === prefs.toggleKey ? 'Dil değiştirme' : DS.PLAY_KEYS.find(x => x !== recKey && prefs[x.pref] === combo)?.label;
      if (clash) return hint(t('Bu kombinasyon "{0}" için kullanılıyor.', t(clash)));
      const k = recKey;
      recKey = null; hint('');
      save({ [k.pref]: combo });
    } else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) hint(t('Ctrl veya Alt ile birlikte bas, tek tuş sayfada yazmayı bozar.'));
  });
  $('autoPause').addEventListener('change', e => save({ autoPause: e.target.checked }));
  // Arrow steppers (sarma miktarı, hız adımı): values come from DS.STEPS, never typed.
  for (const box of document.querySelectorAll('.step')) box.addEventListener('click', e => {
    const dir = +e.target.closest('button')?.dataset.dir;
    if (dir) save({ [box.dataset.pref]: DS.stepValue(box.dataset.pref, +prefs[box.dataset.pref], dir) });
  });

  // Saved words (chrome.storage.local 'words', newest first).
  const words = () => chrome.storage.local.get('words').then(r => r.words || []);
  async function renderWords() {
    const list = await words();
    const q = $('wordSearch').value.trim().toLowerCase();
    const shown = q ? list.filter(w => `${w.word} ${w.translation}`.toLowerCase().includes(q)) : list;
    const due = DS.dueWords(list, Date.now(), Infinity).length;
    $('wordCount').textContent = list.length ? t('{0} kelime kayıtlı', list.length) : '';
    $('wordEmpty').hidden = list.length > 0;
    $('wordTools').hidden = !list.length || !!session;
    $('practiceBar').hidden = !list.length || !!session;
    $('practiceLabel').textContent = t(due ? 'Pratik yap' : 'Yine de çalış'); // with nothing due it is free practice
    $('dueNum').textContent = due;
    $('dueNum').hidden = !due;
    $('dueLabel').textContent = t(due ? 'kelime tekrar bekliyor' : 'Bugünlük tekrar yok');
    // Where the words sit in the Leitner boxes: four slots, wider with more words.
    const counts = [1, 2, 3, 4].map(n => list.filter(w => Math.min(4, w.box || 1) === n).length);
    $('shelf').setAttribute('aria-label', counts.map((c, i) => `${t('Kutu {0} / 4', i + 1)}: ${c}`).join(', '));
    $('shelf').replaceChildren(...counts.map((c, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.flexGrow = c + 0.5;
      slot.dataset.box = i + 1;
      slot.classList.toggle('none', !c);
      slot.title = t('Kutu {0} / 4', i + 1);
      slot.innerHTML = '<i></i><small></small>';
      slot.querySelector('small').textContent = c;
      return slot;
    }));
    const rows = shown.map((w, i) => {
      const li = document.createElement('li');
      const n = Math.min(4, w.box || 1);
      li.innerHTML = '<div class="top"><span class="pair"></span><span class="boxes" role="img">' + '<i></i>'.repeat(4) + '</span></div>'
        + '<div class="head"><b></b><button type="button" class="icon-x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
        + '<span class="tr"></span><q></q>';
      li.querySelector('.icon-x').setAttribute('aria-label', t('Sil: {0}', w.word));
      li.querySelector('b').textContent = w.word;
      li.querySelector('.tr').textContent = w.translation;
      li.querySelector('.pair').textContent = `${w.from} → ${w.to}`.toUpperCase();
      li.querySelector('.boxes').setAttribute('aria-label', t('Kutu {0} / 4', n));
      li.querySelectorAll('.boxes i').forEach((d, i) => d.classList.toggle('on', i < n));
      const quote = li.querySelector('q');
      if (!w.context) quote.remove();
      else { // the saved sentence, with the word marked
        const esc = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        w.context.split(new RegExp(`((?<![\\p{L}])${esc}(?![\\p{L}]))`, 'iu')).forEach((part, k) => {
          if (k % 2) { const m = document.createElement('mark'); m.textContent = part; quote.append(m); } else quote.append(part);
        });
      }
      if (!entered) li.style.setProperty('--i', Math.min(i, 11));
      li.querySelector('.icon-x').addEventListener('click', async () => {
        await chrome.storage.local.set({ words: (await words()).filter(x => x.at !== w.at) });
      });
      return li;
    });
    if (list.length && !shown.length) {
      const li = document.createElement('li');
      li.className = 'none';
      li.textContent = t('Eşleşen kelime yok.');
      rows.push(li);
    }
    $('wordList').classList.toggle('enter', !entered);
    entered = true;
    $('wordList').replaceChildren(...rows);
  }
  $('wordSearch').addEventListener('input', renderWords);
  // Practice: a session of due words, answered one by one; every answer moves the word's box and due date (DS.gradeWord) and is stored at once.
  let session = null;
  const P = () => $('practice');
  const pel = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const store = async w => {
    const list = await words();
    await chrome.storage.local.set({ words: list.map(x => (x.at === w.at ? w : x)) });
  };
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  async function startPractice() {
    const s = DS.makeSession(await words(), Date.now(), Math.random, DS.REVIEW_SESSION);
    if (!s.length) return notEnough();
    session = { items: s, i: 0, right: 0, missed: [], results: [], pick: null };
    $('practiceBar').hidden = $('wordTools').hidden = $('wordList').hidden = true;
    P().hidden = false;
    ask();
  }
  // Too few saved words in this language pair to make choices from.
  function notEnough() {
    $('practiceBar').hidden = $('wordTools').hidden = $('wordList').hidden = true;
    P().hidden = false;
    session = null;
    const done = pel('button', 'btn-primary', t('Tamam'));
    done.type = 'button';
    done.addEventListener('click', endPractice);
    const wrap = pel('div', 'p-body');
    wrap.append(pel('p', 'p-ask', t('Bu dilde pratik için en az 4 kelime kaydet.')));
    const foot = pel('div', 'p-foot');
    foot.append(pel('span'), done);
    P().replaceChildren(wrap, foot);
    done.focus();
  }
  function endPractice() {
    session = null;
    P().hidden = true;
    $('wordList').hidden = false;
    renderWords();
  }
  const langName = c => new Intl.DisplayNames([ui()], { type: 'language' }).of(c) || c;
  // The practice card is a video frame: the question is a caption with one line missing, the answers are the candidate lines,
  // and the right one slides into the caption. The dots on top are the timeline, one per question.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const timeline = () => {
    const bar = pel('div', 'p-line');
    bar.setAttribute('aria-hidden', 'true');
    session.items.forEach((_, k) => bar.append(pel('i', k < session.results.length ? (session.results[k] ? 'right' : 'wrong') : k === session.i ? 'now' : '')));
    return bar;
  };
  // The chosen line lifts out of its button and lands in the caption's empty spot, growing to the caption's size and colour,
  // so the hole fills with the very same words. The hole is laid out first (hidden) so the caption does not jump on landing.
  const fly = (chip, hole, text, done) => {
    hole.textContent = text;
    hole.classList.add('filled', 'pending');
    const span = chip.querySelector('span');
    if (reduced.matches || !span.animate) { hole.classList.remove('pending'); return done(); }
    const st = P().getBoundingClientRect(), a = span.getBoundingClientRect(), b = hole.getBoundingClientRect();
    const from = getComputedStyle(span), to = getComputedStyle(hole.parentElement);
    const ghost = pel('span', 'fly', text);
    ghost.style.cssText = `left:${a.left - st.left}px;top:${a.top - st.top}px;width:${a.width}px;height:${a.height}px;font:${from.font};letter-spacing:${from.letterSpacing};line-height:${a.height}px;color:${from.color};`;
    P().append(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), s = b.width / a.width;
    const land = () => {
      ghost.remove();
      hole.classList.remove('pending');
      hole.closest('.cap')?.animate?.([{ transform: 'none' }, { transform: 'scale(1.03)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2, .9, .3, 1.3)' });
      done();
    };
    ghost.animate([
      { transform: 'none', color: from.color, fontWeight: from.fontWeight },
      { transform: `translate(${dx * .5}px, ${dy * .5 - 30}px) scale(${1 + (s - 1) * .5})`, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, color: to.color, fontWeight: to.fontWeight },
    ], { duration: 680, easing: 'cubic-bezier(.3, .6, .25, 1)', fill: 'forwards' }).finished.then(land, land);
  };
  function ask() {
    const { items, i } = session;
    if (i >= items.length) return summary();
    const { word, q, free } = items[i];
    const head = pel('div', 'p-head');
    const quit = pel('button', 'p-quit', t('Bitir'));
    quit.type = 'button';
    quit.addEventListener('click', endPractice);
    head.append(timeline(), pel('span', 'p-count', `${i + 1} / ${items.length}`), quit);
    const kind = {
      cloze: t('Boşluğa hangisi gelir?'),
      choice: t('{0} karşılığı hangisi?', langName(word.to)), reverse: t('{0} karşılığı hangisi?', langName(word.from)),
    }[q.type];
    // The caption: the learned language on top, the native one below, as in the overlay. One spot stays empty.
    const cap = pel('div', q.prompt.length > 24 ? 'cap long' : 'cap');
    const topLine = pel('p', 'cap-line top'), botLine = pel('p', 'cap-line bot');
    const hole = pel('span', 'hole', '···');
    if (q.type === 'choice') { topLine.textContent = q.prompt; botLine.append(hole); }
    else if (q.type === 'reverse') { botLine.textContent = q.prompt; topLine.append(hole); }
    else { const [a, b = ''] = q.prompt.split('____'); topLine.append(a, hole, b); botLine.textContent = q.hint; }
    cap.append(topLine, botLine);
    const body = pel('div', 'p-body');
    body.append(pel('p', 'p-ask', kind), cap);
    const foot = pel('div', 'p-foot');
    foot.setAttribute('aria-live', 'polite');
    // Free practice (nothing was due) leaves the boxes and due dates alone.
    const record = async good => {
      if (!free) await store(DS.gradeWord(word, good, Date.now()));
      session.right += good;
      session.results.push(good);
      if (!good) session.missed.push(word);
    };
    const last = i + 1 >= items.length;
    const finish = async (ok, feedback) => {
      await record(ok);
      const next = pel('button', 'btn-primary', t(last ? 'Sonuç' : 'Sonraki'));
      next.type = 'button';
      next.addEventListener('click', () => { session.i++; ask(); });
      const row = pel('div', 'p-actions');
      row.append(next);
      const msg = pel('p', `p-result ${ok ? 'ok' : 'bad'}`);
      msg.innerHTML = ok ? CHECK : CROSS;
      msg.append(feedback);
      foot.replaceChildren(msg, row);
      next.focus();
    };
    const grid = pel('div', 'p-opts');
    const tiles = q.options.map((o, k) => {
      const b = pel('button', 'p-opt');
      b.type = 'button';
      b.style.setProperty('--k', k);
      b.append(pel('kbd', null, k + 1), pel('span', null, o));
      return b;
    });
    const choose = k => {
      session.pick = null;
      const ok = q.options[k] === q.answer, right = tiles[q.options.indexOf(q.answer)];
      tiles.forEach((b, n) => {
        b.disabled = true;
        if (b === right) b.classList.add('ok'); else if (n === k) b.classList.add('bad'); else b.classList.add('dim');
        if (b === right || n === k) b.querySelector('kbd').innerHTML = b === right ? CHECK : CROSS;
      });
      if (!ok) tiles[k].animate?.([{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
      fly(right, hole, q.answer, () => finish(ok, ok ? t('Doğru') : t('Doğrusu: {0}', q.answer)));
    };
    tiles.forEach((b, k) => b.addEventListener('click', () => choose(k)));
    session.pick = choose;
    grid.append(...tiles);
    body.append(grid);
    P().replaceChildren(head, body, foot);
  }
  const REVIEW_URL = 'https://chromewebstore.google.com/detail/dual-subtitles-looptions/jijepgjadamcdinhnbimmegagddommoe/reviews';

  async function summary() {
    const { items, right, missed } = session;
    const free = items[0].free;
    const done = pel('button', 'btn-primary', t('Tamam'));
    done.type = 'button';
    done.addEventListener('click', endPractice);
    const score = pel('p', 'p-score');
    score.append(pel('output', null, right), pel('span', null, `/ ${items.length}`));
    const wrap = pel('div', 'p-body p-sum');
    wrap.append(score, pel('p', 'p-ask', t(missed.length ? 'Doğru' : 'Hepsini bildin.')), timeline());
    if (missed.length) {
      wrap.append(pel('p', 'p-ask p-missed-h', t(free ? 'Takıldıkların' : 'Yarın tekrar')));
      const list = pel('ul', 'p-missed');
      for (const w of missed) {
        const li = pel('li', 'cap mini');
        li.append(pel('b', 'cap-line top', w.word), pel('span', 'cap-line bot', w.translation));
        list.append(li);
      }
      wrap.append(list);
    }
    if (free) wrap.append(pel('p', 'p-note', t('Serbest pratik: tekrar takvimi değişmedi.')));
    const foot = pel('div', 'p-foot');
    foot.append(pel('span'), done);
    P().replaceChildren(wrap, foot);
    done.focus();

    // Count finished sessions locally; ask once for a Store review after the second finished session.
    const meta = await chrome.storage.local.get(['practiceCount', 'reviewDismissed']);
    const nextCount = (meta.practiceCount || 0) + 1;
    chrome.storage.local.set({ practiceCount: nextCount });
    if (DS.shouldAskReview({ practiceCount: nextCount, reviewDismissed: meta.reviewDismissed })) {
      const row = pel('div', 'p-review');
      const dismiss = () => { chrome.storage.local.set({ reviewDismissed: true }); row.remove(); };
      const link = pel('a', 'p-review-link', t('Mağazada değerlendir'));
      link.href = REVIEW_URL;
      link.target = '_blank';
      link.rel = 'noopener';
      link.addEventListener('click', dismiss);
      const skip = pel('button', 'p-review-skip', t('Şimdi değil'));
      skip.type = 'button';
      skip.addEventListener('click', dismiss);
      const actions = pel('span', 'p-review-actions');
      actions.append(link, skip);
      row.append(pel('span', null, t('Looptions işine yarıyorsa kısa bir değerlendirme diğerlerinin bizi bulmasına yardımcı olur.')), actions);
      wrap.append(row);
    }
  }
  // 1-4 pick an option while a question with options is open.
  document.addEventListener('keydown', e => {
    if (!session?.pick || e.ctrlKey || e.metaKey || e.altKey || !/^[1-4]$/.test(e.key)) return;
    if (+e.key <= session.items[session.i].q.options.length) { e.preventDefault(); session.pick(+e.key - 1); }
  });
  const download = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('exportCsv').addEventListener('click', async () => download('looptions-kelimeler.csv', DS.toCsv(await words()), 'text/csv;charset=utf-8'));
  $('exportAnki').addEventListener('click', async () => download('looptions-anki.txt', DS.toAnki(await words()), 'text/plain;charset=utf-8'));
  $('exportPdf').addEventListener('click', () => window.open('export.html', '_blank'));
  $('practiceBtn').addEventListener('click', startPractice);

  // Two clicks instead of a native confirm(): the first arms the button, the second deletes.
  let armed = 0;
  const disarm = () => { clearTimeout(armed); armed = 0; $('wordClear').textContent = t('Hepsini sil'); };
  $('wordClear').addEventListener('click', () => {
    if (!armed) { armed = setTimeout(disarm, 4000); $('wordClear').textContent = t('Geri alınamaz, tekrar tıkla'); return; }
    disarm();
    chrome.storage.local.set({ words: [] });
  });
  $('wordClear').addEventListener('blur', disarm);

  // Sites: prefs.sites[host] = { ext, quiz } (a missing key means on). The list also shows sites where Looptions already ran
  // (chrome.storage.local 'seenSites', written by the content script, never sent anywhere). Logos come from Chrome's own favicon cache.
  let seen = {};
  const faviconUrl = host => {
    const u = new URL(chrome.runtime.getURL('/_favicon/'));
    u.searchParams.set('pageUrl', `https://${host}`);
    u.searchParams.set('size', '32');
    return u.toString();
  };
  const ago = ts => {
    const d = Math.floor((Date.now() - ts) / 864e5);
    return d <= 0 ? t('Bugün kullanıldı') : d === 1 ? t('Dün kullanıldı') : t('{0} gün önce kullanıldı', d);
  };
  function renderSites() {
    const hosts = [...new Set([...Object.keys(prefs.sites || {}), ...Object.keys(seen)])]
      .sort((a, b) => (seen[b] || 0) - (seen[a] || 0) || a.localeCompare(b));
    $('siteEmpty').hidden = hosts.length > 0;
    $('siteList').replaceChildren(...hosts.map(h => {
      const li = document.createElement('li');
      li.innerHTML = '<div class="site-head"><span class="logo"><span class="mono"></span><img alt="" width="32" height="32"></span>'
        + '<div><b></b><small></small></div>'
        + '<button type="button" class="icon-x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
        + `<label>${t('Eklenti')} <input type="checkbox" class="switch" role="switch" data-key="ext"></label>`
        + `<label>${t('Kelime testi')} <input type="checkbox" class="switch" role="switch" data-key="quiz"></label>`;
      li.querySelector('b').textContent = h;
      li.querySelector('small').textContent = seen[h] ? ago(seen[h]) : t('Elle eklendi');
      li.querySelector('.mono').textContent = h[0].toUpperCase();
      const img = li.querySelector('img');
      img.src = faviconUrl(h);
      img.addEventListener('error', () => img.remove());
      li.querySelector('.icon-x').setAttribute('aria-label', t('Sitelerden kaldır: {0}', h));
      for (const i of li.querySelectorAll('input')) {
        i.checked = DS.siteOn(prefs, h, i.dataset.key);
        i.addEventListener('change', () => save({ sites: DS.setSite(prefs.sites, h, i.dataset.key, i.checked) }));
      }
      li.querySelector('.icon-x').addEventListener('click', async () => {
        const { [h]: _, ...rest } = prefs.sites || {};
        const { [h]: __, ...rest2 } = seen;
        seen = rest2;
        await chrome.storage.local.set({ seenSites: seen });
        save({ sites: rest });
      });
      return li;
    }));
  }
  chrome.storage.local.get('seenSites').then(r => { seen = r.seenSites || {}; renderSites(); });
  $('siteForm').addEventListener('submit', e => {
    e.preventDefault();
    const h = DS.siteHost(/^[a-z]+:\/\//i.test($('siteInput').value.trim()) ? $('siteInput').value.trim() : 'https://' + $('siteInput').value.trim());
    if (!h || !h.includes('.')) return $('siteInput').setCustomValidity(t('Geçerli bir site adresi yaz.')), $('siteInput').reportValidity();
    $('siteInput').setCustomValidity('');
    $('siteInput').value = '';
    if (!prefs.sites?.[h]) save({ sites: DS.setSite(prefs.sites, h, 'ext', true) });
  });
  $('siteInput').addEventListener('input', () => $('siteInput').setCustomValidity(''));

  // Each dock link is its own page: show only the section named by the hash (default: first).
  const secs = [...document.querySelectorAll('.sec')];
  const showPage = () => {
    const id = secs.some(s => s.id === location.hash.slice(1)) ? location.hash.slice(1) : secs[0].id;
    for (const s of secs) s.classList.toggle('on', s.id === id);
    for (const a of document.querySelectorAll('.dock a')) a.setAttribute('aria-current', a.dataset.sec === id);
    scrollTo(0, 0);
  };
  addEventListener('hashchange', showPage);
  showPage();

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.words) renderWords();
    if (area === 'local' && ch.seenSites) { seen = ch.seenSites.newValue || {}; renderSites(); }
    if (area === 'sync' && ch.prefs) { prefs = DS.mergePrefs(ch.prefs.newValue); render(); }
  });
  render();
  renderWords();
})();
