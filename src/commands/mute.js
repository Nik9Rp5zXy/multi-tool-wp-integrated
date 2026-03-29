const { loadData, saveData } = require('../utils/dataManager');
const { isAdmin } = require('../utils/auth');
const { parseTargetId } = require('../utils/parseTarget');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        
        // Admins and Owner can MUTE
        if (!isAdmin(senderId)) {
            return msg.reply('⛔ Bu komutu kullanmak için YÖNETİCİ (Admin/Owner) yetkisine sahip olmanız gerekmektedir.');
        }

        const targetId = await parseTargetId(args, msg);

        if (!targetId) {
            return msg.reply('Lütfen susturmak istediğiniz kişiyi etiketleyin veya mesajına yanıt verin.\nÖrn: `.mute @etiket` veya `.unmute @etiket`');
        }

        const command = msg.body.split(' ')[0].slice(1); // mute or unmute
        const data = loadData();

        if (command === 'mute') {
            if (data.muted.includes(targetId)) {
                return msg.reply('Bu kullanıcı zaten susturulmuş.');
            }
            data.muted.push(targetId);
            saveData(data);
            return msg.reply(`🔇 *${targetId.split('@')[0]}* susturuldu. Artık bota komut gönderemeyecek.`);
        } else if (command === 'unmute') {
            if (!data.muted.includes(targetId)) {
                return msg.reply('Bu kullanıcı susturulmuşlar listesinde bulunamadı.');
            }
            data.muted = data.muted.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(`🔊 *${targetId.split('@')[0]}* konuşma yasağı kaldırıldı.`);
        }
    }
};
