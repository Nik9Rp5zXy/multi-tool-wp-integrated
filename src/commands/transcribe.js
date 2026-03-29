const whisper = require('whisper-node');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { cleanUp } = require('../utils/garbageCollector');
const { isAuthorized } = require('../utils/auth');
const { getTargetMedia, getNormalizedId } = require('../utils/idHelper');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = getNormalizedId(msg);
        if (!isAuthorized(senderId)) {
            return msg.reply('⛔ Yapay zeka ile ses metne dökme komutu için yetkiniz bulunmuyor.');
        }

        const media = await getTargetMedia(msg);
        if (!media) {
            return msg.reply('Lütfen metne dökülecek sesli mesajı/videoyu gönderin veya ona yanıt vererek `.transcribe` yazın.');
        }

        let inputPath, wavPath;

        try {
            msg.reply('🎙 Ses işlenerek metne dönüştürülüyor... Bu işlem donanım gücüne dayalı (CPU) biraz sürebilir. ⏳');
            
            if (!media.mimetype.includes('audio') && !media.mimetype.includes('video')) {
                return msg.reply('Yapay zeka bu dosya aktarım biçimini kullanamaz. Lütfen ses dosyasına yanıt verin.');
            }

            const timestamp = Date.now();
            inputPath = path.join(__dirname, '../../temp', `audio_raw_${timestamp}.ogg`);
            wavPath = path.join(__dirname, '../../temp', `audio_converted_${timestamp}.wav`);
            
            // Orijinal medya formatını belleğe yaz
            fs.writeFileSync(inputPath, media.data, 'base64');

            // Whisper, .wav(16kHz) formülünü istiyor. Bu esnada sunucudaki yerleşik ffmpeg ile dönüştürüyoruz.
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .audioFrequency(16000)
                    .audioChannels(1)
                    .toFormat('wav')
                    .on('error', (err) => reject(new Error('Sesi dönüştürürken sorun yaşandı: ' + err.message)))
                    .on('end', () => resolve())
                    .save(wavPath);
            });

            // Whisper C++ ile analiz (tiny veya base modelini otomatik arayacaktır/çağıracaktır)
            // Model name parametresi "tiny" ya da yerelinizdeki model yoludur.
            const options = {
                modelName: "tiny"
            };

            const transcript = await whisper(wavPath, options);

            // Whisper node array formatında cevap verir
            if (transcript && transcript.length > 0) {
                 const fullText = transcript.map(t => t.text || t).join(' '); // Whisper API'sine bağlı olarak
                 msg.reply(`📝 *Deşifre Edildi:*\n\n${fullText.trim()}`);
            } else {
                 msg.reply('Seste anlaşılır bir diyalog bulunamadı.');
            }
        } catch (error) {
            console.error('Transkripsiyon Hatası:', error);
            msg.reply('Dönüşüm işlemi başarısızla sonuçlandı. FFmpeg veya Whisper.cpp modülleri eksik konfigüre edilmiş olabilir.');
        } finally {
            if (inputPath) cleanUp(inputPath);
            if (wavPath) cleanUp(wavPath);
        }
    }
};
