(async () => {
  const DS = globalThis.DS;
  const $ = id => document.getElementById(id);
  const SAMPLE = DS.SAMPLE;
  const fmtOffset = DS.fmtOffset;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabKey = 't' + tab.id;
  let prefs = DS.mergePrefs((await chrome.storage.sync.get('prefs')).prefs);
  let data = (await chrome.storage.session.get(tabKey))[tabKey] || { tracks: [], sel: {} };

  const savePrefs = patch => { prefs = { ...prefs, ...patch }; chrome.storage.sync.set({ prefs }); render(); };
  const saveSel = patch => {
    data.sel = { ...data.sel, ...patch };
    chrome.runtime.sendMessage({ type: 'setSel', tabId: tab.id, sel: data.sel });
    render();
  };

  // Text set once at startup stays Turkish and DS.localize (end of render) translates it; text set later goes through t().
  const ui = () => DS.uiLang(prefs);
  const t = (s, ...a) => DS.t(s, ui(), ...a);
  const langName = code => { try { return code ? new Intl.DisplayNames([ui()], { type: 'language' }).of(code) : ''; } catch { return ''; } };
  let tracks = [];

  function fillSelect(el, chosen) {
    const opts = [new Option(t('Kapalı'), 'none')];
    for (const t of tracks) {
      const name = langName(t.lang) || DS.t('Dil bilinmiyor', ui());
      // Track label only when the language alone is ambiguous; keeps the tile title short.
      const twin = tracks.some(x => x !== t && x.lang === t.lang);
      opts.push(new Option(twin && t.label !== name ? `${name} · ${t.label}` : name, t.id));
    }
    el.replaceChildren(...opts);
    el.value = chosen ? chosen.id : 'none';
    el.disabled = !tracks.length;
  }

  function render() {
    tracks = data.tracks;
    const [p, s] = DS.pickTracks(tracks, data.sel, prefs);
    const n = data.tracks.length;
    const on = prefs.enabled !== false;
    $('enabled').setAttribute('aria-checked', on);
    $('controls').inert = !on;
    $('powerLabel').textContent = t(on ? 'Açık' : 'Kapalı');
    $('status').textContent = !on ? t('Gösterilmiyor') : n ? t('{0} altyazı bulundu', n) : t('Altyazı bekleniyor');
    $('empty').hidden = n > 0;
    fillSelect($('primary'), p);
    fillSelect($('secondary'), s);
    $('offsetPrimary').value = fmtOffset(data.sel.offsetPrimary || 0, ui());
    $('offsetSecondary').value = fmtOffset(data.sel.offsetSecondary || 0, ui());

    const sample = (t, fallback) => t ? SAMPLE[t.lang] || langName(t.lang) || t.label : fallback;
    $('pvPrimary').textContent = sample(p, n ? '' : SAMPLE[prefs.primary] || '');
    $('pvSecondary').textContent = sample(s, n ? '' : SAMPLE[prefs.secondary] || '');
    $('frame').dataset.mode = prefs.mode;
    $('frame').style.setProperty('--s', prefs.size / 100);
    for (const [k, v] of Object.entries(DS.lookVars(prefs))) $('frame').style.setProperty(k, v);
    $('style').value = prefs.style;
    $('font').value = prefs.font;

    for (const b of document.querySelectorAll('.segmented button')) b.setAttribute('aria-pressed', b.dataset.mode === prefs.mode);
    $('shortcut').hidden = prefs.mode !== 'swap';
    $('align').checked = prefs.align !== false;
    $('size').value = prefs.size;
    $('sizeOut').value = prefs.size;
    $('bgOpacity').value = prefs.bgOpacity;
    $('bgOpacityOut').value = prefs.bgOpacity + '%';
    $('lift').value = prefs.lift;
    $('liftOut').value = prefs.lift + '%';
    $('logo').value = prefs.logo;
    $('quizGroup').hidden = !DS.quizPair(prefs);
    $('preQuiz').checked = prefs.preQuiz !== false;
    $('level').value = prefs.level;
    $('quizSize').value = DS.quizSize(prefs);
    showKey();
    for (const box of document.querySelectorAll('.step')) box.querySelector('output').value = String(prefs[box.dataset.pref]).replace('.', ',');
    showVideoKeys();
    showWords(wordN);
    document.documentElement.lang = ui();
    DS.localize(document.body, ui());
  }

  for (const role of ['primary', 'secondary']) {
    $(role).addEventListener('change', e => {
      const t = tracks.find(x => x.id === e.target.value);
      saveSel({ [role + 'Id']: e.target.value });
      if (t?.lang && DS.LANGS.includes(t.lang)) savePrefs({ [role]: t.lang }); // remembered for the next video
    });
  }
  for (const b of document.querySelectorAll('.stepper button')) {
    b.addEventListener('click', () => {
      const k = 'offset' + b.dataset.slot;
      saveSel({ [k]: Math.round(((data.sel[k] || 0) + +b.dataset.step) * 100) / 100 });
    });
  }
  for (const b of document.querySelectorAll('.segmented button')) {
    b.addEventListener('click', () => savePrefs({ mode: b.dataset.mode }));
  }
  $('more').addEventListener('click', () => chrome.runtime.openOptionsPage());
  // Badge on the notebook button: saved-word count, hidden at zero.
  let wordN = 0;
  const showWords = n => {
    wordN = n;
    const b = $('more'), label = n ? t('Kelime defteri ({0} kelime) ve gelişmiş ayarlar', n) : t('Kelime defteri ve gelişmiş ayarlar');
    if (n) b.dataset.count = n > 99 ? '99+' : n; else delete b.dataset.count;
    b.setAttribute('aria-label', label);
    b.title = label;
  };
  showWords(((await chrome.storage.local.get('words')).words || []).length);
  $('enabled').addEventListener('click', () => savePrefs({ enabled: prefs.enabled === false }));
  $('style').replaceChildren(...DS.STYLES.map(x => new Option(x.label, x.id)));
  $('font').replaceChildren(...DS.FONTS.map(x => new Option(x.label, x.id)));
  $('style').addEventListener('change', e => savePrefs({ style: e.target.value }));
  $('font').addEventListener('change', e => savePrefs({ font: e.target.value }));
  $('size').addEventListener('input', e => savePrefs({ size: +e.target.value }));
  $('align').addEventListener('change', e => savePrefs({ align: e.target.checked }));
  $('bgOpacity').addEventListener('input', e => savePrefs({ bgOpacity: +e.target.value }));
  $('lift').addEventListener('input', e => savePrefs({ lift: +e.target.value }));
  $('logo').replaceChildren(...DS.LOGO_CORNERS.map(x => new Option(x.label, x.id)));
  $('logo').addEventListener('change', e => savePrefs({ logo: e.target.value }));
  $('level').replaceChildren(...DS.LEVELS.map((l, i) => new Option(DS.LEVEL_LABELS[i], l)));
  $('level').addEventListener('change', e => { chrome.storage.local.remove('ability'); savePrefs({ level: e.target.value }); });
  $('quizSize').replaceChildren(...DS.QUIZ_SIZES.map(n => new Option(n, n)));
  $('quizSize').addEventListener('change', e => savePrefs({ quizSize: +e.target.value }));
  $('preQuiz').addEventListener('change', e => savePrefs({ preQuiz: e.target.checked }));
  // Shortcut is recorded right here: click the key chip, press a combo. Esc cancels.
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
    const combo = DS.comboFromEvent(e);
    if (recording) {
      if (e.key === 'Tab') return;
      e.preventDefault();
      if (e.key === 'Escape') return stopRecording();
      if (combo) { stopRecording(); savePrefs({ toggleKey: combo }); }
      else if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) $('keyHint').textContent = t('Ctrl veya Alt ile birlikte bas, tek tuş sayfada yazmayı bozar.');
      return;
    }
    // Preview follows the shortcut too, so the swap is visible here before trying it on the video.
    if (combo && combo === prefs.toggleKey) $('frame').dataset.show = $('frame').dataset.show === 'primary' ? 'secondary' : 'primary';
  });

  // Video speed / seek keys: bare keys allowed (they only fire outside text fields). Click a chip, press a key; Backspace clears, Esc cancels.
  const vKeys = DS.PLAY_KEYS.filter(k => k.plain);
  let recVideo = null;
  const vHint = t => { $('videoKeyHint').textContent = t; };
  const vChips = vKeys.map(k => {
    const row = document.createElement('div');
    row.className = 'shortcut-row';
    row.innerHTML = '<span></span><button type="button" class="keychip"></button>';
    row.firstChild.textContent = k.label;
    const chip = row.lastChild;
    chip.addEventListener('click', () => { recVideo = recVideo === k ? null : k; vHint(recVideo ? t('Bir tuşa bas. Silmek için Backspace, vazgeçmek için Esc.') : ''); showVideoKeys(); });
    chip.addEventListener('blur', () => { if (recVideo === k) { recVideo = null; vHint(''); showVideoKeys(); } });
    $('videoKeys').append(row);
    return [k, chip];
  });
  function showVideoKeys() {
    for (const [k, chip] of vChips) {
      chip.textContent = recVideo === k ? t('Tuşlara bas…') : prefs[k.pref] ? prefs[k.pref].replaceAll('Arrow', '').replaceAll('+', ' + ') : t('Atanmadı');
      chip.setAttribute('aria-pressed', recVideo === k);
    }
  }
  document.addEventListener('keydown', e => {
    if (!recVideo || e.key === 'Tab') return;
    e.preventDefault();
    const k = recVideo;
    if (e.key === 'Escape') { recVideo = null; vHint(''); return showVideoKeys(); }
    if (e.key === 'Backspace' || e.key === 'Delete') { recVideo = null; vHint(''); return savePrefs({ [k.pref]: '' }); }
    const combo = DS.keyFromEvent(e);
    if (!combo) return;
    const clash = combo === prefs.toggleKey ? 'Dil değiştirme' : DS.PLAY_KEYS.find(x => x !== k && prefs[x.pref] === combo)?.label;
    if (clash) return vHint(t('Bu tuş "{0}" için kullanılıyor.', t(clash)));
    recVideo = null; vHint('');
    savePrefs({ [k.pref]: combo });
  });
  // Arrow steppers (sarma miktarı, hız adımı): values come from DS.STEPS, never typed.
  for (const box of document.querySelectorAll('.step')) box.addEventListener('click', e => {
    const dir = +e.target.closest('button')?.dataset.dir;
    if (dir) savePrefs({ [box.dataset.pref]: DS.stepValue(box.dataset.pref, +prefs[box.dataset.pref], dir) });
  });

  // Floating scroll thumb (the native bar is hidden in CSS): shown while scrolling.
  const thumb = Object.assign(document.createElement('div'), { className: 'thumb' });
  document.body.append(thumb);
  let scrollTimer = 0;
  addEventListener('scroll', () => {
    const el = document.documentElement, view = el.clientHeight, all = el.scrollHeight;
    if (all <= view) return;
    const h = Math.max(40, view * view / all);
    thumb.style.height = h + 'px';
    thumb.style.top = (el.scrollTop / (all - view)) * (view - h) + 'px';
    thumb.classList.add('on');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => thumb.classList.remove('on'), 900);
  }, { passive: true });

  // New tracks keep arriving while the video loads.
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'session' && ch[tabKey]) { data = ch[tabKey].newValue || { tracks: [], sel: {} }; render(); }
    if (area === 'local' && ch.words) showWords((ch.words.newValue || []).length);
    if (area === 'sync' && ch.prefs) { prefs = DS.mergePrefs(ch.prefs.newValue); render(); }
  });

  render();
})();
