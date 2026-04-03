const { isOwner } = require('../utils/auth');
const { isOwnerMode, setOwnerMode } = require('../utils/dataManager');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);

        if (!isOwner(senderId)) {
            return msg.reply('⛔ Bu komutu sadece *KURUCU (Owner)* kullanabilir.');
        }

        const subCmd = args[0] ? args[0].toLowerCase() : '';
        const current = isOwnerMode();

        // Durum kontrolü
        if (!subCmd || subCmd === 'durum' || subCmd === 'status') {
            return msg.reply(
                `🔒 *Owner Modu*\n\n` +
                `Durum: ${current ? '✅ AKTİF — Sadece kurucu kullanabilir' : '🔓 Kapalı — Herkes kullanabilir'}\n\n` +
                `*Kullanım:*\n` +
                `• \`.ownermode ac\` — Modu aç\n` +
                `• \`.ownermode kapat\` — Modu kapat\n` +
                `• \`.ownermode\` — Mevcut durumu göster`
            );
        }

        if (['ac', 'aç', 'on', 'aktif', '1', 'true'].includes(subCmd)) {
            if (current) return msg.reply('ℹ️ Owner modu zaten aktif.');
            setOwnerMode(true);
            return msg.reply(
                '🔒 *Owner Modu AKTİF*\n\n' +
                'Bot artık sadece kurucu tarafından kullanılabilir.\n' +
                'Diğer tüm kullanıcılar kilitli mesajı görecek.\n\n' +
                '↩️ Kapatmak için: `.ownermode kapat`'
            );
        }

        if (['kapat', 'off', 'kapa', '0', 'false', 'pasif'].includes(subCmd)) {
            if (!current) return msg.reply('ℹ️ Owner modu zaten kapalı.');
            setOwnerMode(false);
            return msg.reply(
                '🔓 *Owner Modu KAPANDI*\n\n' +
                'Bot normal kullanıma açık. Tüm kullanıcılar komut gönderebilir.'
            );
        }

        msg.reply('❓ Bilinmeyen parametre.\nKullanım: `.ownermode ac` veya `.ownermode kapat`');
    }
};
