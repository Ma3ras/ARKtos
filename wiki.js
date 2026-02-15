import path from "node:path";
import Database from "better-sqlite3";

const DB_FILE = path.join(process.cwd(), "data", "ark.db");
const db = new Database(DB_FILE, { readonly: true });

function cleanQuery(query) {
    return String(query ?? "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s:_-]/gu, " ")
        .trim();
}

function buildFts(query) {
    const words = query.split(/\s+/).filter(w => w.length > 2);
    if (!words.length) return "";
    // OR ist robuster als AND für FTS + wir boosten tame/breeding keyword
    const base = words.map(w => `${w}*`).join(" OR ");
    return `${base} OR taming OR tame OR knockout OR torpor OR kibble OR breeding OR imprinting`;
}

function chunkText(text, size = 900, overlap = 160) {
    const clean = String(text ?? "").replace(/\s+/g, " ").trim();
    if (!clean) return [];

    const chunks = [];
    for (let i = 0; i < clean.length; i += (size - overlap)) {
        const part = clean.slice(i, i + size).trim();
        if (part.length >= 200) chunks.push(part);
        if (i + size >= clean.length) break;
    }
    return chunks;
}

export function searchWiki(query, limit = 8) {
    const q = cleanQuery(query);
    if (!q) return [];

    const fts = buildFts(q);
    if (!fts) return [];

    // rowid ist wichtig: darüber holen wir full text aus pages
    const rows = db.prepare(`
    SELECT
      rowid AS id,
      title,
      url,
      bm25(pages_fts) AS score
    FROM pages_fts
    WHERE pages_fts MATCH ?
      AND url NOT LIKE '%/Patch/%'
      AND url NOT LIKE '%Event%'
      AND url NOT LIKE '%Changelog%'
      AND url NOT LIKE '%Version%'
      AND url NOT LIKE '%Fear%'
      AND url NOT LIKE '%Summer%'
      AND url NOT LIKE '%Love%'
      AND url NOT LIKE '%Eggcellent%'
    ORDER BY score
    LIMIT ?
  `).all(fts, limit);

    // Dedupe nach URL (sonst 8x Rex)
    const seen = new Set();
    const deduped = [];
    for (const r of rows) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        deduped.push(r);
    }

    // Full text laden + chunks bauen (wir geben 2 beste chunks pro Seite zurück)
    const getText = db.prepare(`SELECT text FROM pages WHERE rowid = ?`);

    const results = [];
    for (const r of deduped) {
        const row = getText.get(r.id);
        const text = row?.text || "";
        const chunks = chunkText(text);

        // wenn Seite riesig ist: nimm 2 chunks, die am ehesten “tame” enthalten
        const ranked = chunks
            .map(c => ({
                c,
                hit: /(tame|taming|kibble|knockout|torpor|tranq)/i.test(c) ? 1 : 0
            }))
            .sort((a, b) => b.hit - a.hit)
            .slice(0, 2)
            .map(x => x.c);

        results.push({
            title: r.title,
            url: r.url,
            chunks: ranked.length ? ranked : chunks.slice(0, 1),
        });
    }

    return results;
}
