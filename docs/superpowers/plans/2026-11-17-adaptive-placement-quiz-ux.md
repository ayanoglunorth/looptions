# Adaptif seviye testi + video öncesi test düzeltmeleri: uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kurulumdaki seviye testini adaptif kelime + cümle tamamlama testine çevirmek ve video öncesi testi (soru sayısı, dönen kart, özet tablosu, yükleniyor göstergesi) düzeltmek.

**Architecture:** Tek bir gizli sayı θ ("bilinen kelimelerin sıklık sırası") üzerinde ızgara tabanlı Bayes tahmini (`ability.js`); kelime, uydurma kelime ve cümle soruları aynı dağılımı günceller. Test oturumu saf bir durum makinesi (`placement.js`). Arayüz (welcome, overlay) bu saf katmanlara bağlanır.

**Tech Stack:** Vanilla JS, Node `node:test`, derleme yok. Saf mantık `src/core/*.js`'te, `module.exports = DS` kalıbıyla.

**Spec:** `docs/superpowers/specs/2026-11-17-adaptive-placement-quiz-ux-design.md`

## Global Constraints

- Derleme adımı, paket yöneticisi, bağımlılık yok. Kullanıcıya dönük metin Türkçe, kod yorumu İngilizce. İngilizce kurulum metinleri `pages/welcome-i18n.js`'e eklenir (anahtar = HTML'deki Türkçe metin).
- **Commit atma** (proje kuralı: kullanıcı istemeden commit yok). Her görevin sonunda yalnızca `node --test` yeşil olmalı.
- Komşu kodu "düzeltme"; çalışan davranışı bozma. Overlay `pointer-events: none` ve kapalı shadow root içinde; tıklanabilir olan yalnızca kendi elemanı. Tıklama olayları `stopPropagation` ile sayfaya sızmaz.
- Arayüze dokunan her iş önce `DESIGN.md`'yi okur (token'lar, Outfit, hap düğmeler, kâğıt kart).
- `node --test` kullan (`node --test test/` Node 24'te çalışmıyor).
- Soru sayısı seçenekleri `[10, 15, 20, 25, 30]`, varsayılan 20. Kelime testi en çok 50 soru, cümle testi 15 soru. Aşağıdaki sabitler ayarlanabilir sabit olarak tek yerde tutulur: `TAU 0.6`, `TAU_CLOZE 0.7`, `S 0.05`, `CLOZE_GUESS 0.25`, `Q 0.25`, `STOP_SD 0.3`, `MIN_WORDS 20`, `MAX_WORDS 50`, `LEVEL_CUTS [800, 1800, 3000, 4500, 6500]` (A1<800, A2<1800, B1<3000, B2<4500, C1<6500, C2≥6500), `LEVEL_MID {A1:500, A2:1300, B1:2400, B2:3700, C1:5500, C2:8000}`.
- Yükleniyor sırasında video duraklar, en çok 15 sn bekler. Çeviri isteği en çok 3 eş zamanlı.
- Lisans: FrequencyWords içeriği CC-BY-SA-4.0 (ticari kullanıma izin var, atıf + aynı lisansla paylaşım), CEFR-J ticari kullanıma izinli (atıf), Octanove CC BY-SA 4.0.

## Review Focus

- Kullanıcı her şeye (uydurmalar dahil) "Biliyorum" der: sonuç C2 değil A1 olmalı; ilerleme sonsuza gitmemeli.
- Kullanıcı her şeye "Bilmiyorum" der: sonuç A1, kelime bölümü en çok 50'de, toplam soru sınırlı.
- "Bilmiyorum" denen kelimenin çevirisi gelmez/429 verir: kartın arkası sonsuza "…" kalmamalı, "Anlam bulunamadı" göstermeli ve "Devam" çalışmalı.
- Altyazı hiç gelmezse, kullanıcı yükleniyorken oynat'a basarsa ya da sayfada İngilizce parça yoksa: video 15 sn içinde (ya da hemen) devam etmeli, sonsuza duraklı kalmamalı; tam ekranda `<video>` ve iframe'de de.
- Eski kurulumda `prefs.quizSize` yok/geçersiz (örn. 7): 20 kabul edilmeli; videoda istenenden az aday kelime varsa elde olan sorulmalı, `QUIZ_MIN` (3) altındaysa kart çıkmamalı.

---

### Task 1: `quizSize` ayarı (varsayılan 20, seçilebilir)

**Files:**
- Modify: `src/core/lang.js:61` (DEFAULT_PREFS), `src/core/vocab.js` (`DS.QUIZ_SIZE` ve `pickQuizWords` varsayılanı), `src/content/content.js:161`, `popup/popup.html:124-133`, `popup/popup.js`, `pages/welcome.html` (adım 2), `pages/welcome.js`, `pages/welcome-i18n.js`
- Test: `test/lang.test.js`

**Interfaces:**
- Produces: `DS.QUIZ_SIZES = [10, 15, 20, 25, 30]`; `DS.DEFAULT_PREFS.quizSize === 20`; `DS.quizSize(prefs: object) -> number` (geçerliyse `prefs.quizSize`, değilse 20). `DS.pickQuizWords(texts, levelRank, vocab, n = 20)`; `DS.QUIZ_SIZE` kaldırılır.

- [ ] **Step 1: Failing test (`test/lang.test.js`):** `DS.QUIZ_SIZES` deep-equal `[10,15,20,25,30]`; `DS.DEFAULT_PREFS.quizSize === 20`; `DS.quizSize({quizSize: 30}) === 30`, `DS.quizSize({quizSize: 7}) === 20`, `DS.quizSize({}) === 20`, `DS.quizSize(undefined) === 20`; `test/vocab.test.js`: bir metinde yalnızca 4 aday kelime varken `DS.pickQuizWords(texts, level, {}, 20).length === 4`. Çalıştır: `node --test test/lang.test.js` → FAIL.
- [ ] **Step 2: Implement** `lang.js` sabitleri ve `DS.quizSize`; `vocab.js`'ten `QUIZ_SIZE` sil, `pickQuizWords` `n = 20` olsun; `content.js` `startQuiz` `DS.quizSize(prefs)` ile `n` versin. `node --test` yeşil.
- [ ] **Step 3: UI.** Popup: `quizGroup` içinde `preQuiz` anahtarının altına "Soru sayısı" `<select id="quizSize">` (`DS.QUIZ_SIZES`), değişince `savePrefs({ quizSize: +value })`; anahtar altındaki "10 kelime sorar" metnini sayıdan bağımsız yap ("başlamadan önce kelime sorar"). Welcome adım 2'ye "Video öncesi kaç kelime?" aynı select, `save({ quizSize })`; yeni metinleri `welcome-i18n.js`'e ekle. Elle: popup ve welcome'da seçimin kaydolduğunu `storage` üzerinden gör.

---

### Task 2: Sıklık verisi (`freq-en.js`) ve `DS.freqRank`

**Files:**
- Create: `scripts/make-freq.js`, `src/core/freq-en.js` (üretilir)
- Modify: `src/core/vocab.js` (`DS.freqRank`), `manifest.json` (content_scripts js: `freq-en.js`, `words-en.js`'ten sonra), `pages/welcome.html` (script), `README.md` (atıf)
- Test: `test/freq.test.js`

**Interfaces:**
- Produces: `DS.FREQ_EN: string` (boşlukla ayrılmış başlık kelimeler, sıklık sırasıyla); `DS.freqRank(word: string) -> number | null` (1 tabanlı sıra; çekimli biçim `DS.headword` ile başlığa bağlanır; listede yoksa `null`).

- [ ] **Step 1: Veriyi indir.** `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt` dosyasını scratchpad'e indir (repoya koyma; 404 verirse repo ağacından yolu bul). Repodaki LICENSE/README'den içeriğin CC-BY-SA-4.0 olduğunu doğrula; değilse dur ve kullanıcıya sor.
- [ ] **Step 2: Failing test (`test/freq.test.js`):** `DS.freqRank('time') < DS.freqRank('abandon')`; `DS.freqRank('abandon') < DS.freqRank('abolish')`; `DS.freqRank('running') === DS.freqRank('run')`; `DS.freqRank('xyzzy') === null`; `DS.FREQ_EN.split(' ').length` 5000..9000; her girdi için `DS.headword(w)?.word === w`; yinelenen girdi yok. → FAIL.
- [ ] **Step 3: Implement** `scripts/make-freq.js` (`node scripts/make-freq.js <en_50k.txt>`): her satırdaki `kelime sayı` için yalnızca `/^[a-z]+$/` olanları `DS.headword` ile başlığa topla, toplamı başlığa ekle, yalnızca CEFR listesinde olanları tut, sayıya göre azalan sırala, ilk 9000'i `DS.FREQ_EN` olarak yaz (başlıkta üretici + CC-BY-SA-4.0 atfı, `words-en.js` kalıbı). `DS.freqRank` `vocab.js`'te, tembel kurulan `Map` ile. Betiği çalıştır, `src/core/freq-en.js` üret.
- [ ] **Step 4:** `node --test` yeşil. README'ye FrequencyWords (hermitdave, OpenSubtitles, CC-BY-SA-4.0) atfını ekle.

---

### Task 3: Yetenek tahmincisi (`ability.js`)

**Files:**
- Create: `src/core/ability.js`
- Modify: `manifest.json` (content js: `vocab.js`'ten sonra), `pages/welcome.html` (script)
- Test: `test/ability.test.js`

**Interfaces:**
- Consumes: `DS.freqRank`, `DS.headword`, `DS.WORDS_EN`, `DS.LEVELS` (Task 2 ve mevcut).
- Produces (hepsi saf; durum JSON'a çevrilebilir: `{ post: number[70], fakeYes: number, fakeN: number }`; ızgara ln(150)…ln(9000), 70 nokta):
  - `DS.abilityNew(level?: string) -> state` (seviye yoksa N(ln 1800, 0.8); varsa N(ln LEVEL_MID[level], 0.9))
  - `DS.abilityUpdate(state, item, known: boolean) -> state` (yeni nesne). `item`: `{kind:'word', rank}` | `{kind:'fake'}` | `{kind:'cloze', rank}`. Kelime: P(evet)=g+(1−g−S)·σ((x−ln rank)/TAU); uydurma yalnızca `fakeYes/fakeN` günceller; cümle: P(doğru)=CLOZE_GUESS+(1−CLOZE_GUESS−S)·σ((x−ln rank)/TAU_CLOZE).
  - `DS.abilityGuess(state) -> number` = `min(0.6, (fakeYes+1)/(fakeN+10))`
  - `DS.abilityQuantile(state, q: number) -> number` (sıklık sırası), `DS.abilitySd(state) -> number` (ln θ standart sapması)
  - `DS.abilityLevel(state) -> 'A1'..'C2'` (`abilityQuantile(state, Q)` ile `LEVEL_CUTS`)
  - `DS.placementPool() -> {word, rank}[]` (sıklık sırasına göre artan; CEFR listesinde olan, `freqRank` olan, uzunluk ≥4, `headword(w).word === w`)
  - `DS.nextWord(state, pool, asked: Set<string>, rand = Math.random) -> {word, rank} | null` (medyana en yakın 5 sorulmamış adaydan rastgele biri)
  - `DS.abilityDone(state, nWords: number) -> boolean` (`nWords >= MAX_WORDS`, ya da `nWords >= MIN_WORDS && abilitySd < STOP_SD`)

- [ ] **Step 1: Failing testler (`test/ability.test.js`).** Tohumlu rastgele (`mulberry32`) yardımcı ile sahte öğrenci simülasyonu: gerçek θ₀ ∈ {600, 1500, 2400, 3700, 5500, 8000}, dürüst öğrenci P(evet)=σ-modeli ile (g=0.05), uydurmaya P(evet)=0.05; her θ₀ için 40 koşu, oturum `abilityNew` → `nextWord`/uydurma (her 6. soru) → `abilityDone` ile biter. Beklentiler:
  - `abilityDone` en geç 50 kelimede true; koşuların çoğunda 20..50 arası.
  - `abilityLevel` sonucu, θ₀'ın `LEVEL_CUTS`'a göre seviyesinden **±1** içinde, koşuların ≥ %90'ında.
  - Abartan öğrenci (g=0.3, uydurmaya %30 evet), θ₀=2400: ortalama `(seviye indeksi − gerçek indeks) ≤ 0.5`.
  - Hep "evet" (uydurmalar dahil) → `abilityLevel` `'A1'` ya da `'A2'` (asla B1+); hep "hayır" → `'A1'`.
  - `abilityGuess` uydurmaya evet arttıkça artar, 0.6'yı geçmez.
  - `placementPool()` sıralı, her `rank` `DS.freqRank(word)`'e eşit, en az 1500 kelime.
  - `abilityNew('B1')` ile `abilityLevel` `'B1'` civarı (`A2..B2`).
  → FAIL.
- [ ] **Step 2: Implement** `ability.js`. Eşikler yukarıdaki sabit tablodan. Simülasyon testleri geçmezse yalnızca sabitleri (TAU, STOP_SD, Q) ayarla, test eşiklerini gevşetme; ayar yapılırsa yeni değeri Global Constraints satırına ve `docs/memory/decisions.md`'ye yaz.
- [ ] **Step 3:** `node --test` yeşil.

---

### Task 4: Cümle tamamlama bankası

**Files:**
- Create: `src/core/cloze-en.js`
- Modify: `src/core/ability.js` (`DS.nextCloze`), `pages/welcome.html` (script)
- Test: `test/cloze.test.js`

**Interfaces:**
- Consumes: Task 3 durum ve `LEVEL_MID`.
- Produces: `DS.CLOZE_EN: {level: 'A2'|'B1'|'B2'|'C1'|'C2', q: string, options: string[4], answer: number}[]` (30 özgün soru, her seviyeden 6; `q` tek `___` boşluğu içerir); `DS.nextCloze(state, bank, asked: Set<number>, rand = Math.random) -> {index, level, q, options, answer} | null` (zorluk rankı `LEVEL_MID[level]`; medyana en yakın seviyeden sorulmamış rastgele biri).

- [ ] **Step 1: Failing test (`test/cloze.test.js`):** 30 soru, her seviyeden tam 6; her `q` tam bir `___` içerir; 4 şık, hepsi farklı, `0 ≤ answer < 4`; aynı `q` iki kez yok; `nextCloze` sorulmuş indeksi tekrar vermez ve 30 sonra `null` döner; yüksek θ'lı durumda ortalama seviye düşük θ'lıdan yüksek. → FAIL.
- [ ] **Step 2: Soruları yaz.** Özgün (kopyalama yok), tek bağlamdan çözülen, Türkçe'den eş kökenle tahmin edilemeyen şıklar; A2: temel zaman/edat/sık fiil, B1: koşul/bağlaç/ifade, B2: fiil kalıpları/ilgi zamiri/anlam ayrımı, C1: soyut kelime/kolokasyon, C2: nadir kolokasyon/üslup. Her soru için şıklardan ikisi makul çeldirici olmalı. `nextCloze`'u uygula.
- [ ] **Step 3:** `node --test` yeşil.

---

### Task 5: Test oturumu (`placement.js`) ve eski testin kaldırılması

**Files:**
- Create: `src/core/placement.js`
- Modify: `src/core/vocab.js` (`FAKE` → `DS.FAKE_WORDS` dışa aç; `placementSample`, `estimateLevel`, `PLACEMENT_PER_LEVEL` sil), `test/vocab.test.js` (eski iki testi sil)
- Test: `test/placement.test.js`

**Interfaces:**
- Consumes: Task 3 ve 4 fonksiyonları, `DS.FAKE_WORDS: string[]`.
- Produces: `DS.placementStart(rand = Math.random) -> session`. `session`: `{ current: Item | null, phase: 'words' | 'cloze' | 'done', n: number (aşamada cevaplanan), clozeTotal: 15, answer(value: boolean | number): void, level: string | null (yalnızca done), state: ability durumu }`. `Item`: `{kind:'word', word, rank}` | `{kind:'fake', word}` | `{kind:'cloze', q, options, answer, level}`. Kelime aşamasında 0 tabanlı her 6. soru (`n % 6 === 5`) uydurma, tekrar yok; `answer` kelime/uydurma için boolean, cümle için seçilen şık indeksi (doğruysa `known` true); kelime aşaması `abilityDone(state, gerçek kelime sayısı)` ile biter, sonra 15 cümle, sonra `done`.

- [ ] **Step 1: Failing test (`test/placement.test.js`):** hep "evet" oturumu `done` olur, `level` `'A1'|'A2'`, ≤ 50 kelime-aşaması sorusu + 15 cümle; hep "hayır" → `'A1'`; dürüst B1 simülasyonu (θ₀=2400, tohumlu, 30 koşu) ≥ %90 `'A2'..'B2'` ve hiçbir koşuda `'C1'`+ değil; uydurma sayısı ≤ `ceil(kelimeSoruSayısı / 6)` ve hiçbiri `DS.headword` ile eşleşmiyor; aynı kelime iki kez sorulmuyor; `done` olduktan sonra `answer` çağrısı hata atmıyor ve durumu değiştirmiyor; iki oturum farklı `rand` ile farklı ilk sorular veriyor. → FAIL.
- [ ] **Step 2: Implement** `placement.js`; eski `placementSample`/`estimateLevel` ve testlerini sil (bu değişiklikle yetim kalırlar). `FAKE` listesi `DS.FAKE_WORDS` olarak kalır.
- [ ] **Step 3:** `node --test` yeşil.

---

### Task 6: Kurulum sayfasında iki bölümlü test

**Files:**
- Modify: `pages/welcome.html` (adım 2: ipucu metni, düğme, kelime ve cümle arayüzü, script'ler: `freq-en.js`, `ability.js`, `cloze-en.js`, `placement.js`), `pages/welcome.js` (`place` mantığını `DS.placementStart` ile değiştir), `pages/pages.css` (`.place*` yanına cümle seçenek düğmeleri), `pages/welcome-i18n.js`, `popup/popup.js`

**Interfaces:**
- Consumes: Task 5 `DS.placementStart`, Task 1 `quizSize` select.
- Produces: bitişte `save({ level })` ve `chrome.storage.local.set({ ability: session.state })`; seviye select'i elle değişince `chrome.storage.local.remove('ability')` (welcome ve popup'ta).

- [ ] **Step 1: UI.** "Testle bul" düğmesi (sayı yazmadan: "Testle bul"), açıklama metni "kelimeler ve cümleler, birkaç dakika" olarak güncellensin. Kelime aşaması: başlık "Kelimeler · {n}" (toplam yazma, erken bitebilir), kelime + Bilmiyorum/Biliyorum. Cümle aşaması: "Cümleler · {n} / 15", boşluklu cümle, 4 şık düğmesi (hap, `DESIGN.md`), klavye 1–4. Sonuç metni mevcut `placeResult` biçiminde. Görsel dil mevcut `.place-*` ile aynı.
- [ ] **Step 2: Bağla:** bitişte seviye + ability kaydı; elle seviye değişiminde `ability` silinir (welcome ve popup `change` işleyicileri).
- [ ] **Step 3: i18n:** tüm yeni Türkçe metinleri `welcome-i18n.js`'e İngilizce karşılığıyla ekle.
- [ ] **Step 4: Elle doğrulama (sahte `chrome` ile tarayıcı panelinde, önceki oturumdaki yöntemle):** testi baştan sona çöz; her şeye "evet"/"hayır"; cümle aşaması; yeniden başlat; seçimin `prefs.level`'e yazıldığını ve elle değişimde `ability`'nin silindiğini gör. TR/EN geçişinde yeni metinlerin çevrildiğini gör. `node --test` yeşil.

---

### Task 7: Dönen kart, çeviri kuyruğu, özet tablosu

**Files:**
- Modify: `src/core/vocab.js` (`DS.limitedFetcher`), `src/core/overlay.js` (`showQuiz`, CSS `.qcard`/`.qlist`), `src/content/content.js` (`startQuiz`, kayıt yardımcısı)
- Test: `test/vocab.test.js`

**Interfaces:**
- Produces: `DS.limitedFetcher(fetchFn: (key) => Promise<string>, limit = 3) -> { get(key: string, urgent = false): Promise<string> }` (aynı anahtar tek istek, sonuç önbellekte; ≤ limit eşzamanlı; `urgent` kuyruğun önüne geçer; hata önbelleğe girmez). `showQuiz({ words, translate: (word, urgent) => Promise<string>, onDone(answers), onSave({word, translation}) })`.

- [ ] **Step 1: Failing testler (`test/vocab.test.js`):** 10 anahtar, `limit 3`: aynı anda çalışan istek sayısı hiç 3'ü geçmez; aynı anahtar iki kez istenince `fetchFn` bir kez çağrılır; `urgent` anahtar, kuyruktaki sıradan önce başlar; reddedilen istek sonra tekrar istenince `fetchFn` yeniden çağrılır. → FAIL.
- [ ] **Step 2: Implement** `limitedFetcher`. `content.js`: `startQuiz` bir fetcher kurar (`translateText(w,'en','tr')` sarar), tüm kelimeleri `get(w)` ile sıraya koyar; `showQuiz`'a `translate: (w, urgent) => fetcher.get(w, urgent)` ve `onSave` verir. `onSave`: mevcut `saveWord`'un tekrar kontrolü + yazımını ortak bir `storeWord(entry)` yardımcısına çıkar (`saveWord` onu çağırsın), kayıt `{word, translation, from:'en', to:'tr', context:'', at}`; `pages/options.js` boş `context`'i bozuyor mu kontrol et.
- [ ] **Step 3: Kart.** "Bilmiyorum" → kart `rotateY(180deg)` ile döner (ön: kelime ve sorular, arka: kelime, Türkçe anlam, "Devam"), anlam `translate(word, true)`; hazır değilse "…", hata ya da 8 sn zaman aşımında "Anlam bulunamadı". "Biliyorum" doğrudan sonrakine geçer. `prefers-reduced-motion`'da döndürme yerine çapraz solma. Dönerken odak arkadaki "Devam"a gider; Enter/Space/Esc/Tab tuzağı mevcut davranışla çalışır; klavye olayları sayfaya sızmaz.
- [ ] **Step 4: Özet.** Bilinmeyen kelimeler için tablo (Kelime · Anlam · Kaydet), her satırda "Kaydet" (basınca "Kaydedildi", tekrar basılamaz), üstte "Hepsini kaydet"; çeviri kuyruğundan gelen anlam yoksa satır "Anlam bulunamadı". `onDone` mevcut gibi çalışır.
- [ ] **Step 5: Elle doğrulama:** sahte `chrome` ile kart akışı: "Bilmiyorum" → dönme, anlam gecikmeli/hatalı/hızlı üç durumda; Esc ile erken çıkış; özet tablosu, tek ve toplu kaydet, `words`'e bir kez yazıldığı; 20 kelimede istek sayısının 3'ü geçmediği. `node --test` yeşil.

---

### Task 8: Ortada "Altyazılar yükleniyor" göstergesi

**Files:**
- Modify: `src/core/overlay.js` (`.quizload` CSS/HTML, `tick`, `showQuiz` ile `held` bağı), `src/content/content.js` (`quizTick`, `quizCancel`)

**Interfaces:**
- Produces: `cfg.quizCancel()` (overlay'den çağrılır; ilgili parçayı `quizDone`'a ekler). `quizTick()` 15 sn sonra (`LOAD_TIMEOUT_MS = 15000`) `false` döner ve parçayı `quizDone`'a ekler.

- [ ] **Step 1: Görünüm.** `.quizload`'u videonun ortasında tek eleman yap: kâğıt-kart hap (renk/Outfit/çizgi ikon `DESIGN.md`), dönen halka + "Altyazılar yükleniyor…" (`role="status"`, `aria-live`), `pointer-events: none`. Eski köşe konumu/tooltip kaldırılır. `prefers-reduced-motion`'da halka dönmez.
- [ ] **Step 2: Duraklat/devam.** Yükleme başlayınca (`loading` false→true) video oynuyorsa duraklat ve `held = {wasPlaying}` sakla. Yükleme kullanıcı oynat'a basmadan biterse: `showQuiz` açılıyorsa `held.wasPlaying` bilgisi `showQuiz`'a geçer (yeniden hesaplanmaz); test gösterilmeyecekse (aday az, hata, zaman aşımı) `held.wasPlaying` ise `play()`. Yükleme sırasında kullanıcı oynatırsa (`!v.paused`): yüklemeyi iptal et (`cfg.quizCancel()`), `held` temizle, video oynar, test bu parça için bir daha çıkmaz.
- [ ] **Step 3: Elle doğrulama (sahte `chrome`):** altyazı hızlı gelir → gösterge kısa çıkar, kart açılır, test bitince video devam; altyazı hiç gelmez → 15 sn sonra gösterge kalkar ve video oynar; yüklenirken oynat'a basmak → test iptal, video oynar; İngilizce parça olmayan sayfada gösterge hiç çıkmaz; tam ekran `<video>`; ayarlarda `preQuiz` kapalıyken gösterge yok. `node --test` yeşil.

---

### Task 9: Video öncesi cevaplardan seviyeyi güncelleme

**Files:**
- Modify: `src/core/ability.js` (`DS.abilityAfterQuiz`), `src/content/content.js` (`saveVocab`)
- Test: `test/ability.test.js`

**Interfaces:**
- Produces: `DS.abilityAfterQuiz(state, answers: {word: string, known: boolean}[]) -> state` (`DS.freqRank` olmayan kelimeler atlanır; diğerleri `{kind:'word', rank}` olarak güncellenir; `answers` boşsa durum aynı kalır).

- [ ] **Step 1: Failing testler:** `abilityNew('B1')` + yüksek sıralı 6 kelimeye "biliyorum" → `abilityQuantile(0.5)` artar; seviyenin çok üstündeki 6 kelimeye "bilmiyorum" → medyan 10%'dan az değişir; `freqRank` olmayan kelimeler durumu değiştirmez; `abilityAfterQuiz(s, [])` değeri değiştirmez. → FAIL.
- [ ] **Step 2: Implement.** `content.js` `saveVocab`: `vocab` yazıldıktan sonra `chrome.storage.local`'den `ability` oku (yoksa `DS.abilityNew(prefs.level)`), `abilityAfterQuiz` uygula, kaydet; `DS.abilityLevel(next) !== prefs.level` ise `prefs.level`'i mevcut `chrome.storage.sync` `prefs` yazma kalıbıyla güncelle (aynı kalıbı `content.js`/`popup.js`'te bul, çoğaltma).
- [ ] **Step 3:** `node --test` yeşil. Elle: sahte `chrome` ile birkaç "biliyorum" sonrası `prefs.level`'in yükseldiğini ve popup'tan elle seviye değişince `ability`'nin silindiğini gör.

---

### Task 10: Dokümantasyon ve son kontrol

**Files:**
- Modify: `docs/memory/status.md`, `docs/memory/decisions.md`, `docs/memory/architecture.md` (yeni dosyalar: `freq-en.js`, `ability.js`, `cloze-en.js`, `placement.js`), `README.md` (test ve atıflar), `DESIGN.md` (dönen kart ve ortadaki yükleniyor göstergesi), `CLAUDE.md` komut satırındaki test sayısı

- [ ] **Step 1:** `decisions.md`'ye: seviye tahmininin neden sıklık + Bayes + %25 yüzdelik (B1→B2 hatası), eşik tablosunun tahmin olduğu, FrequencyWords/CEFR-J/Octanove lisans notları, yükleniyor sırasında duraklatma kararı, `ability` kaydının nerede durduğu.
- [ ] **Step 2:** `status.md`'yi güncelle: ne bitti, **gerçek Chrome'da denenmedi** olanlar (gerçek altyazı akışı, tam ekran, iframe, 429, kullanıcının B1 testi), sıradaki: eşik tablosunu kullanıcı sonucuyla ayarla.
- [ ] **Step 3:** `node --test` tam yeşil; test sayısını `CLAUDE.md`'ye yaz. Kullanıcıya elle deneme için eklentiyi yenilemesini ve kurulum testini çözüp sonucunu (hedef: B1) bildirmesini söyle.
