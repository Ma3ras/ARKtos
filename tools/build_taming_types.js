// tools/build_taming_types.js
import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";

const API = "https://ark.wiki.gg/api.php";

const TARGETS = [
    "Turret Knock-out Taming",
    "Titan Knock-out Taming",
    "Unique Knock-out Taming",
    "Non-Violent Taming",
    "Unique Non-Violent Taming",
    "Other Taming Types",
    "Untamable",
];

const ALIASES = {
    "Turret Knock-out Taming": ["Turret Knock-out Taming", "Turret taming", "Turret Taming"],
    "Titan Knock-out Taming": ["Titan Knock-out Taming", "Titan taming", "Titan Taming"],
    "Unique Knock-out Taming": ["Unique Knock-out Taming", "Unique knockout taming", "Unique KO"],
    "Non-Violent Taming": ["Non-Violent Taming", "Non-violent taming", "Nonviolent Taming"],
    "Unique Non-Violent Taming": ["Unique Non-Violent Taming", "Unique non-violent taming", "Unique Nonviolent Taming"],
    "Other Taming Types": ["Other Taming Types", "Other taming types", "Other Taming"],
    "Untamable": ["Untamable", "Untameable", "Untamable creatures", "Untameable creatures"],
};

function norm(s) {
    return String(s || "").trim().toLowerCase();
}

async function mw(params) {
    const url = API + "?" + new URLSearchParams({
        format: "json",
        origin: "*",
        ...params,
    });
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

// 1) Hole Section-Liste (mit index)
async function getSections() {
    const data = await mw({
        action: "parse",
        page: "Taming",
        prop: "sections",
    });
    const sections = data?.parse?.sections || [];
    return sections; // {toclevel, level, line, number, index, anchor}
}

function findSectionIndex(sections, targetKey) {
    const aliases = (ALIASES[targetKey] || [targetKey]).map(norm);

    // Suche best match: exact line match zuerst, dann includes
    for (const s of sections) {
        const line = norm(s.line);
        if (aliases.some(a => line === a)) return s.index;
    }
    for (const s of sections) {
        const line = norm(s.line);
        if (aliases.some(a => line.includes(a))) return s.index;
    }
    return null;
}

// 2) Hole ALLE Links, die in einer Section vorkommen (inkl. Template-generiert)
async function getSectionLinks(sectionIndex) {
    let links = [];
    let plcontinue;

    do {
        const data = await mw({
            action: "parse",
            page: "Taming",
            prop: "links",
            section: String(sectionIndex),
            // parse->links ist i.d.R. nicht paginated, aber wir lassen continue drin falls wiki.gg das unterstützt
            ...(plcontinue ? { plcontinue } : {}),
        });

        const arr = data?.parse?.links || [];
        links.push(...arr);
        plcontinue = data?.continue?.plcontinue;
    } while (plcontinue);

    // Filter: ns=0 (Hauptnamensraum, also Seiten wie Rex)
    const titles = links
        .filter(l => l.ns === 0 && l.exists !== undefined) // exists ist oft da; wir wollen nur echte Seiten
        .map(l => l["*"])
        .filter(Boolean);

    return [...new Set(titles)];
}

async function main() {
    const sections = await getSections();

    if (!sections.length) {
        throw new Error("Keine sections gefunden. parse&prop=sections liefert nichts.");
    }

    const categories = {};
    for (const key of TARGETS) categories[key] = [];

    for (const key of TARGETS) {
        const idx = findSectionIndex(sections, key);
        if (idx == null) {
            console.log(`⚠️ Section nicht gefunden für: ${key}`);
            categories[key] = [];
            continue;
        }
        const titles = await getSectionLinks(idx);
        categories[key] = titles;
        console.log(`✅ ${key}: ${titles.length} (section=${idx})`);
    }

    const lookup = {};
    for (const [cat, list] of Object.entries(categories)) {
        for (const name of list) {
            if (!lookup[name]) lookup[name] = cat;
        }
    }

    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync(path.join("data", "taming_categories.json"), JSON.stringify(categories, null, 2), "utf8");
    fs.writeFileSync(path.join("data", "taming_lookup.json"), JSON.stringify(lookup, null, 2), "utf8");

    console.log("✅ Saved: data/taming_categories.json + data/taming_lookup.json");
    console.log("Total listed entries:", Object.keys(lookup).length);
    console.log('Default-Regel: nicht gelistet => "Knock-out Taming (default)"');
}

main().catch((e) => {
    console.error("❌ Failed:", e.message);
    process.exit(1);
});
