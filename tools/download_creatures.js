// tools/download_creatures.js
import fs from "node:fs";
import path from "node:path";

const OUT_FILE = path.join(process.cwd(), "data", "creatures_db.json");

// Fandom MediaWiki API base
const API = "https://ark.fandom.com/api.php";

// polite defaults
const HEADERS = {
    "User-Agent": "ark-bot/1.0 (local; contact: none)",
    "Accept": "application/json",
    "Accept-Language": "de,en;q=0.9",
};

// tiny sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url) {
    // retry for 429/5xx
    for (let attempt = 1; attempt <= 6; attempt++) {
        const r = await fetch(url, { headers: HEADERS });

        if (r.status === 429 || (r.status >= 500 && r.status <= 599)) {
            const wait = 500 * attempt;
            console.log(`⚠️ ${r.status} retry in ${wait}ms: ${url}`);
            await sleep(wait);
            continue;
        }

        if (!r.ok) {
            const txt = await r.text().catch(() => "");
            throw new Error(`HTTP ${r.status} ${r.statusText} for ${url}\n${txt.slice(0, 300)}`);
        }

        return r.json();
    }

    throw new Error(`Too many retries for: ${url}`);
}

function qs(obj) {
    return new URLSearchParams(obj).toString();
}

function makeWikiUrl(title) {
    // Fandom wiki URLs use underscores
    const t = String(title || "").replace(/ /g, "_");
    return `https://ark.fandom.com/wiki/${encodeURIComponent(t)}`;
}

function normKey(title) {
    return String(title || "")
        .toLowerCase()
        .replace(/[_\-]/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

// parse tameable/breedable/ridable from wikitext (best-effort)
function parseFlagsFromWikitext(wikitext) {
    const wt = String(wikitext || "");

    // common template field styles:
    // | tameable = Yes / No
    // | breedable = Yes
    // | rideable = Yes
    // sometimes localized or with links/templates -> we normalize roughly
    const pick = (field) => {
        const re = new RegExp(`\\|\\s*${field}\\s*=\\s*([^\\n\\r\\|}]*)`, "i");
        const m = wt.match(re);
        if (!m) return null;
        const raw = m[1]
            .replace(/\[\[|\]\]/g, "")
            .replace(/\{\{|\}\}/g, "")
            .replace(/<.*?>/g, "")
            .trim()
            .toLowerCase();

        // map to boolean-ish
        if (!raw) return null;
        if (/(no|false|nein|untamable|not tameable)/.test(raw)) return false;
        if (/(yes|true|ja|tameable|breedable|rideable)/.test(raw)) return true;

        // unknown value -> keep null
        return null;
    };

    return {
        tameable: pick("tameable"),
        breedable: pick("breedable"),
        rideable: pick("rideable"),
    };
}

async function listCategoryMembersAll(categoryTitle) {
    console.log(`📥 Listing category members: ${categoryTitle}`);
    let cmcontinue = null;
    const all = [];

    while (true) {
        const params = {
            action: "query",
            format: "json",
            list: "categorymembers",
            cmtitle: categoryTitle,     // e.g. "Category:Creatures"
            cmlimit: "500",
            cmtype: "page",
            origin: "*",
        };
        if (cmcontinue) params.cmcontinue = cmcontinue;

        const url = `${API}?${qs(params)}`;
        const data = await fetchJSON(url);

        const members = data?.query?.categorymembers || [];
        for (const m of members) {
            if (m?.title) all.push(m.title);
        }

        cmcontinue = data?.continue?.cmcontinue;
        console.log(`  -> got ${all.length} titles so far`);

        if (!cmcontinue) break;
        await sleep(150);
    }

    // de-dupe
    return [...new Set(all)];
}

async function getWikitext(title) {
    // MediaWiki content via revisions slots
    const params = {
        action: "query",
        format: "json",
        prop: "revisions",
        titles: title,
        rvprop: "content",
        rvslots: "main",
        formatversion: "2",
        redirects: "1",
        origin: "*",
    };

    const url = `${API}?${qs(params)}`;
    const data = await fetchJSON(url);

    const page = data?.query?.pages?.[0];
    if (!page || page.missing) return null;

    const wt = page?.revisions?.[0]?.slots?.main?.content;
    return typeof wt === "string" ? wt : null;
}

async function main() {
    // 1) grab all creature pages from category
    const titles = await listCategoryMembersAll("Category:Creatures");
    console.log(`✅ Titles in category: ${titles.length}`);

    // 2) download wikitext + parse flags
    const out = {
        updated_at: new Date().toISOString(),
        count: 0,
        creatures: [],
    };

    for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        const url = makeWikiUrl(title);

        try {
            const wt = await getWikitext(title);
            if (!wt) continue;

            const flags = parseFlagsFromWikitext(wt);

            out.creatures.push({
                key: normKey(title),
                title,
                url,
                tameable: flags.tameable,   // true/false/null
                breedable: flags.breedable, // true/false/null
                rideable: flags.rideable,   // true/false/null
            });

            if ((i + 1) % 50 === 0) {
                console.log(`Saved ${i + 1}/${titles.length} ...`);
            }

            // small delay to be nice
            await sleep(120);

        } catch (e) {
            console.log(`⚠️ Skip "${title}" -> ${e.message.split("\n")[0]}`);
            await sleep(400);
        }
    }

    out.count = out.creatures.length;

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");

    console.log("✅ Saved:", OUT_FILE);
    console.log("Creatures saved:", out.count);

    // quick sanity
    const sample = ["Rex", "Dodo", "Giganotosaurus"];
    for (const s of sample) {
        const hit = out.creatures.find(c => c.title.toLowerCase() === s.toLowerCase());
        console.log("TEST", s, "->", hit ? hit : "(not found)");
    }
}

main().catch((e) => {
    console.error("❌ Fatal:", e);
    process.exit(1);
});
