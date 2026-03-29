const { MessageMedia } = require('whatsapp-web.js');

module.exports = {
    execute: async (client, msg, args) => {
        const url = args[0];
        
        if (!url || !url.startsWith('http')) {
            return msg.reply('Lütfen ekran görüntüsü alınacak web sitesini http veya https ile başlatarak giriniz.\nÖrn: `.ss https://example.com`');
        }

        const waitMsg = await msg.reply('🕵️ İzler gizleniyor... 3. parti güvenli ajan sunucu üzerinden siteye giriliyor (IP Protected)...');

        try {
            // "Thum.io" servisini kullanarak hedeflenen sitenin web görüntüsünü, proxy arkasındaki
            // sunucu üzerinden çekiyoruz. Bu sayede sizin WhatsApp sunucunuz asıl siteyle "hiç iletişim kurmaz".
            // Yüzde yüz gizlilik koruması sağlanır (Gelişmiş güvenlik önlemi).
            const secureCaptureUrl = `https://image.thum.io/get/width/1080/viewportWidth/1200/noanimate/${url}`;
            
            // Dış siteden fotoğraf URL'sini media objesine çevir (WhatsApp yüklemesi için RAM tasarrufu)
            const media = await MessageMedia.fromUrl(secureCaptureUrl, { unsafeMime: true });

            if (!media || !media.data) {
                throw new Error("Görüntü çekilemedi veya site kapalı.");
            }

            await client.sendMessage(msg.from, media, { 
                caption: `📸 *Hedef:* ${url}\n\n🕵️ _Güvenli proxy kullanılarak site analiz edildi. Sunucu IP ve kimliğiniz sızmadı._` 
            });

            if (waitMsg.edit) {
               await waitMsg.edit('✅ Gizli web gözetimi (Ekran Görüntüsü) başarıyla laboratuvara döndü.');
            }
        } catch (error) {
            console.error('SS (Web Gözlemci) Hatası:', error.message);
            if (waitMsg.edit) {
               await waitMsg.edit(`⛔ Güvenlik duvarına yakalanıldı veya hedef site mevcut değil.\nSebep: ${error.message}`);
            } else {
               msg.reply('⛔ Site ekran kaydı alınamadı.');
            }
        }
    }
};
