const { isOwner, isAdmin } = require('../utils/auth');
const { isSafeMode } = require('../utils/dataManager');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        const userIsOwner = isOwner(senderId);
        const userIsAdmin = isAdmin(senderId);
        const safeMode = isSafeMode();

        // Rol
        let rolLine = '';
        if (userIsOwner) rolLine = 'kurucu paneli\n\n';
        else if (userIsAdmin) rolLine = 'admin paneli\n\n';
        else rolLine = '\n';

        let text = `multi-tool bot v3.0\n${rolLine}`;

        // ── ARAÇLAR ──────────────────────────────────────
        text += `--- araçlar ---\n\n`;
        text += `.qr [metin/url] — qr kod\n`;
        text += `.kur [para] — döviz & kripto kuru\n`;
        text += `.hava [şehir] — hava durumu\n`;
        text += `.kisalt [url] — url kısalt\n`;
        text += `.sozluk [kelime] — tdk sözlük\n`;
        text += `.hesapla [işlem] — hesap makinesi\n`;
        text += `.hash [işlem] [metin] — hash/base64\n`;
        text += `.renk [hex/isim] — renk bilgi kartı\n`;
        text += `.ocr — resimdeki yazıyı oku\n`;
        text += `.takvim — tarih araçları\n\n`;

        // ── MEDYA ─────────────────────────────────────────
        text += `--- medya ---\n\n`;
        text += `.sticker — resim/videoyu çıkartmaya çevir\n`;
        text += `.format [uzantı] — medya dönüştür\n`;
        text += `.document basla/bitir — fotoğrafları pdf yap\n\n`;

        // ── ARAŞTIRMA ─────────────────────────────────────
        text += `--- araştırma ---\n\n`;
        text += `.pdf [arama] — pdf/kitap bul\n`;
        text += `.ss [url] — ekran görüntüsü (akıllı url deneme)\n`;
        text += `.ceviri [dil] [metin] — çeviri (en/de/fr...)\n\n`;

        // ── YETİŞKİN (safe mod kapalıysa) ─────────────────
        if (!safeMode) {
            text += `--- yetişkin ---\n\n`;
            text += `.adult [url] — video indir\n`;
            text += `.adult bilgi [url] — video bilgi kartı\n`;
            text += `.adult ses [url] — sadece ses (mp3)\n`;
            text += `.adult ara [arama] — video ara\n`;
            text += `.adult ara [sayfa] [arama] — belirli sayfadan ara\n\n`;
        }

        // ── ADMİN ─────────────────────────────────────────
        if (userIsAdmin) {
            text += `--- admin ---\n\n`;
            text += `.whois [domain/ip] — dns + ip sorgu\n`;
            text += `.ping [url] — erişim testi\n`;
            text += `.download [url] — video indir\n`;
            text += `.transcribe — ses metne çevir\n`;
            text += `.mute [@kişi] — kullanıcı sustur\n`;
            text += `.unmute [@kişi] — susturmayı kaldır\n`;
            text += `.mute liste — susturulmuşları gör\n\n`;
        }

        // ── OWNER ─────────────────────────────────────────
        if (userIsOwner) {
            text += `--- kurucu ---\n\n`;
            text += `.ownermode [ac/kapat] — botu kilitle\n`;
            text += `.safemod [ac/kapat] — adult komutları gizle${safeMode ? ' (şu an AÇIK)' : ''}\n`;
            text += `.ayar — bot ayarları\n`;
            text += `.ayar [anahtar] [değer] — ayar değiştir\n`;
            text += `.restart — botu yeniden başlat\n`;
            text += `.ban [@kişi] — kullanıcı yasakla\n`;
            text += `.unban [@kişi] — yasak kaldır\n`;
            text += `.ban liste — yasaklıları gör\n`;
            text += `.addadmin [@kişi] — admin ata\n`;
            text += `.removeadmin [@kişi] — admin kaldır\n`;
            text += `.addadmin liste — adminleri gör\n\n`;
        }

        // ── GENEL ─────────────────────────────────────────
        text += `--- genel ---\n\n`;
        text += `.status — bot durumu\n`;
        text += `.help — bu menü\n`;

        if (safeMode && !userIsOwner) {
            text += `\n[safe mod açık - yetişkin içerik erişilemez]`;
        }

        return msg.reply(text);
    }
};
