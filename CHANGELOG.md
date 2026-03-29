# Changelog

Botun gelişimi ve eklenen özelliklerin özeti:

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
