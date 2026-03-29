const { loadData, saveData } = require('../utils/dataManager');
const { isOwner } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = require('../utils/idHelper').getNormalizedId(msg);
        
        // Sadece Owner admin ekleyebilir/çıkarabilir
        if (!isOwner(senderId)) {
            return msg.reply('⛔ Admin yönetimi sadece KURUCU (Owner) tarafından yapılabilir.');
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
            return msg.reply('Lütfen admin yapmak/çıkarmak istediğiniz kişiyi etiketleyin.\nÖrn: `.addadmin @etiket` veya `.removeadmin @etiket`');
        }

        const command = msg.body.split(' ')[0].slice(1);
        const data = loadData();

        if (command === 'addadmin') {
            if (data.admins.includes(targetId)) {
                return msg.reply('Bu kullanıcı zaten yönetici listesinde.');
            }
            data.admins.push(targetId);
            saveData(data);
            return msg.reply(`🌟 *${targetId}* başarıyla Yönetici (Admin) olarak atandı.`);
        } else if (command === 'removeadmin') {
            if (!data.admins.includes(targetId)) {
                return msg.reply('Bu kullanıcı yönetici listesinde bulunamadı.');
            }
            data.admins = data.admins.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(`⚠️ *${targetId}* yöneticilik yetkisi geri alındı.`);
        }
    }
};
