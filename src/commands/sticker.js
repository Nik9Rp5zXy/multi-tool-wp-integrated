const { MessageMedia } = require('whatsapp-web.js');
const { getTargetMedia } = require('../utils/idHelper');

module.exports = {
    execute: async (client, msg, args) => {
        try {
            const media = await getTargetMedia(msg);
            
            if (!media) {
                return msg.reply('Lütfen sticker yapmak istediğiniz resmi veya videoyu gönderin, ya da o mesaja yanıt vererek `.sticker` yazın.');
            }

            msg.reply('Sticker oluşturuluyor, lütfen bekleyin... ⏳');

            // WhatsApp Web JS if system has FFmpeg, handles video to sticker implicitly.
            await client.sendMessage(msg.from, media, {
                sendMediaAsSticker: true,
                stickerName: 'Custom Sticker',
                stickerAuthor: 'WhatsApp Bot'
            });
        } catch (error) {
            console.error('Sticker hatası:', error);
            msg.reply('Sticker oluşturulurken bir problem yaşandı. Eğer video gönderdiyseniz FFmpeg sistemde kurulu olmayabilir.');
        }
    }
};
