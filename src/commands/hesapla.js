const { evaluate, unit } = require('mathjs');

module.exports = {
    execute: async (client, msg, args) => {
        const expression = args.join(' ');

        if (!expression) {
            return msg.reply(
                '🧮 *Gelişmiş Hesap Makinesi*\n\n' +
                'Kullanım: `.hesapla [ifade]`\n\n' +
                '_Örnekler:_\n' +
                '`.hesapla 15% * 2500`\n' +
                '`.hesapla sqrt(144) + 5^3`\n' +
                '`.hesapla sin(45 deg)`\n' +
                '`.hesapla 100 cm to inch`\n' +
                '`.hesapla 72 fahrenheit to celsius`\n' +
                '`.hesapla 5 kg to lb`\n' +
                '`.hesapla log(1000, 10)`\n' +
                '`.hesapla (12 * 8) / 3 + 7`'
            );
        }

        try {
            // Türkçe kısayollar
            let expr = expression
                .replace(/üssü/gi, '^')
                .replace(/kök/gi, 'sqrt')
                .replace(/bölü/gi, '/')
                .replace(/çarpı/gi, '*')
                .replace(/artı/gi, '+')
                .replace(/eksi/gi, '-')
                .replace(/pi\b/gi, 'pi')
                .replace(/(\d+)\s*%\s*of\s*(\d+)/gi, '($1/100) * $2') // "15% of 2500"
                .replace(/(\d+)\s*%\s*\*/gi, '($1/100) *'); // "15% * 2500"

            const result = evaluate(expr);

            // Sonucu formatla
            let formattedResult;
            if (typeof result === 'object' && result.toString) {
                formattedResult = result.toString();
            } else if (typeof result === 'number') {
                // Çok büyük/küçük sayılar için bilimsel gösterim
                if (Math.abs(result) > 1e15 || (Math.abs(result) < 1e-10 && result !== 0)) {
                    formattedResult = result.toExponential(6);
                } else {
                    formattedResult = parseFloat(result.toPrecision(15)).toLocaleString('tr-TR');
                }
            } else {
                formattedResult = String(result);
            }

            msg.reply(
                `🧮 *Hesap Sonucu*\n\n` +
                `📝 İfade: \`${expression}\`\n` +
                `✅ Sonuç: *${formattedResult}*`
            );
        } catch (err) {
            console.error('Hesaplama hatası:', err.message);
            msg.reply(
                '⛔ İfade hesaplanamadı.\n\n' +
                `🔍 Hata: _${err.message.substring(0, 100)}_\n\n` +
                '💡 İpucu: Geçerli matematik ifadesi yazdığınızdan emin olun.\n' +
                'Birim dönüştürme örneği: `.hesapla 100 cm to inch`'
            );
        }
    }
};
