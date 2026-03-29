const { loadData, saveData } = require('../utils/dataManager');
const { isOwner } = require('../utils/auth');
const { parseTargetId } = require('../utils/parseTarget');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        
        // Sadece Sahip (Owner) BAN yetkisine sahiptir
        if (!isOwner(senderId)) {
            return msg.reply('⛔ Bu komutu kullanmak için KURUCU (Owner) olmanız gerekmektedir.');
        }

        const targetId = await parseTargetId(args, msg);

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
            return msg.reply(`🚫 *${targetId.split('@')[0]}* başarıyla bottan yasaklandı.`);
        } else if (command === 'unban') {
            if (!data.banned.includes(targetId)) {
                return msg.reply('Bu kullanıcı yasaklı listesinde bulunamadı.');
            }
            data.banned = data.banned.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(`✅ *${targetId.split('@')[0]}* üzerindeki bot yasağı kaldırıldı.`);
        }
    }
};
