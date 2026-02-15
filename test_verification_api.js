
import { fetchFandomContext } from "./tools/fandom_fetch.js";

async function verifyTool() {
    console.log("--- Verifying API-based Tool ---");

    // Test Fandom (should work via API now)
    const fandomUrl = "https://ark.fandom.com/wiki/Baryonyx";

    try {
        console.log(`Fetching ${fandomUrl}...`);
        const ctx = await fetchFandomContext(fandomUrl, { intent: "taming" });
        console.log("✅ Success!");
        console.log("Preview:");
        console.log(ctx.slice(0, 300));
    } catch (e) {
        console.error("❌ Fandom Failed:", e.message);
    }

    // Test Wiki.gg (should also work)
    const wikiggUrl = "https://ark.wiki.gg/wiki/Baryonyx";
    try {
        console.log(`\nFetching ${wikiggUrl}...`);
        const ctx = await fetchFandomContext(wikiggUrl, { intent: "taming" });
        console.log("✅ Success!");
    } catch (e) {
        console.error("❌ Wiki.gg Failed:", e.message);
    }
}

verifyTool();
