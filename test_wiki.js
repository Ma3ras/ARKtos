
async function testAPI() {
    console.log("--- Testing MediaWiki API ---");
    const apis = [
        "https://ark.fandom.com/api.php?action=parse&page=Baryonyx&prop=text&format=json",
        "https://ark.wiki.gg/api.php?action=parse&page=Baryonyx&prop=text&format=json"
    ];

    for (const api of apis) {
        console.log(`\nFetching API: ${api}`);
        try {
            const r = await fetch(api, {
                headers: { "User-Agent": "Bot/1.0 (contact@example.com)" }
            });
            console.log(`Status: ${r.status}`);

            if (r.ok) {
                const text = await r.text();
                try {
                    const data = JSON.parse(text);
                    if (data.parse && data.parse.text) {
                        const content = data.parse.text["*"];
                        console.log("✅ Success! Got parsed text.");
                        console.log(`Length: ${content.length}`);
                        console.log(`Snippet: ${content.slice(0, 100).replace(/\n/g, "")}`);
                    } else if (data.error) {
                        console.log(`⚠️ API Error: ${JSON.stringify(data.error)}`);
                    } else {
                        console.log("⚠️ Unknown response structure.");
                    }
                } catch (e) {
                    console.log(`❌ JSON Parse Error: ${e.message}. Raw: ${text.slice(0, 100)}`);
                }
            } else {
                console.log(`❌ Failed: ${r.status}`);
            }
        } catch (e) {
            console.error(`❌ Fetch Failed: ${e.message}`);
        }
    }
}

testAPI();
