# Oynatıcı içi logo + menü (tasarım)

Durum: kullanıcı sohbette onayladı (2026-11-15).

## Amaç
Kullanıcı oynatıcıdan çıkmadan altyazı ayarlarına ulaşsın. Popup ve gelişmiş ayarlar kalır; üçü de aynı ayarı gösterir.

## Hedefler
- Videonun üstünde yarı saydam logo düğmesi (varsayılan sol üst). Tıklayınca oynatıcı içi menü açılır.
- Logo: fare videonun üstünde hareket ederse veya video duraksa görünür; video oynuyorsa ve ~3 sn hareket yoksa kaybolur. Menü açıkken kaybolmaz.
- Menü: stil, boyut, arka plan opaklığı, dikey konum, satır kaydırma (±sn), logo köşesi.
- Tek doğruluk kaynağı: `chrome.storage.sync` `prefs` (kalıcı) ve `setSel` (sekmeye özel: parça seçimi, kaydırma).
- Ek: satır kaydırma kısayolları (±0,25 sn), altyazı dikey konumu, arka plan opaklığı (şu an ayar değil).

## Hedef dışı
- Oynatıcının kendi alt barına gömme / adapter (kırılgan; native `controls` shadow DOM'una zaten girilemez). İstenirse sonra, ortak düğme kodunun üstüne YouTube adapter'ı.
- Sözlük / kelime defteri (`options.js` başında not var). Ayrı iş.

## Anti-hedef
Siteye veya oynatıcıya özel kod gerektiren çözüm; videonun üstünde tıklamaları yutan bir katman.

## Kısıtlar / tespitler
- Overlay `pointer-events: none` ve kapalı shadow root içinde (`src/core/overlay.js`). Yalnızca düğme ve menü `pointer-events: auto` olur.
- `<video>` elemanının kendisi tam ekran olursa hiçbir şey çizilemez (bilinen sınır, logo da aynı).
- YouTube tam ekranda sol üstte başlık çıkar: köşe seçilebilir olmalı.
- `content.js` zaten `prefs` değişimini dinliyor; `options.js` de dinliyor. **Popup dinlemiyor** (yalnızca `session`): eklenecek, aksi halde başka yerde yapılan değişiklik açık popup'ta eski görünür.
- Parça seçimi/kaydırma `prefs` değil, `setSel` ile background'da oturumluk. Menü aynı mesajı göndermeli, `content.js` içinde ayrı durum tutulmamalı.
- Opaklık ve dikey konum yeni `prefs` alanları: `DS.DEFAULT_PREFS` ve `DS.lookVars` (`src/core/lang.js`) genişler; popup ve options bu alanlar için kontrol alır.

## Yaklaşımlar
1. Sadece yüzen düğme: oynatıcı bağımsız, en az kod.
2. Bara gömme adapter'ları: doğal görünür, kırılgan, bakım yükü.
3. Karma: 1 ile başla, gerekirse tek adapter.

Seçilen: **1** (sol üst logo, fare/duraklama ile gizlenir). Neden: fare-boşta kuralı çoğu oynatıcının kendi bar davranışıyla yaklaşık aynı anda çalışır, DOM'a girmez.

## Builder'a bırakılanlar
Menü görsel dili (popup'la tutarlı), logo boyutu ve opaklık değerleri, gizlenme süresi (başlangıç 3 sn), kısayol tuşlarının varsayılanı, menünün küçük videoda taşmaması.
