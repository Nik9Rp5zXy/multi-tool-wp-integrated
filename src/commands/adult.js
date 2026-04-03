const ytDlp = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');

// ── Desteklenen siteler ──────────────────────────────────────────────────────
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
    } catch { return false; }
}

function formatSize(bytes) {
    if (!bytes) return 'Bilinmiyor';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
    if (!seconds) return 'Bilinmiyor';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
};

// ── Alt komut: video bilgisi ─────────────────────────────────────────────────
async function handleInfo(client, msg, url, waitMsg) {
    try {
        const info = await ytDlp(url, {
            dumpSingleJson: true,
            noWarnings: true,
        });

        const title = info.title || 'Bilinmiyor';
        const duration = formatDuration(info.duration);
        const views = info.view_count ? info.view_count.toLocaleString('tr-TR') : 'Bilinmiyor';
        const likes = info.like_count ? info.like_count.toLocaleString('tr-TR') : 'Bilinmiyor';
        const uploader = info.uploader || info.channel || 'Bilinmiyor';
        const uploadDate = info.upload_date
            ? `${info.upload_date.slice(6, 8)}.${info.upload_date.slice(4, 6)}.${info.upload_date.slice(0, 4)}`
            : 'Bilinmiyor';

        const estimatedSize = info.filesize || info.filesize_approx || 0;

        const formats = (info.formats || [])
            .filter(f => f.height && f.ext === 'mp4')
            .map(f => `${f.height}p`)
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => parseInt(b) - parseInt(a))
            .slice(0, 5);

        let text = `🔞 *Video Bilgi Kartı*\n\n`;
        text += `📹 *Başlık:* ${title.substring(0, 80)}${title.length > 80 ? '...' : ''}\n`;
        text += `⏱️ *Süre:* ${duration}\n`;
        text += `👁️ *İzlenme:* ${views}\n`;
        text += `👍 *Beğeni:* ${likes}\n`;
        text += `👤 *Yükleyen:* ${uploader}\n`;
        text += `📅 *Tarih:* ${uploadDate}\n`;
        text += `📦 *Tahmini Boyut:* ${formatSize(estimatedSize)}\n`;
        if (formats.length > 0) text += `🎬 *Kaliteler:* ${formats.join(', ')}\n`;
        text += `\n💡 İndirmek için:\n• \`.adult ${url}\`\n• \`.adult ses ${url}\` (sadece ses)`;

        await waitMsg.edit(text);
    } catch (err) {
        await waitMsg.edit(`⛔ Video bilgisi alınamadı.\n🔍 Hata: ${err.message.substring(0, 100)}`);
    }
}

// ── Alt komut: ses çıkarma ───────────────────────────────────────────────────
async function handleAudio(client, msg, url, waitMsg) {
    const timestamp = Date.now();
    const outputPath = path.join(__dirname, '../../temp', `adult_audio_${timestamp}.mp3`);

    try {
        const info = await ytDlp(url, { dumpSingleJson: true, noWarnings: true });
        const title = info.title || 'ses';
        const duration = formatDuration(info.duration);

        await waitMsg.edit(
            `🎵 *Ses Çıkarılıyor*\n\n` +
            `📹 ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}\n` +
            `⏱️ ${duration}\n\n⏳ FFmpeg ile ses ayrıştırılıyor...`
        );

        await ytDlp(url, {
            output: outputPath,
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '192K',
            noWarnings: true,
        });

        // yt-dlp bazen farklı isimlendirir
        let finalPath = outputPath;
        if (!fs.existsSync(outputPath)) {
            const tempDir = path.dirname(outputPath);
            const files = fs.readdirSync(tempDir).filter(f => f.startsWith(`adult_audio_${timestamp}`));
            if (files.length > 0) finalPath = path.join(tempDir, files[0]);
            else throw new Error('Ses dosyası diske kaydedilemedi.');
        }

        const stats = fs.statSync(finalPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

        const media = MessageMedia.fromFilePath(finalPath);
        await client.sendMessage(msg.from, media, {
            caption: `🎵 *${title.substring(0, 80)}*\n⏱️ ${duration} | 📦 ${sizeMB} MB`
        });

        await waitMsg.edit(`✅ *Ses başarıyla çıkarıldı!*\n📦 ${sizeMB} MB MP3`);
    } catch (err) {
        console.error('[Adult Audio] Hata:', err.message);
        await waitMsg.edit(`⛔ Ses çıkarılamadı.\n🔍 ${err.message.substring(0, 100)}`);
    } finally {
        cleanUp(outputPath);
    }
}

// ── Alt komut: video indirme ─────────────────────────────────────────────────
async function handleDownload(client, msg, url, quality, waitMsg) {
    const timestamp = Date.now();
    const outputPath = path.join(__dirname, '../../temp', `adult_${timestamp}.mp4`);

    try {
        let videoInfo;
        try {
            videoInfo = await ytDlp(url, { dumpSingleJson: true, noWarnings: true });
        } catch {
            throw new Error('Video linki geçersiz veya site erişimi engellendi.');
        }

        const title = videoInfo.title || 'video';
        const duration = formatDuration(videoInfo.duration);
        const estimatedSize = videoInfo.filesize || videoInfo.filesize_approx || 0;

        if (estimatedSize && estimatedSize > 95 * 1024 * 1024) {
            return await waitMsg.edit(
                `⛔ *Video Çok Büyük* (${formatSize(estimatedSize)})\n\n` +
                `WhatsApp maksimum 95 MB destekler.\n` +
                `💡 Sadece sesi almak için: \`.adult ses ${url}\``
            );
        }

        let formatStr;
        if (quality === '480') {
            formatStr = 'bestvideo[ext=mp4][height<=480]+bestaudio[ext=m4a]/best[ext=mp4][height<=480]/best[height<=480]/best';
        } else if (quality === '1080') {
            formatStr = 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best';
        } else {
            formatStr = 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]/best';
        }

        await waitMsg.edit(
            `🔞 *Video İndiriliyor*\n\n` +
            `📹 ${title.substring(0, 60)}${title.length > 60 ? '...' : ''}\n` +
            `⏱️ ${duration} | 📦 ~${formatSize(estimatedSize)}\n` +
            `🎬 Kalite: ${quality || '720'}p\n\n` +
            `⏳ Sunucu üzerinden akış yakalanıyor...`
        );

        await ytDlp(url, {
            output: outputPath,
            format: formatStr,
            noWarnings: true,
            mergeOutputFormat: 'mp4'
        });

        if (!fs.existsSync(outputPath)) throw new Error('Dosya diske kaydedilemedi.');

        const stats = fs.statSync(outputPath);
        const actualSizeMB = stats.size / (1024 * 1024);
        const media = MessageMedia.fromFilePath(outputPath);
        const caption = `🔞 *${title.substring(0, 80)}${title.length > 80 ? '...' : ''}*\n⏱️ ${duration} | 📦 ${actualSizeMB.toFixed(1)} MB`;

        if (actualSizeMB > 15) {
            await client.sendMessage(msg.from, media, { sendMediaAsDocument: true, caption });
        } else {
            await client.sendMessage(msg.from, media, { caption });
        }

        await waitMsg.edit(
            `✅ *Video Aktarıldı!*\n\n📦 ${actualSizeMB.toFixed(1)} MB | ⏱️ ${duration}`
        );
    } catch (err) {
        console.error('[Adult DL] Hata:', err.message);
        let errMsg = '⛔ *Video indirilemedi.*\n\n';
        if (err.message.includes('Private') || err.message.includes('premium')) errMsg += '🔒 Video özel veya premium üyelik gerektiriyor.';
        else if (err.message.includes('geoblocked') || err.message.includes('geo')) errMsg += '🌍 Bölge kısıtlaması nedeniyle erişilemiyor.';
        else if (err.message.includes('404') || err.message.includes('not found')) errMsg += '❌ Video silinmiş veya URL hatalı.';
        else errMsg += `🔍 Hata: ${err.message.substring(0, 100)}`;
        await waitMsg.edit(errMsg);
    } finally {
        cleanUp(outputPath);
    }
}

// ── Alt komut: arama (web scraping — yt-dlp search desteği kaldırıldı) ───────
async function handleSearch(client, msg, args, waitMsg) {
    const SEARCH_SITES = {
        'xvideos': { url: 'https://www.xvideos.com/?k=', baseUrl: 'https://www.xvideos.com' },
        'xnxx': { url: 'https://www.xnxx.com/search/', baseUrl: 'https://www.xnxx.com' },
    };

    const site = args[0] && SEARCH_SITES[args[0].toLowerCase()] ? args[0].toLowerCase() : null;
    const query = site ? args.slice(1).join(' ') : args.join(' ');
    const selectedSite = site || 'xvideos';
    const siteConfig = SEARCH_SITES[selectedSite];

    if (!query) {
        return await waitMsg.edit(
            '🔍 *Yetişkin Video Arama*\n\n' +
            'Kullanım: `.adult ara [arama terimi]`\n\n' +
            'Örnek:\n' +
            '• `.adult ara türk`\n' +
            '• `.adult ara xvideos amateur`\n' +
            '• `.adult ara xnxx popular`\n\n' +
            `📌 Desteklenen arama siteleri: ${Object.keys(SEARCH_SITES).join(', ')}`
        );
    }

    try {
        await waitMsg.edit(`🔍 "${query}" aranıyor (${selectedSite})...\n⏳ Sonuçlar kazınıyor...`);

        const searchUrl = `${siteConfig.url}${encodeURIComponent(query)}`;

        const res = await axios.get(searchUrl, {
            headers: HEADERS,
            timeout: 12000
        });

        const $ = cheerio.load(res.data);
        const results = [];

        if (selectedSite === 'xvideos') {
            // xvideos arama sonuçları
            $('.mozaique .thumb-block').each((i, el) => {
                if (results.length >= 5) return false;
                const titleEl = $(el).find('.thumb-under .title a');
                const durationEl = $(el).find('.duration');
                const title = titleEl.attr('title') || titleEl.text().trim();
                let href = titleEl.attr('href') || '';
                if (href && !href.startsWith('http')) href = siteConfig.baseUrl + href;
                const duration = durationEl.text().trim();

                if (title && href) {
                    results.push({ title, url: href, duration: duration || '?' });
                }
            });
        } else if (selectedSite === 'xnxx') {
            // xnxx arama sonuçları
            $('.mozaique .thumb-block').each((i, el) => {
                if (results.length >= 5) return false;
                const titleEl = $(el).find('.thumb-under p a');
                const durationEl = $(el).find('.metadata .duration, .thumb-under .metadata');
                const title = titleEl.attr('title') || titleEl.text().trim();
                let href = titleEl.attr('href') || '';
                if (href && !href.startsWith('http')) href = siteConfig.baseUrl + href;
                const duration = durationEl.text().trim();

                if (title && href) {
                    results.push({ title, url: href, duration: duration || '?' });
                }
            });
        }

        if (results.length === 0) {
            return await waitMsg.edit(
                `🔍 "${query}" için sonuç bulunamadı.\n\n` +
                `💡 Farklı arama terimi veya site deneyin.`
            );
        }

        let text = `🔍 *Arama: "${query.substring(0, 40)}"*\n`;
        text += `📌 Site: ${selectedSite} | ${results.length} sonuç\n\n`;

        results.forEach((r, i) => {
            text += `*${i + 1}.* ${r.title.substring(0, 55)}${r.title.length > 55 ? '...' : ''}\n`;
            text += `   ⏱️ ${r.duration}\n`;
            text += `   🔗 ${r.url}\n\n`;
        });

        text += `💡 İndirmek için: \`.adult [URL]\``;
        await waitMsg.edit(text);

    } catch (err) {
        console.error('[Adult Search] Hata:', err.message);
        await waitMsg.edit(
            `⛔ Arama başarısız.\n🔍 Hata: ${err.message.substring(0, 100)}\n\n` +
            `💡 Farklı arama terimi deneyin.`
        );
    }
}

// ── Ana execute ──────────────────────────────────────────────────────────────
module.exports = {
    execute: async (client, msg, args) => {
        const subCmd = args[0] ? args[0].toLowerCase() : '';

        if (!subCmd) {
            return msg.reply(
                '🔞 *Yetişkin Araç Kutusu*\n\n' +
                '*İndirme:*\n' +
                '• `.adult [URL]` — Video indir (720p)\n' +
                '• `.adult 480 [URL]` — Düşük kalite (480p)\n' +
                '• `.adult 1080 [URL]` — Yüksek kalite (1080p)\n\n' +
                '*Araçlar:*\n' +
                '• `.adult bilgi [URL]` — Video bilgi kartı\n' +
                '• `.adult ses [URL]` — Sadece sesi MP3 olarak indir\n' +
                '• `.adult ara [arama]` — Video arama (xvideos)\n' +
                '• `.adult ara xnxx [arama]` — xnxx\'te ara\n\n' +
                '*📌 Desteklenen Siteler:*\n' +
                SUPPORTED_SITES.slice(0, 10).map(s => `• ${s}.com`).join('\n') +
                `\n• ...ve ${SUPPORTED_SITES.length - 10} daha`
            );
        }

        // .adult bilgi [url]
        if (subCmd === 'bilgi' || subCmd === 'info') {
            const url = args[1];
            if (!url || !isAdultUrl(url)) {
                return msg.reply('Lütfen geçerli bir URL girin.\nÖrnek: `.adult bilgi https://xvideos.com/video...`');
            }
            const waitMsg = await msg.reply('🔍 Video bilgisi çekiliyor...');
            return handleInfo(client, msg, url, waitMsg);
        }

        // .adult ses [url]
        if (subCmd === 'ses' || subCmd === 'audio' || subCmd === 'mp3') {
            const url = args[1];
            if (!url || !isAdultUrl(url)) {
                return msg.reply('Lütfen geçerli bir URL girin.\nÖrnek: `.adult ses https://xvideos.com/video...`');
            }
            const waitMsg = await msg.reply('🎵 Ses çıkarma başlatıldı...');
            return handleAudio(client, msg, url, waitMsg);
        }

        // .adult ara [...]
        if (subCmd === 'ara' || subCmd === 'search') {
            const waitMsg = await msg.reply('🔍 Arama başlatılıyor...');
            return handleSearch(client, msg, args.slice(1), waitMsg);
        }

        // .adult 480/720/1080 [url]
        if (['480', '720', '1080'].includes(subCmd)) {
            const url = args[1];
            if (!url || !isAdultUrl(url)) {
                return msg.reply(`Lütfen geçerli bir URL girin.\nÖrnek: \`.adult ${subCmd} https://xvideos.com/video...\``);
            }
            const waitMsg = await msg.reply(`🔞 ${subCmd}p kalitede hazırlanıyor...`);
            return handleDownload(client, msg, url, subCmd, waitMsg);
        }

        // .adult [url] — direkt indirme
        const url = args[0];
        if (url && url.startsWith('http') && isAdultUrl(url)) {
            const waitMsg = await msg.reply('🔞 Video analiz ediliyor...');
            return handleDownload(client, msg, url, '720', waitMsg);
        }

        if (url && url.startsWith('http') && !isAdultUrl(url)) {
            return msg.reply('⛔ Bu site desteklenmiyor.\n💡 Desteklenen siteler için `.adult` yazın.');
        }

        msg.reply('❓ Bilinmeyen komut. Kullanım için `.adult` yazın.');
    }
};
