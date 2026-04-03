const axios = require('axios');

// Ücretsiz ve API key gerektirmeyen kaynaklar
const FIAT_API = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/try.json';
const CRYPTO_API = 'https://api.coingecko.com/api/v3/simple/price';

const FLAG_MAP = {
    usd: '🇺🇸', eur: '🇪🇺', gbp: '🇬🇧', chf: '🇨🇭', jpy: '🇯🇵',
    cad: '🇨🇦', aud: '🇦🇺', sek: '🇸🇪', nok: '🇳🇴', dkk: '🇩🇰',
    rub: '🇷🇺', cny: '🇨🇳', sar: '🇸🇦', aed: '🇦🇪', krw: '🇰🇷'
};

const CRYPTO_IDS = {
    btc: 'bitcoin', eth: 'ethereum', sol: 'solana',
    bnb: 'binancecoin', xrp: 'ripple', doge: 'dogecoin',
    ada: 'cardano', dot: 'polkadot', avax: 'avalanche-2'
};

module.exports = {
    execute: async (client, msg, args) => {
        const waitMsg = await msg.reply('💱 Piyasa verileri çekiliyor...');

        try {
            // Argüman analizi: ".kur", ".kur usd", ".kur 100 usd"
            let amount = null;
            let targetCurrency = null;

            if (args.length === 2 && !isNaN(args[0])) {
                amount = parseFloat(args[0]);
                targetCurrency = args[1].toLowerCase();
            } else if (args.length === 1) {
                targetCurrency = args[0].toLowerCase();
            }

            // Tek kripto sorgusu
            if (targetCurrency && CRYPTO_IDS[targetCurrency]) {
                const res = await axios.get(CRYPTO_API, {
                    params: { ids: CRYPTO_IDS[targetCurrency], vs_currencies: 'usd,try' },
                    timeout: 8000
                });
                const data = res.data[CRYPTO_IDS[targetCurrency]];
                if (!data) throw new Error('Kripto verisi alınamadı');

                let text = `🪙 *${targetCurrency.toUpperCase()} Anlık Fiyat*\n\n`;
                text += `💵 USD: $${numberFormat(data.usd)}\n`;
                text += `🇹🇷 TRY: ₺${numberFormat(data.try)}`;

                if (amount) {
                    text += `\n\n📊 *${amount} ${targetCurrency.toUpperCase()}*\n`;
                    text += `= $${numberFormat(data.usd * amount)}\n`;
                    text += `= ₺${numberFormat(data.try * amount)}`;
                }

                return await waitMsg.edit(text);
            }

            // Döviz kurları (TRY bazlı)
            const fiatRes = await axios.get(FIAT_API, { timeout: 8000 });
            const rates = fiatRes.data.try; // 1 TRY = ? X

            if (!rates) throw new Error('Döviz verisi alınamadı');

            // Tek döviz sorgusu
            if (targetCurrency && rates[targetCurrency] !== undefined) {
                const ratePerTry = rates[targetCurrency]; // 1 TRY = X foreign
                const foreignToTry = 1 / ratePerTry;      // 1 foreign = X TRY
                const flag = FLAG_MAP[targetCurrency] || '💰';

                let text = `${flag} *1 ${targetCurrency.toUpperCase()}* = ₺${numberFormat(foreignToTry)}`;

                if (amount) {
                    text += `\n\n📊 *${amount} ${targetCurrency.toUpperCase()}* = ₺${numberFormat(foreignToTry * amount)}`;
                }

                return await waitMsg.edit(text);
            }

            // Genel piyasa özeti
            const mainCurrencies = ['usd', 'eur', 'gbp', 'chf', 'jpy', 'sar', 'rub', 'cny'];
            let text = '💱 *Anlık Döviz Kurları (TRY)*\n\n';

            for (const code of mainCurrencies) {
                if (rates[code] !== undefined) {
                    const flag = FLAG_MAP[code] || '💰';
                    const foreignToTry = 1 / rates[code];
                    text += `${flag} 1 ${code.toUpperCase()} = ₺${numberFormat(foreignToTry)}\n`;
                }
            }

            // Kripto eklentisi
            try {
                const cryptoRes = await axios.get(CRYPTO_API, {
                    params: { ids: 'bitcoin,ethereum,solana', vs_currencies: 'try' },
                    timeout: 5000
                });
                const cd = cryptoRes.data;
                text += '\n🪙 *Kripto*\n';
                if (cd.bitcoin) text += `₿ BTC = ₺${numberFormat(cd.bitcoin.try)}\n`;
                if (cd.ethereum) text += `Ξ ETH = ₺${numberFormat(cd.ethereum.try)}\n`;
                if (cd.solana) text += `◎ SOL = ₺${numberFormat(cd.solana.try)}\n`;
            } catch { /* kripto opsiyonel */ }

            text += `\n⏱ _${new Date().toLocaleString('tr-TR')}_`;
            await waitMsg.edit(text);

        } catch (err) {
            console.error('Kur hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit('⛔ Döviz verileri şu anda çekilemiyor. Lütfen daha sonra deneyin.');
            else msg.reply('⛔ Kur bilgisi alınamadı.');
        }
    }
};

function numberFormat(num) {
    if (num >= 1) return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (num >= 0.01) return num.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
}
