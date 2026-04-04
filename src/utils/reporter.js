/**
 * Grup/DM farkını yöneten akıllı mesaj yardımcısı.
 * 
 * Grup: "sorgulanıyor..." gibi ara mesajlar yok — sadece sonuç gönderilir
 * DM: edit() ile tek mesajda güncellenir
 */
async function createReporter(msg, initialText) {
    const isGroup = msg.from && msg.from.endsWith('@g.us');

    if (isGroup) {
        // Grupta ara mesaj yok, edit() çağrıları no-op, sonunda reply()
        let finalText = initialText;
        return {
            isGroup: true,
            edit: async (text) => { finalText = text; },
            done: async (text) => {
                const out = text || finalText;
                await msg.reply(out);
            }
        };
    } else {
        // DM: başlangıç mesajı gönder, sonra edit()
        const waitMsg = await msg.reply(initialText);
        return {
            isGroup: false,
            edit: async (text) => {
                try {
                    await waitMsg.edit(text);
                } catch {
                    // edit başarısız olursa yeni mesaj
                    await msg.reply(text);
                }
            },
            done: async (text) => {
                if (text) {
                    try {
                        await waitMsg.edit(text);
                    } catch {
                        await msg.reply(text);
                    }
                }
            }
        };
    }
}

module.exports = { createReporter };
