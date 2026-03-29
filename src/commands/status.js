const os = require('os');
const { getNormalizedId } = require('../utils/idHelper');
const { isAuthorized } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
        const freeMem = Math.round(os.freemem() / 1024 / 1024);
        const totalMem = Math.round(os.totalmem() / 1024 / 1024);
        
        let uptimeStr = "";
        const uptimeSeconds = Math.round(process.uptime());
        if (uptimeSeconds < 60) uptimeStr = `${uptimeSeconds} saniye`;
        else uptimeStr = `${Math.floor(uptimeSeconds / 60)} dakika`;

        let statusMsg = `📊 *Bot Sistem Durumu*\n\n`;
        statusMsg += `⏳ *Açık Kalma Süresi:* ${uptimeStr}\n`;
        statusMsg += `🧠 *Bot RAM Tüketimi:* ${memMb} MB\n`;
        statusMsg += `🖥 *Sunucu Boş RAM:* ${freeMem} MB / ${totalMem} MB\n`;

        const senderId = getNormalizedId(msg);
        if (isAuthorized(senderId)) {
            statusMsg += `\n🛡 *Yetki:* Admin hesabı (Ses ve Video yetkisi açık)`;
        } else {
            statusMsg += `\n👤 *Yetki:* Standart Kullanıcı`;
        }

        return msg.reply(statusMsg);
    }
};
