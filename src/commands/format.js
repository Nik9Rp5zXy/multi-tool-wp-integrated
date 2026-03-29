const sharp = require('sharp');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');
const { getTargetMedia, getNormalizedId } = require('../utils/idHelper');

module.exports = {
    execute: async (client, msg, args) => {
        const media = await getTargetMedia(msg);
        
        if (!media) {
            return msg.reply('Lütfen dönüştürülecek bir fotoğraf/dosya gönderin veya mesaja yanıt vererek `.format [png/jpg/webp]` komutunu kullanın.');
        }

        const targetFormat = args[0] ? args[0].toLowerCase() : 'png';
        const allowedFormats = ['png', 'jpeg', 'jpg', 'webp'];

        if (!allowedFormats.includes(targetFormat)) {
            return msg.reply(`Desteklenmeyen bir format (${targetFormat}). Geçerli olanlar: ${allowedFormats.join(', ')}`);
        }

        msg.reply('Format dönüştürülüyor... ⏳');

        // Yalnızca resimler üzerinde işlemi kısıtlama
        if (!media.mimetype.includes('image')) {
            return msg.reply('Lütfen sadece resim (image) formatı gönderin.');
        }

        const tempOutput = path.join(__dirname, '../../temp', `out_${Date.now()}.${targetFormat}`);

        try {
            const buffer = Buffer.from(media.data, 'base64');
            
            // sharp ile kalite kaybı olmadan (lossless mode ağırlıklı) işlem
            let sharpInstance = sharp(buffer);
            if (targetFormat === 'webp') {
                sharpInstance = sharpInstance.webp({ lossless: true });
            } else if (targetFormat === 'png') {
                sharpInstance = sharpInstance.png({ compressionLevel: 9, adaptiveFiltering: true });
            } else {
                sharpInstance = sharpInstance.jpeg({ quality: 100, chromaSubsampling: '4:4:4' });
            }

            await sharpInstance.toFile(tempOutput);

            const convertedMedia = MessageMedia.fromFilePath(tempOutput);
            
            // Belge formatında yolla (sıkıştırmayı minimize etmek için)
            await client.sendMessage(msg.from, convertedMedia, { sendMediaAsDocument: true });
        } catch (err) {
            console.error('Format dönüştürme hatası:', err);
            msg.reply('Dönüşüm işlemi sırasında hata oluştu.');
        } finally {
            cleanUp(tempOutput);
        }
    }
};
