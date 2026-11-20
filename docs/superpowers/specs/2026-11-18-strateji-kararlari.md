# Looptions – Karar ve Yol Haritası Raporu (2026-11-18, son)

Bu rapor bir agent'ın aşama aşama uygulaması için yazıldı. Her aşama kendi içinde bitirilebilir. Bir aşamaya başlamadan önce `docs/memory/status.md`'yi oku, bitirince `status.md` ve gerekiyorsa `decisions.md`'yi güncelle. Kod yorumları İngilizce, kullanıcıya dönük metinler Türkçe (`CLAUDE.md`). Aşamaları sırayla yap, bir önceki bitmeden sonrakine geçme.

## 1. Kararlar

| Konu | Karar |
|---|---|
| Fark | Her oynatıcıda çalışma + video öncesi kelime testi + kelime defteri pratiği. |
| Store | İlk sürüm tamamen **ücretsiz**, tüm özellikler açık. Reklam yok. Pro ve ödeme sonra, kullanıcı kendisi araştırıyor. |
| Store adı/pazarlama | Ad "Dual Subtitles ..." gibi anahtar kelimeli, kurulunca marka Looptions. Store'da yalnızca "her sitede çalışır" denir; site adı, korsan, "ücretsiz film" anlamı geçmez. |
| Diller (Dual Subtitles) | 6 dil: **Türkçe, İngilizce, İspanyolca, Rusça, Almanca, Fransızca**. Ana dil ve öğrenilen dil bu 6'dan seçilir, aralarında her kombinasyon. Başka dil listede olmaz. |
| Kelime testi (v1) | **Yalnızca İngilizce → Türkçe** (öğrenilen en, ana dil tr). Mevcut hâliyle kalır. Diğer dillerde test v1'de yok; v1 sonrasına bırakıldı (bölüm 4, "Sonra"). |
| Site ayarları | Gelişmiş ayarlarda **Siteler** sekmesi: site bazında eklentiyi ve kelime testini kapat/aç. |
| İkinci dil yok | Altyazıyı biz çevirmeyiz. Tek satır gösterilir, "ikinci dilde altyazı yok" bildirimi çıkar, README'de yazılır. |
| Kelime çevirisi | Google'ın resmi olmayan ucundan çıkılır: **Microsoft Translator F0** (ücretsiz katman) + **Supabase** proxy. Bu iş **Store'dan hemen önce** yapılır (o zamana kadar mevcut uç geliştirmede çalışmaya devam eder). Maliyet 0 hedefi. |
| Kelime defteri | CSV/Anki dışa aktarma + **pratik modu** (kaydedilen kelimelerle tekrar ve test). Mobil uygulama ileride. |
| Oynatma kontrolleri | v1'de: satırı tekrarla, önceki/sonraki satır, satır sonunda otomatik durdur, satır zamanı kaydırma tuşları. |
| Gizlilik/hukuk | Hangi veri, neden, nereye gider: README + gizlilik sayfası + Store alanları. Veriyi en aza indir. |
| Yeni adapter | Prime Video, Disney+, Apple TV+: en son (v1'den sonra). |
| Gerçek Chrome testi | Mevcut özellikler denendi, çalışıyor. |

## 2. Neden bu ek özellikler?

"Bir hafta sonu yapılır" riski gerçek: tek tek ayarların hiçbiri savunma sağlamaz. Savunma **özelliklerin birbirine bağlanması**: test seviyeyi ölçer, kelime defteri öğrendiklerini tutar, pratik modu onları tekrar ettirir. Rakiplerin çoğu bu döngünün yalnızca parçasına sahip. Bu yüzden bu sürümde süs ayarı eklemiyoruz; öğrenme döngüsünü kapatan özellikleri ekliyoruz (oynatma kontrolleri, pratik modu, dışa aktarma).

## 3. Aşamalar

Her aşamanın sonunda `node --test` geçmeli (şu an 76 test). Saf mantık `src/core/*.js` içinde ve testli, DOM'a bağlı kısım gerçek Chrome'da elle doğrulanır. Arayüze dokunan her yeni parça için önce `DESIGN.md`'yi oku.

### Aşama 0 – Temizlik
- Çalışma ağacında commit edilmemiş tasarım işleri var. **Kullanıcı** commit eder; agent commit atmaz.
- `docs/memory/status.md`, testler ve fixture'larda geçen gri site adlarını kaldır.
- Bitti: repoda ticari veya gri site adı geçmiyor.

### Aşama 1 – Dil kapsamı, Siteler sekmesi, bildirim
- `DS.LANGS`'i 6 dille sınırla (`src/core/lang.js`); popup, ayarlar ve welcome seçicileri buna uysun. Kayıtlı eski `prefs`'te listede olmayan dil varsa sessizce `en`/`tr`'ye düş.
- Kelime testi yalnızca en→tr'de açık; diğer çiftlerde seçenek gizli ya da "yalnızca İngilizce → Türkçe" notuyla pasif.
- **Siteler sekmesi:** `prefs.sites[hostname]` ile site bazında "eklenti" ve "kelime testi" aç/kapat. Varsayılan hepsi açık.
- İkinci dilde parça yoksa videoda bildirim ("İkinci dilde altyazı yok"); README'ye sınır olarak yaz.
- Bitti: YouTube'da testi kapatınca test çıkmıyor, Netflix'te çıkıyor (örnek); 6 dil arasında seçim çalışıyor.

### Aşama 2 – Oynatma kontrolleri
- Tuşlar: önceki satır, sonraki satır, satırı tekrarla, satır sonunda otomatik durdur (aç/kapa), satır zamanını ±0,25 sn kaydır ve ekranda geri bildirim göster (`docs/superpowers/plans/2026-11-15-in-player-menu.md` Task 5 yarım kalmıştı, onu bitir).
- Tuş atamaları Ayarlar'dan değiştirilebilir (mevcut `toggleKey` deseni). Tek tuş yazmayı bozar, Ctrl/Alt/Meta kuralı geçerli.
- Cue zamanları `src/core/parse.js` içinde var; satır bulma mantığı saf ve testli olsun.
- Sayfaya sızmama kuralı (`stopPropagation`) bozulmasın; oynatıcı durup atlamasın.
- Bitti: gerçek videoda tuşlar satırı geri/ileri alıyor, otomatik durdurma satır sonunda duruyor.

### Aşama 3 – Kelime defteri pratiği
Kayıtlı kelimeler (`storage.local` `words`: `word, translation, from, to, context, at`) ile tekrar ve test.
- Veri: her kayda `box` (1–4) ve `due` (zaman) alanı ekle; eski kayıtlar `box=1`, `due=şimdi` sayılır.
- Aralıklı tekrar: doğru cevapta `box+1`, sıradaki tekrar 1 / 3 / 7 / 21 gün sonra; yanlışta `box=1`, ertesi gün. Seans: vadesi gelen en çok 10–20 kelime.
- Soru türleri: (a) kelime → Türkçesi çoktan seçmeli (çeldiriciler diğer kayıtlı kelimelerin çevirisinden; 4'ten az kayıt varsa kart çevirme), (b) kayıtlı cümlede (`context`) kelimeyi gizleyip seçtir.
- Saf mantık `src/core/review.js` (seçim, sıralama, aralık güncelleme, çeldirici üretimi), testli.
- Arayüz: Gelişmiş ayarlar → Kelimeler sekmesinde "Pratik yap" ve vadesi gelen sayısı. Mevcut test kartının görünümüne uy.
- Bitti: kelimeler kaydedilip pratik yapılabiliyor, yanlış cevap kelimeyi kutuda geri getiriyor, vade tarihi saklanıyor.

### Aşama 4 – Kelime defteri dışa aktarma
- Kelimeler sekmesine "CSV indir" ve "Anki (TSV) indir". Sütunlar: kelime, çeviri, cümle, dil çifti, tarih. Biçimlendirme saf ve testli.
- Bitti: dosya Anki'ye içe aktarılıyor.

### Aşama 5 – Çeviri sunucusu (Store'dan hemen önce)
**Mimari:** eklenti → Supabase Edge Function → Microsoft Translator. Anahtar yalnızca sunucuda durur, eklentide asla.
- Kullanıcı: Supabase projesi (ücretsiz plan, AB bölgesi önerilir) ve Azure Translator F0 kaynağı açar. Kullanıcı Supabase'in 1 hafta kullanılmazsa duraklamasını kendisi yönetecek; eklenti sunucu yanıt vermezse sade bir hata göstersin ("Çeviri şu an kullanılamıyor"), takılmasın.
- Edge Function `lookup` (`{text, from, to}`): herkese açık uç, JWT doğrulaması kapalı. Sözlük destekli çiftlerde (**yalnızca İngilizce içeren yönler: en↔tr/es/ru/de/fr**) Microsoft sözlük çağrısı, diğer çiftlerde düz çeviri.
- Önbellek: Postgres tablosu (`from`, `to`, `text` → sonuç); RLS kapalı, yalnızca fonksiyon servis anahtarıyla yazar.
- Kota koruması: aylık karakter sayacı; Microsoft F0'ın 2 milyon karakterine yaklaşınca 429 ile nazikçe reddet. **Kelime ve IP günlüğü tutma.**
- Eklenti: `src/background.js` `googleWord` yerine fonksiyon çağrısı; `limitedFetcher` kalır; ek izin ekleme (mevcut `<all_urls>` yeter).
- Supabase MCP bu ortamda bağlıdır; migration/fonksiyon dağıtımı için kullanılabilir, ama **işlem öncesi kullanıcıya sor**.
- Bitti: kelime tıklama ve kelime testi özeti gerçek Chrome'da sunucudan çeviriyor; Google ucu kodda yok; kota/hata durumunda mesaj çıkıyor.

### Aşama 6 – Gizlilik ve hukuk metinleri
Bölüm 4'e göre README'ye "Gizlilik ve veri" bölümü; Store için ayrı gizlilik sayfası (ücretsiz barındırma, ör. GitHub Pages); Store panelindeki alan metinleri. Bu aşama Aşama 5'ten sonra gelir ki metin gerçek mimariyle uyuşsun.
- Bitti: README'deki her cümle kodla uyuşuyor (hangi istek nereye gidiyor).

### Aşama 7 – Store'a çıkış (v1, ücretsiz)
- Ad: "Dual Subtitles ..." (en çok aranan ifade), açıklama İngilizce + Türkçe. Tek amaç: "iki dilli altyazıyı videonun üstünde gösterir ve dil öğrenmeye yardım eder".
- Ekran görüntüleri, simge (var), gizlilik sayfası linki, izin gerekçeleri (bölüm 4). Store'da en→tr testin yalnızca İngilizce → Türkçe olduğu açıkça yazılsın.
- Bitti: paket Store'a gönderildi.

## Sonra (v1'den sonra, sırası kullanıcıda)
- **Prime Video, Disney+, Apple TV+.** Önce keşif: mevcut genel yol (HLS/ağ yakalama) bu sitelerde çalışıyor mu bak; çalışmıyorsa adapter yaz (`main-world.js`, `CLAUDE.md` kuralına uygun). Her biri için abonelik hesabı gerekir (kullanıcı test eder).
- **Kelime testini diğer dillere (tr → es/ru/de/fr).** CEFR listesi kullanma (Rusça Kelly listesi ticari kullanıma kapalı); hermitdave sıklık listesi (CC-BY-SA-4.0) + sözlükle süzme, kök bulmadan çekimli biçim, uydurma kelimeler dile göre üretilip doğrulanır, ilk etapta yalnızca kelime soruları. Eşikler gerçek kullanıcıyla ayarlanır. Orta boy iş.
- Seviyeye göre altyazıda zor kelime işaretleme, videodaki zor kelime özeti, tanıdık (kayıtlı) kelime vurgusu, haftalık ilerleme sayfası, kelime telaffuzu (`speechSynthesis`), oynatma hızı tuşları.
- Mobil uygulama (kelime defteri aktarımı ve mobil pratik).
- Pro ve ödeme: kullanıcı araştırıyor.

## 4. Veri, gizlilik ve Store alanları (Aşama 6 için taslak)

**Prensip:** hesap yok, analiz/telemetri yok, reklam yok. Altyazı, tercihler ve kelimeler yalnızca tarayıcıda durur.

Veri envanteri (kodla doğrula, değişirse güncelle):

| Veri | Nerede | Dışarı gider mi |
|---|---|---|
| Tercihler (`prefs`: diller, stil, seviye, site ayarları) | `chrome.storage.sync` (Google hesabıyla eşitlenebilir) | Chrome'un kendi eşitlemesi dışında hayır |
| Kayıtlı kelimeler, pratik ilerlemesi, test cevapları, seviye (`words`, `vocab`, `ability`) | `chrome.storage.local` | Hayır |
| Altyazı dosyaları, sayfa ve video adresi | Yalnızca o anda bellekte; `webRequest` ağ isteklerini yerelde izler | Hayır, hiçbir yere gönderilmez |
| Tıklanan kelime (ve kelime testi özetindeki en çok ~20 kelime) + dil çifti | Bizim çeviri sunucumuz (Supabase), oradan Microsoft Translator | **Evet.** Yalnızca kelime. Sayfa adresi, video adı, kullanıcı kimliği gönderilmez. Sunucu kelime/IP günlüğü tutmaz; önbellekte yalnızca (kelime, dil çifti, çeviri) durur. |

Yazılacak maddeler: ne topluyoruz (yukarıdaki tablo), neden (yalnızca çeviri özelliği için), kimle paylaşıyoruz (Supabase barındırma, Microsoft çeviri), saklama süresi, silme (eklenti kaldırılınca yerel veriler silinir; kelime defterinde tek tek ve toplu silme var), çocuklar, iletişim e-postası, Türkçe KVKK aydınlatma bölümü, değişiklik bildirimi.

Store panelindeki tek amaç ve izin gerekçeleri:
- `webRequest` + `<all_urls>`: oynatıcının yüklediği altyazı dosyalarını (.vtt/.srt/HLS) her sitede bulmak. Başka amaçla kullanılmaz.
- `storage`: tercihler ve kelime defteri.
- Uzak kod yok (tüm kod pakette); "veri satılmaz, amaç dışı kullanılmaz" beyanları doğru olmalı.

Hukuki notlar (**avukata bir kez danışılacak**, bunlar tavsiye değil):
- Altyazıyı yalnızca sayfanın kullanıcının tarayıcısına zaten yolladığı veriden okuyoruz; indirmiyor, yüklemiyor, dağıtmıyoruz. README'de açıkça yaz.
- Site kullanım şartları yapay erişimi veya eklentileri kısıtlayabilir. README'de "siteler kendi şartlarını koyabilir, kullanım kullanıcının sorumluluğundadır" notu.
- Store politikası "yetkisiz akış/indirmeyi kolaylaştıran" ürünleri yasaklar. Listede ve README'de korsan içerik, site adı veya "ücretsiz film" anlamı olmasın.
- KVKK: IP adresi kişisel veri sayılabilir, yurt dışı barındırma aktarım kuralları için avukata sor. Bu yüzden sunucuda hiçbir şey kaydetmeyiz ve kimlik veya yükleme ID'si kullanmayız.
- Microsoft Translator ve Supabase'in veri koşullarına gizlilik sayfasından link ver.

## 5. Doğrulanması gerekenler (agent varsaymasın)
- Azure F0: kart ister mi, süre sınırı var mı, sözlük çağrısı kotadan nasıl düşüyor.
- Supabase ücretsiz plan: aylık Edge Function çağrı sınırı (kaynaklar 500 bin ve 2 milyon diye çelişiyor), herkese açık fonksiyon için JWT'yi kapatmanın güncel yolu.
- Microsoft sözlük yalnızca İngilizce içeren yönlerde (en↔tr, en↔es, en↔ru, en↔de, en↔fr); canlı `languages?scope=dictionary` ile yeniden teyit et.
- Prime/Disney+/Apple TV+ mevcut genel yolla çalışıyor mu (v1 sonrası).
