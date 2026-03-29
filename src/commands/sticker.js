const { MessageMedia } = require('whatsapp-web.js');

module.exports = {
    execute: async (client, msg, args) => {
        if (!msg.hasMedia) {
            return msg.reply('Lütfen sticker yapmak istediğiniz resmi, videoyu veya GIF dosyasını mesaja ekleyerek `.sticker` komutunu gönderin.');
        }

        try {
            msg.reply('Sticker oluşturuluyor, lütfen bekleyin... ⏳');
            const media = await msg.downloadMedia();
            
            if (!media) {
                return msg.reply('Medya başarılı bir şekilde indirilemedi.');
            }

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
