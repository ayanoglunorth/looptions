# Chrome Web Store listing (v1)

Her şeyi buradan kopyala. Önce "Yayından önce kapatılacaklar" bölümünü bitir; bitmeden gönderme.

## 0. Yayından önce kapatılacaklar

Bunlar kodda ya da sende açık duran işler. Biri açıksa listedeki bir cümle yanlış olur.

| # | İş | Neden önemli |
|---|---|---|
| 1 | Cloudflare çeviri sunucusunu kur (`worker/`, README'deki adımlar), `LOOKUP_URL`'i yaz, `googleWord`'ü sil | Şu an çeviri resmî olmayan Google ucundan geliyor. Gizlilik politikası "Microsoft Translator" diyor; ikisi çelişirse Store "gizlilik alanları gerçek davranışla uyuşmalı" kuralıyla kaldırabilir. `node scripts/check-release.js` bunu zaten engeller. |
| 2 | `docs/privacy.html` içindeki 3 `[...]` alanını doldur, GitHub Pages'te yayınla | Gizlilik politikası URL'si Store formunda zorunlu. Veri sorumlusu adı ve iletişim e-postası boşsa KVKK metni eksik kalır. |
| 3 | Tacir / tacir değil beyanını seç | Ayrıntı bölüm 6'da. |
| 4 | Herkese açık bir destek e-postası aç (kişisel e-postanı kullanma) | Store formu destek iletişimi ister; tacirsen e-posta herkese görünür. |
| 5 | Gerçek Chrome'da elle dene | Status dosyasında her aşama "DENENMEDİ" yazıyor. Özellikle: tuşlar, Siteler sekmesi, kelime kaydı, pratik, CSV/Anki. |
| 6 | Ekran görüntülerini çek | Bölüm 4. |
| 7 | Azure Translator F0'ı ticari ürün için kullanabildiğini Microsoft'tan teyit et | Microsoft'un fiyat sayfası F0'ı 2M karakter/ay (kalıcı, süresiz) diye listeliyor; üretimde kullanım ya da SLA hakkında tek cümle yok, sınıra gelince otomatik ücretli katmana geçmez. Ne yasaklayan ne izin veren bir metin bulamadım. Ürün Şartları ya da Azure desteği kesin cevap verir. Cevap "hayır" çıkarsa S1 (yaklaşık 10 $/1M karakter) gerekir. |

## 1. Ad ve özet

Ad (en çok 75 karakter): **Dual Subtitles - Looptions**

Store adı ve özeti `manifest.json`'dan okunur, panelden değiştirilemez. `node scripts/pack.js` bunları yalnız pakete yazar; depodaki manifest "Looptions – Çift Altyazı" olarak kalır.

Özet, İngilizce (en çok 132 karakter, 111 karakter):

> Watch videos with two subtitle languages at once. Click a word to translate it, save it, and practice it later.

Özet, Türkçe (94 karakter). Manifest'ten gelmez, panelde Türkçe dil sekmesine yazılır:

> Videolarda iki altyazı dilini aynı anda izle. Kelimeye tıkla, çevir, kaydet, sonra pratik yap.

Özetten "any video" ifadesi çıkarıldı: her oynatıcıda çalışmayabilir (bölüm 5).

## 2. Açıklama, İngilizce (varsayılan dil)

Panelde "Description" alanına olduğu gibi yapıştır. Madde işareti için `•` kullanılıyor, Store düz metin gösterir.

```
Watch in the language you are learning. Keep your own language one line below.

Looptions puts two subtitle languages over the video at the same time. The language you are learning goes on top. Your own language sits underneath, for the moments a line gets away from you.

WHAT YOU CAN DO
• Pick any two of six languages: Turkish, English, Spanish, Russian, German and French.
• Click a word in the subtitles to see its translation. Save it to your word notebook together with the sentence it came from.
• Practice saved words with short quizzes. A word comes back after 1, 3, 7 and 21 days as you get it right. Export the notebook as CSV, or as a text file Anki can import.
• Move through a video line by line: previous line, next line, repeat the line, or pause at the end of every line. Shift either subtitle line in quarter-second steps when the timing is off.
• Set your own keys for playback speed and for skipping forward and back.
• Choose the subtitle style, font, size, background and height. Turn Looptions off on any site you like. The Sites tab lists where Looptions has run; that list stays on your device.
• Before an English video starts, a short word quiz asks about the harder words coming up. It is off by default; you can turn it on during setup or in the popup. For now it works for English to Turkish only.

HOW IT WORKS
Looptions reads the subtitle tracks that the video player has already loaded and shows two of them together. It does not download, store or share subtitles. If a video has no subtitles in your second language, Looptions tells you. On YouTube it can use YouTube's own automatic caption translation when YouTube offers it.

GOOD TO KNOW
• You need a video that has subtitles. No subtitles, nothing to show.
• Some players keep their subtitles away from extensions. Looptions cannot show those.
• Word translations are machine translations and can be wrong.
• The translation service has a monthly limit. If it runs out, clicking a word shows a message and the rest of Looptions keeps working.

PRIVACY
No account, no ads, no analytics. Your settings and word notebook stay in your browser. When you click a word, or when the pre-video quiz prepares its list, only the word and the language pair are sent to our translation service, which uses Microsoft Translator. The page address, video title and subtitle text are never sent.

Privacy policy: https://looptions-privacy.pages.dev/
Support: nadasmobile@proton.me

Looptions is an independent project. It is not affiliated with or endorsed by YouTube, Google, Microsoft, Anki or any video site. All product names belong to their owners.
```

Notlar:
- Ürün adları yalnızca son satırda ve "YouTube's own automatic caption translation" cümlesinde geçiyor. Açıklamada başka site adı yok (anahtar kelime ve marka listesi spam sayılır; "unnatural repetition... more than 5 times" sınırı da var).
- "Free" yazmadım. Ücretsiz bir yeni sürüm sonra ücretli olabilir; Store'da yazılı vaadi geri almak zordur. Fiyat sorusunu panelde "Free" olarak işaretlemen yeter.
- "Fluent faster", "learn X in Y days" gibi sonuç vaadi yok.

## 3. Açıklama, Türkçe (Türkçe dil sekmesi)

```
Öğrendiğin dilde izle, kendi dilin bir satır altında dursun.

Looptions iki altyazı dilini videonun üstünde aynı anda gösterir. Öğrendiğin dil üstte durur. Kendi dilin altta durur; bir satır elinden kaçtığında oraya bakarsın.

NELER YAPABİLİRSİN
• Altı dilden istediğin ikisini seç: Türkçe, İngilizce, İspanyolca, Rusça, Almanca, Fransızca.
• Altyazıdaki bir kelimeye tıkla, çevirisini gör. Geçtiği cümleyle birlikte kelime defterine kaydet.
• Kayıtlı kelimeleri kısa testlerle çalış. Doğru bildikçe kelime 1, 3, 7 ve 21 gün sonra geri gelir. Defteri CSV olarak ya da Anki'nin içe aktarabildiği bir metin dosyası olarak dışa aktar.
• Videoda satır satır ilerle: önceki satır, sonraki satır, satırı tekrarla ya da her satır sonunda dur. Zamanlama kaymışsa iki altyazıdan birini çeyrek saniyelik adımlarla kaydır.
• Video hızı ve ileri/geri sarma için kendi tuşlarını belirle.
• Altyazı stilini, yazı tipini, boyutunu, arka planını ve yüksekliğini seç. İstemediğin sitede Looptions'ı kapat. Siteler sekmesi Looptions'ın çalıştığı siteleri listeler; bu liste cihazında kalır.
• İngilizce bir video başlamadan önce, kısa bir kelime testi önümüzdeki zor kelimeleri sorar. Varsayılan olarak kapalıdır; kurulumda ya da açılır menüde açabilirsin. Şimdilik yalnızca İngilizce → Türkçe çalışır.

NASIL ÇALIŞIR
Looptions, oynatıcının zaten yüklediği altyazı parçalarını okur ve ikisini birlikte gösterir. Altyazıyı indirmez, saklamaz, paylaşmaz. Videoda ikinci dilde altyazı yoksa bunu söyler. YouTube'da, YouTube sunuyorsa kendi otomatik altyazı çevirisini kullanabilir.

BİLMEN GEREKENLER
• Altyazısı olan bir video gerekir. Altyazı yoksa gösterilecek bir şey de yoktur.
• Bazı oynatıcılar altyazılarını eklentilerden saklar. Looptions onları gösteremez.
• Kelime çevirileri makine çevirisidir, yanlış olabilir.
• Çeviri hizmetinin aylık bir sınırı var. Dolarsa bir kelimeye tıklayınca mesaj görürsün; Looptions'ın geri kalanı çalışmaya devam eder.

GİZLİLİK
Hesap yok, reklam yok, analiz yok. Ayarların ve kelime defterin tarayıcında kalır. Bir kelimeye tıkladığında ya da video öncesi test listesini hazırlarken, yalnızca kelime ve dil çifti çeviri hizmetimize gider; hizmet Microsoft Translator kullanır. Sayfa adresi, video adı ve altyazı metni hiçbir zaman gönderilmez.

Gizlilik politikası: https://looptions-privacy.pages.dev/
Destek: nadasmobile@proton.me

Looptions bağımsız bir projedir. YouTube, Google, Microsoft, Anki ya da herhangi bir video sitesiyle bağlantısı yoktur ve onlar tarafından onaylanmamıştır. Tüm ürün adları sahiplerine aittir.
```

## 4. Görseller

Kurallar (developer.chrome.com/docs/webstore/images, doğrulandı):
- İkon 128x128 PNG, pakette. Var: `icons/icon-128.png`.
- Ekran görüntüsü: en az 1, en çok 5. 1280x800 (ya da 640x400), kenarlara kadar dolu, köşe kare, dolgusuz. Şu an hepsi 640x400'e küçültülüyor, yazı büyük olmalı.
- Küçük tanıtım görseli 440x280: isteğe bağlı ama yoksa liste, olanların arkasına düşer. Üzerinde yazı olmasın, yarım boyutta da okunmalı, doygun renk, tüm alan dolu. Öneri: DESIGN.md'deki peach/lilac alan, grenli doku, ortada logodaki iki hap. Ürün adı yazma.
- Marquee 1400x560: isteğe bağlı, yalnız öne çıkarılmak için gerekir. v1'de atla.
- Sahte yorum, sahte kullanıcı sayısı, puan rozeti yok. Alıntı kullanacaksan kime ait olduğu yazılmalı.

**Hazır görseller:** `docs/store/screenshots/` içinde 5 ekran görüntüsü (1280x800 PNG, her biri `-en` ve `-tr`) ve `promo-tile-440x280.png`. Altyazı sahnesinde film karesi yok, soyut bir arka plan var; altyazı, kelime kartı, popup ve ayarlar sayfası eklentinin gerçek koduyla çizildi, örnek kelimeler uydurma. Yeniden üretmek için `scripts/store-shots/` (`node serve.js &`, sonra `node shoot.js <klasör> overlay:tr ...`, Chrome gerekir). Dashboard'a hangi dilin sekmesine hangi dosya: English için `-en`, Turkish için `-tr`.

5 ekran görüntüsü planı (her birinde en çok 4-5 kelimelik üst başlık; Türkçe ve İngilizce ayrı dosya çıkar):

| # | Sahne | Üst başlık (EN) | Üst başlık (TR) |
|---|---|---|---|
| 1 | Videonun üstünde iki satır: üstte İngilizce, altta Türkçe | Two languages, one screen | İki dil, tek ekran |
| 2 | Bir kelimeye tıklanmış, çeviri kutusu ve "Kaydet" | Click a word, see it | Kelimeye tıkla, gör |
| 3 | Gelişmiş ayarlar → Kelimeler: kart ızgarası, "Pratik yap" | Practice what you saved | Kaydettiğini çalış |
| 4 | Pratik sorusu açık (boşluk doldurma ya da çoktan seçmeli) | Words come back when due | Kelime zamanı gelince döner |
| 5 | Popup: diller, stil, önizleme | Your subtitles, your way | Altyazı senin tarzında |

Ekran görüntüsü için güvenlik kuralları:
- Hukuken gösterebileceğin bir video kullan: kendi çektiğin, Creative Commons lisanslı ya da serbest kullanımlı bir film (ör. Blender Foundation'ın açık filmleri) ya da kendi YouTube videon. Telifli filmden kare koyma; Store ve film sahibi için risk.
- Videoda tanınabilir bir kişi, kullanıcı adı, e-posta ya da hesap bilgisi görünmesin.
- Görüntüde Netflix, Disney gibi bir markanın logosu ya da arayüzü olmasın.
- Gerçek eklenti arayüzünü göster. Henüz olmayan bir özelliği (ör. Pro, bulut eşitleme) gösterme.

## 5. Ne vaat ediyoruz, ne etmiyoruz

Store "metadata yanlış ya da eksik olamaz" der ve gizlilik alanlarının gerçek davranışla uyuşmasını ister. Bu tablo her cümleyi kodla eşler.

| Söyleyebiliriz (kodda doğrulandı) | Söylemeyiz | Neden |
|---|---|---|
| Altı dil: tr, en, es, ru, de, fr | "Her dil", "100+ dil" | `DS.LANGS` altı dil |
| Oynatıcının yüklediği altyazıyı okuyup iki satır gösterir | "Her sitede", "her videoda çalışır" | Altyazısız video ve altyazıyı saklayan oynatıcılar çalışmaz; kanıtlanmış site listemiz yok |
| İkinci dilde altyazı yoksa söyler | "Altyazıyı çevirir", "yapay zekâ altyazı" | Tüm altyazıyı biz çevirmiyoruz |
| YouTube'da YouTube'un kendi otomatik çevirisini kullanabilir | "Her videoyu çevirir" | `main-world.js` `tlang` parçası ister; bunu YouTube üretir, bizim hizmetimiz değil |
| Tıklanan kelime ve dil çifti çeviri hizmetimize gider | "Hiç veri toplamıyoruz", "veriniz cihazınızı terk etmez" | Kelime sunucuya gider. "Hesap, reklam, analiz yok" doğru ve yeterli |
| Kelime defteri ve ayarlar tarayıcıda kalır | "Bulutta yedeklenir" | Ayarlar `storage.sync` ile Chrome'un kendi eşitlemesine girer; kelimeler yalnız yerel |
| Aralıklı tekrar: 1, 3, 7, 21 gün | "Bilimsel olarak kanıtlanmış", "X günde akıcı ol" | Yöntem (Leitner) bilinen bir yöntem, ama etkisi için ölçümümüz yok |
| CSV ve Anki'nin içe aktarabildiği TSV dışa aktarma | "Anki ile senkron", "Anki eklentisi", "Anki uyumlu" (tescilli marka; uyumluluğu elle denemedik) | Dosya veriyoruz, bağlantı yok; Anki'ye içe aktarma elle denenmedi |
| Video öncesi kelime testi (en → tr), varsayılan açık | "Seviyeni ölçer / kesin seviye" | Seviye tahmini yaklaşık ve test v1'de yalnız en → tr |
| Ücretsiz sürüm (panelde "Free" işareti) | Açıklamada "sonsuza dek ücretsiz", "hiçbir zaman ücretli olmayacak" | Strateji belgesi ileride ücretli katmanı düşünüyor; yazılı vaat bağlar |
| Bağımsız proje, YouTube/Google/Microsoft/Anki ile bağlantısı yok | Marka logoları, "resmî", "önerilir" | Marka ihlali ve yanıltma |
| Çeviriler makine çevirisidir, yanılabilir | "Doğru çeviri", "profesyonel çeviri" | Microsoft Translator hata yapar |
| Aylık çeviri sınırı var | Sınırsız çeviri | Sunucu 1,8M karakter/ay'da duruyor (F0 sınırı 2M) |

Açıklamada geçmeyen ama sorulursa dürüst cevap: Netflix gibi korumalı oynatıcılarda altyazıları okuyan bir adaptör kodda var, ama denenmedi; Store'da Netflix adı geçmesin.

## 6. Hukuki kontrol listesi

Ben avukat değilim. Bunlar kontrol edilecek noktalar; son kararı avukat versin.

**Tacir beyanı.** Store formunda "tacir" ya da "tacir değil" seçeceksin. Doğru seçim ticari amacına bağlı. Tacirsen adın, adresin ve iletişim bilgin Store'da herkese görünür. İlk seçim sonradan değiştirilebilir. Yanlış beyan sorumluluğu geliştiricidedir.

**Gizlilik alanları (Privacy practices sekmesi).**
- Chrome'un tanımı: "handle" = toplamak, iletmek, kullanmak ya da paylaşmak. Veri yalnızca cihazda işlense ya da saklansa bile açıklanır (User Data FAQ, Q3, Q14). Yani "sunucuya gitmiyor, o yüzden yazmam" mantığı yanlış.
- İşaretlenecek veri türleri: **Website content** (tıklanan kelime, test kelimeleri, bellekteki altyazı; kelime çeviri için sunucuya gider) ve **Web browsing activity** (`webRequest` ile okunan altyazı adresleri, yerelde tutulan `seenSites` alan adı listesi; ikisi de cihazdan çıkmaz). Kelime defteri ve kayıtlı cümleler kullanıcının ürettiği içeriktir; panelde "User-generated content" seçeneği çıkarsa onu da işaretle. Kişisel kimlik, sağlık, finans, kimlik doğrulama, konum işaretlenmez. Formun gerçek seçenek adlarını Store'da görünce karşılaştır; ben yalnızca resmî FAQ listesine baktım.
- Politika: "web browsing activity toplamak ve kullanmak yasak; yalnızca mağaza sayfasında öne çıkarılmış, kullanıcıya dönük bir özellik için serbest." Siteler listesi bu yüzden açıklamaya eklendi; ayarlar sayfasında da görünür olduğu için tamam.
- Kullanım amacı: yalnızca eklentinin tek amacı (çeviri ve kelime çalışma). Satış yok, reklam yok, kredi değerlendirmesi yok, insan okuması yok.
- Çözüldü: video öncesi kelime testi artık varsayılan KAPALI. Kurulum sihirbazının seviye ekranında anahtar var ve yanında gönderimin ne olduğu açık yazıyor (kelimeler + dil çifti Microsoft Translator'a gider; sayfa adresi, video adı, altyazının kalanı gitmez). Popup'taki ipucu da aynı. Not: testi açan kullanıcı kelimeleri tıklamadan göndermiş olur; açık rıza anahtarı açmasıyla verilmiş sayılır.
- Limited Use cümlesi privacy.html'e eklenecek: "Looptions'ın tarayıcı verisinin kullanımı Chrome Web Store Kullanıcı Verisi Politikası'na, Limited Use şartları dâhil, uygundur." (EN: "The use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.") privacy.html'e eklendi.

**Gizlilik politikası (`docs/privacy.html`).**
- 3 yer tutucu boş (veri sorumlusu, TR e-posta, EN e-posta).
- Aktarım (doğrulandı, avukat yine de baksın): Cloudflare Worker dünya çapında, kullanıcıya yakın konumda çalışır; D1 önbelleği seçtiğin bölgede (`weur`) durur. Cloudflare'in DPA ve AB Standart Sözleşme Maddeleri durumunu doğrulamadım, cloudflare.com/cloudflare-customer-dpa sayfasından kontrol et. GDPR'da IP adresi, kimliği belirlenebilirse kişisel veridir (Breyer, C-582/14; GDPR gerekçe 30): sunucu IP'yi görüyor, o yüzden gizlilik metnine hukuki dayanak ("meşru menfaat" ya da "sözleşmenin ifası") ve aktarım cümlesi yazılmalı. Türkiye (KVKK m.9, 1 Haziran 2024'ten beri yeni rejim): yurt dışı aktarımı için yeterlilik kararı, standart sözleşme (imzadan sonra 5 iş günü içinde Kurum'a bildirim, idari para cezası var) ya da arızi haller gerekir. Kaynaklar avukatlık bürosu yazıları; yönetmelik metni ve Kurul kararlarına kvkk.gov.tr'den bak. GDPR uyumlu DPA tek başına KVKK bildirimini karşılamaz.
- "Biz kelime ya da IP kaydı tutmayız" cümlesi bizim kodumuz için doğru; Cloudflare altyapı günlükleri tutabilir, metinde zaten yazıyor. Worker'ın hiç çalıştırılmadığını unutma, dağıttıktan sonra gerçekten kayıt tutmadığını bir kez kontrol et.
- Politikayı değiştirdikçe Store'daki gizlilik alanlarını da güncelle.

**Telif ve altyazı.** Looptions altyazıyı indirmez, saklamaz, dağıtmaz; sayfanın gönderdiğini gösterir. Bu doğru ve açıklamada yazıyor. Yine de: bazı sitelerin kullanım şartları altyazının işlenmesini kısıtlayabilir; politikada "kullanım kullanıcının sorumluluğunda" cümlesi var. Telif şikâyeti gelirse hangi adrese cevap vereceğini belirle (destek e-postası).

**Marka.** YouTube, Google, Microsoft, Anki adları marka; Anki, Ankitects Pty Ltd'nin tescilli markası ve son dönemde adı kullanan taklitlere karşı sıkı davranıldığı bildiriliyor. Ankitects'in üçüncü taraf kullanım politikasını bulamadım; "Anki'nin içe aktarabildiği dosya" gibi olgusal ifade topluluk uygulaması, kural değil. Bu yüzden adı yalnız bu cümlede ve "bağlantısı yok" notunda tuttum, ürün adında ya da başlıkta yok. Görsellerde logo yok.
"Looptions" için web aramasında aynı ad çıkmadı (en yakınlar LOOPTWORKS, LOOPT, LOOPTRONIC; hepsi farklı yazım). Bu bir marka sicili taraması değildir. Yayın öncesi kendin ara: TÜRKPATENT çevrimiçi sorgu, EUIPO TMview, WIPO Global Brand Database, USPTO, Store'da "Looptions" araması. Ad "Loop" + "options" çağrışımlı, "LOOP" ile başlayan yazılım markaları çok; benzerlik değerlendirmesini marka vekiline bırak.

**Çocuklar.** "13 yaş altına yönelik değil" yazıyor. Store formunda çocuklara yönelik olmadığını işaretle. Türkiye'de KVKK açısından 18 yaş altı için ayrıca avukata sor.

**Yazı tipleri (doğrulandı).** Altı ailenin hepsi SIL OFL 1.1 (Fontsource API: Roboto v51, Inter, DM Sans, Nunito Sans, Atkinson Hyperlegible Next, Outfit). Roboto için eski Apache 2.0 notu geçersiz. OFL, yazı tipini yazılımla dağıtırken her kopyada telif notu ve lisans metninin bulunmasını ister. `fonts/LICENSES.txt` eklendi (google/fonts deposundan altı resmî OFL metni); `pack.js` `fonts/` klasörünü olduğu gibi kopyalıyor, yani pakete girer. Outfit `popup/fonts/` altında, aynı dosyada anılıyor.

**İzinler.** Her biri için gerekçe metni bölüm 7'de. `<all_urls>` ve `webRequest` Store'da ek inceleme çeker; inceleme uzayabilir.

## 7. İzin gerekçeleri (dashboard "Privacy practices")

- **Single purpose:** Shows a video's subtitles in two languages at the same time, over the video, and helps the viewer learn the language.
- **webRequest:** Finds the subtitle files (.vtt, .srt, HLS) that a video player loads, on whichever site the user is watching. The requests are read on the device and never sent to us.
- **Host permission `<all_urls>`:** Videos play on any site, so the extension has to run where the user watches. It reads the player's subtitle tracks, draws the overlay and fetches subtitle files the page already uses. It also lets the extension call our translation service without CORS errors. No page content other than a clicked word is sent anywhere.
- **storage:** Saves preferences (languages, style, shortcuts, site on/off list), the word notebook and practice progress, and a local list of site domains where Looptions ran (up to 50, never sent anywhere).
- **favicon:** Shows each site's logo in the settings page, read from Chrome's own icon cache. Nothing is sent anywhere.
- **Remote code:** None. All code ships in the package.

## 8. Destek metni (destek sayfası ya da SSS için)

**Altyazı görünmüyor.** Oynatıcının kendi altyazı düğmesinden altyazıyı bir kez aç. Hâlâ yoksa, oynatıcı altyazıyı eklentilerden saklıyor olabilir; Looptions bunu gösteremez.

**"Bu videoda … altyazı yok" mesajı.** Videoda ikinci dil için altyazı parçası yok. Videonun kendi altyazı menüsüne bak. Looptions altyazıyı kendisi çevirmez.

**Kelimeye tıklayınca "Çeviri şu an kullanılamıyor".** Çeviri hizmetine ulaşılamadı. Bağlantını kontrol et, biraz sonra tekrar dene.

**"Bu ayki çeviri kotası doldu".** Çeviri hizmetinin aylık sınırı doldu. Ay başında yenilenir. Altyazı gösterimi ve kayıtlı kelimeler bundan etkilenmez.

**Verilerimi nasıl silerim?** Eklentiyi kaldırınca yerel veri silinir. Kelime defterinde tek tek ya da hepsini silebilirsin. Eşitlenen ayarları Chrome'un kendi ayarlarından silebilirsin.

**Bir sitede Looptions'ı kapatmak.** Gelişmiş ayarlar → Siteler.

## 9. Başvuru sırası

1. Bölüm 0'ı bitir.
2. `node scripts/check-release.js`, sonra `node scripts/pack.js` (ikisi de başarılı olmalı).
3. Developer Dashboard'a kayıt ol (tek seferlik 5 $).
4. Tacir beyanı, destek e-postası, gizlilik politikası URL'si.
5. Zip'i yükle. Bölüm 1-3'ü yapıştır. Kategori: Education (Google'ın dokümanları Education kategorisini listeler; panelde Store Listing → Product Details altında seçilir). Dil: English (varsayılan), Turkish ekle. Fiyat: Free.
6. Bölüm 4'ten görselleri yükle.
7. Bölüm 7'yi Privacy practices'e gir, üç onay kutusunu işaretle.
8. Gönder. İnceleme genelde bir haftaya kadar sürer; `<all_urls>` yüzünden uzayabilir.

## 10. Test instructions (dashboard "Test instructions" sekmesi, İngilizce)

```
No account or login is needed. Looptions works on videos that already have subtitles.
1. Open any video page that has subtitles in two languages, for example a public YouTube video with English and Spanish subtitles. Turn on subtitles in the player's own subtitle button once.
2. Click the Looptions toolbar icon. Set "Target language" to the video's subtitle language and "Native language" to a second language the video has.
3. Two subtitle lines appear over the video. Click a word in either line: a card shows its translation (the first click needs an internet connection) and a Save button.
4. Open the toolbar icon, then the notebook icon, to reach the settings page: saved words, practice, languages, look, playback keys and sites.
The pre-video word quiz is off by default and only works for English video to Turkish. Translation requests go only to our own server (a Cloudflare Worker), carrying a single word and a language pair.
```
