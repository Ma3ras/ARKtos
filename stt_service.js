// Speech-to-Text Service (faster-whisper)
// Transcribes audio using faster-whisper for improved performance

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const WHISPER_SCRIPT = path.join(process.cwd(), 'faster_whisper_transcribe.py');
const MODEL_SIZE = process.env.WHISPER_MODEL_SIZE || 'small';
const LANGUAGE = process.env.VOICE_LANGUAGE || 'de';

/**
 * Transcribe audio file using faster-whisper
 * @param {string} audioFilePath - Path to WAV audio file
 * @param {string} modelSize - Model size
 * @param {string} language - Language code
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioFilePath, modelSize = MODEL_SIZE, language = LANGUAGE) {
    return new Promise((resolve, reject) => {
        console.log(`🎤 Starting faster-whisper transcription...`);
        console.log(`  Model: ${modelSize}`);
        console.log(`  Language: ${language}`);

        // Run faster-whisper Python script
        const whisper = spawn(PYTHON_PATH, [
            WHISPER_SCRIPT,
            audioFilePath,
            modelSize,
            language
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
            if (code !== 0) {
                console.error(`❌ faster-whisper exited with code ${code}`);
                console.error(`stderr:`, stderr);
                reject(new Error(`faster-whisper failed with code ${code}`));
                return;
            }

            const transcription = stdout.trim();
            console.log(`✅ Transcription complete: "${transcription}"`);
            resolve(transcription);
        });

        whisper.on('error', (error) => {
            console.error(`❌ Failed to start faster-whisper:`, error);
            reject(error);
        });
    });
}

/**
 * Transcribe audio buffer to text using faster-whisper
 * @param {Buffer} audioBuffer - WAV audio buffer
 * @param {string} language - Language code (default: 'de')
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribe(audioBuffer, language = LANGUAGE) {
    // Save audio to temp file
    const tempFile = path.join(process.cwd(), `temp_audio_${Date.now()}.wav`);

    try {
        fs.writeFileSync(tempFile, audioBuffer);
        console.log(`💾 Saved audio to temp file: ${tempFile}`);
    } catch (error) {
        console.error(`❌ Failed to save temp audio file:`, error);
        throw error;
    }

    try {
        const result = await transcribeAudio(tempFile, MODEL_SIZE, language);
        return result;
    } finally {
        // Cleanup temp WAV file
        try {
            fs.unlinkSync(tempFile);
        } catch (error) {
            console.warn(`⚠️ Failed to delete temp file:`, error.message);
        }
    }
}

/**
 * Warm up the Whisper model by running a dummy transcription
 * This preloads the model into GPU memory to avoid delays on first real use
 */
export async function warmupModel() {
    console.log('🔥 Warming up Whisper model (GPU preload)...');

    if (!fs.existsSync(WHISPER_SCRIPT)) {
        console.log('⚠️ Whisper not available, skipping warmup');
        return;
    }

    try {
        // Create a silent 1-second audio file for warmup
        const tempFile = path.join(process.cwd(), 'temp_warmup.wav');

        // Generate silent WAV file (16kHz, mono, 1 second)
        const sampleRate = 16000;
        const duration = 1;
        const numSamples = sampleRate * duration;
        const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + samples

        // WAV header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + numSamples * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16); // fmt chunk size
        buffer.writeUInt16LE(1, 20);  // PCM
        buffer.writeUInt16LE(1, 22);  // mono
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
        buffer.writeUInt16LE(2, 32);  // block align
        buffer.writeUInt16LE(16, 34); // bits per sample
        buffer.write('data', 36);
        buffer.writeUInt32LE(numSamples * 2, 40);

        fs.writeFileSync(tempFile, buffer);

        // Run transcription to load model into GPU
        await transcribeAudio(tempFile, MODEL_SIZE, LANGUAGE);

        // Clean up
        fs.unlinkSync(tempFile);

        console.log('✅ Whisper model warmed up and ready!');
    } catch (error) {
        console.error('⚠️ Model warmup failed:', error.message);
    }
}

/**
 * Check if faster-whisper is available
 * @returns {boolean}
 */
export function isWhisperAvailable() {
    try {
        return fs.existsSync(WHISPER_SCRIPT);
    } catch (error) {
        return false;
    }
}

/**
 * Get faster-whisper configuration
 * @returns {object}
 */
export function getConfig() {
    return {
        pythonPath: PYTHON_PATH,
        scriptPath: WHISPER_SCRIPT,
        modelSize: MODEL_SIZE,
        language: LANGUAGE,
        available: isWhisperAvailable()
    };
}
