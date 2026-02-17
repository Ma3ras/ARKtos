// Wake Word Configuration
// Defines wake words and detection parameters

/**
 * Wake words that activate the bot
 * These are checked case-insensitively
 * Includes phonetic variations for speech recognition
 */
export const ENABLE_WAKE_WORD = true; // Set to true to enable passive listening
export const WAKE_WORDS = [
    // Primary variations
    "beacon",
    "beakon",      // Phonetic variation
    "biekon",      // German pronunciation
    "bieken",      // Often misheard by German Whisper
    "biken",       // Phonetic variation
    "peaken",      // Possible misinterpretation
    "becken",      // German word (Pushen)
    "bacon",       // Very common misinterpretation
    "bikon",       // Phonetic variation

    // Compound variations
    "hey beacon",
    "hey beakon",
    "beacon bot",
    "beakon bot"
];

/**
 * Duration of audio clips for wake word detection (ms)
 * Shorter = faster response, but may miss wake word
 * Longer = more reliable, but slower
 */
export const CLIP_DURATION = 5000; // 5 seconds (reliable capture)

/**
 * Time window after wake word detection to record full query (ms)
 */
export const WAKE_WORD_TIMEOUT = 5000; // 5 seconds

/**
 * Silence duration to end wake word clip recording (ms)
 */
export const WAKE_WORD_SILENCE_DURATION = 1200; // 1.2 seconds (increased from 0.8s)

/**
 * Check if text contains a wake word
 * @param {string} text - Transcribed text to check
 * @returns {boolean} - True if wake word detected
 */
export function containsWakeWord(text) {
    if (!text) return false;

    // Remove all punctuation and quotes for better matching
    const normalized = text
        .toLowerCase()
        .replace(/["""''.,!?;:]/g, ' ')  // Remove punctuation
        .replace(/\s+/g, ' ')             // Normalize whitespace
        .trim();

    console.log(`🔍 Normalized wake word check: "${normalized}"`);

    return WAKE_WORDS.some(wakeWord => {
        // Simple substring check (more flexible than word boundaries)
        if (normalized.includes(wakeWord)) {
            console.log(`✅ Matched wake word: "${wakeWord}"`);
            return true;
        }
        return false;
    });
}

/**
 * Remove wake word from text
 * @param {string} text - Text containing wake word
 * @returns {string} - Text with wake word removed
 */
export function removeWakeWord(text) {
    if (!text) return text;

    let result = text;

    for (const wakeWord of WAKE_WORDS) {
        // Match wake word with optional punctuation/whitespace after it
        const regex = new RegExp(`${wakeWord}[.,!?;:\\s]*`, 'gi');
        result = result.replace(regex, '');
    }

    // Clean up extra whitespace and leading punctuation
    result = result
        .replace(/^[.,!?;:\s]+/, '')  // Remove leading punctuation
        .replace(/\s+/g, ' ')          // Normalize whitespace
        .trim();

    return result;
}
