const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { ensureTempDir } = require('./src/utils/garbageCollector');
const { isRateLimited } = require('./src/utils/rateLimiter');
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
        if (!msg.body.startsWith(prefix)) return;

        const args = msg.body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (commands.has(commandName)) {
            // Apply Rate Limiting
            if (isRateLimited(msg.from)) {
                return msg.reply('⏳ Dakikada en fazla 3 istek yapabilirsiniz. Lütfen biraz bekleyip tekrar deneyin.');
            }

            console.log(`[ROUTE] Executing: ${commandName} -> User: ${msg.from}`);
            const command = commands.get(commandName);
            await command.execute(client, msg, args);
        }
    } catch (err) {
        console.error('Error handling message:', err);
        msg.reply('❌ İşlem sırasında bir hata oluştu.').catch(() => {});
    }
});

client.initialize();
