# Video öncesi kelime testi: tasarım

Amaç not vermek değil, videoya girmeden önce kelime öğretmek. Kapsam: yalnızca ana dili Türkçe (`secondary: 'tr'`), öğrendiği dil İngilizce (`primary: 'en'`) olan kullanıcılar.

## Kararlar

- **Kelime listesi:** CEFR-J Vocabulary Profile 1.5 (A1–B2, ücretsiz, atıf şart, Tono Lab / TUFS) + Octanove C1/C2 (CC BY-SA 4.0). Oxford listesi telifli olduğu için kullanılmıyor. Liste dışı kelime hiç sorulmaz.
- **Eşleşme:** altyazıdaki biçim (`running`) önce kendisiyle, sonra ek soyma kuralları ve küçük düzensiz fiil tablosuyla başlık kelimeye (`run`) bağlanır. Eşleşmeyen atlanır. Aynı başlık birden çok seviyedeyse en düşük seviye geçerli.
- **LLM yok.** Anlam: mevcut `googleWord` (tek kelime, EN→TR). Örnek cümle yok: bölüm spoyleri olabilir.
- **Kurulum:** kullanıcı seviyesini seçer (A1–C2), isterse 20 soruluk "biliyor musun?" testi (A2–C2 arası her seviyeden 4 kelime) seçimi düzeltir. Cevaplar yalnızca seviye tahminini etkiler, saklanmaz. Uydurma kelime yok.
- **Video kartı:** İngilizce parça hazır olur olmaz (HLS'te tüm parçalar baştan indiriliyor, tam liste gelir) video duraklar, yavaş fade ile tam videoyu kaplayan kart açılır. 10 kelime, her biri Biliyorum / Bilmiyorum, sonunda bilinmeyenlerin çevirisiyle özet. "Geç" her an var. Cevaplar `chrome.storage.local` `vocab` içinde saklanır; sorulmuş kelime tekrar sorulmaz.
- **Kelime seçimi:** videodaki kelimelerden, kullanıcı seviyesinin üstünde, bilinmeyen/sorulmamış olanlar. Önce seviye+1..+2, sonra videoda çok geçenler. En az 3 aday yoksa kart çıkmaz.
- **Zamanlama:** parça video başındayken hazırsa (ilk 60 sn) kart çıkar; geç gelirse hiç çıkmaz. Hazır olana kadar logonun yanında dönen bir gösterge durur, üzerine gelince "Test yükleniyor" yazar.
- **Tam ekran:** `<video>` kendisi tam ekransa tam ekrandan çıkılır, kart gösterilir; tam ekrana geri dönülmez.
- **Ayar:** popup'ta "Video öncesi kelime testi" anahtarı ve seviye seçimi (yalnız en→tr iken görünür). `prefs.preQuiz` (varsayılan açık), `prefs.level` (varsayılan A2).
- Kart `DESIGN.md` diliyle: kâğıt kart, Outfit, hap düğmeler, çizgi ikon.
