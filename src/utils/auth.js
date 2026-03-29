require('dotenv').config();

/**
 * Control if a user is authorized for heavy commands
 * @param {string} userId - The user ID from WhatsApp (e.g. 905xxxxxxxxx@c.us)
 * @returns {boolean} True if authorized, false otherwise
 */
function isAuthorized(userId) {
    const defaultAdmins = process.env.ADMIN_NUMBERS || "";
    const adminList = defaultAdmins.split(',').map(n => n.trim());
    return adminList.includes(userId);
}

module.exports = {
    isAuthorized
};
