const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, '../data/storage.json');

/**
 * Loads the current status of banned, muted users and admins.
 * @returns {object} The stored data
 */
function loadData() {
    try {
        if (!fs.existsSync(STORAGE_PATH)) {
            const initialData = { banned: [], muted: [], admins: [] };
            saveData(initialData);
            return initialData;
        }
        const raw = fs.readFileSync(STORAGE_PATH);
        return JSON.parse(raw);
    } catch (err) {
        console.error('[DataManager] Load error:', err);
        return { banned: [], muted: [], admins: [] };
    }
}

/**
 * Saves data back to the JSON file.
 * @param {object} data - The data to save
 */
function saveData(data) {
    try {
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 4));
    } catch (err) {
        console.error('[DataManager] Save error:', err);
    }
}

module.exports = {
    loadData,
    saveData
};
