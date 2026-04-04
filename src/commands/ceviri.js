const { translate } = require('@vitalets/google-translate-api');
const { createReporter } = require('../utils/reporter');

const TRANSLATE_TIMEOUT = 12000;

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
        let targetLang = 'tr';
        const langCodes = ['en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja', 'ko', 'zh', 'pt', 'nl', 'pl', 'tr', 'az'];

        let textArgs = args;
        if (args.length >= 1 && langCodes.includes(args[0].toLowerCase())) {
            targetLang = args[0].toLowerCase();
            textArgs = args.slice(1);
        }

        let textToTranslate = textArgs.join(' ');

        if (!textToTranslate && msg.hasQuotedMsg) {
            try {
                const quoted = await msg.getQuotedMessage();
                textToTranslate = quoted.body;
            } catch {}
        }

        if (!textToTranslate) {
            return msg.reply(
                'kullanım: .ceviri [metin]\n' +
                'ya da mesaja yanıt verin: .ceviri\n\n' +
                'hedef dil değişimi:\n' +
                '.ceviri en merhaba -> ingilizce\n' +
                '.ceviri ru merhaba -> rusça\n' +
                '.ceviri ru (yanıt ile) -> mesajı rusçaya çevirir\n' +
                '(varsayılan: türkçe)'
            );
        }

        const reporter = await createReporter(msg, 'çevriliyor...');

        const MAX_RETRIES = 3;
        let lastError;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await withTimeout(
                    translate(textToTranslate, { to: targetLang }),
                    TRANSLATE_TIMEOUT
                );

                const srcLang = result.raw?.src || '?';

                // tr -> tr olursa en yap
                if (targetLang === 'tr' && srcLang === 'tr') {
                    const enResult = await withTimeout(
                        translate(textToTranslate, { to: 'en' }),
                        TRANSLATE_TIMEOUT
                    );
                    return await reporter.done(`[tr -> en]\n\n${enResult.text}`);
                }

                return await reporter.done(`[${srcLang} -> ${targetLang}]\n\n${result.text}`);

            } catch (error) {
                lastError = error;
                const isTimeout = error.message === 'TIMEOUT';
                const isRateLimit = error.message?.includes('429');

                if (attempt < MAX_RETRIES) {
                    const waitTime = isRateLimit ? 3000 : 1500;
                    await reporter.edit(`çevriliyor... (deneme ${attempt + 1}/${MAX_RETRIES}${isTimeout ? ' - tekrar bağlanıyor' : ''})`);
                    await new Promise(r => setTimeout(r, waitTime));
                }
            }
        }

        console.error('[Çeviri] Hata:', lastError?.message);
        const isTimeout = lastError?.message === 'TIMEOUT';
        const isRateLimit = lastError?.message?.includes('429');

        if (isTimeout) {
            await reporter.done('çeviri zaman aşımına uğradı, google istekleri yavaşlatıyor olabilir. birazdan tekrar dene');
        } else if (isRateLimit) {
            await reporter.done('çeviri limiti aşıldı, kısa sürede çok fazla istek var. 1-2 dk bekle');
        } else {
            await reporter.done(`çeviri başarısız: ${lastError?.message?.substring(0, 80) || 'bilinmeyen hata'}`);
        }
    }
};
