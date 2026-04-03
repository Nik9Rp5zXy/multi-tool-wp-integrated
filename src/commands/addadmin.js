const { loadData, saveData } = require('../utils/dataManager');
const { isOwner, isAdmin } = require('../utils/auth');
const { parseTargetId } = require('../utils/parseTarget');
const { updateEnvAdmins } = require('../utils/envManager');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        const command = msg.body.split(' ')[0].slice(1).toLowerCase(); // addadmin / removeadmin

        // ── Yetki ───────────────────────────────────────────────────────
        if (!isOwner(senderId)) {
            return msg.reply('⛔ *Yetersiz Yetki*\n\nAdmin yönetimi sadece *KURUCU (Owner)* tarafından yapılabilir.');
        }

        // ── Liste modu: .addadmin liste ─────────────────────────────────
        if (args[0] && args[0].toLowerCase() === 'liste') {
            const data = loadData();
            const envAdmins = (process.env.ADMIN_NUMBERS || '')
                .split(',').map(n => n.trim()).filter(n => n);

            const allAdmins = [...new Set([...data.admins, ...envAdmins])];

            if (allAdmins.length === 0) {
                return msg.reply('👑 *Admin Listesi*\n\nHenüz atanmış admin yok.');
            }

            let text = `👑 *Admin Listesi (${allAdmins.length} kişi)*\n\n`;
            allAdmins.forEach((id, i) => {
                const source = envAdmins.includes(id) ? '📄 .env' : '💾 storage';
                text += `${i + 1}. \`${id.replace('@c.us', '')}\` _[${source}]_\n`;
            });
            text += `\n📌 _Kaynak: .env = kalıcı, storage = geçici (restart'ta korunur)_`;
            return msg.reply(text);
        }

        // ── Bilgi modu: .addadmin bilgi @kişi ──────────────────────────
        if (args[0] && args[0].toLowerCase() === 'bilgi') {
            const targetId = await parseTargetId(args.slice(1), msg);
            if (!targetId) return msg.reply('Kimin bilgisini görmek istiyorsun? `.addadmin bilgi @etiket`');

            const data = loadData();
            const envAdmins = (process.env.ADMIN_NUMBERS || '').split(',').map(n => n.trim()).filter(n => n);
            const shortId = targetId.replace('@c.us', '');
            const isOwnerUser = isOwner(targetId);
            const isAdminStorage = data.admins.includes(targetId);
            const isAdminEnv = envAdmins.includes(targetId);
            const isBanned = data.banned.includes(targetId);
            const isMuted = data.muted.includes(targetId);

            let text = `👤 *Kullanıcı Bilgisi*\n\n`;
            text += `📱 Numara: \`${shortId}\`\n`;
            text += `👑 Kurucu: ${isOwnerUser ? '✅' : '❌'}\n`;
            text += `🌟 Admin: ${(isAdminStorage || isAdminEnv || isOwnerUser) ? '✅' : '❌'}`;
            if (isAdminEnv) text += ' _(📄 .env)_';
            if (isAdminStorage) text += ' _(💾 storage)_';
            text += '\n';
            text += `🚫 Yasaklı: ${isBanned ? '✅ Evet' : '❌ Hayır'}\n`;
            text += `🔇 Susturulmuş: ${isMuted ? '✅ Evet' : '❌ Hayır'}\n`;

            return msg.reply(text);
        }

        // ── Hedef çözümleme ─────────────────────────────────────────────
        const targetId = await parseTargetId(args, msg);

        if (!targetId) {
            return msg.reply(
                `👑 *${command === 'addadmin' ? 'Admin Ata' : 'Admin Kaldır'} Komutu*\n\n` +
                `*Kullanım:*\n` +
                `• \`.addadmin @etiket\` — Adminliğe ata\n` +
                `• \`.addadmin 905xxxxxxxxx\` — Numarayla ata\n` +
                `• \`.addadmin liste\` — Tüm adminleri listele\n` +
                `• \`.addadmin bilgi @etiket\` — Kişinin yetki bilgisi\n\n` +
                `• \`.removeadmin @etiket\` — Adminliğini al\n\n` +
                `📌 Admin yetkileri: .download, .transcribe, .whois, .ping kullanabilir.`
            );
        }

        if (targetId === senderId) {
            return msg.reply('ℹ️ Zaten kurucusun, ek admin yetkisine gerek yok.');
        }
        if (isOwner(targetId)) {
            return msg.reply('ℹ️ Kurucu zaten tüm yetkilere sahip.');
        }

        const data = loadData();
        const shortId = targetId.replace('@c.us', '');

        if (command === 'addadmin') {
            const alreadyAdmin = data.admins.includes(targetId) || isAdmin(targetId);
            if (alreadyAdmin) {
                return msg.reply(`ℹ️ \`${shortId}\` zaten admin.`);
            }

            updateEnvAdmins(targetId, 'add');
            data.admins.push(targetId);
            saveData(data);

            return msg.reply(
                `🌟 *Admin Atandı*\n\n` +
                `👤 Numara: \`${shortId}\`\n` +
                `✅ Yetki: Admin (storage + .env)\n\n` +
                `📌 Kullanabilecekleri komutlar:\n` +
                `• .download, .transcribe\n` +
                `• .whois, .ping\n` +
                `• .mute / .unmute\n\n` +
                `↩️ Kaldırmak için: \`.removeadmin ${shortId}\``
            );
        }

        if (command === 'removeadmin') {
            const isAdminUser = data.admins.includes(targetId) || isAdmin(targetId);
            if (!isAdminUser) {
                return msg.reply(`ℹ️ \`${shortId}\` zaten admin değil.`);
            }

            updateEnvAdmins(targetId, 'remove');
            data.admins = data.admins.filter(id => id !== targetId);
            saveData(data);

            return msg.reply(
                `⚠️ *Admin Yetkisi Alındı*\n\n` +
                `👤 Numara: \`${shortId}\`\n` +
                `❌ Artık admin yetkileri yok.\n` +
                `📌 Standart kullanıcı olarak devam edecek.`
            );
        }
    }
};
