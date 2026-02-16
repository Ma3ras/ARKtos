import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'creatures_db.json'), 'utf8'));

const theri1 = data.creatures.find(c => c.title === 'Therizinosaurus');
const theri2 = data.creatures.find(c => c.title === 'Therizinosaur');
const rex1 = data.creatures.find(c => c.title === 'Rex');
const rex2 = data.creatures.find(c => c.title === 'Tyrannosaurus');

console.log("--- Verification ---");
if (theri1) console.log("✅ Found Therizinosaurus!");
else console.log("❌ Therizinosaurus NOT found.");

if (theri2) console.log(`✅ Found Therizinosaur!`);
else console.log("❌ Therizinosaur NOT found.");

if (rex1) console.log(`✅ Found Rex!`);
else console.log("❌ Rex NOT found.");

if (rex2) console.log(`✅ Found Tyrannosaurus!`);
else console.log("❌ Tyrannosaurus NOT found.");

console.log("\nSome R creatures:");
console.log(data.creatures.filter(c => c.title && c.title.startsWith('R')).map(c => c.title).slice(0, 10));

console.log("\nSome T creatures:");
console.log(data.creatures.filter(c => c.title && c.title.startsWith('T')).map(c => c.title).slice(0, 10));
