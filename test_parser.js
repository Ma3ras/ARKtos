// Test the improved parser on Stone Hatchet
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const API_BASE = "https://ark.fandom.com/api.php";

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

    const data = await response.json();
    return data.parse?.text?.["*"] || "";
}

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
        console.log("Found Ingredients caption!");
        const ingredientsDiv = ingredientsCaption.next(".info-arkitex.info-X1-100");

        // Parse each ingredient line
        ingredientsDiv.find("div[style*='padding-left']").each((i, elem) => {
            const $elem = $(elem);
            const text = $elem.text().trim();
            const link = $elem.find("a").last(); // Last link is the item name

            console.log(`  Ingredient line: "${text}"`);

            // Match pattern: "10 × Item Name"
            const match = text.match(/^(\d+)\s*[×x]\s*(.+)$/);
            if (match) {
                const quantity = parseInt(match[1]);
                const itemName = link.attr("title") || link.text().trim() || match[2].trim();

                console.log(`    Parsed: ${quantity}x ${itemName}`);

                recipe.materials.push({
                    item: itemName,
                    quantity: quantity,
                });
            }
        });
    } else {
        console.log("No Ingredients caption found");
    }

    // Extract crafting info from rows
    $(".info-arkitex.info-unit-row").each((i, row) => {
        const $row = $(row);
        const label = $row.find(".info-arkitex-left").text().trim().toLowerCase();
        const value = $row.find(".info-arkitex-right");

        if (label.includes("required level")) {
            const levelText = value.text().trim();
            const match = levelText.match(/(\d+)/);
            if (match) {
                recipe.unlock_level = parseInt(match[1]);
                console.log(`Found level: ${recipe.unlock_level}`);
            }
        }

        if (label.includes("engram points")) {
            const pointsText = value.text().trim();
            const match = pointsText.match(/(\d+)/);
            if (match) {
                recipe.engram_points = parseInt(match[1]);
                console.log(`Found engram points: ${recipe.engram_points}`);
            }
        }

        if (label.includes("crafting time")) {
            const timeText = value.text().trim();
            const match = timeText.match(/(\d+\.?\d*)/);
            if (match) {
                recipe.crafting_time = parseFloat(match[1]);
                console.log(`Found crafting time: ${recipe.crafting_time}`);
            }
        }

        if (label.includes("crafted in")) {
            recipe.crafting_station = value.text().trim();
            console.log(`Found crafting station: ${recipe.crafting_station}`);
        }
    });

    return recipe;
}

async function test() {
    console.log("Testing parser on Stone Hatchet...\n");

    const html = await fetchPageHTML("Stone Hatchet");
    const recipe = parseRecipe(html, "Stone Hatchet");

    console.log("\nParsed Recipe:");
    console.log(JSON.stringify(recipe, null, 2));
}

test().catch(console.error);
