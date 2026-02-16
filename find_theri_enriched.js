import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'creatures_db_enriched.json'), 'utf8'));

// Handle wrapper if needed (creatures_db_enriched.json might just be an array or wrapped)
const creatures = Array.isArray(data) ? data : (data.creatures || data.data || []);

const theri = creatures.find(c => c.title === 'Therizinosaurus');

if (theri) {
    console.log("Found Therizinosaurus in enriched DB!");
    console.log(JSON.stringify(theri, null, 2));
} else {
    console.log("Therizinosaurus NOT found in enriched DB.");
    // Print some T names
    const tCreatures = creatures.filter(c => c.title && c.title.startsWith('T')).map(c => c.title);
    if (tCreatures.length > 0) {
        console.log("Some T creatures:", tCreatures.slice(0, 10));
    } else {
        console.log("No creatures starting with T found.");
    }
}
