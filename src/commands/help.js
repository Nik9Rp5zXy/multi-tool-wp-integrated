module.exports = {
    execute: async (client, msg, args) => {
        const helpText = `*🤖 WhatsApp Multi-Tool Bot v3.0*\n\n` +

            `━━━ 🛠️ *ARAÇLAR* ━━━\n\n` +

            `👉 *.qr [metin/URL]*\nMetin veya URL'den anında QR kod resmi üretir. WiFi QR kodu dahil.\n\n` +

            `👉 *.kur [para birimi]*\nAnlık döviz ve kripto (BTC/ETH) kurlarını gösterir. Çevirici: \`.kur 100 usd\`\n\n` +

            `👉 *.hava [şehir]*\nHava durumu + 3 günlük tahmin. Sıcaklık, nem, rüzgar, UV indeksi.\n\n` +

            `👉 *.kisalt [URL]*\nUzun linki kısa TinyURL linkine dönüştürür.\n\n` +

            `👉 *.sozluk [kelime]*\nTDK resmi sözlüğünde kelime arar. Anlam, köken, örnek cümle.\n\n` +

            `👉 *.hesapla [ifade]*\nGelişmiş hesap makinesi. Yüzde, üslü, trigonometri, birim dönüştürme.\n_Örn: .hesapla 100 cm to inch_\n\n` +

            `👉 *.hash [işlem] [metin]*\nMD5/SHA256 hash, Base64 encode/decode, güvenli şifre üretici.\n_Örn: .hash sifre 24_\n\n` +

            `👉 *.renk [hex/isim]*\nRenk önizleme kartı oluşturur. HEX, RGB, HSL bilgisi + zıt renk.\n_Örn: .renk #FF5733 veya .renk kırmızı_\n\n` +

            `👉 *.ocr*\nResme yanıt vererek fotoğraftaki metni AI ile okur/çıkarır. TR+EN.\n\n` +

            `👉 *.takvim*\nTarih araçları: bugün bilgisi, hicri, geri sayım, epoch çözümleme.\n_Örn: .takvim fark 01.01.2027_\n\n` +

            `━━━ 📡 *AĞAÇLAR (Admin)* ━━━\n\n` +

            `👉 *.whois [domain/IP]*\nDomain DNS kayıtları + IP lokasyon bilgisi sorgulama. (Admin)\n\n` +

            `👉 *.ping [URL]*\nSunucu yanıt süresi, SSL durumu, HTTP bilgileri. (Admin)\n\n` +

            `━━━ 🎬 *MEDYA* ━━━\n\n` +

            `👉 *.format [uzantı]*\nMedyayı istenen formata çevirir (Mega Converter).\n_Örn: .format mp3 (Videoyu şarkıya çevir) 🔥_\n\n` +

            `👉 *.sticker*\nResim/videoyu çıkartmaya çevirir.\n\n` +

            `👉 *.document basla / bitir*\nFotoğrafları tek bir PDF dosyasında birleştirir.\n\n` +

            `👉 *.download [URL]*\nYouTube, Instagram vb. videoları indirir. (Admin)\n\n` +

            `👉 *.transcribe [hizli/detayli]*\nSes kaydını yapay zeka ile metne döker. (Admin)\n\n` +

            `━━━ 🔍 *ARAŞTIRMA* ━━━\n\n` +

            `👉 *.pdf [arama]*\nPDF döküman/kitap avcısı. İnternetten kazıyarak bulur.\n\n` +

            `👉 *.ss [URL]*\nGizli proxy ile hedef sitenin ekran görüntüsünü çeker.\n\n` +

            `👉 *.ceviri [metin]*\nOtomatik dil algılamalı Türkçe'ye çeviri.\n\n` +

            `━━━ ⚙️ *SİSTEM* ━━━\n\n` +

            `👉 *.status* — Bot sistem durumu\n` +
            `👉 *.ban / .unban* — Kullanıcı yasaklama (Owner)\n` +
            `👉 *.mute / .unmute* — Kullanıcı susturma (Admin)\n` +
            `👉 *.addadmin / .removeadmin* — Yönetici yönetimi (Owner)`;

        return msg.reply(helpText);
    }
};
