// Add to creatures.js - specific data formatters for follow-up questions

/**
 * Format creature answer for specific follow-up queries
 * @param {object} c - Creature object
 * @param {string} queryType - Type of query (kibble, equipment, torpor, food, taming, other)
 * @returns {string} - Formatted answer
 */
export function formatCreatureFollowup(c, queryType) {
    const title = c?.title || "Creature";
    const url = c?.url || "";
    const t = c?.taming || {};

    const lines = [];

    switch (queryType) {
        case "kibble":
            lines.push(`**${title} - Bevorzugtes Kibble**`);
            if (t.preferred_kibble && t.preferred_kibble.length > 0) {
                t.preferred_kibble.forEach(k => lines.push(`- ${k}`));
            } else {
                lines.push("Keine Kibble-Information verfügbar.");
            }
            break;

        case "equipment":
            lines.push(`**${title} - Ausrüstung**`);
            if (t.equipment) {
                lines.push(`- ${t.equipment}`);
            } else {
                lines.push("Keine Ausrüstungs-Information verfügbar.");
            }
            break;

        case "torpor":
            lines.push(`**${title} - Torpor Immun**`);
            if (t.torpor_immune !== undefined) {
                lines.push(t.torpor_immune ? "**Ja**" : "**Nein**");
            } else {
                lines.push("Keine Torpor-Information verfügbar.");
            }
            break;

        case "food":
            lines.push(`**${title} - Alternative Nahrung**`);
            if (t.other_foods && t.other_foods.length > 0) {
                t.other_foods.forEach(f => lines.push(`- ${f}`));
            } else if (t.preferred_food && t.preferred_food.length > 0) {
                lines.push("**Bevorzugte Nahrung:**");
                t.preferred_food.forEach(f => lines.push(`- ${f}`));
            } else {
                lines.push("Keine Nahrungs-Information verfügbar.");
            }
            break;

        case "taming":
            lines.push(`**${title} - Taming Info**`);
            if (t.taming_method) {
                lines.push(`- Taming Methode: **${t.taming_method}**`);
            }
            if (t.preferred_food && t.preferred_food.length > 0) {
                lines.push(`- Bevorzugte Nahrung: **${t.preferred_food.join(", ")}**`);
            }
            if (t.preferred_kibble && t.preferred_kibble.length > 0) {
                lines.push(`- Bevorzugtes Kibble: **${t.preferred_kibble.join(", ")}**`);
            }
            break;

        default:
            // Generic follow-up - show all taming data
            lines.push(`**${title}**`);
            if (t.taming_method) {
                lines.push(`- Taming Methode: **${t.taming_method}**`);
            }
            if (t.torpor_immune !== undefined) {
                lines.push(`- Torpor Immun: **${yn(t.torpor_immune)}**`);
            }
            if (t.preferred_kibble && t.preferred_kibble.length > 0) {
                lines.push(`- Bevorzugtes Kibble: **${t.preferred_kibble.join(", ")}**`);
            }
            if (t.preferred_food && t.preferred_food.length > 0) {
                lines.push(`- Bevorzugte Nahrung: **${t.preferred_food.join(", ")}**`);
            }
            if (t.equipment) {
                lines.push(`- Ausrüstung: **${t.equipment}**`);
            }
    }

    if (url) lines.push(`Quelle: ${url}`);

    return lines.join("\n");
}

function yn(v) {
    if (v === true) return "Ja";
    if (v === false) return "Nein";
    return "Unklar";
}
