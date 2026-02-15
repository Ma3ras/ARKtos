import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";

const API = "https://ark.wiki.gg/api.php";
const OUT = path.join(process.cwd(), "data", "ark_wiki_en.jsonl");

fs.mkdirSync("data", { recursive: true });

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}


async function mw(params) {
    const url = API + "?" + new URLSearchParams({
        format: "json",
        origin: "*",
        ...params,
    });

    const r = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept": "application/json"
        }
    });

    if (!r.ok) {
        const text = await r.text();
        throw new Error(text);
    }

    return r.json();
}


// get list of pages
async function listPages(limit = 1500) {
    let cont;
    const titles = [];

    while (titles.length < limit) {
        const data = await mw({
            action: "query",
            list: "allpages",
            aplimit: "500",
            ...(cont ? { apcontinue: cont } : {}),
        });

        data.query.allpages.forEach(p => titles.push(p.title));

        cont = data?.continue?.apcontinue;
        if (!cont) break;
    }

    return titles;
}

// fetch page content (WORKS on wiki.gg)
async function fetchPage(title, attempt = 1) {
    try {
        const data = await mw({
            action: "parse",
            page: title,
            prop: "text",
            redirects: "1",
        });

        let html = data?.parse?.text?.["*"] || "";

        const text = html
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return {
            title,
            pageid: data?.parse?.pageid,
            text,
        };
    } catch (err) {
        if (attempt <= 5) {
            console.log("Retry", attempt, "for", title);
            await sleep(2000 + Math.random() * 2000);
            return fetchPage(title, attempt + 1);
        }

        console.log("FAILED FINAL:", title);
        return null;
    }
}


async function main() {
    console.log("Starting ingest...");
    fs.writeFileSync(OUT, "");

    // TEST WRITE (so file is never empty again)
    const test = await fetchPage("Rex");
    console.log("Test chars:", test.text.length);

    fs.appendFileSync(OUT, JSON.stringify(test) + "\n");

    const titles = await listPages(2000);
    console.log("Pages:", titles.length);

    let saved = 1;

    for (const title of titles) {
        if (title === "Rex") continue;

        try {
            const page = await fetchPage(title);

            if (!page.text) continue;
            fs.appendFileSync(OUT, JSON.stringify(page) + "\n");
            saved++;

            if (saved % 50 === 0)
                console.log("Saved:", saved, "latest:", title);

            await sleep(600 + Math.random() * 400);
        } catch (err) {
            console.log("FAILED:", title, err.message);
        }

    }

    console.log("✅ DONE — pages saved:", saved);
}

main();
