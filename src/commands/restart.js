const { isOwner, isAdmin } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);

        if (!isOwner(senderId) && !isAdmin(senderId)) {
            return msg.reply('bu komutu sadece admin veya kurucu kullanabilir');
        }

        await msg.reply('yeniden başlatılıyor... birkaç saniye içinde geri dönerim');

        // PM2 process'i yeniden başlatır (exit 0 = graceful)
        setTimeout(() => {
            process.exit(0);
        }, 1500);
    }
};
