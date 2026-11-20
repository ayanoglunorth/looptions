# Tanıtım videoları Implementation Plan

> **Not:** Bu plan işin başında yazılmadı. Kullanıcı "bitirene kadar durma" dediği için tasarım ve yapım doğrudan ilerledi; plan sonradan, ne yapıldığını ve her adımın nasıl doğrulandığını kaydetmek için yazıldı. Yeniden üretmek ya da yeni bir video eklemek isteyen bunu izleyebilir.

**Goal:** Looptions için Instagram reklamında kullanılacak üç farklı 9:16, 30 sn, müzikli video.

**Architecture:** Eklentiden bağımsız `promo/` Remotion projesi. Ortak `theme.ts` (DESIGN.md token'ları), eklenti arayüzünün birebir kopyaları (`src/ui/`), her video kendi dosyasında (`src/videos/V*.tsx`). Kesmeler ölçülen müzik vuruşuna oturur.

**Tech Stack:** Remotion 4.0.545, React 19, `@phosphor-icons/react`, `@remotion/media`, ffmpeg (müzik kesme, `loudnorm`).

**Spec:** `docs/superpowers/specs/2026-11-19-tanitim-videolari-design.md`

## Global Constraints

- 1080×1920, 30 fps, 900 kare. Üstten 130 px, alttan 330 px boş (Reels arayüzü).
- Renk ve easing yalnız `src/theme.ts` token'larından; yeni yazı tipi yok (Outfit, wordmark DM Sans, altyazı Roboto).
- Metin kontrastı: normal ≥4.5:1, büyük ≥3:1. Leylak zeminde turuncu metin `peachInk` (#8f330a), leylak üstü beyaz metin yok.
- Müzik Mixkit Stock Music Free License: yalnız kes ve ses ayarla, remiks yok.
- İddia yok: "ücretsiz", uydurma sayı/yorum, gerçek film karesi, üçüncü taraf logosu yok. Anlatılan her özellik kodda var olmalı.
- Eklenti paketine girmemeli (`scripts/pack.js` izin listesi) ve `node --test` sayısı değişmemeli.

## Review Focus

- Türkçe karakterler (ğ ş İ ı ç ö ü) her yazı tipinde render olmalı (latin-ext alt kümesi).
- İlk karede kanca yazısı görünmeli (animasyon sıfırdan başlamamalı).
- Kesme anları müzikle hizalı olmalı (V1 düşüş 12,63 sn, V2 ilk kare).
- Ses -14 LUFS, tepe ≤ -1 dBTP.
- Görsel öğeler Reels'in alt 330 px bandına taşmamalı.

### Task 1: Remotion ve proje

**Files:** Create `promo/` (create-video), `promo/public/fonts/*`, `promo/public/music/v{1,2,3}.mp3`, `promo/scripts/make-sfx.mjs`.

- [x] Resmî Remotion becerisi: `npx skills add remotion-dev/skills -g` (14 skill kuruldu).
- [x] `npx create-video@latest --blank promo`, bağımlılıklar.
- [x] Müzik: Mixkit lisansı okundu, parçalar indirildi, BPM/ilk vuruş ölçüldü (`beats.py` mantığı), 30 sn kesit + `loudnorm`.
- [x] SFX: `node promo/scripts/make-sfx.mjs` → `public/sfx/*.wav` (9 dosya).

### Task 2: Ortak bileşenler

**Files:** `src/theme.ts`, `src/fonts.tsx`, `src/lib/motion.tsx`, `src/ui/{Backdrop,Brand,Captions,Bits,Player,Tip}.tsx`.

**Interfaces:** `beat(bpm, n): number` (kare), `Enter`, `Scene`, `Sfx`; `Captions({primary, secondary, look, hl})`; `Tip({word, meaning, save})`.

- [x] Doğrulama: `cd promo && npx tsc && npx eslint src` → 0 hata.

### Task 3: Üç video

**Files:** `src/videos/V1Both.tsx` (`V1-IkisiBirden`), `V2Rewind.tsx` (`V2-GeriSar`), `V3Notebook.tsx` (`V3-KelimeDefteri`), `src/Root.tsx`.

- [x] Her kompozisyonda sahne başına `remotion still` ve tam render sonrası `scripts/sheet.sh` ile kare şeridi, bakıp düzelt.
- [x] Kontrast denetimi (WCAG hesabı) → leylak üstü bulgular düzeltildi (2026-11-19, ikinci tur).

### Task 4: Render ve ses ustalaştırma

- [x] `cd promo && scripts/master.sh <CompId> <ad>` (render, iki geçişli `loudnorm` -14 LUFS).
- [x] Beklenen: `ffprobe` 1080×1920, 30 fps, 30,0 sn; `ebur128` I ≈ -14,1 LUFS, tepe ≈ -1,4 dBFS.

### Task 5: Hafıza ve teslim

- [x] `docs/memory/{status,decisions,architecture}.md`, `promo/README.md`.
- [x] `node --test` sayısı değişmedi (94/94).

## Doğrulanmayanlar

Gerçek Instagram yüklemesi, kulakla dinleme, telefonda izleme. Kullanıcıya bırakıldı.
