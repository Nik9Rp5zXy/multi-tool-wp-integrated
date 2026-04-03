const { translate } = require('@vitalets/google-translate-api');

const TRANSLATE_TIMEOUT = 12000; // 12 saniye timeout

// Timeout wrapper
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), ms)
        )
    ]);
}

module.exports = {
    execute: async (client, msg, args) => {
        let textToTranslate = args.join(' ');
        let targetLang = 'tr'; // Varsayılan hedef: Türkçe

        // Hedef dil argümanı kontrolü: .ceviri en Hello / .ceviri de Merhaba
        const langCodes = ['en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja', 'ko', 'zh', 'pt', 'nl', 'pl', 'tr'];
        if (args.length >= 2 && langCodes.includes(args[0].toLowerCase())) {
            targetLang = args[0].toLowerCase();
            textToTranslate = args.slice(1).join(' ');
        }

        // Yanıt verilen mesajdan metin al
        if (!textToTranslate && msg.hasQuotedMsg) {
            try {
                const quoted = await msg.getQuotedMessage();
                textToTranslate = quoted.body;
            } catch { /* sesli mesaj veya medya olabilir */ }
        }

        if (!textToTranslate) {
            return msg.reply(
                '🌍 *Çeviri*\n\n' +
                'Kullanım: `.ceviri [metin]`\n' +
                'Ya da yanıt ver: `.ceviri`\n\n' +
                '🌐 *Hedef Dil Seçimi:*\n' +
                '`.ceviri en Merhaba` → İngilizce\n' +
                '`.ceviri de Merhaba` → Almanca\n' +
                '`.ceviri fr Merhaba` → Fransızca\n' +
                '_(Varsayılan:Türkçe)_'
            );
        }

        const waitMsg = await msg.reply('🌍 Çeviri yapılıyor...');

        // Yeniden deneme mantığı
        const MAX_RETRIES = 3;
        let lastError;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // İlk deneme: istenilen hedefe çevir
                const result = await withTimeout(
                    translate(textToTranslate, { to: targetLang }),
                    TRANSLATE_TIMEOUT
                );

                const srcLang = result.raw?.src || '?';

                // Türkçeye çevirme istendi ama metin zaten Türkçeyse → İngilizceye çevir
                if (targetLang === 'tr' && srcLang === 'tr') {
                    const enResult = await withTimeout(
                        translate(textToTranslate, { to: 'en' }),
                        TRANSLATE_TIMEOUT
                    );
                    return await waitMsg.edit(
                        `🇬🇧 *Çeviri (TR → EN):*\n\n${enResult.text}`
                    );
                }

                const flagMap = {
                    tr: '🇹🇷', en: '🇺🇸', de: '🇩🇪', fr: '🇫🇷',
                    es: '🇪🇸', it: '🇮🇹', ru: '🇷🇺', ar: '🇸🇦',
                    ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', pt: '🇵🇹',
                    nl: '🇳🇱', pl: '🇵🇱'
                };

                const srcFlag = flagMap[srcLang] || '🌐';
                const dstFlag = flagMap[targetLang] || '🌐';

                return await waitMsg.edit(
                    `${srcFlag} → ${dstFlag} *Çeviri (${srcLang.toUpperCase()} → ${targetLang.toUpperCase()}):*\n\n${result.text}`
                );

            } catch (error) {
                lastError = error;
                const isTimeout = error.message === 'TIMEOUT';
                const isRateLimit = error.message?.includes('429') || error.message?.includes('Too Many');

                if (attempt < MAX_RETRIES) {
                    const waitTime = isRateLimit ? 3000 : 1500;
                    if (waitMsg.edit) {
                        await waitMsg.edit(
                            `🌍 Çeviri yapılıyor... (Deneme ${attempt + 1}/${MAX_RETRIES}${isTimeout ? ' — Yeniden bağlanıyor' : ''})`
                        );
                    }
                    await new Promise(r => setTimeout(r, waitTime));
                }
            }
        }

        // 3 deneme de başarısız
        console.error('[Çeviri] Tüm denemeler tükendi:', lastError?.message);
        const isTimeout = lastError?.message === 'TIMEOUT';
        const isRateLimit = lastError?.message?.includes('429');

        if (waitMsg.edit) {
            if (isTimeout) {
                await waitMsg.edit(
                    '⛔ *Çeviri zaman aşımına uğradı.*\n\n' +
                    '💡 Google, sunucunuzdan gelen istekleri yavaşlatıyor olabilir. Birkaç saniye bekleyip tekrar deneyin.'
                );
            } else if (isRateLimit) {
                await waitMsg.edit(
                    '⛔ *Çeviri limiti aşıldı (Rate Limit).*\n\n' +
                    '💡 Google, kısa sürede çok fazla istek nedeniyle geçici olarak engelliyor. 1-2 dk bekleyin.'
                );
            } else {
                await waitMsg.edit(
                    `⛔ *Çeviri başarısız.*\n\n` +
                    `🔍 Hata: ${lastError?.message?.substring(0, 80) || 'Bilinmeyen hata'}`
                );
            }
        }
    }
};
