const https = require('https');
const http = require('http');
const url = require('url');
const { isAuthorized } = require('../utils/auth');

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        if (!isAuthorized(senderId)) {
            return msg.reply('⛔ Bu komutu kullanmak için Admin yetkisi gerekiyor.');
        }

        const target = args[0];
        if (!target) {
            return msg.reply(
                '🌐 *Ping / Uptime Kontrolü*\n\n' +
                'Kullanım: `.ping [URL veya domain]`\n\n' +
                '_Örnekler:_\n' +
                '`.ping google.com`\n' +
                '`.ping https://example.com`\n' +
                '`.ping 1.1.1.1`'
            );
        }

        const waitMsg = await msg.reply(`🌐 ${target} hedefine ping atılıyor...`);

        try {
            // URL normalize et
            let targetUrl = target;
            if (!targetUrl.startsWith('http')) {
                targetUrl = 'https://' + targetUrl;
            }

            const parsed = new URL(targetUrl);
            const isHttps = parsed.protocol === 'https:';
            const lib = isHttps ? https : http;

            const startTime = Date.now();

            const result = await new Promise((resolve, reject) => {
                const req = lib.request({
                    hostname: parsed.hostname,
                    port: parsed.port || (isHttps ? 443 : 80),
                    path: parsed.pathname || '/',
                    method: 'HEAD',
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; PingBot/1.0)'
                    }
                }, (res) => {
                    const endTime = Date.now();
                    resolve({
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        responseTime: endTime - startTime,
                        headers: res.headers,
                        httpVersion: res.httpVersion
                    });
                });

                req.on('error', (err) => reject(err));
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Zaman aşımı (10s)'));
                });
                req.end();
            });

            // Status emoji
            let statusEmoji = '🟢';
            if (result.statusCode >= 400) statusEmoji = '🔴';
            else if (result.statusCode >= 300) statusEmoji = '🟡';

            // Ping süresi emoji
            let speedEmoji = '⚡';
            if (result.responseTime > 500) speedEmoji = '🐌';
            else if (result.responseTime > 200) speedEmoji = '🚀';

            let text = `🌐 *Ping Raporu: ${parsed.hostname}*\n\n`;
            text += `${statusEmoji} *Status:* ${result.statusCode} ${result.statusMessage}\n`;
            text += `${speedEmoji} *Yanıt Süresi:* ${result.responseTime}ms\n`;
            text += `🔒 *Protokol:* HTTP/${result.httpVersion} (${isHttps ? 'HTTPS ✅' : 'HTTP ⚠️'})\n`;

            // Sunucu bilgileri
            if (result.headers.server) text += `🖥️ *Sunucu:* ${result.headers.server}\n`;
            if (result.headers['content-type']) text += `📄 *Content-Type:* ${result.headers['content-type'].split(';')[0]}\n`;
            if (result.headers['x-powered-by']) text += `⚙️ *Powered By:* ${result.headers['x-powered-by']}\n`;

            // SSL
            if (isHttps) {
                text += `🔐 *SSL:* Aktif\n`;
            }

            // Cloudflare algılama
            if (result.headers.server && result.headers.server.toLowerCase().includes('cloudflare')) {
                text += `☁️ *CDN:* Cloudflare\n`;
            }

            text += `\n⏱ _${new Date().toLocaleString('tr-TR')}_`;
            await waitMsg.edit(text);

        } catch (err) {
            console.error('Ping hatası:', err.message);
            if (waitMsg.edit) {
                await waitMsg.edit(
                    `🌐 *Ping Raporu: ${target}*\n\n` +
                    `🔴 *Status:* Ulaşılamıyor\n` +
                    `❌ *Hata:* ${err.message}\n\n` +
                    `_Site kapalı, domain yanlış veya güvenlik duvarı engelliyor olabilir._`
                );
            } else {
                msg.reply('⛔ Ping başarısız: ' + err.message);
            }
        }
    }
};
