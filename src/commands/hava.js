const axios = require('axios');
const { createReporter } = require('../utils/reporter');

const WTTR_API = 'https://wttr.in';

const CONDITION_MAP = {
    'Clear': 'açık', 'Sunny': 'güneşli',
    'Partly cloudy': 'parçalı bulutlu', 'Cloudy': 'bulutlu', 'Overcast': 'kapalı',
    'Mist': 'sisli', 'Fog': 'yoğun sisli',
    'Light rain': 'hafif yağmurlu', 'Moderate rain': 'yağmurlu', 'Heavy rain': 'şiddetli yağmurlu',
    'Light snow': 'hafif karlı', 'Heavy snow': 'karlı',
    'Thundery outbreaks possible': 'fırtınalı', 'Thunderstorm': 'şiddetli fırtına',
    'Blizzard': 'kar fırtınası'
};

function getCondition(desc) {
    for (const [key, tr] of Object.entries(CONDITION_MAP)) {
        if (desc && desc.toLowerCase().includes(key.toLowerCase())) return tr;
    }
    return desc || 'bilinmiyor';
}

module.exports = {
    execute: async (client, msg, args) => {
        const city = args.join(' ');
        if (!city) {
            return msg.reply(
                'kullanım: .hava [şehir]\n\nörnekler:\n.hava istanbul\n.hava ankara\n.hava london'
            );
        }

        const reporter = await createReporter(msg, `${city} için bakıyorum...`);

        try {
            const res = await axios.get(`${WTTR_API}/${encodeURIComponent(city)}?format=j1&lang=tr`, {
                timeout: 10000,
                headers: { 'User-Agent': 'curl/7.68.0' }
            });

            const data = res.data;
            if (!data || !data.current_condition || !data.current_condition[0]) {
                throw new Error('şehir bulunamadı');
            }

            const current = data.current_condition[0];
            const area = data.nearest_area?.[0];
            const locationName = area?.areaName?.[0]?.value || city;
            const country = area?.country?.[0]?.value || '';
            const desc = current.weatherDesc?.[0]?.value || '';
            const condition = current.lang_tr?.[0]?.value || getCondition(desc);

            let text = `${locationName}${country ? ', ' + country : ''} — şu an ${condition}\n\n`;
            text += `sıcaklık: ${current.temp_C}°C (hissedilen: ${current.FeelsLikeC}°C)\n`;
            text += `nem: %${current.humidity}\n`;
            text += `rüzgar: ${current.windspeedKmph} km/s\n`;
            text += `görüş: ${current.visibility} km\n`;
            text += `uv: ${current.uvIndex}\n`;

            if (data.weather && data.weather.length > 0) {
                text += '\nsonraki günler:\n';
                const days = ['bugün', 'yarın', 'öbür gün'];
                data.weather.slice(0, 3).forEach((day, i) => {
                    const dayDesc = day.hourly?.[4]?.lang_tr?.[0]?.value ||
                                    getCondition(day.hourly?.[4]?.weatherDesc?.[0]?.value || '');
                    text += `${days[i]}: ${day.mintempC}–${day.maxtempC}°C, ${dayDesc}\n`;
                });
            }

            await reporter.done(text);

        } catch (err) {
            console.error('Hava durumu hatası:', err.message);
            await reporter.done(`${city} için hava durumu çekilemedi. şehir adını kontrol et`);
        }
    }
};
