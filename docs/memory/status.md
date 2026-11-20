# Durum

Son güncelleme: 2026-11-19 (arayüz dili = ana dil)

## Arayüz ana dilde (2026-11-19, `node --test` 102, sahte `chrome` ile tarayıcıda görüldü, gerçek Chrome'da DENENMEDİ)
- `src/core/i18n.js` (6 dil, ≈200 metin), `test/i18n.test.js`. Popup, ayarlar, kurulum (TR/EN düğmesi ve `welcome-i18n.js` kalktı), oynatıcı menüsü (`menu.js` dil değişince yeniden kurulur), overlay (test kartı, kaydet, flash, "altyazı yok" bildirimi), çeviri hata mesajları. Dil adları (`Intl.DisplayNames`) ve `fmtOffset` birimi de ana dilde.
- Görülen (sahte chrome): popup de, ayarlar ru → fr → tr canlı geçiş, kurulum fr tahmini → de, en tarayıcı → tr seçince Seviye adımı, menü es ↔ tr.
- Denenmedi: overlay (gerçek videoda test kartı/flash/bildirim), uzun Almanca/Fransızca/Rusça metinlerin dar yerlerde taşması (kurulum adım etiketleri, popup ipuçları, menü), çevirilerin anadili konuşan biri tarafından okunması. Tekil/çoğul yok ("1 mots enregistrés"). Popup adım seçicilerinde ondalık hep virgül.
- Yeni metin eklerken: `i18n.js`'e satır ekle; HTML'deki metin eksikse test düşer, JS'teki metin `t()` ile sarılmalı (test yakalamaz).

## Test bekleme kutusu düzeltmesi (2026-11-19, `node --test` 101/102, gerçek Chrome'da DENENMEDİ)
- `overlay.js` tick: otomatik `play()` artık testi iptal etmiyor; `content.js` `quizTick`: sessiz/dar (ön izleme) videoda test beklenmiyor. Neden: decisions.md. Kalan 1 hata `test/i18n.test.js` (`welcome.html`), bu işle ilgisiz, başka yarım i18n işinden.
- Elle denenecek: YouTube ana sayfada ön izleme → videoyu aç → kutu/test çıkmalı; otomatik oynatan başka bir sitede kutu kalmalı; beklerken oynat'a basınca atlanmalı.

## Hız adımı + oklu ayar (2026-11-19, `node --test` 97, sahte `chrome` ile popup ve ayarlarda görüldü, gerçek Chrome'da DENENMEDİ)
- Yeni `prefs.speedStep` (varsayılan 0,25). `seekSecs` ve `speedStep` artık elle yazılmıyor: `<` `>` oklu seçici (`.num.step`, popup.css), değerler `DS.STEPS` listesinden (`DS.stepValue`, testli): sarma 1-60 sn, hız adımı 0,05-1. Eski elle yazılmış değer (ör. 7,5) ilk ok basışında listedeki komşusuna geçer. Popup'ta iki ayar yan yana (`.pair`), ayarlar sayfasında iki kart.
- Hız aralığı yine 0,25-4×; 0,01'e yuvarlanır.

## Kısayol bildirimi yeniden tasarlandı (2026-11-19, sahte `chrome` + gerçek overlay koduyla önizlendi, gerçek Chrome'da DENENMEDİ)
- Sarı köşeli `.tag` gitti; kâğıt hap + turuncu ikon dairesi (hız: gösterge, sarma: dönen ok, satır tuşları: atla/tekrar/duraklat). Sol üstte; logo sol üstteyse sağ üstte. Popup ve ayarlarda "Sarma miktarı" / "Hız adımı" adlarının önünde aynı ikonlar. Kurallar `DESIGN.md` overlay bölümünde. Hız/sarma bildiriminde yazı etiketi yok (yalnız ikon + miktar, kullanıcı isteği).
- Denenmedi: gerçek sitelerde oynatıcının kendi sol üst öğeleriyle (YouTube başlık, Netflix geri düğmesi) çakışma.

## Video 1 güncellendi (2026-11-19, `promo/`)
- Kullanıcı Video 1'i çok beğendi, istedi: seviye belirleme testi + video öncesi kelime testi anlatılsın, daha hızlı olsun, süre serbest. Yeni `V1-IkisiBirden` **28,4 sn** (852 kare, 76 BPM'de 36 vuruş; altıncı tur, `decisions.md` son paragraf): kanca (iki satır) → tıkla/çevir/kaydet → **Seviyeni testle bul** (kelime, uydurma kelime "glorpet", cümle, sonuç B1, gerçek kurulum testi metinleriyle) → **Video öncesi kelime testi** (soru, anlam, "Hazırsın" özeti, Hepsini kaydet, Videoya geç, sonra iki dilli altyazılı video başlar) → **Tek tuşla dil değiştir** (Ctrl+M, tek satır modu: EN ↔ TR, sarı EN/TR etiketi) → 5 stil / 6 dil → CTA. Üçüncü tur: kullanıcı "bir tık daha hızlı + tuşla altyazı değiştirme" istedi; kanca 3 vuruş, tık 4, seviye 5, test 5, tuş 3, stil 4, CTA 4. Eski 30 sn sürüm `V1-IkisiBirden-30sn-eski` olarak duruyor (`out/final/...-30sn-eski.mp4`).
- Hız ölçümü (kare farkı, 10 fps örnekleme): eski 30 sn → 1,5 sn'de bir büyük görsel değişim, karelerin %34'ü hareketli, en uzun durağan an 3,4 sn; yeni 22,9 sn → 1,0 sn'de bir değişim, %51 hareketli, en uzun durağan an 1,3 sn, ortalama değişim 2 kat. Tutma (retention) gerçek izleyiciyle ölçülür, burada ölçülemedi.
- Yeni müzik kesiti `public/music/v1b.mp3` (kaynak 14,929 sn'den): düşüş 7,0 sn'de seviye testi sahnesinin başına denk geliyor. Yeni ortak parça `src/ui/Quiz.tsx` (overlay `.qcard` / kurulum `.place-card` kopyası, em ölçülü). Doğrulandı: tsc/eslint temiz, kareler incelendi, yuv420p, -14,0 LUFS. Reklamda "Cümleler · 1 / 15" gerçek (`CLOZE_TOTAL = 15`), "10 kelime" ve "Hazırsın" metinleri overlay'den.

## Tanıtım videoları (2026-11-19, bitti, `promo/`)
- Instagram reklamı için 3 farklı 9:16 / 30 sn video, Remotion 4.0.545. Çıktı: `promo/out/final/` (3 mp4 + 3 kapak jpg, `out/` .gitignore'da). Yeniden üretmek: `cd promo && npm install && scripts/master.sh <CompId> <ad>` (README'si var). Kompozisyonlar: `V1-IkisiBirden` (ürün demosu), `V2-GeriSar` (satır tuşları), `V3-KelimeDefteri` (test, defter, pratik, dışa aktarma).
- Doğrulandı: her videodan çok sayıda kare incelendi, 1080×1920 / 30 fps / 30,0 sn, ses -14,1 LUFS (Instagram hedefi), tepe -1,4 dBFS. `node --test` 94/94 geçti (promo testleri etkilemiyor, `pack.js` izin listesiyle çalıştığı için `promo/` pakete girmez).
- İkinci tur (tasarım denetimi): kontrast düzeltmeleri (decisions.md), geriye dönük plan `docs/superpowers/plans/2026-11-19-tanitim-videolari.md`; videolar yeniden render edildi, 94/94 test, tsc/eslint temiz, SFX zamanı ses analiziyle doğrulandı.
- Üçüncü tur: finaller `yuvj420p` (tam aralık) çıkıyordu, `yuv420p` TV aralığına çevrildi (`master.sh` güncel), telefon boyutu (390 pt) okunabilirlik kontrolü, faststart/AAC/-14 LUFS doğrulandı.
- **Denenmedi:** gerçek Instagram'a yüklenince görünüm (kenar UI'ı alt 320 px'i örter; içerik buna göre yerleşti), kulakla dinleme (müzik hizası ses enerjisi analizinden doğrulandı, dinlenmedi), telefonda izleme.
- Kullanıcıya kalan: reklam metni (başlık/açıklama) ve hedefleme. "Ücretsiz" demedik (listing.md ile aynı gerekçe). Müzikler Mixkit Stock Music Free License (reklam serbest, atıf gerekmez); parça adları `promo/README.md`'de.

## Strateji (2026-11-18)
- Karar ve yol haritası (aşamalı, agent için): `docs/superpowers/specs/2026-11-18-strateji-kararlari.md`. Sıra: Aşama 1 (6 dil, Siteler sekmesi, "ikinci dil yok" bildirimi) → 2 oynatma kontrolleri → 3 kelime pratiği → 4 dışa aktarma → 5 Supabase + Microsoft çeviri (Store'dan hemen önce) → 6 gizlilik metinleri → 7 Store. Test v1'de yalnızca en→tr.

## Aşama 1 yapıldı (2026-11-18, `node --test` 80, gerçek Chrome'da DENENMEDİ)
- `DS.LANGS` 6 dil; `DS.mergePrefs` (eski kayıtlı dil → en/tr; 5 yerde kullanılıyor), `DS.quizPair`, `DS.siteHost/siteOn/setSite` (lang.js, testli). Popup'ta yalnızca 6 dilden parça seçimi `prefs`'e yazılır.
- Siteler sekmesi (`pages/options.*`): `prefs.sites[host] = {ext, quiz}`; `content.js` `on()` / `siteOn('quiz')`; host iframe'de en üst sayfadan (`ancestorOrigins`).
- "Bu videoda X altyazı yok" bildirimi: `content.js` `missingNotice` (4 sn gecikme, video başına bir kez) + overlay `.note` (6 sn).
- Denenmedi: Siteler sekmesi tarayıcıda, bildirimin görünüşü/zamanlaması, iframe'de host, YouTube/Netflix'te site kapatma. Sıradaki: Aşama 2 (oynatma kontrolleri).

## Aşama 2 yapıldı (2026-11-18, `node --test` 83, gerçek Chrome'da DENENMEDİ)
- Saf: `DS.seekTarget`, `DS.crossedLineEnd` (parse.js), `DS.PLAY_KEYS` + `prefs.key*`/`autoPause` + `DS.nudgeKey` (lang.js). Tuş: `content.js` keydown → background `act` röleyi → overlay `act(name)` (satır atlama, otomatik durdurma aç/kapa, ±0,25 sn) + `flash` geri bildirimi. Otomatik durdurma overlay `tick`'inde. Ayar: `pages/options.*` "Oynatma" sekmesi.
- Denenmedi: gerçek videoda tuşlar, Alt+harf'in tarayıcı kısayoluyla çakışması, otomatik durdurmanın satır sonunda metni tutması, iframe'li oynatıcıda rölenin çalışması. Popup ve oynatıcı menüsünde bu ayarların kısayolu yok (yalnızca Gelişmiş ayarlar). Sıradaki: Aşama 3 (kelime pratiği).

## Video hızı ve saniye sarma (2026-11-19, `node --test` 93, gerçek Chrome'da DENENMEDİ)
- Tek tuşlu (Ctrl/Alt'sız) kısayollar: `DS.PLAY_KEYS`'te `plain: true` (`keySpeedUp/Down`, `keySeekBack/Fwd`, `seekSecs`), varsayılan BOŞ (kullanıcı atar). `DS.keyFromEvent`, `DS.typing` (input/textarea/select/contenteditable/role=textbox, shadow root, IME'de asla çalışmaz), `DS.videoAct`. `content.js` `videoAct` videonun kendisine uygular (altyazı/overlay gerekmez), çerçevede video yoksa background `act` röleyi ile diğer çerçevelere. Ayar: Gelişmiş ayarlar → Oynatma ve popup'ın en altı (aynı `prefs`); oynatıcı menüsünde YOK. Kaldırıldı: ±0,25 sn altyazı kaydırma tuşları (`keyBack/keyFwd`; `DS.nudgeSel` menü için duruyor) ve ayarlar sayfasındaki 'Kurulumu yeniden başlat' düğmesi.
- Denenmedi: gerçek YouTube'da arama kutusundan çıkınca D'nin yazılması/video hızı, iframe'li oynatıcı, Netflix'in playbackRate'i sıfırlaması. Overlay yoksa (altyazı yok) ekranda geri bildirim görünmez. Hız adımı ayarlanabilir (aşağıdaki 'Hız adımı' notu), aralık 0,25–4.

## Aşama 3 yapıldı (2026-11-18, `node --test` 89, gerçek Chrome'da DENENMEDİ)
- `src/core/review.js` (saf, testli): `dueWords`, `gradeWord` (kutu 1-4, 1/3/7/21 gün), `blankContext`, `makeQuestion` (cloze/choice/card), `makeSession`. `words` kayıtlarına `box`, `due` eklenir (ilk cevapta). Arayüz: `pages/options.*` Kelimeler sekmesi, `startPractice`/`ask`/`summary`.
- Denenmedi: pratik arayüzü tarayıcıda (görünüm, odak, çoktan seçmeli renkler), gerçek `storage.local` yazımı, popup/menüde vade sayısı yok. Cloze yalnızca kayıtlı cümlede kelime aynen geçiyorsa; test kartından kaydedilen kelimelerin cümlesi yok (`context` boş), onlar çoktan seçmeli/kart olur. Sıradaki: Aşama 4 (CSV/Anki dışa aktarma).

## Aşama 4-7 (Store öncesi) yapıldı (2026-11-18, `node --test` 91, hiçbiri gerçek Chrome'da DENENMEDİ)
- 4: `src/core/export.js` (CSV BOM'lu, Anki TSV `#separator:tab`), Kelimeler sekmesinde iki indirme düğmesi. Anki'ye gerçekten içe aktarma denenmedi.
- 5 (kod hazır, **dağıtılmadı**): `supabase/functions/lookup/index.ts` (önbellek → Microsoft sözlük/çeviri, aylık 1,8M karakter sınırı), `supabase/migrations/`, `supabase/config.toml` (JWT kapalı). İstemci: `background.js` `lookupWord`; `LOOKUP_URL` hâlâ `PROJECT_REF` yer tutucusu, bu yüzden geliştirme için Google ucuna düşer. Supabase/Azure hesabı ve dağıtım kullanıcıda (README "Çeviri sunucusu"). Edge Function hiç çalıştırılmadı (Deno), Microsoft uç noktası/yanıt şekli belgeden yazıldı, doğrulanmadı.
- 6: README "Gizlilik ve veri", `docs/privacy.html` (TR+EN, KVKK; iletişim ve veri sorumlusu alanları `[...]` boş).
- 7: `manifest.json` ad/açıklama `_locales` ile (en: "Dual Subtitles for Language Learning", tr: "Çift Altyazı – Dual Subtitles"), sürüm 1.0.0; `docs/store/listing.md` (metinler, izin gerekçeleri, paket komutu). `scripts/check-release.js` yer tutucu ve Google ucu kalırsa başarısız olur.
- **Kullanıcıya kalanlar:** Supabase+Azure kurulumu ve dağıtım, `LOOKUP_URL`, `googleWord` silme, privacy.html'e ad/e-posta, GitHub Pages ile yayınlama + URL, ekran görüntüleri, avukat, Store hesabı ve yükleme, gerçek Chrome'da elle deneme (tüm aşamalar).

## Ayarlar sayfası yeniden tasarlandı (2026-11-18, sahte `chrome` ile tarayıcıda görüldü, gerçek Chrome'da DENENMEDİ)
- Hero kartı ve her sayfadaki önizleme kalktı. Tek sütun (720px), gruplanmış satırlar (etiket+ipucu solda, kontrol sağda). Dock sırası: Kelimeler (açılış sayfası), Diller, Görünüm (canlı önizleme yalnız burada), Oynatma, Siteler. Yeni dosya `pages/options.css` (pages.css'ten ayarlara ait ölü kurallar silindi). Kelimeler: vadesi gelen sayısı + "Pratik yap", arama, CSV/Anki, kelime başına kutu noktaları.
- Elle gerekli: gerçek Chrome'da `chrome.storage` ile, tuş kaydı, kelime silme/arama, uzun kelime listesi, karanlık/zorunlu renk modu. `DESIGN.md` değişmedi (aynı dil); yeni parçalar: `.btn-primary`, `.pill`, `.group/.row`.

## Ayarlar sayfası 2. tur (2026-11-18, sahte `chrome` ile görüldü, gerçek Chrome'da DENENMEDİ)
- Kutu bildirimleri (`.note`) kalktı: düz metin ve ortalı boş durumlar. Sayfa 1120px'e genişledi: kelimeler ve siteler kart ızgarası, Diller yan yana iki seçici, Görünüm'de solda yapışkan önizleme, tuşlar kart ızgarası.
- Siteler: eklenti çalıştığında `content.js` `noteSeen` alan adını `storage.local` `seenSites`'e yazar (en çok 50, yerel); sayfa bunları ve elle eklenenleri logosuyla listeler. Logo: manifest'e **`favicon` izni** eklendi, `_favicon/` ile Chrome'un önbelleğinden; yoksa harf monogramı. README, privacy.html ve listing.md buna göre güncellendi.
- Denenmedi: gerçek favicon görünümü (sahte ortamda yalnız monogram), `seenSites` yazımı, `favicon` izninin Store incelemesi.

## Store adı (2026-11-19)
- Repo manifest'i eski adında kaldı ("Looptions – Çift Altyazı"), `_locales` silindi. Store adı "Dual Subtitles - Looptions" yalnız paket çıktısında: `node scripts/pack.js` (release check → `dist/looptions-<sürüm>.zip`, manifest adı ve özeti Store'unkiyle değişir). Neden: Store adı ve özeti manifest'ten okunur, panelden değiştirilemez (Play Store'dan farklı). `dist/` .gitignore'da. pack.js hiç çalıştırılmadı (release check şu an yer tutucu yüzünden başarısız olur).

## Erişilebilirlik turu (2026-11-18, tarayıcıda sahte `chrome` ile görüldü, gerçek Chrome'da DENENMEDİ)
- Yapıldı: odak halkası/anahtar izi/adım göstergesi kontrastı, hero üstünde anahtar halkası, sihirbazda yapışkan alt çubuk, kelime silme (SVG ikon, `aria-label="Sil: kelime"`, iki tıkla hepsini sil), sihirbaz sahnesi ekran okuyucuya açık (yalnız `.scene` gizli), popup'ta kapalı durum metni kısaldı ("Gösterilmiyor").
- Sıradaki (eleştiriden, yapılmadı): ayarlar "Görünüm" ızgarasında boş hücre, 68px sayılar, dock; popup'ın çok uzun olması; renk token'ı kayması (~55 hex); tek kelime silmede geri alma; karanlık tema.

## Video öncesi test: soru sayısı düzeltmesi (2026-11-18, testli `node --test` 76, gerçek Chrome'da DENENMEDİ)
- Yapıldı: seviye otomatik yükselmesi kaldırıldı, `textTracks` listesi oturana kadar bekleme, `SPOKEN` konuşma biçimleri, "en fazla" etiketleri (popup, kurulum).
- **Sıradaki:** gerçek filmde kaç kelime çıktığına bak. Hâlâ az ise `startQuiz`'e geçici `console.log` (cue sayısı, `prefs.level`, `slice` öncesi aday sayısı) koy. Hâlâ yetmezse CEFR dışı kelimeleri (hermitdave) süzerek almayı düşün.

## Altyazı dili doğrulama + forced atlama (2026-11-17, Helium'da Ted Lasso 3x11 ile görüldü)
- `DS.isForced`, `DS.checkLang` (lang.js, testli; `node --test` 75), `content.js` `relabel`. Helium (temiz profil, `--load-extension`) ile hdfilmcehennemi videosunda tam Türkçe satır geldi. Denenmedi: popup menüsünden elle parça seçimi, yazı tipi şikâyeti (farklı fontla Türkçe), textTracks için doğrulama.

## Adaptif seviye testi + video öncesi test düzeltmeleri (2026-11-17, kodlandı, gerçek Chrome'da DENENMEDİ)
- Var (testli, `node --test` 71): `ability.js`, `freq-en.js`, `cloze-en.js`, `placement.js`, `limitedFetcher`, `quizSize` (varsayılan 20; popup + kurulum seçimi), `abilityAfterQuiz`. Plan: `docs/superpowers/plans/2026-11-17-adaptive-placement-quiz-ux.md`, tasarım: `specs/2026-11-17-adaptive-placement-quiz-ux-design.md`.
- Sahte `chrome` ile tarayıcıda görülen: kurulumdaki iki bölümlü test (kelime + cümle, sonuç ve `ability` kaydı), kartın dönmesi, anlam gecikmeli/hiç gelmeyen/hatalı üç durumda arka yüz, özet tablosu ve kaydet, ortadaki yükleniyor hapı, yüklenirken duraklatma/bırakma/oynat'la iptal.
- Denenmedi: gerçek Chrome'da eklenti olarak (gerçek altyazı akışı, `storage` yazımı, `prefs.level`'in otomatik değişmesi), tam ekran `<video>`, iframe, YouTube/Netflix, siteler duraklatmayı geri alırsa, Google çevirisi 429.
- **Sıradaki:** kullanıcının B1 sonucu: kurulum testini çöz, sonucu söyle; `LEVEL_CUTS`/`Q`/`TAU` bu sonuçla ayarlanır (`ability.js` başındaki sabitler). Cümle sorularının zorluğu (özellikle C1/C2) gerçek kullanıcıyla kontrol edilmeli.
- "Geri" düğmesi: kurulum testinde (`session.back()`, testli) ve video öncesi kartta (`goBack`, özet/anlam yüzünden de); tarayıcıda DENENMEDİ.
- Bilinen kenarlar: altyazısı gelmeyen İngilizce videoda ilk 15 sn duraklı; `welcome` yalnızca ilk kurulumda açılır, eski kurulumlar popup'tan seviye seçer ve ilk video öncesi cevaplarına kadar `ability` yok (seviye ortasından başlar).

## Video öncesi kelime testi (2026-11-17, kodlandı, gerçek Chrome'da DENENMEDİ)
- Var: `src/core/vocab.js` + `words-en.js` (testli, 48 testin 8'i), overlay'de kart ve "Test yükleniyor" halkası, `content.js` tetikleyicisi (`quizTick`/`startQuiz`/`saveVocab`), popup'ta anahtar + seviye, `welcome` içinde Seviye adımı (en→tr değilse atlanır). Plan: `docs/superpowers/plans/2026-11-17-pre-video-vocab-quiz.md`.
- Tarayıcıda (sahte `chrome` ile) görülen: kart, kâğıt-kart görünümü, klavye (Enter/Space/Esc, Tab tuzağı, sayfaya sızmama), özet iki sütun, halka tooltip'i, welcome adımı ve atlama.
- Denenmedi: eklenti olarak yüklü hâli (gerçek altyazı akışıyla `quizTick`), tam ekranda `<video>`, iframe'li oynatıcı, YouTube/Netflix/HLS, `storage.local` yazımı, Google çevirisinin 10 paralel isteği (429 gelirse özet çevirisiz kalır).
- Bilinen kenarlar: altyazı hiç çözülmezse halka video 60. sn'ye kadar döner; `welcome` yalnızca ilk kurulumda açılır, eski kurulumlar popup'tan seviye seçer (varsayılan A2).
- Sıradaki: elle deneme; kelime sayısını/eşiği (`QUIZ_MIN`, 60 sn) gerçek videolarla ayarla.

## Ana dilde YouTube videosunda otomatik kapanma (2026-11-17, testli mantık, Chrome'da DENENMEDİ)
- `DS.spokenNative` (lang.js, testli) + `content.js` `apply()`/`userOnKey`. Denenmedi: gerçek YouTube'da asr parçasının gelip overlay'in kapanması, logodan elle açmanın kalması, reklam sonrası yeniden kapanma. Elle yazılmış altyazılı (asr'siz) Türkçe video tanınmaz.

## Çalışan özellikler (kodda var; saf mantık `node --test` ile 40 testli)
- İki dilli overlay; kaynaklar: `<track>`/textTracks, ağ (.vtt/.srt), HLS, JW/Video.js/Playerjs, YouTube (`tlang` otomatik çeviri dahil), Netflix. Tüm altyazıyı kendimiz çevirmiyoruz: hedef dilde parça yoksa tek satır görünür.
- Stiller (5), yazı tipleri (Roboto varsayılan, Sistem, Inter, DM Sans, Nunito Sans, Atkinson).
- Varsayılanlar: boyut 70, arka plan opaklığı 70, altyazı yüksekliği 3, font Roboto, tuş `Ctrl+M`, logo sol üst. Eski kurulumlar kendi kayıtlı `prefs`'ini korur.
- Popup, gelişmiş ayarlar, ilk kurulum (`welcome`, 5 adım, Seviye yalnızca en→tr iken: ana dil, öğrenilen dil, seviye, görünüm [mod, tuş ataması, stil, font, boyut], bitti).
- Oynatıcı içi logo (köşe seçilebilir, fareyle belirir, duraklatınca kalır) ve tıklayınca açılan menü (`src/core/menu.js`, popup tasarımında, Outfit fontu).
- Kelime çevirisi: kelimeye tıkla, video durur, çeviri kutuda. Çeviri Google'ın herkese açık web uç noktasından (`background.js` `googleWord`); yalnızca tıklanan kelime gider.
- Kelime kaydetme: çeviri kutusunda "Kaydet" → `chrome.storage.local` `words`. Gelişmiş ayarlar → Kelimeler'de liste, tek tek silme, hepsini silme.

## Gerçek Chrome'da elle DENENMEDİ
Logo ve menü (tıklayınca videonun durmaması, tam ekran, iframe), kelime çevirisi uçtan uca, Kaydet ve Kelimeler listesi, Roboto'nun videoda görünmesi, kurulum ekranındaki yeni alanlar (tuş ataması, stil, font). Ayrıca: swap modunda gizli satırın tıklanamaması, tam ekranda çeviri kutusu, iframe'li oynatıcı, YouTube/Netflix.

## Yapılmadı
- Oynatıcı içi menü planı Task 5: `Alt+Shift+←/→` ile satır zamanı kaydırma kısayolu ve ekranda "+0,25 sn" geri bildirimi (`docs/superpowers/plans/2026-11-15-in-player-menu.md`).
- Plan Task 6'daki ayrıntılı README bölümü yok; README'de logo/menü/kelime defteri kısaca var.

## Çakışma uyarısı
`src/core/overlay.js` hem tıklanabilir kelimeleri, hem logoyu/menüyü, hem çeviri kutusunu barındırır. Birini değiştirirken diğerlerini düşün; tıklama olayları `stopPropagation` ile sayfaya sızmaz, bunu bozma.

## Sıradaki fikirler (istenmedi)
- Kelime çevirisinde bağlamlı açıklama (LLM), Wiktionary, kelime listesini dışa aktarma/çalışma modu.
- Resmi Google Cloud Translation anahtarı: yalnızca ücretsiz uç nokta engellenirse (kullanıcının kendi anahtarını girmesi en küçük yol).

## 2026-11-17 (ikinci tur): ikon, menü anahtarı, kurulum dili — elle/Chrome'da DENENMEDİ
- Eklenti simgesi: `icons/icon-*.png` (video logosu, `scripts/make-icons.js` üretir), manifest `icons` + `action.default_icon`.
- Oynatıcı menüsünün başındaki anahtar yalnızca O VİDEO için kapatır (`content.js` `setVideoOff`, kayıt yok; video elemanı veya kaynağı değişince tekrar açılır, sayfa yenilenince de). Genel kapatma yalnızca popup/gelişmiş ayarlardaki `enabled`. Kapalıyken logo kalır, altyazı ve sayfanın kendi altyazısı geri gelir.
- Logo varsayılanı sağ üst (`logo: 'tr'`); kayıtlı `prefs`'i olan eski kurulumlar kendi köşesini korur.
- Kurulum: tarayıcı dili tahmini kalktı, varsayılan hep öğrenilen en / ana dil tr. Sayfa dili TR/EN düğmesiyle (`prefs.ui`, ilk açılışta tarayıcı dili); İngilizce metinler `pages/welcome-i18n.js` (anahtar = HTML'deki Türkçe metin).

## Store metinleri (2026-11-19)
- `docs/store/listing.md` baştan yazıldı: yayın öncesi açıklar, ad/özet, EN+TR açıklama, görsel planı, "vaat ediyoruz/etmiyoruz" tablosu (kodla eşli), hukuki liste, izin gerekçeleri, destek SSS, başvuru sırası. `scripts/pack.js` özeti "any video" yerine yeni özetle eşitlendi. `privacy.html`'e Limited Use cümlesi eklendi.
- Açık: `fonts/` için OFL lisans dosyaları yok (pakete eklenmeli). YouTube'da `tlang` ile YouTube'un kendi otomatik çevirisi kullanılabiliyor; karşılama sayfası "tek satır gösterilir" derken bunu atlıyor. Kategori adı, marka araması, GDPR cümlesi doğrulanmadı.

## Video öncesi test varsayılan kapalı (2026-11-19)
- `DS.DEFAULT_PREFS.preQuiz` false. Kurulum sihirbazı seviye adımında anahtar + gönderim açıklaması (`welcome.html`, `welcome-i18n.js`, `welcome.js`); popup ipucuna "Kelimeler çeviri için gönderilir". Neden: Chrome politikası veri işlemeyi yüklemeden önce belirgin açıklamayı ister; test tıklamasız kelime gönderir.
- `fonts/LICENSES.txt` eklendi (altı aile OFL 1.1). Gizlilik formu için "Web browsing activity" da işaretlenmeli. Marka taraması ve Azure F0 ticari kullanım teyidi kullanıcıda.

## Çeviri sunucusu Cloudflare'e taşındı (2026-11-19)
- Supabase kalktı (2 proje sınırı). `worker/` (wrangler.toml, schema.sql, src/index.js; testli: `test/worker.test.js`, `node --test` 96). Yer tutucu artık `WORKER_SUBDOMAIN` (`background.js` `LOOKUP_URL`, `check-release.js`). `supabase/` silindi. privacy.html, README, listing.md, decisions.md güncellendi.
- Eksik: `wrangler.toml` `database_id` (`d1 create` çıktısı), dağıtım, Azure sırları, `LOOKUP_URL`, `googleWord` silme. Worker hiç çalıştırılmadı (yalnızca sahte D1 ile test). Origin süzgeci yalnız `chrome-extension://` önekine bakıyor; Store'dan eklenti kimliği çıkınca kimliğe sabitlenebilir.
- Dağıtıldı (2026-11-19): D1 `looptions` (WEUR, id wrangler.toml'da), Worker `https://looptions-lookup.ayanogluinthenorth.workers.dev`. `LOOKUP_URL` yazıldı, `googleWord` ve yer tutucu dalı silindi, `check-release` geçiyor. Duman testi: 400/403/502 doğru. **Azure sırları yok:** `MS_TRANSLATOR_KEY` ve `MS_TRANSLATOR_REGION` girilene kadar her çeviri "kullanılamıyor" der. workers.dev alt alan adı hesap adından geldi, herkese açık adreste görünüyor; istenirse Cloudflare panelinden değiştirilir (sonra LOOKUP_URL güncellenir).

## Marka taraması ve Store görselleri (2026-11-19)
- Marka: WIPO Global Brand DB ("looptions" içerir): sonuç yok. TMview (tüm ofisler, TÜRKPATENT ve USPTO dahil; arama aracı LOOPTWORKS ve aselsan ile sınandı): "looptions" ve "looption" için sonuç yok. looptions.{com,app,net,org,dev,io,co,eu,com.tr,xyz} DNS'te NS yok; npm ve GitHub'da yok; Play'de yok. Chrome Web Store sonucu sunucu tarafında yüklenmiyor, doğrulanamadı. Hukuki tarama değil.
- Görseller: `docs/store/screenshots/` (5x2 PNG + promo tile), üretici `scripts/store-shots/`. Düzeltildi: ayarlar sayfası kelime kartında sağdaki grup sütunu kelimeyi sıkıştırıp ortadan bölüyordu; `.words .meta` artık `display: contents` (sil düğmesi kelimenin yanında, dil çifti ve seviye noktaları alt satırda). Tarayıcıda sahte `chrome` ile görüldü.

## Gizlilik metni ve Store adımları (2026-11-19)
- `docs/privacy.html` yeniden yazıldı (veri sorumlusu adsız: "Looptions'ın geliştiricisi", iletişim nadasmobile@proton.me; hukuki sebep, aktarım, haklar, Limited Use). Gizlilik URL'si hâlâ yok: ana repo PRIVATE (Pages için ücretli plan gerekir) ve `docs/` iç planlar içerir; ayrı, yalnızca `index.html` içeren herkese açık bir repo/hesap gerekiyor. `manifest.json` `minimum_chrome_version: 111` (MAIN world betikleri için). `listing.md` §10 reviewer test talimatı, destek e-postası dolduruldu.
- Gizlilik sayfası yayında: https://looptions-privacy.pages.dev/ (Cloudflare Pages, eski yöntem `--force`; yeni wrangler Pages'i Workers'a yönlendiriyor). Güncelleme: `docs/privacy.html`'i `index.html` olarak temiz bir klasöre koyup `npx wrangler pages deploy . --project-name looptions-privacy --branch main` (o klasörde, `--force`'suz, `worker/` içinde DEĞİL: oradaki wrangler.toml yanlış Worker üretir).
- Destek sayfası yayında: https://looptions-privacy.pages.dev/support/ (kaynak `docs/support.html`; yayın klasörü: `index.html` = `docs/privacy.html`, `support/index.html` = `docs/support.html`, aynı `wrangler pages deploy` komutu). Store'da Destek URL'si bu. Chrome Web Store paneli eklenti otomasyonuna kapalı ("extensions gallery cannot be scripted"); alanlar elle dolduruluyor.
