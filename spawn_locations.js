// spawn_locations.js
import fs from "node:fs";
import path from "node:path";
import { resolveAlias } from "./creature_aliases.js";

const SPAWN_DB_FILE = path.join(process.cwd(), "data", "spawn_locations.json");

let SPAWN_DB = null;

/**
 * Load spawn locations database
 */
function loadSpawnDB() {
    if (SPAWN_DB) return SPAWN_DB;

    if (!fs.existsSync(SPAWN_DB_FILE)) {
        console.error("❌ spawn_locations.json not found");
        return null;
    }

    const raw = fs.readFileSync(SPAWN_DB_FILE, "utf-8");
    SPAWN_DB = JSON.parse(raw);
    return SPAWN_DB;
}

/**
 * Find spawn locations for a creature
 * @param {string} creatureName - Name of the creature (can be alias like "giga")
 * @returns {Object|null} Spawn data or null if not found
 */
export function findSpawnLocations(creatureName) {
    const data = loadSpawnDB();
    if (!data?.spawns) return null;

    let name = (creatureName || "").trim();
    if (!name) return null;

    // STEP 1: Resolve alias to full name (e.g., "giga" -> "giganotosaurus")
    const resolved = resolveAlias(name);
    if (resolved) {
        console.log(`  🔄 Alias resolved: "${name}" → "${resolved}"`);
        name = resolved;
    }

    // STEP 2: Try exact match (case-insensitive)
    const exactMatch = Object.keys(data.spawns).find(
        key => key.toLowerCase() === name.toLowerCase()
    );
    // Helper to get biome name from coordinates (simple approximation)
    function getBiome(lat, lon) {
        if (lat < 20 && lon < 20) return "Nord-West Küste";
        if (lat < 20 && lon > 80) return "Nord-Ost Insel";
        if (lat > 80 && lon < 20) return "Süd-West Inseln";
        if (lat > 80 && lon > 80) return "Herbivore Island";
        if (lat < 30) return "Schneegebiet";
        if (lat > 30 && lat < 60 && lon > 30 && lon < 60) return "Redwoods / Vulkan";
        if (lon < 20 || lon > 80 || lat > 80) return "Küste";
        return "Inland";
    }

    // Try partial match
    const partialMatch = Object.keys(data.spawns).find(
        key => key.toLowerCase().includes(name.toLowerCase())
    );

    const match = exactMatch || partialMatch;

    if (match) {
        // Enriched location data with biome names
        const locations = data.spawns[match].map(loc => ({
            lat: loc.lat,
            lon: loc.lon,
            biome: getBiome(loc.lat, loc.lon) // Add biome name
        }));

        return {
            creature: match,
            map: data.map,
            locations: locations
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
