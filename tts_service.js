// Text-to-Speech Service (piper)
// Synthesizes speech using local piper TTS

import { spawn } from 'child_process';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } from '@discordjs/voice';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const PIPER_PATH = process.env.PIPER_PATH || './piper/piper.exe';
const VOICE_MODEL = process.env.PIPER_VOICE_MODEL || './piper/voices/de_DE-thorsten-medium.onnx';

/**
 * Synthesize text to speech using piper
 * @param {string} text - Text to synthesize
 * @returns {Promise<Buffer>} - Audio buffer (WAV format)
 */
export async function synthesize(text) {
    return new Promise((resolve, reject) => {
        if (!text || text.trim().length === 0) {
            reject(new Error('Text is empty'));
            return;
        }

        console.log(`🔊 Synthesizing speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        console.log(`  Model: ${VOICE_MODEL}`);

        // Save text to temp file (like the working test command)
        const textFile = `temp_text_${Date.now()}.txt`;
        const outputFile = `temp_piper_${Date.now()}.wav`;

        try {
            fs.writeFileSync(textFile, text, 'utf8');
        } catch (error) {
            reject(new Error(`Failed to write text file: ${error.message}`));
            return;
        }

        // Run piper with file input (like: cat file.txt | piper)
        // Use cmd /c type to pipe file content on Windows
        const piper = spawn('cmd', [
            '/c',
            `type "${textFile}" | "${PIPER_PATH}" --model "${VOICE_MODEL}" --output_file "${outputFile}"`
        ], {
            shell: true
        });

        piper.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('ERROR') || msg.includes('error')) {
                console.error(`⚠️ piper stderr:`, msg);
            }
        });

        piper.on('close', (code) => {
            // Cleanup text file
            try {
                fs.unlinkSync(textFile);
            } catch (e) { }

            if (code !== 0) {
                console.error(`❌ piper exited with code ${code}`);
                reject(new Error(`piper failed with code ${code}`));
                return;
            }

            // Read the output file
            try {
                const audioBuffer = fs.readFileSync(outputFile);
                console.log(`✅ Synthesis complete: ${audioBuffer.length} bytes`);

                // Delete output file (we have it in buffer)
                fs.unlinkSync(outputFile);

                resolve(audioBuffer);
            } catch (error) {
                reject(new Error(`Failed to read output file: ${error.message}`));
            }
        });

        piper.on('error', (error) => {
            console.error(`❌ Failed to start piper:`, error);
            try {
                fs.unlinkSync(textFile);
            } catch (e) { }
            reject(error);
        });
    });
}

/**
 * Play audio in a voice connection
 * @param {VoiceConnection} connection - Voice connection
 * @param {Buffer} audioBuffer - Audio buffer (WAV format)
 * @returns {Promise<void>}
 */
export async function playAudio(connection, audioBuffer) {
    return new Promise((resolve, reject) => {
        console.log(`▶️ Playing audio in voice channel...`);

        const player = createAudioPlayer();

        // Save to temp file and let Discord.js handle the format automatically
        const tempFile = `temp_tts_${Date.now()}.wav`;
        fs.writeFileSync(tempFile, audioBuffer);
        console.log(`💾 Saved TTS audio to: ${tempFile}`);

        // Create audio resource directly from file
        // Discord.js will automatically use FFmpeg to decode and resample
        const resource = createAudioResource(tempFile);

        player.on(AudioPlayerStatus.Playing, () => {
            console.log(`🎵 Audio playback started`);
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log(`✅ Audio playback finished`);
            // Cleanup temp file - DISABLED FOR DEBUGGING
            // try {
            //     fs.unlinkSync(tempFile);
            //     console.log(`🗑️ Deleted temp file: ${tempFile}`);
            // } catch (e) {
            //     console.error(`⚠️ Failed to delete temp file:`, e);
            // }
            console.log(`📁 Temp file kept for debugging: ${tempFile}`);
            resolve();
        });

        player.on('error', (error) => {
            console.error(`❌ Audio player error:`, error);
            // Cleanup temp file
            try {
                fs.unlinkSync(tempFile);
            } catch (e) { }
            reject(error);
        });

        connection.subscribe(player);
        player.play(resource);
    });
}

/**
 * Synthesize and play text in voice channel
 * @param {VoiceConnection} connection - Voice connection
 * @param {string} text - Text to speak
 * @returns {Promise<void>}
 */
export async function speak(connection, text) {
    const audioBuffer = await synthesize(text);
    await playAudio(connection, audioBuffer);
}

/**
 * Check if piper is available
 * @returns {boolean}
 */
export function isPiperAvailable() {
    try {
        return fs.existsSync(PIPER_PATH) && fs.existsSync(VOICE_MODEL);
    } catch (error) {
        return false;
    }
}

/**
 * Get piper configuration
 * @returns {object}
 */
export function getConfig() {
    return {
        piperPath: PIPER_PATH,
        voiceModel: VOICE_MODEL,
        available: isPiperAvailable()
    };
}
