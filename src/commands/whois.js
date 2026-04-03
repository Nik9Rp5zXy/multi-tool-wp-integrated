const axios = require('axios');
const dns = require('dns').promises;
const { isAuthorized } = require('../utils/auth');

// Ücretsiz IP Geolocation API — Key gerektirmez
const IP_API = 'http://ip-api.com/json';

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        if (!isAuthorized(senderId)) {
            return msg.reply('⛔ Bu komutu kullanmak için Admin yetkisi gerekiyor.');
        }

        const target = args[0];
        if (!target) {
            return msg.reply(
                '🔍 *WHOIS / IP Sorgusu*\n\n' +
                'Kullanım: `.whois [domain veya IP]`\n\n' +
                '_Örnekler:_\n' +
                '`.whois google.com`\n' +
                '`.whois 8.8.8.8`\n' +
                '`.whois cloudflare.com`'
            );
        }

        const waitMsg = await msg.reply(`🔍 ${target} sorgulanıyor...`);

        try {
            const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
            let resolvedIP = target;

            let text = `🔍 *Sorgu Raporu: ${target}*\n\n`;

            // Domain ise DNS çözümleme yap
            if (!isIP) {
                text += '🌐 *DNS Kayıtları:*\n';

                try {
                    const aRecords = await dns.resolve4(target);
                    resolvedIP = aRecords[0];
                    text += `📌 A Record: ${aRecords.join(', ')}\n`;
                } catch { text += '📌 A Record: Bulunamadı\n'; }

                try {
                    const mxRecords = await dns.resolveMx(target);
                    const mxList = mxRecords.sort((a, b) => a.priority - b.priority).slice(0, 3);
                    text += `📧 MX Record: ${mxList.map(r => `${r.exchange} (${r.priority})`).join(', ')}\n`;
                } catch { /* MX opsiyonel */ }

                try {
                    const nsRecords = await dns.resolveNs(target);
                    text += `🏷️ NS Record: ${nsRecords.slice(0, 3).join(', ')}\n`;
                } catch { /* NS opsiyonel */ }

                try {
                    const txtRecords = await dns.resolveTxt(target);
                    if (txtRecords.length > 0) {
                        text += `📝 TXT Record: ${txtRecords[0].join('').substring(0, 100)}...\n`;
                    }
                } catch { /* TXT opsiyonel */ }

                text += '\n';
            }

            // IP Geolocation
            if (resolvedIP && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(resolvedIP)) {
                const geoRes = await axios.get(`${IP_API}/${resolvedIP}?fields=status,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
                    timeout: 8000
                });

                const geo = geoRes.data;

                if (geo.status === 'success') {
                    text += '📍 *IP Geolocation:*\n';
                    text += `🌍 Ülke: ${geo.country}\n`;
                    text += `🏙️ Şehir: ${geo.city}, ${geo.regionName}\n`;
                    text += `📮 Posta Kodu: ${geo.zip || '—'}\n`;
                    text += `📡 ISP: ${geo.isp}\n`;
                    text += `🏢 Organizasyon: ${geo.org}\n`;
                    text += `🔢 AS: ${geo.as}\n`;
                    text += `🕐 Timezone: ${geo.timezone}\n`;
                    text += `📌 Koordinat: ${geo.lat}, ${geo.lon}\n`;
                    text += `🌐 IP: ${geo.query}\n`;
                }
            }

            text += `\n⏱ _${new Date().toLocaleString('tr-TR')}_`;
            await waitMsg.edit(text);

        } catch (err) {
            console.error('WHOIS hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit(`⛔ Sorgu başarısız oldu. Domain/IP geçerli olmayabilir.\nHata: ${err.message}`);
            else msg.reply('⛔ WHOIS sorgusu başarısız.');
        }
    }
};
