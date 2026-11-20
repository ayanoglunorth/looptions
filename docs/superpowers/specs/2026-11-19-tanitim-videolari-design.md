# Tanıtım videoları (Instagram reklamı) – tasarım

Tarih: 2026-11-19. Kullanıcı isteği: Remotion ile, eklentiyi iyi tanıtan, birbirinden farklı üç adet 9:16, 30 sn video; telifsiz müzik; tema, tipografi ve ikonlar eklentiyi hafifçe andırsın. Soru sorulmadan bitirilecek (kararlar aşağıda "benim kararım" olarak işaretli).

## Amaç

- Instagram/Reels reklamı. İzleyicilerin çoğu sessiz izler. Bu yüzden her mesaj ekranda yazıyla verilir; müzik destekler.
- Hedef kitle: Türkçe konuşan, dizi/film izleyerek İngilizce (ve diğer 5 dil) öğrenen kişi.
- Başarı: ilk 1 sn'de kanca, 30 sn içinde tek ana fikir, sonda "Chrome'a ekle" çağrısı.

## Yapılmayacaklar

- Uydurma sayı, kullanıcı yorumu, "ücretsiz" vaadi yok (`docs/store/listing.md` "Free" yazmıyor).
- Gerçek film/dizi görüntüsü, marka logosu (YouTube, Netflix) yok. Sahneler özgün çizim.
- Emoji yok; ikonlar eklentinin kullandığı Phosphor (bold) ailesinden.

## Yaklaşımlar

1. **Remotion, her video ayrı kompozisyon, ortak bileşen kütüphanesi** (seçilen). Eklentinin gerçek arayüz parçaları (altyazı kutusu, kelime kartı, Kaydet düğmesi, test kartı) React ile aynen yeniden çizilir; üç video aynı bileşenleri farklı sahne düzeniyle kullanır.
2. Gerçek eklentiyi tarayıcıda kaydetmek. Gerçek video görüntüsü telif riski taşır, kayıt kalitesi ve 9:16 kadraj zor. Elendi.
3. Tek şablon + üç metin. Üç video birbirine fazla benzer olur; istek "birbirinden farklı". Elendi.

## Ortak tasarım dili (DESIGN.md'den)

- Renkler: kâğıt `#fcf9fb`, patlıcan `#2d2134`, turuncu `#f27a36` / `#c4501a`, leylak `#a594e3` / `#efe9fb`, altyazı sarısı `#f5d547`. Grenli degrade alanlar (peach, lilac, orange).
- Yazı: Outfit (arayüz ve başlıklar), DM Sans (yalnız "Loop**tions**" yazısı), Roboto (altyazı, eklentinin varsayılanı). Benim kararım: 1. videoda vurgu kelimeleri için Instrument Serif italik (OFL), sinema hissi için.
- Logo: beyaz yumuşak kare içinde iki hap. Videolarda iki hap = iki altyazı satırı fikri kullanılır.
- İkon: Phosphor Bold (eklentideki bookmark/check aynı aile).

## Üç video

| | 1. İkisi Birden | 2. Geri Sarma | 3. Kelime Defteri |
|---|---|---|---|
| Açı | Ürün demosu | Sorun, sonra çözüm | Öğrenme döngüsü |
| Kanca | "Altyazı: İngilizce mi, Türkçe mi?" sonra "İkisi birden." | "Durdur. Geri sar. Çevir. Tekrar." | "Dizi izlemek ders sayılır mı?" |
| Görünüm | Koyu sinema, film karesi | Kâğıt + turuncu alan, büyük kinetik yazı, sert kesmeler | Leylak alan, baloncuklar, kartlar |
| Gösterilen | İki satır, kelime kartı + Kaydet, 5 altyazı stili, 6 dil | Satır satır tuşlar (Alt+Z/X/C), satır sonunda durma, kelime kartı, özet | Video öncesi test, kelime kaydı, aralıklı pratik (1·3·7·21 gün), Anki/CSV |
| Müzik (Mixkit) | Sweet September, Arulo (lofi, 76 BPM) | Midnight Funk, Michael Ramir C. (funk, 118 BPM) | Happy Times, Alejandro Magaña (indie pop, 120 BPM) |

Müzik lisansı: Mixkit Stock Music Free License. Sosyal medya ve çevrim içi reklam serbest, atıf gerekmez. CD/TV/oyun yasak, müziği tek başına yeniden dağıtmak ve hak yönetimine kaydetmek yasak. Kesme ve ses kısma yapılır, remiks yapılmaz.

## Teknik

- `promo/` alt klasörü, Remotion projesi, 1080×1920, 30 fps, 900 kare. Ses efektleri Node betiğiyle sentezlenir (indirme yok).
- Kesmeler müziğin vuruş ızgarasına oturur (BPM ve ilk vuruş ölçüldü).
- Güvenli alan: önemli yazı 900×1400 orta kutuda; alt 320 px ve üst 120 px boş.
- Doğrulama: her videodan anahtar kareler `remotion still` ile alınır, bakılır, düzeltilir; MP4 `ffprobe` ile denetlenir.

## Lisans notu

Remotion bireyler ve 3 kişiye kadar şirketler için ücretsiz; daha büyük şirket lisans alır.

## Sonuç (2026-11-19)

Üç video `promo/out/final/` altında. Müzik kesitleri: V1 kaynak 9,402 sn'den (düşüş stil sahnesinin başına), V2 15,95 sn'den (düşüş ilk karede), V3 0,458 sn'den. Ses `loudnorm` ile -14 LUFS. Ayrıntı: `promo/README.md`, kararlar: `docs/memory/decisions.md`.
