import fs from "node:fs";

const API = "https://ark.fandom.com/api.php";

async function mw(params) {
    const url = API + "?" + new URLSearchParams({
        format: "json",
        origin: "*",
        ...params,
    });

    const r = await fetch(url, {
        headers: {
            "User-Agent": "ark-bot/1.0 (local dev)",
            "Accept": "application/json",
        }
    });

    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function main() {
    const titles = JSON.parse(fs.readFileSync("data/resources_titles.json", "utf-8"));

    const rows = [];
    const batches = chunk(titles, 20); // 20 = sicher, API kann mehr, aber stabil so

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Batch ${i + 1}/${batches.length} (${rows.length} saved)`);

        const data = await mw({
            action: "query",
            prop: "extracts|info",
            inprop: "url",
            explaintext: "1",
            exintro: "0",
            exsectionformat: "plain",
            redirects: "1",
            titles: batch.join("|"),
        });

        const pages = data?.query?.pages || {};
        for (const page of Object.values(pages)) {
            if (!page?.title) continue;
            rows.push({
                title: page.title,
                url: page.fullurl || null,
                text: (page.extract || "").trim(),
            });
        }
    }

    fs.writeFileSync("data/resources_full.json", JSON.stringify(rows, null, 2), "utf-8");
    console.log("✅ Saved:", rows.length, "pages to data/resources_full.json");
}

main().catch(e => {
    console.error("❌", e);
    process.exit(1);
});
