const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');

// HTML entity decode (bazı siteler title'da &amp; &comma; gibi döndürüyor)
function decodeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&comma;/gi, ',')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#\d+;/g, c => String.fromCharCode(parseInt(c.slice(2, -1))));
}

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

// ── Proxy Scraping Logic ───────────────────────────────────────────────────
const HEADER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function smartFetch(url, customHeaders = {}) {
    const baseHeaders = { 'User-Agent': HEADER_USER_AGENT, 'Referer': new URL(url).origin, ...customHeaders };
    try {
        const res = await axios.get(url, { headers: baseHeaders, timeout: 15000 });
        if (res.data && res.data.length > 500) return res.data;
    } catch {}
    try {
        const proxy1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res1 = await axios.get(proxy1, { headers: baseHeaders, timeout: 18000 });
        if (res1.data && res1.data.length > 500) return res1.data;
    } catch {}
    try {
        const proxy2 = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
        const res2 = await axios.get(proxy2, { headers: baseHeaders, timeout: 18000 });
        if (res2.data && res2.data.length > 500) return res2.data;
    } catch (e) {
        throw new Error('Güvenlik duvarı/Bölge kilidi (Proxy ile de aşılamadı).');
    }
}

// ── Site Scraper'ları ────────────────────────────────────────────────────────

// XVIDEOS & XNXX (aynı altyapı)
async function scrapeXvideos(url) {
    const html = await smartFetch(url);

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

// PORNHUB — çok katmanlı scraper
async function scrapePornhub(url) {
    // PH yaş doğrulama ve bölge cookie'leri
    const phHeaders = {
        ...HEADERS,
        'Cookie': 'accessAgeDisclaimerPH=1; accessAgeDisclaimerUK=1; accessPH=1; bs=; ss=; fg_d2151a1f=; platform=pc; age_verified=1',
    };

    const html = await smartFetch(url, phHeaders);

    const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || 'Video';
    const cleanTitle = title.replace(/ - Pornhub\.com/gi, '').trim();

    let videoUrl = null;

    // Yöntem 1: flashvars_ JSON → mediaDefinitions
    const flashMatch = html.match(/var\s+flashvars_\d+\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (flashMatch) {
        try {
            const flashvars = JSON.parse(flashMatch[1]);
            const mediaDefs = flashvars.mediaDefinitions || [];

            // Bazı mediaDefinitions elemanları direkt mp4 URL, bazıları API endpoint
            for (const def of mediaDefs.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0))) {
                if (!def.videoUrl) continue;
                if (def.videoUrl.includes('.m3u8')) continue; // HLS'i atla

                // Eğer direkt mp4 URL ise kullan
                if (def.videoUrl.includes('.mp4')) {
                    videoUrl = def.videoUrl;
                    break;
                }

                // API endpoint ise (mp4 içermiyor) — resolve et
                try {
                    const apiRes = await axios.get(def.videoUrl, {
                        headers: phHeaders,
                        timeout: 8000,
                        maxRedirects: 5,
                    });
                    // API genelde JSON array döndürür
                    if (Array.isArray(apiRes.data)) {
                        const mp4s = apiRes.data
                            .filter(d => d.videoUrl && d.videoUrl.includes('.mp4'))
                            .sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
                        if (mp4s.length > 0) { videoUrl = mp4s[0].videoUrl; break; }
                    } else if (typeof apiRes.data === 'string' && apiRes.data.includes('.mp4')) {
                        videoUrl = apiRes.data.trim();
                        break;
                    }
                } catch {}
            }
        } catch (e) {
            console.log('[PH Scraper] flashvars parse hatası:', e.message);
        }
    }

    // Yöntem 2: quality_ değişkenleri
    if (!videoUrl) {
        const q720 = (html.match(/quality_720p\s*=\s*'([^']+)'/i) || [])[1];
        const q480 = (html.match(/quality_480p\s*=\s*'([^']+)'/i) || [])[1];
        const q240 = (html.match(/quality_240p\s*=\s*'([^']+)'/i) || [])[1];
        videoUrl = q720 || q480 || q240;
    }

    // Yöntem 3: Generic mp4 URL regex
    if (!videoUrl) {
        const mp4Match = html.match(/"(https?:\/\/[^"]+\.mp4[^"]*)"/) ||
                         html.match(/'(https?:\/\/[^']+\.mp4[^']*)'/);
        if (mp4Match) videoUrl = mp4Match[1];
    }

    // Yöntem 4: videoUrl JSON key
    if (!videoUrl) {
        const jsonMatch = html.match(/"videoUrl"\s*:\s*"(https?:[^"]+)"/) ||
                         html.match(/"video_url"\s*:\s*"(https?:[^"]+)"/);
        if (jsonMatch) videoUrl = jsonMatch[1].replace(/\\\//g, '/');
    }

    const durationMatch = html.match(/"duration"\s*:\s*"?(\d+)"?/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

    if (!videoUrl) {
        // Debug: sayfada ne var?
        const hasFlashvars = html.includes('flashvars_');
        const hasMediaDef = html.includes('mediaDefinitions');
        const hasQuality = html.includes('quality_');
        const pageLen = html.length;
        throw new Error(
            `PH video URL bulunamadı. Sayfa: ${pageLen} byte, ` +
            `flashvars:${hasFlashvars}, mediaDef:${hasMediaDef}, quality:${hasQuality}. ` +
            `Site sunucudan erişimi engelliyor olabilir.`
        );
    }

    return { title: cleanTitle, videoUrl, duration, site: 'pornhub' };
}

// XHAMSTER
async function scrapeXhamster(url) {
    const html = await smartFetch(url);

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
    const html = await smartFetch(url);

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
    const html = await smartFetch(url);

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
    const html = await smartFetch(url);
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

// ── Proxy Bypasser İle Video İndirme (Stream) ───────────────────────────────
async function downloadSafeStream(videoUrl, outputPath, originalUrl) {
    // 1. Doğrudan video URL'si
    // 2. Eğer CDN 403 atarsa corsproxy ile atlamaya çalış
    const downloadUrls = [
        videoUrl,
        `https://corsproxy.io/?url=${encodeURIComponent(videoUrl)}`
    ];

    let lastErr = null;
    for (let i = 0; i < downloadUrls.length; i++) {
        const u = downloadUrls[i];
        try {
            const response = await axios({
                method: 'GET',
                url: u,
                responseType: 'stream',
                timeout: 180000, // 3 dk timeout
                headers: {
                    'User-Agent': HEADER_USER_AGENT,
                    'Referer': new URL(originalUrl).origin,
                }
            });

            const writer = fs.createWriteStream(outputPath);
            await new Promise((resolve, reject) => {
                response.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
                response.data.on('error', reject);
            });

            // Başarılı inmiş mi kontrol et
            const stats = fs.statSync(outputPath);
            if (stats.size > 50000) return stats.size; // > 50KB ise indirilmiştir
        } catch (err) {
            lastErr = err;
            if (fs.existsSync(outputPath)) cleanUp(outputPath);
        }
    }
    throw lastErr || new Error('Video dosyasına proxy destekli indirme başarısız oldu.');
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

// Gü venli edit — hata olursa sessizce geçer
async function safeEdit(waitMsg, text) {
    try { if (waitMsg && waitMsg.edit) await waitMsg.edit(text); } catch {}
}

// ffprobe ile video süresini oku (saniye)
async function getVideoDuration(filePath) {
    const { execSync } = require('child_process');
    try {
        const out = execSync(
            `ffprobe -v quiet -print_format json -show_streams "${filePath}"`,
            { timeout: 10000 }
        ).toString();
        const json = JSON.parse(out);
        const stream = json.streams.find(s => s.codec_type === 'video' || s.duration);
        return stream ? Math.floor(parseFloat(stream.duration || '0')) : 0;
    } catch {
        return 0;
    }
}

// Video part'lara böl ve VIDEO olarak her parçayı gönder
async function splitAndSendParts(client, msg, filePath, title, totalMB, waitMsg) {
    const PART_LIMIT_MB = 48; // WA'nın inline video sınırı ~50MB güvenli taraf
    const partCount = Math.ceil(totalMB / PART_LIMIT_MB);
    const timestamp = Date.now();
    const partPaths = [];

    // Gerçek süreyi ffprobe ile ölç
    await safeEdit(waitMsg, `video analiz ediliyor...`);
    const durationSec = await getVideoDuration(filePath);
    const partDurationSec = durationSec > 0 ? Math.floor(durationSec / partCount) : 0;

    await safeEdit(waitMsg,
        `${totalMB.toFixed(1)} MB — ${partCount} parçaya bölünüyor\n` +
        (durationSec > 0
            ? `toplam süre: ${formatDuration(durationSec)}, her part ~${formatDuration(partDurationSec)}`
            : 'süre tespit edilemedi, dosya boyutuna göre bölünecek')
    );

    if (durationSec > 0 && partDurationSec > 0) {
        // Süre bazlı bölme (en güvenilir yöntem)
        for (let i = 0; i < partCount; i++) {
            const startSec = i * partDurationSec;
            const partPath = path.join(path.dirname(filePath), `adult_part${i + 1}_${timestamp}.mp4`);
            partPaths.push(partPath);

            await safeEdit(waitMsg, `part ${i + 1}/${partCount} hazırlanıyor...`);

            try {
                const isLast = i === partCount - 1;
                // -ss önce -i'dan ve keyframe'e atlat, re-encode'suz kesim
                const cmd = `ffmpeg -y -ss ${startSec} ${isLast ? '' : `-t ${partDurationSec}`} -i "${filePath}" -c copy -avoid_negative_ts make_zero "${partPath}" -loglevel error`;
                execSync(cmd, { timeout: 180000 });
            } catch (e) {
                console.error(`[Split] Part ${i + 1} hatası:`, e.stderr?.toString() || e.message);
                // Re-encode ile tekrar dene
                try {
                    const isLast = i === partCount - 1;
                    const cmd = `ffmpeg -y -ss ${startSec} ${isLast ? '' : `-t ${partDurationSec}`} -i "${filePath}" -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 128k "${partPath}" -loglevel error`;
                    execSync(cmd, { timeout: 300000 });
                } catch (e2) {
                    console.error(`[Split] Part ${i + 1} re-encode da başarısız:`, e2.message);
                    continue;
                }
            }

            if (!fs.existsSync(partPath) || fs.statSync(partPath).size < 1000) continue;

            const partSizeMB = fs.statSync(partPath).size / (1024 * 1024);
            const media = MessageMedia.fromFilePath(partPath);
            const caption = `${decodeHtml(title).substring(0, 70)}\nPart ${i + 1}/${partCount} | ${partSizeMB.toFixed(1)} MB`;

            await safeEdit(waitMsg, `part ${i + 1}/${partCount} gönderiliyor... (${partSizeMB.toFixed(1)} MB)`);

            // Video olarak gönder (sendMediaAsDocument YOK)
            await client.sendMessage(msg.from, media, { caption });
        }
    } else {
        // Süre tespit edilemedi — teki gönder
        const media = MessageMedia.fromFilePath(filePath);
        await client.sendMessage(msg.from, media, {
            caption: `${decodeHtml(title).substring(0, 70)} | ${totalMB.toFixed(1)} MB`
        });
    }

    // Temp dosyaların tamamini temizle
    for (const p of partPaths) cleanUp(p);
    await safeEdit(waitMsg, `${partCount} part video olarak gönderildi — ${totalMB.toFixed(1)} MB`);
}

// Video indir ve gönder
async function handleDownload(client, msg, url, waitMsg) {
    const timestamp = Date.now();
    const outputPath = path.join(__dirname, '../../temp', `adult_${timestamp}.mp4`);

    try {
        await safeEdit(waitMsg, 'sayfa kazınıyor, video akışı aranıyor...');

        const info = await scrapeVideo(url);
        const cleanTitle = decodeHtml(info.title);

        await safeEdit(waitMsg,
            `bulundu — ${info.site}\n` +
            `${cleanTitle.substring(0, 60)}\n` +
            `süre: ${formatDuration(info.duration)}\n\n` +
            `indiriliyor...`
        );

        await downloadSafeStream(info.videoUrl, outputPath, url);

        if (!fs.existsSync(outputPath)) throw new Error('dosya kaydedilemedi');

        const stats = fs.statSync(outputPath);
        const sizeMB = stats.size / (1024 * 1024);

        // 50 MB üstü → video parçalara bölünecek
        if (sizeMB > 50) {
            await safeEdit(waitMsg, `${sizeMB.toFixed(1)} MB — parçalara bölünüyor (50 MB/part)...`);
            await splitAndSendParts(client, msg, outputPath, cleanTitle, sizeMB, waitMsg);
        } else {
            // Küçük video — direkt video olarak gönder
            await safeEdit(waitMsg, `gönderiliyor... (${sizeMB.toFixed(1)} MB)`);
            const media = MessageMedia.fromFilePath(outputPath);
            const caption = `${cleanTitle.substring(0, 80)}\n${formatDuration(info.duration)} | ${sizeMB.toFixed(1)} MB`;

            // Video olarak gönder (sendMediaAsDocument YOK = inline video)
            await client.sendMessage(msg.from, media, { caption });
            await safeEdit(waitMsg, `tamam — ${sizeMB.toFixed(1)} MB video olarak gönderildi`);
        }

    } catch (err) {
        console.error('[Adult] Hata:', err.message, err.stack);
        let errMsg = 'video indirilemedi — ';
        if (err.message.includes('403')) errMsg += 'site erişimi engelliyor';
        else if (err.message.includes('404')) errMsg += 'video silinmiş veya url hatalı';
        else if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) errMsg += 'bağlantı zaman aşımı';
        else errMsg += err.message.substring(0, 150);
        await safeEdit(waitMsg, errMsg);
    } finally {
        cleanUp(outputPath);
    }
}

// Ses çıkarma (ffmpeg — execSync)
async function handleAudio(client, msg, url, waitMsg) {
    const timestamp = Date.now();
    const videoPath = path.join(__dirname, '../../temp', `adult_v_${timestamp}.mp4`);
    const audioPath = path.join(__dirname, '../../temp', `adult_a_${timestamp}.mp3`);

    try {
        await safeEdit(waitMsg, 'ses çıkarılıyor... önce video indiriliyor');

        const info = await scrapeVideo(url);
        await downloadSafeStream(info.videoUrl, videoPath, url);

        if (!fs.existsSync(videoPath)) throw new Error('video indirilemedi');

        await safeEdit(waitMsg, 'ffmpeg ile ses ayrıştırılıyor...');

        execSync(
            `ffmpeg -y -i "${videoPath}" -vn -codec:a libmp3lame -b:a 192k "${audioPath}" -loglevel error`,
            { timeout: 120000 }
        );

        if (!fs.existsSync(audioPath)) throw new Error('ses dosyası oluşturulamadı');

        const sizeMB = (fs.statSync(audioPath).size / (1024 * 1024)).toFixed(1);
        const media = MessageMedia.fromFilePath(audioPath);

        await client.sendMessage(msg.from, media, {
            caption: `${decodeHtml(info.title).substring(0, 80)} | ${sizeMB} MB`
        });
        await safeEdit(waitMsg, `ses çıkarıldı — ${sizeMB} MB`);
    } catch (err) {
        console.error('[Adult Audio] Hata:', err.message);
        await safeEdit(waitMsg, `ses çıkarılamadı: ${err.message.substring(0, 100)}`);
    } finally {
        cleanUp(videoPath);
        cleanUp(audioPath);
    }
}

// Arama (web scraping) — sayfa+randomizasyon destekli
async function handleSearch(client, msg, args, waitMsg) {
    const SEARCH_SITES = {
        'xvideos': {
            buildUrl: (q, page) => `https://www.xvideos.com/?k=${encodeURIComponent(q)}&p=${page}`,
            base: 'https://www.xvideos.com',
            selector: '.mozaique .thumb-block',
            titleSel: '.thumb-under .title a',
            durationSel: '.duration',
        },
        'xnxx': {
            buildUrl: (q, page) => `https://www.xnxx.com/search/${encodeURIComponent(q)}/${page}`,
            base: 'https://www.xnxx.com',
            selector: '.mozaique .thumb-block',
            titleSel: '.thumb-under p a',
            durationSel: '.metadata',
        },
        'pornhub': {
            buildUrl: (q, page) => `https://www.pornhub.com/video/search?search=${encodeURIComponent(q)}&page=${page}`,
            base: 'https://www.pornhub.com',
            selector: '.pcVideoListItem',
            titleSel: '.title a',
            durationSel: '.duration',
        },
        'xhamster': {
            buildUrl: (q, page) => `https://xhamster.com/search/video?q=${encodeURIComponent(q)}&page=${page}`,
            base: 'https://xhamster.com',
            selector: '.video-thumb',
            titleSel: '.video-thumb-info__name',
            durationSel: '.duration',
        },
        'spankbang': {
            buildUrl: (q, page) => `https://spankbang.com/s/${encodeURIComponent(q)}/${page}/`,
            base: 'https://spankbang.com',
            selector: '.video-item',
            titleSel: '.n',
            durationSel: '.l',
        },
        'eporner': {
            buildUrl: (q, page) => `https://www.eporner.com/search/${encodeURIComponent(q)}/${page}/`,
            base: 'https://www.eporner.com',
            selector: '.mb',
            titleSel: '.mbtit a',
            durationSel: '.mbtim',
        }
    };

    // Args: [site?] [sayfa?] [...arama]
    let site = null;
    let pageOverride = null;
    let queryArgs = args.slice();

    if (queryArgs[0] && SEARCH_SITES[queryArgs[0].toLowerCase()]) {
        site = queryArgs.shift().toLowerCase();
    }
    // Sayfa belirtme: .adult ara 3 türk → 3. sayfa
    if (queryArgs[0] && /^\d+$/.test(queryArgs[0])) {
        pageOverride = parseInt(queryArgs.shift());
    }

    const query = queryArgs.join(' ');
    const selectedSite = site || 'xvideos';
    const cfg = SEARCH_SITES[selectedSite];

    if (!query) {
        return await safeEdit(waitMsg,
            '🔍 *Video Arama*\n\n' +
            'kullanım: .adult ara [arama]\n' +
            'sayfa ve site: .adult ara [site] [sayfa] [arama]\n\n' +
            'desteklenen siteler:\n' +
            Object.keys(SEARCH_SITES).join(', ') + '\n\n' +
            'örnekler:\n' +
            '.adult ara xnxx türk\n' +
            '.adult ara pornhub 2 stepmom\n' +
            '.adult ara xhamster amateur'
        );
    }

    // Sayfa belirtilmediyse rastgele bir sayfa seç (1-5 arası) — farklı sonuçlar için
    const page = pageOverride !== null ? pageOverride : Math.floor(Math.random() * 5) + 1;

    try {
        await waitMsg.edit(
            `🔍 *Aranıyor...*\n` +
            `📌 "${query.substring(0, 40)}" — ${selectedSite}, sayfa ${page}`
        );

        const searchUrl = cfg.buildUrl(query, page);
        const { data: html } = await axios.get(searchUrl, {
            headers: HEADERS, timeout: 12000
        });

        const $ = cheerio.load(html);
        const allResults = [];

        // Tüm sonuçları topla
        $(cfg.selector).each((i, el) => {
            const a = $(el).find(`${cfg.titleSel}, .thumb-under p a`).first();
            const dur = $(el).find(cfg.durationSel).first().text().trim();
            const title = a.attr('title') || a.text().trim();
            let href = a.attr('href') || '';
            if (href && !href.startsWith('http')) href = cfg.base + href;
            if (title && href) allResults.push({ title, url: href, duration: dur || '?' });
        });

        if (allResults.length === 0) {
            return await waitMsg.edit(
                `🔍 Sayfa ${page}'de "${query}" için sonuç bulunamadı.\n\n` +
                `💡 Başka bir arama veya sayfa deneyin: \`.adult ara 1 ${query}\``
            );
        }

        // Rastgele 5 tanesi seç (her çağrıda farklı sonuçlar)
        const shuffled = allResults.sort(() => Math.random() - 0.5).slice(0, 5);

        let text = `🔍 *"${query.substring(0, 35)}"* | ${selectedSite} | Sayfa ${page}\n`;
        text += `📊 ${allResults.length} sonuçtan 5 rastgele seçildi\n\n`;

        shuffled.forEach((r, i) => {
            text += `*${i + 1}.* ${r.title.substring(0, 55)}${r.title.length > 55 ? '...' : ''}\n`;
            text += `   ⏱️ ${r.duration} | 🔗 ${r.url}\n\n`;
        });

        text += `💡 Farklı sonuçlar: \`.adult ara ${query}\`\n`;
        text += `📄 Sayfa değiştir: \`.adult ara ${page + 1} ${query}\`\n`;
        text += `⬇️ İndirmek için: \`.adult [URL]\``;

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
