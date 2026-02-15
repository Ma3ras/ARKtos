import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

function cleanText(s) {
    return (s || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeHeader(s) {
    return cleanText(s).toLowerCase().replace(/\[.*?\]/g, "").trim();
}

function sha1(s) {
    return crypto.createHash("sha1").update(String(s)).digest("hex");
}

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * intent: "taming" | "breeding" | "spawn" | "combat" | "general"
 */
function wantedSetForIntent(intent = "general") {
    // Reihenfolge = Priorität
    if (intent === "taming") {
        return [
            "taming",
            "ko strategy",
            "torpor",
            "preferred food",
            "food",
            "strategy",
            "behavior",
            "utility",
            "usage",
            "combat",
            "breeding",
            "spawn",
            "location",
        ];
    }
    if (intent === "breeding") {
        return [
            "breeding",
            "eggs",
            "incubation",
            "maturation",
            "raising",
            "baby",
            "strategy",
            "utility",
            "taming",
            "stats",
            "statistics"
        ];
    }
    if (intent === "spawn") {
        return [
            "spawn",
            "spawning",
            "habitat",
            "location",
            "locations",
            "map",
            "maps",
            "utility",
            "taming"
        ];
    }
    if (intent === "combat") {
        return [
            "combat",
            "strategy",
            "weakness",
            "drops",
            "loot",
            "utility",
            "stats",
            "statistics",
            "taming"
        ];
    }
    return [
        "utility",
        "usage",
        "behavior",
        "taming",
        "breeding",
        "spawn",
        "location",
        "combat",
        "strategy",
        "drops",
        "stats",
        "statistics",
        "appearance",
        "description"
    ];
}

function pickSections($, intent, { maxSections = 3 } = {}) {
    const wanted = wantedSetForIntent(intent);
    const headings = $("h2, h3").toArray();

    // Sammle alle Kandidaten mit Score (damit “Taming” sicher gewinnt)
    const candidates = [];

    for (const h of headings) {
        const raw = $(h).text();
        const key = normalizeHeader(raw);
        if (!key) continue;

        // best rank by earliest match in wanted list
        let rank = 9999;
        for (let i = 0; i < wanted.length; i++) {
            const w = wanted[i];
            if (key === w || key.includes(w)) { rank = i; break; }
        }
        if (rank === 9999) continue;

        // collect text until next h2/h3
        const lines = [];
        let el = $(h).next();
        while (el.length) {
            if (el.is("h2") || el.is("h3")) break;

            // p, lists are good
            if (el.is("p, ul, ol")) {
                const t = cleanText(el.text());
                if (t && t.length > 30) lines.push(t);
            }

            // some pages have tables with important info (lightweight extract)
            if (el.is("table")) {
                const t = cleanText(el.text());
                if (t && t.length > 60) lines.push(t);
            }

            el = el.next();
        }

        if (!lines.length) continue;

        candidates.push({
            rank,
            title: cleanText(raw).replace(/\[.*?\]/g, "").trim(),
            text: lines.join("\n"),
        });
    }

    // sort: best rank first, then shorter title (minor), then keep top N
    candidates.sort((a, b) => a.rank - b.rank || a.title.length - b.title.length);

    // de-dupe by title
    const out = [];
    const seen = new Set();
    for (const c of candidates) {
        const k = normalizeHeader(c.title);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ title: c.title, text: c.text });
        if (out.length >= maxSections) break;
    }

    return out;
}

function parseInfobox($) {
    const info = [];
    const aside = $("aside.portable-infobox").first();

    if (aside.length) {
        aside.find(".pi-data").each((_, el) => {
            const label = cleanText($(el).find(".pi-data-label").text());
            const value = cleanText($(el).find(".pi-data-value").text());
            if (label && value) info.push(`${label}: ${value}`);
        });
    } else {
        const table = $("table.infobox").first();
        if (table.length) {
            table.find("tr").each((_, tr) => {
                const th = cleanText($(tr).find("th").first().text());
                const td = cleanText($(tr).find("td").first().text());
                if (th && td) info.push(`${th}: ${td}`);
            });
        }
    }

    return info.slice(0, 40);
}

function pickFallback($) {
    const p = $("#mw-content-text p").first();
    const t = p.length ? cleanText(p.text()) : "";
    return t;
}

/**
 * Disk cache:
 *  data/cache/fandom/<sha1(url)>.json
 */
export async function fetchFandomContext(
    url,
    {
        intent = "general",
        maxChars = 4500,
        timeoutMs = 12000,
        cacheDir = path.join(process.cwd(), "data", "cache", "fandom"),
        cacheTtlMs = 1000 * 60 * 60 * 24 * 7, // 7 Tage
    } = {}
) {
    ensureDir(cacheDir);

    const cacheFile = path.join(cacheDir, `${sha1(url)}.json`);
    if (fs.existsSync(cacheFile)) {
        try {
            const raw = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
            if (raw?.savedAt && Date.now() - raw.savedAt < cacheTtlMs && raw?.text) {
                return raw.text;
            }
        } catch { }
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    const r = await fetch(url, {
        signal: ctrl.signal,
        headers: {
            "User-Agent": "ark-bot/1.0 (local; discord)",
            "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
        },
    }).finally(() => clearTimeout(t));

    if (!r.ok) throw new Error(`Fetch failed ${r.status} for ${url}`);

    const html = await r.text();
    const $ = cheerio.load(html);

    const title =
        cleanText($("h1.page-header__title").first().text()) ||
        cleanText($("h1").first().text()) ||
        url;

    const infobox = parseInfobox($);
    const sections = pickSections($, intent, { maxSections: intent === "taming" ? 3 : 2 });
    const fallback = pickFallback($);

    let out = `TITLE: ${title}\nURL: ${url}\nINTENT: ${intent}\n\n`;

    if (infobox.length) out += `INFOBOX:\n- ${infobox.join("\n- ")}\n\n`;

    if (sections.length) {
        out += sections.map(s => `SECTION: ${s.title}\n${s.text}`).join("\n\n");
    } else if (fallback) {
        out += `SECTION: Overview\n${fallback}`;
    } else {
        out += `SECTION: (none)\n(No extractable text found)`;
    }

    if (out.length > maxChars) out = out.slice(0, maxChars) + "\n...(truncated)";

    // save cache
    try {
        fs.writeFileSync(cacheFile, JSON.stringify({ savedAt: Date.now(), url, text: out }, null, 2), "utf-8");
    } catch { }

    return out;
}
