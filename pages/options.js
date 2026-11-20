// Advanced settings: the same prefs the popup edits, plus room for the word notebook.
(async () => {
  const DS = globalThis.DS;
  const $ = id => document.getElementById(id);
  let prefs = DS.mergePrefs((await chrome.storage.sync.get('prefs')).prefs);
  // Text set once at startup stays Turkish and DS.localize (end of render) translates it; text set later goes through t().
  const ui = () => DS.uiLang(prefs);
  const t = (s, ...a) => DS.t(s, ui(), ...a);
  let wordsLang = '';
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
    $('practiceBtn').disabled = !due;
    $('dueNum').textContent = due;
    $('dueLabel').textContent = t(due ? 'kelime tekrar bekliyor' : 'Bugünlük tekrar yok');
    const rows = shown.map(w => {
      const li = document.createElement('li');
      const n = Math.min(4, w.box || 1);
      li.innerHTML = '<div class="main"><b></b><span class="tr"></span></div><q></q>'
        + '<div class="meta"><span class="pair"></span><span class="boxes" role="img">' + '<i></i>'.repeat(4) + '</span>'
        + '<button type="button" class="icon-x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
      li.querySelector('.icon-x').setAttribute('aria-label', t('Sil: {0}', w.word));
      li.querySelector('b').textContent = w.word;
      li.querySelector('.tr').textContent = w.translation;
      li.querySelector('.pair').textContent = `${w.from} → ${w.to}`.toUpperCase();
      li.querySelector('.boxes').setAttribute('aria-label', t('Kutu {0} / 4', n));
      li.querySelectorAll('.boxes i').forEach((d, i) => d.classList.toggle('on', i < n));
      const quote = li.querySelector('q');
      w.context ? (quote.textContent = w.context) : quote.remove();
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
  async function startPractice() {
    const s = DS.makeSession(await words(), Date.now());
    if (!s.length) return;
    session = { items: s, i: 0, right: 0, missed: [] };
    $('practiceBar').hidden = $('wordTools').hidden = $('wordList').hidden = true;
    P().hidden = false;
    ask();
  }
  function endPractice() {
    session = null;
    P().hidden = true;
    $('wordList').hidden = false;
    renderWords();
  }
  function ask() {
    const { items, i } = session;
    if (i >= items.length) return summary();
    const { word, q } = items[i];
    const top = pel('div', 'p-top');
    const quit = pel('button', null, t('Bitir'));
    quit.type = 'button';
    quit.addEventListener('click', endPractice);
    top.append(pel('span', null, `${i + 1} / ${items.length}`), quit);
    const kind = t(q.type === 'cloze' ? 'Boşluğa hangi kelime gelir?' : q.type === 'choice' ? 'Türkçesi hangisi?' : 'Anlamını hatırlıyor musun?');
    const box = [top, pel('p', 'p-ask', kind), pel('p', 'p-prompt', q.prompt)];
    if (q.hint) box.push(pel('p', 'p-ask', t('İpucu: {0}', q.hint)));
    const answer = async ok => {
      const done = DS.gradeWord(word, ok, Date.now());
      await store(done);
      session.right += ok;
      if (!ok) session.missed.push(word.word);
    };
    const next = () => { session.i++; ask(); };
    if (q.options) {
      const row = pel('div', 'p-opts');
      for (const o of q.options) {
        const b = pel('button', null, o);
        b.type = 'button';
        b.addEventListener('click', async () => {
          const ok = o === q.answer;
          for (const x of row.children) { x.disabled = true; if (x.textContent === q.answer) x.className = 'ok'; }
          if (!ok) b.className = 'bad';
          await answer(ok);
          const n = pel('button', 'p-next', t(session.i + 1 >= items.length ? 'Sonuç' : 'Sonraki'));
          n.type = 'button';
          n.addEventListener('click', next);
          box.push(n);
          P().replaceChildren(...box);
          n.focus();
        });
        row.append(b);
      }
      box.push(row);
    } else {
      const show = pel('button', 'p-next', t('Cevabı göster'));
      show.type = 'button';
      show.addEventListener('click', () => {
        const yes = pel('button', 'p-next', t('Biliyordum')), no = pel('button', 'p-next', t('Bilmiyordum'));
        for (const [b, ok] of [[yes, true], [no, false]]) { b.type = 'button'; b.addEventListener('click', async () => { await answer(ok); next(); }); }
        P().replaceChildren(...box.filter(x => x !== show), pel('p', 'p-answer', q.answer), yes, no);
        yes.focus();
      });
      box.push(show);
    }
    P().replaceChildren(...box);
    box.at(-1).focus();
  }
  function summary() {
    const { items, right, missed } = session;
    const done = pel('button', 'p-next', t('Tamam'));
    done.type = 'button';
    done.addEventListener('click', endPractice);
    P().replaceChildren(pel('p', 'p-prompt', t('{0} / {1} doğru', right, items.length)),
      pel('p', 'p-ask', missed.length ? t('Yarın tekrar: {0}', missed.join(', ')) : t('Hepsini bildin.')), done);
    done.focus();
  }
  const download = (name, text, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('exportCsv').addEventListener('click', async () => download('looptions-kelimeler.csv', DS.toCsv(await words()), 'text/csv;charset=utf-8'));
  $('exportAnki').addEventListener('click', async () => download('looptions-anki.txt', DS.toAnki(await words()), 'text/plain;charset=utf-8'));
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
  const ago = t => {
    const d = Math.floor((Date.now() - t) / 864e5);
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
