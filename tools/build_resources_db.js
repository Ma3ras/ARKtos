// tools/build_resources_db.js
import fs from "node:fs";
import path from "node:path";

const IN_FILE = path.join(process.cwd(), "data", "resources_full.json");
const OUT_FILE = path.join(process.cwd(), "data", "resources_db.json");
const DE_FILE = path.join(process.cwd(), "data", "resources_de_aliases.json");

/* ------------------------------------------------ */
/* NORMALIZE (CRASH SAFE + umlauts)                 */
/* ------------------------------------------------ */

function norm(s) {
    if (s === null || s === undefined) return "";
    if (typeof s !== "string") s = String(s);

    // keep umlauts; just normalize spacing/punct
    return s
        .toLowerCase()
        .replace(/[_\-]/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenCount(s) {
    const t = norm(s);
    return t ? t.split(" ").filter(Boolean).length : 0;
}

function firstLines(text, maxChars = 700) {
    const t = (text || "").replace(/\s+/g, " ").trim();
    return t.slice(0, maxChars);
}

/* ------------------------------------------------ */
/* STOPWORDS                                        */
/* ------------------------------------------------ */

const STOPWORDS = new Set([
    "ark",
    "survival",
    "evolved",
    "ascended",
    "alpha",
    "beta",
    "gamma",
    "island",
    "isles",
    "extinction",
    "aberration",
    "genesis",
    "scorched",
    "ragnarok",
    "valguero",
    "fjordur",
    "event",
    "patch",
    "version",
    "part",
]);

/* ------------------------------------------------ */
/* MANUAL ALIASES (EN)                              */
/* ------------------------------------------------ */

const MANUAL_ALIASES = {
    metal: ["metal ore"],
    oil: ["crude oil"],
    "organic polymer": ["org polymer"],
    "silica pearls": ["pearls"],
    obsidian: ["obs"],
    "cementing paste": ["cp", "paste"],
};

/* ------------------------------------------------ */
/* BUILD ALIASES                                    */
/* ------------------------------------------------ */
/**
 * Ziel:
 * - Exakter Titel immer als Alias.
 * - Für Multi-Word Titel KEINE Einzelwörter automatisch als Alias.
 * - Plural/Singular für die ganze Phrase ok.
 * - Manuelle Aliases: Einzelwort nur wenn Titel selbst ein Wort ist.
 */
function buildAliases(title) {
    const base = norm(title);
    if (!base) return [];

    const aliases = new Set();
    const words = base.split(" ").filter(Boolean);
    const singleWordTitle = words.length === 1;

    // exact title
    aliases.add(base);

    // plural/singular (whole phrase)
    if (base.endsWith("s")) aliases.add(base.slice(0, -1));
    else aliases.add(base + "s");

    // manual aliases
    const man = MANUAL_ALIASES[base];
    if (man) {
        for (const raw of man) {
            const a = norm(raw);
            if (!a) continue;

            const isSingle = a.split(" ").filter(Boolean).length === 1;

            // no single-word alias for multi-word titles
            if (isSingle && !singleWordTitle) continue;

            // ignore stopword-only aliases
            const toks = a.split(" ").filter(Boolean);
            if (toks.length && toks.every((w) => STOPWORDS.has(w))) continue;

            aliases.add(a);

            // plural/singular for manual aliases too (whole phrase)
            if (a.endsWith("s")) aliases.add(a.slice(0, -1));
            else aliases.add(a + "s");
        }
    }

    return [...aliases].filter((a) => a.length >= 3);
}

/* ------------------------------------------------ */
/* CONFLICT RESOLUTION                              */
/* ------------------------------------------------ */
/**
 * Regeln:
 * - Wenn alias exakt einem Titel entspricht -> dieser Titel gewinnt.
 * - Sonst: bevorzugt gleiche Tokenanzahl wie alias.
 * - Sonst: kürzerer Titel (weniger Tokens).
 * - Sonst: kürzerer String.
 */
function chooseBetter(alias, cur, next) {
    const a = norm(alias);
    const curTitle = norm(cur?.title);
    const nextTitle = norm(next?.title);

    // exact title wins ALWAYS
    if (a === nextTitle && a !== curTitle) return next;
    if (a === curTitle && a !== nextTitle) return cur;

    const aTok = tokenCount(a);
    const curTok = tokenCount(curTitle);
    const nextTok = tokenCount(nextTitle);

    // same token count preferred
    const curSame = curTok === aTok;
    const nextSame = nextTok === aTok;
    if (nextSame && !curSame) return next;
    if (curSame && !nextSame) return cur;

    // shorter title preferred (fewer tokens)
    if (nextTok < curTok) return next;
    if (curTok < nextTok) return cur;

    // fallback: shorter string
    if (nextTitle.length < curTitle.length) return next;
    return cur;
}

/* ------------------------------------------------ */
/* LOAD GERMAN ALIASES                              */
/* ------------------------------------------------ */
/**
 * Erwartet Datei im Format:
 * {
 *   "deToEn": { "metall": "Metal", "öl": "Oil", ... }
 * }
 * oder direkt:
 * { "metall":"Metal", "öl":"Oil" }
 * oder Array:
 * [ { "de":"metall", "en":"Metal" }, ... ]
 */
function loadGermanAliases() {
    if (!fs.existsSync(DE_FILE)) {
        console.log("ℹ️ no german alias file:", DE_FILE);
        return null;
    }

    const raw = JSON.parse(fs.readFileSync(DE_FILE, "utf-8"));

    // unwrap { deToEn: {...} }
    let payload = raw;
    if (payload && typeof payload === "object" && !Array.isArray(payload) && payload.deToEn) {
        payload = payload.deToEn;
    }

    const map = new Map();

    // object { "metall":"Metal" }
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        for (const [de, en] of Object.entries(payload)) {
            const nde = norm(de);
            const nen = norm(en);
            if (nde && nen) map.set(nde, nen);
        }
        return map;
    }

    // array [{de,en}]
    if (Array.isArray(payload)) {
        for (const row of payload) {
            if (!row) continue;
            const nde = norm(row.de ?? row.german);
            const nen = norm(row.en ?? row.english);
            if (nde && nen) map.set(nde, nen);
        }
        return map;
    }

    return null;
}

/* ------------------------------------------------ */
/* MAIN                                             */
/* ------------------------------------------------ */

function main() {
    const raw = JSON.parse(fs.readFileSync(IN_FILE, "utf-8"));

    const pages = raw
        .filter((p) => p?.title && p?.url && p?.text && String(p.text).trim().length > 50)
        .map((p) => ({
            key: norm(p.title),
            title: p.title,
            url: p.url,
            blurb: firstLines(String(p.text)),
            aliases: buildAliases(p.title),
        }));

    const keyToRes = new Map(pages.map((r) => [r.key, r]));
    const titleToKey = new Map(pages.map((r) => [norm(r.title), r.key]));

    const aliasToKey = {};

    // build alias map from EN aliases
    for (const r of pages) {
        for (const a of r.aliases) {
            if (!aliasToKey[a]) {
                aliasToKey[a] = r.key;
                continue;
            }
            const cur = keyToRes.get(aliasToKey[a]);
            if (!cur) {
                aliasToKey[a] = r.key;
                continue;
            }
            const winner = chooseBetter(a, cur, r);
            aliasToKey[a] = winner.key;
        }
    }

    /* -------- GERMAN ALIASES (de -> en title -> key) -------- */

    const deMap = loadGermanAliases();
    let added = 0;
    let missing = 0;

    if (deMap) {
        for (const [de, enTitleNorm] of deMap.entries()) {
            // enTitleNorm is normalized english title (e.g. "metal", "oil", "crystal talon crystal isles")
            const key = titleToKey.get(enTitleNorm);
            if (!key) {
                missing++;
                continue;
            }

            // IMPORTANT: we set aliasToKey[de] to the *resource key*
            aliasToKey[de] = key;

            // also allow plural/singular for german alias (whole word/phrase)
            if (de.endsWith("s")) aliasToKey[de.slice(0, -1)] = key;
            else aliasToKey[de + "s"] = key;

            added++;
        }
    }

    console.log("✅ German aliases added:", added, "| missing en titles:", missing);

    /* -------- SAVE -------- */

    fs.writeFileSync(
        OUT_FILE,
        JSON.stringify(
            {
                updated_at: new Date().toISOString(),
                count: pages.length,
                resources: pages,
                aliasToKey,
            },
            null,
            2
        ),
        "utf-8"
    );

    console.log("✅ Saved:", OUT_FILE);
    console.log("Resources:", pages.length);
    console.log("Aliases:", Object.keys(aliasToKey).length);

    /* -------- DEBUG TESTS -------- */

    const tests = ["crystal", "metal", "metall", "öl", "oil"];
    for (const t of tests) {
        const k = aliasToKey[norm(t)];
        const title = k ? keyToRes.get(k)?.title : "(none)";
        console.log(`TEST "${t}" ->`, title);
    }
}

main();
