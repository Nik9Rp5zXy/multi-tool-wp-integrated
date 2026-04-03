const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');

module.exports = {
    execute: async (client, msg, args) => {
        const text = args.join(' ');

        if (!text) {
            return msg.reply(
                '📐 *QR Kod Oluşturucu*\n\n' +
                'Kullanım: `.qr [metin veya URL]`\n\n' +
                '_Örnekler:_\n' +
                '`.qr https://google.com`\n' +
                '`.qr Merhaba Dünya`\n' +
                '`.qr WIFI:T:WPA;S:AgAdi;P:Sifre;;`'
            );
        }

        const waitMsg = await msg.reply('📐 QR kod üretiliyor...');
        const outputPath = path.join(__dirname, '../../temp', `qr_${Date.now()}.png`);

        try {
            await QRCode.toFile(outputPath, text, {
                width: 512,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' },
                errorCorrectionLevel: 'H'
            });

            const media = MessageMedia.fromFilePath(outputPath);
            await client.sendMessage(msg.from, media, {
                caption: `📐 *QR Kod*\n\n📝 İçerik: _${text.length > 100 ? text.substring(0, 100) + '...' : text}_`
            });

            if (waitMsg.edit) await waitMsg.edit('✅ QR kod başarıyla oluşturuldu.');
        } catch (err) {
            console.error('QR hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit('⛔ QR kod oluşturulamadı. Metin çok uzun olabilir.');
            else msg.reply('⛔ QR kod oluşturulamadı.');
        } finally {
            cleanUp(outputPath);
        }
    }
};
