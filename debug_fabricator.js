// Debug Fabricator HTML structure
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
    console.log("Fetching Fabricator HTML...");
    const html = await fetchPageHTML("Fabricator");

    fs.writeFileSync("fabricator.html", html, "utf-8");
    console.log("Saved to fabricator.html");

    // Parse and show all ingredient sections
    const $ = cheerio.load(html);

    console.log("\n=== All .info-unit-caption sections ===");
    $(".info-unit-caption").each((i, elem) => {
        const caption = $(elem).text().trim();
        console.log(`\n${i + 1}. Caption: "${caption}"`);

        if (caption === "Ingredients") {
            const nextDiv = $(elem).next(".info-arkitex.info-X1-100");
            console.log("   Found Ingredients div!");

            // Show all display:inline-block containers
            const containers = nextDiv.find("div[style*='display:inline-block']");
            console.log(`   Found ${containers.length} containers`);

            containers.each((j, container) => {
                const $container = $(container);
                const headerText = $container.find("b").first().text().trim();
                console.log(`\n   Container ${j + 1}: "${headerText}"`);

                // Show direct children with padding-left
                const children = $container.children("div[style*='padding-left']");
                console.log(`     Direct children: ${children.length}`);

                children.each((k, child) => {
                    const $child = $(child);
                    const boldText = $child.find("> b").first().text().trim();
                    console.log(`       ${k + 1}. ${boldText.substring(0, 60)}`);
                });
            });
        }
    });
}

main().catch(console.error);
