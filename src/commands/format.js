const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');
const { getTargetMedia, getNormalizedId } = require('../utils/idHelper');

// Kategoriler
const imageFormats = ['png', 'jpeg', 'jpg', 'webp', 'gif'];
const audioFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
const videoFormats = ['mp4', 'mkv', 'avi', 'mov'];
const allFormats = [...imageFormats, ...audioFormats, ...videoFormats];

module.exports = {
    execute: async (client, msg, args) => {
        const media = await getTargetMedia(msg);
        
        if (!media) {
            return msg.reply(`Lütfen dönüştürülecek bir medya gönderin veya mesaja yanıt vererek uzantı belirtin.\n\nÖrnekler:\n\`.format mp3\` (Video/Sesi Müziğe çevir)\n\`.format gif\` (Videoyu GIF yap)\n\`.format png\` (Resmi Formatla)`);
        }

        const targetFormat = args[0] ? args[0].toLowerCase() : 'png';

        if (!allFormats.includes(targetFormat)) {
            return msg.reply(`Desteklenmeyen bir format (${targetFormat}).\n*Geçerli Formatlar:*\n📷 ${imageFormats.join(', ')}\n🎵 ${audioFormats.join(', ')}\n🎬 ${videoFormats.join(', ')}`);
        }

        const isSourceImage = media.mimetype.includes('image');
        const isSourceVideo = media.mimetype.includes('video');
        const isSourceAudio = media.mimetype.includes('audio');

        const isTargetImage = imageFormats.includes(targetFormat) && targetFormat !== 'gif'; // GIF is essentially video for ffmpeg
        const isTargetAudio = audioFormats.includes(targetFormat);
        const isTargetVideo = videoFormats.includes(targetFormat) || targetFormat === 'gif';

        // Anlamsız dönüşümleri engelleme (Örn: Resim -> MP3)
        if (isSourceImage && isTargetAudio) {
            return msg.reply('⛔ Hata: Hareketsiz bir fotoğrafı ses dosyasına (MP3 vb.) dönüştüremezsiniz.');
        }

        const progressMsg = await msg.reply(`⚙️ Medya **${targetFormat.toUpperCase()}** formatına dönüştürülüyor... Bu işlem medyanın uzunluğuna göre biraz sürebilir.`);

        const timestamp = Date.now();
        const tempOutput = path.join(__dirname, '../../temp', `out_${timestamp}.${targetFormat}`);
        let tempInput = null;

        try {
            const buffer = Buffer.from(media.data, 'base64');
            
            // 1) RESİM -> RESİM (Çok hızlı olduğu için Sharp kullan)
            if (isSourceImage && isTargetImage) {
                let sharpInstance = sharp(buffer);
                if (targetFormat === 'webp') {
                    sharpInstance = sharpInstance.webp({ lossless: true });
                } else if (targetFormat === 'png') {
                    sharpInstance = sharpInstance.png({ compressionLevel: 9, adaptiveFiltering: true });
                } else {
                    sharpInstance = sharpInstance.jpeg({ quality: 100, chromaSubsampling: '4:4:4' });
                }
                
                await sharpInstance.toFile(tempOutput);
            } 
            // 2) VİDEO/SES -> HER ŞEY (FFmpeg Motoru)
            else {
                // Determine raw extension of input to save it correctly
                let ext = 'tmp';
                if (media.mimetype.includes('mp4')) ext = 'mp4';
                else if (media.mimetype.includes('ogg')) ext = 'ogg';
                else if (media.mimetype.includes('mpeg')) ext = 'mp3';
                else if (media.mimetype.includes('webp')) ext = 'webp';
                else if (media.mimetype.includes('jpeg')) ext = 'jpg';
                else if (media.mimetype.includes('png')) ext = 'png';
                
                tempInput = path.join(__dirname, '../../temp', `in_${timestamp}.${ext}`);
                fs.writeFileSync(tempInput, buffer);

                await new Promise((resolve, reject) => {
                    let cmd = ffmpeg(tempInput);

                    // Eğer video/sesten GIF isteniyorsa
                    if (targetFormat === 'gif') {
                        cmd = cmd.fps(15).size('320x?'); // WhatsApp için optimize GIF boyutu
                    } 
                    // Eğer videodan şarkı yapılmak isteniyorsa sadece sesi al
                    else if (isTargetAudio && isSourceVideo) {
                        cmd = cmd.noVideo();
                    }

                    cmd.toFormat(targetFormat)
                        .on('error', (err) => reject(new Error('FFmpeg işleyemedi: ' + err.message)))
                        .on('end', () => resolve())
                        .save(tempOutput);
                });
            }

            // Dönüşüm bitti, WhatsApp'a geri yolla
            let convertedMedia;
            try {
                convertedMedia = MessageMedia.fromFilePath(tempOutput);
            } catch (fsErr) {
                throw new Error("Dosya diske kaydedilemedi veya boş.");
            }
            
            // Eğer MP3/Ses dosyasıysa normal ses mesajı gibi yollansın, diğerleri (Video/Resim) doküman/medya karma
            const sendOptions = {
                sendMediaAsDocument: true // Mümkün olan en yüksek kaliteyi (Sıkıştırmasız) korumak için varsayılan olarak belge atıyoruz.
            };

            // Eğer WhatsApp'tan videodan MP3 çekiyorsa sesi normal ses kaydı veya müzik gibi atmasını sağla
            if (isTargetAudio) {
                sendOptions.sendMediaAsDocument = false;
            } else if (targetFormat === 'gif') {
                sendOptions.sendVideoAsGif = true;
                sendOptions.sendMediaAsDocument = false;
            }

            await client.sendMessage(msg.from, convertedMedia, sendOptions);
            
            if (progressMsg.edit) {
               await progressMsg.edit(`✅ Dönüştürme Başarılı! \`.format ${targetFormat}\``);
            }

        } catch (err) {
            console.error('Format dönüştürme hatası (Multi):', err);
            if (progressMsg.edit) {
                await progressMsg.edit('⛔ Dönüşüm işlemi başarısız. Medyanız bozuk olabilir veya boyut çok büyük olduğundan FFmpeg çöküyor.');
            } else {
                msg.reply('⛔ Dönüşüm işlemi başarısız. Medya boyutunuz çok büyük olabilir.');
            }
        } finally {
            cleanUp(tempOutput);
            if (tempInput) cleanUp(tempInput);
        }
    }
};
