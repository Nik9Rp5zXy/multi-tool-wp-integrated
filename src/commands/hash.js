const crypto = require('crypto');

module.exports = {
    execute: async (client, msg, args) => {
        if (!args[0]) {
            return msg.reply(
                '🔐 *Hash & Şifreleme Araçları*\n\n' +
                '*Hash Üretimi:*\n' +
                '`.hash md5 metin`\n' +
                '`.hash sha256 metin`\n' +
                '`.hash sha512 metin`\n\n' +
                '*Base64:*\n' +
                '`.hash base64e metin` _(encode)_\n' +
                '`.hash base64d bWVyaGFiYQ==` _(decode)_\n\n' +
                '*Şifre Üretici:*\n' +
                '`.hash sifre` _(16 karakter)_\n' +
                '`.hash sifre 32` _(32 karakter)_\n' +
                '`.hash pin` _(6 haneli PIN)_'
            );
        }

        const subCommand = args[0].toLowerCase();
        const input = args.slice(1).join(' ');

        try {
            // ─── HASH ÜRETİMİ ─────────────────────────────
            const hashAlgorithms = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];

            if (hashAlgorithms.includes(subCommand)) {
                if (!input) return msg.reply(`Lütfen hash'lenecek metni girin.\nÖrnek: \`.hash ${subCommand} merhaba\``);

                const hash = crypto.createHash(subCommand).update(input, 'utf8').digest('hex');

                return msg.reply(
                    `🔐 *${subCommand.toUpperCase()} Hash*\n\n` +
                    `📝 Girdi: _${input.length > 50 ? input.substring(0, 50) + '...' : input}_\n` +
                    `🔑 Hash:\n\`${hash}\``
                );
            }

            // ─── TÜM HASH'LER ─────────────────────────────
            if (subCommand === 'hepsi' || subCommand === 'all') {
                if (!input) return msg.reply('Lütfen hash\'lenecek metni girin.\nÖrnek: `.hash hepsi merhaba`');

                let text = `🔐 *Tüm Hash Değerleri*\n\n📝 Girdi: _${input.length > 50 ? input.substring(0, 50) + '...' : input}_\n\n`;

                for (const algo of hashAlgorithms) {
                    const hash = crypto.createHash(algo).update(input, 'utf8').digest('hex');
                    text += `*${algo.toUpperCase()}:*\n\`${hash}\`\n\n`;
                }

                return msg.reply(text);
            }

            // ─── BASE64 ENCODE ─────────────────────────────
            if (subCommand === 'base64e' || subCommand === 'encode' || subCommand === 'b64e') {
                if (!input) return msg.reply('Lütfen encode edilecek metni girin.\nÖrnek: `.hash base64e merhaba`');

                const encoded = Buffer.from(input, 'utf8').toString('base64');
                return msg.reply(
                    `🔐 *Base64 Encode*\n\n` +
                    `📝 Girdi: _${input}_\n` +
                    `📤 Çıktı:\n\`${encoded}\``
                );
            }

            // ─── BASE64 DECODE ─────────────────────────────
            if (subCommand === 'base64d' || subCommand === 'decode' || subCommand === 'b64d') {
                if (!input) return msg.reply('Lütfen decode edilecek base64 metnini girin.\nÖrnek: `.hash base64d bWVyaGFiYQ==`');

                try {
                    const decoded = Buffer.from(input, 'base64').toString('utf8');
                    return msg.reply(
                        `🔐 *Base64 Decode*\n\n` +
                        `📝 Girdi: _${input}_\n` +
                        `📥 Çıktı: _${decoded}_`
                    );
                } catch {
                    return msg.reply('⛔ Geçersiz Base64 formatı.');
                }
            }

            // ─── ŞİFRE ÜRETİCİ ────────────────────────────
            if (subCommand === 'sifre' || subCommand === 'password' || subCommand === 'şifre') {
                const length = parseInt(input) || 16;
                const clampedLength = Math.min(Math.max(length, 8), 128);

                const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}';
                const bytes = crypto.randomBytes(clampedLength);
                let password = '';
                for (let i = 0; i < clampedLength; i++) {
                    password += charset[bytes[i] % charset.length];
                }

                // Güç analizi
                let strength = '🔴 Zayıf';
                if (clampedLength >= 12) strength = '🟡 Orta';
                if (clampedLength >= 16) strength = '🟢 Güçlü';
                if (clampedLength >= 24) strength = '💪 Çok Güçlü';

                return msg.reply(
                    `🔐 *Güvenli Şifre Üretildi*\n\n` +
                    `🔑 \`${password}\`\n\n` +
                    `📏 Uzunluk: ${clampedLength} karakter\n` +
                    `${strength}\n\n` +
                    `⚠️ _Bu mesajı gördükten sonra silmeniz önerilir._`
                );
            }

            // ─── PIN ÜRETİCİ ──────────────────────────────
            if (subCommand === 'pin') {
                const length = parseInt(input) || 6;
                const clampedLength = Math.min(Math.max(length, 4), 12);

                const bytes = crypto.randomBytes(clampedLength);
                let pin = '';
                for (let i = 0; i < clampedLength; i++) {
                    pin += (bytes[i] % 10).toString();
                }

                return msg.reply(
                    `🔐 *PIN Kodu Üretildi*\n\n` +
                    `🔢 \`${pin}\`\n\n` +
                    `📏 Uzunluk: ${clampedLength} hane`
                );
            }

            // Bilinmeyen alt komut
            msg.reply(`Bilinmeyen işlem: "${subCommand}"\nKullanım bilgisi için: \`.hash\``);

        } catch (err) {
            console.error('Hash hatası:', err.message);
            msg.reply('⛔ İşlem sırasında bir hata oluştu.');
        }
    }
};
