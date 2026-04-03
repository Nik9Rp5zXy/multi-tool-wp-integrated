require('dotenv').config();
const { loadData } = require('./dataManager');

// Owner ID — @c.us suffix yoksa otomatik ekle
const RAW_OWNER = (process.env.OWNER_NUMBER || '905510395152').trim();
const OWNER_ID = RAW_OWNER.includes('@') ? RAW_OWNER : `${RAW_OWNER}@c.us`;

/**
 * Normalizes an ID for comparison (strips @c.us, @lid, whitespace)
 */
function normalizeForCompare(id) {
    if (!id) return '';
    return id.replace(/@c\.us$/, '').replace(/@lid$/, '').trim();
}

/**
 * Checks if the user is the bot owner.
 */
function isOwner(userId) {
    if (!userId) return false;
    // Exact match first
    if (userId === OWNER_ID) return true;
    // Normalized match (handles format differences)
    return normalizeForCompare(userId) === normalizeForCompare(OWNER_ID);
}

/**
 * Checks if the user is an admin (includes owner).
 */
function isAdmin(userId) {
    if (isOwner(userId)) return true;

    const normalizedUser = normalizeForCompare(userId);

    // Check .env admins
    const envAdmins = (process.env.ADMIN_NUMBERS || "").split(',').map(n => n.trim()).filter(n => n);
    for (const admin of envAdmins) {
        if (normalizeForCompare(admin) === normalizedUser) return true;
    }

    // Check persistent storage admins
    const data = loadData();
    for (const admin of data.admins) {
        if (normalizeForCompare(admin) === normalizedUser) return true;
    }

    return false;
}

/**
 * Checks if the user is banned.
 */
function isBanned(userId) {
    if (isOwner(userId)) return false; // Owner asla banlanamaz
    const data = loadData();
    const normalized = normalizeForCompare(userId);
    return data.banned.some(id => normalizeForCompare(id) === normalized);
}

/**
 * Checks if the user is muted.
 */
function isMuted(userId) {
    if (isOwner(userId)) return false; // Owner asla susturulamaz
    const data = loadData();
    const normalized = normalizeForCompare(userId);
    return data.muted.some(id => normalizeForCompare(id) === normalized);
}

module.exports = {
    isOwner,
    isAdmin,
    isBanned,
    isMuted,
    isAuthorized: isAdmin,
    OWNER_ID
};
