# Video öncesi kelime testi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** İngilizce videolarda, altyazı hazır olunca videoyu durdurup kullanıcının seviyesinin üstündeki 10 kelimeyi "biliyor musun?" diye soran kart; kurulumda seviye seçimi ve 20 soruluk düzeltme testi.

**Architecture:** Saf mantık `src/core/vocab.js` (+ veri `src/core/words-en.js`), Node'da test edilir. Kart ve yükleniyor göstergesi `overlay.js` içinde (kapalı shadow root). `content.js` tetikler (altyazı hazır mı, uygun mu) ve cevapları `storage.local`'a yazar.

**Tech Stack:** Vanilla JS, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-17-pre-video-vocab-quiz-design.md`

## Global Constraints

- Derleme adımı, bağımlılık yok. Kullanıcı metni Türkçe, kod yorumu İngilizce.
- Oxford listesi kullanılmaz; yalnızca CEFR-J 1.5 + Octanove C1/C2 (README'de atıf).
- Çalışan davranışı bozma: kart yalnızca `primary==='en' && secondary==='tr' && preQuiz!==false`.
- Overlay `pointer-events: none`; kart ve gösterge kendi elemanında tıklanabilir, olaylar sayfaya sızmaz.
- Commit atılmaz (kullanıcı istemedi).

## Review Focus

- Video başlamış/duraklamış/hiç başlamamış: kart yalnızca biz durdurduysak `play()` çağırır.
- Oynatıcı kartın arkasında `play()` çağırırsa tekrar durdurulur; boşluk tuşu sayfaya gitmez.
- Kart açıkken overlay yok edilirse (altyazı kapanır) video yine serbest kalır.
- Aynı altyazı için kart ikinci kez çıkmaz; 60 sn'den sonra gelen altyazıda hiç çıkmaz.
- Çeviri uç noktası hata verirse kart yine çalışır (çevirisiz özet).

---

### Task 1: Kelime verisi ve çekirdek mantık

**Files:**
- Create: `scripts/make-wordlist.js`, `src/core/words-en.js` (üretilir), `src/core/vocab.js`, `test/vocab.test.js`

**Interfaces — Produces:**
- `DS.LEVELS = ['A1','A2','B1','B2','C1','C2']`, `DS.WORDS_EN: {A1: 'a an …', …}`
- `DS.headword(token: string): {word: string, rank: number} | null` — `rank` = `LEVELS` indeksi
- `DS.pickQuizWords(texts: string[], levelRank: number, vocab: object, n = 10): {word, rank, count}[]`
- `DS.QUIZ_MIN = 3`
- `DS.placementSample(rand = Math.random): {word, rank}[]` — A2..C2'den 4'er, 20 eleman
- `DS.estimateLevel(answers: {rank, known}[]): string` — bir seviye ≥3/4 biliniyorsa o seviye; hiçbiri değilse `'A1'`; en yüksek geçen seviye döner

- [x] **Step 1:** `scripts/make-wordlist.js <cefrj.csv> <octanove.csv>`: boşluksuz, yalnız harf/kesme olan başlıkları (eğik çizgiyle ayrılmış varyantları ayırarak) küçük harfle toplar, en düşük seviyeyi tutar, `src/core/words-en.js` yazar.
- [x] **Step 2:** Testler (`test/vocab.test.js`): `headword('running')` → `run`; `headword('ran')` → `run`; `headword('cities')` → `city`; `headword('boxes')` → `box`; `headword('xyzzy')` → `null`; `headword('was')` ve `headword('does')` yanlış kökle eşleşmez; `pickQuizWords` bilinen/seviye altı kelimeyi atar, sıklığa göre sıralar, `vocab` içindekini atar; `placementSample(() => 0.5)` 20 eleman ve her seviyeden 4; `estimateLevel` sınır durumları.
- [x] **Step 3:** `vocab.js` yaz. Ek soyma: `-s -es -ies -ed -ied -ing -er -est -ly`, çift ünsüz ve düşen `e`; kök ≥3 harf; düzensiz tablo ~150 giriş. Tam eşleşme her zaman önce.
- [x] **Step 4:** `node --test` hepsi geçer.

### Task 2: Kart ve yükleniyor göstergesi (overlay)

**Files:** Modify `src/core/overlay.js`; Test: elle.

**Interfaces — Produces:** `overlay.showQuiz({ words: {word}[], translate: (w) => Promise<string>, onDone: (answers: {word, known}[]) => void })`; `cfg.quizTick?: () => boolean` (gösterge görünürlüğü, her karede çağrılır).

- [x] **Step 1:** CSS (`DESIGN.md` token'ları, kart, düğmeler, gösterge, `prefers-reduced-motion`), DOM ve `showQuiz`: video duraklatılır, tam ekran video ise `exitFullscreen`, fade-in 700 ms, klavye (Enter/Space etkin düğme, Esc = Geç, diğerleri yutulur), `play` olursa tekrar durdur, bitince yalnızca biz durdurduysak `play()`; `destroy()` kartı kapatır.
- [x] **Step 2:** Gösterge: logonun yanında dönen halka, hover/odakta "Test yükleniyor…".

### Task 3: Tetikleme, ayar, popup

**Files:** Modify `src/content/content.js`, `src/core/lang.js` (`DEFAULT_PREFS`), `manifest.json` (betik sırası), `popup/popup.html`, `popup/popup.js`, `popup/popup.css`

- [x] **Step 1:** `DEFAULT_PREFS`'e `preQuiz: true, level: 'A2'` (+ lang testi).
- [x] **Step 2:** `content.js`: `quizTick`, `startQuiz`, cevapları `storage.local.vocab`'a birleştirerek yaz.
- [x] **Step 3:** Popup bölümü: anahtar + seviye seçimi, yalnız en→tr iken görünür.

### Task 4: Kurulum seviyesi adımı

**Files:** Modify `pages/welcome.html`, `pages/welcome.js`, `pages/pages.css`

- [x] **Step 1:** Yeni adım (index 2): seviye seçici + "20 soruluk testle bul"; en→tr değilse adım atlanır, adım numaraları güncellenir. Test sonucu seçiciyi günceller, cevaplar saklanmaz.

### Task 5: Belgeler ve doğrulama

- [x] `README.md` (özellik + kelime listesi atfı), `docs/memory/{status,decisions,architecture}.md` güncelle; `node --test` çalıştır; fixture sunucusu ile elle denenemeyen kısımları status'a yaz.
