const { isOwner, isAdmin } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        
        if (!isOwner(senderId) && !isAdmin(senderId)) {
            return msg.reply('kardeşim bunu sadece yetkililer kullanabilir');
        }

        await msg.reply('devam eden tüm işlemler (indirme, çeviri, medya) iptal ediliyor... bot kendini yeniliyor');
        
        console.log(`[İptal] ${senderId} tarafından iptal komutu verildi. Süreç sonlandırılıyor.`);
        
        // WhatsApp mesajının iletilmesi için kısa bir süre bekle ve süreci öldür
        // PMM2 otomatik olarak anında tekrar başlatacaktır.
        setTimeout(() => {
            process.exit(1);
        }, 1500);
    }
};
