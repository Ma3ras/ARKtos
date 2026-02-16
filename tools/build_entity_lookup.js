// tools/build_entity_lookup.js
// Builds a consolidated entity type lookup from all databases
import fs from "node:fs";
import path from "node:path";

const CREATURES_FILE = path.join(process.cwd(), "data", "creatures_db.json");
const RESOURCES_FILE = path.join(process.cwd(), "data", "resources_db.json");
const CRAFTABLES_FILE = path.join(process.cwd(), "data", "craftables_db.json");
const ALIASES_FILE = path.join(process.cwd(), "creature_aliases.js");
const OUTPUT_FILE = path.join(process.cwd(), "data", "entity_lookup.json");

function norm(s) {
    if (!s) return "";
    return String(s)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_\-]/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function main() {
    const lookup = {};
    let creatureCount = 0;
    let resourceCount = 0;
    let craftableCount = 0;

    console.log("🔨 Building Entity Type Lookup Database\n");

    // ========== CREATURES ==========
    console.log("📋 Loading creatures...");
    if (fs.existsSync(CREATURES_FILE)) {
        const creaturesData = JSON.parse(fs.readFileSync(CREATURES_FILE, "utf-8"));
        const creatures = creaturesData.creatures || [];

        for (const c of creatures) {
            // Add title
            if (c.title) {
                const key = norm(c.title);
                if (key) {
                    lookup[key] = "creature";
                    creatureCount++;
                }
            }

            // Add aliases
            if (c.aliases && Array.isArray(c.aliases)) {
                for (const alias of c.aliases) {
                    const key = norm(alias);
                    if (key && !lookup[key]) {
                        lookup[key] = "creature";
                        creatureCount++;
                    }
                }
            }
        }
    }

    // Add creature_aliases.js
    if (fs.existsSync(ALIASES_FILE)) {
        const aliasContent = fs.readFileSync(ALIASES_FILE, "utf-8");
        const aliasMatch = aliasContent.match(/export\s+const\s+CREATURE_ALIASES\s*=\s*({[\s\S]*?});/);

        if (aliasMatch) {
            // Parse the object manually (simple key-value pairs)
            const lines = aliasMatch[1].split("\n");
            for (const line of lines) {
                const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
                if (match) {
                    const alias = norm(match[1]);
                    if (alias && !lookup[alias]) {
                        lookup[alias] = "creature";
                        creatureCount++;
                    }
                }
            }
        }
    }

    console.log(`  ✅ ${creatureCount} creature entries`);

    // ========== RESOURCES ==========
    console.log("📋 Loading resources...");
    if (fs.existsSync(RESOURCES_FILE)) {
        const resourcesData = JSON.parse(fs.readFileSync(RESOURCES_FILE, "utf-8"));
        const resources = resourcesData.resources || [];
        const aliasToKey = resourcesData.aliasToKey || {};

        // Add from resources array
        for (const r of resources) {
            if (r.title) {
                const key = norm(r.title);
                if (key && !lookup[key]) {
                    lookup[key] = "resource";
                    resourceCount++;
                }
            }

            if (r.aliases && Array.isArray(r.aliases)) {
                for (const alias of r.aliases) {
                    const key = norm(alias);
                    if (key && !lookup[key]) {
                        lookup[key] = "resource";
                        resourceCount++;
                    }
                }
            }
        }

        // Add from aliasToKey (includes German aliases)
        for (const alias of Object.keys(aliasToKey)) {
            const key = norm(alias);
            if (key && !lookup[key]) {
                lookup[key] = "resource";
                resourceCount++;
            }
        }
    }

    console.log(`  ✅ ${resourceCount} resource entries`);

    // ========== CRAFTABLES ==========
    console.log("📋 Loading craftables...");
    if (fs.existsSync(CRAFTABLES_FILE)) {
        const craftablesData = JSON.parse(fs.readFileSync(CRAFTABLES_FILE, "utf-8"));
        const items = craftablesData.items || [];

        for (const item of items) {
            if (item.title) {
                const key = norm(item.title);
                if (key && !lookup[key]) {
                    lookup[key] = "craftable";
                    craftableCount++;
                }
            }

            if (item.aliases && Array.isArray(item.aliases)) {
                for (const alias of item.aliases) {
                    const key = norm(alias);
                    if (key && !lookup[key]) {
                        lookup[key] = "craftable";
                        craftableCount++;
                    }
                }
            }
        }
    }

    console.log(`  ✅ ${craftableCount} craftable entries`);

    // ========== ADD PLURALS/SINGULARS ==========
    console.log("📋 Adding plural/singular variations...");
    const originalKeys = Object.keys(lookup);
    let variantCount = 0;

    for (const key of originalKeys) {
        const type = lookup[key];

        // Add plural (if not already ending in 's')
        if (!key.endsWith("s")) {
            const plural = key + "s";
            if (!lookup[plural]) {
                lookup[plural] = type;
                variantCount++;
            }
        }

        // Add singular (if ending in 's')
        if (key.endsWith("s") && key.length > 2) {
            const singular = key.slice(0, -1);
            if (!lookup[singular]) {
                lookup[singular] = type;
                variantCount++;
            }
        }
    }

    console.log(`  ✅ ${variantCount} variants added`);

    // ========== SAVE ==========
    const output = {
        updated_at: new Date().toISOString(),
        total_entries: Object.keys(lookup).length,
        breakdown: {
            creatures: creatureCount,
            resources: resourceCount,
            craftables: craftableCount
        },
        entities: lookup
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");

    console.log(`\n✅ Saved: ${OUTPUT_FILE}`);
    console.log(`📊 Total entries: ${output.total_entries}`);
    console.log(`   - Creatures: ${creatureCount}`);
    console.log(`   - Resources: ${resourceCount}`);
    console.log(`   - Craftables: ${craftableCount}`);

    // ========== TEST ==========
    console.log("\n🧪 Testing lookups:");
    const tests = ["giga", "gigas", "giganotosaurus", "metall", "metal", "fabricator", "advanced bullet"];
    for (const test of tests) {
        const type = lookup[norm(test)] || "(not found)";
        console.log(`  "${test}" → ${type}`);
    }
}

main();
