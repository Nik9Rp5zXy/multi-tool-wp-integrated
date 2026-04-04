const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../data/storage.json');

// Varsayılan storage şeması — tüm alanlar tanımlı
const DEFAULT_DATA = {
    banned: [],
    muted: [],
    admins: [],
    ownerMode: false,       // Sadece owner kullanabilir modu
    safeMode: false,        // Güvenli mod: adult komutları gizlenir/bloklanır
    config: {               // Bot ayarları — .ayar komutuyla değiştirilebilir
        rateLimit: 3,           // Dakikada max istek (kullanıcılar için)
        rateLimitWindow: 60,    // Saniye cinsinden pencere
        whisperModel: 'small',  // transcribe model: tiny/base/small/medium/large
        maxDownloadMB: 95,      // Max indirilebilir video boyutu (MB)
        ssTimeout: 10000,       // .ss komut timeout (ms)
        prefix: '.'             // Komut prefix'i
    }
};

function loadData() {
    try {
        if (!fs.existsSync(STORAGE_PATH)) {
            saveData(DEFAULT_DATA);
            return JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
        const raw = fs.readFileSync(STORAGE_PATH, 'utf8');
        const parsed = JSON.parse(raw);

        // Eksik alanları DEFAULT_DATA'dan tamamla (migration)
        const merged = {
            ...DEFAULT_DATA,
            ...parsed,
            config: { ...DEFAULT_DATA.config, ...(parsed.config || {}) }
        };
        return merged;
    } catch (err) {
        console.error('[DataManager] Load error:', err);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
}

function saveData(data) {
    try {
        const dir = path.dirname(STORAGE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 4));
    } catch (err) {
        console.error('[DataManager] Save error:', err);
    }
}

// Config yardımcıları
function getConfig(key) {
    const data = loadData();
    return data.config[key] ?? DEFAULT_DATA.config[key];
}

function setConfig(key, value) {
    const data = loadData();
    if (!(key in DEFAULT_DATA.config)) return false;
    data.config[key] = value;
    saveData(data);
    return true;
}

function isOwnerMode() {
    const data = loadData();
    return data.ownerMode === true;
}

function setOwnerMode(active) {
    const data = loadData();
    data.ownerMode = active;
    saveData(data);
}

function isSafeMode() {
    const data = loadData();
    return data.safeMode === true;
}

function setSafeMode(active) {
    const data = loadData();
    data.safeMode = active;
    saveData(data);
}

module.exports = {
    loadData,
    saveData,
    getConfig,
    setConfig,
    isOwnerMode,
    setOwnerMode,
    isSafeMode,
    setSafeMode,
    DEFAULT_CONFIG: DEFAULT_DATA.config
};
