// resources.js (optimized for: exact name priority, "crystal" != "crystal talon", german-friendly normalize)

import fs from "node:fs";
import path from "node:path";

const DB_FILE = path.join(process.cwd(), "data", "resources_db.json");
const RES_FILE = path.join(process.cwd(), "data", "resources_locations.json"); // optional coords

let DB = null;
let LOC = null;

function load() {
    if (!DB) DB = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!LOC && fs.existsSync(RES_FILE)) LOC = JSON.parse(fs.readFileSync(RES_FILE, "utf-8"));
}

/* ---------------- NORMALIZE / TOKENS ---------------- */

function norm(s) {
    return (s || "")
        .toLowerCase()
        .normalize("NFKD")                 // umlaut safe
        .replace(/[\u0300-\u036f]/g, "")   // remove diacritics
        .replace(/[_\-]/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toks(s) {
    const t = norm(s);
    return t ? t.split(" ").filter(Boolean) : [];
}

function tokenSet(s) {
    return new Set(toks(s));
}

function allNames(r) {
    // title/name + aliases (normalized)
    return [r.title, r.name, ...(r.aliases || [])]
        .filter(Boolean)
        .map(norm)
        .filter(Boolean);
}

function shortestNameLen(r) {
    const names = allNames(r);
    if (!names.length) return 9999;
    return Math.min(...names.map((n) => n.length));
}

/* ---------------- INTENT ---------------- */

export function isLocationIntent(text) {
    const t = norm(text);
    return /\b(wo|where|spot|location|coords|koordinaten|farm|finden|find|spawn|punkte|position)\b/.test(t);
}

/* ---------------- SCORING ---------------- */

// Multi-word logic:
// - exact match: huge
// - "all query tokens in candidate": strong
// - overlap: medium
// - substring: weak
function scoreMatch(query, candidate) {
    if (!query || !candidate) return -999;

    if (query === candidate) return 10000;

    const qT = toks(query);
    const cS = tokenSet(candidate);

    // all query tokens in candidate
    let allIn = true;
    for (const w of qT) {
        if (!cS.has(w)) { allIn = false; break; }
    }
    if (allIn) return 3000 + qT.length * 50;

    // substring
    if (candidate.includes(query)) return 900;
    if (query.includes(candidate)) return 850;

    // overlap
    let hit = 0;
    for (const w of qT) if (cS.has(w)) hit++;
    if (hit) return 200 + hit * 120;

    return -999;
}

/* ---------------- ALIAS RESOLUTION ---------------- */

// IMPORTANT CHANGE:
// - We will NOT use aliasToKey for single-word queries if there exists an exact-title resource for that word.
// - For single-word queries, we only use aliasToKey if the alias itself is exactly that word AND points to a resource whose title/name is exactly that word (rare).
function resolveAliasStrict(qNorm) {
    if (!DB?.aliasToKey) return null;
    return DB.aliasToKey[qNorm] || null;
}

/* ---------------- FIND ---------------- */

export function findResourceSmart(userText) {
    load();
    const q = norm(userText);
    if (!q) return null;

    const qTokens = toks(q);

    // Build a quick exact lookup over title/name (fast + correct)
    // (optional micro-optimization; safe)
    // exactTitleKeyMap: "crystal" -> resource
    // exactNameKeyMap: "metal" -> resource
    // We build on demand once.
    if (!DB._exactMapBuilt) {
        DB._exactTitle = Object.create(null);
        DB._exactName = Object.create(null);

        for (const r of DB.resources || []) {
            if (r.title) DB._exactTitle[norm(r.title)] = r;
            if (r.name) DB._exactName[norm(r.name)] = r;
        }
        DB._exactMapBuilt = true;
    }

    // --- 1) SINGLE WORD: EXACT title/name wins ALWAYS (prevents crystal -> crystal talon)
    if (qTokens.length === 1) {
        const w = qTokens[0];

        // 1a) exact title or name
        if (DB._exactTitle[w]) return DB._exactTitle[w];
        if (DB._exactName[w]) return DB._exactName[w];

        // 1b) if the user typed a word that is itself an alias (like "talon"),
        // we only match it if it uniquely identifies a SINGLE resource by token presence.
        // This supports: "talon" -> "Crystal Talon ..." (if only one talon entry exists).
        const cands = [];
        for (const r of DB.resources || []) {
            const names = allNames(r);
            if (!names.length) continue;

            // token presence in ANY name (title/alias)
            for (const n of names) {
                if (tokenSet(n).has(w)) { cands.push(r); break; }
            }
        }

        // If zero or too many: ambiguous -> null
        if (cands.length === 0) return null;

        // Prefer resources where one of the names equals the single word exactly
        const exactAlias = cands.find(r => allNames(r).some(n => n === w));
        if (exactAlias) return exactAlias;

        // If only one candidate -> accept (talon)
        if (cands.length === 1) return cands[0];

        // If multiple candidates -> do NOT guess (prevents bad matches)
        return null;
    }

    // --- 2) MULTI WORD: allow aliasToKey (useful for "silica pearls" etc.)
    {
        const key = resolveAliasStrict(q);
        if (key) {
            const direct = (DB.resources || []).find((r) => r.key === key);
            if (direct) return direct;
        }
    }

    // --- 3) MULTI WORD: fuzzy score over names
    let best = null;
    let bestScore = -999;
    let bestLen = 9999;

    for (const r of DB.resources || []) {
        const names = allNames(r);
        if (!names.length) continue;

        let rScore = -999;
        for (const n of names) {
            const s = scoreMatch(q, n);
            if (s > rScore) rScore = s;
        }
        if (rScore < 0) continue;

        const len = shortestNameLen(r);
        if (rScore > bestScore || (rScore === bestScore && len < bestLen)) {
            best = r;
            bestScore = rScore;
            bestLen = len;
        }
    }

    // Threshold: require at least substring/all-tokens match quality
    if (!best || bestScore < 900) return null;
    return best;
}

/* ---------------- OUTPUT ---------------- */

export function formatResourceAnswer(res) {
    load();

    const loc =
        (res?.key && LOC?.[res.key]) ||
        (res?.title && LOC?.[res.title]) ||
        null;

    let out = `**${res.title}**\n`;

    if (loc?.locations?.length) {
        out += `📍 **Spots:**\n`;
        for (const s of loc.locations.slice(0, 10)) {
            out += `- Lat ${s.lat} Lon ${s.lon}${s.note ? ` (${s.note})` : ""}\n`;
        }
    } else {
        out += `📍 Keine lokalen Spots gespeichert.\n`;
    }

    if (res.blurb) out += `\n🔎 **Wiki (Kurz):** ${res.blurb}\n`;
    if (res.url) out += `\nQuelle: ${res.url}`;

    return out.trim();
}
