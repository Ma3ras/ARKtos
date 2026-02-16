// Voice Handler
// Orchestrates voice interactions: recording → transcription → processing → synthesis → playback

import { recordUser, recordShortClip } from './audio_processor.js';
import { transcribe } from './stt_service.js';
import { speak } from './tts_service.js';
import { optimizeForTTS } from './tts_corrections.js';
import { routeQuery } from './router.js';
import { getConnection } from './voice_manager.js';
import { containsWakeWord, removeWakeWord, CLIP_DURATION, WAKE_WORD_SILENCE_DURATION } from './wake_word_config.js';

// Import all handlers (same as text bot)
import { findCreatureSmart } from './creatures.js';
import { findResourceSmart } from './resources.js';
import { findCraftableSmart } from './craftables.js';
import { findSpawnLocations } from './spawn_locations.js';
import { findBestMultiResourceLocation, formatMultiResourceLocation } from './multi_resource_locations.js';

const userSpeakingState = new Map(); // userId -> boolean

/**
 * Handle user speaking in voice channel (STAGE 1: Wake Word Detection)
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @param {string} username - Username for logging
 */
export async function handleUserSpeaking(userId, guildId, username) {
    // Prevent multiple simultaneous recordings for same user
    if (userSpeakingState.get(userId)) {
        console.log(`⚠️ User ${username} is already being processed, skipping`);
        return;
    }

    userSpeakingState.set(userId, true);

    try {
        const connection = getConnection(guildId);
        if (!connection) {
            console.log(`❌ No voice connection for guild ${guildId}`);
            return;
        }

        console.log(`👂 ${username} started speaking - listening for wake word...`);

        // STAGE 1: Record short clip for wake word detection
        const clipBuffer = await recordShortClip(userId, connection, CLIP_DURATION, WAKE_WORD_SILENCE_DURATION);

        if (!clipBuffer) {
            console.log(`⚠️ No audio in wake word clip for ${username}`);
            return;
        }

        // Quick transcription to check for wake word
        console.log(`🔍 Checking for wake word...`);
        const clipTranscription = await transcribe(clipBuffer);

        if (!clipTranscription || clipTranscription.trim().length === 0) {
            console.log(`⚠️ Empty wake word transcription for ${username}`);
            return;
        }

        console.log(`📝 Wake word check: "${clipTranscription}"`);

        // Check if wake word is present
        if (!containsWakeWord(clipTranscription)) {
            console.log(`❌ No wake word detected, ignoring speech from ${username}`);
            return;
        }

        console.log(`✅ Wake word detected! Processing query from ${username}`);

        // STAGE 2: Process full query
        // Check if query was in the same clip
        const queryAfterWakeWord = removeWakeWord(clipTranscription).trim();

        let fullQuery = queryAfterWakeWord;

        // If no query after wake word, record additional audio
        if (!fullQuery || fullQuery.length < 3) {
            console.log(`🎤 Recording full query from ${username}...`);

            // Optional: Play acknowledgment beep here
            // await speak(connection, "Ja?");

            const queryBuffer = await recordUser(userId, connection, 10000); // 10s max

            if (!queryBuffer) {
                console.log(`⚠️ No query recorded after wake word`);
                await speak(connection, "Ich habe nichts gehört.");
                return;
            }

            const queryTranscription = await transcribe(queryBuffer);

            if (!queryTranscription || queryTranscription.trim().length === 0) {
                console.log(`⚠️ Empty query transcription`);
                await speak(connection, "Entschuldigung, ich habe nichts verstanden.");
                return;
            }

            fullQuery = queryTranscription;
        }

        console.log(`📝 Full query: "${fullQuery}"`);

        // Remove wake word from query before processing
        const cleanedQuery = removeWakeWord(fullQuery);
        console.log(`🧹 Cleaned query: "${cleanedQuery}"`);

        // Process the question (same as text bot)
        const response = await processQuestion(cleanedQuery);

        console.log(`💬 Response: "${response.substring(0, 100)}..."`);

        // Synthesize and play response
        const optimizedResponse = optimizeForTTS(response);
        await speak(connection, optimizedResponse);

    } catch (error) {
        console.error(`❌ Error handling voice for ${username}:`, error);

        // Try to send error message via voice
        try {
            const connection = getConnection(guildId);
            if (connection) {
                await speak(connection, "Entschuldigung, es gab einen Fehler.");
            }
        } catch (e) {
            console.error(`❌ Failed to send error message:`, e);
        }
    } finally {
        userSpeakingState.delete(userId);
    }
}

/**
 * Process a question using the existing bot logic
 * @param {string} question - User question
 * @returns {Promise<string>} - Response text
 */
async function processQuestion(question) {
    try {
        // Route the question
        const route = await routeQuery(question);

        console.log(`🎯 Route: ${route.route}`);

        // Handle based on route (simplified version of index.js logic)
        switch (route.route) {
            case 'creature_flags':
            case 'creature_taming':
            case 'creature_breeding':
            case 'creature_spawn': {
                const creatureName = route.entity?.name || question;
                const creature = findCreatureSmart(creatureName);

                if (!creature) {
                    return `Ich konnte keine Informationen über ${creatureName} finden.`;
                }

                if (route.route === 'creature_spawn') {
                    // Use creature.title as the name property doesn't exist
                    const spawnData = findSpawnLocations(creature.title);

                    if (spawnData && spawnData.locations && spawnData.locations.length > 0) {
                        const topLocation = spawnData.locations[0];
                        return `${creature.title} spawnt hauptsächlich in ${topLocation.biome}. Die besten Koordinaten sind ${topLocation.lat}, ${topLocation.lon}.`;
                    }
                    return `Ich habe keine Spawn-Informationen für ${creature.title}.`;
                }

                if (route.route === 'creature_taming') {
                    if (creature.taming) {
                        const t = creature.taming;
                        const parts = [];
                        if (t.taming_method) parts.push(`Die Methode ist ${t.taming_method}`);
                        if (t.preferred_food && t.preferred_food.length > 0) parts.push(`Am liebsten frisst er ${t.preferred_food.join(', ')}`);

                        if (parts.length > 0) return parts.join('. ');
                    }
                    return `Ich habe keine spezifischen Taming-Infos für ${creature.title}, aber er ist ${creature.tameable ? 'zähmbar' : 'nicht zähmbar'}.`;
                }

                // Creature flags
                const flags = [];
                if (creature.tameable) flags.push('zähmbar');
                if (creature.rideable) flags.push('reitbar');
                if (creature.breedable) flags.push('züchtbar');

                if (flags.length > 0) {
                    return `${creature.title} ist ${flags.join(', ')}.`;
                }
                return `${creature.title} ist nicht zähmbar.`;
            }

            case 'resource_location': {
                const resourceName = route.entity?.name || question;
                const resource = findResourceSmart(resourceName);

                if (!resource) {
                    return `Ich konnte keine Informationen über ${resourceName} finden.`;
                }

                if (resource.locations && resource.locations.length > 0) {
                    const topLocation = resource.locations[0];
                    return `${resource.name} findest du hauptsächlich in ${topLocation.biome}. Die besten Koordinaten sind ${topLocation.lat}, ${topLocation.lon}.`;
                }
                return `Ich habe keine Standort-Informationen für ${resource.name}.`;
            }

            case 'crafting_recipe': {
                const itemName = route.entity?.name || question;
                const item = findCraftableSmart(itemName);

                if (!item || !item.recipe) {
                    return `Ich konnte kein Rezept für ${itemName} finden.`;
                }

                const materials = item.recipe.materials.map(m => `${m.quantity} ${m.item}`).join(', ');
                return `Für ${item.title} brauchst du: ${materials}.`;
            }

            case 'general': {
                // Check for multi-resource query
                if (question.includes('und') || question.includes(',')) {
                    const result = findBestMultiResourceLocation(question);
                    if (result && result.resources && result.resources.length > 0) {
                        return formatMultiResourceLocation(result);
                    }
                }

                return "Entschuldigung, ich habe deine Frage nicht verstanden. Bitte frage nach Kreaturen, Ressourcen oder Crafting-Rezepten.";
            }

            default:
                return "Entschuldigung, ich konnte deine Frage nicht verarbeiten.";
        }
    } catch (error) {
        console.error(`❌ Error processing question:`, error);
        return "Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Frage.";
    }
}

/**
 * Check if user is currently being processed
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isUserSpeaking(userId) {
    return userSpeakingState.get(userId) || false;
}
