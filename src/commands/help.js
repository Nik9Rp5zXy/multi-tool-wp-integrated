module.exports = {
    execute: async (client, msg, args) => {
        const helpText = `*🤖 WhatsApp Bot Komutları:*\n\n` +
            `👉 *.format [png/jpg/webp]*\nGönderdiğiniz resmi istediğiniz formata dönüştürür.\n\n` +
            `👉 *.sticker*\nGönderdiğiniz resim veya videoyu çıkartmaya (sticker) çevirir.\n\n` +
            `👉 *.document basla / bitir*\nSırayla gönderdiğiniz fotoğrafları tek bir PDF dosyasında birleştirir.\n\n` +
            `👉 *.download [URL]*\nYouTube, Instagram vb. bağlantılardaki videoları MP4 olarak indirir. (Admin yetkisi gerekir)\n\n` +
            `👉 *.transcribe*\nYanıtladığınız veya gönderdiğiniz bir ses kaydını/videoyu metne döker. (Admin yetkisi gerekir)`;
            
        return msg.reply(helpText);
    }
};
