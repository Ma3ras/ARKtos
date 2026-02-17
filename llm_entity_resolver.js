// LLM Entity Resolver
// Uses Ollama to resolve semantic entity queries as final fallback

import fetch from 'node-fetch';
import fs from 'node:fs';
import path from 'node:path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_ROUTER_MODEL || 'llama3.2:3b';
const TIMEOUT_MS = 5000; // 5 second timeout (increased from 2s for slower systems)
const MIN_QUERY_WORDS = 5; // Only use LLM for queries with 5+ words (semantic descriptions)

// Simple in-memory cache
const cache = new Map();

/**
 * Load entity list from database
 * @param {string} entityType - 'creature', 'craftable', or 'resource'
 * @returns {Array<string>} - List of entity names
 */
function loadEntityList(entityType) {
    const dbPaths = {
        creature: path.join(process.cwd(), 'data', 'creatures_db.json'),
        craftable: path.join(process.cwd(), 'data', 'craftables_db.json'),
        resource: path.join(process.cwd(), 'data', 'resources_db.json')
    };

    const dbPath = dbPaths[entityType];
    if (!dbPath || !fs.existsSync(dbPath)) return [];

    try {
        const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

        // Extract entity names based on structure
        if (entityType === 'creature') {
            const creatures = Array.isArray(raw) ? raw : raw.creatures || [];
            return creatures.map(c => c?.title).filter(Boolean);
        } else if (entityType === 'craftable') {
            return (raw.items || []).map(i => i?.title).filter(Boolean);
        } else if (entityType === 'resource') {
            return (raw.resources || []).map(r => r?.title).filter(Boolean);
        }
    } catch (error) {
        console.error(`❌ Error loading ${entityType} list:`, error.message);
    }

    return [];
}

/**
 * Call Ollama LLM to resolve entity
 * @param {string} query - User query
 * @param {string} entityType - Entity type
 * @param {Array<string>} entityList - Available entities
 * @returns {Promise<string|null>} - Resolved entity name or null
 */
async function callLLM(query, entityType, entityList) {
    const prompt = `You are an ARK: Survival Evolved expert. Given a user query, identify the EXACT entity name from the list.

Entity type: ${entityType}
User query: "${query}"

Available entities:
${entityList.slice(0, 50).join(', ')}${entityList.length > 50 ? ', ...' : ''}

Rules:
- Return ONLY the exact entity name from the list
- If uncertain or no match, return "UNKNOWN"
- No explanations, just the name

Answer:`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1, // Low temperature for deterministic output
                    num_predict: 20   // Short response
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`❌ LLM API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const answer = (data.response || '').trim();

        // Validate answer
        if (answer === 'UNKNOWN' || !answer) return null;

        // Check if answer is in entity list (case-insensitive)
        const normalized = answer.toLowerCase();
        const matched = entityList.find(e => e.toLowerCase() === normalized);

        return matched || null;

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('⏱️ LLM timeout');
        } else {
            console.error('❌ LLM error:', error.message);
        }
        return null;
    }
}

/**
 * Resolve entity using LLM (with caching and word count filter)
 * @param {string} query - User query
 * @param {string} entityType - 'creature', 'craftable', or 'resource'
 * @returns {Promise<string|null>} - Resolved entity name or null
 */
export async function resolveLLMEntity(query, entityType) {
    if (!query || !entityType) return null;

    // Filter: Only use LLM for semantic queries (5+ words)
    const wordCount = query.trim().split(/\s+/).length;
    if (wordCount < MIN_QUERY_WORDS) {
        // Short queries should be handled by Levenshtein
        return null;
    }

    // Check cache
    const cacheKey = `${entityType}:${query.toLowerCase()}`;
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        console.log(`💾 LLM cache hit: "${query}" -> "${cached}"`);
        return cached;
    }

    // Load entity list
    const entityList = loadEntityList(entityType);
    if (entityList.length === 0) {
        console.error(`❌ No entities found for type: ${entityType}`);
        return null;
    }

    console.log(`🤖 LLM resolving (${wordCount} words): "${query}" (${entityType})`);

    // Call LLM
    const result = await callLLM(query, entityType, entityList);

    // Cache result (even if null, to avoid repeated LLM calls)
    cache.set(cacheKey, result);

    if (result) {
        console.log(`🤖 LLM match: "${query}" -> "${result}"`);
    } else {
        console.log(`🤖 LLM: No match for "${query}"`);
    }

    return result;
}

/**
 * Clear cache (for testing)
 */
export function clearCache() {
    cache.clear();
}
