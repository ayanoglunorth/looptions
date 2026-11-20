# Ana dildeki videoda otomatik kapanma (kısa tasarım)

## Amaç ve neden
Kullanıcının ana dilinde (`prefs.secondary`) konuşulan bir videoda üstte öğrenilen dil, altta ana dil altyazısı istenmez. Eklenti o video için kendiliğinden kapanır. Kullanıcı logo menüsündeki anahtarla açabilir.

## Kapsam
- Yalnızca YouTube. Kesin işaret: otomatik üretilen parça (`id` = `yt:<dil>:asr`) konuşulan dildir. Dili `prefs.secondary` ise ana dilde konuşulan videodur.
- Hedef dışı: diğer siteler (altyazı listesinden tahmin yanlış kapatabilir, ayrıca istenirse), kalıcı kayıt, popup/ayar eklemek.

## Yaklaşımlar
1. `content.js` `apply()` içinde izlenen parça listesine bakmak (main-world'e dokunmadan). Seçildi: parça listesi `data.tracks` içinde zaten var, kapatma düzeneği (`offVideo`) mevcut.
2. `main-world.js`'ten ayrı bir "konuşma dili" olayı yollamak: aynı bilgi için yeni bir mesaj türü. Gereksiz.

## Tasarım
- `content.js`: `userOnKey` (kullanıcının elle açtığı videonun `videoKey`'i). `apply()` içinde, `offVideo` sıfırlandıktan sonra: video var, `offVideo` yok, parçalarda `yt:*:asr` ve dili `prefs.secondary` ve `userOnKey !== videoKey(video)` ise `offVideo`/`offKey` ayarlanır.
- `setVideoOff(false)` `userOnKey = videoKey(video)` yazar; `setVideoOff(true)` onu temizler.
- Mevcut davranış korunur: video elemanı veya kaynağı değişince (reklam, sonraki video) durum yeniden değerlendirilir; sayfa yenilenince sıfırlanır.
- Saf karar `src/core/lang.js` içinde `DS.spokenNative(tracks, prefs)` olarak yazılır ve `node --test` ile test edilir; DOM'a bağlı kısım elle doğrulanır.

## Bilinen sınır
Yalnızca elle yazılmış altyazısı olan ve otomatik parçası olmayan Türkçe YouTube videosu tanınmaz; eklenti açık kalır (bugünkü davranış). Konuşma dili ana dil olsa da otomatik parça başka dildeyse (nadir) kapanmaz.
