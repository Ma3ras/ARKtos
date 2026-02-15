import path from "node:path";
import Database from "better-sqlite3";

const DB_FILE = path.join(process.cwd(), "data", "ark.db");
const q = process.argv.slice(2).join(" ").trim();

if (!q) {
    console.log('Usage: node tools/search_db.js "rex breeding imprint"');
    process.exit(0);
}

const db = new Database(DB_FILE, { readonly: true });

const rows = db
    .prepare(
        `SELECT title, url, snippet(pages_fts, 1, '[', ']', '…', 20) AS snip
     FROM pages_fts
     WHERE pages_fts MATCH ?
     ORDER BY bm25(pages_fts)
     LIMIT 5`
    )
    .all(q);

for (const r of rows) {
    console.log("\n==", r.title);
    console.log(r.url);
    console.log(r.snip);
}

db.close();
