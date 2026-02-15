// Debug: Save HTML to file to analyze structure
import fetch from "node-fetch";
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
    console.log("Fetching Stone Hatchet HTML...");
    const html = await fetchPageHTML("Stone Hatchet");

    fs.writeFileSync("stone_hatchet.html", html, "utf-8");
    console.log("Saved to stone_hatchet.html");

    // Check what's in the HTML
    console.log("\nSearching for infobox classes...");
    if (html.includes("portable-infobox")) console.log("✅ Found 'portable-infobox'");
    if (html.includes("infobox")) console.log("✅ Found 'infobox'");
    if (html.includes("data-source=\"recipe\"")) console.log("✅ Found 'data-source=\"recipe\"'");
    if (html.includes("pi-data-value")) console.log("✅ Found 'pi-data-value'");

    // Search for "Flint" to see how materials are structured
    const flintIndex = html.indexOf("Flint");
    if (flintIndex !== -1) {
        console.log("\n✅ Found 'Flint' at index:", flintIndex);
        console.log("Context around Flint:");
        console.log(html.substring(Math.max(0, flintIndex - 200), flintIndex + 200));
    }
}

main().catch(console.error);
