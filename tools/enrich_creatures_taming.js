// enrich_creatures_taming.js
// Fetches taming data from Fandom wiki and adds it to creatures_db.json

import fs from "node:fs";
import path from "node:path";
import { fetchFandomContext } from "./fandom_fetch.js";

const DB_FILE = path.join(process.cwd(), "data", "creatures_db.json");
const OUTPUT_FILE = path.join(process.cwd(), "data", "creatures_db_enriched.json");

async function enrichCreature(creature) {
    if (!creature.url) {
        console.log(`  ⏭️  Skipping ${creature.title} (no URL)`);
        return creature;
    }

    try {
        console.log(`  🔍 Fetching: ${creature.title}...`);

        // Fetch wiki context with taming intent to get infobox data
        const context = await fetchFandomContext(creature.url, { intent: "taming" });

        // Extract infobox data from the context
        const infoboxMatch = context.match(/INFOBOX:\n([\s\S]*?)\n\nSECTION:/);
        if (!infoboxMatch) {
            console.log(`  ⚠️  No infobox found for ${creature.title}`);
            return creature;
        }

        const infoboxText = infoboxMatch[1];
        const lines = infoboxText.split('\n').map(l => l.replace(/^- /, '').trim());

        // Parse taming data
        const tamingData = {};

        for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();

            if (key.toLowerCase().includes('torpor immune')) {
                tamingData.torpor_immune = value.toLowerCase() === 'yes';
            } else if (key.toLowerCase().includes('taming method')) {
                tamingData.taming_method = value;
            } else if (key.toLowerCase().includes('preferred kibble')) {
                if (!tamingData.preferred_kibble) {
                    tamingData.preferred_kibble = [];
                }
                tamingData.preferred_kibble.push(value);
            } else if (key.toLowerCase().includes('preferred food')) {
                if (!tamingData.preferred_food) {
                    tamingData.preferred_food = [];
                }
                tamingData.preferred_food.push(value);
            } else if (key.toLowerCase().includes('equipment')) {
                tamingData.equipment = value;
            } else if (key.toLowerCase().includes('other taming foods')) {
                tamingData.other_foods = value.split(',').map(f => f.trim());
            }
        }

        console.log(`  ✅ Enriched: ${creature.title}`);
        console.log(`     Taming Method: ${tamingData.taming_method || 'N/A'}`);
        console.log(`     Preferred Kibble: ${tamingData.preferred_kibble?.join(', ') || 'N/A'}`);
        console.log(`     Preferred Food: ${tamingData.preferred_food?.join(', ') || 'N/A'}`);

        return {
            ...creature,
            taming: tamingData
        };

    } catch (error) {
        console.error(`  ❌ Error fetching ${creature.title}:`, error.message);
        return creature;
    }
}

async function main() {
    console.log("📚 Loading creatures database...\n");

    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    const creatures = raw.creatures || raw;

    console.log(`Found ${creatures.length} creatures\n`);
    console.log("Starting enrichment (this will take a while)...\n");

    const enriched = [];
    let processed = 0;
    let enrichedCount = 0;

    // Process in batches to avoid overwhelming the API
    for (const creature of creatures) {
        processed++;
        console.log(`[${processed}/${creatures.length}] ${creature.title}`);

        const result = await enrichCreature(creature);
        enriched.push(result);

        if (result.taming) {
            enrichedCount++;
        }

        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 500));

        // Save progress every 10 creatures
        if (processed % 10 === 0) {
            const output = {
                updated_at: new Date().toISOString(),
                count: enriched.length,
                enriched_count: enrichedCount,
                creatures: enriched
            };
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
            console.log(`\n💾 Progress saved (${enrichedCount}/${processed} enriched)\n`);
        }
    }

    // Final save
    const output = {
        updated_at: new Date().toISOString(),
        count: enriched.length,
        enriched_count: enrichedCount,
        creatures: enriched
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log("\n✅ Enrichment complete!");
    console.log(`   Total creatures: ${creatures.length}`);
    console.log(`   Enriched: ${enrichedCount}`);
    console.log(`   Output: ${OUTPUT_FILE}`);
}

main().catch(console.error);
