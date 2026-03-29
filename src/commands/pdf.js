const axios = require('axios');
const cheerio = require('cheerio');
const { MessageMedia } = require('whatsapp-web.js');

module.exports = {
    execute: async (client, msg, args) => {
        const query = args.join(' ');
        if (!query) {
            return msg.reply('Lütfen aranacak Döküman, Kitap veya Makale adını girin.\nÖrn: `.pdf yeraltından notlar dostoyevski`');
        }

        const waitMsg = await msg.reply('🗂️ Avcı Modeli Devrede... Arama motoru "Dork" kombinasyonlarıyla global ağda sızıntı ve PDF taraması başlatıldı (Güvenlik Önlemli)...');

        // DuckDuckGo HTML arayüzünü kullanarak iz bırakmadan Dorking (filetype:pdf) arama taktiği:
        const dorkUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`filetype:pdf "${query}"`)}`;

        try {
            const response = await axios.get(dorkUrl, {
                headers: {
                    // Sahte User-Agent profili
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    'Accept-Language': 'en-US,en;q=0.9,tr-TR;q=0.8,tr;q=0.7'
                }
            });

            const $ = cheerio.load(response.data);
            const rawLinks = [];

            // Arama sonuç linkleri ayrıştırılıyor... 
            $('.result__url').each((i, el) => {
                const rawHref = $(el).attr('href');
                if (rawHref && (rawHref.includes('.pdf') || rawHref.includes('download'))) {
                    // DDG URL Redirect (uddg parameter) decode mekanizması
                    let cleanLink = rawHref;
                    if (rawHref.includes('uddg=')) {
                        cleanLink = decodeURIComponent(rawHref.split('uddg=')[1]?.split('&')[0] || rawHref);
                    }
                    if (cleanLink.startsWith('http') && cleanLink.toLowerCase().includes('.pdf')) {
                        rawLinks.push(cleanLink);
                    }
                }
            });

            // Eğer class bulunamadıysa (Yeni DuckDuckGo Layout'u):
            if (rawLinks.length === 0) {
                $('.result__snippet').each((i, el) => {
                    const parentHref = $(el).parent().attr('href') || $(el).siblings('.result__url').attr('href') || $(el).closest('a').attr('href');
                    if (parentHref && parentHref.includes('uddg=')) {
                         let cleanLink = decodeURIComponent(parentHref.split('uddg=')[1]?.split('&')[0] || parentHref);
                         if (cleanLink.toLowerCase().includes('.pdf')) rawLinks.push(cleanLink);
                    }
                });
            }

            if (rawLinks.length === 0) {
                 if (waitMsg.edit) {
                     return await waitMsg.edit('⛔ Açık arama motorlarında bu kitap/döküman adına eşleşen hiçbir direkt PDF bulunamadı. Lütfen kelimeleri daraltın (Örn: Sadece kitap & Yazar).');
                 } else { return msg.reply('⛔ Bulunamadı.'); }
            }

            const topPdfs = [...new Set(rawLinks)].slice(0, 3); // Sadece benzersiz ilk 3
            const firstTarget = topPdfs[0];

            if (waitMsg.edit) {
               await waitMsg.edit(`🔍 Av Başarılı! \n\nİlk Hedef: ${firstTarget.substring(0, 40)}...\n\nHedef sızılıyor ve dosyaya el konuluyor. Lütfen bekleyin...`);
            }

            try {
                // PDF boyutunu ve ulaşılamazlık Firewall'unu ölç
                const headRes = await axios.head(firstTarget, { timeout: 8000 });
                const contentLength = headRes.headers['content-length'];
                const sizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;

                let reportText = `🎩 *PDF Avcı Raporu: [${query}]*\n\n`;

                // Dosya 0-45 MB ise 
                if (contentLength && sizeMB < 45) {
                    const media = await MessageMedia.fromUrl(firstTarget, { unsafeMime: true });
                    reportText += `1️⃣ Seçenek (Ana Hedef): PDF başarıyla klonlandı.\n`;
                    
                    if (topPdfs.length > 1) {
                        reportText += `\n*Alternatif Rezerv Linkler (İhtiyat):*\n` + topPdfs.slice(1).map((link, idx) => `${idx + 2}. ${link}`).join('\n');
                    }
                    reportText += `\n\n📌 Dosya WhatsApp tünelinden aktarılıyor...`;
                    
                    await client.sendMessage(msg.from, reportText);
                    await client.sendMessage(msg.from, media, { sendMediaAsDocument: true, caption: `Avınız hazır: ${query}` });
                } else {
                    // Limitleri aşıyor (WhatsApp Document > Miktar) veya güvenlik engelli
                    throw new Error("Boyut Güvenlik İstisnası / Cloudflare Koruması Actif");
                }
            } catch (downloadErr) {
                // İndirme Reddedildiyse veya boyutu devasa bir ansiklopediyse
                let fallbackText = `🎩 *PDF Avcı Raporu: [${query}]*\n\n_(Not: Ana dosya 45+ MB boyutunda çok ağır bir kütüphane parçası veya okul/üniversite Cloudflare duvarı barındırıyor. Bizzat orijinal adresleri teslim alınız.)_\n\n`;
                
                topPdfs.forEach((link, idx) => {
                    fallbackText += `📑 *PDF ${idx + 1}:* ${link}\n\n`;
                });

                await client.sendMessage(msg.from, fallbackText);
            }
        } catch (searchErr) {
            console.error('PDF Arama Hatası (DDG Block):', searchErr.message);
            if (waitMsg.edit) {
                await waitMsg.edit('⛔ Hedef ağdaki anti-virüs sistemleri sorgunuzu birkaç saniyeliğine blokladı. Bekleyip tekrar deneyin.');
            } else { msg.reply('⛔ Çok fazla istek (Rate Limit).'); }
        }
    }
};
