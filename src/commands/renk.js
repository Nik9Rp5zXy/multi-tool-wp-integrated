const sharp = require('sharp');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { cleanUp } = require('../utils/garbageCollector');

// Türkçe renk isimleri
const COLOR_NAMES = {
    'kırmızı': '#FF0000', 'kirmizi': '#FF0000', 'red': '#FF0000',
    'mavi': '#0000FF', 'blue': '#0000FF',
    'yeşil': '#00FF00', 'yesil': '#00FF00', 'green': '#00FF00',
    'sarı': '#FFFF00', 'sari': '#FFFF00', 'yellow': '#FFFF00',
    'turuncu': '#FF8C00', 'orange': '#FF8C00',
    'mor': '#800080', 'purple': '#800080',
    'pembe': '#FF69B4', 'pink': '#FF69B4',
    'beyaz': '#FFFFFF', 'white': '#FFFFFF',
    'siyah': '#000000', 'black': '#000000',
    'gri': '#808080', 'grey': '#808080', 'gray': '#808080',
    'lacivert': '#000080', 'navy': '#000080',
    'kahverengi': '#8B4513', 'brown': '#8B4513',
    'turkuaz': '#40E0D0', 'turquoise': '#40E0D0',
    'bordo': '#800020', 'maroon': '#800000',
    'altın': '#FFD700', 'gold': '#FFD700',
    'gümüş': '#C0C0C0', 'silver': '#C0C0C0',
    'bej': '#F5F5DC', 'beige': '#F5F5DC'
};

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function getComplementary(hex) {
    const { r, g, b } = hexToRgb(hex);
    const compR = (255 - r).toString(16).padStart(2, '0');
    const compG = (255 - g).toString(16).padStart(2, '0');
    const compB = (255 - b).toString(16).padStart(2, '0');
    return `#${compR}${compG}${compB}`.toUpperCase();
}

module.exports = {
    execute: async (client, msg, args) => {
        let colorInput = args.join(' ').trim().toLowerCase();

        if (!colorInput) {
            return msg.reply(
                '🎨 *Renk Bilgi Kartı*\n\n' +
                'Kullanım: `.renk [hex/isim]`\n\n' +
                '_Örnekler:_\n' +
                '`.renk #FF5733`\n' +
                '`.renk kırmızı`\n' +
                '`.renk turquoise`\n' +
                '`.renk 3498db`'
            );
        }

        let hex;

        // İsim ile eşleştirme
        if (COLOR_NAMES[colorInput]) {
            hex = COLOR_NAMES[colorInput];
        }
        // RGB parantez formatı: rgb(255,87,51)
        else if (colorInput.includes('rgb')) {
            const match = colorInput.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
            if (match) {
                const r = parseInt(match[1]).toString(16).padStart(2, '0');
                const g = parseInt(match[2]).toString(16).padStart(2, '0');
                const b = parseInt(match[3]).toString(16).padStart(2, '0');
                hex = `#${r}${g}${b}`;
            }
        }
        // HEX
        else {
            hex = colorInput.startsWith('#') ? colorInput : `#${colorInput}`;
        }

        // Validation
        if (!hex || !/^#[0-9a-fA-F]{3,6}$/i.test(hex.replace('#', '#'))) {
            return msg.reply('⛔ Geçersiz renk formatı. HEX (#FF5733) veya Türkçe isim (kırmızı) kullanın.');
        }

        // 3 haneli HEX'i 6 haneli yap
        if (hex.replace('#', '').length === 3) {
            hex = '#' + hex.replace('#', '').split('').map(c => c + c).join('');
        }

        hex = hex.toUpperCase();

        const waitMsg = await msg.reply('🎨 Renk kartı oluşturuluyor...');
        const outputPath = path.join(__dirname, '../../temp', `color_${Date.now()}.png`);

        try {
            const { r, g, b } = hexToRgb(hex);
            const hsl = rgbToHsl(r, g, b);
            const complementary = getComplementary(hex);

            // 400x200 renk önizleme kartı oluştur
            // Sol: ana renk, Sağ: zıt renk
            const compRgb = hexToRgb(complementary);

            const svgCard = `
                <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
                    <rect width="300" height="200" fill="${hex}"/>
                    <rect x="300" width="100" height="200" fill="${complementary}"/>
                    <text x="310" y="100" fill="${compRgb.r + compRgb.g + compRgb.b > 380 ? '#000' : '#FFF'}" 
                          font-size="10" font-family="Arial" text-anchor="start">Zıt Renk</text>
                </svg>`;

            await sharp(Buffer.from(svgCard)).png().toFile(outputPath);

            const media = MessageMedia.fromFilePath(outputPath);

            const caption =
                `🎨 *Renk Bilgi Kartı*\n\n` +
                `🔷 *HEX:* ${hex}\n` +
                `🔴 *RGB:* rgb(${r}, ${g}, ${b})\n` +
                `🌈 *HSL:* hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)\n` +
                `🔃 *Zıt Renk:* ${complementary}\n` +
                `💡 *Parlaklık:* ${hsl.l}%\n` +
                `${hsl.l > 50 ? '☀️ Açık ton' : '🌙 Koyu ton'}`;

            await client.sendMessage(msg.from, media, { caption });

            if (waitMsg.edit) await waitMsg.edit('✅ Renk kartı oluşturuldu.');
        } catch (err) {
            console.error('Renk hatası:', err.message);
            if (waitMsg.edit) await waitMsg.edit('⛔ Renk kartı oluşturulamadı.');
            else msg.reply('⛔ Renk işlemi başarısız.');
        } finally {
            cleanUp(outputPath);
        }
    }
};
