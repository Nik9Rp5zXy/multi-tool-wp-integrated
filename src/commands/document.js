const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');
const { getNormalizedId, getTargetMedia } = require('../utils/idHelper');

// Basit bellek yönetimi (Üretimde DB veya Redis kullanılması ölçeklenebilirlik açısından daha mantıklıdır)
const memoryStore = new Map();

module.exports = {
    execute: async (client, msg, args) => {
        const command = args[0] ? args[0].toLowerCase() : null;
        const sender = getNormalizedId(msg);

        if (command === 'basla' || command === 'başla') {
            memoryStore.set(sender, []);
            return msg.reply('📄 PDF oluşturma başlatıldı! Lütfen fotoğrafları (galeriden veya kameradan) gönderin.\nBitirdiğinizde `.document bitir` yazın.');
        }

        if (command === 'bitir') {
            const images = memoryStore.get(sender);
            if (!images || images.length === 0) {
                return msg.reply('Oluşturulacak fotoğraf bulunamadı. Önce `.document basla` yazmalısınız.');
            }

            msg.reply('PDF oluşturuluyor... Lütfen bekleyin. ⏳');
            const outputPath = path.join(__dirname, '../../temp', `doc_${Date.now()}.pdf`);
            const doc = new PDFDocument({ autoFirstPage: false }); // Resim boyutuna göre sayfa açıyoruz
            
            const writeStream = fs.createWriteStream(outputPath);
            doc.pipe(writeStream);

            try {
                for (let i = 0; i < images.length; i++) {
                    const tempImgPath = path.join(__dirname, '../../temp', `temp_${sender}_${Date.now()}_${i}.jpg`);
                    fs.writeFileSync(tempImgPath, images[i], 'base64');

                    const img = doc.openImage(tempImgPath);
                    doc.addPage({ size: [img.width, img.height] });
                    doc.image(tempImgPath, 0, 0);

                    cleanUp(tempImgPath); // Ekledikten sonra resmi derhal siliyoruz
                }

                doc.end();
            } catch (err) {
                console.error('Belge hatası:', err);
                memoryStore.delete(sender);
                return msg.reply('Belge üretilirken bir hata oluştu.');
            }

            writeStream.on('finish', async () => {
                try {
                    const pdfMedia = MessageMedia.fromFilePath(outputPath);
                    await client.sendMessage(sender, pdfMedia, { sendMediaAsDocument: true, caption: '✅ PDF belgeniz hazır!' });
                } catch (e) {
                    console.error('PDF iletilirken hata:', e);
                } finally {
                    cleanUp(outputPath); // WhatsApp'a gönderildi/hata alındı -> temizlik
                    memoryStore.delete(sender);
                }
            });

            return;
        }

        // Fotoğraf Toplama Modu
        if (msg.hasMedia && memoryStore.has(sender)) {
            const media = await msg.downloadMedia();
            if (media && media.mimetype.includes('image')) {
                const currentImages = memoryStore.get(sender);
                currentImages.push(media.data);
                memoryStore.set(sender, currentImages);
                return msg.reply(`✅ Resim eklendi. (Toplam Seçilen: ${currentImages.length})`);
            } else {
                return msg.reply('Lütfen yalnızca desteklenen resim formatlarını gönderiniz.');
            }
        }

        if (memoryStore.has(sender)) {
            return msg.reply('Lütfen `.document bitir` yazana kadar **sadece medya (fotoğraf)** yükleyiniz.');
        }

        return msg.reply('📝 *Kullanım Talimatı:*\n1. İşlemi başlatmak için: `.document basla`\n2. Fotoğrafları sırayla gönderin.\n3. Onaylamak için: `.document bitir`');
    },
    isUserInSession: (userId) => memoryStore.has(userId)
};
