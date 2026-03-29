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
                const stats = fs.statSync(outputPath);
                const fileSizeInMB = stats.size / (1024 * 1024);
                
                const mediaObject = MessageMedia.fromFilePath(outputPath);
                
                if (fileSizeInMB > 15) {
                    msg.reply(`⚠️ Video boyutu WhatsApp standart sınırını aşıyor (${fileSizeInMB.toFixed(1)} MB). Sorunsuz ulaşması için 'Belge' formatında gönderiliyor...`);
                    await client.sendMessage(msg.from, mediaObject, { sendMediaAsDocument: true });
                } else {
                    await client.sendMessage(msg.from, mediaObject, { caption: "İşte videonuz! 🎬" });
                }
            } else {
                throw new Error("Yakalama modülü başarıyla işledi ancak dosya diskte bulunamadı.");
            }
        } catch (error) {
            console.error('İndirme modülü hatası (Tüm Detay):', error);
            
            let errMsg = error && error.message ? error.message : 'Bilinmeyen hata';
            // Eğer "t" gibi anlamsız kısa hatalar alırsak veya başka şeyler patlarsa
            if (errMsg === 't' || errMsg.length < 5) errMsg = 'Bağlantı desteklenmiyor veya sunucu zaman aşımına uğradı.';

            msg.reply('Video çekilemedi. Bağlantı gizli, korumalı veya formata uygun değil olabilir.\n🔍 Hata detayı: ' + errMsg);
        } finally {
            cleanUp(outputPath); // WhatsApp'a aktarıldıktan sonra belleği korumak için silindi
        }
    }
};
