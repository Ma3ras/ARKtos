// Debug: Fetch Advanced Bullet to see the HTML structure
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "node:fs";

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

async function main() {
    console.log("Fetching Advanced Bullet HTML...");
    const html = await fetchPageHTML("Advanced Bullet");

    fs.writeFileSync("advanced_bullet.html", html, "utf-8");
    console.log("Saved to advanced_bullet.html");

    // Parse and show all ingredient sections
    const $ = cheerio.load(html);

    console.log("\n=== All .info-unit-caption sections ===");
    $(".info-unit-caption").each((i, elem) => {
        const caption = $(elem).text().trim();
        console.log(`\n${i + 1}. Caption: "${caption}"`);

        const nextDiv = $(elem).next(".info-arkitex.info-X1-100");
        if (nextDiv.length) {
            const ingredients = [];
            nextDiv.find("div[style*='padding-left']").each((j, ingr) => {
                const text = $(ingr).text().trim();
                ingredients.push(text);
            });
            console.log("   Ingredients:", ingredients);
        }
    });
}

main().catch(console.error);
