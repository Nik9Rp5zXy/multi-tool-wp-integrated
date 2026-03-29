module.exports = {
    execute: async (client, msg, args) => {
        const helpText = `*🤖 WhatsApp Bot Komutları:*\n\n` +
            `👉 *.format [png/jpg/webp]*\nGönderdiğiniz resmi istediğiniz formata dönüştürür.\n\n` +
            `👉 *.sticker*\nGönderdiğiniz resim veya videoyu çıkartmaya (sticker) çevirir.\n\n` +
            `👉 *.document basla / bitir*\nSırayla gönderdiğiniz fotoğrafları tek bir PDF dosyasında birleştirir.\n\n` +
            `👉 *.download [URL]*\nYouTube, Instagram vb. bağlantılardaki videoları MP4 olarak indirir. (Admin yetkisi gerekir)\n\n` +
            `👉 *.transcribe*\nYanıtladığınız veya gönderdiğiniz bir ses kaydını/videoyu metne döker. (Ekstra Dil Seçeneği Gerekmez, Yapay Zeka Otomatik Algılar - Admin)\n\n` +
            `👉 *.status*\nBotun mevcut çalışma durumunu, harcadığı belleği ve yetki seviyenizi gösterir.`;
            
        return msg.reply(helpText);
    }
};
