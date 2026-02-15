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
  "route": "resource_location",
  "lang": "de",
  "entity": { "type": "resource", "name": "..." },
  "query_type": "...",
  "confidence": 1.0
}

WICHTIG:
- Nutze den Key "route", NICHT "response" oder "action".
- "route" muss einer dieser Werte sein:
  ["resource_location", "resource_info", "creature_flags", "creature_taming", "creature_breeding", "creature_spawn", "creature_followup", "general"]

CREATURE vs RESOURCE:
- CREATURES (Dinosaurier/Tiere): Rex, Raptor, Baryonyx, Trike, Spino, Argentavis, etc.
  → entity.type = "creature"
- RESOURCES (Materialien): Metall, Holz, Stein, Fiber, Crystal, etc.
  → entity.type = "resource"

FOLLOW-UP QUESTIONS:
Wenn die Frage Pronomen enthält (sie, er, ihn, ihm, der, die, das) und KEIN Creature-Name erwähnt wird:
→ route = "creature_followup"
→ query_type = "kibble" | "equipment" | "torpor" | "food" | "taming" | "other"

BEISPIELE:
User: "Wo gibt es Metall?"
JSON: {"route": "resource_location", "lang": "de", "entity": {"type": "resource", "name": "metall"}, "confidence": 1.0}

User: "Wie zähme ich einen Rex?"
JSON: {"route": "creature_taming", "lang": "de", "entity": {"type": "creature", "name": "rex"}, "confidence": 1.0}

User: "Ist der Raptor reitbar?"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "raptor"}, "confidence": 1.0}

User: "Was für ein Tame ist ein Baryonyx?"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "baryonyx"}, "confidence": 1.0}

User: "was ist baryonyx für ein tame"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "baryonyx"}, "confidence": 1.0}

User: "was ist ein baryonyx für ein tame"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "baryonyx"}, "confidence": 1.0}

User: "Kann man einen Spino züchten?"
JSON: {"route": "creature_flags", "lang": "de", "entity": {"type": "creature", "name": "spino"}, "confidence": 1.0}

User: "was für kibble bevorzugen sie"
JSON: {"route": "creature_followup", "lang": "de", "query_type": "kibble", "confidence": 1.0}

User: "welches saddle braucht er"
JSON: {"route": "creature_followup", "lang": "de", "query_type": "equipment", "confidence": 1.0}

User: "ist er torpor immun"
JSON: {"route": "creature_followup", "lang": "de", "query_type": "torpor", "confidence": 1.0}

User: "was kann ich noch füttern"
JSON: {"route": "creature_followup", "lang": "de", "query_type": "food", "confidence": 1.0}

User: "wie zähme ich ihn"
JSON: {"route": "creature_followup", "lang": "de", "query_type": "taming", "confidence": 1.0}

User: "Erzähl mir was über die Story"
JSON: {"route": "general", "lang": "de", "entity": {"type": "none", "name": ""}, "confidence": 0.9}

REGELN:
- "resource_location": WO / Koordinaten / Spots (für RESOURCES).
- "resource_info": WAS IST / WOZU / WIE BEKOMME (für RESOURCES).
- "creature_flags": zähmbar? reitbar? züchtbar? was für ein tame? (für CREATURES).
- "creature_taming": zähmen / füttern / kibble / torpor (für CREATURES).
- "creature_breeding": züchten / eier / incubation (für CREATURES).
- "creature_spawn": wo spawnt / biome (für CREATURES).
- "creature_followup": Follow-up Frage mit Pronomen, KEIN Creature-Name.
- "general": alles andere.

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
