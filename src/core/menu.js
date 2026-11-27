// Settings panel opened by the in-player logo. Plain DOM, lives inside the overlay's closed shadow root.
// Look matches popup/popup.css (paper card, white pill selects, peach/lilac controls); keep the two in step.
(() => {
  const DS = (globalThis.DS ||= {});

  DS.UI_FONT = { name: 'Looptions Outfit', files: ['outfit-latin', 'outfit-latin-ext'] }; // loaded by overlay.js
  DS.MENU_CSS = `
    .menu {
      --paper: #fcf9fb; --card: #fff; --ink: #2d2134; --muted: #776a82; --line: #ece3ef; --lilac-soft: #efe9fb;
      --peach: #f27a36; --peach-deep: #c4501a; --peach-soft: #fde9dc; --ease: cubic-bezier(.22, 1, .36, 1);
      position: absolute; box-sizing: border-box; width: min(300px, 92%); max-height: min(86%, 440px); overflow: auto;
      padding: 14px 16px 16px; border-radius: 24px; background: var(--paper); color: var(--ink);
      font: 400 13.5px/1.4 "Looptions Outfit", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased;
      box-shadow: 0 22px 44px -16px rgba(70, 35, 90, .55); pointer-events: auto; display: grid; gap: 12px;
      scrollbar-width: thin; scrollbar-color: #ddd2e4 transparent;
    }
    .menu[hidden] { display: none; }
    .menu * { box-sizing: border-box; }
    .menu .top { display: flex; align-items: center; gap: 10px; }
    .menu .mark { width: 34px; height: 34px; flex: none; border-radius: 25%; overflow: hidden; background: #fffbf8; box-shadow: 0 10px 24px -14px rgba(90, 50, 110, .35), 0 0 0 1px var(--line); }
    .menu .mark svg { display: block; width: 100%; height: 100%; }
    .menu h2 { margin: 0; font: 700 19px "Looptions Wordmark", "Looptions Outfit", "Segoe UI", system-ui, sans-serif; letter-spacing: -.03em; }
    .menu h2 span { font-weight: 400; }
    .menu label, .menu .field { display: grid; gap: 7px; font-weight: 600; }
    .menu .head { display: flex; align-items: baseline; justify-content: space-between; }
    .menu output { font-variant-numeric: tabular-nums; }
    .menu .head output { font-size: 17px; font-weight: 700; color: var(--peach-deep); }
    .menu select {
      appearance: none; width: 100%; height: 38px; padding: 0 34px 0 16px; border: 1px solid var(--line); border-radius: 999px;
      background: var(--card) no-repeat right 13px center / 14px url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cpath d='M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z' fill='%23776a82'/%3E%3C/svg%3E");
      box-shadow: 0 10px 24px -14px rgba(90, 50, 110, .35); font: 500 13.5px "Looptions Outfit", "Segoe UI", system-ui, sans-serif; color: var(--ink); cursor: pointer;
    }
    .menu select:hover { border-color: #dccfe4; }
    .menu input[type=range] {
      appearance: none; width: 100%; height: 14px; margin: 0; border-radius: 999px; cursor: pointer;
      background: linear-gradient(90deg, #b6a6ea, #e9a7a0 55%, #f6a04f);
    }
    .menu input[type=range]::-webkit-slider-thumb {
      appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid var(--peach);
      box-shadow: 0 4px 10px -2px rgba(140, 60, 20, .4); transition: transform 140ms var(--ease);
    }
    .menu input[type=range]:active::-webkit-slider-thumb { transform: scale(1.12); }
    .menu .step { display: flex; align-items: center; justify-content: space-between; gap: 2px; }
    .menu .step output { min-width: 64px; text-align: center; font-weight: 600; }
    .menu .round {
      width: 32px; height: 32px; padding: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
      transition: transform 140ms var(--ease), background-color 160ms var(--ease);
    }
    .menu .round.minus { background: var(--lilac-soft); border: 1px solid transparent; color: #5b4a95; }
    .menu .round.plus { background: var(--card); border: 1.5px solid #f6b48d; color: var(--peach-deep); }
    .menu .round.minus:hover { background: #e3daf8; } .menu .round.plus:hover { background: var(--peach-soft); }
    .menu .round:active { transform: scale(.9); }
    .menu .round svg { width: 14px; height: 14px; fill: currentColor; }
    .menu .power {
      margin-left: auto; position: relative; flex: none; width: 44px; height: 26px; padding: 0; border: 0; border-radius: 999px;
      background: #8f829b; cursor: pointer; transition: background-color 160ms var(--ease);
    }
    .menu .power::after {
      content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff;
      box-shadow: 0 2px 6px -1px rgba(60, 30, 80, .4); transition: transform 180ms var(--ease);
    }
    .menu .power[aria-checked="true"] { background: var(--peach-deep); }
    .menu .power[aria-checked="true"]::after { transform: translateX(18px); }
    .menu .sep { border-top: 1px solid var(--line); }
    .menu :focus-visible { outline: 2px solid var(--peach-deep); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .menu * { transition: none !important; } }
  `;

  // [prefs key, label, min, max, step, unit]
  const RANGES = [['size', 'Yazı boyutu', 60, 160, 5, ''], ['bgOpacity', 'Arka plan opaklığı', 0, 150, 5, '%'], ['lift', 'Altyazı yüksekliği', 0, 40, 1, '%']];
  const OFFSETS = [['offsetPrimary', 'Hedef dil zamanlaması'], ['offsetSecondary', 'Ana dil zamanlaması']];
  const SVG = 'http://www.w3.org/2000/svg';

  DS.createMenu = ({ onPrefs, onSel }) => {
    const el = document.createElement('div');
    el.className = 'menu';
    el.hidden = true;
    let prefs = {}, sel = {}, lang = '';
    let sync = [];  // functions that refresh one control from prefs/sel
    const T = (s, ...a) => DS.t(s, lang, ...a);

    const build = () => {
      el.replaceChildren();
      sync = [];
      const top = document.createElement('div');
      top.className = 'top';
      top.innerHTML = '<span class="mark"><svg viewBox="0 0 128 128"><defs><linearGradient id="lp-m-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFBF8"/><stop offset="100%" stop-color="#F1E9FA"/></linearGradient><linearGradient id="lp-m-bk" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#A694EA"/><stop offset="100%" stop-color="#7B65D4"/></linearGradient><linearGradient id="lp-m-fr" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF9048"/><stop offset="100%" stop-color="#E3591E"/></linearGradient><mask id="lp-m-cut"><rect width="128" height="128" fill="#fff"/><rect x="16" y="38" width="74" height="74" rx="22" fill="#000"/></mask></defs><rect width="128" height="128" rx="30" fill="url(#lp-m-bg)"/><rect x="44" y="22" width="62" height="62" rx="17" fill="url(#lp-m-bk)" mask="url(#lp-m-cut)"/><rect x="22" y="44" width="62" height="62" rx="17" fill="url(#lp-m-fr)"/><rect x="33" y="64" width="21" height="9.5" rx="4.75" fill="#fff"/><rect x="57.5" y="64" width="15.5" height="9.5" rx="4.75" fill="#FFE29E"/><rect x="33" y="78" width="31" height="9.5" rx="4.75" fill="#fff" fill-opacity=".76"/></svg></span><h2>Loop<span>tions</span></h2>';
      const power = document.createElement('button');
      power.type = 'button';
      power.className = 'power';
      power.setAttribute('role', 'switch');
      power.setAttribute('aria-label', T("Looptions'ı aç veya kapat"));
      power.addEventListener('click', () => onPrefs({ enabled: prefs.enabled === false }));
      sync.push(() => power.setAttribute('aria-checked', prefs.enabled !== false));
      top.append(power);
      el.append(top);

      const select = (key, label, options) => {
        const l = document.createElement('label'), s = document.createElement('select');
        l.append(T(label), s);
        s.replaceChildren(...options.map(o => new Option(T(o.label), o.id)));
        s.addEventListener('change', () => onPrefs({ [key]: s.value }));
        sync.push(() => { s.value = prefs[key]; });
        el.append(l);
      };
      const range = ([key, label, min, max, step, unit]) => {
        const l = document.createElement('label'), head = document.createElement('span'), out = document.createElement('output'), r = document.createElement('input');
        head.className = 'head';
        head.append(T(label), out);
        Object.assign(r, { type: 'range', min, max, step });
        r.addEventListener('input', () => onPrefs({ [key]: +r.value }));
        l.append(head, r);
        sync.push(() => { r.value = prefs[key]; out.value = prefs[key] + unit; });
        el.append(l);
      };
      const icon = d => {
        const svg = document.createElementNS(SVG, 'svg'), path = document.createElementNS(SVG, 'path');
        svg.setAttribute('viewBox', '0 0 256 256');
        path.setAttribute('d', d);
        svg.append(path);
        return svg;
      };
      const offset = ([key, label]) => {
        const f = document.createElement('div'), out = document.createElement('output'), bar = document.createElement('div');
        f.className = 'field';
        bar.className = 'step';
        const btn = (kind, d, aria) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'round ' + kind;
          b.setAttribute('aria-label', aria);
          b.append(icon(kind === 'minus' ? 'M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128Z' : 'M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z'));
          b.addEventListener('click', () => onSel({ [key]: Math.round(((sel[key] || 0) + d) * 100) / 100 }));
          return b;
        };
        bar.append(btn('minus', -0.25, T('{0}: 0,25 sn öne al', T(label))), out, btn('plus', 0.25, T('{0}: 0,25 sn geciktir', T(label))));
        const name = document.createElement('span');
        name.textContent = T(label);
        f.append(name, bar);
        sync.push(() => { out.value = DS.fmtOffset(sel[key] || 0, lang); });
        el.append(f);
      };

      select('style', 'Altyazı stili', DS.STYLES);
      select('font', 'Yazı tipi', DS.FONTS);
      RANGES.forEach(range);
      el.append(Object.assign(document.createElement('div'), { className: 'sep' }));
      OFFSETS.forEach(offset);
      select('logo', 'Logo köşesi', DS.LOGO_CORNERS);
    };

    // Nothing typed or clicked in the panel may reach the page: a player would pause, seek or fullscreen.
    for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'click', 'dblclick', 'wheel', 'keydown', 'keyup'])
      el.addEventListener(ev, e => e.stopPropagation());

    return {
      el,
      update(p, s) {
        prefs = p; sel = s || {};
        if (lang !== DS.uiLang(p)) { lang = DS.uiLang(p); build(); } // labels follow the native language
        sync.forEach(f => f());
      },
      isOpen: () => !el.hidden,
      toggle() { el.hidden = !el.hidden; },
      close() { el.hidden = true; },
    };
  };
})();
