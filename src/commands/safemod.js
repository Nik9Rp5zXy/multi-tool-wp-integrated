const { isOwner, isAdmin } = require('../utils/auth');
const { isSafeMode, setSafeMode } = require('../utils/dataManager');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);

        if (!isOwner(senderId) && !isAdmin(senderId)) {
            return msg.reply('bu komutu sadece admin veya kurucu kullanabilir');
        }

        const sub = args[0] ? args[0].toLowerCase() : '';
        const current = isSafeMode();

        if (!sub || sub === 'durum') {
            return msg.reply(
                `safe mode durumu: ${current ? 'AÇIK' : 'KAPALI'}\n\n` +
                `açmak: .safemod ac\n` +
                `kapatmak: .safemod kapat\n\n` +
                (current
                    ? 'adult komutları şu an gizli ve bloklu'
                    : 'adult komutları şu an erişilebilir')
            );
        }

        if (['ac', 'aç', 'on', '1'].includes(sub)) {
            if (current) return msg.reply('safe mode zaten açık');
            setSafeMode(true);
            return msg.reply(
                'safe mode açıldı\n\n' +
                'adult komutları artık bloklu ve help menüsünden gizlendi\n' +
                'kapatmak için: .safemod kapat'
            );
        }

        if (['kapat', 'off', '0'].includes(sub)) {
            if (!current) return msg.reply('safe mode zaten kapalı');
            setSafeMode(false);
            return msg.reply(
                'safe mode kapatıldı\n\n' +
                'adult komutları tekrar erişilebilir'
            );
        }

        msg.reply('bilmediğim parametre. .safemod ac veya .safemod kapat yaz');
    }
};
