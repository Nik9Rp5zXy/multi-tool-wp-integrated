const axios = require('axios');

module.exports = {
    execute: async (client, msg, args) => {
        const url = args[0];

        if (!url || !url.startsWith('http')) {
            return msg.reply(
                '🔗 *URL Kısaltıcı*\n\n' +
                'Kullanım: `.kisalt [URL]`\n\n' +
                '_Örnek:_ `.kisalt https://www.youtube.com/watch?v=dQw4w9WgXcQ`'
            );
        }

        const waitMsg = await msg.reply('🔗 Link kısaltılıyor...');

        try {
            // TinyURL — Ücretsiz, sınırsız, API key gerektirmez
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
                timeout: 8000
            });

            const shortUrl = res.data;

            if (!shortUrl || !shortUrl.startsWith('http')) {
                throw new Error('Geçersiz yanıt');
            }

            await waitMsg.edit(
                `🔗 *URL Kısaltma Sonucu*\n\n` +
                `📎 *Kısa Link:* ${shortUrl}\n\n` +
                `📋 *Orijinal:* ${url.length > 80 ? url.substring(0, 80) + '...' : url}`
            );

        } catch (err) {
            console.error('URL kısaltma hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit('⛔ Link kısaltılamadı. URL geçerli olmayabilir.');
            else msg.reply('⛔ URL kısaltma başarısız.');
        }
    }
};
