> **Durum (2026-11-16):** Task 1-4 yapıldı (menü görünümü planlanandan farklı, popup tasarımı). Task 5 (satır kaydırma kısayolu) ve Task 6 (README) yapılmadı. Güncel durum: `docs/memory/status.md`.

# Oynatıcı içi logo + menü Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Videonun üstünde, fareyle belirip kaybolan bir logo düğmesi ve onun açtığı ayar menüsü eklemek; ayarlar popup, gelişmiş ayarlar ve menüde aynı anda eşleşsin.

**Architecture:** Kalıcı ayarlar tek `prefs` nesnesinde (`chrome.storage.sync`), sekmeye özel olanlar (`offsetPrimary/Secondary`, parça seçimi) `sel` içinde (background `setSel`). Menü ve logo mevcut kapalı shadow-root overlay'inin içine girer; menü aynı `prefs`/`sel` yollarına yazar. Saf mantık (`logoVisible`, `scaleAlpha`, `nudgeSel`, `fmtOffset`) `lang.js` içinde, Node testli.

**Tech Stack:** Chrome MV3 content script, vanilla JS, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-15-in-player-menu-design.md`

Not: proje git deposu değil, bu yüzden commit adımı yok. Her görev sonunda `node --test test/` çalıştırılır.

## Global Constraints

- Yeni bağımlılık yok. Oynatıcı DOM'una (site/oynatıcıya özel kod) girilmez.
- Overlay `pointer-events: none` kalır; yalnızca logo ve menü `pointer-events: auto`.
- Logo ve menü tıklama/tuş olayları sayfaya sızmaz (`stopPropagation`), yoksa oynatıcı durur/atlar.
- `prefs` eski kurulumlarda yeni alanlar olmadan gelir: her okuma `{ ...DS.DEFAULT_PREFS, ...stored }` ile birleşir (zaten böyle).
- Yeni `prefs` alanları ve varsayılanları: `bgOpacity: 100` (stilin kendi alfasına çarpan, %, 0-150), `lift: 0` (altyazıyı yukarı kaldırma, % birim, 0-40), `logo: 'tl'` (`tl|tr|bl|br|off`).
- Logo gizlenme süresi: `DS.LOGO_IDLE_MS = 3000`.
- Kısayollar sabit: `Alt+Shift+ArrowLeft` = −0,25 sn, `Alt+Shift+ArrowRight` = +0,25 sn.
- `chrome.storage.sync` yazma kotası var (dakikada 120): menüden gelen yazımlar 200 ms debounce edilir.

## Review Focus

1. Video duraklatılmışken logo görünür kalır (`logoVisible`, Task 1).
2. Eski `prefs` (`bgOpacity`/`lift`/`logo` yok) ile `lookVars` bozulmaz, `--bottom` düz kalır (Task 1).
3. Arka planı olmayan stilde (`cinema`) opaklık 0 veya 150 hiçbir şey bozmaz (`scaleAlpha('transparent')`, Task 1).
4. Menüde tıklama/sürükleme sayfaya geçmez: video durmaz, atlamaz (Task 4, elle).
5. Küçük video/iframe'de menü taşmaz, kaydırılabilir kalır; tam ekranda logo ve menü görünür (Task 4, elle).

Bilinen sınır (testlenmeyen): menüdeki `select`/`range` klavyeyle kullanılırken sayfa oynatıcısı kendi kısayolunu capture aşamasında yakalarsa tetiklenebilir. Fare ana kullanım.

---

### Task 1: Saf mantık ve yeni prefs alanları

**Files:**
- Modify: `src/core/lang.js` (`DEFAULT_PREFS` ~satır 71, `lookVars` ~satır 100; yeni yardımcılar `pickTracks`'ten önce)
- Test: `test/lang.test.js`

**Interfaces:**
- Produces: `DS.DEFAULT_PREFS` + `{ bgOpacity: 100, lift: 0, logo: 'tl' }`; `DS.LOGO_CORNERS: {id,label}[]` (`tl` Sol üst, `tr` Sağ üst, `bl` Sol alt, `br` Sağ alt, `off` Kapalı); `DS.LOGO_IDLE_MS = 3000`; `DS.scaleAlpha(color: string, k: number): string`; `DS.logoVisible({paused: boolean, idleMs: number, menuOpen: boolean}): boolean`; `DS.nudgeSel(sel: object, step: number): object`; `DS.fmtOffset(s: number): string`; `DS.lookVars(prefs)` artık `bgOpacity` ve `lift` kullanır.

- [ ] **Step 1: Failing testleri `test/lang.test.js` sonuna ekle**

```js
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
```

- [ ] **Step 2:** `node --test test/lang.test.js` → yeni testler FAIL ("is not a function").

- [ ] **Step 3: `lang.js`'i uygula.** İmzalar yukarıda. `scaleAlpha`: `rgba(r, g, b, a)` regex'i ile yalnızca bu biçimi değiştirir, alfa `min(1, a*k)`, çıktı `+a.toFixed(3)` ile sayı olarak basılır. `lookVars`: `k = (prefs.bgOpacity ?? 100)/100` ile `bg` ve `lbg`'yi `scaleAlpha`'dan geçir; `lift` > 0 ise `bottom = calc(${o.bottom} + ${lift}%)`, değilse stilin değeri aynen. `fmtOffset`, `popup.js:5`'teki `fmtOffset` ile aynı gövde.

- [ ] **Step 4:** `node --test test/` → hepsi PASS.

### Task 2: Popup ve gelişmiş ayarlara yeni kontroller, popup'a prefs dinleyicisi

**Files:**
- Modify: `popup/popup.html` (`size` bloğundan sonra), `popup/popup.js`, `pages/options.html` (`size` kutucuğundan sonra), `pages/options.js`
- Consumes: Task 1'in `DS.LOGO_CORNERS`, `DS.fmtOffset`

**Interfaces:**
- Produces: üç sayfada da aynı `prefs` alanları (`bgOpacity`, `lift`, `logo`) okunur/yazılır.

- [ ] **Step 1: İşaretleme.** Popup'ta `size` bloğunun kalıbıyla iki aralık: `id="bgOpacity"` (min 0, max 150, step 10, çıktı `bgOpacityOut`, "Arka plan opaklığı"), `id="lift"` (min 0, max 40, step 4, çıktı `liftOut`, "Altyazı yüksekliği"); bir `select id="logo"` ("Oynatıcı logosu"). Options'ta aynıları `tile` olarak, `size` kutucuğu kalıbıyla.
- [ ] **Step 2: Bağlama.** İki JS'te de `render()` içinde değerleri yaz (`$('bgOpacity').value = prefs.bgOpacity` vb., çıktılar `%` ve `lift` için sayı), `logo` select'ini `DS.LOGO_CORNERS`'tan doldur, dinleyiciler: aralıklarda `input`, select'te `change`, hepsi `savePrefs` / `save` çağırır (popup'ta `savePrefs`, options'ta `save`).
- [ ] **Step 3: `popup.js`'e prefs dinleyicisi.** Mevcut `chrome.storage.onChanged` (`popup.js:149`) içine `area === 'sync' && ch.prefs` dalı ekle: `prefs = { ...DS.DEFAULT_PREFS, ...ch.prefs.newValue }; render();`.
- [ ] **Step 4: `popup.js`'teki yerel `fmtOffset`'i sil**, `DS.fmtOffset` kullan (`render` içindeki iki çağrı).
- [ ] **Step 5: Elle kontrol.** Eklentiyi `chrome://extensions`'dan yenile; ayarlar sayfası + açık popup yan yana: birinde boyut/opaklık/logo değişince diğerinde değer anında değişmeli. Beklenen: ikisi de eşleşir, konsolda hata yok.

### Task 3: Logo düğmesi ve otomatik gizlenme

**Files:**
- Modify: `src/core/overlay.js` (CSS, `root.innerHTML`, `tick`, `set`, `destroy`), `src/content/content.js:250` (`set` çağrısına `logo: prefs.logo`)

**Interfaces:**
- Consumes: `DS.logoVisible`, `DS.LOGO_IDLE_MS`, `prefs.logo`.
- Produces: `cfg.logo: 'tl'|'tr'|'bl'|'br'|'off'` overlay yapılandırmasında; overlay içinde `logo` düğmesi (`<button class="logo" data-corner data-vis>`), tıklanınca `onLogo()` kancası (Task 4 doldurur; şimdilik boş).

- [ ] **Step 1: Logo.** `root.innerHTML`'e `<button type="button" class="logo" aria-label="Looptions ayarları">` ekle; içine `popup.html:12`'deki iki çubuklu SVG'yi koy. CSS: `position:absolute; pointer-events:auto; width:34px; height:34px; opacity:.55; transition:opacity 180ms`; `:hover`/`:focus-visible` opacity 1; `[data-vis="0"]` opacity 0 + `pointer-events:none`; `[data-corner]` ile dört köşe 12px kenar boşluğuyla, `off` için `display:none`. `prefers-reduced-motion` kuralına `.logo` ekle.
- [ ] **Step 2: Gizlenme.** Overlay içinde `lastMove = -Infinity`; `document`'e capture/passive `pointermove` ve `pointerdown`: işaretçi `cfg.video.getBoundingClientRect()` içindeyse `lastMove = performance.now()`. `tick` içinde `DS.logoVisible({ paused: v.paused, idleMs: performance.now() - lastMove, menuOpen })` hesapla, `logo.dataset.vis` yalnızca değişince yaz. `set` içinde `logo.dataset.corner = cfg.logo`. `destroy` dinleyicileri kaldırır.
- [ ] **Step 3: Olay yalıtımı.** Logo üzerinde `pointerdown, pointerup, mousedown, click, dblclick` için `stopPropagation`; `click` `onLogo()` çağırır.
- [ ] **Step 4: Elle kontrol** (`test/fixtures` README'deki gibi sun): video oynarken fareyi oynat → logo belirir, ~3 sn sonra kaybolur; duraklat → kalır; ayarlardan köşe değiştir → yer değişir, `Kapalı` → yok; logoya tıklayınca video durmaz/başlamaz.

### Task 4: Oynatıcı içi menü

**Files:**
- Create: `src/core/menu.js`
- Modify: `src/core/overlay.js`, `manifest.json` (content script `js` listesine `src/core/menu.js`, `overlay.js`'ten önce), `src/content/content.js`

**Interfaces:**
- Consumes: `DS.STYLES`, `DS.LOGO_CORNERS`, `DS.fmtOffset`, Task 3'ün `onLogo`.
- Produces: `DS.MENU_CSS: string`; `DS.createMenu({ onPrefs: (patch: object) => void, onSel: (patch: object) => void }): { el: HTMLElement, update(prefs: object, sel: object): void, isOpen(): boolean, toggle(): void, close(): void }`. Overlay `set` yapılandırmasına `prefs`, `sel`, `onPrefs`, `onSel` eklenir.

- [ ] **Step 1: `menu.js`.** DOM API ile (innerHTML değil) küçük panel: Altyazı stili (select), Boyut (60–160, step 10), Arka plan opaklığı (0–150, step 10), Yükseklik (0–40, step 4), İki satır için ±0,25 sn adımlayıcı (`onSel({ offsetPrimary })`, `onSel({ offsetSecondary })`, değer `DS.fmtOffset`), Logo köşesi (select). Aralıklar `input` olayında `onPrefs({ alan: +value })`. Panel genişliği `min(240px, 90%)`, `max-height: min(80%, 360px)`, `overflow:auto`, `pointer-events:auto`. Panelde `pointerdown, mousedown, click, dblclick, wheel, keydown, keyup` için `stopPropagation`. `Escape` ve panel dışı `pointerdown` (hedef overlay host'u değilse) kapatır. Açıkken logo görünür kalır (`isOpen()`).
- [ ] **Step 2: Overlay'e bağla.** `overlay.js` CSS'ine `DS.MENU_CSS` ekle; menüyü `root`'a ekle, köşeye göre konumlandır (üst köşeler: logonun altında; alt köşeler: üstünde). `onLogo = menu.toggle`. `set` içinde `menu.update(cfg.prefs, cfg.sel)`. `tick`'teki `menuOpen` = `menu.isOpen()`. `destroy` menüyü kapatır.
- [ ] **Step 3: `content.js` bağlantısı.** `apply()`'taki `set` çağrısına `prefs`, `sel: data.sel`, `logo: prefs.logo`, `onSel: patch => send({ type: 'setSel', sel: { ...data.sel, ...patch } })`, `onPrefs: setPrefs` ekle. `setPrefs(patch)`: `prefs = { ...prefs, ...patch }; editing = true; apply();` sonra 200 ms debounce ile `chrome.storage.sync.set({ prefs })`, yazım bitince `editing = false`. `storage.onChanged` işleyicisi `editing` iken yoksayar (kendi yazımımızın eski değeriyle ezilmesin).
- [ ] **Step 4: Elle kontrol.** Menüde stil/boyut/opaklık/yükseklik değiştir: altyazı anında değişir; popup ve ayarlar sayfası (açıksa) aynı değerleri gösterir. Adımlayıcıyla satır kaydır: popup'taki "0,25 sn" değeri aynı. Menüde tıkla/sürükle: video durmaz/atlamaz. Küçük iframe videoda menü kaydırılabilir, taşmaz. Tam ekran (wrapper'ı tam ekran yapan oynatıcıda): logo ve menü görünür. Beklenen: hepsi geçer, konsolda hata yok.

### Task 5: Satır kaydırma kısayolları ve geri bildirim

**Files:**
- Modify: `src/background.js:102-` (`run` tablosuna `nudge`), `src/content/content.js` (keydown, `update` işleyicisi), `src/core/overlay.js` (`flash`)

**Interfaces:**
- Consumes: `DS.nudgeSel`, `DS.fmtOffset`.
- Produces: mesaj `{ type: 'nudge', step: number }` content → background; overlay `flash(text: string): void` (mevcut sarı `.tag` etiketini ~900 ms gösterir; `toggle()` aynı yolu kullanır).

- [ ] **Step 1: Background.** `nudge: () => updateTab(tabId, d => { d.sel = DS.nudgeSel(d.sel, msg.step); })` (tek yerde uygulansın diye kısayolu her çerçeve değil background işler; böylece iç içe iframe'lerde ±0,50 olmaz).
- [ ] **Step 2: Kısayol.** `content.js` keydown işleyicisine (`toggleKey` kontrolünden sonra) ekle: combo `Alt+Shift+ArrowLeft`/`Alt+Shift+ArrowRight` ve `prefs.enabled` ise `preventDefault`, `stopPropagation`, `send({ type: 'nudge', step: ∓0.25 })`. `toggleKey` aynı kombinasyonsa o kazanır.
- [ ] **Step 3: Geri bildirim.** `update` işleyicisinde önceki ve yeni `sel.offsetPrimary/offsetSecondary` karşılaştır; biri değiştiyse `overlay?.flash(DS.fmtOffset(yeniDeğer))`. `overlay.js`'te `toggle()`'daki tag gösterimini `flash(text)`'e çıkar ve `toggle` onu çağırsın.
- [ ] **Step 4: Elle kontrol.** Videoya odaklıyken `Alt+Shift+→`: altyazı 0,25 sn gecikir, "+0,25 sn" etiketi çıkar, popup'taki değer eşleşir; `←` ters yönde. İç içe iframe'li fixture'da adım tam 0,25. Beklenen: geçer.

### Task 6: Dokümantasyon

**Files:**
- Modify: `README.md` ("Görünüm" bölümü, "Bilinen sınırlar")

- [ ] **Step 1:** README'ye logo/menü, yeni ayarlar (arka plan opaklığı, altyazı yüksekliği, logo köşesi), kısayollar ve `<video>` tam ekranda logonun da çizilemediği notu eklenir.
- [ ] **Step 2:** `node --test test/` → hepsi PASS (son kontrol).
