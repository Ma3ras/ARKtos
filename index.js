import "dotenv/config";
import fetch from "node-fetch";

import { routeQuery } from "./router.js";

import {
    findResourceSmart,
    formatResourceAnswer,
} from "./resources.js";

import {
    findCreatureSmart,
    formatCreatureAnswer,
} from "./creatures.js";
import { formatCreatureFollowup } from "./creatures_followup.js";

import {
    findCraftableSmart,
    formatCraftableRecipe,
} from "./craftables.js";

import {
    findSpawnLocations,
    formatSpawnLocations,
} from "./spawn_locations.js";

import { fetchFandomContext } from "./tools/fandom_fetch.js";

import { setUserContext, getUserContext } from "./context.js";

import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
} from "discord.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

/* ---------------- COMMAND ---------------- */

const ASK_COMMAND = new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Stelle eine ARK-Frage.")
    .addStringOption(o =>
        o.setName("frage").setDescription("Deine ARK Frage").setRequired(true)
    );

/* ---------------- SMALL HELPERS ---------------- */

function norm(s) {
    return (s ?? "")
        .toString()
        .toLowerCase()
        .replace(/[_\-]/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatResourceInfoOnly(res) {
    const title = res?.title || "Ressource";
    const blurb = (res?.blurb || "").trim();
    const url = res?.url || "";
    let out = `**${title}**\n`;
    if (blurb) out += `\n${blurb}\n`;
    if (url) out += `\nQuelle: ${url}`;
    return out.trim();
}

/* ---------------- LLM ANSWER (STRICT CONTEXT) ---------------- */

async function askOllamaWithContext(userPrompt, contextText) {
    const model = process.env.OLLAMA_MODEL || "mistral:7b-instruct";

    const prompt = `
Du bist ein ARK-Wiki-Reader.
Deine Aufgabe ist es, die Frage NUR basierend auf dem unten stehenden KONTEXT zu beantworten.

WICHTIG:
- Du darfst NICHT halluzinieren oder Wissen von außerhalb des Kontexts nutzen.
- Wenn die Antwort nicht im Kontext steht, sage: "Diese Information fehlt im Wiki-Auszug."

FORMAT:
- Sprache: Deutsch
- Format: Nur 3-5 stichpunktartige Sätze (Bulletpoints).
- Style: Sachlich, kurz, direkt. Keine Einleitung ("Hier ist die Info..."), kein Outro.

KONTEXT:
${contextText}

FRAGE:
${userPrompt}

ANTWORT:
`.trim();

    const r = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            stream: false,
            prompt,
            options: {
                temperature: 0,
                num_predict: 220,
                num_ctx: 2048,
                repeat_penalty: 1.12,
            },
        }),
    });

    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return (data.response || "").trim();
}

/* ---------------- LLM FALLBACK (GENERAL) ---------------- */

async function askOllamaGeneral(userPrompt) {
    const model = process.env.OLLAMA_MODEL || "mistral:7b-instruct";
    const prompt = `
Du bist ein erfahrener ARK: Survival Ascended Spieler.
Antworte auf die Frage präzise und hilfreich auf Deutsch.
Nutze dein Allgemeinwissen über ARK.
Erfinde keine Mechaniken, die es nicht gibt.

REGELN:
- Maximal 4-5 Sätze als Bulletpoints.
- Wenn du es nicht sicher weißt, sage "Das weiß ich leider nicht genau."
- Keine Einleitung, kein "Hallo".

FRAGE: ${userPrompt}

ANTWORT:
`.trim();

    const r = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model,
            stream: false,
            prompt,
            options: {
                temperature: 0.15,
                num_predict: 140,
                num_ctx: 1024,
                repeat_penalty: 1.1,
            },
        }),
    });

    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return (data.response || "").trim();
}

/* ---------------- DEPLOY COMMAND ---------------- */

async function deployCommands() {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(
            process.env.DISCORD_CLIENT_ID,
            process.env.GUILD_ID
        ),
        { body: [ASK_COMMAND.toJSON()] }
    );

    console.log("✅ Slash command /ask deployed.");
}

/* ---------------- MAIN ---------------- */

async function main() {
    const { DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID } = process.env;
    if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !GUILD_ID) {
        throw new Error("Fehlende .env Werte.");
    }

    await deployCommands();

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once("clientReady", () => {
        console.log(`🤖 Logged in as ${client.user.tag}`);
    });

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== "ask") return;

        const frage = interaction.options.getString("frage", true);
        await interaction.deferReply();

        try {
            // 1) LLM ROUTER
            console.log("📥 User question:", frage);
            const route = await routeQuery(frage);
            console.log("🎯 Router result:", JSON.stringify(route, null, 2));

            // 2) ROUTED EXECUTION

            // ---------- RESOURCES ----------
            if (route.route === "resource_location" || route.route === "resource_info") {
                const name = route.entity?.type === "resource" ? route.entity.name : "";
                const query = name ? name : frage;

                const res = findResourceSmart(query);
                if (!res) {
                    // Resource not found - fall through to general handler
                    console.log(`  Resource "${query}" not found, falling through to general...`);
                } else {
                    const out =
                        route.route === "resource_location"
                            ? formatResourceAnswer(res)
                            : formatResourceInfoOnly(res);

                    await interaction.editReply(out.slice(0, 1900));
                    return;
                }
            }

            // ---------- CREATURE FLAGS ----------
            if (route.route === "creature_flags") {
                console.log("🔍 CREATURE FLAGS ROUTE");
                console.log("  route.entity:", route.entity);

                const name = route.entity?.type === "creature" ? route.entity.name : "";
                const query = name ? name : frage;

                console.log("  extracted name:", name);
                console.log("  query for lookup:", query);

                const c = findCreatureSmart(query);
                console.log("  lookup result:", c ? `Found: ${c.title}` : "NOT FOUND");

                if (!c) {
                    await interaction.editReply(`Unklar.\n\nTipp: schreibe den Dino-Namen genauer.`);
                    return;
                }

                // Store context for follow-up questions
                setUserContext(interaction.user.id, c.key);

                // Check if taming data exists
                const hasTamingData = c.taming && (c.taming.taming_method || c.taming.preferred_food);

                if (!hasTamingData && c.url) {
                    // Fallback: Fetch from wiki if no taming data in DB
                    console.log("  No taming data in DB, fetching from wiki...");
                    try {
                        const wikiData = await fetchFandomContext(c.url);
                        if (wikiData?.infobox) {
                            // Extract taming info from wiki
                            const lines = [`**${c.title}**`];

                            if (wikiData.infobox.taming_method) {
                                lines.push(`- Taming Methode: **${wikiData.infobox.taming_method}**`);
                            }

                            if (wikiData.infobox.preferred_food && wikiData.infobox.preferred_food.length > 0) {
                                lines.push(`- Bevorzugte Nahrung: **${wikiData.infobox.preferred_food.join(", ")}**`);
                            }

                            if (wikiData.infobox.preferred_kibble && wikiData.infobox.preferred_kibble.length > 0) {
                                lines.push(`- Bevorzugtes Kibble: **${wikiData.infobox.preferred_kibble.join(", ")}**`);
                            }

                            lines.push(`Quelle: ${c.url}`);

                            await interaction.editReply(lines.join("\n").slice(0, 1900));
                            return;
                        }
                    } catch (err) {
                        console.error("  Wiki fetch failed:", err.message);
                    }
                }

                // zeigt standardmäßig alle 3 (zähmbar/züchtbar/reitbar)
                const out = formatCreatureAnswer(c, { askTame: true, askBreed: true, askRide: true });
                console.log("  formatted answer:", out);
                await interaction.editReply(out.slice(0, 1900));
                return;
            }

            // ---------- CREATURE FOLLOW-UP ----------
            if (route.route === "creature_followup") {
                console.log("🔄 CREATURE FOLLOW-UP ROUTE");
                console.log("  query_type:", route.query_type);

                // Get last mentioned creature from context
                const lastCreatureKey = getUserContext(interaction.user.id);

                if (!lastCreatureKey) {
                    await interaction.editReply("Ich weiß nicht, über welches Creature du sprichst. 🤔\n\nTipp: Frage zuerst nach einem Creature, z.B. 'was für ein tame ist ein baryonyx'");
                    return;
                }

                console.log("  context creature:", lastCreatureKey);

                // Find the creature
                const c = findCreatureSmart(lastCreatureKey);

                if (!c) {
                    await interaction.editReply("Ich kann das Creature nicht mehr finden. 😕");
                    return;
                }

                // Format answer based on query type
                const queryType = route.query_type || "other";
                const out = formatCreatureFollowup(c, queryType);

                console.log("  formatted followup answer:", out);
                await interaction.editReply(out.slice(0, 1900));
                return;
            }

            // ---------- CREATURE TAMING (DB FIRST) ----------
            if (route.route === "creature_taming") {
                console.log("🍖 CREATURE TAMING ROUTE");
                console.log("  route.entity:", route.entity);
                console.log("  query_type:", route.query_type);

                const name = route.entity?.type === "creature" ? route.entity.name : "";
                const query = name ? name : frage;

                console.log("  extracted name:", name);
                console.log("  query for lookup:", query);

                const c = findCreatureSmart(query);
                console.log("  lookup result:", c ? `Found: ${c.title}` : "NOT FOUND");

                if (!c) {
                    await interaction.editReply(`Unklar.\n\nTipp: schreibe den Dino-Namen genauer.`);
                    return;
                }

                // Store context for follow-up questions
                setUserContext(interaction.user.id, c.key);

                // Check if we have taming data in DB
                const hasTamingData = c.taming && (c.taming.taming_method || c.taming.preferred_food || c.taming.preferred_kibble);

                if (hasTamingData) {
                    // Answer from DB - show only requested info based on query_type
                    const queryType = route.query_type || "taming";
                    const lines = [`**${c.title}**`];
                    const t = c.taming;

                    // Show specific info based on query type
                    if (queryType === "kibble") {
                        if (t.preferred_kibble && t.preferred_kibble.length > 0) {
                            lines.push(`- Bevorzugtes Kibble: **${t.preferred_kibble.join(", ")}**`);
                        } else {
                            lines.push("Keine Kibble-Information verfügbar.");
                        }
                    } else if (queryType === "food") {
                        if (t.preferred_food && t.preferred_food.length > 0) {
                            lines.push(`- Bevorzugte Nahrung: **${t.preferred_food.join(", ")}**`);
                        }
                        if (t.other_foods && t.other_foods.length > 0) {
                            lines.push(`- Alternative Nahrung: **${t.other_foods.join(", ")}**`);
                        }
                        if (!t.preferred_food && !t.other_foods) {
                            lines.push("Keine Nahrungs-Information verfügbar.");
                        }
                    } else {
                        // Default: show all taming info
                        if (t.taming_method) {
                            lines.push(`- Taming Methode: **${t.taming_method}**`);
                        }
                        if (t.preferred_kibble && t.preferred_kibble.length > 0) {
                            lines.push(`- Bevorzugtes Kibble: **${t.preferred_kibble.join(", ")}**`);
                        }
                        if (t.preferred_food && t.preferred_food.length > 0) {
                            lines.push(`- Bevorzugte Nahrung: **${t.preferred_food.join(", ")}**`);
                        }
                    }

                    if (c.url) lines.push(`Quelle: ${c.url}`);

                    console.log("  answered from DB");
                    await interaction.editReply(lines.join("\n").slice(0, 1900));
                    return;
                }

                // No taming data in DB - fall through to Fandom fetch below
                console.log("  No taming data in DB, will fetch from wiki...");
            }

            // ---------- CREATURE SPAWN LOCATIONS ----------
            if (route.route === "creature_spawn") {
                console.log("📍 CREATURE SPAWN ROUTE");
                console.log("  route.entity:", route.entity);

                const name = route.entity?.type === "creature" ? route.entity.name : "";
                const query = name ? name : frage;

                console.log("  extracted name:", name);
                console.log("  query for spawn lookup:", query);

                const spawnData = findSpawnLocations(query);
                console.log("  spawn lookup result:", spawnData ? `Found: ${spawnData.creature}` : "NOT FOUND");

                if (!spawnData) {
                    await interaction.editReply(`Keine Spawn-Locations für "${query}" gefunden.\n\nTipp: Versuche einen anderen Namen.`);
                    return;
                }

                const out = formatSpawnLocations(spawnData);
                console.log("  formatted spawn answer");
                await interaction.editReply(out.slice(0, 1900));
                return;
            }

            // ---------- CREATURE -> FANDOM FETCH ----------
            if (
                route.route === "creature_taming" ||
                route.route === "creature_breeding"
            ) {
                const name = route.entity?.type === "creature" ? route.entity.name : "";
                const query = name ? name : frage;

                const c = findCreatureSmart(query);
                if (!c?.url) {
                    await interaction.editReply(`Unklar.\n\nTipp: schreibe den Dino-Namen genauer.`);
                    return;
                }

                const intent =
                    route.route === "creature_taming"
                        ? "taming"
                        : "breeding";

                const ctx = await fetchFandomContext(c.url, { intent });

                const answer = await askOllamaWithContext(frage, ctx);

                // immer Quelle drunter (Fandom URL)
                const out = `${answer}\n\nQuelle: ${c.url}`;
                await interaction.editReply(out.slice(0, 1900));
                return;
            }

            // ---------- CRAFTING RECIPE ----------
            if (route.route === "crafting_recipe" || route.route === "crafting_info") {
                console.log("🔨 CRAFTING ROUTE");
                console.log("  route.entity:", route.entity);

                const name = route.entity?.type === "item" ? route.entity.name : "";
                const query = name ? name : frage;

                console.log("  extracted name:", name);
                console.log("  query for lookup:", query);

                const item = findCraftableSmart(query);
                console.log("  lookup result:", item ? `Found: ${item.title}` : "NOT FOUND");

                if (!item) {
                    await interaction.editReply(`Item nicht gefunden.\n\nTipp: schreibe den Item-Namen genauer.`);
                    return;
                }

                const out = formatCraftableRecipe(item);
                console.log("  formatted answer");
                await interaction.editReply(out.slice(0, 1900));
                return;
            }

            // ---------- GENERAL ----------
            const general = await askOllamaGeneral(frage);
            await interaction.editReply((general || "Unklar.").slice(0, 1900));
        } catch (e) {
            const msg = e.message.toLowerCase();
            let userMsg = "❌ Ein unerwarteter Fehler ist aufgetreten.";

            if (msg.includes("fetch")) userMsg = "❌ Wiki-Zugriff fehlgeschlagen (Netzwerkfehler).";
            else if (msg.includes("timeout")) userMsg = "❌ Zugriff dauerte zu lange (Timeout).";
            else if (msg.includes("json")) userMsg = "❌ Interner Verarbeitungsfehler (JSON).";

            console.error(e);
            await interaction.editReply(userMsg + `\n(Tech-Info: ${e.message.slice(0, 50)})`);
        }
    });

    await client.login(DISCORD_TOKEN);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
