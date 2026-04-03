# 🤖 Multi-Tool WhatsApp Bot v3.0

Prefix tabanlı (`.`) modüler WhatsApp botu. Medya işleme, PDF oluşturma, video indirme, yapay zeka destekli ses-metin dönüşümü, QR kod üretici, döviz kuru, hava durumu, OCR, TDK sözlük ve 20+ araç. **Hiçbir API key gerektirmez.**

## ✨ Özellikler

### 🛠️ Araçlar

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `.qr [metin/URL]` | QR kod oluşturucu (WiFi, vCard, URL) | Herkes |
| `.kur [para]` | Anlık döviz & kripto kuru + çevirici | Herkes |
| `.hava [şehir]` | Hava durumu + 3 günlük tahmin | Herkes |
| `.kisalt [URL]` | URL kısaltıcı (TinyURL) | Herkes |
| `.sozluk [kelime]` | TDK sözlük sorgulama (anlam, köken, atasözü) | Herkes |
| `.hesapla [ifade]` | Gelişmiş hesap makinesi + birim dönüştürme | Herkes |
| `.hash [işlem] [metin]` | MD5/SHA hash, Base64, şifre üretici | Herkes |
| `.renk [hex/isim]` | Renk önizleme kartı (HEX/RGB/HSL) | Herkes |
| `.ocr` | Resimdeki yazıyı AI ile okuma (TR+EN) | Herkes |
| `.takvim` | Tarih araçları, hicri, geri sayım, epoch | Herkes |

### 📡 Ağ Araçları

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `.whois [domain/IP]` | DNS kayıtları + IP geolokasyon | Admin |
| `.ping [URL]` | Sunucu yanıt süresi + SSL durumu | Admin |

### 🎬 Medya İşleme

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `.sticker` | Resim/videoyu sticker'a çevirir | Herkes |
| `.format [uzantı]` | Mega Converter (ses/video/resim arası dönüşüm) | Herkes |
| `.document basla/bitir` | Fotoğrafları PDF'e birleştirir | Herkes |
| `.download [URL]` | YouTube/Instagram vb. video indirir | Admin |
| `.transcribe [mod]` | Ses kaydını metne döker (Whisper AI) | Admin |

### 🔍 Araştırma

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `.pdf [arama]` | PDF döküman/kitap avcısı | Herkes |
| `.ss [URL]` | Proxy ile site ekran görüntüsü | Herkes |
| `.ceviri [metin]` | Otomatik dil algılamalı çeviri | Herkes |

### ⚙️ Moderasyon & Sistem

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `.help` | Tüm komutları listeler | Herkes |
| `.status` | Bot sistem durumunu gösterir | Herkes |
| `.ban` / `.unban` | Kullanıcıyı yasaklar | Owner |
| `.mute` / `.unmute` | Kullanıcıyı susturur | Admin |
| `.addadmin` / `.removeadmin` | Yönetici atar/kaldırır | Owner |

## 🔐 Yetki Sistemi

- **Owner (Sahip):** `.env` dosyasındaki `OWNER_NUMBER` ile belirlenir. Tüm komutlara erişim.
- **Admin:** `.env` dosyasında veya `.addadmin` ile atanır. Ağır komutları kullanabilir.
- **Kullanıcı:** Temel araç ve medya komutlarını kullanabilir.

## 🛠 Kurulum

### Gereksinimler

- **Node.js** v18+
- **FFmpeg** (sticker, format ve transcribe için)
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
    │   ├── ceviri.js            # Çeviri
    │   ├── document.js          # PDF oluşturma
    │   ├── download.js          # Video indirme
    │   ├── format.js            # Mega format dönüştürücü
    │   ├── hash.js              # Hash & şifreleme araçları
    │   ├── hava.js              # Hava durumu
    │   ├── help.js              # Yardım menüsü
    │   ├── hesapla.js           # Gelişmiş hesap makinesi
    │   ├── kisalt.js            # URL kısaltıcı
    │   ├── kur.js               # Döviz & kripto kurları
    │   ├── mute.js              # Mute/Unmute
    │   ├── ocr.js               # Resimdeki yazıyı okuma
    │   ├── pdf.js               # PDF avcısı
    │   ├── ping.js              # Sunucu erişilebilirlik testi
    │   ├── qr.js                # QR kod oluşturucu
    │   ├── removeadmin.js       # → addadmin.js'e yönlendirir
    │   ├── renk.js              # Renk bilgi kartı
    │   ├── sozluk.js            # TDK sözlük
    │   ├── ss.js                # Ekran görüntüsü
    │   ├── status.js            # Sistem durumu
    │   ├── sticker.js           # Sticker oluşturma
    │   ├── takvim.js            # Tarih araçları
    │   ├── transcribe.js        # Ses → Metin (Whisper AI)
    │   ├── unban.js             # → ban.js'e yönlendirir
    │   ├── unmute.js            # → mute.js'e yönlendirir
    │   └── whois.js             # Domain/IP sorgulama
    ├── data/
    │   ├── storage.json         # Ban/mute/admin verileri (otomatik)
    │   └── aliases.json         # ID eşleme tablosu (otomatik)
    └── utils/
        ├── auth.js              # Yetki kontrolleri
        ├── dataManager.js       # JSON veri yönetimi
        ├── envManager.js        # Ortam değişkeni yönetimi
        ├── garbageCollector.js   # Geçici dosya temizliği
        ├── idHelper.js          # ID çözümleme ve alias sistemi
        ├── parseTarget.js       # Hedef kullanıcı çözümleme
        └── rateLimiter.js       # Spam koruması
```

## 🔄 Güncelleme (Ubuntu Server)

```bash
cd multi-tool-wp-integrated
git pull origin main
npm install
pm2 restart wp-bot
```

## 📦 Kullanılan Teknolojiler

- **whatsapp-web.js** — WhatsApp Web istemcisi
- **sharp** — Resim işleme (format, renk kartı)
- **fluent-ffmpeg** — Ses/video dönüştürme
- **tesseract.js** — OCR (resimden yazı okuma)
- **mathjs** — Gelişmiş matematik hesaplama
- **qrcode** — QR kod üretimi
- **pdfkit** — PDF oluşturma
- **whisper-node** — AI ses tanıma
- **axios** — HTTP istekleri
- **cheerio** — Web scraping

## 🌐 Kullanılan Ücretsiz API'ler (Key Gerekmez)

| Servis | Kullanım |
|--------|----------|
| [wttr.in](https://wttr.in) | Hava durumu |
| [TDK API](https://sozluk.gov.tr) | Sözlük |
| [fawazahmed0/currency-api](https://github.com/fawazahmed0/exchange-api) | Döviz kurları |
| [CoinGecko](https://www.coingecko.com/api) | Kripto kurları |
| [TinyURL](https://tinyurl.com) | URL kısaltma |
| [ip-api.com](http://ip-api.com) | IP geolokasyon |
| [thum.io](https://www.thum.io) | Site ekran görüntüsü |

## 📝 Lisans

ISC
