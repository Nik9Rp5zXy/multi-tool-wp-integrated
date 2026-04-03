const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');

// ── Sabitler ─────────────────────────────────────────────────────────────────
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

const SUPPORTED_SITES = [
    'xvideos', 'xnxx', 'pornhub', 'xhamster', 'redtube',
    'youporn', 'tube8', 'spankbang', 'eporner', 'beeg'
];

function formatSize(bytes) {
    if (!bytes) return '?';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectSite(url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        return SUPPORTED_SITES.find(s => hostname.includes(s)) || null;
    } catch { return null; }
}

// ── Site Scraper'ları ────────────────────────────────────────────────────────

// XVIDEOS & XNXX (aynı altyapı)
async function scrapeXvideos(url) {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 12000 });

    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Video';
    const cleanTitle = title.replace(/ - XVIDEOS\.COM| - XNXX\.COM/gi, '').trim();

    // Video URL'leri script tag'lerinden çıkar
    const highUrl = (html.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/i) || [])[1];
    const lowUrl = (html.match(/html5player\.setVideoUrlLow\('([^']+)'\)/i) || [])[1];
    const hlsUrl = (html.match(/html5player\.setVideoHLS\('([^']+)'\)/i) || [])[1];

    // Süre
    const durationMatch = html.match(/html5player\.setVideoDuration\((\d+)\)/i) || html.match(/"duration"\s*:\s*(\d+)/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    const videoUrl = highUrl || lowUrl;
    if (!videoUrl) throw new Error('Video akışı bulunamadı (site yapısı değişmiş olabilir)');

    return { title: cleanTitle, videoUrl, duration, site: 'xvideos' };
}

// PORNHUB
async function scrapePornhub(url) {
    const { data: html } = await axios.get(url, { headers: { ...HEADERS, Cookie: 'accessAgeDisclaimerPH=1' }, timeout: 12000 });

    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Video';
    const cleanTitle = title.replace(/ - Pornhub\.com/gi, '').trim();

    // flashvars veya mediaDefinitions'dan URL çıkar
    let videoUrl = null;

    // Yöntem 1: mediaDefinitions JSON
    const mediaMatch = html.match(/var\s+flashvars_\d+\s*=\s*(\{[\s\S]*?\});/);
    if (mediaMatch) {
        try {
            const flashvars = JSON.parse(mediaMatch[1]);
            const mediaDefs = flashvars.mediaDefinitions || [];
            // En yüksek kaliteyi bul (mp4 olanları filtrele, HLS değil)
            const mp4s = mediaDefs
                .filter(m => m.format === 'mp4' && m.videoUrl && !m.videoUrl.includes('.m3u8'))
                .sort((a, b) => (b.quality || 0) - (a.quality || 0));
            if (mp4s.length > 0) videoUrl = mp4s[0].videoUrl;
        } catch {}
    }

    // Yöntem 2: quality_ değişkenlerinden
    if (!videoUrl) {
        const q720 = (html.match(/quality_720p\s*=\s*'([^']+)'/i) || [])[1];
        const q480 = (html.match(/quality_480p\s*=\s*'([^']+)'/i) || [])[1];
        const q240 = (html.match(/quality_240p\s*=\s*'([^']+)'/i) || [])[1];
        videoUrl = q720 || q480 || q240;
    }

    // Süre
    const durationMatch = html.match(/"duration"\s*:\s*"?(\d+)"?/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    if (!videoUrl) throw new Error('Pornhub video URL çıkarılamadı (giriş/yaş doğrulama engelliyor olabilir)');

    return { title: cleanTitle, videoUrl, duration, site: 'pornhub' };
}

// XHAMSTER
async function scrapeXhamster(url) {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 12000 });

    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Video';
    const cleanTitle = title.replace(/ - xHamster\.com/gi, '').trim();

    // initials JSON'dan video URL çıkar
    let videoUrl = null;
    const initialsMatch = html.match(/window\.initials\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (initialsMatch) {
        try {
            const initials = JSON.parse(initialsMatch[1]);
            const sources = initials?.videoModel?.sources?.mp4 || initials?.xplayerSettings?.sources?.mp4 || {};
            // En yüksek kalite
            const qualities = Object.entries(sources).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
            if (qualities.length > 0) videoUrl = qualities[0][1];
        } catch {}
    }

    // Yedek: mp4 URL regex
    if (!videoUrl) {
        const mp4Match = html.match(/"(https?:\/\/[^"]+\.mp4[^"]*)"/) ||
                          html.match(/'(https?:\/\/[^']+\.mp4[^']*)'/);
        if (mp4Match) videoUrl = mp4Match[1];
    }

    const durationMatch = html.match(/"duration"\s*:\s*"?(\d+)"?/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    if (!videoUrl) throw new Error('xHamster video URL çıkarılamadı');

    return { title: cleanTitle, videoUrl, duration, site: 'xhamster' };
}

// REDTUBE / YOUPORN / TUBE8 (Aylo altyapısı)
async function scrapeRedtube(url) {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 12000 });

    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Video';
    const cleanTitle = title.replace(/ - RedTube| - YouPorn| - Tube8/gi, '').trim();

    let videoUrl = null;

    // mediaDefinition JSON
    const mediaMatch = html.match(/mediaDefinition[s]?\s*[=:]\s*(\[[\s\S]*?\])/);
    if (mediaMatch) {
        try {
            const defs = JSON.parse(mediaMatch[1]);
            const mp4s = defs
                .filter(d => d.format === 'mp4' && d.videoUrl)
                .sort((a, b) => (b.quality || 0) - (a.quality || 0));
            if (mp4s.length > 0) videoUrl = mp4s[0].videoUrl;
        } catch {}
    }

    // Yedek: basit mp4 regex
    if (!videoUrl) {
        const mp4Match = html.match(/"videoUrl"\s*:\s*"(https?:[^"]+\.mp4[^"]*)"/);
        if (mp4Match) videoUrl = mp4Match[1].replace(/\\\//g, '/');
    }

    const durationMatch = html.match(/"duration"\s*:\s*"?(\d+)"?/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    if (!videoUrl) throw new Error('Video URL çıkarılamadı');

    return { title: cleanTitle, videoUrl, duration, site: 'redtube' };
}

// SPANKBANG
async function scrapeSpankbang(url) {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 12000 });

    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Video';
    const cleanTitle = title.replace(/ - SpankBang/gi, '').trim();

    // stream_data JSON'dan
    let videoUrl = null;
    const streamMatch = html.match(/stream_data\s*=\s*(\{[^}]+\})/);
    if (streamMatch) {
        try {
            const streams = JSON.parse(streamMatch[1]);
            videoUrl = streams['720p'] || streams['480p'] || streams['240p'] || Object.values(streams).find(v => typeof v === 'string' && v.startsWith('http'));
        } catch {}
    }
    if (!videoUrl) {
        const mp4Match = html.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
        if (mp4Match) videoUrl = mp4Match[1];
    }

    if (!videoUrl) throw new Error('SpankBang video URL çıkarılamadı');
    return { title: cleanTitle, videoUrl, duration: 0, site: 'spankbang' };
}

// EPORNER
async function scrapeEporner(url) {
    const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 12000 });
    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Video';
    const cleanTitle = title.replace(/ - EPORNER/gi, '').trim();

    let videoUrl = null;
    // EP video sourcelari genelde script'te JSON olarak bulunur
    const srcMatch = html.match(/"src"\s*:\s*"(https?:[^"]+\.mp4[^"]*)"/);
    if (srcMatch) videoUrl = srcMatch[1].replace(/\\\//g, '/');

    if (!videoUrl) {
        const mp4Match = html.match(/(https?:\/\/[^\s"']+\.mp4[^\s"']*)/i);
        if (mp4Match) videoUrl = mp4Match[1];
    }

    if (!videoUrl) throw new Error('Eporner video URL çıkarılamadı');
    return { title: cleanTitle, videoUrl, duration: 0, site: 'eporner' };
}

// ── Ana scraper yönlendirici ─────────────────────────────────────────────────
async function scrapeVideo(url) {
    const site = detectSite(url);
    if (!site) throw new Error('Desteklenmeyen site');

    switch (site) {
        case 'xvideos': case 'xnxx': return scrapeXvideos(url);
        case 'pornhub': return scrapePornhub(url);
        case 'xhamster': return scrapeXhamster(url);
        case 'redtube': case 'youporn': case 'tube8': return scrapeRedtube(url);
        case 'spankbang': return scrapeSpankbang(url);
        case 'eporner': return scrapeEporner(url);
        default: throw new Error(`${site} için scraper henüz yok`);
    }
}

// ── Doğrudan axios ile video indir (stream) ──────────────────────────────────
async function downloadVideo(videoUrl, outputPath) {
    const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream',
        timeout: 120000, // 2 dk indirme süresi
        headers: {
            ...HEADERS,
            'Referer': new URL(videoUrl).origin,
        }
    });

    const totalBytes = parseInt(response.headers['content-length'] || '0');
    const writer = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => resolve(totalBytes));
        writer.on('error', reject);
        response.data.on('error', reject);
    });
}

function formatDuration(seconds) {
    if (!seconds) return '?';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Alt komutlar ─────────────────────────────────────────────────────────────

// Bilgi kartı (indirmeden)
async function handleInfo(client, msg, url, waitMsg) {
    try {
        const info = await scrapeVideo(url);
        let text = `🔞 *Video Bilgi Kartı*\n\n`;
        text += `📹 *Başlık:* ${info.title.substring(0, 80)}\n`;
        text += `⏱️ *Süre:* ${formatDuration(info.duration)}\n`;
        text += `🌐 *Site:* ${info.site}\n`;
        text += `\n💡 İndirmek için: \`.adult ${url}\``;
        await waitMsg.edit(text);
    } catch (err) {
        await waitMsg.edit(`⛔ Bilgi alınamadı.\n🔍 ${err.message.substring(0, 100)}`);
    }
}

// Video indir ve gönder
async function handleDownload(client, msg, url, waitMsg) {
    const timestamp = Date.now();
    const outputPath = path.join(__dirname, '../../temp', `adult_${timestamp}.mp4`);

    try {
        // Aşama 1: Sayfa kazı, video URL'sini bul
        await waitMsg.edit('🔞 *Video analiz ediliyor...*\n\n🔍 Sayfa kazınıyor, video akışı aranıyor...');

        const info = await scrapeVideo(url);

        await waitMsg.edit(
            `🔞 *Video Bulundu — İndiriliyor*\n\n` +
            `📹 *${info.title.substring(0, 55)}${info.title.length > 55 ? '...' : ''}*\n` +
            `⏱️ Süre: ${formatDuration(info.duration)}\n` +
            `🌐 ${info.site}\n\n` +
            `⏳ Doğrudan akış indiriliyor...`
        );

        // Aşama 2: Video dosyasını doğrudan indir
        await downloadVideo(info.videoUrl, outputPath);

        if (!fs.existsSync(outputPath)) throw new Error('Dosya diske kaydedilemedi.');

        const stats = fs.statSync(outputPath);
        const sizeMB = stats.size / (1024 * 1024);

        if (sizeMB > 95) {
            return await waitMsg.edit(
                `⛔ *Video çok büyük* (${sizeMB.toFixed(1)} MB)\n` +
                `WhatsApp max 95 MB destekler.`
            );
        }

        // Aşama 3: WhatsApp'a gönder
        await waitMsg.edit(`📤 *WhatsApp'a aktarılıyor...* (${sizeMB.toFixed(1)} MB)`);

        const media = MessageMedia.fromFilePath(outputPath);
        const caption = `🔞 *${info.title.substring(0, 80)}*\n⏱️ ${formatDuration(info.duration)} | 📦 ${sizeMB.toFixed(1)} MB`;

        if (sizeMB > 15) {
            await client.sendMessage(msg.from, media, { sendMediaAsDocument: true, caption });
        } else {
            await client.sendMessage(msg.from, media, { caption });
        }

        await waitMsg.edit(`✅ *Video aktarıldı!*\n📦 ${sizeMB.toFixed(1)} MB | ⏱️ ${formatDuration(info.duration)}`);

    } catch (err) {
        console.error('[Adult] Hata:', err.message);
        let errMsg = '⛔ *Video indirilemedi.*\n\n';
        if (err.message.includes('Request failed with status code 403')) errMsg += '🔒 Site erişimi engelliyor (bölge/yaş doğrulama).';
        else if (err.message.includes('404')) errMsg += '❌ Video silinmiş veya URL hatalı.';
        else if (err.message.includes('timeout')) errMsg += '⏱️ Bağlantı zaman aşımına uğradı.';
        else errMsg += `🔍 ${err.message.substring(0, 120)}`;
        await waitMsg.edit(errMsg);
    } finally {
        cleanUp(outputPath);
    }
}

// Ses çıkarma (FFmpeg ile)
async function handleAudio(client, msg, url, waitMsg) {
    const timestamp = Date.now();
    const videoPath = path.join(__dirname, '../../temp', `adult_v_${timestamp}.mp4`);
    const audioPath = path.join(__dirname, '../../temp', `adult_a_${timestamp}.mp3`);

    try {
        await waitMsg.edit('🎵 *Ses çıkarılıyor...*\n\n🔍 Video indiriliyor...');

        const info = await scrapeVideo(url);
        await downloadVideo(info.videoUrl, videoPath);

        if (!fs.existsSync(videoPath)) throw new Error('Video indirilemedi.');

        await waitMsg.edit('🎵 *FFmpeg ile ses ayrıştırılıyor...*');

        // FFmpeg ile ses çıkar
        const ffmpeg = require('fluent-ffmpeg');
        await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .noVideo()
                .audioCodec('libmp3lame')
                .audioBitrate('192k')
                .output(audioPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        const stats = fs.statSync(audioPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

        const media = MessageMedia.fromFilePath(audioPath);
        await client.sendMessage(msg.from, media, {
            caption: `🎵 *${info.title.substring(0, 80)}*\n📦 ${sizeMB} MB`
        });
        await waitMsg.edit(`✅ *Ses çıkarıldı!* 📦 ${sizeMB} MB`);
    } catch (err) {
        console.error('[Adult Audio] Hata:', err.message);
        await waitMsg.edit(`⛔ Ses çıkarılamadı.\n🔍 ${err.message.substring(0, 100)}`);
    } finally {
        cleanUp(videoPath);
        cleanUp(audioPath);
    }
}

// Arama (web scraping)
async function handleSearch(client, msg, args, waitMsg) {
    const SEARCH_SITES = {
        'xvideos': { url: 'https://www.xvideos.com/?k=', base: 'https://www.xvideos.com' },
        'xnxx': { url: 'https://www.xnxx.com/search/', base: 'https://www.xnxx.com' },
    };

    const site = args[0] && SEARCH_SITES[args[0].toLowerCase()] ? args[0].toLowerCase() : null;
    const query = site ? args.slice(1).join(' ') : args.join(' ');
    const selectedSite = site || 'xvideos';
    const cfg = SEARCH_SITES[selectedSite];

    if (!query) {
        return await waitMsg.edit(
            '🔍 *Video Arama*\n\n' +
            'Kullanım: `.adult ara [arama]`\n' +
            '`.adult ara xnxx [arama]`\n\n' +
            'Örnek: `.adult ara türk`'
        );
    }

    try {
        await waitMsg.edit(`🔍 "${query}" aranıyor (${selectedSite})...`);

        const { data: html } = await axios.get(`${cfg.url}${encodeURIComponent(query)}`, {
            headers: HEADERS, timeout: 12000
        });

        const $ = cheerio.load(html);
        const results = [];

        $('.mozaique .thumb-block').each((i, el) => {
            if (results.length >= 5) return false;
            const a = $(el).find('.thumb-under .title a, .thumb-under p a');
            const dur = $(el).find('.duration').text().trim();
            const title = a.attr('title') || a.text().trim();
            let href = a.attr('href') || '';
            if (href && !href.startsWith('http')) href = cfg.base + href;
            if (title && href) results.push({ title, url: href, duration: dur || '?' });
        });

        if (results.length === 0) return await waitMsg.edit(`🔍 "${query}" için sonuç bulunamadı.`);

        let text = `🔍 *"${query.substring(0, 35)}"* — ${results.length} sonuç (${selectedSite})\n\n`;
        results.forEach((r, i) => {
            text += `*${i + 1}.* ${r.title.substring(0, 55)}${r.title.length > 55 ? '...' : ''}\n`;
            text += `   ⏱️ ${r.duration} | 🔗 ${r.url}\n\n`;
        });
        text += `💡 \`.adult [URL]\` ile indir`;
        await waitMsg.edit(text);
    } catch (err) {
        console.error('[Adult Search]', err.message);
        await waitMsg.edit(`⛔ Arama başarısız.\n🔍 ${err.message.substring(0, 100)}`);
    }
}

// ── Ana modül ────────────────────────────────────────────────────────────────
module.exports = {
    execute: async (client, msg, args) => {
        const sub = args[0] ? args[0].toLowerCase() : '';

        if (!sub) {
            return msg.reply(
                '🔞 *Yetişkin Araç Kutusu*\n\n' +
                '*İndirme:*\n' +
                '• `.adult [URL]` — Video indir\n\n' +
                '*Araçlar:*\n' +
                '• `.adult bilgi [URL]` — Video bilgi kartı\n' +
                '• `.adult ses [URL]` — Sadece ses (MP3)\n' +
                '• `.adult ara [arama]` — Video arama\n' +
                '• `.adult ara xnxx [arama]` — xnxx\'te ara\n\n' +
                '*📌 Desteklenen:*\n' +
                SUPPORTED_SITES.map(s => `• ${s}`).join('\n')
            );
        }

        if (sub === 'bilgi' || sub === 'info') {
            const url = args[1];
            if (!url || !detectSite(url)) return msg.reply('Lütfen desteklenen bir URL girin.\nÖrnek: `.adult bilgi https://xvideos.com/...`');
            const w = await msg.reply('🔍 Bilgi çekiliyor...');
            return handleInfo(client, msg, url, w);
        }

        if (sub === 'ses' || sub === 'audio' || sub === 'mp3') {
            const url = args[1];
            if (!url || !detectSite(url)) return msg.reply('Lütfen desteklenen bir URL girin.\nÖrnek: `.adult ses https://xvideos.com/...`');
            const w = await msg.reply('🎵 Başlatılıyor...');
            return handleAudio(client, msg, url, w);
        }

        if (sub === 'ara' || sub === 'search') {
            const w = await msg.reply('🔍 Aranıyor...');
            return handleSearch(client, msg, args.slice(1), w);
        }

        // Direkt URL
        const url = args[0];
        if (url && url.startsWith('http')) {
            if (!detectSite(url)) return msg.reply('⛔ Bu site desteklenmiyor.\n💡 `.adult` yazarak listeye bak.');
            const w = await msg.reply('🔞 Analiz ediliyor...');
            return handleDownload(client, msg, url, w);
        }

        msg.reply('❓ Bilinmeyen komut. `.adult` yazarak kullanım kılavuzuna bak.');
    }
};
