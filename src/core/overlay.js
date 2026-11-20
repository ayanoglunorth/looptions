// Two-line subtitle layer drawn over a <video>. Lives in a closed shadow root so page CSS cannot touch it.
(() => {
  const DS = (globalThis.DS ||= {});

  // Same look on every site. The user's font and style arrive as --custom properties on the host (DS.lookVars);
  // the fallbacks below are the "Standart" look. Page styles cannot reach the closed shadow root.
  const FONT = '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  const CSS = `
    :host { all: initial; }
    /* One caption box holds both lines. */
    .stack {
      position: absolute; left: 50%; bottom: var(--bottom, 6%); transform: translateX(-50%);
      width: max-content; max-width: min(40em, 90%);
      display: grid; justify-items: center; gap: var(--gap, .16em);
      padding: var(--pad, .16em .6em .22em); border-radius: var(--rad, .35em); background: var(--bg, rgba(10, 10, 12, .76));
      font: var(--fw, 600) 1em/1.3 var(--ff, ${FONT}); font-synthesis: none; letter-spacing: 0;
      text-align: center; color: var(--c1, #fff); -webkit-font-smoothing: antialiased;
    }
    .stack:not(:has(.line:not(:empty))) { display: none; }
    .line { display: block; padding: var(--lpad, 0); border-radius: var(--rad, 0); background: var(--lbg, transparent);
      text-shadow: var(--shadow, none); -webkit-text-stroke: var(--stroke, 0) var(--edge, #000); paint-order: stroke fill;
      white-space: pre-line; overflow-wrap: anywhere; transition: opacity 140ms cubic-bezier(.2,.7,.2,1); }
    .line:empty { display: none; }
    .secondary { color: var(--c2, #f5d547); font-size: .84em; font-weight: 500; }
    /* Swap mode: the hidden line leaves the flow so the box fits the visible one, and the two cross-fade. */
    .stack[data-mode="swap"] .line { font-size: 1em; font-weight: inherit; }
    .stack[data-mode="swap"][data-show="primary"] .secondary,
    .stack[data-mode="swap"][data-show="secondary"] .primary { position: absolute; inset: auto .6em .22em; opacity: 0; }
    /* Words are the only click targets; spaces and the rest of the box still pass clicks to the player. */
    .w { pointer-events: auto; cursor: pointer; border-radius: .15em; }
    .w:hover { background: rgba(255, 255, 255, .24); }
    .stack[data-mode="swap"][data-show="primary"] .secondary .w,
    .stack[data-mode="swap"][data-show="secondary"] .primary .w { pointer-events: none; }
    /* Word card: the popup's paper card (see DESIGN.md), not the dark caption chrome. */
    .tip {
      position: absolute; transform: translateX(-50%); min-width: 9em; max-width: 70%; padding: .7em .9em .8em; border-radius: 1.4em;
      font: 600 .85em/1.3 "Looptions Outfit", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased;
      color: #2d2134; background: #fcf9fb; box-shadow: 0 1.2em 2.4em -1em rgba(70, 35, 90, .6);
      pointer-events: auto; overflow-wrap: anywhere; display: grid; gap: .15em; justify-items: start;
    }
    .tip[hidden] { display: none; }
    .tip b { color: #c4501a; font-size: .78em; font-weight: 650; letter-spacing: .1em; text-transform: uppercase; }
    .tip .save {
      display: inline-flex; align-items: center; gap: .45em; margin-top: .55em; padding: .35em .95em .35em .75em; border: 0; border-radius: 999px; cursor: pointer;
      font: 650 .85em/1.2 "Looptions Outfit", "Segoe UI", system-ui, sans-serif; color: #fff;
      background: radial-gradient(60% 90% at 100% 0%, #f7a466, rgba(247, 164, 102, 0) 70%), linear-gradient(150deg, #c4501a, #a9420f);
      box-shadow: 0 .5em 1em -.5em rgba(196, 80, 26, .8); transition: transform 160ms cubic-bezier(.22, 1, .36, 1);
    }
    .tip .save:hover:not(:disabled) { transform: translateY(-1px); }
    .tip .save svg { width: 1.1em; height: 1.1em; fill: currentColor; }
    .tip .save:disabled { cursor: default; color: #5b4a8f; background: #efe9fb; box-shadow: none; }
    .tip .save.done svg { animation: tick 360ms cubic-bezier(.22, 1, .36, 1); }
    @keyframes tick { from { transform: scale(.4); } 60% { transform: scale(1.25); } }
    /* Shortcut feedback: paper pill with a peach icon disc, in the top corner the logo does not use. */
    .tag {
      position: absolute; top: 5%; left: 4%; display: flex; align-items: center; gap: .55em; padding: .35em 1.05em .35em .35em; border-radius: 999px; white-space: nowrap;
      font: 600 max(13px, .8em)/1 "Looptions Outfit", "Segoe UI", system-ui, sans-serif; color: #2d2134; background: #fcf9fb;
      box-shadow: 0 1em 2em -.8em rgba(70, 35, 90, .6), 0 0 0 1px #ece3ef;
      opacity: 0; transform: translateY(-.35em) scale(.96); transition: opacity 200ms ease-out, transform 320ms cubic-bezier(.22, 1, .36, 1); pointer-events: none;
    }
    .tag[data-side="right"] { left: auto; right: 4%; }
    .tag.on { opacity: 1; transform: none; }
    .tag .ic { display: grid; place-items: center; width: 2em; height: 2em; border-radius: 50%; color: #c4501a; background: #fde9dc; }
    .tag .ic svg { width: 1.15em; height: 1.15em; }
    .tag small { font-size: .85em; font-weight: 500; color: #776a82; }
    .tag b { display: inline-block; font-weight: 700; font-variant-numeric: tabular-nums; }
    .tag.tick b { animation: tag-tick 260ms cubic-bezier(.22, 1, .36, 1); }
    @keyframes tag-tick { 40% { transform: scale(1.14); } }
    .note {
      position: absolute; top: 5%; left: 50%; transform: translateX(-50%); max-width: 80%; padding: .6em 1.1em; border-radius: 999px; white-space: nowrap;
      font: 650 max(13px, .8em)/1 "Looptions Outfit", "Segoe UI", system-ui, sans-serif; color: #2d2134; background: #fcf9fb;
      box-shadow: 0 1em 2em -.8em rgba(70, 35, 90, .6); opacity: 0; transition: opacity 240ms ease-out; pointer-events: none;
    }
    .note.on { opacity: 1; }
    /* In-player logo: the only always-clickable thing besides words and the menu. */
    .logo {
      position: absolute; width: 34px; height: 34px; padding: 5px; box-sizing: border-box; border: 0; border-radius: 25%;
      background: #231a2a; box-shadow: 0 6px 16px -8px rgba(0, 0, 0, .6);
      cursor: pointer; pointer-events: auto; opacity: .55; transition: opacity 180ms;
    }
    /* Intro (video opened, quiz finished), 2.6 s: dashes appear one by one around the spot (1 s), the logo fades in to full opacity,
       holds 1 s, then logo and dashes fade out. The dashes are a sibling of the logo so they show while the logo is still invisible. */
    .logo.intro { animation: logo-intro 2600ms cubic-bezier(.22, 1, .36, 1); }
    @keyframes logo-intro {
      0%, 38% { opacity: 0; transform: scale(.85); }
      48% { opacity: 1; transform: scale(1); }
      86% { opacity: 1; transform: scale(1); animation-timing-function: ease-out; }
      100% { opacity: 0; transform: scale(1); }
    }
    .ring { position: absolute; width: 46px; height: 46px; overflow: visible; pointer-events: none; opacity: 0; filter: drop-shadow(0 0 2px rgba(0, 0, 0, .45)); }
    .ring[data-corner="off"] { display: none; }
    .ring[data-corner="tl"] { left: 6px; top: 6px; } .ring[data-corner="tr"] { right: 6px; top: 6px; }
    .ring[data-corner="bl"] { left: 6px; bottom: 6px; } .ring[data-corner="br"] { right: 6px; bottom: 6px; }
    .ring rect { fill: none; }
    .ring .dashes { stroke: #f27a36; stroke-width: 1.5; stroke-dasharray: 2.2 1.8; }
    .ring .trace { stroke: #fff; stroke-width: 6; stroke-dasharray: 1 1; stroke-dashoffset: 1; }
    .ring.intro { animation: ring-life 2600ms linear; }
    /* 18 steps = one per dash, so each dash pops in on its own. */
    .ring.intro .trace { animation: ring-draw 1000ms steps(18, end) forwards; }
    @keyframes ring-life { 0% { opacity: 1; } 86% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes ring-draw { to { stroke-dashoffset: 0; } }
    .logo svg { display: block; width: 100%; height: 100%; }
    .logo:hover, .logo:focus-visible { opacity: 1; }
    .logo[data-vis="0"] { opacity: 0; pointer-events: none; }
    .logo[data-corner="off"] { display: none; }
    .logo[data-corner="tl"], .menu[data-corner="tl"] { left: 12px; } .logo[data-corner="tl"], .logo[data-corner="tr"] { top: 12px; }
    .logo[data-corner="tr"], .menu[data-corner="tr"] { right: 12px; } .logo[data-corner="bl"], .logo[data-corner="br"] { bottom: 12px; }
    .logo[data-corner="bl"], .menu[data-corner="bl"] { left: 12px; } .logo[data-corner="br"], .menu[data-corner="br"] { right: 12px; }
    .menu[data-corner="tl"], .menu[data-corner="tr"] { top: 54px; } .menu[data-corner="bl"], .menu[data-corner="br"] { bottom: 54px; }
    .menu[data-corner="off"] { display: none; }
    /* Pre-video quiz: a pill in the middle of the video while the quiz is being prepared, then a card over the whole video (DESIGN.md palette). */
    [hidden] { display: none !important; }
    .quizload {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; align-items: center; gap: .6em; white-space: nowrap;
      padding: .75em 1.3em .75em 1em; border-radius: 999px; pointer-events: none; color: #2d2134; background: #fcf9fb;
      font: 650 max(14px, .85em)/1 "Looptions Outfit", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased;
      box-shadow: 0 1.4em 2.8em -1em rgba(70, 35, 90, .6);
    }
    .quizload small { display: block; margin-top: .4em; font-weight: 500; font-size: .85em; color: #776a82; }
    .quizload svg { width: 1.6em; height: 1.6em; fill: #f27a36; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .quiz {
      position: absolute; inset: 0; z-index: 10; container-type: size; display: grid; place-items: center; pointer-events: auto;
      background: rgba(45, 33, 52, .84); opacity: 0; transition: opacity 900ms cubic-bezier(.22, 1, .36, 1);
      font: 600 clamp(13px, 3.4cqh, 21px)/1.35 "Looptions Outfit", "Segoe UI", system-ui, sans-serif; color: #2d2134; -webkit-font-smoothing: antialiased;
    }
    .quiz.on { opacity: 1; }
    .qcard {
      width: min(26em, 88cqw); max-height: 92cqh; overflow: auto; box-sizing: border-box; padding: 1.2em 1.5em 1.5em; border-radius: 1.7em; display: grid; gap: 1em;
      background: #fcf9fb; box-shadow: 0 1.4em 2.8em -1em rgba(70, 35, 90, .6); transform: translateY(.7em); transition: transform 900ms cubic-bezier(.22, 1, .36, 1);
    }
    .quiz.on .qcard { transform: none; }
    .qcard { scrollbar-width: thin; scrollbar-color: #d9cfe3 transparent; }
    .qcard[data-view="summary"] { width: min(38em, 92cqw); }
    .qtop { display: flex; align-items: center; justify-content: space-between; gap: 1em; min-height: 1.9em; }
    .qkick { font-size: .72em; font-weight: 650; letter-spacing: .12em; text-transform: uppercase; color: #c4501a; font-variant-numeric: tabular-nums; }
    .qtopr { display: flex; gap: .2em; }
    .qbar { height: .35em; border-radius: 99px; background: #efe9fb; overflow: hidden; }
    .qbar i { display: block; height: 100%; border-radius: inherit; background: #f27a36; transition: width 400ms cubic-bezier(.22, 1, .36, 1); }
    .qask { margin: 0; text-align: center; font-size: .9em; font-weight: 500; color: #776a82; }
    .qword { margin: 0; padding: .25em 0 .35em; text-align: center; font-size: 2.3em; font-weight: 650; line-height: 1.1; letter-spacing: -.02em; overflow-wrap: anywhere; }
    .qtitle { margin: 0; font-size: 1.35em; font-weight: 650; letter-spacing: -.02em; }
    .qrow { display: grid; grid-template-columns: 1fr 1fr; gap: .6em; }
    .qbtn, .qskip { border: 0; cursor: pointer; font: inherit; font-weight: 650; border-radius: 999px; transition: transform 160ms cubic-bezier(.22, 1, .36, 1); }
    .qbtn { display: inline-flex; align-items: center; justify-content: center; gap: .45em; padding: .75em 1em; }
    .qbtn:hover { transform: translateY(-1px); }
    .qbtn svg { width: 1.1em; height: 1.1em; fill: currentColor; }
    .qbtn.soft { color: #5b4a8f; background: #efe9fb; }
    .qbtn.prime {
      color: #fff; background: radial-gradient(60% 90% at 100% 0%, #f7a466, rgba(247, 164, 102, 0) 70%), linear-gradient(150deg, #c4501a, #a9420f);
      box-shadow: 0 .5em 1em -.5em rgba(196, 80, 26, .8);
    }
    .qbtn.wide { grid-column: 1 / -1; }
    .qskip { padding: .3em .8em; font-size: .85em; font-weight: 600; color: #776a82; background: none; }
    .qskip:hover { background: #efe9fb; }
    .qbtn:focus-visible, .qskip:focus-visible { outline: 2px solid #c4501a; outline-offset: 2px; }
    .qmean { margin: 0; text-align: center; font-size: 1.5em; font-weight: 600; color: #c4501a; overflow-wrap: anywhere; min-height: 1.4em; }
    .qtable { display: grid; gap: .4em; }
    .qtrow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) auto; align-items: center; gap: .8em; padding: .4em .5em .4em .9em; border-radius: 999px; background: #fff; box-shadow: 0 10px 24px -14px rgba(90, 50, 110, .35); }
    .qtrow b { overflow-wrap: anywhere; }
    .qtr { color: #776a82; font-weight: 500; overflow-wrap: anywhere; }
    .qsave { border: 0; cursor: pointer; font: inherit; font-size: .85em; font-weight: 650; padding: .4em .9em; border-radius: 999px; color: #5b4a8f; background: #efe9fb; }
    .qsave:disabled { cursor: default; color: #776a82; background: transparent; }
    .qsave:focus-visible { outline: 2px solid #c4501a; outline-offset: 2px; }
    ${DS.MENU_CSS}
    @media (prefers-reduced-motion: reduce) {
      .line, .tag, .note, .logo, .quiz, .qcard, .qbar i, .qbtn, .quizload span { transition: none; }
      .logo.intro, .ring.intro, .ring.intro .trace, .tag.tick b { animation: none; }
      .quizload svg { animation: none; }
    }
  `;

  // Bundled fonts are fetched once, on first use, and registered on the page's font set (a closed shadow root
  // cannot carry @font-face). Until they arrive the fallback in the stack shows.
  const fontsLoaded = new Set();
  const loadFont = async id => {
    const f = DS.FONTS.find(x => x.id === id);
    if (!f || !f.file || fontsLoaded.has(id)) return;
    fontsLoaded.add(id);
    const name = f.family.match(/"([^"]+)"/)[1];
    try {
      for (const [sub, range] of Object.entries(DS.FONT_RANGES)) {
        const buf = await (await fetch(chrome.runtime.getURL(`fonts/${f.file}-${sub}.woff2`))).arrayBuffer();
        document.fonts.add(await new FontFace(name, buf, { weight: '100 900', unicodeRange: range }).load());
      }
    } catch { fontsLoaded.delete(id); } // retried on the next apply
  };

  // The menu uses the popup's own typeface (Outfit); fetched the first time the menu opens.
  let uiFont = false;
  const loadUiFont = async () => {
    if (uiFont) return;
    uiFont = true;
    try {
      // Outfit for the UI, DM Sans for the "Looptions" wordmark in the menu header.
      for (const [family, path, range] of [
        [DS.UI_FONT.name, 'popup/fonts/outfit-latin', DS.FONT_RANGES.latin], [DS.UI_FONT.name, 'popup/fonts/outfit-latin-ext', DS.FONT_RANGES['latin-ext']],
        ['Looptions Wordmark', 'fonts/dm-sans-latin', DS.FONT_RANGES.latin], ['Looptions Wordmark', 'fonts/dm-sans-latin-ext', DS.FONT_RANGES['latin-ext']],
      ]) {
        const buf = await (await fetch(chrome.runtime.getURL(`${path}.woff2`))).arrayBuffer();
        document.fonts.add(await new FontFace(family, buf, { weight: '100 900', unicodeRange: range }).load());
      }
    } catch { uiFont = false; }
  };

  DS.createOverlay = () => {
    // A custom tag and !important inline styles keep page rules like "div { ... }" off the host box.
    const host = document.createElement('looptions-overlay');
    for (const [k, v] of Object.entries({ position: 'fixed', 'z-index': '2147483647', 'pointer-events': 'none', display: 'block',
      margin: '0', padding: '0', border: '0', transform: 'none', opacity: '1', visibility: 'visible', left: '0', top: '0', width: '0', height: '0' })) {
      host.style.setProperty(k, v, 'important');
    }
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>${CSS}</style>
      <div class="stack"><div class="line primary" lang=""></div><div class="line secondary" lang=""></div></div>
      <div class="tag" aria-hidden="true"></div><div class="note" role="status"></div><div class="tip" hidden></div>
      <svg class="ring" data-corner="tr" viewBox="-6 -6 46 46" aria-hidden="true"><mask id="ring-mask" maskUnits="userSpaceOnUse" x="-6" y="-6" width="46" height="46"><rect class="trace" x="-2" y="-2" width="38" height="38" rx="10.5" pathLength="1"/></mask><rect class="dashes" x="-2" y="-2" width="38" height="38" rx="10.5" pathLength="72" mask="url(#ring-mask)"/></svg><button type="button" class="logo" data-vis="0" aria-label="Looptions ayarları"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="4.5" rx="2.25" fill="#f27a36"/><rect x="6.5" y="15" width="11" height="4.5" rx="2.25" fill="#a594e3"/></svg></button>
      <div class="quizload" hidden role="status"><svg viewBox="0 0 256 256" aria-hidden="true"><path d="M140,32V64a12,12,0,0,1-24,0V32a12,12,0,0,1,24,0Zm84,84H192a12,12,0,0,0,0,24h32a12,12,0,0,0,0-24Zm-42.26,48.77a12,12,0,1,0-17,17l22.63,22.63a12,12,0,0,0,17-17ZM128,180a12,12,0,0,0-12,12v32a12,12,0,0,0,24,0V192A12,12,0,0,0,128,180ZM74.26,164.77,51.63,187.4a12,12,0,0,0,17,17l22.63-22.63a12,12,0,1,0-17-17ZM76,128a12,12,0,0,0-12-12H32a12,12,0,0,0,0,24H64A12,12,0,0,0,76,128ZM68.6,51.63a12,12,0,1,0-17,17L74.26,91.23a12,12,0,0,0,17-17Z"/></svg><span>Kelime testi hazırlanıyor…<small>Atlamak için videoyu oynat</small></span></div>`;
    const logo = root.querySelector('.logo'), ring = root.querySelector('.ring');
    const quizLoad = root.querySelector('.quizload');
    const menu = DS.createMenu({ onPrefs: p => cfg.onPrefs(p), onSel: p => cfg.onSel(p) });
    const q = document.createElement('div');
    q.className = 'quiz';
    q.hidden = true;
    q.setAttribute('role', 'dialog');
    q.setAttribute('aria-modal', 'true');
    q.setAttribute('aria-label', 'Kelime testi');
    const card = document.createElement('div');
    card.className = 'qcard';
    q.append(card);
    root.append(menu.el, q);
    const stack = root.querySelector('.stack');
    const tag = root.querySelector('.tag');
    const note = root.querySelector('.note');
    let noteId = null, noteTimer = 0;
    const tip = root.querySelector('.tip');
    const els = { secondary: root.querySelector('.secondary'), primary: root.querySelector('.primary') };
    const shownText = {};
    // UI text speaks the native language (DS.uiLang); subtitle and word text is never passed through T.
    const T = (s, ...a) => DS.t(s, DS.uiLang(cfg?.prefs), ...a);
    let uiLang = '';
    let cfg = null, raf = 0, tagTimer = 0, memo = {}, scale = 1;
    // Recomputed only when a cue list or the offsets change.
    const aligned = (anchor, other, shift) => {
      if (memo.a !== anchor || memo.o !== other || memo.s !== shift) memo = { a: anchor, o: other, s: shift, r: DS.alignCues(anchor, other, shift) };
      return memo.r;
    };
    // Words become spans (click targets); spaces and punctuation stay plain text, so the line looks the same.
    const toNodes = (text, lang) => DS.splitWords(text, lang).map(p => {
      if (!p.word) return document.createTextNode(p.t);
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = p.t;
      return w;
    });
    const show = (role, cue) => {
      const text = cue ? cue.text : '';
      if (shownText[role] !== text) { els[role].replaceChildren(...toNodes(text, els[role].lang)); shownText[role] = text; }
    };

    // Click a word: pause, show its translation above it. Clicks inside the overlay never reach the page,
    // or a player that wraps the overlay in fullscreen would toggle play or fullscreen.
    let tipSeq = 0;
    const hideTip = () => { tip.hidden = true; tipSeq++; };
    for (const ev of ['click', 'dblclick', 'pointerdown', 'pointerup', 'mousedown', 'mouseup']) root.addEventListener(ev, e => e.stopPropagation());
    logo.addEventListener('click', () => { loadUiFont(); menu.toggle(); });
    root.addEventListener('click', e => {
      const w = e.target.closest('.w');
      if (!w || !cfg?.onWord) return;
      const role = w.parentElement.classList.contains('primary') ? 'primary' : 'secondary';
      const fill = text => {
        const b = document.createElement('b');
        b.textContent = w.textContent;
        tip.replaceChildren(b, text);
      };
      loadUiFont();
      cfg.video.pause();
      cfg.video.addEventListener('play', hideTip, { once: true });
      // Above the whole caption box, so it never covers the other line.
      const hr = host.getBoundingClientRect(), wr = w.getBoundingClientRect();
      tip.style.left = Math.min(Math.max(wr.left + wr.width / 2 - hr.left, hr.width * .2), hr.width * .8) + 'px';
      tip.style.bottom = hr.bottom - stack.getBoundingClientRect().top + 6 + 'px';
      const seq = ++tipSeq;
      fill('…');
      tip.hidden = false;
      Promise.resolve(cfg.onWord(w.textContent, role)).then(
        t => {
          if (seq !== tipSeq) return;
          fill(t || '?');
          if (!t || !cfg.onSave) return;
          // Save the word with the caption line it came from.
          const save = document.createElement('button');
          save.type = 'button';
          save.className = 'save';
          const label = (icon, text) => { save.innerHTML = `<svg viewBox="0 0 256 256" aria-hidden="true">${icon}</svg>`; save.append(text); };
          const BOOKMARK = '<path d="M184,28H72A20,20,0,0,0,52,48V224a12,12,0,0,0,18.36,10.18l57.63-36,57.65,36A12,12,0,0,0,204,224V48A20,20,0,0,0,184,28Zm-4,174.35-45.65-28.53a12,12,0,0,0-12.72,0L76,202.35V52H180Z"/>', CHECK = '<path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/>';
          label(BOOKMARK, T('Kaydet'));
          save.addEventListener('click', () => {
            save.disabled = true;
            Promise.resolve(cfg.onSave({ word: w.textContent, translation: t, role, context: shownText[role] || '' }))
              .then(() => { save.classList.add('done'); label(CHECK, T('Kaydedildi')); }, () => { save.disabled = false; label(BOOKMARK, T('Kaydedilemedi')); });
          });
          tip.append(save);
        },
        e => { if (seq === tipSeq) fill(T(e?.message || 'Çeviri yok')); });
    });
    // A click anywhere outside the overlay (player controls, the video) closes the tip.
    const outside = e => { if (e.target !== host) { hideTip(); menu.close(); } };
    document.addEventListener('pointerdown', outside, true);
    const onKey = e => { if (e.key === 'Escape' && menu.isOpen()) menu.close(); };
    document.addEventListener('keydown', onKey, true);
    // ---- pre-video quiz card ----
    const el = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };
    const button = (cls, text, onClick, icon) => {
      const b = el('button', cls);
      b.type = 'button';
      if (icon) b.innerHTML = `<svg viewBox="0 0 256 256" aria-hidden="true">${icon}</svg>`;
      b.append(text);
      b.addEventListener('click', onClick);
      return b;
    };
    let quiz = null, held = null; // held: {wasPlaying} while the video is paused for the loading pill
    let introDue = false, introSeen = false; // introSeen: the logo stays hidden until its first intro has started
    // The logo intro plays once nothing covers the video (first open, and again after each quiz)

    // words: [{word}], translate(word, urgent) -> Promise<string>, onDone(answers: [{word, known}]) runs once when the card closes,
    // onSave({word, translation}) stores a word in the word book. The video is paused while the card is open and resumed
    // afterwards only if it was playing.
    function showQuiz({ words, translate, onDone, onSave }) {
      if (quiz || !cfg || !words.length) return false;
      const video = cfg.video;
      const wasPlaying = held ? held.wasPlaying : !video.paused && !video.ended;
      held = null;
      const answers = [];
      // A meaning that does not arrive within 8 s counts as missing, so the card never waits forever.
      const meaning = (word, urgent) => Promise.race([
        Promise.resolve().then(() => translate(word, urgent)).catch(() => ''),
        new Promise(r => setTimeout(() => r(''), 8000)),
      ]);
      const done = words.map(w => meaning(w.word, false));
      let i = 0, closed = false;
      const keepPaused = () => video.pause();
      // Player shortcuts (space, arrows, ...) must not reach the page while the card is open.
      const onQuizKey = e => {
        e.stopImmediatePropagation();
        if (e.type !== 'keydown') return;
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Tab') {
          // Focus stays on the card's buttons; the logo and menu behind the scrim must not be reachable.
          e.preventDefault();
          const f = [...card.querySelectorAll('button')];
          f[(f.indexOf(root.activeElement) + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
        } else if (e.target !== host) {
          e.preventDefault();
          if (e.key === 'Enter' || e.key === ' ') card.querySelector('.prime')?.focus();
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        for (const t of ['keydown', 'keyup', 'keypress']) removeEventListener(t, onQuizKey, true);
        video.removeEventListener('play', keepPaused);
        q.classList.remove('on');
        q.hidden = true;
        quiz = null;
        introDue = true;
        if (wasPlaying) video.play()?.catch(() => {});
        onDone(answers);
      };
      const top = (label, skip, back) => {
        const t = el('div', 'qtop'), r = el('div', 'qtopr');
        t.append(el('span', 'qkick', label), r);
        if (back) r.append(button('qskip', T('Geri'), back));
        if (skip) r.append(button('qskip', T('Geç'), close));
        return t;
      };
      // Cards turn: the old face narrows to an edge, the new one widens back. No animation under reduced motion.
      const flip = render => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches || !card.animate) return render();
        // The card turns only part of the way and fades at the edge, so it never goes razor-thin; ease-in out, ease-out back.
        const frame = (deg, scale, opacity) => ({ transform: `perspective(1100px) rotateY(${deg}deg) scale(${scale})`, opacity });
        const turn = (from, to, ms, easing) => card.animate([from, to], { duration: ms, easing, fill: 'forwards' });
        const out = turn(frame(0, 1, 1), frame(55, .965, 0), 130, 'cubic-bezier(.4, 0, 1, 1)');
        setTimeout(() => { render(); turn(frame(-55, .965, 0), frame(0, 1, 1), 190, 'cubic-bezier(.16, 1, .3, 1)').finished.then(a => a.cancel?.()).catch(() => {}); out.cancel(); }, 130); // a timer, not the animation's end: a throttled page must never leave the card blank
      };
      const goBack = () => { answers.pop(); i--; ask(); }; // answers.length === i on every ask card
      const next = () => (++i < words.length ? ask() : summary());
      const ask = () => {
        const w = words[i];
        const bar = el('div', 'qbar'), fill = el('i');
        fill.style.width = `${(i / words.length) * 100}%`;
        bar.append(fill);
        const answer = known => {
          answers.push({ word: w.word, known });
          known ? next() : flip(() => meaningView(w));
        };
        const row = el('div', 'qrow');
        row.append(button('qbtn soft', T('Bilmiyorum'), () => answer(false)),
          button('qbtn prime', T('Biliyorum'), () => answer(true), '<path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/>'));
        card.dataset.view = 'ask';
        card.replaceChildren(top(T('Video öncesi · {0} / {1}', i + 1, words.length), true, i > 0 ? goBack : null), bar, el('p', 'qask', T('Bu kelimeyi biliyor musun?')), el('p', 'qword', w.word), row);
        card.querySelector('.prime').focus();
      };
      // Back of the card, shown right after "Bilmiyorum": the word and its meaning.
      const meaningView = w => {
        const mean = el('p', 'qmean', '…');
        meaning(w.word, true).then(t => { mean.textContent = t || T('Anlam bulunamadı'); });
        card.dataset.view = 'meaning';
        card.replaceChildren(top(T('Anlamı · {0} / {1}', i + 1, words.length), true, () => { answers.pop(); ask(); }), el('p', 'qword', w.word), mean,
          button('qbtn prime wide', T(i + 1 < words.length ? 'Devam' : 'Özete geç'), next));
        card.querySelector('.prime').focus();
      };
      const summary = () => {
        const unknown = answers.map((a, k) => ({ ...a, k })).filter(a => !a.known);
        const saves = [];
        const table = el('div', 'qtable');
        for (const a of unknown) {
          const tr = el('span', 'qtr', '…');
          const save = button('qsave', T('Kaydet'), () => { if (!save.disabled) doSave(); });
          const doSave = () => done[a.k].then(t => {
            save.disabled = true;
            save.textContent = T('Kaydedildi');
            onSave?.({ word: a.word, translation: t });
          });
          saves.push(() => (save.disabled ? null : doSave()));
          done[a.k].then(t => { tr.textContent = t || T('Anlam bulunamadı'); });
          const r = el('div', 'qtrow');
          r.append(el('b', null, a.word), tr, save);
          table.append(r);
        }
        card.dataset.view = 'summary';
        card.replaceChildren(top(T('Hazırsın'), false, () => { answers.pop(); i = words.length - 1; ask(); }), el('h3', 'qtitle', T(unknown.length ? 'Videoda bunları duyacaksın' : 'Hepsini biliyordun.')),
          ...(unknown.length ? [table, button('qbtn soft wide', T('Hepsini kaydet'), () => saves.forEach(f => f()))] : []), button('qbtn prime wide', T('Videoya geç'), close));
        card.querySelector('.prime').focus();
      };

      quiz = { close };
      hideTip();
      menu.close();
      loadUiFont();
      if (document.fullscreenElement?.tagName === 'VIDEO') document.exitFullscreen?.().catch(() => {});
      video.pause();
      video.addEventListener('play', keepPaused);
      for (const t of ['keydown', 'keyup', 'keypress']) addEventListener(t, onQuizKey, true);
      ask();
      q.hidden = false;
      card.querySelector('.prime')?.focus(); // focus() inside a hidden subtree is a no-op, so it is repeated now
      void q.offsetWidth; // start the fade from opacity 0
      q.classList.add('on');
      return true;
    }

    // Logo shows while the pointer moved over the video recently, the video is paused, or the menu is open.
    let lastMove = -Infinity;
    const onMove = e => {
      const r = cfg?.video.getBoundingClientRect();
      if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) lastMove = performance.now();
    };
    document.addEventListener('pointermove', onMove, { capture: true, passive: true });
    document.addEventListener('pointerdown', onMove, { capture: true, passive: true });
    // Last real click or key press anywhere: only play() right after one counts as the viewer skipping the quiz.
    let lastGesture = -Infinity;
    const onGesture = e => { if (e.isTrusted) lastGesture = performance.now(); };
    for (const t of ['pointerdown', 'keydown']) document.addEventListener(t, onGesture, { capture: true, passive: true });
    stack.dataset.show = 'primary';

    // Inside fullscreen only descendants of the fullscreen element are visible.
    // shortcut: when the <video> itself is fullscreen nothing can be drawn over it; players that fullscreen a wrapper are fine.
    const mount = () => {
      const fs = document.fullscreenElement;
      const parent = fs && fs.tagName !== 'VIDEO' ? fs : document.documentElement;
      if (host.parentNode !== parent) parent.appendChild(host);
    };

    // Shortcut feedback in the tag: icon for the act, optional small label, bold text. A repeat press while shown pops the value.
    const ICONS = {
      speedUp: '<path d="M3.34 19a10 10 0 1 1 17.32 0"/><path d="m12 14 4-4"/>',
      speedDown: '<path d="M3.34 19a10 10 0 1 1 17.32 0"/><path d="m12 14-4-4"/>',
      seekFwd: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
      seekBack: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
      prev: '<path d="M19 20 9 12l10-8v16z"/><path d="M5 19V5"/>',
      next: '<path d="m5 4 10 8-10 8V4z"/><path d="M19 5v14"/>',
      repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
      auto: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    };
    function flash(text, act, label) {
      loadUiFont();
      const again = tag.classList.contains('on');
      tag.innerHTML = (ICONS[act] ? `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[act]}</svg></span>` : '')
        + (label ? '<small></small>' : '') + '<b></b>';
      if (label) tag.querySelector('small').textContent = T(label);
      tag.querySelector('b').textContent = T(text);
      tag.classList.toggle('tick', again);
      tag.classList.add('on');
      clearTimeout(tagTimer);
      tagTimer = setTimeout(() => tag.classList.remove('on', 'tick'), 1200);
    }

    let lastT = null; // playback time on the line's clock at the previous frame, for auto-pause
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const v = cfg.video;
      const vis = introSeen && DS.logoVisible({ paused: v.paused, idleMs: performance.now() - lastMove, menuOpen: menu.isOpen() }) ? '1' : '0';
      if (logo.dataset.vis !== vis) logo.dataset.vis = vis;
      const r = v.getBoundingClientRect();
      // Whole pixels: a fractional host offset blurs the logo's rounded edges.
      for (const [k, v] of [['left', Math.round(r.left)], ['top', Math.round(r.top)], ['width', Math.round(r.width)], ['height', Math.round(r.height)],
        ['font-size', Math.max(14, r.height * 0.05 * cfg.size / 100 * scale)]]) host.style.setProperty(k, v + 'px', 'important');
      // While the quiz is being prepared the video is held paused (the viewer would miss the scene otherwise). Pressing play
      // while held skips the quiz for this subtitle; whatever ends the wait releases the video. A play() with no click or key
      // since the hold began is the player's own autoplay (retry), so the video is paused again.
      const pending = !quiz && !!cfg.quizTick?.();
      let loading = pending && (!!held || !v.paused);
      if (loading && !held) { held = { wasPlaying: !v.ended, since: performance.now() }; v.pause(); }
      else if (loading && !v.paused && lastGesture < held.since) v.pause();
      else if (loading && !v.paused) { held = null; loading = false; cfg.quizCancel?.(); }
      else if (!loading && held && !quiz) { if (held.wasPlaying) v.play()?.catch(() => {}); held = null; }
      // A video that was already paused is not held, but the viewer still has to see why nothing happens.
      const pill = loading || (pending && v.paused);
      if (quizLoad.hidden === pill) quizLoad.hidden = !pill;
      if (introDue && !quiz && !loading) {
        introDue = false; introSeen = true;
        // The intro ends fully faded out; the normal idle rule (pointer, pause, menu) brings the logo back after that.
        logo.classList.remove('intro'); ring.classList.remove('intro');
        void logo.offsetWidth; // restart the animations on replay
        logo.classList.add('intro'); ring.classList.add('intro');
      }
      const p = cfg.lines.find(l => l.role === 'primary');
      const s = cfg.lines.find(l => l.role === 'secondary');
      const timed = p || s;
      if (timed && cfg.prefs.autoPause && !v.paused && !quiz) {
        const t = v.currentTime - timed.offset;
        const end = lastT == null ? null : DS.crossedLineEnd(timed.getCues(), lastT, t);
        lastT = t;
        if (end != null) { v.pause(); v.currentTime = end + timed.offset - 0.02; } // back just inside the line so its text stays up
      } else lastT = null;
      show('primary', p && DS.findCue(p.getCues(), v.currentTime - p.offset));
      if (!s) show('secondary', null);
      // Aligned: the bottom line changes together with the top one, on the top line's clock.
      else if (p && cfg.align) show('secondary', DS.findCue(aligned(p.getCues(), s.getCues(), s.offset - p.offset), v.currentTime - p.offset));
      else show('secondary', DS.findCue(s.getCues(), v.currentTime - s.offset));
    };

    document.addEventListener('fullscreenchange', mount);

    return {
      set(next) {
        cfg = next;
        scale = +cfg.look['--scale'] || 1;
        for (const [k, v] of Object.entries(cfg.look)) host.style.setProperty(k, v);
        loadFont(cfg.font);
        if (cfg.quizTick) loadUiFont(); // the loading ring's tooltip uses the UI typeface
        logo.dataset.corner = ring.dataset.corner = menu.el.dataset.corner = cfg.logo;
        tag.dataset.side = cfg.logo === 'tl' ? 'right' : 'left'; // feedback takes the top corner the logo leaves free
        menu.update(cfg.prefs, cfg.sel);
        if (uiLang !== DS.uiLang(cfg.prefs)) { // the few fixed labels built with the shadow DOM
          uiLang = DS.uiLang(cfg.prefs);
          logo.setAttribute('aria-label', T('Looptions ayarları'));
          q.setAttribute('aria-label', T('Kelime testi'));
          quizLoad.querySelector('span').firstChild.nodeValue = T('Kelime testi hazırlanıyor…');
          quizLoad.querySelector('small').textContent = T('Atlamak için videoyu oynat');
        }
        // A notice {id, text} shows once per id, for 6 s; it needs the UI typeface.
        if (cfg.notice && cfg.notice.id !== noteId) {
          noteId = cfg.notice.id;
          loadUiFont();
          note.textContent = cfg.notice.text;
          note.classList.add('on');
          clearTimeout(noteTimer);
          noteTimer = setTimeout(() => note.classList.remove('on'), 6000);
        }
        for (const l of cfg.lines) els[l.role].lang = l.lang || '';
        stack.dataset.mode = cfg.mode === 'swap' && cfg.lines.length > 1 ? 'swap' : 'dual';
        mount();
        if (!raf) {
          introDue = true;
          tick();
        }
      },
      toggle() {
        if (stack.dataset.mode !== 'swap') return;
        stack.dataset.show = stack.dataset.show === 'primary' ? 'secondary' : 'primary';
      },
      // Playback shortcuts (DS.PLAY_KEYS). Lines jump on the primary line's clock, or the secondary's when primary is off.
      act(name) {
        if (!cfg || quiz) return;
        const v = cfg.video, l = cfg.lines.find(x => x.role === 'primary') || cfg.lines[0];
        if (name === 'auto') {
          const on = !cfg.prefs.autoPause;
          cfg.prefs = { ...cfg.prefs, autoPause: on };
          cfg.onPrefs({ autoPause: on });
          flash(on ? 'Açık' : 'Kapalı', 'auto', 'Satır sonunda durdur');
        } else if (l) {
          const t = DS.seekTarget(l.getCues(), v.currentTime - l.offset, name);
          if (t == null) return;
          v.currentTime = t + l.offset;
          if (name === 'repeat' && v.paused) v.play()?.catch(() => {});
          flash({ prev: 'Önceki satır', repeat: 'Satırı tekrarla', next: 'Sonraki satır' }[name], name);
        }
      },
      showQuiz,
      flash,
      destroy() {
        quiz?.close();
        cancelAnimationFrame(raf);
        document.removeEventListener('fullscreenchange', mount);
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerdown', onMove, true);
        host.remove();
      },
    };
  };
})();
