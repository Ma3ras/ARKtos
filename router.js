import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import { resolveAlias as resolveCreatureAlias } from "./creature_aliases.js";
import { resolveAlias as resolveCraftableAlias } from "./craftable_aliases.js";

const ENTITY_LOOKUP_FILE = path.join(process.cwd(), "data", "entity_lookup.json");
let ENTITY_LOOKUP = null;

function loadEntityLookup() {
    if (ENTITY_LOOKUP) return ENTITY_LOOKUP;
    if (fs.existsSync(ENTITY_LOOKUP_FILE)) {
        const data = JSON.parse(fs.readFileSync(ENTITY_LOOKUP_FILE, "utf-8"));
        ENTITY_LOOKUP = data.entities || {};
    } else {
        ENTITY_LOOKUP = {};
    }
    return ENTITY_LOOKUP;
}

function norm(s) {
    if (!s) return "";
    return String(s)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_\-]/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function detectEntityType(userText) {
    const lookup = loadEntityLookup();
    // Pre-processing for common voice-to-text errors (merging words, phonetic typos)
    let processedText = norm(userText);

    const voiceCorrections = [
        { find: /gigaspons/g, replace: "giga spawns" },
        { find: /gigasponen/g, replace: "giga spawnen" },
        { find: /sporenpunkte/g, replace: "spawn punkte" },
        { find: /spons/g, replace: "spawns" },
        { find: /sporen/g, replace: "spawns" },
        { find: /mainwipe/g, replace: "mindwipe" },
        { find: /main pipe/g, replace: "mindwipe" },
        { find: /mind wipe/g, replace: "mindwipe" }
    ];

    for (const correction of voiceCorrections) {
        processedText = processedText.replace(correction.find, correction.replace);
    }

    const tokens = processedText.split(" ").filter(Boolean);

    // Check each token and multi-token combinations
    for (let i = 0; i < tokens.length; i++) {
        // --- Single token ---
        const token = tokens[i];

        // 1. Check Creature Alias FIRST
        const aliasResolved = resolveCreatureAlias(token);
        if (aliasResolved) {
            // If alias points to a valid creature, return it immediately
            return { name: aliasResolved, type: "creature" };
        }

        // 2. Check Craftable Alias
        const craftAlias = resolveCraftableAlias(token);
        if (craftAlias) {
            return { name: craftAlias, type: "craftable" };
        }

        // 3. Fallback: Lookup Table
        if (lookup[token]) {
            return { name: token, type: lookup[token] };
        }

        // --- Two tokens ---
        if (i < tokens.length - 1) {
            const twoToken = tokens[i] + " " + tokens[i + 1];

            // 1. Alias Check
            const twoAlias = resolveCreatureAlias(twoToken);
            if (twoAlias) return { name: twoAlias, type: "creature" };

            // 2. Lookup Check
            if (lookup[twoToken]) {
                const type = lookup[twoToken];
                // Resolve alias if found in lookup but might be an alias key there too (unlikely if unique)
                const resolved = (type === "creature") ? resolveCreatureAlias(twoToken) : null;
                return { name: resolved || twoToken, type };
            }
        }

        // --- Three tokens ---
        if (i < tokens.length - 2) {
            const threeToken = tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2];

            const threeAlias = resolveCreatureAlias(threeToken);
            if (threeAlias) return { name: threeAlias, type: "creature" };

            if (lookup[threeToken]) {
                return { name: threeToken, type: lookup[threeToken] };
            }
        }
    }

    return null;
}

function safeJsonParse(s) {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

function clampStr(s, max = 80) {
    if (!s) return "";
    s = String(s).trim();
    if (s.length > max) s = s.slice(0, max);
    return s;
}

export async function routeQuery(userText) {
    const model = process.env.OLLAMA_ROUTER_MODEL || process.env.OLLAMA_MODEL || "mistral:7b-instruct";

    // PRE-CHECK: Detect entity type from lookup
    const detected = detectEntityType(userText);
    let entityHint = "";

    if (detected) {
        console.log(`  🔍 Pre-detected: "${detected.name}" → ${detected.type}`);
        entityHint = `\n\nIMPORTANT: "${detected.name}" is a known ${detected.type.toUpperCase()}. Use entity.type = "${detected.type}" and entity.name = "${detected.name}".`;
    }

    // Normalize text for LLM prompt
    let processedText = norm(userText);
    const voiceCorrections = [
        { find: /gigaspons/g, replace: "giga spawns" },
        { find: /gigasponen/g, replace: "giga spawnen" },
        { find: /sporenpunkte/g, replace: "spawn punkte" },
        { find: /spons/g, replace: "spawns" },
        { find: /sporen/g, replace: "spawns" },
        { find: /mainwipe/g, replace: "mindwipe" },
        { find: /main pipe/g, replace: "mindwipe" },
        { find: /mind wipe/g, replace: "mindwipe" },
        { find: /giger/g, replace: "giga" },
        { find: /geiger/g, replace: "giga" },
        { find: /gigaf/g, replace: "giga" }
    ];
    for (const correction of voiceCorrections) {
        processedText = processedText.replace(correction.find, correction.replace);
    }

    // HARTE JSON-SCHEMA: Keine Prosa
    const prompt = `
Du bist ein Router für einen ARK Discord Bot.
Klassifiziere die Frage in GENAU EINE Route.

ANTWORT-FORMAT (JSON):
{
  "route": "creature_flags",
  "lang": "de",
  "entity": { "type": "creature", "name": "rex" },
  "query_type": "kibble",
  "confidence": 1.0
}

SCHRITT 1: ENTITY EXTRACTION
Extrahiere IMMER den Creature/Resource-Namen aus der Frage:
- "was ist ein REX für ein tame" → entity.name = "rex"
- "welches Kibble benötigt ein GIGA" → entity.name = "giga"
- "wie zähme ich einen BARYONYX" → entity.name = "baryonyx"
- "wo gibt es METALL" → entity.name = "metall"

SCHRITT 2: TYPE BESTIMMUNG
Ist es ein Creature oder Resource?
- CREATURES: Rex, Raptor, Baryonyx, Giga, Giganotosaurus, Spino, Trike, Argentavis, etc.
  → entity.type = "creature"
- RESOURCES: Metall, Holz, Stein, Fiber, Crystal, etc.
  → entity.type = "resource"

SCHRITT 3: ROUTE BESTIMMUNG
Wähle die passende Route basierend auf der Frage:

CREATURE ROUTES:
- "creature_flags": "was für ein tame"? "ist X zähmbar"? "kann man X reiten"? "ist X züchtbar"?
  WICHTIG: "was für ein tame" → creature_flags. ABER: "wie täme ich" → creature_taming!
- "creature_taming": wie täme ich? wie zähme ich? welches kibble? welche nahrung? taming effectiveness? was frisst er?
- "creature_breeding": züchten? eier? incubation? baby stats?
- "creature_spawn": wo spawnt? welches biome? koordinaten? spons? sporen? sporenpunkte? (phonetisch ähnlich zu spawn)
- "creature_followup": Pronomen (sie/er/ihn) OHNE Creature-Name UND Kontext vorhanden

RESOURCE ROUTES:
- "resource_location": wo gibt es? koordinaten? spots?
- "resource_info": was ist? wozu? wie bekomme ich?

CRAFTING ROUTES:
- "crafting_recipe": wie crafte ich? rezept? was brauche ich? was brauche ich für?
- "crafting_info": welches level? engram punkte?

ANDERE:
- "general": alles andere

BEISPIELE:

User: "was ist ein Rex für ein tame"
→ Entity: "Rex" (Creature)
→ Frage: "was für ein tame"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "rex"}, "confidence": 1.0}

User: "was für ein tame ist ein thylacoleo"
→ Entity: "thylacoleo" (Creature)
→ Frage: "was für ein tame"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "thylacoleo"}, "confidence": 1.0}

User: "welches Kibble benötigt ein Giga"
→ Entity: "Giga" (Creature)
→ Frage: "welches Kibble"
JSON: {"route": "creature_taming", "lang": "de", "entity": {"type": "creature", "name": "giga"}, "confidence": 1.0}

User: "wie tame ich einen Baryonyx"
→ Entity: "Baryonyx" (Creature)
→ Frage: "wie tame ich"
JSON: {"route": "creature_taming", "lang": "de", "entity": {"type": "creature", "name": "baryonyx"}, "confidence": 1.0}

User: "wie täme ich einen Giga"
→ Entity: "Giga" (Creature)
→ Frage: "wie täme ich"
JSON: {"route": "creature_taming", "lang": "de", "entity": {"type": "creature", "name": "giga"}, "confidence": 1.0}

User: "wo gibt es Metall"
→ Entity: "Metall" (Resource)
→ Frage: "wo gibt es"
JSON: {"route": "resource_location", "lang": "de", "entity": {"type": "resource", "name": "metall"}, "confidence": 1.0}

User: "wo finde ich gigas"
→ Entity: "Gigas" (Creature)
→ Frage: "wo finde ich"
JSON: {"route": "creature_spawn", "lang": "de", "entity": {"type": "creature", "name": "gigas"}, "confidence": 1.0}

User: "wo finde ich gigas"
→ Entity: "Gigas" (Creature)
→ Frage: "wo finde ich"
JSON: {"route": "creature_spawn", "lang": "de", "entity": {"type": "creature", "name": "gigas"}, "confidence": 1.0}

User: "was sind alle giga spons"
→ Entity: "Giga" (Creature)
→ Frage: "spons" (phonetisch für spawns)
JSON: {"route": "creature_spawn", "lang": "de", "entity": {"type": "creature", "name": "giga"}, "confidence": 1.0}

User: "ich möchte alle sporenpunkte"
→ Entity: Keine (Follow-up möglich)
→ Frage: "sporenpunkte" (phonetisch für spawnpunkte)
JSON: {"route": "creature_spawn", "lang": "de", "confidence": 0.9}

User: "wie crafte ich ein stone hatchet"
→ Entity: "stone hatchet" (Item)
→ Frage: "wie crafte ich"
JSON: {"route": "crafting_recipe", "lang": "de", "entity": {"type": "item", "name": "stone hatchet"}, "confidence": 1.0}

User: "was brauche ich für einen fabricator"
→ Entity: "fabricator" (Item)
→ Frage: "was brauche ich für"
JSON: {"route": "crafting_recipe", "lang": "de", "entity": {"type": "craftable", "name": "fabricator"}, "confidence": 1.0}

User: "was brauche ich für ein metal pickaxe"
→ Entity: "metal pickaxe" (Item)
→ Frage: "was brauche ich"
JSON: {"route": "crafting_recipe", "lang": "de", "entity": {"type": "item", "name": "metal pickaxe"}, "confidence": 1.0}

User: "was für kibble bevorzugen sie"
→ Pronomen: "sie", kein Entity
→ Follow-up Frage
JSON: {"route": "creature_followup", "lang": "de", "query_type": "kibble", "confidence": 1.0}

WICHTIG:
- Wenn ein Creature-Name in der Frage vorkommt → entity.name = Creature-Name, entity.type = "creature"
- "was für ein tame" Fragen → IMMER creature_flags Route
- Pronomen ohne Creature-Name → creature_followup (nur wenn Kontext vorhanden)
- entity.name IMMER lowercase
- Giga = Creature (Kurzform von Giganotosaurus)
- Bei Follow-ups: query_type = kibble|equipment|torpor|food|taming

Jetzt analysiere die User-Frage:

USER:
${processedText}
${entityHint}
`.trim();

    const r = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            stream: false,
            prompt,
            format: "json", // Try to force JSON mode if supported
            options: {
                temperature: 0,
                num_predict: 200,
                num_ctx: 1024,
            },
        }),
    });

    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    const raw = (data.response || "").trim();

    // Router muss JSON liefern – wenn nicht, fallback safe:
    let obj = safeJsonParse(raw);

    // Fallback parsing strategies
    if (!obj) {
        // Try extracting JSON from markdown
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) obj = safeJsonParse(match[0]);
    }

    // Normalize keys (LLM sometimes uses 'response' or 'action' instead of 'route')
    let routeVal = obj?.route || obj?.response || obj?.action || "general";

    // Handle nested response object (common with some models)
    if (typeof routeVal === 'object' && routeVal !== null) {
        // If routeVal is an object, it might contain the actual data
        const nested = routeVal;
        obj = { ...obj, ...nested }; // Merge nested into main obj
        routeVal = nested.route || nested.response || nested.action || "general";
    }

    // Fix common route hallucinations
    if (obj?.query_type === "taming" && (routeVal === "creature_flags" || routeVal === "general")) {
        routeVal = "creature_taming";
    }

    // REGEX FALLBACK: Taming (Strong Signal)
    const tamingRegex = /(wie|womit)\s+(tame|täme|taeme|zähme|zähm|fütter|fuetter)|(taming|tamen|zähmen|kibble|nahrung|futter|frisst)/i;
    if (tamingRegex.test(userText) && (detected?.type === "creature" || obj?.entity?.type === "creature")) {
        // Force taming route if keywords are present and we have a creature
        routeVal = "creature_taming";
    }

    if (routeVal === "spawn_location") {
        if (detected?.type === "creature" || obj?.entity?.type === "creature") {
            routeVal = "creature_spawn";
        } else if (detected?.type === "resource" || obj?.entity?.type === "resource") {
            routeVal = "resource_location";
        }
    }

    if (!obj || !routeVal) {
        return {
            route: "general",
            lang: /[äöüß]/i.test(userText) ? "de" : "en",
            entity: { type: "none", name: "" },
            secondary: { type: "none", name: "" },
            confidence: 0.0,
        };
    }

    // hard sanitize
    const out = {
        route: routeVal,
        lang: obj.lang === "en" ? "en" : "de",
        entity: {
            type: obj.entity?.type || "none",
            name: clampStr(obj.entity?.name || ""),
        },
        secondary: {
            type: obj.secondary?.type || "none",
            name: clampStr(obj.secondary?.name || ""),
        },
        query_type: obj.query_type || undefined,
        confidence: Math.max(0, Math.min(1, Number(obj.confidence ?? 0))),
    };

    // FALLBACK: If LLM failed to extract entity but we pre-detected one, use it!
    if (detected && (out.entity.type === "none" || !out.entity.name)) {
        console.log(`  🔄 Fallback to pre-detected entity: "${detected.name}" (${detected.type})`);
        out.entity.type = detected.type;
        out.entity.name = detected.name;
    }

    return out;
}
