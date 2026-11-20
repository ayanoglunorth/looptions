> **GÜNCEL DEĞİL (2026-11-16):** Bu plan Chrome cihaz içi Translator API varsayıyordu, o kaldırıldı. Kelime çevirisi artık Google herkese açık uç noktasıyla (`background.js` `googleWord`). Güncel hâl: `docs/memory/architecture.md`, `decisions.md`. Bu dosya yalnızca tarihçe.

# Kelimeye tıkla, çevirisini gör (plan)

Durum: kullanıcı sohbette onayladı (2026-11-15).

**Amaç:** Altyazıdaki bir kelimeye tıklayınca video durur, kelimenin çevirisi küçük bir kutuda görünür.

**Mimari:** Altyazı dosyaları ve çift altyazı akışı aynen kalır. Kelimeler yalnızca ekrandaki satır yazılırken `Intl.Segmenter` ile `<span class="w">` olur. Tıklayınca `content.js`, mevcut `translateBatch` ile yalnızca o kelimeyi çevirir (Chrome'un cihaz üzerindeki Translator API'si). Sürekli çeviri yok, ağ/API maliyeti yok. Saf mantık `lang.js` içinde, Node testli.

## Kısıtlar (kullanıcıdan)

- Çalışan hiçbir şey bozulmaz: iki gerçek altyazı varsa sadece basılır, Translator'a dokunulmaz. Makine çevirisi akışı (`fillTranslations`) değişmez.
- Minimum kod. Yeni bağımlılık, yeni ayar, yeni izin yok.
- Siteye/oynatıcıya özel kod yok.
- LLM, Wiktionary, kelime defteri bu işin dışında.

## Kararlar

- **Yön:** Tıklanan satırın dili → diğer satırın dili. Diğer satır yoksa (veya aynı dilse) popup'taki öteki tercih dili. Dil bilinmiyorsa kutu "Çeviri yok" der.
- **Tıklanabilir alan:** yalnızca kelimenin kendisi (`.w { pointer-events: auto }`). Boşluklar ve satır dışı alan tıklamayı videoya geçirir. Swap modunda görünmeyen satırın kelimeleri tıklanamaz.
- **Sızıntı:** overlay içindeki `click/dblclick/pointerdown/mousedown` sayfaya gitmez (tam ekranda host oynatıcı sarmalayıcısının içine girer, yoksa oynatıcı durur/tam ekrana geçer).
- **Duraklat:** tıklayınca `video.pause()`. Kutu, video oynayınca veya kutu dışına tıklayınca kapanır. Otomatik devam yok.
- **Önbellek:** yalnızca bellekte (`Map`). Kalıcı sözlük sonra.
- **Çakışma notu:** `overlay.js`'e "Oynatıcı içi menü" planı (Task 3-4: logo, menü) da dokunacak. Bu iş ondan önce bitti, o plan `.stack`/`.line` yapısına kelime `span`'lerinin eklendiğini bilmeli.

## Görevler

### Task 1: Saf mantık (`src/core/lang.js`) + test
- `DS.splitWords(text, lang)` → `[{ t, word }]`. `Intl.Segmenter`, `isWordLike`.
- `DS.lookupPair(role, lines, prefs)` → `{ from, to }` veya `null`.
- `test/lang.test.js` içinde: boşluk/noktalama korunur ve birleştirince metin aynen çıkar, `don't` tek kelime, boş metin, Türkçe harfler; yön seçimi (iki satır, tek satır, bilinmeyen dil, aynı dil).
- Doğrulama: `node --test` hepsi geçer.

### Task 2: Overlay (`src/core/overlay.js`)
- `show()` metni `splitWords` ile `span`'lere böler (`replaceChildren`). Düz metin görünümü aynı kalmalı.
- CSS: `.w` (imleç, hover), `.tip`, swap modunda gizli satırda `.w` tıklanamaz.
- `root` üzerinde tek tıklama dinleyicisi: olayı durdurur, `.w` ise videoyu duraklatır, kutuyu kelimenin üstüne koyar, `cfg.onWord(kelime, role)` sonucunu yazar. Metin yalnızca `textContent` ile (sayfa metni asla `innerHTML` değil).
- Kapanma: `play`, belge `pointerdown`'ı (kutu dışı), `destroy()`.

### Task 3: Bağlama (`src/content/content.js`)
- `lookupWord(word, role, lines)`: `DS.lookupPair`, `translateBatch([word], from, to)`, `Map` önbelleği (hata olursa silinir).
- `apply()` içinde overlay'e `onWord` verilir. Başka satıra dokunulmaz.

### Task 4: Doğrulama
- `node --test` geçer.
- Tarayıcıda overlay sahte bir `<video>` ile denenir: bölünmüş metin, tıklama, duraklatma, kutunun yeri, dışına tıklayınca kapanma, swap modunda gizli satır.
- Elle (eklentiyle): README "Geliştirme" bölümündeki test sayfaları. İlk tıklamada model indirmesi.

### Task 5: Dokümantasyon
- README: "Kelime çevirisi" bölümü ve sınırlar. `docs/memory/status.md` ve `decisions.md` güncellenir.

## Bilinen sınırlar (baştan kabul)

- Tek kelime çevirisi bağlamsız ve kök bulmaz ("running" → "run" olmaz). Kalite Translator'a bağlı, gerçek denemede görülecek.
- Çapraz kaynaklı iframe'de model **ilk kez** indirilecekse tıklama üst çerçevede sayılmaz, çeviri bekler. Popup'tan model indirilmişse sorun yok.
- `<video>` kendisi tam ekranda ise overlay çizilemez, tıklama da yok (mevcut sınır).
- Overlay oynatıcının dışında olduğu için fare kelimenin üstüne gelince bazı oynatıcılar kontrol çubuğunu gizleyebilir.
