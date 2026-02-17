// Audio Processor
// Handles audio recording, buffering, and format conversion

import { EndBehaviorType } from '@discordjs/voice';
import prism from 'prism-media';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

const activeRecordings = new Map(); // userId -> recording data

/**
 * Start recording a user's audio (with Server-Side VAD)
 * @param {string} userId - User ID
 * @param {VoiceConnection} connection - Voice connection
 * @param {number} maxDuration - Max recording duration in ms (default: 30s)
 * @returns {Promise<Buffer>} - Audio buffer (WAV format)
 */
export async function recordUser(userId, connection, maxDuration = 30000) {
    return new Promise((resolve, reject) => {
        console.log(`🎤 Starting recording for user ${userId}`);

        const receiver = connection.receiver;
        const audioStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 1000,
            },
        });

        console.log(`📡 Audio stream created for user ${userId}`);

        const chunks = [];
        let silenceTimeout = null;
        let maxDurationTimeout = null;
        let hasReceivedData = false;

        // Opus decoder
        const opusDecoder = new prism.opus.Decoder({
            frameSize: 960,
            channels: 1,
            rate: 48000,
        });

        console.log(`🔧 Opus decoder created`);

        // Helper to stop recording safely
        let isResolved = false;
        const resolveRecording = () => {
            if (isResolved) return;
            isResolved = true;

            if (audioStream && !audioStream.destroyed) audioStream.destroy();

            // Check if already ended
            try {
                if (opusDecoder && !opusDecoder.destroyed) opusDecoder.end();
            } catch (e) { console.error("Opus decoder end error:", e); }

            clearTimeout(maxDurationTimeout);
            clearTimeout(silenceTimeout);
        };

        // Collect audio chunks
        opusDecoder.on('data', (chunk) => {
            if (!hasReceivedData) {
                console.log(`🎵 First audio chunk received! Size: ${chunk.length} bytes`);
                hasReceivedData = true;
            }
            chunks.push(chunk);

            // Simple Software VAD (Voice Activity Detection)
            // Calculate RMS (Root Mean Square) volume of the chunk
            let sum = 0;
            for (let i = 0; i < chunk.length; i += 2) {
                const sample = chunk.readInt16LE(i);
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / (chunk.length / 2));
            const SILENCE_THRESHOLD = 1500; // Calibrate if needed (Background noise usually ~500-1000)

            // Reset silence timeout ONLY if volume is above threshold (active speech)
            if (rms > SILENCE_THRESHOLD) {
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                }

                // Set silence timeout (Stop after 1.5s of "software silence")
                silenceTimeout = setTimeout(() => {
                    console.log(`🔇 Silence detected (Server VAD), stopping recording`);
                    resolveRecording();
                }, 1500);
            } else {
                // If silent chunk received, but timeout is NOT set (start of silence sequence)
                // We start counting down ONLY if it wasn't already set
                if (!silenceTimeout) {
                    silenceTimeout = setTimeout(() => {
                        console.log(`🔇 Silence detected (Initial Silence), stopping recording`);
                        resolveRecording();
                    }, 1500);
                }
            }
        });

        opusDecoder.on('end', () => {
            console.log(`🏁 Opus decoder ended`);
            clearTimeout(silenceTimeout);
            clearTimeout(maxDurationTimeout);

            if (chunks.length === 0) {
                console.log(`⚠️ No audio recorded for user ${userId}`);
                resolve(null);
                return;
            }

            // Concatenate all chunks
            const pcmBuffer = Buffer.concat(chunks);
            console.log(`✅ Recording complete: ${pcmBuffer.length} bytes, ${chunks.length} chunks`);

            // Convert PCM to WAV
            const wavBuffer = pcmToWav(pcmBuffer, 48000, 1);
            console.log(`📦 WAV buffer created: ${wavBuffer.length} bytes`);
            resolve(wavBuffer);
        });

        opusDecoder.on('error', (error) => {
            console.error(`❌ Opus decoder error:`, error);
            clearTimeout(silenceTimeout);
            clearTimeout(maxDurationTimeout);
            reject(error);
        });

        // Audio stream events
        audioStream.on('error', (error) => {
            console.error(`❌ Audio stream error:`, error);
        });

        // Max duration timeout
        maxDurationTimeout = setTimeout(() => {
            console.log(`⏱️ Max duration reached, stopping recording`);
            resolveRecording();
        }, maxDuration);

        // Pipe audio stream through decoder
        audioStream.pipe(opusDecoder);
        console.log(`🔗 Audio stream piped to decoder`);

        activeRecordings.set(userId, {
            stream: audioStream,
            decoder: opusDecoder,
            startTime: Date.now(),
        });
    });
}

/**
 * Record a short audio clip for wake word detection
 * @param {string} userId - User ID
 * @param {VoiceConnection} connection - Voice connection
 * @param {number} duration - Clip duration in ms (default: 2500ms)
 * @param {number} silenceDuration - Silence duration to stop (default: 800ms)
 * @returns {Promise<Buffer>} - Audio buffer (WAV format)
 */
export async function recordShortClip(userId, connection, duration = 2500, silenceDuration = 800) {
    return new Promise((resolve, reject) => {
        console.log(`🎧 Recording short clip for wake word detection (${duration}ms)`);

        const receiver = connection.receiver;
        const audioStream = receiver.subscribe(userId, {
            end: {
                behavior: 'manual'
            },
        });

        const chunks = [];
        let silenceTimeout = null;
        let maxDurationTimeout = null;
        let hasReceivedData = false;

        // Opus decoder
        const opusDecoder = new prism.opus.Decoder({
            frameSize: 960,
            channels: 1,
            rate: 48000,
        });

        let maxRms = 0;

        // Collect audio chunks
        opusDecoder.on('data', (chunk) => {
            if (!hasReceivedData) {
                hasReceivedData = true;
            }
            chunks.push(chunk);

            // RMS Check - track loudest part of clip
            let sum = 0;
            for (let i = 0; i < chunk.length; i += 2) {
                const sample = chunk.readInt16LE(i);
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / (chunk.length / 2));
            if (rms > maxRms) maxRms = rms;

            // Reset silence timeout on new audio
            if (silenceTimeout) {
                clearTimeout(silenceTimeout);
            }

            // Stop after silence
            silenceTimeout = setTimeout(() => {
                // Safe destroy
                if (audioStream && !audioStream.destroyed) audioStream.destroy();
                if (opusDecoder && !opusDecoder.destroyed) opusDecoder.end();
            }, silenceDuration);
        });

        opusDecoder.on('end', () => {
            clearTimeout(silenceTimeout);
            clearTimeout(maxDurationTimeout);

            if (chunks.length === 0) {
                resolve(null);
                return;
            }

            // FILTER: If max volume was too low (just noise), optimize by skipping transcription
            if (maxRms < 1200) { // Slight lower threshold for wake word to be safe
                // console.log(`🔇 Wake Word clip discarded (RMS: ${maxRms.toFixed(0)} < 1200)`);
                resolve(null);
                return;
            }

            // Concatenate all chunks
            const pcmBuffer = Buffer.concat(chunks);

            // Convert PCM to WAV
            const wavBuffer = pcmToWav(pcmBuffer, 48000, 1);
            resolve(wavBuffer);
        });

        opusDecoder.on('error', (error) => {
            console.error(`❌ Opus decoder error (short clip):`, error);
            clearTimeout(silenceTimeout);
            clearTimeout(maxDurationTimeout);
            reject(error);
        });

        // Pipe audio stream through decoder
        audioStream.pipe(opusDecoder);

        // Max duration timeout
        maxDurationTimeout = setTimeout(() => {
            audioStream.destroy();
            opusDecoder.end();
        }, duration);
    });
}

/**
 * Stop recording a user
 * @param {string} userId - User ID
 */
export function stopRecording(userId) {
    const recording = activeRecordings.get(userId);
    if (recording) {
        console.log(`⏹️ Stopping recording for user ${userId}`);
        recording.stream.destroy();
        activeRecordings.delete(userId);
    }
}

/**
 * Convert PCM buffer to WAV format
 * @param {Buffer} pcmBuffer - Raw PCM audio data
 * @param {number} sampleRate - Sample rate (e.g., 48000)
 * @param {number} channels - Number of channels (1 = mono, 2 = stereo)
 * @returns {Buffer} - WAV file buffer
 */
function pcmToWav(pcmBuffer, sampleRate, channels) {
    const bitsPerSample = 16;
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;

    // WAV header (44 bytes)
    const header = Buffer.alloc(44);

    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4); // File size - 8
    header.write('WAVE', 8);

    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
}

/**
 * Check if user is being recorded
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export function isRecording(userId) {
    return activeRecordings.has(userId);
}

/**
 * Get all active recordings
 * @returns {Map}
 */
export function getActiveRecordings() {
    return activeRecordings;
}
