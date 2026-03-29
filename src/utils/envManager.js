const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../.env');

/**
 * Updates the ADMIN_NUMBERS line in the .env file and process.env.
 * @param {string} targetId The ID to add or remove
 * @param {string} action 'add' or 'remove'
 * @returns {boolean} true if changes were made and saved
 */
function updateEnvAdmins(targetId, action) {
    if (!fs.existsSync(ENV_PATH)) return false;

    let envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    
    // Read current admins from process.env instead of parsing regex each time, 
    // or parse from the file to handle manual edits properly.
    let adminsMatch = envContent.match(/^ADMIN_NUMBERS="(.*)"/m);
    
    // If ADMIN_NUMBERS format uses single quotes or no quotes, fallback regex
    if (!adminsMatch) {
       adminsMatch = envContent.match(/^ADMIN_NUMBERS=([^\n]*)/m);
    }

    let adminList = [];
    let oldLine = "";
    
    if (adminsMatch) {
        oldLine = adminsMatch[0];
        let rawAdmins = adminsMatch[1].replace(/["']/g, ''); // strip quotes
        adminList = rawAdmins.split(',').map(n => n.trim()).filter(n => n);
    } else {
        // If ADMIN_NUMBERS is not in the file, we can't cleanly replace, we'll append.
    }

    let modified = false;

    if (action === 'add') {
        if (!adminList.includes(targetId)) {
            adminList.push(targetId);
            modified = true;
        }
    } else if (action === 'remove') {
        const idx = adminList.indexOf(targetId);
        if (idx !== -1) {
            adminList.splice(idx, 1);
            modified = true;
        }
    }

    if (modified) {
        const newAdminsStr = adminList.join(',');
        const newLine = `ADMIN_NUMBERS="${newAdminsStr}"`;
        
        if (oldLine) {
            envContent = envContent.replace(oldLine, newLine);
        } else {
            envContent += `\n${newLine}\n`;
        }
        
        fs.writeFileSync(ENV_PATH, envContent);
        // Also update memory so restart is not immediately required
        process.env.ADMIN_NUMBERS = newAdminsStr;
        return true;
    }
    
    return false;
}

module.exports = {
    updateEnvAdmins
};
