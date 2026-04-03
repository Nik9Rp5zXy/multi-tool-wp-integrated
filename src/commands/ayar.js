const { isOwner, isAdmin } = require('../utils/auth');
const { loadData, getConfig, setConfig, DEFAULT_CONFIG } = require('../utils/dataManager');

// Ayar tanımları: anahtar, tip, açıklama, min/max veya enum
const CONFIG_SCHEMA = {
    rateLimit: {
        type: 'integer',
        description: 'Kullanıcılar için dakikada max komut sayısı',
        min: 1,
        max: 50,
        unit: 'istek/dk',
        adminOnly: false   // owner ve admin değiştirebilir
    },
    rateLimitWindow: {
        type: 'integer',
        description: 'Rate limit penceresi (saniye)',
        min: 10,
        max: 3600,
        unit: 'saniye',
        adminOnly: false
    },
    whisperModel: {
        type: 'enum',
        description: 'Transkripsiyon AI modeli kalitesi',
        options: ['tiny', 'base', 'small', 'medium', 'large'],
        adminOnly: false
    },
    maxDownloadMB: {
        type: 'integer',
        description: 'Maximum indirilebilir dosya boyutu',
        min: 10,
        max: 200,
        unit: 'MB',
        adminOnly: false
    },
    ssTimeout: {
        type: 'integer',
        description: '.ss komut bağlantı zaman aşımı',
        min: 3000,
        max: 30000,
        unit: 'ms',
        adminOnly: true    // sadece owner
    },
    prefix: {
        type: 'string',
        description: 'Bot komut prefix karakteri',
        minLength: 1,
        maxLength: 2,
        adminOnly: true    // sadece owner (prefix değişince bot davranışı değişir)
    }
};

function formatValue(key, val) {
    const schema = CONFIG_SCHEMA[key];
    if (!schema) return String(val);
    const unit = schema.unit ? ` ${schema.unit}` : '';
    return `\`${val}\`${unit}`;
}

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        const isOwnerUser = isOwner(senderId);
        const isAdminUser = isAdmin(senderId);

        if (!isAdminUser) {
            return msg.reply('⛔ Bu komutu kullanmak için *Admin* veya *Owner* yetkisi gerekiyor.');
        }

        const subCmd = args[0] ? args[0].toLowerCase() : '';

        // ── Yardım / Mevcut ayarları listele ────────────────────────────────
        if (!subCmd || subCmd === 'liste' || subCmd === 'list') {
            const data = loadData();
            const cfg = data.config || {};

            let text = `⚙️ *Bot Ayarları (config)*\n\n`;

            for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
                const currentVal = cfg[key] ?? DEFAULT_CONFIG[key];
                const lockIcon = schema.adminOnly && !isOwnerUser ? '🔒' : '✏️';
                text += `${lockIcon} *${key}*\n`;
                text += `   📝 ${schema.description}\n`;
                text += `   🔧 Mevcut: ${formatValue(key, currentVal)}\n`;
                text += `   💡 Varsayılan: ${formatValue(key, DEFAULT_CONFIG[key])}\n`;

                if (schema.type === 'integer') {
                    text += `   📏 Aralık: ${schema.min} — ${schema.max}${schema.unit ? ' ' + schema.unit : ''}\n`;
                } else if (schema.type === 'enum') {
                    text += `   📋 Seçenekler: ${schema.options.join(', ')}\n`;
                } else if (schema.type === 'string') {
                    text += `   📏 Uzunluk: ${schema.minLength}–${schema.maxLength} karakter\n`;
                }

                if (schema.adminOnly) text += `   ⚠️ _Sadece Owner değiştirebilir_\n`;
                text += '\n';
            }

            text += `*Değiştirmek için:* \`.ayar [anahtar] [değer]\`\n`;
            text += `*Sıfırlamak için:* \`.ayar sifirla [anahtar]\`\n`;
            text += `*Tümünü sıfırla:* \`.ayar sifirla hepsi\`\n\n`;
            text += `_🔒 = Sadece Owner | ✏️ = Admin değiştirebilir_`;

            return msg.reply(text);
        }

        // ── Sıfırlama ────────────────────────────────────────────────────────
        if (subCmd === 'sifirla' || subCmd === 'reset') {
            if (!isOwnerUser) {
                return msg.reply('⛔ Sıfırlama işlemi sadece *Owner* tarafından yapılabilir.');
            }

            const target = args[1] ? args[1].toLowerCase() : '';

            if (target === 'hepsi' || target === 'all') {
                const data = loadData();
                data.config = { ...DEFAULT_CONFIG };
                const { saveData } = require('../utils/dataManager');
                saveData(data);
                return msg.reply('✅ *Tüm bot ayarları varsayılana sıfırlandı.*');
            }

            if (!target || !(target in CONFIG_SCHEMA)) {
                return msg.reply(
                    `⛔ Geçersiz anahtar: \`${target}\`\n\n` +
                    `Geçerli anahtarlar: ${Object.keys(CONFIG_SCHEMA).join(', ')}`
                );
            }

            const { saveData } = require('../utils/dataManager');
            const data = loadData();
            data.config[target] = DEFAULT_CONFIG[target];
            saveData(data);

            return msg.reply(
                `✅ *\`${target}\` sıfırlandı*\n\n` +
                `🔧 Yeni değer: ${formatValue(target, DEFAULT_CONFIG[target])}`
            );
        }

        // ── Değer güncelleme: .ayar [anahtar] [değer] ──────────────────────
        const key = subCmd;
        const rawValue = args.slice(1).join(' ');

        if (!(key in CONFIG_SCHEMA)) {
            return msg.reply(
                `⛔ Bilinmeyen ayar: \`${key}\`\n\n` +
                `Geçerli anahtarlar:\n${Object.keys(CONFIG_SCHEMA).join(', ')}\n\n` +
                `Tüm ayarları görmek için: \`.ayar\``
            );
        }

        const schema = CONFIG_SCHEMA[key];

        // Admin-only kontrolü
        if (schema.adminOnly && !isOwnerUser) {
            return msg.reply(`⛔ \`${key}\` ayarını sadece *Owner* değiştirebilir.`);
        }

        if (!rawValue) {
            const currentVal = getConfig(key);
            let text = `⚙️ *${key}* ayarı\n\n`;
            text += `📝 ${schema.description}\n`;
            text += `🔧 Mevcut: ${formatValue(key, currentVal)}\n`;
            text += `💡 Varsayılan: ${formatValue(key, DEFAULT_CONFIG[key])}\n\n`;

            if (schema.type === 'integer') {
                text += `Kullanım: \`.ayar ${key} [${schema.min}-${schema.max}]\``;
            } else if (schema.type === 'enum') {
                text += `Kullanım: \`.ayar ${key} [${schema.options.join('/')}]\``;
            } else {
                text += `Kullanım: \`.ayar ${key} [değer]\``;
            }
            return msg.reply(text);
        }

        // Değer doğrulama ve dönüştürme
        let parsedValue;

        if (schema.type === 'integer') {
            parsedValue = parseInt(rawValue);
            if (isNaN(parsedValue)) {
                return msg.reply(`⛔ \`${key}\` için sayısal değer girilmeli.\nAralık: ${schema.min} — ${schema.max}`);
            }
            if (parsedValue < schema.min || parsedValue > schema.max) {
                return msg.reply(`⛔ \`${key}\` değeri ${schema.min} ile ${schema.max} arasında olmalı.\nGirilen: ${parsedValue}`);
            }
        } else if (schema.type === 'enum') {
            parsedValue = rawValue.toLowerCase();
            if (!schema.options.includes(parsedValue)) {
                return msg.reply(`⛔ \`${key}\` için geçersiz seçenek: \`${parsedValue}\`\nGeçerli seçenekler: ${schema.options.join(', ')}`);
            }
        } else if (schema.type === 'string') {
            parsedValue = rawValue;
            if (parsedValue.length < schema.minLength || parsedValue.length > schema.maxLength) {
                return msg.reply(`⛔ \`${key}\` için değer ${schema.minLength}–${schema.maxLength} karakter arasında olmalı.`);
            }
        } else {
            parsedValue = rawValue;
        }

        const oldVal = getConfig(key);
        const success = setConfig(key, parsedValue);

        if (!success) {
            return msg.reply(`⛔ \`${key}\` ayarı kaydedilemedi.`);
        }

        return msg.reply(
            `✅ *Ayar Güncellendi*\n\n` +
            `⚙️ Anahtar: \`${key}\`\n` +
            `📌 Eski değer: ${formatValue(key, oldVal)}\n` +
            `🔧 Yeni değer: ${formatValue(key, parsedValue)}\n\n` +
            `_Değişiklik anında aktif.${key === 'prefix' ? ' Yeni prefix: ' + parsedValue : ''}_`
        );
    }
};
