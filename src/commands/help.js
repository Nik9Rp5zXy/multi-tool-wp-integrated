module.exports = {
    execute: async (client, msg, args) => {
        const helpText = `*🤖 WhatsApp Bot Komutları:*\n\n` +
            `👉 *.format [png/jpg/webp/gif/mp3/mp4/mkv/wav...]*\nGönderdiğiniz (Ses/Video/Resim) medyasını anında istediğiniz formata dönüştürür. (Mega Converter)\n_Örn: .format mp3_ (Videoyu şarkı yapar) 🔥\n\n` +
            `👉 *.sticker*\nGönderdiğiniz resim veya videoyu çıkartmaya (sticker) çevirir. (Hareketli çıkartmalar desteklenir).\n\n` +
            `👉 *.document basla / bitir*\nSırayla gönderdiğiniz fotoğrafları tek bir PDF dosyasında birleştirir.\n\n` +
            `👉 *.download [URL]*\nYouTube, Instagram vb. bağlantılardaki videoları izlenebilir Formatında MP4 olarak indirir. (Admin yetkisi gerekir)\n\n` +
            `👉 *.transcribe [hizli / detayli]*\nYanıtladığınız veya gönderdiğiniz bir ses kaydını/videoyu metne döker. İsteğe bağlı olarak "hizli" veya "detayli" yazarak kaliteyi seçebilirsiniz. (Yapay Zeka Otomatik Algılar - Admin)\n\n` +
            `👉 *.pdf [kitap adı]*\nHedef Döküman veya Makalenin direkt PDF yollarını "İleri Düzey" yöntemlerle internetten kazıyıp önünüze atar (Avcı Asistan) 🕵️\n\n` +
            `👉 *.ss [URL]*\nSunucu kimliğinizi tamamen gizleyerek (Proxy), hedef girdiğiniz siteye ajan yollar ve net bir ekran görüntüsü/Analiz çıkartır. 🕵️\n\n` +
            `👉 *.ceviri [metin]*\nMesaja yanıt vererek veya yana metin yazarak, o dili (Ücretsiz) doğrudan Türkçe'ye çevirmenizi sağlar.\n\n` +
            `👉 *.status*\nBotun mevcut çalışma durumunu, harcadığı belleği ve sunucu donanım istatistiklerini gösterir.`;
            
        return msg.reply(helpText);
    }
};
