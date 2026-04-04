const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { ensureTempDir } = require('./src/utils/garbageCollector');
const { isRateLimited, getRateLimitInfo } = require('./src/utils/rateLimiter');
const { resolveUserId, resolveMentionedId } = require('./src/utils/idHelper');
const { isBanned, isMuted, isOwner, isAdmin } = require('./src/utils/auth');
const { isOwnerMode, isSafeMode, getConfig } = require('./src/utils/dataManager');
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

    // Zamanlanmış Owner Modu kontrolcüsü
    setInterval(() => {
        const { isOwnerMode, getOwnerModeUntil, setOwnerMode } = require('./src/utils/dataManager');
        const currentMode = isOwnerMode();
        const untilMs = getOwnerModeUntil();

        if (currentMode && untilMs && Date.now() >= untilMs) {
            setOwnerMode(false, null);
            const rawOwner = (process.env.OWNER_NUMBER || '905510395152').trim();
            const ownerJid = rawOwner.includes('@') ? rawOwner : `${rawOwner}@c.us`;
            
            client.sendMessage(ownerJid, '⏳ *Süre Doldu*\n\nBot şu an itibarıyla herkesin kullanımına açıldı. (Owner Modu kapandı. 🔓)')
                .catch(err => console.log('[Scheduler] Owner mesajı gönderilemedi:', err.message));
        }
    }, 60000); // Her dakikada bir kontrol et
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
            return msg.reply('bot şu an kilitli, sadece kurucu kullanabilir');
        }

        // 5. Safe Mode — adult komutu blokla
        if (isSafeMode() && commandName === 'adult') {
            return msg.reply('safe mod açık, adult komutları şu an bloklu');
        }

        // 6. Rate Limiting — Admin ve Owner bypass eder (rateLimiter içinde hallediliyor)
        if (isRateLimited(senderId)) {
            const info = getRateLimitInfo(senderId);
            return msg.reply(`yavaş biraz, ${info.resetInSec} saniye içinde sıfırlanıyor (${info.used}/${info.max})`);
        }

        console.log(`[ROUTE] Executing: ${commandName} -> User: ${senderId}${isOwner(senderId) ? ' [OWNER]' : isAdmin(senderId) ? ' [ADMIN]' : ''}`);
        const command = commands.get(commandName);
        await command.execute(client, msg, args);

    } catch (err) {
        console.error('Error handling message:', err);
        msg.reply('bir şeyler ters gitti, tekrar dene').catch(() => {});
    }
});

client.initialize();
