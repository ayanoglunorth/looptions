# Looptions – proje notu (Claude için)

Chrome MV3 eklentisi: video oynatıcının altyazılarını bulur, iki dili aynı anda videonun üstünde gösterir.
Vanilla JS. Derleme adımı, paket yöneticisi, bağımlılık yok. Kullanıcıya dönük metinler kaynakta Türkçe; arayüz kullanıcının ana dilinde gösterilir (çeviriler `src/core/i18n.js`, yeni metne satır ekle). Kod yorumları İngilizce.

## Oturum başında

1. Aşağıdaki dizini oku (otomatik yüklenir). İşe uyan not dosyalarını aç, hepsini değil.
2. Kod değiştirmeden önce `docs/memory/status.md`'e bak: yarım iş var mı, başka plan aynı dosyaya dokunuyor mu.

## Oturum sonunda

- `docs/memory/status.md`: ne bitti, ne yarım, sıradaki ne.
- `docs/memory/decisions.md`: yeni karar ve **neden**. Kod/README'den çıkarılamayan şeyler buraya.
- `docs/memory/architecture.md`: yalnızca yapı değiştiyse.
- Küçük şeyleri yazma. Kodda ya da git geçmişinde zaten olanı tekrarlama.

## Komutlar

```bash
node --test          # 102 test. `node --test test/` Node 24'te çalışmıyor.
```

Elle deneme (iki portlu fixture sunucusu): `README.md` → "Geliştirme". Eklentiyi `chrome://extensions` → "Paketlenmemiş öğe yükle" ile yükle.

## Tasarım

Arayüze dokunan her yeni ekran/bileşen/overlay parçası için önce `DESIGN.md`'yi oku (token'lar, tipografi, düğmeler, overlay kuralları). Tasarım dilini değiştirirsen `DESIGN.md`'yi de güncelle.

## Kurallar

- Çalışan davranışı bozma. Her değişiklik isteğe bağlanabilmeli; komşu kodu "düzeltme".
- Siteye veya oynatıcıya özel kod yok (YouTube/Netflix için mevcut adapter'lar `main-world.js`'te kalır).
- Proje git deposu (`main`). Kullanıcı istemeden commit atma.
- Overlay `pointer-events: none` ve kapalı shadow root içinde. Tıklanabilir yapılacak şey yalnızca kendi elemanı olur.
- Saf mantık `src/core/*.js` içinde ve Node'da test edilir (`test/`). DOM'a bağlı kod elle doğrulanır.
- Planlar `docs/superpowers/plans/`, tasarım notları `docs/superpowers/specs/` altında.

@docs/memory/INDEX.md
