require('dotenv').config();
const { loadData } = require('./dataManager');

// Owner ID - matches the reference project format
const OWNER_ID = process.env.OWNER_NUMBER || '905510395152@c.us';

/**
 * Checks if the user is the bot owner.
 * @param {string} userId - WhatsApp ID (canonical format: number@c.us)
 */
function isOwner(userId) {
    return userId === OWNER_ID;
}

/**
 * Checks if the user is an admin (Explicitly in .env or dynamically in storage).
 * @param {string} userId - WhatsApp ID (canonical format: number@c.us)
 */
function isAdmin(userId) {
    if (isOwner(userId)) return true;
    
    // Check .env admins
    const envAdmins = (process.env.ADMIN_NUMBERS || "").split(',').map(n => n.trim()).filter(n => n);
    if (envAdmins.includes(userId)) return true;

    // Check persistent storage admins
    const data = loadData();
    return data.admins.includes(userId);
}

/**
 * Checks if the user is banned.
 * @param {string} userId - WhatsApp ID (canonical format: number@c.us)
 */
function isBanned(userId) {
    const data = loadData();
    return data.banned.includes(userId);
}

/**
 * Checks if the user is muted.
 * @param {string} userId - WhatsApp ID (canonical format: number@c.us)
 */
function isMuted(userId) {
    const data = loadData();
    return data.muted.includes(userId);
}

module.exports = {
    isOwner,
    isAdmin,
    isBanned,
    isMuted,
    isAuthorized: isAdmin, // backward compatibility
    OWNER_ID
};
