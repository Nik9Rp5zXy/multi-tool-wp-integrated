# 🤖 Multi-Tool WhatsApp Bot

Prefix tabanlı (`.`) modüler WhatsApp botu. Medya işleme, PDF oluşturma, video indirme, yapay zeka destekli ses-metin dönüşümü ve moderasyon araçları içerir.

## ✨ Özellikler

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `.help` | Tüm komutları listeler | Herkes |
| `.sticker` | Resim/videoyu sticker'a çevirir | Herkes |
| `.format [png/jpg/webp]` | Resmi istenen formata dönüştürür | Herkes |
| `.document basla` / `.document bitir` | Fotoğrafları PDF'e birleştirir | Herkes |
| `.download [URL]` | YouTube/Instagram vb. video indirir | Admin |
| `.transcribe` | Ses kaydını metne döker (Whisper AI) | Admin |
| `.status` | Botun sistem durumunu gösterir | Herkes |
| `.ban` / `.unban` | Kullanıcıyı bottan yasaklar | Owner |
| `.mute` / `.unmute` | Kullanıcıyı susturur | Admin |
| `.addadmin` / `.removeadmin` | Yönetici atar/kaldırır | Owner |

## 🔐 Yetki Sistemi

- **Owner (Sahip):** `.env` dosyasındaki `OWNER_NUMBER` ile belirlenir. Tüm komutlara erişim hakkına sahiptir.
- **Admin:** `.env` dosyasında veya `.addadmin` komutuyla atanır. Mute ve ağır komutları (download, transcribe) kullanabilir.
- **Kullanıcı:** Temel komutları (sticker, format, document, help, status) kullanabilir.

## 🛠 Kurulum

### Gereksinimler

- **Node.js** v18+
- **FFmpeg** (sticker ve transcribe için)
- **yt-dlp** (video indirme için)
- **Chromium** (whatsapp-web.js için)

### Ubuntu Server Kurulumu

```bash
# 1. Repo'yu klonla
git clone https://github.com/Nik9Rp5zXy/multi-tool-wp-integrated.git
cd multi-tool-wp-integrated

# 2. Bağımlılıkları kur
npm install

# 3. Sistem bağımlılıkları
sudo apt update && sudo apt install -y ffmpeg python3
pip3 install yt-dlp  # veya: sudo apt install yt-dlp

# 4. Ortam değişkenlerini ayarla
cp .env.example .env
nano .env  # OWNER_NUMBER ve ADMIN_NUMBERS değerlerini gir

# 5. Botu başlat
node index.js
# veya PM2 ile:
pm2 start index.js --name wp-bot
pm2 save
```

### İlk Çalıştırma

Bot başladığında terminalde QR kodu çıkacaktır. WhatsApp > Bağlı Cihazlar > Cihaz Bağla > QR Kodu Tara ile bağlayın.

## 🆔 ID Linking Sistemi

WhatsApp, gruplarda `@lid` (Linked ID) ve özel mesajlarda `@c.us` (telefon numarası) formatlarını kullanır. Bu bot, her iki formatı da aynı kişiye eşleştiren 3 katmanlı bir çözümleme sistemi kullanır:

1. **In-Memory Cache** — Aynı oturumda tekrar çözümleme yapılmaz
2. **Kalıcı Alias Dosyası** — Bot yeniden başlatılsa bile eşlemeler korunur
3. **WhatsApp Contact API** — Gerçek telefon numarası otomatik çözümlenir

Bu sayede bir kullanıcı gruptan banlandığında, DM'den de banlı kalır (ve tersi).

## 📁 Proje Yapısı

```
├── index.js                    # Ana giriş noktası ve mesaj yönlendirici
├── package.json
├── .env.example                # Ortam değişkeni şablonu
├── .gitignore
├── CHANGELOG.md
├── README.md
└── src/
    ├── commands/
    │   ├── addadmin.js          # Admin atama/kaldırma
    │   ├── ban.js               # Ban/Unban
    │   ├── document.js          # PDF oluşturma
    │   ├── downloader.js        # Video indirme
    │   ├── format.js            # Resim format dönüşümü
    │   ├── help.js              # Yardım menüsü
    │   ├── mute.js              # Mute/Unmute
    │   ├── removeadmin.js       # → addadmin.js'e yönlendirir
    │   ├── status.js            # Sistem durumu
    │   ├── sticker.js           # Sticker oluşturma
    │   ├── transcribe.js        # Ses → Metin (Whisper AI)
    │   ├── unban.js             # → ban.js'e yönlendirir
    │   └── unmute.js            # → mute.js'e yönlendirir
    ├── data/
    │   ├── storage.json         # Ban/mute/admin verileri (otomatik oluşturulur)
    │   └── aliases.json         # ID eşleme tablosu (otomatik oluşturulur)
    └── utils/
        ├── auth.js              # Yetki kontrolleri
        ├── dataManager.js       # JSON veri yönetimi
        ├── garbageCollector.js   # Geçici dosya temizliği
        ├── idHelper.js          # ID çözümleme ve alias sistemi
        ├── parseTarget.js       # Hedef kullanıcı çözümleme (paylaşılan)
        └── rateLimiter.js       # Spam koruması
```

## 🔄 Güncelleme (Ubuntu Server)

```bash
cd multi-tool-wp-integrated
git pull origin main
npm install
pm2 restart wp-bot
```

## 📝 Lisans

ISC
