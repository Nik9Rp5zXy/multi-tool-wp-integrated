const { isOwner } = require('../utils/auth');
const { isOwnerMode, setOwnerMode } = require('../utils/dataManager');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);

        if (!isOwner(senderId)) {
            return msg.reply('⛔ Bu komutu sadece *KURUCU (Owner)* kullanabilir.');
        }

        const subCmd = args[0] ? args[0].toLowerCase() : '';
        const current = isOwnerMode();

        // Owner'a DM Atma Helper
        const notifyOwner = async (text) => {
            const rawOwner = (process.env.OWNER_NUMBER || '905510395152').trim();
            const ownerJid = rawOwner.includes('@') ? rawOwner : `${rawOwner}@c.us`;
            if (msg.from !== ownerJid) { // Eger komut zaten DM'den atilmadiysa DM'e yolla
                await client.sendMessage(ownerJid, text).catch(() => {});
            }
        };

        // Durum kontrolü
        if (!subCmd || subCmd === 'durum' || subCmd === 'status') {
            const getOwnerModeUntil = require('../utils/dataManager').getOwnerModeUntil;
            const until = getOwnerModeUntil();
            let untilText = '';
            if (current && until) {
                const date = new Date(until);
                untilText = ` (⏳ ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} saatine kadar)`;
            }

            return msg.reply(
                `🔒 *Owner Modu*\n\n` +
                `Durum: ${current ? `✅ AKTİF${untilText}` : '🔓 Kapalı — Herkes kullanabilir'}\n\n` +
                `*Kullanım:*\n` +
                `• \`.ownermode ac\` — Süresiz aç\n` +
                `• \`.ownermode 23:30\` — Belli bir saate kadar aç\n` +
                `• \`.ownermode kapat\` — Kapat`
            );
        }

        if (['ac', 'aç', 'on', 'aktif', '1', 'true'].includes(subCmd)) {
            setOwnerMode(true, null);
            await notifyOwner('🔒 *Owner Modu AKTİF (Süresiz)*\n\nBot sadece kurucuya özel hale getirildi.');
            return msg.reply(
                '🔒 *Owner Modu AKTİF*\n\n' +
                'Bot sadece kurucuya özel hale getirildi.\n' +
                'Kapatmak için: `.ownermode kapat`'
            );
        }

        if (['kapat', 'off', 'kapa', '0', 'false', 'pasif'].includes(subCmd)) {
            setOwnerMode(false, null);
            await notifyOwner('🔓 *Owner Modu KAPANDI*\n\nBot normal kullanıma açıldı.');
            return msg.reply(
                '🔓 *Owner Modu KAPANDI*\n\n' +
                'Bot normal kullanıma açıldı.'
            );
        }

        // Saat belirtildiyse (örn: 23:30)
        const timeMatch = subCmd.match(/^(\d{1,2})[.:](\d{2})$/);
        if (timeMatch) {
            const h = parseInt(timeMatch[1]);
            const m = parseInt(timeMatch[2]);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                const now = new Date();
                let target = new Date();
                target.setHours(h, m, 0, 0);

                // Eğer saat geçmişse, yarına kur
                if (target.getTime() <= now.getTime()) {
                    target.setDate(target.getDate() + 1);
                }

                setOwnerMode(true, target.getTime());
                const respText = `⏳ *Owner Modu Zamanlandı!*\n\nBot saat *${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}* olana kadar SADECE SİZE açık olacak.\nSüre bitince otomatik herkese açılacaktır.`;
                await notifyOwner(respText);
                return msg.reply(respText);
            }
        }

        msg.reply('❓ Bilinmeyen parametre veya saat formatı.\nKullanım: `.ownermode 23:30` veya `.ownermode kapat`');
    }
};
