/**
 * Extracts the real User ID from a message, preventing Group/DM conflicts.
 * Replaces new @lid identifiers with @c.us if necessary.
 * @param {object} msg - The message object from whatsapp-web.js
 * @returns {string} The normalized user ID
 */
function getNormalizedId(msg) {
    const rawId = msg.author || msg.from;
    return rawId.replace(/@lid$/, '@c.us');
}

/**
 * Gets media from the current message or the quoted message
 * @param {object} msg - The message object
 * @returns {Promise<Media>} Media object or null
 */
async function getTargetMedia(msg) {
    if (msg.hasMedia) {
        return await msg.downloadMedia();
    }
    
    if (msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.hasMedia) {
            return await quotedMsg.downloadMedia();
        }
    }
    return null;
}

module.exports = {
    getNormalizedId,
    getTargetMedia
};
