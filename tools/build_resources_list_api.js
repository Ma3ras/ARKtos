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

async function main() {
    const titles = [];
    let cmcontinue = undefined;

    while (true) {
        const data = await mw({
            action: "query",
            list: "categorymembers",
            cmtitle: "Category:Resources",
            cmlimit: "500",
            cmnamespace: "0",          // nur Artikel (keine Kategorien/Files)
            ...(cmcontinue ? { cmcontinue } : {}),
        });

        const members = data?.query?.categorymembers || [];
        for (const m of members) titles.push(m.title);

        console.log("Fetched:", titles.length);

        cmcontinue = data?.continue?.cmcontinue;
        if (!cmcontinue) break;
    }

    // optional: Dinge rausfiltern, die du nicht willst
    const clean = titles.filter(t =>
        !t.startsWith("Category:") &&
        !t.startsWith("File:") &&
        !t.startsWith("Template:")
    );

    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/resources_titles.json", JSON.stringify(clean, null, 2), "utf-8");

    console.log("✅ Saved:", clean.length, "titles to data/resources_titles.json");
}

main().catch(e => {
    console.error("❌", e);
    process.exit(1);
});
