// Enrich craftables with recipe data from Fandom API
// Similar to enrich_creatures_taming.js

import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "node:fs";

const API_BASE = "https://ark.fandom.com/api.php";
const DELAY_MS = 500; // Delay between requests
const BATCH_SIZE = 50; // Save progress every N items

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch page HTML from Fandom API
 */
async function fetchPageHTML(title) {
    const params = new URLSearchParams({
        action: "parse",
        page: title,
        format: "json",
        prop: "text",
    });

    const url = `${API_BASE}?${params}`;
    const response = await fetch(url, {
        headers: {
            "User-Agent": "ark-bot/1.0 (local dev)",
            "Accept": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.parse?.text?.["*"] || "";
}

/**
 * Parse recipe data from HTML using cheerio
 */
function parseRecipe(html, title) {
    const $ = cheerio.load(html);
    const recipe = {
        materials: [],
        crafting_station: null,
        crafting_time: null,
        unlock_level: null,
        engram_points: null,
    };

    // Look for "Ingredients" section
    const ingredientsCaption = $(".info-unit-caption:contains('Ingredients')");
    if (ingredientsCaption.length) {
        const ingredientsDiv = ingredientsCaption.next(".info-arkitex.info-X1-100");

        // Find the "Resources breakdown" container
        const resourcesBreakdown = ingredientsDiv.find("div[style*='display:inline-block']").first();

        // IMPORTANT: Only get DIRECT children with padding-left:5px
        // This excludes nested sub-ingredients (like Sparkpowder inside Gunpowder)
        resourcesBreakdown.children("div[style*='padding-left:5px']").each((i, elem) => {
            const $elem = $(elem);

            // Get text ONLY from the <b> tag to avoid nested content
            const boldTag = $elem.find("> b").first();
            const text = boldTag.text().trim();
            const link = boldTag.find("a").last(); // Last link is the item name

            // Match pattern: "10 × Item Name"
            const match = text.match(/^(\d+)\s*[×x]\s*(.+)$/);
            if (match) {
                const quantity = parseInt(match[1]);
                const itemName = link.attr("title") || link.text().trim() || match[2].trim();

                if (itemName && !itemName.includes("Category:")) {
                    recipe.materials.push({
                        item: itemName,
                        quantity: quantity,
                    });
                }
            }
        });
    }

    // Extract crafting info from rows
    $(".info-arkitex.info-unit-row").each((i, row) => {
        const $row = $(row);
        const label = $row.find(".info-arkitex-left").text().trim().toLowerCase();
        const value = $row.find(".info-arkitex-right");

        if (label.includes("required level") || label === "level") {
            const levelText = value.text().trim();
            const match = levelText.match(/(\d+)/);
            if (match) {
                recipe.unlock_level = parseInt(match[1]);
            }
        }

        if (label.includes("engram points")) {
            const pointsText = value.text().trim();
            const match = pointsText.match(/(\d+)/);
            if (match) {
                recipe.engram_points = parseInt(match[1]);
            }
        }

        if (label.includes("crafting time")) {
            const timeText = value.text().trim();
            const match = timeText.match(/(\d+\.?\d*)/);
            if (match) {
                recipe.crafting_time = parseFloat(match[1]);
            }
        }

        if (label.includes("crafted in")) {
            recipe.crafting_station = value.text().trim();
        }
    });

    return recipe;
}

/**
 * Enrich a single item with recipe data
 */
async function enrichItem(item) {
    try {
        console.log(`  📄 ${item.title}`);

        const html = await fetchPageHTML(item.title);
        const recipe = parseRecipe(html, item.title);

        return {
            ...item,
            recipe: recipe,
        };
    } catch (err) {
        console.error(`    ❌ Error: ${err.message}`);
        return {
            ...item,
            recipe: {
                materials: [],
                crafting_station: null,
                crafting_time: null,
                unlock_level: null,
                engram_points: null,
                error: err.message,
            },
        };
    }
}

async function main() {
    console.log("🔨 ARK Craftables Recipe Enrichment");
    console.log("====================================\n");

    // Load craftables list
    const listData = JSON.parse(
        fs.readFileSync("./data/craftables_list.json", "utf-8")
    );
    const items = listData.items;

    console.log(`📋 Total items to enrich: ${items.length}\n`);

    const enriched = [];
    let processed = 0;

    for (const item of items) {
        const enrichedItem = await enrichItem(item);
        enriched.push(enrichedItem);
        processed++;

        // Save progress every BATCH_SIZE items
        if (processed % BATCH_SIZE === 0) {
            const output = {
                generated: new Date().toISOString(),
                count: enriched.length,
                items: enriched,
            };
            fs.writeFileSync(
                "./data/craftables_db.json",
                JSON.stringify(output, null, 2)
            );
            console.log(`\n💾 Progress saved: ${processed}/${items.length}\n`);
        }

        await sleep(DELAY_MS);
    }

    // Final save
    const output = {
        generated: new Date().toISOString(),
        count: enriched.length,
        items: enriched,
    };

    fs.writeFileSync(
        "./data/craftables_db.json",
        JSON.stringify(output, null, 2)
    );

    console.log(`\n✅ Enrichment complete!`);
    console.log(`📊 Total items: ${enriched.length}`);
    console.log(`💾 Saved to data/craftables_db.json`);

    // Stats
    const withRecipes = enriched.filter(
        (i) => i.recipe && i.recipe.materials.length > 0
    );
    console.log(`\n📈 Stats:`);
    console.log(`  - Items with recipes: ${withRecipes.length}`);
    console.log(`  - Items without recipes: ${enriched.length - withRecipes.length}`);
}

main().catch(console.error);
