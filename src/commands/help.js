const { isOwner, isAdmin } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        const userIsOwner = isOwner(senderId);
        const userIsAdmin = isAdmin(senderId); // admin check includes owner

        // ── Herkes görebilir ─────────────────────────────────────────────
        let text = `*🤖 WhatsApp Multi-Tool Bot v3.0*\n\n`;

        // Rol badge
        if (userIsOwner) text += `👑 *Kurucu Paneli* — Tüm komutlar aktif\n\n`;
        else if (userIsAdmin) text += `🌟 *Admin Paneli* — Genişletilmiş yetkiler\n\n`;
        else text += `👋 *Kullanıcı Paneli*\n\n`;

        // ━━━ ARAÇLAR (herkes) ━━━
        text += `━━━ 🛠️ *ARAÇLAR* ━━━\n\n`;
        text += `*.qr [metin/URL]* — QR kod oluştur\n`;
        text += `*.kur [para]* — Döviz & kripto kuru\n`;
        text += `*.hava [şehir]* — Hava durumu + tahmin\n`;
        text += `*.kisalt [URL]* — URL kısalt\n`;
        text += `*.sozluk [kelime]* — TDK sözlük\n`;
        text += `*.hesapla [ifade]* — Hesap makinesi\n`;
        text += `*.hash [işlem] [metin]* — Hash/Base64/şifre\n`;
        text += `*.renk [hex/isim]* — Renk bilgi kartı\n`;
        text += `*.ocr* — Resimdeki yazıyı oku\n`;
        text += `*.takvim* — Tarih araçları\n\n`;

        // ━━━ MEDYA (herkes) ━━━
        text += `━━━ 🎬 *MEDYA* ━━━\n\n`;
        text += `*.sticker* — Resim/videoyu çıkartmaya çevir\n`;
        text += `*.format [uzantı]* — Medya dönüştürücü\n`;
        text += `*.document basla/bitir* — Fotoğrafları PDF yap\n\n`;

        // ━━━ ARAŞTIRMA (herkes) ━━━
        text += `━━━ 🔍 *ARAŞTIRMA* ━━━\n\n`;
        text += `*.pdf [arama]* — PDF/kitap avcısı\n`;
        text += `*.ss [URL]* — Akıllı ekran görüntüsü\n`;
        text += `*.ceviri [dil] [metin]* — Çeviri (en/de/fr...)\n\n`;

        // ━━━ YETİŞKİN (herkes) ━━━
        text += `━━━ 🔞 *YETİŞKİN* ━━━\n\n`;
        text += `*.adult [URL]* — Video indir (720p)\n`;
        text += `*.adult 480/1080 [URL]* — Kalite seçerek indir\n`;
        text += `*.adult bilgi [URL]* — Video bilgi kartı\n`;
        text += `*.adult ses [URL]* — MP3 olarak indir\n`;
        text += `*.adult ara [arama]* — Video arama\n\n`;

        // ━━━ ADMİN (sadece admin ve owner) ━━━
        if (userIsAdmin) {
            text += `━━━ 📡 *ADMİN ARAÇLARI* ━━━\n\n`;
            text += `*.whois [domain/IP]* — DNS + IP sorgu\n`;
            text += `*.ping [URL]* — Sunucu erişim testi\n`;
            text += `*.download [URL]* — Video indirici\n`;
            text += `*.transcribe [mod]* — Ses → Metin (AI)\n`;
            text += `*.mute [@kişi]* — Kullanıcı sustur\n`;
            text += `*.unmute [@kişi]* — Susturmayı kaldır\n`;
            text += `*.mute liste* — Susturulmuşları göster\n\n`;
        }

        // ━━━ OWNER (sadece owner) ━━━
        if (userIsOwner) {
            text += `━━━ 👑 *KURUCU PANELİ* ━━━\n\n`;
            text += `*.ownermode [ac/kapat]* — Botu kilitle\n`;
            text += `*.ayar* — Bot ayarları (rateLimit, prefix...)\n`;
            text += `*.ayar [anahtar] [değer]* — Ayar değiştir\n`;
            text += `*.ayar sifirla hepsi* — Ayarları sıfırla\n`;
            text += `*.ban [@kişi]* — Kullanıcı yasakla\n`;
            text += `*.unban [@kişi]* — Yasak kaldır\n`;
            text += `*.ban liste* — Yasaklıları göster\n`;
            text += `*.addadmin [@kişi]* — Admin ata\n`;
            text += `*.removeadmin [@kişi]* — Admin kaldır\n`;
            text += `*.addadmin liste* — Adminleri göster\n`;
            text += `*.addadmin bilgi [@kişi]* — Yetki bilgisi\n\n`;
        }

        // ━━━ GENEL ━━━
        text += `━━━ ⚙️ *GENEL* ━━━\n\n`;
        text += `*.status* — Bot durumu\n`;
        text += `*.help* — Bu menü\n`;

        // Alt bilgi
        if (!userIsAdmin) {
            text += `\n_💡 Bazı komutlar Admin/Owner yetkisi gerektirir._`;
        }

        return msg.reply(text);
    }
};
