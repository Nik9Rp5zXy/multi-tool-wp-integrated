const fs = require('fs');
const path = require('path');

const ALIAS_PATH = path.join(__dirname, '../data/aliases.json');

// ─── In-memory cache for fast ID resolution ───
const idCache = new Map();

/**
 * Loads the alias map from disk.
 * @returns {object} A map of alias_id -> primary_id
 */
function loadAliases() {
    try {
        if (!fs.existsSync(ALIAS_PATH)) {
            fs.writeFileSync(ALIAS_PATH, '{}');
            return {};
        }
        return JSON.parse(fs.readFileSync(ALIAS_PATH, 'utf-8'));
    } catch (err) {
        console.error('[ID-LINK] Alias load error:', err);
        return {};
    }
}

/**
 * Persists the alias map to disk.
 * @param {object} aliases - The alias map
 */
function saveAliases(aliases) {
    try {
        fs.writeFileSync(ALIAS_PATH, JSON.stringify(aliases, null, 4));
    } catch (err) {
        console.error('[ID-LINK] Alias save error:', err);
    }
}

/**
 * Gets the stored alias (primary ID) for a given raw ID.
 * @param {string} aliasId
 * @returns {string|null}
 */
function getAlias(aliasId) {
    const aliases = loadAliases();
    return aliases[aliasId] || null;
}

/**
 * Stores an alias mapping (rawId -> canonicalId).
 * @param {string} aliasId
 * @param {string} primaryId
 */
function setAlias(aliasId, primaryId) {
    const aliases = loadAliases();
    aliases[aliasId] = primaryId;
    saveAliases(aliases);
}

/**
 * Migrates all stored data from an old ID to a new canonical ID.
 * This ensures ban/mute/admin lists remain consistent.
 * @param {string} oldId
 * @param {string} newId
 */
function migrateStoredData(oldId, newId) {
    const dataPath = path.join(__dirname, '../data/storage.json');
    try {
        if (!fs.existsSync(dataPath)) return;
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        let changed = false;

        for (const key of ['banned', 'muted', 'admins']) {
            if (data[key] && Array.isArray(data[key])) {
                const idx = data[key].indexOf(oldId);
                if (idx !== -1) {
                    // Replace old with new, avoid duplicates
                    if (!data[key].includes(newId)) {
                        data[key][idx] = newId;
                    } else {
                        data[key].splice(idx, 1);
                    }
                    changed = true;
                }
            }
        }

        if (changed) {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
            console.log(`[ID-LINK] Migrated storage data: ${oldId} -> ${newId}`);
        }
    } catch (err) {
        console.error('[ID-LINK] migrateStoredData error:', err);
    }
}

/**
 * Resolves a user's real canonical ID from a message.
 * Uses getContact() to get the real phone number, caches via aliases.
 * Works identically in groups (where msg.author is @lid) and DMs (where msg.from is @c.us).
 * 
 * @param {object} msg - The message object from whatsapp-web.js
 * @returns {Promise<string>} The canonical user ID (number@c.us)
 */
async function resolveUserId(msg) {
    const rawId = msg.author || msg.from;

    // 1. Check in-memory cache first (fastest)
    if (idCache.has(rawId)) return idCache.get(rawId);

    // 2. Check persistent alias table
    const existingAlias = getAlias(rawId);
    if (existingAlias) {
        idCache.set(rawId, existingAlias);
        return existingAlias;
    }

    // 3. Resolve via WhatsApp contact API (most reliable)
    try {
        const contact = await msg.getContact();
        if (contact && contact.number) {
            const canonicalId = `${contact.number}@c.us`;

            if (rawId !== canonicalId) {
                setAlias(rawId, canonicalId);
                console.log(`[ID-LINK] ${rawId} -> ${canonicalId}`);
                migrateStoredData(rawId, canonicalId);
            }

            // Also register the canonical ID as its own alias
            setAlias(canonicalId, canonicalId);

            idCache.set(rawId, canonicalId);
            idCache.set(canonicalId, canonicalId);
            return canonicalId;
        }
    } catch (err) {
        console.error('[ID-LINK] getContact failed:', err.message);
    }

    // 4. Fallback: simple @lid -> @c.us replacement
    const fallbackId = rawId.replace(/@lid$/, '@c.us');
    idCache.set(rawId, fallbackId);
    return fallbackId;
}

/**
 * Resolves a mentioned/target user ID through the alias system.
 * Used for resolving @mentions which may also use @lid format.
 * 
 * @param {string} rawId - The raw mentioned ID
 * @returns {Promise<string>} The canonical user ID
 */
async function resolveMentionedId(rawId) {
    if (idCache.has(rawId)) return idCache.get(rawId);

    const alias = getAlias(rawId);
    if (alias) {
        idCache.set(rawId, alias);
        return alias;
    }

    // Fallback
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
    resolveUserId,
    resolveMentionedId,
    getTargetMedia,
    getAlias,
    setAlias,
    // Keep backward compat - but this is now the fallback-only version
    getNormalizedId: (msg) => {
        const rawId = msg.author || msg.from;
        return rawId.replace(/@lid$/, '@c.us');
    }
};
