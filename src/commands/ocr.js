const { createWorker } = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const { cleanUp } = require('../utils/garbageCollector');
const { getTargetMedia } = require('../utils/idHelper');

module.exports = {
    execute: async (client, msg, args) => {
        const media = await getTargetMedia(msg);

        if (!media || !media.mimetype.includes('image')) {
            return msg.reply(
                '📋 *OCR — Resimdeki Yazıyı Oku*\n\n' +
                'Kullanım: Resme yanıt vererek `.ocr` yazın.\n\n' +
                '_Desteklenen diller:_\n' +
                '`.ocr` → Otomatik (Türkçe + İngilizce)\n' +
                '`.ocr en` → Sadece İngilizce\n' +
                '`.ocr tr` → Sadece Türkçe'
            );
        }

        const lang = args[0] ? args[0].toLowerCase() : 'tur+eng';
        const langMap = { 'tr': 'tur', 'en': 'eng', 'de': 'deu', 'fr': 'fra', 'ar': 'ara', 'ru': 'rus' };
        const tesseractLang = langMap[lang] || lang;

        const waitMsg = await msg.reply('📋 Yapay zeka resmi tarıyor ve metin çıkarıyor...');
        const tempPath = path.join(__dirname, '../../temp', `ocr_${Date.now()}.png`);

        let worker;

        try {
            // Medyayı diske yaz
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(tempPath, buffer);

            // Tesseract worker
            worker = await createWorker(tesseractLang);

            const { data: { text, confidence } } = await worker.recognize(tempPath);

            if (!text || text.trim().length === 0) {
                return await waitMsg.edit('📋 Resimde okunabilir metin bulunamadı. Farklı bir açı veya daha net bir fotoğraf deneyin.');
            }

            const cleanText = text.trim();
            const confPercent = Math.round(confidence);

            // Güven seviyesi barı
            let confEmoji = '🔴';
            if (confPercent >= 80) confEmoji = '🟢';
            else if (confPercent >= 50) confEmoji = '🟡';

            let response = `📋 *OCR Sonucu*\n\n`;
            response += `${confEmoji} Güven: %${confPercent}\n\n`;

            // WhatsApp mesaj limit kontrolü (4096 karakter)
            if (cleanText.length > 3500) {
                response += cleanText.substring(0, 3500) + '\n\n_(Metin çok uzun olduğundan kısaltıldı)_';
            } else {
                response += cleanText;
            }

            await waitMsg.edit(response);

        } catch (err) {
            console.error('OCR hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit('⛔ Metin okuma başarısız oldu. Resim çok bulanık veya küçük olabilir.');
            else msg.reply('⛔ OCR işlemi başarısız.');
        } finally {
            if (worker) {
                try { await worker.terminate(); } catch { /* ignore */ }
            }
            cleanUp(tempPath);
        }
    }
};
