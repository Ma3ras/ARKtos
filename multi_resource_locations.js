// Multi-resource location finder
import fs from "node:fs";
import path from "node:path";

const LOCATIONS_PATH = path.join(process.cwd(), "data", "resources_locations.json");

let cachedLocations = null;

/**
 * Load resource locations database
 */
function loadLocations() {
    if (cachedLocations) return cachedLocations;

    if (!fs.existsSync(LOCATIONS_PATH)) {
        console.error("❌ resources_locations.json not found");
        return null;
    }

    const raw = fs.readFileSync(LOCATIONS_PATH, "utf-8");
    cachedLocations = JSON.parse(raw);
    return cachedLocations;
}

/**
 * Find resource by name or alias
 * @param {string} query - Resource name or alias
 * @returns {Object|null} Resource data with key and locations
 */
function findResourceByName(query) {
    const data = loadLocations();
    if (!data) return null;

    const q = query.toLowerCase().trim();

    // Check each resource
    for (const [key, resource] of Object.entries(data)) {
        if (!resource.aliases) continue;

        // Check if query matches any alias
        if (resource.aliases.some(alias => alias.toLowerCase() === q || alias.toLowerCase().includes(q))) {
            return {
                key,
                ...resource
            };
        }
    }

    return null;
}

/**
 * Calculate distance between two coordinates
 */
function distance(lat1, lon1, lat2, lon2) {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
}

/**
 * Find best common farming location for multiple resources
 * @param {Array<string>} resourceNames - Array of resource names
 * @returns {Object|null} Best location with all resources
 */
export function findBestMultiResourceLocation(resourceNames) {
    const resources = [];

    // Find all resources
    for (const name of resourceNames) {
        const res = findResourceByName(name);
        if (res) {
            resources.push({
                name: name,
                key: res.key,
                locations: res.locations || []
            });
        }
    }

    if (resources.length === 0) return null;

    // Find clusters where all resources are nearby
    const clusters = [];

    // For each location of the first resource
    for (const loc1 of resources[0].locations) {
        if (!loc1.lat || !loc1.lon) continue;

        const cluster = {
            center: { lat: loc1.lat, lon: loc1.lon },
            resources: [{ ...resources[0], location: loc1 }],
            maxDistance: 0
        };

        // Check if other resources have locations nearby
        for (let i = 1; i < resources.length; i++) {
            let closestLoc = null;
            let closestDist = Infinity;

            for (const loc of resources[i].locations) {
                if (!loc.lat || !loc.lon) continue;

                const dist = distance(loc1.lat, loc1.lon, loc.lat, loc.lon);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestLoc = loc;
                }
            }

            if (closestLoc && closestDist < 2.0) { // Within ~2 lat/lon units
                cluster.resources.push({ ...resources[i], location: closestLoc });
                cluster.maxDistance = Math.max(cluster.maxDistance, closestDist);
            }
        }

        // Only add cluster if ALL resources are present
        if (cluster.resources.length === resources.length) {
            clusters.push(cluster);
        }
    }

    if (clusters.length === 0) {
        return {
            found: false,
            resources: resources.map(r => r.key),
            message: "Keine gemeinsamen Farming-Spots gefunden."
        };
    }

    // Sort by smallest max distance (tightest cluster)
    clusters.sort((a, b) => a.maxDistance - b.maxDistance);

    return {
        found: true,
        clusters: clusters,
        resources: resources.map(r => r.key)
    };
}

/**
 * Format multi-resource location for Discord
 */
export function formatMultiResourceLocation(result) {
    if (!result || !result.found) {
        return result?.message || "Keine Locations gefunden.";
    }

    const lines = [`**Beste Farming-Spots für: ${result.resources.join(", ")}**\n`];

    for (let i = 0; i < Math.min(3, result.clusters.length); i++) {
        const cluster = result.clusters[i];
        lines.push(`**${i + 1}. Spot (Lat ${cluster.center.lat.toFixed(1)} / Lon ${cluster.center.lon.toFixed(1)})**`);

        for (const res of cluster.resources) {
            const note = res.location.note ? ` (${res.location.note})` : "";
            lines.push(`  • ${res.key}: Lat ${res.location.lat} / Lon ${res.location.lon}${note}`);
        }

        lines.push("");
    }

    return lines.join("\n");
}
