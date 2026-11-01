# Mağaza paketi (iPhone ve Android)

Uygulama zaten bir web uygulaması (PWA): telefonda "Ana ekrana ekle" ile tam ekran açılır. Mağaza paketi aynı uygulamayı bir kabuğa koyar (Capacitor). Kod değişmez.

## Önce kapıdaki işler
- Apple Developer hesabı (99 dolar/yıl) ve Google Play hesabı (25 dolar tek sefer): kurucu açar.
- Gizlilik politikası ve kullanım şartları herkese açık bir adreste olmalı: avukat onayı bekliyor.
- Hesabı uygulama içinden silme: var (Hesabımı sil).
- Yaş derecelendirmesi: 17+/18+ olarak işaretlenir.
- Gerçek SMS ve yaş doğrulaması canlıda açık olmalı.
- Apple, "sadece web sitesi" olan uygulamaları sık reddeder. Mağaza sürümüne en az bildirim ve kamera (QR) gibi cihaz özellikleri eklemek gerekebilir.

## Android (Windows ya da Mac ile yapılabilir)
1. Node.js ve Android Studio kur.
2. Bu klasörde: `npm i @capacitor/core @capacitor/cli @capacitor/android`
3. `npx cap add android`, sonra `npx cap open android`
4. Android Studio'da Build > Generate Signed Bundle (AAB). Dosyayı Play Console'a yükle.

## iPhone (Mac ve Xcode şart)
1. `npm i @capacitor/ios`, `npx cap add ios`, `npx cap open ios`
2. Xcode'da imzalama için Apple hesabını seç, Product > Archive, App Store Connect'e gönder.

## Önerilen sıra
Önce kapalı pilotu PWA olarak yürüt. Mağaza paketini pilot sonuçları iyiyse hazırla.
