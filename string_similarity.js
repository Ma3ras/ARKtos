// String Similarity Utilities
// Provides fuzzy matching capabilities for entity names

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance (number of changes needed)
 */
export function levenshteinDistance(a, b) {
    if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);

    const matrix = [];

    // Initialize first column
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Initialize first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity percentage between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
export function similarityPercentage(a, b) {
    if (!a || !b) return 0;

    const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
    const maxLength = Math.max(a.length, b.length);

    if (maxLength === 0) return 100;

    return ((maxLength - distance) / maxLength) * 100;
}

/**
 * Find best fuzzy match from a list of candidates
 * @param {string} query - Search query
 * @param {Array<string>} candidates - List of possible matches
 * @param {number} minSimilarity - Minimum similarity threshold (0-100)
 * @returns {Object|null} - Best match with score, or null
 */
export function findBestMatch(query, candidates, minSimilarity = 70) {
    if (!query || !candidates || candidates.length === 0) return null;

    const normalizedQuery = query.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
        const normalizedCandidate = candidate.toLowerCase().trim();

        // Exact match gets 100%
        if (normalizedQuery === normalizedCandidate) {
            return { match: candidate, score: 100, distance: 0 };
        }

        // Check if query is substring (high priority)
        if (normalizedCandidate.includes(normalizedQuery) || normalizedQuery.includes(normalizedCandidate)) {
            const score = 85; // High score for substring matches
            if (score > bestScore) {
                bestScore = score;
                bestMatch = candidate;
            }
            continue;
        }

        // Calculate similarity
        const score = similarityPercentage(normalizedQuery, normalizedCandidate);

        if (score > bestScore && score >= minSimilarity) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    if (bestMatch) {
        const distance = levenshteinDistance(normalizedQuery, bestMatch.toLowerCase());
        return { match: bestMatch, score: bestScore, distance };
    }

    return null;
}

/**
 * Check if two strings are similar enough to be considered a match
 * @param {string} a - First string
 * @param {string} b - Second string
 * @param {number} threshold - Similarity threshold (0-100)
 * @returns {boolean} - True if similar enough
 */
export function isSimilar(a, b, threshold = 70) {
    return similarityPercentage(a, b) >= threshold;
}
