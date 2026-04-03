const { loadData, saveData } = require('../utils/dataManager');
const { isAdmin, isOwner } = require('../utils/auth');
const { parseTargetId } = require('../utils/parseTarget');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        const command = msg.body.split(' ')[0].slice(1).toLowerCase(); // mute / unmute

        // ── Yetki ───────────────────────────────────────────────────────
        if (!isAdmin(senderId)) {
            return msg.reply('⛔ *Yetersiz Yetki*\n\nMute/Unmute komutu *Admin* veya *Owner* yetkisi gerektirir.');
        }

        // ── Liste modu: .mute liste ─────────────────────────────────────
        if (args[0] && args[0].toLowerCase() === 'liste') {
            const data = loadData();
            if (data.muted.length === 0) {
                return msg.reply('🔇 *Susturulmuş Listesi*\n\nHenüz susturulmuş kullanıcı yok.');
            }
            let text = `🔇 *Susturulmuşlar (${data.muted.length} kişi)*\n\n`;
            data.muted.forEach((id, i) => {
                text += `${i + 1}. \`${id.replace('@c.us', '')}\`\n`;
            });
            return msg.reply(text);
        }

        // ── Hedef çözümleme ─────────────────────────────────────────────
        const targetId = await parseTargetId(args, msg);

        if (!targetId) {
            return msg.reply(
                `🔇 *${command === 'mute' ? 'Mute' : 'Unmute'} Komutu*\n\n` +
                `*Kullanım:*\n` +
                `• \`.mute @etiket\` — Etiketlenen kişiyi sustur\n` +
                `• \`.mute\` (mesaja yanıt ver) — O kişiyi sustur\n` +
                `• \`.mute 905xxxxxxxxx\` — Numarayla sustur\n` +
                `• \`.mute liste\` — Tüm susturulmuşları listele\n\n` +
                `*Unmute:*\n` +
                `• \`.unmute @etiket\` veya numarayla aynı şekilde\n\n` +
                `📌 Susturulan kişi bota hiçbir komut gönderemez.`
            );
        }

        // Koruma kontrolleri
        if (targetId === senderId) {
            return msg.reply('⛔ Kendini susturulamzsın!');
        }
        if (isOwner(targetId)) {
            return msg.reply('⛔ Kurucuyu susturulamzsın!');
        }
        // Admin başka admini susturur mu? Sadece owner yapabilir
        if (isAdmin(targetId) && !isOwner(senderId)) {
            return msg.reply('⛔ Başka bir admini susturmak için *Owner* yetkisi gerekir.');
        }

        const data = loadData();
        const shortId = targetId.replace('@c.us', '');

        if (command === 'mute') {
            if (data.muted.includes(targetId)) {
                return msg.reply(`ℹ️ \`${shortId}\` zaten susturulmuş.`);
            }
            data.muted.push(targetId);
            saveData(data);
            return msg.reply(
                `🔇 *Kullanıcı Susturuldu*\n\n` +
                `👤 Numara: \`${shortId}\`\n` +
                `📌 Artık bota komut gönderemeyecek.\n` +
                `↩️ Kaldırmak için: \`.unmute ${shortId}\``
            );
        }

        if (command === 'unmute') {
            if (!data.muted.includes(targetId)) {
                return msg.reply(`ℹ️ \`${shortId}\` susturulmuşlar listesinde bulunamadı.`);
            }
            data.muted = data.muted.filter(id => id !== targetId);
            saveData(data);
            return msg.reply(
                `🔊 *Susturma Kaldırıldı*\n\n` +
                `👤 Numara: \`${shortId}\`\n` +
                `📌 Kullanıcı artık bota tekrar komut gönderebilir.`
            );
        }
    }
};
