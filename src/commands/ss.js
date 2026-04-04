const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

// URL normalizasyon ve deneme listesi üretici
function buildUrlCandidates(input) {
    const candidates = [];
    let base = input.trim();

    const stripped = base.replace(/^https?:\/\//i, '').replace(/^\/\//, '');
    const withWww = stripped.startsWith('www.') ? stripped : `www.${stripped}`;
    const withoutWww = stripped.startsWith('www.') ? stripped.slice(4) : stripped;

    const addSlash = (u) => u.endsWith('/') ? u : u + '/';
    const noSlash = (u) => u.replace(/\/$/, '');

    const roots = [withWww, withoutWww];
    const protocols = ['https', 'http'];

    for (const proto of protocols) {
        for (const root of roots) {
            candidates.push(`${proto}://${noSlash(root)}`);
            candidates.push(`${proto}://${addSlash(root)}`);
        }
    }

    const original = base.startsWith('http') ? base : `https://${stripped}`;
    const unique = [original, ...candidates.filter(c => c !== original)];
    return [...new Set(unique)];
}

// Ekran görüntüsü — sharp ile kesin PNG
async function captureScreenshot(url) {
    const sharp = require('sharp');
    const captureUrl = `https://image.thum.io/get/width/1080/viewportWidth/1200/noanimate/${url}`;

    const response = await axios.get(captureUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!response.data || response.data.length < 500) {
        throw new Error('boş görüntü döndü');
    }

    const pngBuffer = await sharp(Buffer.from(response.data)).png().toBuffer();
    return new MessageMedia('image/png', pngBuffer.toString('base64'), 'screenshot.png');
}

// Erişilebilirlik kontrolü
async function isReachable(url) {
    try {
        const https = require('https');
        const http = require('http');
        const { URL: URL_ } = require('url');
        const parsed = new URL_(url);
        const lib = parsed.protocol === 'https:' ? https : http;

        await new Promise((resolve, reject) => {
            const req = lib.request({
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path: parsed.pathname || '/',
                method: 'HEAD',
                timeout: 5000,
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' }
            }, (res) => {
                resolve(res.statusCode < 500);
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            req.end();
        });
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    execute: async (client, msg, args) => {
        const rawInput = args.join(' ').trim();

        if (!rawInput) {
            return msg.reply(
                'kullanım: .ss [url]\n\n' +
                'http/https, www, slash gibi hataları otomatik düzeltir\n' +
                'örnek: .ss google.com veya .ss http://site.com'
            );
        }

        const isGroup = msg.from && msg.from.endsWith('@g.us');
        const candidates = buildUrlCandidates(rawInput);

        // Grupta ara mesaj gönderme — doğrudan sonucu gönder
        let waitMsg = null;
        if (!isGroup) {
            waitMsg = await msg.reply(`taranıyor... (${candidates.length} kombinasyon)`);
        }

        const safeEdit = async (text) => {
            if (waitMsg) {
                try { await waitMsg.edit(text); } catch {}
            }
        };

        let lastError = null;
        const attemptLog = [];

        for (let i = 0; i < candidates.length; i++) {
            const url = candidates[i];

            try {
                await safeEdit(
                    `deneme ${i + 1}/${candidates.length}: ${url}\n` +
                    (attemptLog.length > 0 ? 'geçmiş:\n' + attemptLog.slice(-3).join('\n') + '\n' : '') +
                    'bağlantı test ediliyor...'
                );

                const reachable = await isReachable(url);
                if (!reachable) {
                    attemptLog.push(`- ${url} erişilemez`);
                    continue;
                }

                await safeEdit(
                    `deneme ${i + 1}/${candidates.length}: ${url}\n` +
                    (attemptLog.length > 0 ? 'geçmiş:\n' + attemptLog.slice(-3).join('\n') + '\n' : '') +
                    'ekran görüntüsü alınıyor...'
                );

                const media = await captureScreenshot(url);

                await client.sendMessage(msg.from, media, {
                    caption:
                        `url: ${url}\n` +
                        (i > 0 ? `(${i} başarısız denemeden sonra çalıştı)` : '')
                });

                await safeEdit(
                    `tamam!\n` +
                    `çalışan url: ${url}\n` +
                    (i > 0 ? `${i} denemeden sonra bulundu` : 'ilk denemede başarılı')
                );

                // Grupta "tamam" mesajı gönder
                if (isGroup) {
                    await msg.reply(`tamam — ${url}${i > 0 ? ` (${i} deneme sonra)` : ''}`);
                }

                return;

            } catch (err) {
                lastError = err;
                attemptLog.push(`- ${url}: ${err.message.substring(0, 40)}`);
            }
        }

        // Tüm denemeler başarısız
        const failSummary = attemptLog.slice(-5).join('\n');
        const failMsg = `${candidates.length} denemenin tamamı başarısız\n\n${failSummary}\n\nsite kapalı veya url hatalı olabilir`;

        if (waitMsg) {
            await safeEdit(failMsg);
        } else {
            await msg.reply(failMsg);
        }
    }
};
