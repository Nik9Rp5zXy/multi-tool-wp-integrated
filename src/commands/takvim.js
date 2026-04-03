module.exports = {
    execute: async (client, msg, args) => {
        const subCmd = args[0] ? args[0].toLowerCase() : '';
        const now = new Date();

        // ─── ANA FONKSİYON: Bugünün bilgisi ────────────
        if (!subCmd || subCmd === 'bugun' || subCmd === 'bugün') {
            const formatted = now.toLocaleDateString('tr-TR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            const dayOfYear = getDayOfYear(now);
            const weekNumber = getWeekNumber(now);
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const remainingInYear = 365 + (isLeapYear(now.getFullYear()) ? 1 : 0) - dayOfYear;

            // Hicri takvim yaklaşık hesaplama
            const hijri = gregorianToHijri(now);

            let text = `📅 *Takvim Bilgisi*\n\n`;
            text += `📆 *Tarih:* ${formatted}\n`;
            text += `🕐 *Saat:* ${now.toLocaleTimeString('tr-TR')}\n`;
            text += `🌙 *Hicri:* ~${hijri}\n\n`;
            text += `📊 *İstatistikler:*\n`;
            text += `• Yılın ${dayOfYear}. günü\n`;
            text += `• ${weekNumber}. hafta\n`;
            text += `• Ayın ${now.getDate()}/${daysInMonth}. günü\n`;
            text += `• Yıl sonuna ${remainingInYear} gün\n`;
            text += `• ${isLeapYear(now.getFullYear()) ? '🔄 Artık yıl' : '📅 Normal yıl'}`;

            return msg.reply(text);
        }

        // ─── GERİ SAYIM ────────────────────────────────
        if (subCmd === 'fark' || subCmd === 'kalan') {
            const dateStr = args[1];
            if (!dateStr) {
                return msg.reply('Lütfen hedef tarihi girin.\nÖrnek: `.takvim fark 01.01.2027`');
            }

            const targetDate = parseDate(dateStr);
            if (!targetDate) {
                return msg.reply('⛔ Geçersiz tarih formatı. Lütfen GG.AA.YYYY formatında girin.\nÖrnek: `.takvim fark 25.04.2026`');
            }

            const diffMs = targetDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            const targetFormatted = targetDate.toLocaleDateString('tr-TR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            let text = `📅 *Tarih Farkı Hesaplama*\n\n`;
            text += `📆 *Hedef:* ${targetFormatted}\n`;
            text += `📆 *Bugün:* ${now.toLocaleDateString('tr-TR')}\n\n`;

            if (diffDays > 0) {
                const { years, months, days } = dateDiff(now, targetDate);
                text += `⏳ *Kalan:* ${diffDays} gün\n`;
                if (years > 0 || months > 0) {
                    text += `📊 _${years > 0 ? years + ' yıl ' : ''}${months > 0 ? months + ' ay ' : ''}${days} gün_\n`;
                }
                text += `\n📌 _${Math.floor(diffDays / 7)} hafta ${diffDays % 7} gün_`;
            } else if (diffDays < 0) {
                text += `✅ Bu tarih ${Math.abs(diffDays)} gün önce geçti.`;
            } else {
                text += '🎯 *Bugün o gün!*';
            }

            return msg.reply(text);
        }

        // ─── ZAMAN DAMGASI / EPOCH ─────────────────────
        if (subCmd === 'epoch' || subCmd === 'unix' || subCmd === 'timestamp') {
            const currentEpoch = Math.floor(now.getTime() / 1000);

            // Eğer argüman olarak epoch verilmişse decode et
            if (args[1] && !isNaN(args[1])) {
                let ts = parseInt(args[1]);
                // Eğer milisaniye ise saniyeye çevir
                if (ts > 9999999999) ts = Math.floor(ts / 1000);
                const decoded = new Date(ts * 1000);

                return msg.reply(
                    `⏱ *Epoch Decode*\n\n` +
                    `📝 Epoch: ${args[1]}\n` +
                    `📅 Tarih: ${decoded.toLocaleString('tr-TR')}\n` +
                    `🌐 UTC: ${decoded.toUTCString()}`
                );
            }

            return msg.reply(
                `⏱ *Zaman Damgası*\n\n` +
                `📅 Tarih: ${now.toLocaleString('tr-TR')}\n` +
                `🔢 Epoch (saniye): \`${currentEpoch}\`\n` +
                `🔢 Epoch (ms): \`${now.getTime()}\`\n` +
                `🌐 ISO: \`${now.toISOString()}\`\n\n` +
                `💡 _Epoch decode: \`.takvim epoch ${currentEpoch}\`_`
            );
        }

        // ─── TARİH PARSE ────────────────────────────────
        // Doğrudan tarih girilmişse geri sayım yap
        const directDate = parseDate(subCmd);
        if (directDate) {
            const diffMs = directDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            const targetFormatted = directDate.toLocaleDateString('tr-TR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            let text = `📅 *${targetFormatted}*\n\n`;
            if (diffDays > 0) text += `⏳ ${diffDays} gün sonra`;
            else if (diffDays < 0) text += `📌 ${Math.abs(diffDays)} gün önce`;
            else text += '🎯 Bugün!';

            return msg.reply(text);
        }

        // Bilinmeyen alt komut
        msg.reply(
            '📅 *Takvim Araçları*\n\n' +
            '`.takvim` — Bugünün tarih bilgisi + hicri\n' +
            '`.takvim fark 01.01.2027` — O güne kaç gün kaldı\n' +
            '`.takvim 25.04.2026` — O tarihe geri sayım\n' +
            '`.takvim epoch` — Unix zaman damgası\n' +
            '`.takvim epoch 1714060800` — Epoch çözümleme'
        );
    }
};

// ─── YARDIMCI FONKSİYONLAR ────────────────────────────

function parseDate(str) {
    if (!str) return null;
    // GG.AA.YYYY veya GG/AA/YYYY
    const match = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
    if (!match) return null;
    const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    if (isNaN(d.getTime())) return null;
    return d;
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function dateDiff(from, to) {
    let years = to.getFullYear() - from.getFullYear();
    let months = to.getMonth() - from.getMonth();
    let days = to.getDate() - from.getDate();

    if (days < 0) {
        months--;
        days += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    return { years, months, days };
}

function gregorianToHijri(date) {
    // Basitleştirilmiş Hicri dönüşüm (yaklaşık ± 1-2 gün)
    const jd = Math.floor((1461 * (date.getFullYear() + 4800 + Math.floor((date.getMonth() - 13) / 12))) / 4)
        + Math.floor((367 * (date.getMonth() + 1 - 12 * Math.floor((date.getMonth() - 13) / 12))) / 12)
        - Math.floor((3 * Math.floor((date.getFullYear() + 4900 + Math.floor((date.getMonth() - 13) / 12)) / 100)) / 4)
        + date.getDate() - 32075;

    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const remainder = l - 10631 * n + 354;
    const j = Math.floor((10985 - remainder) / 5316) * Math.floor((50 * remainder) / 17719)
        + Math.floor(remainder / 5670) * Math.floor((43 * remainder) / 15238);
    const remL = remainder - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const hMonth = Math.floor((24 * remL) / 709);
    const hDay = remL - Math.floor((709 * hMonth) / 24);
    const hYear = 30 * n + j - 30;

    const hijriMonths = ['Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir', 'Cemaziyelevvel', 'Cemaziyelahir',
        'Receb', 'Şaban', 'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce'];

    return `${hDay} ${hijriMonths[hMonth - 1] || '?'} ${hYear}`;
}
