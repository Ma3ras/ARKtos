// creatures.js
// Supports DB formats:
// 1) Array: [{ key, title, url, tameable, breedable, rideable }, ...]
// 2) Wrapped: { creatures: [...] } or { items: [...] } or { data: [...] } or { results: [...] }

import fs from "node:fs";
import { CREATURE_ALIASES } from "./creature_aliases.js";
import path from "node:path";

const DB_FILE = path.join(process.cwd(), "data", "creatures_db.json");

let DB = null;

function load() {
    if (DB) return;

    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));

    // Accept array or common wrapper formats
    const arr =
        Array.isArray(raw) ? raw :
            Array.isArray(raw.creatures) ? raw.creatures :
                Array.isArray(raw.items) ? raw.items :
                    Array.isArray(raw.data) ? raw.data :
                        Array.isArray(raw.results) ? raw.results :
                            null;

    if (!arr) {
        throw new Error(
            "creatures_db.json muss ein Array sein ODER Wrapper mit .creatures/.items/.data/.results (Array)."
        );
    }

    DB = arr;
}

/* ---------------- NORMALIZE ---------------- */

function norm(s) {
    return (s ?? "")
        .toString()
        .toLowerCase()
        .replace(/[_\-]/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toks(s) {
    const t = norm(s);
    return t ? t.split(" ").filter(Boolean) : [];
}

/* ---------------- INTENT ---------------- */

export function isCreatureIntent(text) {
    const t = norm(text);
    return /\b(dino|dinosaur|creature|kreatur|tier|tame|zähmen|zähmbar|tamebar|breed|züchten|breedbar|ride|reiten|reitbar|sattel|saddle)\b/.test(
        t
    );
}

export function creatureQuestionKind(text) {
    const t = norm(text);
    return {
        askTame: /\b(tame|zähm|zähmen|zähmbar|tamebar)\b/.test(t),
        askBreed: /\b(breed|zücht|züchten|breedbar)\b/.test(t),
        askRide: /\b(ride|reit|reiten|reitbar|sattel|saddle)\b/.test(t),
        askLink: /\b(link|quelle|wiki)\b/.test(t),
    };
}

/* ---------------- RESOLVE ---------------- */

function scoreCandidate(query, cand) {
    if (!query || !cand) return -999;
    if (query === cand) return 10000;

    const qTokens = toks(query);
    const cTokens = new Set(toks(cand));

    // single-token exact in candidate tokens
    if (qTokens.length === 1 && cTokens.has(qTokens[0])) return 3000;

    // all query tokens exist in candidate
    let allIn = true;
    for (const w of qTokens) if (!cTokens.has(w)) allIn = false;
    if (allIn) return 2000;

    // substring
    if (cand.includes(query) || query.includes(cand)) return 800;

    // overlap
    let hit = 0;
    for (const w of qTokens) if (cTokens.has(w)) hit++;
    if (hit) return 200 + hit * 50;

    return -999;
}

export function findCreatureSmart(userText) {
    load();
    const q = norm(userText);
    if (!q) return null;

    // Resolve aliases first
    const resolvedQuery = CREATURE_ALIASES[q] || q;

    const qTokens = toks(resolvedQuery);

    // 1) exact key/title match wins
    for (const c of DB) {
        if (!c) continue;
        if (c.key && norm(c.key) === resolvedQuery) return c;
        if (c.title && norm(c.title) === resolvedQuery) return c;
    }

    // 2) single word: only return if unique token match (avoid false matches)
    if (qTokens.length === 1) {
        const w = qTokens[0];
        const matches = [];
        for (const c of DB) {
            const title = norm(c?.title || "");
            if (!title) continue;
            const set = new Set(toks(title));
            if (set.has(w)) matches.push(c);
        }
        if (matches.length === 1) return matches[0];
        return null; // conservative: don't guess
    }

    // 3) best scored match across title/key (conservative threshold)
    let best = null;
    let bestScore = -999;

    for (const c of DB) {
        if (!c) continue;
        const title = norm(c.title || "");
        const key = norm(c.key || "");
        const s = Math.max(scoreCandidate(q, title), scoreCandidate(q, key));
        if (s > bestScore) {
            bestScore = s;
            best = c;
        }
    }

    if (!best || bestScore < 800) return null;
    return best;
}

/* ---------------- OUTPUT ---------------- */

function yn(v) {
    if (v === true) return "Ja";
    if (v === false) return "Nein";
    return "Unklar";
}

export function formatCreatureAnswer(c, kind = {}) {
    const title = c?.title || "Creature";
    const url = c?.url || "";

    const lines = [`**${title}**`];

    // Add ESSENTIAL taming data only
    if (c?.taming) {
        const t = c.taming;

        if (t.taming_method) {
            lines.push(`- Taming Methode: **${t.taming_method}**`);
        }

        if (t.preferred_food && t.preferred_food.length > 0) {
            lines.push(`- Bevorzugte Nahrung: **${t.preferred_food.join(", ")}**`);
        }
    }

    if (url) lines.push(`Quelle: ${url}`);

    return lines.join("\n");
}
