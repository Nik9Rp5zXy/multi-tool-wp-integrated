// Rate Limiting: Max 3 requests per minute
const userRequests = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 3;

/**
 * Checks if a user has exceeded the rate limit
 * @param {string} userId - ID or Phone number of the user
 * @returns {boolean} True if limited, false otherwise
 */
function isRateLimited(userId) {
    const now = Date.now();
    if (!userRequests.has(userId)) {
        userRequests.set(userId, [now]);
        return false;
    }

    const timestamps = userRequests.get(userId);
    // Remove timestamps that are older than the window
    const recentTimestamps = timestamps.filter(ts => (now - ts) < RATE_LIMIT_WINDOW_MS);
    
    if (recentTimestamps.length >= MAX_REQUESTS) {
        // User is rated limited
        userRequests.set(userId, recentTimestamps);
        return true;
    }

    recentTimestamps.push(now);
    userRequests.set(userId, recentTimestamps);
    return false;
}

module.exports = {
    isRateLimited
};
