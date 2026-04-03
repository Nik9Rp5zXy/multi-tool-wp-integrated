// Rate Limiting — Admin ve Owner otomatik bypass eder
const userRequests = new Map();

const { isAdmin } = require('./auth');
const { getConfig } = require('./dataManager');

/**
 * Checks if a user has exceeded the rate limit.
 * Admins and Owners are NEVER rate limited.
 * @param {string} userId
 * @returns {boolean} true = limited (block), false = allow
 */
function isRateLimited(userId) {
    // Admin/Owner → her zaman serbest
    if (isAdmin(userId)) return false;

    const now = Date.now();

    // Ayarlardan dinamik değerleri oku
    const maxRequests = getConfig('rateLimit');          // varsayılan: 3
    const windowMs = getConfig('rateLimitWindow') * 1000; // saniye → ms

    if (!userRequests.has(userId)) {
        userRequests.set(userId, [now]);
        return false;
    }

    const timestamps = userRequests.get(userId);
    const recentTimestamps = timestamps.filter(ts => (now - ts) < windowMs);

    if (recentTimestamps.length >= maxRequests) {
        userRequests.set(userId, recentTimestamps);
        return true;
    }

    recentTimestamps.push(now);
    userRequests.set(userId, recentTimestamps);
    return false;
}

/**
 * Returns remaining window seconds for a user (for informational messages)
 */
function getRateLimitInfo(userId) {
    const windowMs = getConfig('rateLimitWindow') * 1000;
    const maxRequests = getConfig('rateLimit');
    const timestamps = userRequests.get(userId) || [];
    const now = Date.now();
    const recent = timestamps.filter(ts => (now - ts) < windowMs);
    const oldest = recent[0] || now;
    const resetInSec = Math.ceil((oldest + windowMs - now) / 1000);
    return { used: recent.length, max: maxRequests, resetInSec };
}

module.exports = {
    isRateLimited,
    getRateLimitInfo
};
