const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { ensureTempDir } = require('./src/utils/garbageCollector');
const { isRateLimited } = require('./src/utils/rateLimiter');
const { resolveUserId, resolveMentionedId } = require('./src/utils/idHelper');
const { isBanned, isMuted } = require('./src/utils/auth');
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
    // Generate and scan this code with your phone
    qrcode.generate(qr, { small: true });
    console.log('SCAN THE QR CODE ABOVE TO LOGIN!');
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is ready and connected!');
});

client.on('message', async msg => {
    try {
        const prefix = '.';

        // Resolve the real canonical user ID (handles group @lid vs DM @c.us)
        const senderId = await resolveUserId(msg);

        // Attach resolved ID and resolver function to message for use in commands
        msg._normalizedUserId = senderId;
        msg._resolveMentionedId = resolveMentionedId;

        // 1. Check if user is BANNED (Critical)
        if (isBanned(senderId)) return;

        // Guard: media-only messages have no body
        const body = msg.body || '';

        // 2. Check active session for document command before skipping prefix
        const docCommand = commands.get('document');
        if (docCommand && docCommand.isUserInSession && docCommand.isUserInSession(senderId)) {
            if (!body.startsWith(prefix)) {
                // 1.5 Check if user is MUTED (Only ignore if not prefix command)
                if (isMuted(senderId)) return;
                return await docCommand.execute(client, msg, []);
            }
        }

        if (!body.startsWith(prefix)) return;
        
        // 3. Check if user is MUTED (Ignore commands)
        if (isMuted(senderId)) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (commands.has(commandName)) {
            
            // Apply Rate Limiting
            if (isRateLimited(senderId)) {
                return msg.reply('⏳ Dakikada en fazla 3 istek yapabilirsiniz. Lütfen biraz bekleyip tekrar deneyin.');
            }

            console.log(`[ROUTE] Executing: ${commandName} -> User: ${senderId}`);
            const command = commands.get(commandName);
            await command.execute(client, msg, args);
        }
    } catch (err) {
        console.error('Error handling message:', err);
        msg.reply('❌ İşlem sırasında bir hata oluştu.').catch(() => {});
    }
});

client.initialize();
