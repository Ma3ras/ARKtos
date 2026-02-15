import fetch from "node-fetch";

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
- "creature_flags": was für ein tame? zähmbar? reitbar? züchtbar?
- "creature_taming": wie zähme ich? welches kibble? welche nahrung?
- "creature_breeding": züchten? eier? incubation?
- "creature_spawn": wo spawnt? welches biome?
- "creature_followup": Pronomen (sie/er/ihn) OHNE Creature-Name

RESOURCE ROUTES:
- "resource_location": wo gibt es? koordinaten? spots?
- "resource_info": was ist? wozu? wie bekomme ich?

CRAFTING ROUTES:
- "crafting_recipe": wie crafte ich? rezept? was brauche ich?
- "crafting_info": welches level? engram punkte?

ANDERE:
- "general": alles andere

BEISPIELE:

User: "was ist ein Rex für ein tame"
→ Entity: "Rex" (Creature)
→ Frage: "was für ein tame"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "rex"}, "confidence": 1.0}

User: "welches Kibble benötigt ein Giga"
→ Entity: "Giga" (Creature)
→ Frage: "welches Kibble"
JSON: {"route": "creature_taming", "lang": "de", "entity": {"type": "creature", "name": "giga"}, "confidence": 1.0}

User: "wie tame ich einen Baryonyx"
→ Entity: "Baryonyx" (Creature)
→ Frage: "wie tame ich"
JSON: {"route": "creature_taming", "lang": "de", "entity": {"type": "creature", "name": "baryonyx"}, "confidence": 1.0}

User: "wo gibt es Metall"
→ Entity: "Metall" (Resource)
→ Frage: "wo gibt es"
JSON: {"route": "resource_location", "lang": "de", "entity": {"type": "resource", "name": "metall"}, "confidence": 1.0}

User: "wie crafte ich ein stone hatchet"
→ Entity: "stone hatchet" (Item)
→ Frage: "wie crafte ich"
JSON: {"route": "crafting_recipe", "lang": "de", "entity": {"type": "item", "name": "stone hatchet"}, "confidence": 1.0}

User: "was brauche ich für ein metal pickaxe"
→ Entity: "metal pickaxe" (Item)
→ Frage: "was brauche ich"
JSON: {"route": "crafting_recipe", "lang": "de", "entity": {"type": "item", "name": "metal pickaxe"}, "confidence": 1.0}

User: "was für kibble bevorzugen sie"
→ Pronomen: "sie", kein Entity
→ Follow-up Frage
JSON: {"route": "creature_followup", "lang": "de", "query_type": "kibble", "confidence": 1.0}

WICHTIG:
- IMMER entity.name extrahieren wenn ein Creature/Resource erwähnt wird
- entity.name IMMER lowercase
- Giga = Creature (Kurzform von Giganotosaurus)
- Bei Follow-ups: query_type = kibble|equipment|torpor|food|taming

USER:
${userText}
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
    const routeVal = obj?.route || obj?.response || obj?.action || "general";

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

    return out;
}
