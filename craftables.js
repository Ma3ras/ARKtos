// Craftables lookup and formatting functions
import fs from "node:fs";
import { findBestMatch } from "./string_similarity.js";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "craftables_db.json");

let cachedData = null;

/**
 * Load craftables database
 */
function loadDB() {
    if (cachedData) return cachedData;

    if (!fs.existsSync(DB_PATH)) {
        console.error("❌ craftables_db.json not found");
        return null;
    }

    const raw = fs.readFileSync(DB_PATH, "utf-8");
    cachedData = JSON.parse(raw);
    return cachedData;
}

/**
 * Smart search for craftable items
 * Supports partial matching and common variations
 */
export function findCraftableSmart(query) {
    const data = loadDB();
    if (!data?.items) return null;

    const q = (query || "").toLowerCase().trim();
    if (!q) return null;

    // 1) Exact title match (case-insensitive)
    let found = data.items.find(
        (item) => item.title && item.title.toLowerCase() === q
    );
    if (found) return found;

    // 2) Partial match in title
    found = data.items.find((item) =>
        item.title && item.title.toLowerCase().includes(q)
    );
    if (found) return found;

    // 3) Match without special characters
    const cleanQ = q.replace(/[^a-z0-9]/g, "");
    found = data.items.find((item) => {
        const cleanTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanTitle === cleanQ || cleanTitle.includes(cleanQ);
    });
    if (found) return found;

    // 4) FALLBACK: Fuzzy matching for phonetic errors
    // Example: "flag legends" -> "flak leggings"
    const allTitles = data.items.map(item => item.title).filter(Boolean);
    const fuzzyMatch = findBestMatch(q, allTitles, 70);

    if (fuzzyMatch && fuzzyMatch.score >= 70) {
        const matched = data.items.find(item => item.title === fuzzyMatch.match);
        if (matched) {
            console.log(`🔍 Fuzzy match (craftable): "${query}" -> "${fuzzyMatch.match}" (${fuzzyMatch.score.toFixed(0)}% similar)`);
            return matched;
        }
    }

    return null;
}

/**
 * Format craftable recipe for Discord
 */
export function formatCraftableRecipe(item) {
    if (!item) return "Item nicht gefunden.";

    const lines = [`**${item.title}**`];

    if (item.recipe && item.recipe.materials && item.recipe.materials.length > 0) {
        lines.push("\n**Rezept:**");
        for (const mat of item.recipe.materials) {
            lines.push(`- ${mat.quantity}x ${mat.item}`);
        }

        if (item.recipe.crafting_station) {
            // Filter out dino saddles from crafting station
            // Keep only known crafting stations, remove dino names + "Saddle"
            const knownStations = ["Smithy", "Fabricator", "Tek", "Replicator", "Mortar", "Pestle",
                "Forge", "Cooking", "Pot", "Grill", "Bench", "Chemistry"];

            const stationWords = item.recipe.crafting_station.split(/\s+/).filter((word, i, arr) => {
                if (word === "Saddle") return false;

                // Keep if it's a known station word
                if (knownStations.some(station => word.includes(station))) return true;

                // Skip if next word is "Saddle" (dino name)
                if (arr[i + 1] === "Saddle") return false;

                // Skip if next 2 words lead to "Saddle" (multi-word dino name)
                if (arr[i + 2] === "Saddle") return false;

                return true;
            });

            const station = stationWords.join(" ").trim();

            if (station) {
                lines.push(`\n**Herstellung:** ${station}`);
            }
        }
    } else {
        lines.push("\nKeine Rezept-Informationen verfügbar.");
    }

    if (item.url) {
        lines.push(`\nQuelle: ${item.url}`);
    }

    return lines.join("\n");
}

/**
 * Format general craftable info
 */
export function formatCraftableInfo(item) {
    if (!item) return "Item nicht gefunden.";

    const lines = [`**${item.title}**`];

    if (item.category) {
        lines.push(`Kategorie: ${item.category}`);
    }

    if (item.recipe) {
        if (item.recipe.unlock_level) {
            lines.push(`Level: ${item.recipe.unlock_level}`);
        }
        if (item.recipe.engram_points) {
            lines.push(`Engram Punkte: ${item.recipe.engram_points} EP`);
        }
    }

    if (item.url) {
        lines.push(`\nQuelle: ${item.url}`);
    }

    return lines.join("\n");
}
