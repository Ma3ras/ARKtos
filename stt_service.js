// Speech-to-Text Service (whisper.cpp)
// Transcribes audio using local whisper.cpp

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const WHISPER_PATH = process.env.WHISPER_PATH || './whisper.cpp/main.exe';
const MODEL_PATH = process.env.WHISPER_MODEL || './whisper.cpp/models/ggml-medium.bin';
const LANGUAGE = process.env.VOICE_LANGUAGE || 'de';

/**
 * Transcribe audio buffer to text using whisper.cpp
 * @param {Buffer} audioBuffer - WAV audio buffer
 * @param {string} language - Language code (default: 'de')
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribe(audioBuffer, language = LANGUAGE) {
    return new Promise((resolve, reject) => {
        // Save audio to temp file
        const tempFile = path.join(process.cwd(), `temp_audio_${Date.now()}.wav`);

        try {
            fs.writeFileSync(tempFile, audioBuffer);
            console.log(`💾 Saved audio to temp file: ${tempFile}`);
        } catch (error) {
            console.error(`❌ Failed to save temp audio file:`, error);
            reject(error);
            return;
        }

        console.log(`🎤 Starting whisper.cpp transcription...`);
        console.log(`  Model: ${MODEL_PATH}`);
        console.log(`  Language: ${language}`);

        // Run whisper.cpp
        const whisper = spawn(WHISPER_PATH, [
            '-m', MODEL_PATH,
            '-l', language,
            '-f', tempFile,
            '--no-timestamps',
            '--output-txt',
            '--output-file', tempFile.replace('.wav', '')
        ]);

        let stdout = '';
        let stderr = '';

        whisper.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        whisper.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        whisper.on('close', (code) => {
            // Cleanup temp WAV file
            try {
                fs.unlinkSync(tempFile);
            } catch (error) {
                console.warn(`⚠️ Failed to delete temp file:`, error.message);
            }

            if (code !== 0) {
                console.error(`❌ whisper.cpp exited with code ${code}`);
                console.error(`stderr:`, stderr);
                reject(new Error(`whisper.cpp failed with code ${code}`));
                return;
            }

            // Read transcription from output file
            const txtFile = tempFile.replace('.wav', '.txt');
            try {
                const transcription = fs.readFileSync(txtFile, 'utf-8').trim();
                fs.unlinkSync(txtFile); // Cleanup

                console.log(`✅ Transcription complete: "${transcription}"`);
                resolve(transcription);
            } catch (error) {
                console.error(`❌ Failed to read transcription file:`, error);
                reject(error);
            }
        });

        whisper.on('error', (error) => {
            console.error(`❌ Failed to start whisper.cpp:`, error);

            // Cleanup temp file
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore
            }

            reject(error);
        });
    });
}

/**
 * Check if whisper.cpp is available
 * @returns {boolean}
 */
export function isWhisperAvailable() {
    try {
        return fs.existsSync(WHISPER_PATH) && fs.existsSync(MODEL_PATH);
    } catch (error) {
        return false;
    }
}

/**
 * Get whisper.cpp configuration
 * @returns {object}
 */
export function getConfig() {
    return {
        whisperPath: WHISPER_PATH,
        modelPath: MODEL_PATH,
        language: LANGUAGE,
        available: isWhisperAvailable()
    };
}
