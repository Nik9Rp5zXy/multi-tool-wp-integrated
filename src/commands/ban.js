const { loadData, saveData } = require('../utils/dataManager');
const { isOwner, isAdmin } = require('../utils/auth');
const { parseTargetId } = require('../utils/parseTarget');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        const command = msg.body.split(' ')[0].slice(1).toLowerCase(); // ban / unban

        // ── Yetki ─────────────────────────────────────────────────────────
        if (!isOwner(senderId)) {
            return msg.reply('⛔ *Yetersiz Yetki*\n\nBan/Unban komutu sadece *KURUCU (Owner)* tarafından kullanılabilir.');
        }

        // ── Liste modu: .ban liste ─────────────────────────────────────────
        if (args[0] && args[0].toLowerCase() === 'liste') {
            const data = loadData();
            if (data.banned.length === 0) {
                return msg.reply('📋 *Yasaklı Listesi*\n\nHenüz yasaklı kullanıcı yok.');
            }
            let text = `📋 *Yasaklı Listesi (${data.banned.length} kişi)*\n\n`;
            data.banned.forEach((id, i) => {
                text += `${i + 1}. \`${id.replace('@c.us', '')}...\`\n`;
            });
            return msg.reply(text);
        }

        // ── Hedef çözümleme ───────────────────────────────────────────────
        const targetId = await parseTargetId(args, msg);

        if (!targetId) {
            return msg.reply(
                `🚫 *${command === 'ban' ? 'Ban' : 'Unban'} Komutu*\n\n` +
                `*Kullanım:*\n` +
                `• \`.ban @etiket\` — Etiketlenen kişiyi banla\n` +
                `• \`.ban\` (mesaja yanıt ver) — O kişiyi banla\n` +
                `• \`.ban 905xxxxxxxxx\` — Numarayla banla\n` +
                `• \`.ban liste\` — Tüm yasaklıları listele\n\n` +
                `*Unban:*\n` +
                `• \`.unban @etiket\` veya numarayla aynı şekilde`
            );
        }

        // Owner ve adminleri koruma
        if (targetId === senderId) {
            return msg.reply('⛔ Kendini banlayamazsın!');
        }
        if (isOwner(targetId)) {
            return msg.reply('⛔ Kurucuyu banlayamazsın!');
        }
        if (isAdmin(targetId) && command === 'ban') {
            return msg.reply('⛔ Aktif bir Admin\'i banlamak için önce `.removeadmin` ile yetkisini al.');
        }

        const data = loadData();
        const shortId = targetId.replace('@c.us', '');

        if (command === 'ban') {
            if (data.banned.includes(targetId)) {
                return msg.reply(`ℹ️ \`${shortId}\` zaten yasaklı listesinde.`);
            }
            data.banned.push(targetId);
            saveData(data);
            return msg.reply(
                `🚫 *Kullanıcı Yasaklandı*\n\n` +
                `👤 Numara: \`${shortId}\`\n` +
                `📌 Artık bota hiçbir komut gönderemeyek.\n` +
                `↩️ Kaldırmak için: \`.unban ${shortId}\``
            );
        }

        if (command === 'unban') {
            if (!data.banned.includes(targetId)) {
                return msg.reply(`ℹ️ \`${shortId}\` yasaklı listesinde bulunamadı.`);
            }
            data.banned = data.banned.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(
                `✅ *Yasak Kaldırıldı*\n\n` +
                `👤 Numara: \`${shortId}\`\n` +
                `📌 Kullanıcı artık bota tekrar komut gönderebilir.`
            );
        }
    }
};
