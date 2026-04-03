const os = require('os');
const { isOwner, isAdmin } = require('../utils/auth');
const { isOwnerMode, getConfig } = require('../utils/dataManager');

module.exports = {
    execute: async (client, msg, args) => {
        const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
        const freeMem = Math.round(os.freemem() / 1024 / 1024);
        const totalMem = Math.round(os.totalmem() / 1024 / 1024);

        const uptimeSeconds = Math.round(process.uptime());
        let uptimeStr;
        if (uptimeSeconds < 60) uptimeStr = `${uptimeSeconds} saniye`;
        else if (uptimeSeconds < 3600) uptimeStr = `${Math.floor(uptimeSeconds / 60)} dk ${uptimeSeconds % 60} sn`;
        else uptimeStr = `${Math.floor(uptimeSeconds / 3600)} saat ${Math.floor((uptimeSeconds % 3600) / 60)} dk`;

        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);

        let role, roleIcon;
        if (isOwner(senderId)) {
            role = 'Kurucu (Owner)';
            roleIcon = '👑';
        } else if (isAdmin(senderId)) {
            role = 'Yönetici (Admin)';
            roleIcon = '🌟';
        } else {
            role = 'Standart Kullanıcı';
            roleIcon = '👤';
        }

        let statusMsg = `📊 *Bot Sistem Durumu*\n\n`;
        statusMsg += `⏳ *Uptime:* ${uptimeStr}\n`;
        statusMsg += `🧠 *Bot RAM:* ${memMb} MB\n`;
        statusMsg += `🖥 *Sunucu RAM:* ${freeMem} MB / ${totalMem} MB\n`;
        statusMsg += `🔧 *Node.js:* ${process.version}\n`;
        statusMsg += `💻 *OS:* ${os.type()} ${os.release()}\n`;
        statusMsg += `\n${roleIcon} *Yetki:* ${role}\n`;

        // Owner'a ek bilgiler
        if (isOwner(senderId)) {
            const ownerMode = isOwnerMode();
            const rateLimit = getConfig('rateLimit');
            const prefix = getConfig('prefix');
            statusMsg += `\n━━━ ⚙️ *Aktif Ayarlar* ━━━\n`;
            statusMsg += `🔒 Owner Modu: ${ownerMode ? '✅ Aktif' : '🔓 Kapalı'}\n`;
            statusMsg += `⏱️ Rate Limit: ${rateLimit} istek/dk\n`;
            statusMsg += `📌 Prefix: \`${prefix}\`\n`;
        }

        return msg.reply(statusMsg);
    }
};
