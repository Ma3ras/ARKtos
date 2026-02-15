import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
const IN_FILE = path.join(DATA_DIR, "ark_wiki_en.jsonl");
const DB_FILE = path.join(DATA_DIR, "ark.db");

function chunkText(text, size = 700, overlap = 120) {
    const chunks = [];
    const clean = (text || "").trim();
    if (!clean) return chunks;

    let i = 0;
    while (i < clean.length) {
        const end = Math.min(i + size, clean.length);
        const part = clean.slice(i, end).trim();
        if (part.length >= 120) chunks.push(part);
        if (end === clean.length) break;
        i += (size - overlap);
    }
    return chunks;
}

function makeUrlFromTitle(title) {
    return `https://ark.wiki.gg/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function main() {
    if (!fs.existsSync(IN_FILE)) {
        throw new Error(`Missing ${IN_FILE} (run ingest first)`);
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });

    const db = new Database(DB_FILE);
    db.pragma("journal_mode = WAL");

    db.exec(`
    DROP TABLE IF EXISTS pages;
    DROP TABLE IF EXISTS pages_fts;

    CREATE TABLE pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      text TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE pages_fts USING fts5(
      title, text, url,
      content='pages',
      content_rowid='id',
      tokenize='porter'
    );
  `);

    const insertPage = db.prepare(
        "INSERT INTO pages (title, url, text) VALUES (?, ?, ?)"
    );
    const insertFts = db.prepare(
        "INSERT INTO pages_fts (rowid, title, text, url) VALUES (?, ?, ?, ?)"
    );

    const tx = db.transaction((rows) => {
        for (const r of rows) {
            const chunks = chunkText(r.text);

            for (let idx = 0; idx < chunks.length; idx++) {
                const chunk = chunks[idx];
                const chunkTitle = chunks.length > 1 ? `${r.title} (chunk ${idx + 1})` : r.title;

                const info = insertPage.run(chunkTitle, r.url, chunk);
                insertFts.run(info.lastInsertRowid, chunkTitle, chunk, r.url);
            }
        }
    });

    const lines = fs.readFileSync(IN_FILE, "utf8").split("\n").filter(Boolean);
    console.log("Indexing lines:", lines.length);

    let countInserted = 0;
    let batch = [];

    for (const line of lines) {
        const obj = JSON.parse(line);

        if (!obj.title || !obj.text) continue;

        const title = obj.title;
        const url = obj.url || makeUrlFromTitle(title);

        batch.push({ title, url, text: obj.text });

        if (batch.length >= 200) {
            tx(batch);

            // grober Fortschritt: wir zählen die Input-Items, nicht die Chunks
            countInserted += batch.length;
            batch = [];

            if (countInserted % 2000 === 0) console.log("Processed input pages:", countInserted);
        }
    }

    if (batch.length) tx(batch);

    const totalChunks = db.prepare("SELECT COUNT(*) AS c FROM pages").get().c;

    console.log("✅ Done. Indexed chunks:", totalChunks);
    console.log("DB:", DB_FILE);
    db.close();
}

main();
