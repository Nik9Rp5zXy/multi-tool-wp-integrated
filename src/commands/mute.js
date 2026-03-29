const { loadData, saveData } = require('../utils/dataManager');
const { isAdmin, getNormalizedId } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = require('../utils/idHelper').getNormalizedId(msg);
        
        // Admins and Owner can MUTE
        if (!require('../utils/auth').isAdmin(senderId)) {
            return msg.reply('⛔ Bu komutu kullanmak için YÖNETİCİ (Admin/Owner) yetkisine sahip olmanız gerekmektedir.');
        }

        let targetId = "";
        if (msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            targetId = require('../utils/idHelper').getNormalizedId(quoted);
        } else if (msg.mentionedIds && msg.mentionedIds.length > 0) {
            targetId = msg.mentionedIds[0];
        } else if (args[0]) {
            targetId = args[0].includes('@c.us') ? args[0] : `${args[0]}@c.us`;
        }

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
            return msg.reply(`🔇 *${targetId}* susturuldu. Artık bota komut gönderemeyecek.`);
        } else if (command === 'unmute') {
            if (!data.muted.includes(targetId)) {
                return msg.reply('Bu kullanıcı susturulmuşlar listesinde bulunamadı.');
            }
            data.muted = data.muted.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(`🔊 *${targetId}* konuşma yasağı kaldırıldı.`);
        }
    }
};
