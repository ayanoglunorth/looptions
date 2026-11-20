# Adaptif seviye testi + video öncesi test düzeltmeleri: tasarım

Kapsam: ana dili Türkçe, öğrendiği dil İngilizce olan kullanıcılar (mevcut test kapsamıyla aynı). Önceki tasarım: `2026-11-17-pre-video-vocab-quiz-design.md`.

## Neden
Kullanıcı B1; mevcut kurulum testi B2'ye koydu. Sebepler (kodda doğrulandı): her seviyeden yalnızca 5 rastgele kelime, adaptif değil, kelime zorluğu CEFR listesinden geliyor (listeler kullanım sıklığına göre sıralı değil, `bellow`/`bloody` B2'de), evet/hayır testi "tanıdım sandım"a açık, Türkçe'ye geçmiş Latin kökenli kelimeler (`analyse`, `astronomer`) olduğundan yüksek çıkıyor. Ayrıca video öncesi test 10 soruluk, kart "Bilmiyorum" deyince anlamı göstermiyor, hazırlanırken yalnızca köşede küçük bir halka var.

## Hedefler
1. Kurulum testi daha doğru ve **yukarı yanlılığı olmayan** bir seviye verir (belirsizse bir alt seviye).
2. Test iki bölümlü: adaptif kelime (en çok 50 soru) + cümle tamamlama (15 soru).
3. Video öncesi testte "Bilmiyorum" → kart döner, arkada Türkçe anlam. Sonda özet tablosu, satır satır ve toplu kaydet.
4. Test hazırlanırken videonun ortasında tasarım diline uygun "Altyazılar yükleniyor" göstergesi.
5. Video öncesi soru sayısı varsayılan 20; ayardan 10/15/20/25/30; kurulumda sorulur.

## Hedef olmayanlar
Dış test (EF SET vb.) gömmek: içerikleri sahipli. Popup'ta "yeniden ölç" düğmesi, LLM, Türkçe-eş kökenli kelime listesi, A1–C2 dışı seviye, başka dil çifti.

## Yaklaşımlar (kullanıcı B'yi seçti)
- A: yalnızca adaptif kelime testi. Az kod, ama yalnızca tek ölçü; yanlılık sürer.
- **B (seçildi): A + cümle tamamlama.** Cümle tamamlama "tanıdım sandım"ı yakalar. Bedel: soruları ben yazıyorum, zorlukları gerçek öğrencilerle kalibre değil.
- C: dış teste bağlantı. Tek başına çözüm değil; yapılmayacak.

## Tasarım

### Veri: sıklık listesi
- `scripts/make-freq.js` (tek seferlik, `make-wordlist.js` gibi) OpenSubtitles tabanlı **FrequencyWords `en_50k.txt`** (içerik CC-BY-SA-4.0, hermitdave/FrequencyWords) dosyasını okur, her kelimeyi `DS.headword` ile başlık kelimeye toplar, yalnızca CEFR listesindeki kelimeleri tutar (özel isim, küfür, uydurma elenir), sıklığa göre sıralı `src/core/freq-en.js` üretir (`DS.FREQ_EN`: boşlukla ayrılmış, sıra = rank). Yaklaşık 7 bin kelime, ~50 KB. Atıf README ve dosya başlığında.
- Dosya indirme işi uygulamada ayrıca onay ister; kullanıcı dosyayı kendisi de verebilir.

### Tahmin edici (`src/core/ability.js`, saf, Node'da testli)
- Tek bir gizli sayı θ = kullanıcının "kaçıncı sıklık sırasına kadar kelimeleri bildiği" (log ölçek, ~200 … 9000). Izgara üzerinde olasılık dağılımı (≈70 nokta), başlangıç dağılımı geniş, A2–B1 civarı.
- Kelime sorusu (sıklık sırası r, gerçek kelime): P(evet) = g + (1 − g − s)·σ((ln θ − ln r)/τ). s = 0,05 hata payı, τ ≈ 0,6 (ayarlanabilir sabit).
- Uydurma kelime: P(evet) = g. `g` (abartma oranı) dağılımı da güncellenir: Beta önsel ile uydurmalara verilen evetlerden. Her ~6. soru uydurma, toplam ≤ %20. Mevcut `FAKE` listesi kalır, gerekirse genişler.
- Cümle tamamlama sorusu (zorluk seviyesi L, 4 şık): P(doğru) = 0,25 + 0,75·σ((ln θ − ln r_L)/τ'), `r_L` her CEFR seviyesinin orta sıklık sırası.
- Sıradaki kelime: θ dağılımının medyanına en yakın sıklık sırası olan, daha önce sorulmamış kelime (en yüksek bilgi). Cümle sorusu: aynı mantıkla seviyesi θ'ya en yakın olan.
- Bitiş: kelime bölümü, dağılımın belirsizliği eşiğin altına inince (en az 20 soru) ya da 50 soruda biter; sonra 15 cümle sorusu.
- Sonuç: θ dağılımının **%25 yüzdeliği** (bilerek temkinli) → CEFR eşiklerine (sıklık sırası: A1 <800, A2 <1800, B1 <3000, B2 <4500, C1 <6500, C2 ≥6500; **tahmin, ayarlanabilir sabit tablo**). Bu yüzden belirsiz sonuç bir alt seviyeye düşer.

### Cümle tamamlama bankası (`src/core/cloze-en.js`)
30 soru (A2–C2 arası her seviyeden 6), özgün, benim yazdığım; her biri bir cümle + 4 şık + doğru şık. Tek boşluklu cümle, bağlamdan çözülür, Türkçe'den tahmin edilebilecek eş kökenli kolay yol bırakılmaz. 15'i adaptif seçilir. Doğrulama testi: 4 şık, tek doğru, tekrar yok.

### Kurulum ve popup
- `welcome` Seviye adımında "Testle bul" iki bölüm olur ("Kelimeler" sonra "Cümleler"), sonuç eskisi gibi seçimi günceller ve seçim elle düzeltilebilir. Başlıktaki "30 kelime" metni ve `welcome-i18n.js` güncellenir.
- Aynı adıma "Video öncesi kaç kelime? (10/15/20/25/30, öneri 20)" seçimi; popup'ta `preQuiz` anahtarının altına aynı seçim. `prefs.quizSize`, varsayılan 20; kayıtsız eski kurulumlar 20 alır. `DS.QUIZ_SIZE` bu değeri okur.

### Video öncesi test düzeltmeleri
- **Çevrilen kart:** "Bilmiyorum" → kart `rotateY` ile döner (`prefers-reduced-motion`'da çapraz solma), arka yüzde kelime, Türkçe anlam, "Devam". Anlam hazır değilse "…", hata olursa "Anlam bulunamadı". "Biliyorum" doğrudan sonrakine geçer. Klavye kısayolları (Enter/Space/Esc) mevcut davranışla uyumlu; dönen kartta odak arka yüzdeki "Devam"a gider.
- **Çeviri kuyruğu:** 20 kelimeyi aynı anda göndermek 429 riskli. En çok 3 eş zamanlı istek, sırayla; "Bilmiyorum" denen kelime kuyruğun önüne geçer; sonuç önbellekte.
- **Özet tablosu:** Bilinmeyen kelimeler için tablo (kelime · anlam · Kaydet); "Hepsini kaydet"; kaydedilenler mevcut kelime defterine (`words`) aynı biçimde yazılır. Kaydet düğmesi yazıldıktan sonra "Kaydedildi" olur.
- **Yükleniyor:** testin hazırlandığı sürede videonun ortasında hap/kart: dönen halka + "Altyazılar yükleniyor…" (`DESIGN.md` renk, Outfit, çizgi ikon). Bu sürede video duraklar (kullanıcı sahneyi kaçırmasın), test bitince ya da test gösterilmeyecekse (aday az, hata, **en çok 15 sn** zaman aşımı, kullanıcı oynat'a basarsa) devam eder. Küçük köşe halkasının yerini alır.

### Seviyenin zamanla düzelmesi (ayrılabilir son adım)
Video öncesi testte verilen cevaplar (sıklığı bilinen kelimeler) aynı θ dağılımını günceller; `prefs.level` ve kelime seçimi buna göre tazelenir. Kullanıcı seviyeyi elle seçerse dağılım o seviyenin ortasına geniş olarak sıfırlanır. İstenmezse çıkarılabilir, diğer parçalar etkilenmez.

## Doğrulama
- `node --test`: tahmin edici (benzetilmiş öğrenciler her seviyede ±1 seviye içinde kalır; %30 abartan öğrenci üste yerleşmez; hep "evet" en altta, hep "hayır" A1; uydurmaya evet arttıkça sonuç düşer; en çok 50+15 soru), sıklık listesi sırası/içeriği, cümle bankası biçimi, `quizSize` varsayılanı ve sınırları.
- Elle: kurulumda test (kullanıcı B1; hedef B1, en kötü B1/B2 sınırı), kart dönmesi, tablo ve kaydet, yükleniyor göstergesi ve 15 sn zaman aşımı, tam ekran. Eşik tablosu bu elle denemeyle ayarlanır; doğruluk baştan garanti değil.

## Riskler
- Eşik tablosu ve `τ` tahmin; gerçek kullanıcı sonuçlarıyla ayarlanacak.
- Cümle zorlukları benim yargım; tekil sorular yanlış seviyede çıkabilir (adaptif seçim ve %25 yüzdelik etkisini sınırlar).
- Çeviri uç noktası (gayriresmî Google) 429 verirse anlam görünmez; arka yüzde "Anlam bulunamadı".
- Eklenti içeriğine ~50 KB sıklık verisi + cümle bankası ekleniyor (içerik betiği her sayfada yüklenir).
