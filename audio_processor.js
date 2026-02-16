// Audio Processor
// Handles audio recording, buffering, and format conversion

import { EndBehaviorType } from '@discordjs/voice';
import prism from 'prism-media';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

const activeRecordings = new Map(); // userId -> recording data

/**
 * Start recording a user's audio
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
                duration: 1000, // Stop after 1s of silence
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

        // Collect audio chunks
        opusDecoder.on('data', (chunk) => {
            if (!hasReceivedData) {
                console.log(`🎵 First audio chunk received! Size: ${chunk.length} bytes`);
                hasReceivedData = true;
            }
            chunks.push(chunk);

            // Reset silence timeout on new audio
            if (silenceTimeout) {
                clearTimeout(silenceTimeout);
            }

            // Stop after 1s of silence
            silenceTimeout = setTimeout(() => {
                console.log(`🔇 Silence detected, stopping recording`);
                audioStream.destroy();
                opusDecoder.end(); // Explicitly end the decoder
            }, 1000);
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
        audioStream.on('data', (data) => {
            console.log(`📥 Raw audio data received: ${data.length} bytes`);
        });

        audioStream.on('end', () => {
            console.log(`🔚 Audio stream ended`);
        });

        audioStream.on('error', (error) => {
            console.error(`❌ Audio stream error:`, error);
        });

        // Pipe audio stream through decoder
        audioStream.pipe(opusDecoder);
        console.log(`🔗 Audio stream piped to decoder`);

        // Max duration timeout
        maxDurationTimeout = setTimeout(() => {
            console.log(`⏱️ Max duration reached, stopping recording`);
            audioStream.destroy();
            opusDecoder.end(); // Explicitly end the decoder
        }, maxDuration);

        activeRecordings.set(userId, {
            stream: audioStream,
            decoder: opusDecoder,
            startTime: Date.now(),
        });
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
