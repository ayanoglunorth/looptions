// First-run setup: native language, learned language, look. Every choice is saved as it is made.
(async () => {
  const DS = globalThis.DS;
  const $ = id => document.getElementById(id);
  const ownName = c => new Intl.DisplayNames([c], { type: 'language' }).of(c);

  const stored = (await chrome.storage.sync.get('prefs')).prefs;
  // The page speaks the native language (DS.uiLang). Fresh install guesses it from the browser; English then learns Turkish until step 2.
  let prefs = DS.mergePrefs(stored);
  const guess = chrome.i18n.getUILanguage().slice(0, 2);
  if (!stored && DS.LANGS.includes(guess) && guess !== prefs.secondary)
    prefs = { ...prefs, secondary: guess, ...(guess === prefs.primary && { primary: prefs.secondary }) };
  let ui = DS.uiLang(prefs);
  const t = (s, ...a) => DS.t(s, ui, ...a);
  const trName = { of: c => new Intl.DisplayNames([ui], { type: 'language' }).of(c) };
  const save = patch => {
    if (patch.secondary === prefs.primary) patch.primary = prefs.secondary; // never the same language twice
    prefs = { ...prefs, ...patch }; chrome.storage.sync.set({ prefs }); render(); };

  const STAGE = [
    ['Hoş geldin', 'Birkaç soruyla iki dilli altyazıyı sana göre ayarlıyoruz.'],
    ['Hangi dil?', 'Öğrendiğin dil üstte büyük, ana dilin altta küçük durur.'],
    ['Seviyen', 'Seviyene göre, videodaki yeni kelimeler video başlamadan önce sorulur.'],
    ['Görünüm', 'Tuşla geçiş modunda tek satır görünür, istediğinde diğer dile geçersin.'],
    ['Hazır', 'Bir video aç, altyazıyı oynatıcıdan bir kez aç.'],
  ];
  let step = 0;

  // The level step (vocabulary quiz) exists only for Turkish speakers learning English; everyone else skips it.
  const LEVEL_STEP = 2;
  const hasLevel = () => DS.quizPair(prefs);
  const move = dir => { const n = step + dir; return n === LEVEL_STEP && !hasLevel() ? n + dir : n; };

  // Placement test (DS.placementStart): words first, then cloze sentences. It only moves the level select and stores the
  // ability estimate; answers themselves are not kept.
  let place = null;
  function showPlace() {
    $('placeIntro').hidden = !!place;
    $('placeRun').hidden = !place;
    $('levelFields').hidden = !!place; // while the test runs, nothing else competes for attention
    if (!place) return;
    const it = place.current, cloze = it.kind === 'cloze';
    $('placeWordBox').hidden = cloze;
    $('placeClozeBox').hidden = !cloze;
    $('placeBack').hidden = !place.canBack();
    $('placeCount').textContent = cloze ? `${t('Cümleler')} · ${place.n + 1} / ${place.clozeTotal}` : `${t('Kelimeler')} · ${place.n + 1}`;
    if (!cloze) return void ($('placeWord').textContent = it.word);
    $('placeQ').textContent = it.q;
    $('placeOpts').replaceChildren(...it.options.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o;
      b.addEventListener('click', () => answerPlace(i));
      return b;
    }));
  }
  function answerPlace(value) {
    place.answer(value);
    if (place.phase !== 'done') return showPlace();
    const { level, state } = place;
    place = null;
    showPlace();
    $('placeResult').textContent = t('Seviyen {0} gibi görünüyor. Aşağıdan değiştirebilirsin.', level);
    $('placeResult').hidden = false;
    $('placeStart').hidden = true; // one run per visit: no accidental redo
    chrome.storage.local.set({ ability: state });
    save({ level });
  }

  function tiles(el, role) {
    el.replaceChildren(...DS.LANGS.map(c => {
      const own = ownName(c);
      const l = document.createElement('label');
      l.className = 'lang';
      l.innerHTML = `<input type="radio" name="${role}" value="${c}"><span class="code" lang="en">${c}</span>
        <span><b></b><small></small></span>`;
      l.querySelector('b').textContent = trName.of(c);
      l.querySelector('small').textContent = own;
      l.querySelector('small').lang = c;
      return l;
    }));
  }
  for (const [id, role] of [['native', 'secondary'], ['learn', 'primary']]) $(id).addEventListener('change', e => save({ [role]: e.target.value }));
  const buildTiles = () => { tiles($('native'), 'secondary'); tiles($('learn'), 'primary'); };
  buildTiles();

  function render() {
    if (ui !== DS.uiLang(prefs)) { ui = DS.uiLang(prefs); buildTiles(); }
    for (const s of document.querySelectorAll('.wstep')) s.hidden = +s.dataset.step !== step;
    for (const i of $('native').elements) i.checked = i.value === prefs.secondary;
    for (const i of $('learn').elements) {
      i.checked = i.value === prefs.primary;
      i.disabled = i.value === prefs.secondary;
      i.closest('.lang').querySelector('.tag')?.remove();
      if (i.disabled) i.closest('.lang').insertAdjacentHTML('beforeend', `<span class="tag">${t('Ana dilin')}</span>`);
    }
    document.documentElement.lang = ui;
    document.title = t("Looptions'a hoş geldin");
    DS.localize(document.body, ui);
    $('badge').textContent = t(STAGE[step][0]);
    $('note').textContent = t(STAGE[step][1]);
    for (const [id, list] of [['style', DS.STYLES], ['font', DS.FONTS]]) [...$(id).options].forEach((o, i) => { o.text = t(list[i].label); });
    [...$('level').options].forEach((o, i) => { o.text = t(DS.LEVEL_LABELS[i]); });

    $('ssA').textContent = DS.SAMPLE[prefs.primary];
    $('ssB').textContent = DS.SAMPLE[prefs.secondary];
    $('sceneLevels').hidden = !hasLevel() || step < LEVEL_STEP;
    for (const s of $('sceneLevels').children) s.classList.toggle('on', s.textContent === prefs.level);
    $('pvPrimary').textContent = DS.SAMPLE[prefs.primary];
    $('pvSecondary').textContent = DS.SAMPLE[prefs.secondary];
    $('frame').dataset.mode = prefs.mode;
    $('frame').style.setProperty('--s', prefs.size / 100);
    for (const b of document.querySelectorAll('.segmented button')) b.setAttribute('aria-pressed', b.dataset.mode === prefs.mode);
    for (const [k, v] of Object.entries(DS.lookVars(prefs))) $('frame').style.setProperty(k, v);
    $('style').value = prefs.style;
    $('font').value = prefs.font;
    $('shortcut').hidden = prefs.mode !== 'swap';
    showKey();
    $('size').value = prefs.size;
    $('sizeOut').value = '%' + prefs.size;
    $('doneTitle').textContent = t('{0} öğrenmeye hazırsın.', trName.of(prefs.primary));

    $('level').value = prefs.level;
    $('quizSize').value = DS.quizSize(prefs);
    $('preQuiz').checked = !!prefs.preQuiz;
    let n = 0;
    $('steps').querySelectorAll('li').forEach((li, i) => {
      li.hidden = i === LEVEL_STEP && !hasLevel();
      if (!li.hidden) li.firstChild.textContent = ++n;
      if (i === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      li.classList.toggle('done', i < step);
    });
    $('back').disabled = step === 0;
    const last = step === STAGE.length - 1;
    $('next').setAttribute('aria-label', t(last ? 'Kurulumu bitir' : 'İleri'));
    $('nextIcon').setAttribute('d', last ? 'M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z' : 'M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z');
  }

  function go(to) {
    step = to;
    place = null;
    $('placeResult').hidden = true;
    $('placeStart').hidden = false;
    showPlace();
    $('badge').classList.remove('pop');
    void $('badge').offsetWidth; // restart the pop animation
    $('badge').classList.add('pop');
    render();
  }

  // Closing works because the extension opened this tab; a manually opened one falls back to settings.
  const finish = async () => {
    const tab = await chrome.tabs.getCurrent();
    tab ? chrome.tabs.remove(tab.id) : location.assign('options.html');
  };

  $('flow').addEventListener('submit', e => { e.preventDefault(); step < STAGE.length - 1 ? go(move(1)) : finish(); });
  $('back').addEventListener('click', () => go(move(-1)));
  $('sceneLevels').replaceChildren(...DS.LEVELS.map(l => Object.assign(document.createElement('span'), { textContent: l })));
  $('level').replaceChildren(...DS.LEVELS.map((l, i) => new Option(DS.LEVEL_LABELS[i], l)));
  $('level').addEventListener('change', e => { chrome.storage.local.remove('ability'); save({ level: e.target.value }); });
  $('quizSize').replaceChildren(...DS.QUIZ_SIZES.map(n => new Option(n, n)));
  $('preQuiz').addEventListener('change', e => save({ preQuiz: e.target.checked }));
  $('quizSize').addEventListener('change', e => save({ quizSize: +e.target.value }));
  $('placeStart').addEventListener('click', () => {
    place = DS.placementStart();
    $('placeResult').hidden = true;
    showPlace();
  });
  $('placeSkip').addEventListener('click', () => answerPlace(-1));
  $('placeBack').addEventListener('click', () => { place.back(); showPlace(); });
  $('placeYes').addEventListener('click', () => answerPlace(true));
  $('placeNo').addEventListener('click', () => answerPlace(false));
  $('skip').addEventListener('click', finish);
  for (const b of document.querySelectorAll('.segmented button')) b.addEventListener('click', () => save({ mode: b.dataset.mode }));
  $('size').addEventListener('input', e => save({ size: +e.target.value }));
  $('style').replaceChildren(...DS.STYLES.map(x => new Option(x.label, x.id)));
  $('font').replaceChildren(...DS.FONTS.map(x => new Option(x.label, x.id)));
  $('style').addEventListener('change', e => save({ style: e.target.value }));
  $('font').addEventListener('change', e => save({ font: e.target.value }));

  // Same key recorder as the popup: click the chip, press a combo, Esc cancels.
  let recording = false;
  function showKey() {
    $('key').textContent = recording ? t('Tuşlara bas…') : prefs.toggleKey.replaceAll('+', ' + ');
    $('key').setAttribute('aria-pressed', recording);
  }
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

  chrome.storage.sync.set({ prefs }); // the native-language guess counts even if the user skips
  go(0);
})();
