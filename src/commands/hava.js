const axios = require('axios');

// wttr.in — Tamamen ücretsiz, API key gerektirmez, JSON destekli hava durumu
const WTTR_API = 'https://wttr.in';

const CONDITION_EMOJI = {
    'Clear': '☀️', 'Sunny': '☀️',
    'Partly cloudy': '⛅', 'Partly Cloudy': '⛅',
    'Cloudy': '☁️', 'Overcast': '☁️',
    'Mist': '🌫️', 'Fog': '🌫️',
    'Light rain': '🌦️', 'Patchy rain': '🌦️', 'Patchy rain possible': '🌦️',
    'Moderate rain': '🌧️', 'Heavy rain': '🌧️',
    'Light snow': '🌨️', 'Moderate snow': '🌨️', 'Heavy snow': '❄️',
    'Thundery outbreaks possible': '⛈️', 'Thunderstorm': '⛈️',
    'Blizzard': '🌬️'
};

function getEmoji(condition) {
    for (const [key, emoji] of Object.entries(CONDITION_EMOJI)) {
        if (condition.toLowerCase().includes(key.toLowerCase())) return emoji;
    }
    return '🌡️';
}

module.exports = {
    execute: async (client, msg, args) => {
        const city = args.join(' ');
        if (!city) {
            return msg.reply(
                '🌤️ *Hava Durumu*\n\n' +
                'Kullanım: `.hava [şehir]`\n\n' +
                '_Örnekler:_\n' +
                '`.hava istanbul`\n' +
                '`.hava ankara`\n' +
                '`.hava london`'
            );
        }

        const waitMsg = await msg.reply(`🌤️ ${city} için hava durumu sorgulanıyor...`);

        try {
            const res = await axios.get(`${WTTR_API}/${encodeURIComponent(city)}?format=j1&lang=tr`, {
                timeout: 10000,
                headers: { 'User-Agent': 'curl/7.68.0' }
            });

            const data = res.data;
            if (!data || !data.current_condition || !data.current_condition[0]) {
                throw new Error('Şehir bulunamadı');
            }

            const current = data.current_condition[0];
            const area = data.nearest_area?.[0];
            const locationName = area?.areaName?.[0]?.value || city;
            const country = area?.country?.[0]?.value || '';
            const condition = current.lang_tr?.[0]?.value || current.weatherDesc?.[0]?.value || 'Bilinmiyor';
            const emoji = getEmoji(current.weatherDesc?.[0]?.value || '');

            let text = `${emoji} *${locationName}, ${country} — Hava Durumu*\n\n`;
            text += `🌡️ *Sıcaklık:* ${current.temp_C}°C (Hissedilen: ${current.FeelsLikeC}°C)\n`;
            text += `💧 *Nem:* %${current.humidity}\n`;
            text += `💨 *Rüzgar:* ${current.windspeedKmph} km/s (${current.winddir16Point})\n`;
            text += `🔭 *Görüş:* ${current.visibility} km\n`;
            text += `☁️ *Durum:* ${condition}\n`;
            text += `🌡️ *Basınç:* ${current.pressure} hPa\n`;
            text += `☀️ *UV İndeksi:* ${current.uvIndex}\n`;

            // 3 günlük tahmin
            if (data.weather && data.weather.length > 0) {
                text += '\n📅 *3 Günlük Tahmin:*\n';
                const days = ['Bugün', 'Yarın', 'Öbür Gün'];
                data.weather.slice(0, 3).forEach((day, i) => {
                    const dayCondition = day.hourly?.[4]?.lang_tr?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || '—';
                    const dayEmoji = getEmoji(day.hourly?.[4]?.weatherDesc?.[0]?.value || '');
                    text += `${dayEmoji} *${days[i]}:* ${day.mintempC}°C — ${day.maxtempC}°C | ${dayCondition}\n`;
                });
            }

            text += `\n⏱ _${new Date().toLocaleString('tr-TR')}_`;
            await waitMsg.edit(text);

        } catch (err) {
            console.error('Hava durumu hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit('⛔ Hava durumu bilgisi alınamadı. Şehir adını kontrol edin.');
            else msg.reply('⛔ Hava durumu çekilemedi.');
        }
    }
};
