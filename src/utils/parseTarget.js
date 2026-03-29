/**
 * Shared utility for resolving target user IDs from command arguments.
 * Handles mentions, quoted messages, and raw phone numbers.
 * Used by ban, mute, addadmin commands.
 */
async function parseTargetId(args, msg) {
    const resolve = msg._resolveMentionedId || ((id) => id.replace(/@lid$/, '@c.us'));

    // 1. Check mentions first
    if (msg.mentionedIds && msg.mentionedIds.length > 0) {
        return await resolve(msg.mentionedIds[0]);
    }

    // 2. Check quoted message
    if (msg.hasQuotedMsg) {
        const quoted = await msg.getQuotedMessage();
        const rawId = quoted.author || quoted.from;
        return await resolve(rawId);
    }

    // 3. Check for raw phone numbers in args (e.g., 905551234567)
    for (const arg of args) {
        const cleanArg = arg.replace(/\D/g, '');
        if (cleanArg.length >= 10 && cleanArg.length <= 15) {
            return await resolve(`${cleanArg}@c.us`);
        }
    }

    return null;
}

module.exports = { parseTargetId };
