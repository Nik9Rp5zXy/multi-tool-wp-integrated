const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');

// URL normalizasyon ve deneme listesi üretici
function buildUrlCandidates(input) {
    const candidates = [];
    let base = input.trim();

    // Protokol temizle
    const stripped = base.replace(/^https?:\/\//i, '').replace(/^\/\//, '');

    // www varyantları
    const withWww = stripped.startsWith('www.') ? stripped : `www.${stripped}`;
    const withoutWww = stripped.startsWith('www.') ? stripped.slice(4) : stripped;

    // Trailing slash varyantları
    const addSlash = (u) => u.endsWith('/') ? u : u + '/';
    const noSlash = (u) => u.replace(/\/$/, '');

    // Öncelik sırası: https > http, www > no-www, slash > no-slash
    const roots = [withWww, withoutWww];
    const protocols = ['https', 'http'];

    for (const proto of protocols) {
        for (const root of roots) {
            candidates.push(`${proto}://${noSlash(root)}`);
            candidates.push(`${proto}://${addSlash(root)}`);
        }
    }

    // Tekrarları temizle, orijinal girişi öne al
    const original = base.startsWith('http') ? base : `https://${stripped}`;
    const unique = [original, ...candidates.filter(c => c !== original)];
    return [...new Set(unique)];
}

// Belirli bir URL'nin ekran görüntüsünü thum.io'dan çek
async function captureScreenshot(url) {
    const captureUrl = `https://image.thum.io/get/width/1080/viewportWidth/1200/noanimate/${url}`;
    const media = await MessageMedia.fromUrl(captureUrl, { unsafeMime: true });
    if (!media || !media.data || media.data.length < 100) {
        throw new Error('Boş veya geçersiz görüntü (site muhtemelen boş sayfa döndürdü)');
    }
    // MIME'ı her zaman image/png olarak zorla — bazı siteler
    // yanlış MIME döndürünce WhatsApp dosya olarak gönderiyor
    media.mimetype = 'image/png';
    media.filename = 'screenshot.png';
    return media;
}

// URL'nin erişilebilir olup olmadığını hızlıca kontrol et
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
                // 200-399 arası = erişilebilir, 4xx/5xx = sorunlu ama var
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
                '🕵️ *Gizli Web Gözetimi (SS)*\n\n' +
                'Kullanım: `.ss [URL]`\n\n' +
                '💡 Protokol, www veya slash unutsan da olur — bot otomatik dener:\n' +
                '`.ss google.com` → https + http + www + slash kombinasyonları\n' +
                '`.ss http://site.com` → önce https\'i de dener\n\n' +
                '🛡️ Sunucu IP\'n ve kimliğin asla hedef siteyle temas etmez.'
            );
        }

        const candidates = buildUrlCandidates(rawInput);
        const waitMsg = await msg.reply(
            `🕵️ *Web Gözetimi Başlatıldı*\n\n` +
            `🔍 ${candidates.length} farklı URL kombinasyonu sınanıyor...\n` +
            `_(https, http, www, slash varyantları)_`
        );

        let lastError = null;
        let attemptLog = [];

        for (let i = 0; i < candidates.length; i++) {
            const url = candidates[i];

            try {
                // Canlı deneme log'u — tek mesajı güncelle
                if (waitMsg.edit) {
                    await waitMsg.edit(
                        `🕵️ *Web Gözetimi*\n\n` +
                        `📡 Deneme ${i + 1}/${candidates.length}: \`${url}\`\n\n` +
                        (attemptLog.length > 0
                            ? `*Geçmiş:*\n` + attemptLog.slice(-3).join('\n') + '\n'
                            : '') +
                        `⏳ _Bağlantı test ediliyor..._`
                    );
                }

                // Önce erişilebilirliği kontrol et (çok hızlı)
                const reachable = await isReachable(url);
                if (!reachable) {
                    attemptLog.push(`❌ \`${url}\` — Erişilemiyor`);
                    continue;
                }

                // Erişilebilirse ekran görüntüsü dene
                if (waitMsg.edit) {
                    await waitMsg.edit(
                        `🕵️ *Web Gözetimi*\n\n` +
                        `📡 Deneme ${i + 1}/${candidates.length}: \`${url}\`\n\n` +
                        (attemptLog.length > 0
                            ? `*Geçmiş:*\n` + attemptLog.slice(-3).join('\n') + '\n'
                            : '') +
                        `📸 _Ekran görüntüsü alınıyor..._`
                    );
                }

                const media = await captureScreenshot(url);

                // Başarılı!
                await client.sendMessage(msg.from, media, {
                    caption:
                        `📸 *Web Ekran Görüntüsü*\n\n` +
                        `🌐 *URL:* ${url}\n` +
                        `🕵️ _Proxy üzerinden yakalandı. Sunucu kimliğiniz ve IP adresiniz hedef siteyle temas etmedi._\n` +
                        (i > 0 ? `\n💡 _${i} başarısız denemeden sonra bu URL çalıştı._` : '')
                });

                if (waitMsg.edit) {
                    await waitMsg.edit(
                        `✅ *Gözetim Başarılı!*\n\n` +
                        `🎯 Çalışan URL: \`${url}\`\n` +
                        (i > 0 ? `📋 ${i} başarısız denemeden sonra bulundu.` : `⚡ İlk denemede başarılı.`)
                    );
                }
                return; // Başarılı, döngüyü bitir

            } catch (err) {
                lastError = err;
                attemptLog.push(`❌ \`${url}\` — ${err.message.substring(0, 40)}`);
            }
        }

        // Tüm denemeler başarısız
        const failSummary = attemptLog.slice(-5).join('\n');
        if (waitMsg.edit) {
            await waitMsg.edit(
                `⛔ *${candidates.length} denemenin tamamı başarısız*\n\n` +
                `*Son denemeler:*\n${failSummary}\n\n` +
                `_Olası sebepler: Site kapalı, Cloudflare koruması aktif, bölge kısıtlaması veya URL hatalı._`
            );
        }
    }
};
