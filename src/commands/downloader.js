const ytDlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');
const { isAuthorized } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);

        // Sistem Yükü Güvenliği: Ağır işlemi yetkilendir!
        if (!isAuthorized(senderId)) {
            return msg.reply('⛔ Bu komutu kullanmaya yetkiniz bulunmamaktadır.');
        }

        const url = args[0];
        if (!url || !url.startsWith('http')) {
            return msg.reply('Lütfen geçerli bir oynatıcı bağlantısı (YouTube vb.) gönderin.\nÖrnek: `.download https://...`');
        }

        msg.reply('Video sunucu üzerinden indiriliyor, medya boyutuna göre işlem zaman alabilir... ⏳');
        const outputPath = path.join(__dirname, '../../temp', `video_${Date.now()}.mp4`);

        try {
            await ytDlp(url, {
                output: outputPath,
                format: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b', // En iyi video/ses optimizasyonu
                noWarnings: true
            });

            if (fs.existsSync(outputPath)) {
                const mediaObject = MessageMedia.fromFilePath(outputPath);
                await client.sendMessage(msg.from, mediaObject, { caption: "İşte videonuz! 🎬" });
            } else {
                throw new Error("Yakalama modülü başarıyla işledi ancak dosya diskte bulunamadı.");
            }
        } catch (error) {
            console.error('İndirme modülü hatası:', error.message);
            msg.reply('Video çekilemedi. Bağlantı gizli, korumalı veya izin verilen dosya boyutlarından çok daha büyük olabilir.');
        } finally {
            cleanUp(outputPath); // WhatsApp'a aktarıldıktan sonra belleği korumak için silindi
        }
    }
};
