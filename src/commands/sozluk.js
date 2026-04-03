const axios = require('axios');

// TDK Resmi API — Tamamen ücretsiz, API key gerektirmez
const TDK_API = 'https://sozluk.gov.tr/gts';

module.exports = {
    execute: async (client, msg, args) => {
        const word = args.join(' ').trim();

        if (!word) {
            return msg.reply(
                '📖 *TDK Sözlük*\n\n' +
                'Kullanım: `.sozluk [kelime]`\n\n' +
                '_Örnekler:_\n' +
                '`.sozluk algoritma`\n' +
                '`.sozluk merhaba`\n' +
                '`.sozluk serendipite`'
            );
        }

        const waitMsg = await msg.reply(`📖 "${word}" TDK sözlüğünde aranıyor...`);

        try {
            const res = await axios.get(TDK_API, {
                params: { ara: word },
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });

            const data = res.data;

            // TDK hata mesajı döndürürse (obje formatında)
            if (!Array.isArray(data) || data.length === 0) {
                // Öneri arama
                try {
                    const suggestRes = await axios.get('https://sozluk.gov.tr/oneri', {
                        params: { spilavra: word },
                        timeout: 5000
                    });
                    if (Array.isArray(suggestRes.data) && suggestRes.data.length > 0) {
                        const suggestions = suggestRes.data.slice(0, 5).map(s => s.madde).join(', ');
                        return await waitMsg.edit(`📖 "${word}" TDK'da bulunamadı.\n\n💡 *Bunu mu demek istediniz?*\n${suggestions}`);
                    }
                } catch { /* öneri opsiyonel */ }

                return await waitMsg.edit(`📖 "${word}" kelimesi TDK sözlüğünde bulunamadı.`);
            }

            const entry = data[0];
            let text = `📖 *${entry.madde || word}*`;

            // Telaffuz bilgisi
            if (entry.telaffuz) text += ` /${entry.telaffuz}/`;

            // Köken bilgisi
            if (entry.lisan) text += `\n🌐 _Köken: ${entry.lisan}_`;

            text += '\n';

            // Anlamlar
            if (entry.anlamlarListe && entry.anlamlarListe.length > 0) {
                text += '\n*Anlamlar:*\n';
                entry.anlamlarListe.forEach((anlam, idx) => {
                    const numEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                    const num = numEmoji[idx] || `${idx + 1}.`;

                    // Anlam özelliği (isim, sıfat, fiil vb.)
                    let prefix = '';
                    if (anlam.opilaveler && anlam.opilaveler.length > 0) {
                        prefix = `[${anlam.opilaveler.map(o => o.tam_adi || o.kisa_adi).join(', ')}] `;
                    }

                    text += `${num} ${prefix}${anlam.anlam}\n`;

                    // Örnek cümle
                    if (anlam.orneklerListe && anlam.orneklerListe.length > 0) {
                        const ex = anlam.orneklerListe[0];
                        text += `   📝 _"${ex.ornek}"_`;
                        if (ex.yazar && ex.yazar.length > 0) {
                            text += ` — ${ex.yazar[0].tam_adi}`;
                        }
                        text += '\n';
                    }
                });
            }

            // Atasözleri / Deyimler
            if (entry.atapilaveler && entry.atapilaveler.length > 0) {
                const idioms = entry.atapilaveler.slice(0, 3);
                text += '\n📜 *Atasözleri / Deyimler:*\n';
                idioms.forEach(item => {
                    text += `• ${item.madde}\n`;
                });
            }

            // Birleşik kelimeler
            if (entry.birpilaveler && entry.birpilaveler.length > 0) {
                const compounds = entry.birpilaveler.slice(0, 5);
                text += '\n🔗 *Birleşik Kelimeler:*\n';
                text += compounds.map(b => b.madde).join(', ') + '\n';
            }

            await waitMsg.edit(text);

        } catch (err) {
            console.error('TDK hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit('⛔ TDK sözlük sorgusu başarısız oldu. Lütfen daha sonra deneyin.');
            else msg.reply('⛔ Sözlük sorgusu başarısız.');
        }
    }
};
