const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { isOwner, isAdmin } = require('../utils/auth');
const { isOwnerMode, isSafeMode, getConfig, loadData } = require('../utils/dataManager');

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d) parts.push(`${d}g`);
    if (h) parts.push(`${h}s`);
    if (m) parts.push(`${m}d`);
    parts.push(`${s}sn`);
    return parts.join(' ');
}

function formatBytes(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}

function bar(percent, len = 10) {
    const filled = Math.round((percent / 100) * len);
    return '█'.repeat(filled) + '░'.repeat(len - filled) + ` ${percent.toFixed(0)}%`;
}

function getCpuUsage() {
    try {
        const cpus = os.cpus();
        const totals = cpus.reduce((acc, cpu) => {
            const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
            acc.idle += cpu.times.idle;
            acc.total += total;
            return acc;
        }, { idle: 0, total: 0 });
        const used = ((totals.total - totals.idle) / totals.total) * 100;
        return Math.min(used, 100);
    } catch { return 0; }
}

function getDiskUsage() {
    try {
        const out = execSync('df -BM / --output=size,used,avail 2>/dev/null | tail -1', { timeout: 3000 }).toString().trim();
        const parts = out.split(/\s+/);
        if (parts.length >= 3) {
            const total = parseInt(parts[0]);
            const used = parseInt(parts[1]);
            const avail = parseInt(parts[2]);
            return { total, used, avail, percent: (used / total) * 100 };
        }
    } catch {}
    return null;
}

function getTempDir() {
    const tempPath = path.join(__dirname, '../../temp');
    try {
        if (!fs.existsSync(tempPath)) return { count: 0, size: 0 };
        const files = fs.readdirSync(tempPath);
        const size = files.reduce((acc, f) => {
            try { return acc + fs.statSync(path.join(tempPath, f)).size; } catch { return acc; }
        }, 0);
        return { count: files.length, size };
    } catch { return { count: 0, size: 0 }; }
}

function getNodeVersion() {
    return process.version;
}

function getPm2Status() {
    try {
        const out = execSync('pm2 jlist 2>/dev/null', { timeout: 3000 }).toString();
        const list = JSON.parse(out);
        return list.map(p => ({
            name: p.name,
            status: p.pm2_env?.status || '?',
            restarts: p.pm2_env?.restart_time || 0,
            uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0
        }));
    } catch { return null; }
}

function countCommands() {
    try {
        const cmdPath = path.join(__dirname, '../commands');
        return fs.readdirSync(cmdPath).filter(f => f.endsWith('.js')).length;
    } catch { return 0; }
}

module.exports = {
    execute: async (client, msg, args) => {
        const senderId = msg._normalizedUserId || require('../utils/idHelper').getNormalizedId(msg);
        const userIsOwner = isOwner(senderId);
        const userIsAdmin = isAdmin(senderId);

        const memRss = process.memoryUsage();
        const totalRam = os.totalmem();
        const freeRam = os.freemem();
        const usedRam = totalRam - freeRam;
        const ramPercent = (usedRam / totalRam) * 100;
        const botRamMB = memRss.rss / (1024 * 1024);
        const botHeapMB = memRss.heapUsed / (1024 * 1024);

        const cpuUsage = getCpuUsage();
        const cpuModel = os.cpus()?.[0]?.model?.trim() || 'bilinmiyor';
        const cpuCount = os.cpus().length;

        const uptimeSec = Math.floor(process.uptime());
        const sysUptimeSec = Math.floor(os.uptime());

        const disk = getDiskUsage();
        const temp = getTempDir();
        const data = loadData();
        const cmdCount = countCommands();

        // Rol
        let rolStr = 'kullanıcı';
        if (userIsOwner) rolStr = 'kurucu';
        else if (userIsAdmin) rolStr = 'admin';

        let lines = [];

        // ── BOT ─────────────────────────────────────────────────────────
        lines.push(`bot durumu`);
        lines.push(`─────────────────`);
        lines.push(`uptime:    ${formatUptime(uptimeSec)}`);
        lines.push(`node.js:   ${getNodeVersion()}`);
        lines.push(`komutlar:  ${cmdCount} adet yüklü`);
        lines.push(`prefix:    ${getConfig('prefix') || '.'}`);
        lines.push(``);

        // ── MODLAR ──────────────────────────────────────────────────────
        const ownerMode = isOwnerMode();
        const safeMode = isSafeMode();
        lines.push(`modlar`);
        lines.push(`─────────────────`);
        lines.push(`owner modu:  ${ownerMode ? 'AÇIK — sadece kurucu kullanabilir' : 'kapalı'}`);
        lines.push(`safe modu:   ${safeMode ? 'AÇIK — adult içerik bloklu' : 'kapalı'}`);
        lines.push(``);

        // ── RATE LIMIT ──────────────────────────────────────────────────
        lines.push(`hız sınırı`);
        lines.push(`─────────────────`);
        lines.push(`limit:    ${getConfig('rateLimit')} istek / ${getConfig('rateLimitWindow')}sn`);
        lines.push(`bypass:   admin + kurucu sınırsız`);
        lines.push(``);

        // ── KULLANICI ───────────────────────────────────────────────────
        lines.push(`sen`);
        lines.push(`─────────────────`);
        lines.push(`rol:  ${rolStr}`);
        lines.push(`id:   ${senderId}`);
        lines.push(``);

        // ── RAM ─────────────────────────────────────────────────────────
        lines.push(`ram`);
        lines.push(`─────────────────`);
        lines.push(`sistem:  ${bar(ramPercent)}`);
        lines.push(`         ${formatBytes(usedRam)} / ${formatBytes(totalRam)}`);
        lines.push(`bot:     ${botRamMB.toFixed(0)} MB (rss) / heap: ${botHeapMB.toFixed(0)} MB`);
        lines.push(``);

        // ── CPU ─────────────────────────────────────────────────────────
        lines.push(`cpu`);
        lines.push(`─────────────────`);
        lines.push(`model:    ${cpuModel.substring(0, 40)}`);
        lines.push(`çekirdek: ${cpuCount} adet`);
        lines.push(`kullanım: ${bar(cpuUsage)}`);
        lines.push(`sys uptime: ${formatUptime(sysUptimeSec)}`);
        lines.push(``);

        // ── DİSK ────────────────────────────────────────────────────────
        if (disk) {
            lines.push(`disk (/)`);
            lines.push(`─────────────────`);
            lines.push(`kullanım: ${bar(disk.percent)}`);
            lines.push(`         ${disk.used} MB / ${disk.total} MB (${disk.avail} MB boş)`);
            lines.push(``);
        }

        // ── TEMP KLASÖRÜ ────────────────────────────────────────────────
        lines.push(`temp klasörü`);
        lines.push(`─────────────────`);
        lines.push(`dosya: ${temp.count} adet — ${formatBytes(temp.size)}`);
        lines.push(``);

        // ── OWNER DETAYLARI (sadece owner görebilir) ────────────────────
        if (userIsOwner) {
            lines.push(`admin & ban istatistikleri`);
            lines.push(`─────────────────`);
            lines.push(`adminler: ${data.admins.length} kişi`);
            if (data.admins.length > 0) {
                data.admins.slice(0, 5).forEach(a => lines.push(`  ${a}`));
                if (data.admins.length > 5) lines.push(`  ... +${data.admins.length - 5} kişi`);
            }
            lines.push(`banlılar: ${data.banned.length} kişi`);
            lines.push(`muteler:  ${data.muted.length} kişi`);
            lines.push(``);

            // PM2 durumu
            const pm2 = getPm2Status();
            if (pm2 && pm2.length > 0) {
                lines.push(`pm2 süreçleri`);
                lines.push(`─────────────────`);
                pm2.forEach(p => {
                    lines.push(`${p.name}: ${p.status} (restart: ${p.restarts}x)`);
                });
                lines.push(``);
            }

            lines.push(`aktif bot ayarları`);
            lines.push(`─────────────────`);
            lines.push(`rateLimit:     ${getConfig('rateLimit')}`);
            lines.push(`rateLimitWin:  ${getConfig('rateLimitWindow')}sn`);
            lines.push(`whisperModel:  ${getConfig('whisperModel')}`);
            lines.push(`maxDownloadMB: ${getConfig('maxDownloadMB')} MB`);
            lines.push(`ssTimeout:     ${getConfig('ssTimeout')}ms`);
        }

        return msg.reply(lines.join('\n'));
    }
};
