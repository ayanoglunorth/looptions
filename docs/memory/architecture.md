# Mimari (kısa harita)

Ayrıntı için ilgili dosyanın başındaki yoruma ve README'deki "Altyazıları nasıl buluyor" tablosuna bak.

## Dosyalar

| Dosya | Rol |
|---|---|
| `manifest.json` | MV3. İki içerik betiği: `main-world.js` (`world: MAIN`, `document_start`) ve `parse/lang/menu/overlay/content.js` (izole dünya, bu sırayla). `all_frames`, `<all_urls>`. `fonts/*` ve `popup/fonts/*` web erişilebilir. |
| `src/background.js` | Service worker. `webRequest` ile `.vtt/.srt` ve HLS altyazılarını yakalar, parçaları sekme başına tutar, `toggle` mesajını aktarır, `fetch` (altyazı indirme) ve `lookup` (kelime çevirisi, `googleWord`) işler. |
| `src/inject/main-world.js` | Sayfanın kendi dünyasında: `fetch`/XHR yamaları, JW Player/Video.js/Playerjs, YouTube (`tlang` dahil), Netflix. Bulduğunu `CustomEvent` ile `content.js`'e yollar. |
| `src/content/content.js` | Her çerçevede. `<video>` ve text track'leri bulur, iki parça seçer, overlay'i sürer. `lookupWord` (çeviri), `saveWord` (kayıt), `setPrefs` (menüden gelen değişiklik, 200 ms debounce ile `storage.sync`). |
| `src/core/parse.js` | SRT, WebVTT, TTML/IMSC, YouTube json3 ayrıştırma; hizalama (`alignCues`), `findCue`. |
| `src/core/lang.js` | Dil kodu bulma, `DEFAULT_PREFS`, parça seçimi (`pickTracks`), stiller/fontlar (`DS.STYLES`, `DS.FONTS`), `lookVars`, `splitWords`, `lookupPair`, logo yardımcıları, `comboFromEvent`. Node'da da yüklenir. |
| `src/core/overlay.js` | Videonun üstündeki katman: iki satır, tıklanabilir kelimeler, çeviri kutusu (`.tip`, "Kaydet"), logo, menü. Kapalı shadow root, `pointer-events: none` (yalnızca kelime/logo/menü/kutu tıklanabilir). |
| `src/core/i18n.js` | Arayüz çevirileri (`DS.I18N_ROWS` `[tr,en,de,es,fr,ru]`), `DS.uiLang(prefs)` (= ana dil), `DS.t(metin, dil, ...arg)`, `DS.localize(kök, dil)` (statik HTML). Sayfalarda ve içerik betiklerinde `lang.js`'ten sonra yüklenir. |
| `src/core/menu.js` | Logoya tıklayınca açılan ayar paneli (DOM API, popup görünümü). `DS.createMenu`. |
| `src/core/vocab.js`, `words-en.js` | Video öncesi kelime testinin saf mantığı: `DS.headword` (ek soyma + düzensiz tablo → CEFR başlık kelimesi), `pickQuizWords`, `freqRank`, `limitedFetcher` (çeviri kuyruğu, en çok 3 eş zamanlı), `FAKE_WORDS`. Veri `scripts/make-wordlist.js` ile üretilir. İçerik betiği, popup ve welcome'da yüklenir. |
| `src/core/freq-en.js` | Altyazı sıklık sırası (FrequencyWords, CC-BY-SA-4.0), `scripts/make-freq.js` üretir. Kelime zorluğu bu sıradan gelir. |
| `src/core/ability.js` | Seviye tahmincisi: ln(sıklık sırası) üzerinde 70 noktalı olasılık ızgarası. Kelime, uydurma kelime ve cümle soruları aynı dağılımı günceller; `abilityLevel` düşük yüzdelik (0,3) + uydurmaya ≥%50 evet ise A2 tavanı. `abilityAfterQuiz` video öncesi cevapları da işler. |
| `src/core/cloze-en.js`, `placement.js` | 30 özgün cümle tamamlama sorusu; `DS.placementStart()` kurulum testini yürüten saf durum makinesi (≤50 kelime, her 6. uydurma, sonra 15 cümle). Yalnızca welcome'da kullanılır. |
| `src/core/hls.js` | HLS master playlist'ten altyazıları ayıklar. |
| `popup/`, `pages/options.*`, `pages/welcome.*` | Ayar arayüzleri; `chrome.storage.sync` `prefs`'ini okur/yazar. `pages/pages.css` `popup/popup.css`'i içe aktarır. Kelime defteri `options` içinde (`storage.local` `words`). |
| `test/` | `node --test`. Fixture'lar `test/fixtures/`. |
| `promo/` | Eklentiden bağımsız Remotion projesi (reklam videoları). Kendi `package.json`'ı; eklenti paketine girmez. `src/videos/V1..V3`, ortak arayüz parçaları `src/ui/` (overlay'in birebir kopyaları), `scripts/master.sh` render + ses ustalaştırma. |

## Veri akışı

1. Altyazı kaynağı bulunur → `content.js` `report()` → background'a `add`.
2. Background sekme için parça listesini tutar ve `update` mesajı yollar.
3. `content.js` `apply()`: `DS.pickTracks` → her satır için kaynak (`getSource`) → `overlay.set(...)` (`prefs`, `sel`, `onPrefs`, `onSel`, `onWord`, `onSave` ile).
4. Overlay her karede videonun zamanına göre cue seçer; kelimeler `<span class="w">` olur.

## Kelime testi akışı

`content.js` `apply()` birincil parçayı `primaryTrack`'e yazar; overlay her karede `cfg.quizTick()` çağırır. En→tr, `preQuiz` açık, parça `en` ve video ilk 60 sn'deyse: cue yoksa `true` (ortada "Altyazılar yükleniyor" hapı, video duraklı tutulur; en çok 15 sn, oynat'a basmak testi iptal eder: `quizCancel`), cue varsa `startQuiz` → `DS.pickQuizWords` → `overlay.showQuiz` (video durur, kart açılır) → `onDone` → `saveVocab` (`storage.local` `vocab`; cevaplar `ability`'yi de günceller, seviye değişirse `prefs.level` yazılır). Kartta "Bilmiyorum" kartı çevirip anlamı gösterir; özet tablosundan kelime defterine kaydedilir (`storeWord`). Parça başına bir kez (`quizDone`).

## Ayarlar ve veri

- Kalıcı ayar: `chrome.storage.sync` `prefs` (her okuma `{ ...DS.DEFAULT_PREFS, ...stored }`). Alanlar: `primary, secondary, size, mode, align, enabled, toggleKey, font, style, bgOpacity, lift, logo, preQuiz, level`.
- Sekmeye özel (parça seçimi, satır kaydırma): background'da `sel` / `setSel`.
- Kaydedilen kelimeler: `chrome.storage.local` `words` `[{word, translation, from, to, context, at}]`, en yeni başta; eşitlenmez.

## Kelime çevirisi

Kelimeye tıkla → `content.js` `lookupWord` (önbellekli) → background `lookup` → `googleWord`: `translate.googleapis.com/translate_a/single?client=gtx` (anahtarsız, resmi olmayan). Yön: tıklanan satırın dili → diğer satırın dili (`DS.lookupPair`). Tüm altyazı çevirisi YOK; hedef dilde parça yoksa tek satır görünür.

## Tuzaklar

- `node --test test/` Node 24'te çalışmaz, `node --test` çalışır.
- `<video>` kendisi tam ekranken hiçbir şey çizilemez (logo ve menü dahil).
- Overlay `<html>` altına eklenir (tam ekranda fullscreen elemanın altına), oynatıcının DOM'unun içinde değil. Kapalı shadow root `@font-face` taşıyamaz: fontlar `FontFace` ile sayfanın `document.fonts`'una eklenir (`loadFont`, `loadUiFont`).
- Chrome'un cihaz içi `Translator` API'si bu projede KULLANILMIYOR (model indirme 22 GB disk ister, `availability` takılabiliyor).
- Menü/logo/kelime olayları `stopPropagation` ile sayfaya geçmez; bozulursa oynatıcı durur/atlar.
