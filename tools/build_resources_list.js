import fetch from "node-fetch";
import fs from "fs";

const URL =
    "https://ark.fandom.com/wiki/Category:Resources";

const html = await (await fetch(URL)).text();

// alle /wiki/... links ziehen
const links = [...html.matchAll(/href="(\/wiki\/[^"]+)"/g)]
    .map(m => "https://ark.fandom.com" + m[1])
    .filter(l => !l.includes("Category:"))
    .filter(l => !l.includes("Mod:"));

const unique = [...new Set(links)];

fs.writeFileSync(
    "./data/resource_links.json",
    JSON.stringify(unique, null, 2)
);

console.log("Resources found:", unique.length);
