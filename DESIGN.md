# Looptions tasarım dili

Yeni bir ekran, bileşen veya overlay parçası çizmeden önce oku. Kaynak: `popup/popup.css` (token'lar), `pages/pages.css` (tam sayfa yüzeyler), `src/core/menu.js` ve `src/core/overlay.js` (videonun üstündeki parçalar). Burada yazanla kod çelişirse kod doğrudur; burayı düzelt.

## Karakter

Sıcak, yumuşak, oyuncu. Kâğıt rengi zemin, patlıcan mürekkebi, turuncu vurgu, leylak ikinci ses. Her şey yuvarlak: düğme ve alanlar hap (pill), kartlar 24–40px köşe. Grenli degrade alanlar (grain), yüzen baloncuklar ve logonun iki çubuğunu taşıyan cam baloncuk imza öğeleridir. Sert kenarlık, keskin köşe, saf siyah, düz mavi/gri "sistem" görünümü bu dile ait değil.

## Token'lar (`popup/popup.css` `:root`)

| Token | Değer | Kullanım |
|---|---|---|
| `--paper` | `#fcf9fb` | Sayfa/kart zemini |
| `--card` | `#fff` | Üst katman: alan, rozet |
| `--ink` | `#2d2134` | Metin (patlıcan) |
| `--muted` | `#776a82` | İkincil metin |
| `--line` | `#ece3ef` | İnce çerçeve |
| `--lilac` / `--lilac-soft` | `#a594e3` / `#efe9fb` | Ana dil, seçili/pasif durum |
| `--peach` | `#f27a36` | Vurgu, odak halkası, kaydırıcı ucu |
| `--peach-deep` | `#c4501a` | Beyaz üstünde okunan turuncu: küçük metin, birincil düğme |
| `--peach-soft` | `#fde9dc` | Turuncu hafif zemin |
| `--shadow` | `0 10px 24px -14px rgba(90,50,110,.35)` | Alan/rozet gölgesi |
| `--ease` | `cubic-bezier(.22,1,.36,1)` | Tüm geçişler |

Renkleri token'sız yazma. Overlay içinde (kapalı shadow root) CSS değişkenleri taşınmadığı için aynı değerler `menu.js`'te `.menu` altında yeniden tanımlıdır; yeni overlay parçası da aynı değerleri kullanır.

## Tipografi

- Arayüz yazı tipi **Outfit** (paketli, OFL). Yedek: `"Segoe UI", system-ui, sans-serif`. Overlay içinde aile adı `"Looptions Outfit"`; `loadUiFont()` ilk kullanımda yükler, yeni overlay parçası açılırken onu çağırır.
- Gövde 13.5px (popup) / 15px (tam sayfa). Başlıklar 650 ağırlık, `letter-spacing: -.02em`. Küçük etiketler (kicker) büyük harf, `.1–.12em` aralık, 650, `--peach-deep`.
- Sayılar `font-variant-numeric: tabular-nums`. Büyük sayı çıktıları 700, `--peach-deep`.
- **Logo ve isim:** logo `icons/` ile aynı: beyaz, köşesi %25 yumuşak kare (`.mark`, gölge + 1px `--line`), içinde altta duran iki hap (turuncu hedef, leylak ana dil). Disk, koyu kutu ya da çerçevesiz çubuk kullanma. İsim yalnız burada **DM Sans**: `Loop<span>tions</span>`, "Loop" 700, "tions" 400, `letter-spacing: -.03em` (`.wordmark`). Başka yerde kullanma. Overlay menüsünde aile adı `"Looptions Wordmark"` (`loadUiFont` yükler).
- Altyazı yazı tipi arayüzün parçası değil, kullanıcı seçimidir; ikisini karıştırma.

## Yüzeyler

- **Kâğıt kart**: `--paper`, köşe 24px (overlay'de em ile ~1.4em), gölge `0 22px 44px -16px rgba(70,35,90,.55)`. Videonun üstündeki her açılır parça (menü, kelime kartı) böyle.
- **Alan degradeleri** (`pages.css`): `field-peach`, `field-lilac`, `field-orange` + `.grain` (soft-light grenli doku, opaklık ~.34). Hero ve vurgu kartları için. Üstündeki metin AA geçmeli; turuncu alanda beyaz yalnız koyu bölgede.
- **Hap alanlar**: select/input yüksekliği 38px, `--line` ince çerçeve, `--shadow`.
- Kart içinde kart yok. Ayırmak için boşluk kullan, çerçeve değil.

## Düğmeler

- **Birincil** (tek eylem, örn. Kaydet): turuncu alan degradesi (`radial #f7a466` köşede + `linear 150deg #c4501a → #a9420f`), beyaz metin 650, hap, solda 1.1em çizgi ikonu, turuncu gölge. Hover: 1px yukarı.
- **Tamamlandı/pasif**: `--lilac-soft` zemin, `#5b4a8f` metin, gölgesiz, ikon bir kez "tick" animasyonuyla çarpı→onay. Başarıyı kırmızı/yeşille değil leylakla söyle.
- **Hayalet**: zeminsiz, `--muted`; hover'da `--lilac-soft`.
- **Tehlikeli** (silme): beyaz zemin, `#f6b48d` çerçeve, `--peach-deep` metin.
- Odak: `2px solid --peach-deep` (`--peach` kâğıtta 2,6:1, yetmez; peach'li hero üstünde `--ink`), `outline-offset: 2px`. Asla kaldırma. Anahtar: kapalı iz `#8f829b`, açık iz `--peach-deep`.

## İkonlar

24×24 viewBox, dolgusuz çizgi, `stroke: currentColor`, kalınlık 1.8–2, yuvarlak uç ve birleşim. Emoji ve unicode simge (✓, ×) yerine çizgi ikon.

## Hareket

Süre 160–500ms, hep `--ease`. Girişte hafif yükselme (`rise`), vurguda küçük "pop"/"tick". Kurulumdaki baloncuklar ve ayar sayfasındaki logo baloncuğu 6–7s yavaş süzülür. `prefers-reduced-motion` altında süslü hareketi kapat. Altyazı satırı geçişleri sakin kalır: dikkat videoda.

## Videonun üstünde (overlay) kurallar

- Overlay `pointer-events: none`; yalnız kendi eleman tıklanabilir (kelimeler, logo, menü, kelime kartı). Tıklamalar sayfaya sızmaz (`stopPropagation`).
- Videodaki logo koyu (`#231a2a`), %25 yumuşak kare; çerçeve, beyaz zemin, disk yok. Giriş (video açılınca ve kelime testi bitince, 2,6 sn): turuncu kesikli çizgiler logonun yerini tek tek (tak tak) sarar, logo tam opak belirir, 1 sn durur, sonra logo ve çizgiler tamamen silinir; ardından normal boşta kuralı (fare, duraklatma, menü) çalışır.
- Altyazının kendisi (satırlar, `.secondary` sarısı, kontur/gölge stilleri) kullanıcı ayarıdır; kâğıt/leylak dili yalnız **arayüz** parçaları içindir (menü, kelime kartı, logo).
- Boyutlar `em` ile; overlay ölçeğiyle birlikte büyür.
- Kısayol geri bildirimi (`.tag`, `flash(text, act, label)`): kâğıt hap, solda `--peach-soft` daire içinde `--peach-deep` çizgi ikon, yanında yalnız kalın değer (hız/sarma/satır tuşlarında yazı etiketi yok, ikon anlatır; küçük gri etiket yalnız aç/kapa bildiriminde), 1,2 sn. Logonun boş bıraktığı üst köşede çıkar: varsayılan sol üst, logo sol üstteyse sağ üst. Aynı ikonlar popup ve ayarlarda ayar adının önünde (`.lbl-ic`). Sarı etiket kullanma; sarı yalnız altyazının `.secondary` rengidir.
- **Video öncesi test kartı** (`.qcard`): kâğıt kart, "Bilmiyorum" kartı yatay çevirir (`rotateY`, 160ms + 220ms, zamanlayıcıyla; `prefers-reduced-motion` altında çevirmeden değiştirir). Arka yüz: kelime, turuncu (`#c4501a`) anlam, geniş "Devam". Özet: hap satırlar (kelime · anlam · "Kaydet"), altta "Hepsini kaydet" (leylak) ve "Videoya geç" (birincil).
- **Yükleniyor hapı** (`.quizload`): videonun tam ortasında, kâğıt hap, dönen turuncu halka + "Kelime testi hazırlanıyor…" + altında soluk "Atlamak için videoyu oynat", tıklanamaz. Video zaten duraklıysa da görünür (tutulmaz, yalnızca gösterilir). Video bu sırada duraklı tutulur.

## Yeni parça kontrol listesi

1. Token dışı renk yok; küçük metinde `--peach-deep`, `--peach` değil.
2. Hap/yuvarlak form, çerçeve yerine boşluk ve yumuşak gölge.
3. Outfit; overlay'deyse `loadUiFont()`.
4. Çizgi ikon, emoji yok.
5. Odak halkası ve klavye erişimi duruyor; durum yalnız renkle anlatılmıyor.
6. Kullanıcıya dönük metin Türkçe, kısa, nazik ("Kaydedilemedi", "Henüz kelime yok").
