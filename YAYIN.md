# JEST yayın rehberi (v0.1)

## Mimari (ultra sade)
- Tek sunucu: `server.js` (Node 22, sıfır bağımlılık, SQLite dosyası). Web uygulaması `public/` altında.
- Aynı kod her yerde: tarayıcı (PWA, ana ekrana eklenir), iPhone ve Android (Capacitor ile mağaza paketi).
- Para tutulmaz. Komisyon yalnızca kayıt olarak tutulur, mekâna aylık fatura kesilir.

## Çalıştırma
- Geliştirme: `JEST_DEV=1 node server.js` (SMS kodu 123456, yaş belirteci DEV-AGE-OK)
- Test: `node test.js`
- Canlı için ortam değişkenleri: JEST_SECRET, JEST_ADMIN_KEY, JEST_SMS_URL, JEST_SMS_KEY, JEST_DB, PORT

## Mağazaya girmeden önce (kapıdaki işler)
| İş | Durum |
|---|---|
| Hesabı uygulama içinden silme (Apple ve Google şartı) | sunucuda hazır, arayüze eklenecek |
| Gizlilik politikası ve kullanım şartları, herkese açık bağlantı | avukat onayı bekliyor |
| Destek e-postası ve destek sayfası | kurucu |
| Yaş derecelendirmesi 17+/18+, mekân alkol satmıyorsa da | form doldurulacak |
| e-Devlet yaş doğrulaması (`ageVerified`) | Başkanlık rehberi çıkınca |
| Gerçek SMS sağlayıcı (`sendSms`) | teklif alınacak |
| Apple Developer 99 dolar/yıl, Google Play 25 dolar tek sefer | kurucu |
| Sunucu (Türkiye veya AB) ve alan adı, HTTPS | seçilecek |
| Capacitor paketi (iOS ve Android) | sunucu canlıya çıkınca |

## Sıra
1. Arayüzü API'ye bağla (giriş, davet, cevap, QR, fiş) — sıradaki iş.
2. Sunucuyu canlıya al, PWA olarak kapalı pilota ver.
3. Pilot sonrası Capacitor ile mağaza paketleri.

## Kapalı yayın (dışarıya kapalı)
- `JEST_KAPALI=1 JEST_KODLAR=PILOT1,PILOT2 node server.js` → yalnızca davet kodu olan kayıt olabilir. Kayıtlı üyeler kodsuz girer.
- Kodları kurucu dağıtır, her pilot kullanıcıya bir kod. Arayüzde kayıt ekranına "davet kodu" alanı eklenecek.
- Mağaza listesine konmaz; adresi bilen web uygulamasını açar. Mekân anahtarları gizli tutulur.
