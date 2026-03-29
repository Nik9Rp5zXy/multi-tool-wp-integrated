const { loadData, saveData } = require('../utils/dataManager');
const { isOwner } = require('../utils/auth');
const { parseTargetId } = require('../utils/parseTarget');
const { updateEnvAdmins } = require('../utils/envManager');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        
        // Sadece Owner admin ekleyebilir/çıkarabilir
        if (!isOwner(senderId)) {
            return msg.reply('⛔ Admin yönetimi sadece KURUCU (Owner) tarafından yapılabilir.');
        }

        const targetId = await parseTargetId(args, msg);

        if (!targetId) {
            return msg.reply('Lütfen admin yapmak/çıkarmak istediğiniz kişiyi etiketleyin veya numarasını yazın (örn: 905510..).\nÖrn: `.addadmin @etiket` veya `.addadmin 905510395152`');
        }

        const command = msg.body.split(' ')[0].slice(1);
        const data = loadData();

        if (command === 'addadmin') {
            let addedToFile = updateEnvAdmins(targetId, 'add');
            
            if (data.admins.includes(targetId) && !addedToFile) {
                return msg.reply('Bu kullanıcı zaten yönetici listesinde.');
            }
            
            if (!data.admins.includes(targetId)) {
                data.admins.push(targetId);
                saveData(data);
            }
            
            return msg.reply(`🌟 *${targetId.split('@')[0]}* başarıyla Yönetici (Admin) olarak atandı ve .env dosyasına eklendi.`);
        } else if (command === 'removeadmin') {
            let removedFromFile = updateEnvAdmins(targetId, 'remove');
            
            if (!data.admins.includes(targetId) && !removedFromFile) {
                return msg.reply('Bu kullanıcı yönetici listesinde bulunamadı.');
            }
            
            if (data.admins.includes(targetId)) {
                data.admins = data.admins.filter(id => id !== targetId);
                saveData(data);
            }
            
            return msg.reply(`⚠️ *${targetId.split('@')[0]}* yöneticilik yetkisi geri alındı ve .env dosyasından silindi.`);
        }
    }
};
