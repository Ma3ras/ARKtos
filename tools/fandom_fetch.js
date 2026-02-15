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

    // PRIORITY 1: Extract Fandom's "info-arkitex" Domestication module
    // This contains the critical taming data (Preferred Food, Kibble, Method, etc.)
    const domesticationModule = $("div.info-arkitex.info-module").filter((_, el) => {
        return $(el).text().includes("Domestication");
    }).first();

    if (domesticationModule.length) {
        // The data is in nested divs, not tables. We need to parse the text structure.
        const text = domesticationModule.text();

        // Extract key-value pairs using regex patterns
        const patterns = [
            /Torpor Immune\s+([^\n]+)/gi,
            /Taming Method\s+([^\n]+)/gi,
            /Preferred Kibble\s+([^\n]+)/gi, // Note: may appear twice
            /Preferred Food\s+([^\n]+)/gi,
            /Equipment\s+([^\n]+)/gi,
        ];

        patterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const value = match[1].trim();
                if (value && value.length > 0 && value.length < 100) {
                    const label = match[0].split(/\s+/)[0] + " " + match[0].split(/\s+/)[1]; // e.g., "Preferred Kibble"
                    info.push(`${label.trim()}: ${value}`);
                }
            }
        });
    }

    // PRIORITY 2: Try portable infobox (general creature info)
    const aside = $("aside.portable-infobox").first();
    if (aside.length) {
        aside.find(".pi-data").each((_, el) => {
            const label = cleanText($(el).find(".pi-data-label").text());
            const value = cleanText($(el).find(".pi-data-value").text());
            if (label && value) info.push(`${label}: ${value}`);
        });
    } else {
        // Fallback to standard infobox table
        const table = $("table.infobox").first();
        if (table.length) {
            table.find("tr").each((_, tr) => {
                const th = cleanText($(tr).find("th").first().text());
                const td = cleanText($(tr).find("td").first().text());
                if (th && td) info.push(`${th}: ${td}`);
            });
        }
    }

    return info.slice(0, 50);
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

    // URL Parsing for API
    let domain = "";
    let slug = "";
    try {
        const u = new URL(url);
        domain = u.origin;
        const parts = u.pathname.split("/wiki/");
        if (parts.length < 2) throw new Error("Invalid Wiki URL");
        slug = parts[1]; // e.g. "Baryonyx"
    } catch (e) {
        throw new Error(`Could not parse Wiki URL: ${url}`);
    }

    const apiUrl = `${domain}/api.php?action=parse&page=${slug}&prop=text|title&format=json&redirects=1`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    const r = await fetch(apiUrl, {
        signal: ctrl.signal,
        headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ARKBot/1.0; +http://example.com)",
        },
    }).finally(() => clearTimeout(t));

    if (!r.ok) throw new Error(`Wiki API Fetch failed ${r.status} for ${apiUrl}`);

    const data = await r.json();
    if (data.error) throw new Error(`Wiki API Error: ${data.error.info || "Unknown error"}`);
    if (!data.parse || !data.parse.text) throw new Error("Wiki API returned no content");

    const html = data.parse.text["*"];
    const pageTitle = data.parse.title || slug;

    // Parse the HTML fragment
    const $ = cheerio.load(html);

    // Reuse existing logic (pickSections, parseInfobox)
    // Note: API fragment does not have h1 usually, but has the content div
    const infobox = parseInfobox($);
    const sections = pickSections($, intent, { maxSections: intent === "taming" ? 3 : 2 });
    const fallback = pickFallback($);

    let out = `TITLE: ${pageTitle}\nURL: ${url}\nINTENT: ${intent}\n\n`;

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
