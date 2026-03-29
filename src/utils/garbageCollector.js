const fs = require('fs');
const path = require('path');

/**
 * Removes a file safely.
 * @param {string} filePath - Path to the file to be deleted.
 */
function cleanUp(filePath) {
    if (!filePath) return;
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[GC] Deleted temporary file: ${filePath}`);
        }
    } catch (err) {
        console.error(`[GC] Failed to delete file: ${filePath}`, err);
    }
}

/**
 * Ensures the temp directory exists
 */
function ensureTempDir() {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
}

module.exports = {
    cleanUp,
    ensureTempDir
};
