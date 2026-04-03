# Changelog

Botun gelişimi ve eklenen özelliklerin özeti:

## [3.0.0] - 3 Nisan 2026

### 🚀 Major Release — 12 Yeni Tool Eklendi

Tüm yeni araçlar **API key gerektirmez**. Ücretsiz ve açık kaynak API'ler kullanılmıştır.

#### 🛠️ Yeni Araçlar
- **`.qr`** — QR kod oluşturucu. Metin, URL veya WiFi bilgisinden QR kod resmi üretir.
- **`.kur`** — Anlık döviz ve kripto para kuru sorgulama + çevirici. USD/EUR/GBP/BTC/ETH/SOL.
- **`.hava`** — Hava durumu (wttr.in) + 3 günlük tahmin. Sıcaklık, nem, rüzgar, UV indeksi.
- **`.kisalt`** — URL kısaltıcı (TinyURL). Uzun linkleri kısa forma dönüştürür.
- **`.sozluk`** — TDK resmi sözlük sorgulama. Anlam, köken, örnek cümle, atasözü/deyim.
- **`.hesapla`** — Gelişmiş hesap makinesi (mathjs). Trigonometri, birim dönüştürme, yüzde hesaplama.
- **`.whois`** — Domain DNS kayıtları + IP geolokasyon (ip-api.com). Admin yetkisi gerektirir.
- **`.hash`** — MD5/SHA1/SHA256/SHA512 hash üretimi, Base64 encode/decode, güvenli şifre/PIN üretici.
- **`.renk`** — Renk önizleme kartı oluşturucu. HEX, RGB, HSL bilgisi + zıt renk. Türkçe renk isimleri desteklenir.
- **`.ping`** — Sunucu erişilebilirlik testi. HTTP yanıt süresi, status kodu, SSL durumu. Admin yetkisi gerektirir.
- **`.ocr`** — Resimdeki yazıyı AI ile okuma (tesseract.js). Türkçe + İngilizce dil desteği.
- **`.takvim`** — Tarih araçları: bugün bilgisi + hicri takvim, tarih farkı hesaplama, geri sayım, epoch çözümleme.

#### 📦 Yeni Bağımlılıklar
- `qrcode` — QR kod üretimi
- `mathjs` — Gelişmiş matematik hesaplama
- `tesseract.js` — Yapay zeka OCR motoru

#### 📝 Güncellenenler
- **help.js** — Kategorize edilmiş yeni yardım menüsü (Araçlar, Ağ, Medya, Araştırma, Sistem).
- **README.md** — Tam olarak yeniden yazıldı. Tüm 28 komut dokümante edildi.
- **package.json** — v3.0.0, yeni bağımlılıklar eklendi.

---

## [2.0.0] - 30 Mart 2026

### 🔧 Major Fix — ID Linking Sistemi
- **Kritik Sorun Giderildi:** Gruplardan ve DM'lerden gelen kullanıcı ID'leri artık doğru şekilde eşleştirilmektedir.
- WhatsApp'ın `@lid` (Linked ID) ve `@c.us` (telefon numarası) farkı, 3 katmanlı çözümleme sistemiyle ele alınmıştır:
  1. **In-Memory Cache** — Aynı oturumda tekrar çözümleme yapılmaz.
  2. **Kalıcı Alias Dosyası** (`aliases.json`) — Bot yeniden başlatılsa bile eşlemeler korunur.
  3. **WhatsApp Contact API** — Gerçek telefon numarası, `getContact()` üzerinden alınır.
- Yeni ID keşfedildiğinde ban/mute/admin listeleri **otomatik olarak migrate** edilir.
- `resolveMentionedId()` fonksiyonu ile @etiketleme'ler de alias sistemi üzerinden resolve edilir.

### 🏗️ Kod Kalitesi & Profesyonellik
- **DRY Prensibi:** `parseTargetId()` ortak yardımcı fonksiyon olarak `utils/parseTarget.js`'e taşındı. Ban, mute, addadmin artık aynı modülü kullanıyor.
- **Null Safety:** `msg.body` kontrolü eklendi — sadece medya gönderilen mesajlarda `undefined` hatasını önler.
- **Kullanılmayan Import Temizliği:** `document.js` dosyasındaki gereksiz `getTargetMedia` import'u kaldırıldı.
- **Güvenlik:** `.env.example` dosyası eklendi, `.gitignore` güncellendi (runtime data dosyaları, auth session, crash loglar).
- **`package.json`:** `start` script eklendi, versiyon ve açıklama güncellendi.
- **README.md:** Tam kurulum ve kullanım belgesi eklendi.

---

## [1.5.0] - 29 Mart 2026

### Added
- **Owner (Sahip) / Admin Hiyerarşisi:** Bot kurucusu ve yöneticiler için ayrıştırılmış yetki sistemi.
- **Kalıcı Moderasyon Altyapısı:** `storage.json` ile verilerin sunucuda saklanması.
- **`.ban` / `.unban`:** Kullanıcıyı bottan tamamen yasaklama özellikleri.
- **`.mute` / `.unmute`:** Kullanıcının bottan komut atmasını susturma özellikleri.
- **`.addadmin` / `.removeadmin`:** Dinamik olarak yönetici atama.
- **Status Güncellemesi:** Yetki bilgisinin (Admin/Owner/Standart) durum ekranına eklenmesi.

## [1.0.0] - 29 Mart 2026

### Added
- Botun temel modüler iskeletinin (`Command Handler`) kurulması.
- `.sticker`, `.format`, `.document`, `.transcribe`, `.downloader` çekirdek komutlarının üretimi.
- Çöp toplayıcı (`Garbage Collection`) ve Rate Limiting (Spam Kontrolü) entegrasyonu.
- ID Normalizasyonu (Grup ve DM çakışmalarını önleme).
- GitHub Repo entegrasyonu ve PM2 hazırlığı.
