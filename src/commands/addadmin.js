const { loadData, saveData } = require('../utils/dataManager');
const { isOwner } = require('../utils/auth');
const { parseTargetId } = require('../utils/parseTarget');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        
        // Sadece Owner admin ekleyebilir/çıkarabilir
        if (!isOwner(senderId)) {
            return msg.reply('⛔ Admin yönetimi sadece KURUCU (Owner) tarafından yapılabilir.');
        }

        const targetId = await parseTargetId(args, msg);

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
            return msg.reply(`🌟 *${targetId.split('@')[0]}* başarıyla Yönetici (Admin) olarak atandı.`);
        } else if (command === 'removeadmin') {
            if (!data.admins.includes(targetId)) {
                return msg.reply('Bu kullanıcı yönetici listesinde bulunamadı.');
            }
            data.admins = data.admins.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(`⚠️ *${targetId.split('@')[0]}* yöneticilik yetkisi geri alındı.`);
        }
    }
};
