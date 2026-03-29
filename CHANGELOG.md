# Project Changelog

Botun gelişimi ve eklenen özelliklerin özeti:

## [1.5.0] - Mar 29, 2026
### Added
- **Owner (Sahip) / Admin Hiyerarşisi:** Bot kurucusu ve yöneticiler için ayrıştırılmış yetki sistemi.
- **Kalıcı Moderasyon Altyapısı:** `storage.json` ile verilerin sunucuda saklanması.
- **`.ban` / `.unban`:** Kullanıcıyı bottan tamamen yasaklama özellikleri.
- **`.mute` / `.unmute`:** Kullanıcının bottan komut atmasını susturma özellikleri.
- **`.addadmin` / `.removeadmin`:** Dinamik olarak yönetici atama.
- **Status Güncellemesi:** Yetki bilgisinin (Admin/Owner/Standart) durum ekranına eklenmesi.

## [1.0.0] - Mar 29, 2026
### Added
- Botun temel modüler iskeletinin (`Command Handler`) kurulması.
- `.sticker`, `.format`, `.document`, `.transcribe`, `.downloader` çekirdek komutlarının üretimi.
- Çöp toplayıcı (`Garbage Collection`) ve Rate Limiting (Spam Kontrolü) entegrasyonu.
- ID Normalizasyonu (Grup ve DM çakışmalarını önleme).
- GitHub Repo entegrasyonu ve PM2 hazırlığı.
