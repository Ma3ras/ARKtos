// Craftables lookup and formatting functions
import fs from "node:fs";
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

    return found;
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
            lines.push(`\n**Herstellung:** ${item.recipe.crafting_station}`);
        }

        if (item.recipe.unlock_level) {
            lines.push(`**Level:** ${item.recipe.unlock_level}`);
        }

        if (item.recipe.engram_points) {
            lines.push(`**Engram Punkte:** ${item.recipe.engram_points} EP`);
        }

        if (item.recipe.crafting_time) {
            lines.push(`**Herstellungszeit:** ${item.recipe.crafting_time}s`);
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
