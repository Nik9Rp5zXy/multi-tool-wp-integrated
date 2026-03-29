const { whisper } = require('whisper-node');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { cleanUp } = require('../utils/garbageCollector');
const { isAuthorized } = require('../utils/auth');
const { getTargetMedia } = require('../utils/idHelper');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        if (!isAuthorized(senderId)) {
            return msg.reply('⛔ Yapay zeka ile ses metne dökme komutu için yetkiniz bulunmuyor.');
        }

        const media = await getTargetMedia(msg);
        if (!media) {
            return msg.reply('Lütfen metne dökülecek sesli mesajı/videoyu gönderin veya ona yanıt vererek komutu yazın.\n\n*İpucu:* Hız önceliği belirleyebilirsiniz:\n👉 `.transcribe hizli` (Saniyeler içinde, düşük analiz)\n👉 `.transcribe detayli` (Yüksek kalite, uzun bekleme)');
        }

        let selectedModel = process.env.WHISPER_MODEL || "small";
        let modeMessage = "Standart Mod";

        if (args && args[0]) {
            const mode = args[0].toLowerCase();
            if (mode === 'hizli' || mode === 'hızlı') {
                selectedModel = "tiny"; // Maksimum hız, düşük RAM
                modeMessage = "⚡ Hızlı Mod";
            } else if (mode === 'yavas' || mode === 'yavaş' || mode === 'detayli' || mode === 'detaylı') {
                selectedModel = "medium"; // Yüksek kalite, yüksek RAM
                modeMessage = "🔍 Detaylı Mod";
            }
        }

        let inputPath, wavPath;
        let progressInterval;

        try {
            const progressMsg = await msg.reply(`🎙 [${modeMessage}] Ses işleniyor... %0\n[░░░░░░░░░░]`);
            
            if (!media.mimetype.includes('audio') && !media.mimetype.includes('video')) {
                return progressMsg.edit('Yapay zeka bu dosya aktarım biçimini kullanamaz. Lütfen ses dosyasına yanıt verin.');
            }

            const timestamp = Date.now();
            inputPath = path.join(__dirname, '../../temp', `audio_raw_${timestamp}.ogg`);
            wavPath = path.join(__dirname, '../../temp', `audio_converted_${timestamp}.wav`);
            
            // Orijinal medya formatını belleğe yaz
            fs.writeFileSync(inputPath, media.data, 'base64');

            // Whisper, .wav(16kHz) formülünü istiyor.
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .audioFrequency(16000)
                    .audioChannels(1)
                    .toFormat('wav')
                    .on('error', (err) => reject(new Error('Sesi dönüştürürken sorun yaşandı: ' + err.message)))
                    .on('end', () => resolve())
                    .save(wavPath);
            });

            // Fake ilerleme (Progress) Çubuğu
            let progress = 0;
            progressInterval = setInterval(async () => {
                progress += 20;
                if (progress > 80) progress = 80; // %100'ü çeviri bitince manuel veriyoruz
                
                const filled = Math.floor(progress / 10);
                const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
                
                try {
                    // WhatsApp-web.js .edit() metodu (1.23+ sürümleri için aktif)
                    if (progressMsg.edit) {
                        await progressMsg.edit(`🎙 [${modeMessage}] Ses işleniyor... %${progress}\n[${bar}]`);
                    }
                } catch (e) { /* ignore */ }
            }, 3500); // Her 3.5 saniyede bir %20 arttır

            // Whisper C++ ile analiz - Thread'in donmaması için shellOptions async:true
            const options = {
                modelName: selectedModel,
                whisperOptions: { language: 'auto' }, // Otomatik dil algılama (en yerine)
                shellOptions: { async: true }
            };

            const transcript = await whisper(wavPath, options);

            // Analiz bitişi
            clearInterval(progressInterval);
            
            if (progressMsg.edit) {
               await progressMsg.edit(`🎙 [${modeMessage}] Ses işleniyor... %100\n[▓▓▓▓▓▓▓▓▓▓]`);
            }

            // Whisper node array formatında cevap verir
            if (transcript && transcript.length > 0) {
                 const fullText = transcript.map(t => t.text || t).join(' ');
                 msg.reply(`📝 *Deşifre Edildi:*\n\n${fullText.trim()}`);
            } else {
                 msg.reply('Seste anlaşılır bir diyalog bulunamadı.');
            }
        } catch (error) {
            console.error('Transkripsiyon Hatası:', error);
            msg.reply('Dönüşüm işlemi başarısızla sonuçlandı. FFmpeg veya model eksik olabilir.');
        } finally {
            if (progressInterval) clearInterval(progressInterval);
            if (inputPath) cleanUp(inputPath);
            if (wavPath) cleanUp(wavPath);
        }
    }
};
