require('dotenv').config();
const { loadData } = require('./dataManager');

/**
 * Checks if the user is the bot owner.
 * @param {string} userId - WhatsApp ID
 */
function isOwner(userId) {
    const owner = process.env.OWNER_NUMBER || "";
    return userId === owner;
}

/**
 * Checks if the user is an admin (Explicitly in .env or dynamically in storage).
 * @param {string} userId - WhatsApp ID
 */
function isAdmin(userId) {
    if (isOwner(userId)) return true;
    
    // Check .env admins
    const envAdmins = (process.env.ADMIN_NUMBERS || "").split(',').map(n => n.trim());
    if (envAdmins.includes(userId)) return true;

    // Check persistent storage admins
    const data = loadData();
    return data.admins.includes(userId);
}

/**
 * Checks if the user is banned.
 * @param {string} userId - WhatsApp ID
 */
function isBanned(userId) {
    const data = loadData();
    return data.banned.includes(userId);
}

/**
 * Checks if the user is muted.
 * @param {string} userId - WhatsApp ID
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
    isAuthorized: isAdmin // backward compatibility
};
