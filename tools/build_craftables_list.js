// Scrape all craftable items from ARK Fandom API
// Similar approach to build_resources_list_api.js

import fetch from "node-fetch";
import fs from "node:fs";

const API_BASE = "https://ark.fandom.com/api.php";
const DELAY_MS = 300; // Delay between API calls

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get all pages in a category using Fandom API
 */
async function getPagesInCategory(category, limit = 500) {
    const pages = [];
    let cmcontinue = null;

    console.log(`\n📂 Fetching pages from category: ${category}`);

    do {
        const params = new URLSearchParams({
            action: "query",
            list: "categorymembers",
            cmtitle: `Category:${category}`,
            cmlimit: limit,
            cmtype: "page",
            format: "json",
        });

        if (cmcontinue) {
            params.append("cmcontinue", cmcontinue);
        }

        const url = `${API_BASE}?${params}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.query?.categorymembers) {
            const members = data.query.categorymembers;
            pages.push(...members);
            console.log(`  Found ${members.length} pages (total: ${pages.length})`);
        }

        cmcontinue = data.continue?.cmcontinue;

        if (cmcontinue) {
            await sleep(DELAY_MS);
        }
    } while (cmcontinue);

    return pages;
}

/**
 * Get all craftable item categories
 */
const CRAFTING_CATEGORIES = [
    "Craftable",
    "Weapons",
    "Armor",
    "Tools",
    "Structures",
    "Resources", // Crafted resources like Gunpowder, Sparkpowder, etc.
    "Consumables",
    "Saddles",
];

async function main() {
    console.log("🔨 ARK Craftable Items Scraper");
    console.log("================================\n");

    const allItems = new Map(); // Use Map to deduplicate

    // Fetch from all categories
    for (const category of CRAFTING_CATEGORIES) {
        try {
            const pages = await getPagesInCategory(category);

            for (const page of pages) {
                // Skip special pages, categories, templates
                if (
                    page.title.startsWith("Category:") ||
                    page.title.startsWith("Template:") ||
                    page.title.includes("/")
                ) {
                    continue;
                }

                allItems.set(page.pageid, {
                    id: page.pageid,
                    title: page.title,
                    category: category,
                    url: `https://ark.fandom.com/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
                });
            }

            await sleep(DELAY_MS);
        } catch (err) {
            console.error(`❌ Error fetching category ${category}:`, err.message);
        }
    }

    // Convert Map to array
    const items = Array.from(allItems.values());

    console.log(`\n✅ Total unique craftable items found: ${items.length}`);

    // Save to file
    const output = {
        generated: new Date().toISOString(),
        count: items.length,
        items: items,
    };

    fs.writeFileSync(
        "./data/craftables_list.json",
        JSON.stringify(output, null, 2)
    );

    console.log(`\n💾 Saved to data/craftables_list.json`);
    console.log(`\nNext step: Run enrich_craftables.js to scrape recipes`);
}

main().catch(console.error);
