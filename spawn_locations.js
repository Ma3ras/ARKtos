// Spawn locations lookup functions
import fs from "node:fs";
import path from "node:path";

const SPAWN_DB_PATH = path.join(process.cwd(), "data", "spawn_locations.json");

let cachedSpawnData = null;

/**
 * Load spawn locations database
 */
function loadSpawnDB() {
    if (cachedSpawnData) return cachedSpawnData;

    if (!fs.existsSync(SPAWN_DB_PATH)) {
        console.error("❌ spawn_locations.json not found");
        return null;
    }

    const raw = fs.readFileSync(SPAWN_DB_PATH, "utf-8");
    cachedSpawnData = JSON.parse(raw);
    return cachedSpawnData;
}

/**
 * Find spawn locations for a creature
 * @param {string} creatureName - Name of the creature
 * @returns {Array|null} Array of spawn locations or null if not found
 */
export function findSpawnLocations(creatureName) {
    const data = loadSpawnDB();
    if (!data?.spawns) return null;

    const name = (creatureName || "").trim();
    if (!name) return null;

    // Try exact match first (case-insensitive)
    const exactMatch = Object.keys(data.spawns).find(
        key => key.toLowerCase() === name.toLowerCase()
    );
    if (exactMatch) {
        return {
            creature: exactMatch,
            map: data.map,
            locations: data.spawns[exactMatch]
        };
    }

    // Try partial match
    const partialMatch = Object.keys(data.spawns).find(
        key => key.toLowerCase().includes(name.toLowerCase())
    );
    if (partialMatch) {
        return {
            creature: partialMatch,
            map: data.map,
            locations: data.spawns[partialMatch]
        };
    }

    return null;
}

/**
 * Format spawn locations for Discord
 * @param {Object} spawnData - Spawn data from findSpawnLocations
 * @returns {string} Formatted message
 */
export function formatSpawnLocations(spawnData) {
    if (!spawnData || !spawnData.locations || spawnData.locations.length === 0) {
        return "Keine Spawn-Locations gefunden.";
    }

    const lines = [`**${spawnData.creature}** (${spawnData.map})`];
    lines.push("\n**Spawn-Locations:**");

    for (let i = 0; i < spawnData.locations.length; i++) {
        const loc = spawnData.locations[i];
        lines.push(`${i + 1}. Lat ${loc.lat} / Lon ${loc.lon}`);
    }

    return lines.join("\n");
}
