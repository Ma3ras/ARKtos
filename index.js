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

import { fetchFandomContext } from "./tools/fandom_fetch.js";


import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
} from "discord.js";

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
            const route = await routeQuery(frage);

            // 2) ROUTED EXECUTION

            // ---------- RESOURCES ----------
            if (route.route === "resource_location" || route.route === "resource_info") {
                const name = route.entity?.type === "resource" ? route.entity.name : "";
                const query = name ? name : frage;

                const res = findResourceSmart(query);
                if (!res) {
                    await interaction.editReply(`Unklar.\n\nTipp: nenne die Ressource genauer.`);
                    return;
                }

                const out =
                    route.route === "resource_location"
                        ? formatResourceAnswer(res)
                        : formatResourceInfoOnly(res);

                await interaction.editReply(out.slice(0, 1900));
                return;
            }

            // ---------- CREATURE FLAGS ----------
            if (route.route === "creature_flags") {
                const name = route.entity?.type === "creature" ? route.entity.name : "";
                const query = name ? name : frage;

                const c = findCreatureSmart(query);
                if (!c) {
                    await interaction.editReply(`Unklar.\n\nTipp: schreibe den Dino-Namen genauer.`);
                    return;
                }

                // zeigt standardmäßig alle 3 (zähmbar/züchtbar/reitbar)
                const out = formatCreatureAnswer(c, { askTame: true, askBreed: true, askRide: true });
                await interaction.editReply(out.slice(0, 1900));
                return;
            }

            // ---------- CREATURE -> FAN DOM FETCH ----------
            if (
                route.route === "creature_taming" ||
                route.route === "creature_breeding" ||
                route.route === "creature_spawn"
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
                        : route.route === "creature_breeding"
                            ? "breeding"
                            : "spawn";

                const ctx = await fetchFandomContext(c.url, { intent });

                const answer = await askOllamaWithContext(frage, ctx);

                // immer Quelle drunter (Fandom URL)
                const out = `${answer}\n\nQuelle: ${c.url}`;
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
