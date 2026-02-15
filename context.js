// context.js
// Simple in-memory context manager for tracking user conversation state

const userContexts = new Map();

const CONTEXT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Store the last mentioned creature for a user
 * @param {string} userId - Discord user ID
 * @param {string} creatureName - Creature key (e.g., "baryonyx")
 */
export function setUserContext(userId, creatureName) {
    userContexts.set(userId, {
        lastCreature: creatureName.toLowerCase(),
        timestamp: Date.now()
    });
}

/**
 * Get the last mentioned creature for a user
 * @param {string} userId - Discord user ID
 * @returns {string|null} - Creature key or null if no context or expired
 */
export function getUserContext(userId) {
    const context = userContexts.get(userId);

    if (!context) {
        return null;
    }

    // Check if context has expired
    const age = Date.now() - context.timestamp;
    if (age > CONTEXT_EXPIRY_MS) {
        userContexts.delete(userId);
        return null;
    }

    return context.lastCreature;
}

/**
 * Clear context for a user
 * @param {string} userId - Discord user ID
 */
export function clearUserContext(userId) {
    userContexts.delete(userId);
}

/**
 * Get context age in seconds
 * @param {string} userId - Discord user ID
 * @returns {number|null} - Age in seconds or null if no context
 */
export function getContextAge(userId) {
    const context = userContexts.get(userId);
    if (!context) return null;

    return Math.floor((Date.now() - context.timestamp) / 1000);
}
