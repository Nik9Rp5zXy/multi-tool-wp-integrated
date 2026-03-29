const { translate } = require('@vitalets/google-translate-api');

module.exports = {
    execute: async (client, msg, args) => {
        let textToTranslate = args.join(' ');

        // Eğer args boşsa ve başka bir mesaja yanıt verilmişse, o mesajı hedef al
        if (!textToTranslate && msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            textToTranslate = quoted.body;
        }

        if (!textToTranslate) {
            return msg.reply('Lütfen çevrilecek metni yazın veya çevrilecek bir mesaja yanıt vererek `.ceviri` yazın.\n\n_Örnek: .ceviri Hello world_');
        }

        const waitMsg = await msg.reply('🔄 Web tabanlı sınırsız çeviri yapılıyor, lütfen bekleyin...');

        try {
            // Google Translate web arayüzünü kazıyarak otomatik dili algıla ve Türkçe'ye çevir. (Ücretsiz API gerektirmez)
            // Eğer asıl metin zaten Türkçe ise, İngilizceye çevir.
            
            // Text dilini tespit etmek de translate fonksiyonuyla yapılır. Ama varsayılan 'tr' hedefi sorunsuz çalışır.
            // Eğer çeviren metin zaten türkçeyse, 'tr' yerine hedefini 'en' yapalım:
            let targetLang = 'tr';
            
            const result = await translate(textToTranslate, { to: targetLang });
            
            // Eğer Google zaten metni %100 Tr algıladıysa ve biz de tr'ye çevirip aynı şeyi aldıysak, demek ki İngilizce istiyor.
            if (result.raw.src === 'tr' && result.text === textToTranslate) {
                const enResult = await translate(textToTranslate, { to: 'en' });
                await waitMsg.edit(`🇬🇧 *Çeviri Sonucu (İngilizce):*\n\n${enResult.text}`);
            } else {
                await waitMsg.edit((result.raw.src !== 'tr' ? `🇹🇷` : `🌐`) + ` *Çeviri Sonucu (${result.raw.src.toUpperCase()} -> TR):*\n\n${result.text}`);
            }

        } catch (error) {
            console.error('Çeviri hatası:', error.message);
            if (waitMsg.edit) {
               await waitMsg.edit('⛔ Çeviri motoru aşırı isteklere karşı korunuyor olabilir. Lütfen daha sonra tekrar deneyin.');
            } else {
               msg.reply('⛔ Çeviri işlemi başarısız oldu.');
            }
        }
    }
};
