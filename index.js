const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { ensureTempDir } = require('./src/utils/garbageCollector');
const { isRateLimited, getRateLimitInfo } = require('./src/utils/rateLimiter');
const { resolveUserId, resolveMentionedId } = require('./src/utils/idHelper');
const { isBanned, isMuted, isOwner, isAdmin } = require('./src/utils/auth');
const { isOwnerMode, getConfig } = require('./src/utils/dataManager');
require('dotenv').config();

// Ensure the temp directory exists at startup
ensureTempDir();

// Initialize the WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Load commands dynamically
const commands = new Map();
const commandsPath = path.join(__dirname, 'src', 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const commandName = file.split('.')[0];
        const commandModule = require(path.join(commandsPath, file));
        commands.set(commandName, commandModule);
        console.log(`[BOOT] Loaded command: .${commandName}`);
    }
}

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('SCAN THE QR CODE ABOVE TO LOGIN!');
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is ready and connected!');
});

client.on('message', async msg => {
    try {
        const prefix = getConfig('prefix') || '.';

        // Resolve the real canonical user ID (handles group @lid vs DM @c.us)
        const senderId = await resolveUserId(msg);

        // Attach resolved ID and resolver function to message for use in commands
        msg._normalizedUserId = senderId;
        msg._resolveMentionedId = resolveMentionedId;

        // 1. Check if user is BANNED
        if (isBanned(senderId)) return;

        // Guard: media-only messages have no body
        const body = msg.body || '';

        // 2. Check active session for document command before skipping prefix
        const docCommand = commands.get('document');
        if (docCommand && docCommand.isUserInSession && docCommand.isUserInSession(senderId)) {
            if (!body.startsWith(prefix)) {
                if (isMuted(senderId)) return;
                return await docCommand.execute(client, msg, []);
            }
        }

        if (!body.startsWith(prefix)) return;

        // 3. Check if user is MUTED
        if (isMuted(senderId)) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (!commands.has(commandName)) return;

        // 4. Owner Mode — sadece owner kullanabilir
        if (isOwnerMode() && !isOwner(senderId)) {
            // Sadece "ownermode" komutunu geçir ki owner kapatabilsin (zaten owner kontrolü var içinde)
            return msg.reply('🔒 Bot şu anda *sadece Kurucu* tarafından kullanılabilir.\n_(Owner modu aktif)_');
        }

        // 5. Rate Limiting — Admin ve Owner bypass eder (rateLimiter içinde hallediliyor)
        if (isRateLimited(senderId)) {
            const info = getRateLimitInfo(senderId);
            return msg.reply(
                `⏳ *Hız Sınırı Aşıldı*\n\n` +
                `📊 ${info.used}/${info.max} istek kullanıldı.\n` +
                `🕐 ${info.resetInSec} saniye sonra sıfırlanacak.\n\n` +
                `_Admin/Owner için sınır yoktur._`
            );
        }

        console.log(`[ROUTE] Executing: ${commandName} -> User: ${senderId}${isOwner(senderId) ? ' [OWNER]' : isAdmin(senderId) ? ' [ADMIN]' : ''}`);
        const command = commands.get(commandName);
        await command.execute(client, msg, args);

    } catch (err) {
        console.error('Error handling message:', err);
        msg.reply('❌ İşlem sırasında bir hata oluştu.').catch(() => {});
    }
});

client.initialize();
