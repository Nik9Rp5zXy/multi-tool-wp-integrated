const { loadData, saveData } = require('../utils/dataManager');
const { isOwner, getNormalizedId } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = require('../utils/idHelper').getNormalizedId(msg);
        
        // Sadece Sahip (Owner) BAN yetkisine sahiptir
        if (!require('../utils/auth').isOwner(senderId)) {
            return msg.reply('⛔ Bu komutu kullanmak için KURUCU (Owner) olmanız gerekmektedir.');
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
            return msg.reply('Lütfen banlamak istediğiniz kişiyi etiketleyin, mesajına yanıt verin veya numarasını yazın.\nÖrn: `.ban @etiket` veya `.unban numara`');
        }

        // Kendi kendini banlamayı önle
        if (targetId === senderId) {
            return msg.reply('Kendini banlayamazsın!');
        }

        const command = msg.body.split(' ')[0].slice(1); // ban or unban
        const data = loadData();

        if (command === 'ban') {
            if (data.banned.includes(targetId)) {
                return msg.reply('Bu kullanıcı zaten yasaklı listesinde.');
            }
            data.banned.push(targetId);
            saveData(data);
            return msg.reply(`🚫 *${targetId}* başarıyla bottan yasaklandı.`);
        } else if (command === 'unban') {
            if (!data.banned.includes(targetId)) {
                return msg.reply('Bu kullanıcı yasaklı listesinde bulunamadı.');
            }
            data.banned = data.banned.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(`✅ *${targetId}* üzerindeki bot yasağı kaldırıldı.`);
        }
    }
};
