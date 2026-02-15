import "dotenv/config";
import fetch from "node-fetch";
import { searchWiki } from "./wiki.js";

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
    .setDescription("Stelle eine ARK-Frage (lokaler AI Bot).")
    .addStringOption((o) =>
        o.setName("frage")
            .setDescription("Deine ARK Frage")
            .setRequired(true)
    );

/* ---------------- OLLAMA ---------------- */

async function askOllama(userPrompt) {

    const model = process.env.OLLAMA_MODEL || "mistral:7b-instruct";

    const searchQuery = `${userPrompt} taming tame knockout torpor kibble breeding imprinting`;

    const hits = searchWiki(searchQuery, 10);

    const context = hits.map((h, i) => {
        const chunkText = (h.chunks || []).map((c, j) => `- (chunk ${j + 1}) ${c}`).join("\n");
        return `[${i + 1}] ${h.title}\nURL: ${h.url}\n${chunkText}`;
    }).join("\n\n");

    const sourceLine = hits.map((h, i) => `[${i + 1}] ${h.url}`).join(" ");


    const prompt = `
SYSTEM:
Du bist ein ARK-Wiki-Reader. Du darfst nur Fakten aus KONTEXT verwenden.
REGELN (hart):
- Wenn ein Fakt/Item/Name nicht wörtlich im KONTEXT steht: NICHT nennen.
- Keine Verallgemeinerungen, kein “ARK typischerweise…”.
- Wenn Kontext nicht reicht, antworte exakt: "Nicht genug Infos in Quellen."
- Antworte dann mit 1 Satz: "Es fehlen: ..." (max 12 Wörter).
- Keine anderen Ausgaben.

USER FRAGE:
${userPrompt}

KONTEXT:
${context || "(keine Treffer)"}

ASSISTANT:
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
                top_p: 0.9,
                top_k: 20,
                num_predict: 180,
                num_ctx: 2048,
                repeat_penalty: 1.15
            }
        }),
    });

    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();

    let answer = (data.response || "").trim();

    // Quellen automatisch anhängen
    if (hits.length && !answer.includes("Quellen:")) {
        answer += `\n\nQuellen: ${sourceLine}`;
    }

    return answer;
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

/* ---------------- DISCORD BOT ---------------- */

async function main() {

    const { DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID } = process.env;

    if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !GUILD_ID) {
        throw new Error(
            "Fehlende .env Werte: DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID"
        );
    }

    await deployCommands();

    const client = new Client({
        intents: [GatewayIntentBits.Guilds],
    });

    client.once("ready", () => {
        console.log(`🤖 Logged in as ${client.user.tag}`);
    });

    client.on("interactionCreate", async (interaction) => {

        if (!interaction.isChatInputCommand()) return;
        if (interaction.commandName !== "ask") return;

        const frage = interaction.options.getString("frage", true);

        await interaction.deferReply();

        try {
            const answer = await askOllama(frage);

            await interaction.editReply(
                answer.slice(0, 1900) || "Keine Antwort erhalten."
            );

        } catch (e) {
            await interaction.editReply(`❌ Fehler: ${e.message}`);
        }
    });

    await client.login(DISCORD_TOKEN);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
