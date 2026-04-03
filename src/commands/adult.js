const ytDlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');
const axios = require('axios');

// yt-dlp'nin desteklediği yetişkin siteleri
const SUPPORTED_SITES = [
    'pornhub', 'xvideos', 'xhamster', 'redtube', 'youporn',
    'tube8', 'xnxx', 'spankbang', 'beeg', 'ixxx',
    'eporner', 'txxx', 'hclips', 'drtuber', 'nuvid',
    'tnaflix', 'fuq', 'empflix', 'porntrex', 'xmegadrive'
];

function isAdultUrl(url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        return SUPPORTED_SITES.some(site => hostname.includes(site));
    } catch {
        return false;
    }
}

function formatSize(bytes) {
    if (!bytes) return 'Bilinmiyor';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

module.exports = {
    execute: async (client, msg, args) => {
        const url = args[0];

        if (!url || !url.startsWith('http')) {
            return msg.reply(
                '🔞 *Yetişkin Video İndirici*\n\n' +
                'Kullanım: `.adult [URL]`\n\n' +
                '📌 *Desteklenen Siteler:*\n' +
                SUPPORTED_SITES.slice(0, 10).map(s => `• ${s}.com`).join('\n') + '\n' +
                `• ...ve ${SUPPORTED_SITES.length - 10} daha fazlası\n\n` +
                '_Örnek: `.adult https://www.xvideos.com/video123/baslik`_'
            );
        }

        if (!isAdultUrl(url)) {
            return msg.reply(
                '⛔ Bu site desteklenmiyor veya tanınmıyor.\n\n' +
                '💡 Desteklenen siteler için `.adult` yazarak listeye bakın.'
            );
        }

        const waitMsg = await msg.reply(
            '🔞 *Video analiz ediliyor...*\n\n' +
            '🔍 Site taranıyor ve video akışı tespit ediliyor...'
        );

        const timestamp = Date.now();
        const outputPath = path.join(__dirname, '../../temp', `adult_${timestamp}.mp4`);

        try {
            // ── AŞAMA 1: Video metadata çek (indirmeden) ────────────────────
            let videoInfo;
            try {
                videoInfo = await ytDlp(url, {
                    dumpSingleJson: true,
                    noWarnings: true,
                    noCallHome: true,
                    // Format bilgisi al, indir
                    format: 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]/best'
                });
            } catch (infoErr) {
                throw new Error('Video linki geçersiz veya site erişimi engellendi.');
            }

            const title = videoInfo.title || 'video';
            const duration = videoInfo.duration || 0;
            const durationStr = duration
                ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
                : 'Bilinmiyor';

            // Boyut tahmini (yaklaşık)
            const estimatedSize = videoInfo.filesize || videoInfo.filesize_approx || 0;
            const sizeStr = formatSize(estimatedSize);

            // WhatsApp dosya limiti: ~64 MB (document olarak 100 MB)
            if (estimatedSize && estimatedSize > 95 * 1024 * 1024) {
                return await waitMsg.edit(
                    `⛔ *Video Çok Büyük*\n\n` +
                    `📹 *Başlık:* ${title.substring(0, 60)}...\n` +
                    `⏱️ *Süre:* ${durationStr}\n` +
                    `📦 *Boyut:* ${sizeStr}\n\n` +
                    `_WhatsApp maksimum 95 MB'a kadar dosya destekler. Bu video çok büyük._`
                );
            }

            await waitMsg.edit(
                `🔞 *Video Bulundu — İndiriliyor*\n\n` +
                `📹 *Başlık:* ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}\n` +
                `⏱️ *Süre:* ${durationStr}\n` +
                `📦 *Tahmini Boyut:* ${sizeStr}\n\n` +
                `⏳ Sunucu üzerinden akış yakalanıyor...`
            );

            // ── AŞAMA 2: İndir ──────────────────────────────────────────────
            await ytDlp(url, {
                output: outputPath,
                format: 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]/best',
                noWarnings: true,
                noCallHome: true,
                mergeOutputFormat: 'mp4'
            });

            if (!fs.existsSync(outputPath)) {
                throw new Error('Dosya indirildikten sonra diske kaydedilemedi.');
            }

            const stats = fs.statSync(outputPath);
            const actualSizeMB = stats.size / (1024 * 1024);

            // ── AŞAMA 3: WhatsApp'a gönder ──────────────────────────────────
            const media = MessageMedia.fromFilePath(outputPath);
            const caption =
                `🔞 *${title.substring(0, 80)}${title.length > 80 ? '...' : ''}*\n` +
                `⏱️ ${durationStr} | 📦 ${actualSizeMB.toFixed(1)} MB`;

            if (actualSizeMB > 15) {
                // 15 MB üstü = dokuman olarak gönder (WhatsApp sıkıştırmasını atla)
                await client.sendMessage(msg.from, media, {
                    sendMediaAsDocument: true,
                    caption
                });
            } else {
                await client.sendMessage(msg.from, media, { caption });
            }

            if (waitMsg.edit) {
                await waitMsg.edit(
                    `✅ *Video Başarıyla Aktarıldı*\n\n` +
                    `📦 ${actualSizeMB.toFixed(1)} MB | ⏱️ ${durationStr}`
                );
            }

        } catch (err) {
            console.error('[Adult Downloader] Hata:', err.message);

            let errMsg = '⛔ *Video indirilemedi.*\n\n';

            if (err.message.includes('Private') || err.message.includes('premium')) {
                errMsg += '🔒 Video özel veya premium üyelik gerektiriyor.';
            } else if (err.message.includes('geoblocked') || err.message.includes('geo')) {
                errMsg += '🌍 Video bölge kısıtlaması nedeniyle erişilemiyor.';
            } else if (err.message.includes('404') || err.message.includes('not found')) {
                errMsg += '❌ Video silinmiş veya URL hatalı.';
            } else {
                errMsg += `🔍 Hata: ${err.message.substring(0, 100)}`;
            }

            if (waitMsg.edit) await waitMsg.edit(errMsg);
            else msg.reply(errMsg);
        } finally {
            cleanUp(outputPath);
        }
    }
};
