# Ana dildeki videoda otomatik kapanma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** YouTube'da konuşma dili ana dil olan videoda eklenti o video için kendiliğinden kapanır; logo menüsündeki anahtar açar.

**Architecture:** Saf karar `DS.spokenNative(tracks, prefs)` (`src/core/lang.js`). `content.js` `apply()` bunu `offVideo` düzeneğine bağlar; elle açılan video `userOnKey` ile korunur.

**Tech Stack:** Vanilla JS, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-17-native-language-video-auto-off-design.md`

## Global Constraints
- Yalnızca YouTube `asr` parçası (`id` `yt:<dil>:asr`). Başka site davranışı değişmez.
- Kalıcı kayıt yok; video/kaynak değişince yeniden değerlendirilir.

## Review Focus
- `en-US` gibi bölgeli kod: `track.lang` zaten kısaltılmış gelir; test `lang: 'tr'` ile.
- Elle açıldıktan sonra `apply()` tekrar çalışınca (parça güncellemesi) yeniden kapanmaz.

### Task 1: `DS.spokenNative`

**Files:** Modify `src/core/lang.js` (`pickTracks`'ın altı); Test `test/lang.test.js`

**Interfaces:** Produces `DS.spokenNative(tracks: {id, lang}[], prefs: {secondary}) -> boolean`: `tracks` içinde `id` `yt:` ile başlayıp `:asr` ile biten ve `lang === prefs.secondary` olan parça varsa true.

- [ ] Test: `yt:tr:asr`/`lang tr`/secondary `tr` → true; `yt:en:asr` → false; `yt:tr` (elle yazılmış) → false; `yt:tl:tr` → false; boş liste → false.
- [ ] Çalıştır, başarısız olduğunu gör (`node --test test/lang.test.js`).
- [ ] Uygula, geçtiğini gör.

### Task 2: `content.js` bağlantısı

**Files:** Modify `src/content/content.js` (`apply`, `setVideoOff`)

- [ ] `let userOnKey = ''`. `setVideoOff(off, video)`: `userOnKey = off ? '' : videoKey(video)`.
- [ ] `apply()`: `offVideo` sıfırlama satırından sonra: `video && !offVideo && userOnKey !== videoKey(video) && DS.spokenNative(allTracks, prefs)` ise `offVideo = video; offKey = videoKey(video)`.
- [ ] `node --test` (hepsi geçmeli). Elle doğrulama notu `status.md`'ye.
- [ ] `docs/memory/status.md` + `decisions.md` güncelle.
