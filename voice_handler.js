// Voice Handler
// Orchestrates voice interactions: recording → transcription → processing → synthesis → playback

import { recordUser, recordShortClip } from './audio_processor.js';
import { transcribe } from './stt_service.js';
import { speak } from './tts_service.js';
import { optimizeForTTS } from './tts_corrections.js';
import { routeQuery } from './router.js';
import { getConnection } from './voice_manager.js';
import { containsWakeWord, removeWakeWord, CLIP_DURATION, WAKE_WORD_SILENCE_DURATION, ENABLE_WAKE_WORD } from './wake_word_config.js';

// Import all handlers (same as text bot)
import { findCreatureSmart } from './creatures.js';
import { findResourceSmart, findResourceLocations } from './resources.js';
import { findCraftableSmart } from './craftables.js';
import { findSpawnLocations } from './spawn_locations.js';
import { findBestMultiResourceLocation, formatMultiResourceLocation } from './multi_resource_locations.js';

const userSpeakingState = new Map(); // userId -> boolean

/**
 * Handle user speaking in voice channel (Auto-Wake Word Detection)
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @param {string} username - Username for logging
 */
export async function handleUserSpeaking(userId, guildId, username) {
    // 1. Check if Wake Word is enabled
    if (!ENABLE_WAKE_WORD) {
        // If wake word is disabled, we ignore passive speaking.
        // User must use /listen command.
        return;
    }

    // Prevent multiple simultaneous recordings for same user
    if (userSpeakingState.get(userId)) {
        console.log(`⚠️ User ${username} is already being processed, skipping`);
        return;
    }

    userSpeakingState.set(userId, true);

    try {
        const connection = getConnection(guildId);
        if (!connection) return;

        console.log(`👂 ${username} started speaking - listening for wake word...`);

        // STAGE 1: Record short clip for wake word detection
        const clipBuffer = await recordShortClip(userId, connection, CLIP_DURATION, WAKE_WORD_SILENCE_DURATION);

        if (!clipBuffer) return;

        // Quick transcription to check for wake word
        const clipTranscription = await transcribe(clipBuffer);

        if (!clipTranscription || !containsWakeWord(clipTranscription)) {
            // No wake word, ignore
            return;
        }

        console.log(`✅ Wake word detected from ${username}: "${clipTranscription}"`);

        // Check if query was in the same clip
        const queryAfterWakeWord = removeWakeWord(clipTranscription).trim();
        let fullQuery = queryAfterWakeWord;

        // If no query after wake word OR query is very short (incomplete sentence), record additional audio
        if (!fullQuery || fullQuery.length < 15) {
            console.log(`🎤 Recording full query from ${username}... (previous: "${fullQuery}")`);
            // await speak(connection, "Ja?"); // Optional ack

            const queryBuffer = await recordUser(userId, connection, 7500); // 7.5s max
            if (queryBuffer) {
                const queryTranscription = await transcribe(queryBuffer);
                if (queryTranscription) {
                    // Append new transcription to previous one
                    fullQuery = fullQuery ? `${fullQuery} ${queryTranscription}` : queryTranscription;
                }
            }
        }

        // Process the final query
        await processVoiceQuery(fullQuery, userId, guildId, connection);

    } catch (error) {
        console.error(`❌ Error handling voice for ${username}:`, error.message);
    } finally {
        userSpeakingState.delete(userId);
    }
}

/**
 * Manually trigger listening for a user (via /speak command)
 * Bypass Wake Word detection.
 */
export async function triggerManualListening(userId, guildId, username) {
    if (userSpeakingState.get(userId)) {
        console.log(`⚠️ User ${username} is already being processed, skipping`);
        return false;
    }

    console.log(`🎤 Manual activation for ${username}`);
    userSpeakingState.set(userId, true);

    try {
        const connection = getConnection(guildId);
        if (!connection) {
            console.log(`❌ No voice connection`);
            return false;
        }

        // Optional: Play "Listening" sound
        // await speak(connection, "Ich höre."); 

        // Record User directly (no wake word check)
        // 7 seconds should be enough for most queries
        const queryBuffer = await recordUser(userId, connection, 7000);

        if (!queryBuffer) {
            console.log(`⚠️ No audio recorded`);
            return false;
        }

        const transcription = await transcribe(queryBuffer);
        if (!transcription || transcription.trim().length === 0) {
            await speak(connection, "Ich habe nichts gehört.");
            return true;
        }

        console.log(`📝 Manual Transcription: "${transcription}"`);

        // Process
        await processVoiceQuery(transcription, userId, guildId, connection);
        return true;

    } catch (error) {
        console.error(`❌ Error in manual listening for ${username}:`, error);
        return false;
    } finally {
        userSpeakingState.delete(userId);
    }
}

/**
 * Common logic to process a transcribed voice query
 */
export async function processVoiceQuery(rawText, userId, guildId, connection) {
    try {
        // Clean wake word if present (just in case user said it anyway)
        const cleanedQuery = removeWakeWord(rawText);
        console.log(`🧹 Processing Query: "${cleanedQuery}"`);

        // Process the question (Logic from processQuestion)
        const response = await processQuestion(cleanedQuery);

        console.log(`💬 Response: "${response.substring(0, 50)}..."`);

        // Synthesize and play response
        const optimizedResponse = optimizeForTTS(response);
        await speak(connection, optimizedResponse);

    } catch (error) {
        console.error(`❌ Error processing voice query:`, error);
        await speak(connection, "Fehler bei der Verarbeitung.");
    }
}

/**
 * Process a question using the existing bot logic
 * (Refactored logic from original file)
 */
async function processQuestion(question) {
    try {
        // Route the question
        const route = await routeQuery(question);

        console.log(`🎯 Route: ${route.route}`);

        // Handle based on route
        switch (route.route) {
            case 'creature_flags':
            case 'creature_taming':
            case 'creature_breeding':
            case 'creature_spawn': {
                const creatureName = route.entity?.name || question;
                const creature = await findCreatureSmart(creatureName);

                if (!creature) {
                    return `Ich konnte keine Informationen über ${creatureName} finden.`;
                }

                if (route.route === 'creature_spawn') {
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
                const resource = await findResourceSmart(resourceName);
                if (!resource) return `Ich konnte keine Informationen über ${resourceName} finden.`;

                const locations = findResourceLocations(resource);
                const displayName = resource.title || resource.name || resourceName;

                if (locations && locations.length > 0) {
                    const topLocation = locations[0];
                    const locDesc = topLocation.note ? `bei ${topLocation.note}` : `bei den Koordinaten`;
                    return `${displayName} findest du ${locDesc} ${topLocation.lat}, ${topLocation.lon}.`;
                }
                return `Ich habe keine Standort-Informationen für ${displayName}.`;
            }

            case 'crafting_recipe': {
                const itemName = route.entity?.name || question;
                const item = await findCraftableSmart(itemName);
                if (!item || !item.recipe) return `Ich konnte kein Rezept für ${itemName} finden.`;

                const materials = item.recipe.materials.map(m => `${m.quantity} ${m.item}`).join(', ');
                return `Für ${item.title} brauchst du: ${materials}.`;
            }

            case 'general': {
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

export function isUserSpeaking(userId) {
    return userSpeakingState.get(userId) || false;
}
