// Voice Connection Manager
// Handles Discord voice channel connections

import {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} from '@discordjs/voice';

const connections = new Map(); // guildId -> connection

/**
 * Set up audio receiver for a connection
 * @param {VoiceConnection} connection - Voice connection
 * @param {VoiceChannel} channel - Voice channel
 * @param {string} guildId - Guild ID
 */
function setupAudioReceiver(connection, channel, guildId) {
    console.log(`🎧 Setting up audio receiver for guild ${guildId}`);

    // Remove old listeners to avoid duplicates
    connection.receiver.speaking.removeAllListeners('start');

    // Set up audio receiver - subscribe to all users in channel
    connection.receiver.speaking.on('start', (userId) => {
        console.log(`🎤 User ${userId} started speaking (speaking event)`);

        // Subscribe to user's audio stream
        const audioStream = connection.receiver.subscribe(userId, {
            end: {
                behavior: 'manual'
            }
        });

        console.log(`📡 Subscribed to audio stream for user ${userId}`);

        // Import and trigger voice handler
        import('./voice_handler.js').then(({ handleUserSpeaking }) => {
            // Get user info from channel
            const member = channel.members.get(userId);
            if (member && !member.user.bot) {
                console.log(`👤 Processing speech from ${member.user.username}`);
                handleUserSpeaking(userId, guildId, member.user.username);
            }
        }).catch(error => {
            console.error(`❌ Error loading voice handler:`, error);
        });
    });

    console.log(`✅ Audio receiver ready - speak now!`);
}

/**
 * Join a voice channel
 * @param {VoiceChannel} channel - Discord voice channel
 * @returns {VoiceConnection}
 */
export function joinChannel(channel) {
    const guildId = channel.guild.id;

    // Check if already connected
    const existing = connections.get(guildId);
    if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) {
        console.log(`✅ Already connected to voice in guild ${guildId}`);
        console.log(`🔄 Re-initializing audio receiver...`);
        // Don't return early - set up the receiver again
        const connection = existing;

        // Set up audio receiver
        setupAudioReceiver(connection, channel, guildId);
        return connection;
    }

    console.log(`🔊 Joining voice channel: ${channel.name} (${channel.id})`);

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false
    });

    // Set up audio receiver using helper function
    setupAudioReceiver(connection, channel, guildId);

    // Handle connection state changes
    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`✅ Voice connection ready in guild ${guildId}`);
        console.log(`👂 Listening for voice activity...`);
        console.log(`📢 Speak now to test!`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        console.log(`⚠️ Voice disconnected in guild ${guildId}`);
        try {
            // Try to reconnect
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
            console.log(`🔄 Reconnecting...`);
        } catch (error) {
            console.log(`❌ Failed to reconnect, destroying connection`);
            connection.destroy();
            connections.delete(guildId);
        }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
        console.log(`🗑️ Voice connection destroyed in guild ${guildId}`);
        connections.delete(guildId);
    });

    connection.on('error', (error) => {
        console.error(`❌ Voice connection error in guild ${guildId}:`, error);
    });

    connections.set(guildId, connection);
    return connection;
}

/**
 * Leave a voice channel
 * @param {string} guildId - Guild ID
 */
export function leaveChannel(guildId) {
    const connection = connections.get(guildId);
    if (connection) {
        console.log(`👋 Leaving voice channel in guild ${guildId}`);
        connection.destroy();
        connections.delete(guildId);
        return true;
    }
    return false;
}

/**
 * Get active connection for a guild
 * @param {string} guildId - Guild ID
 * @returns {VoiceConnection|null}
 */
export function getConnection(guildId) {
    return connections.get(guildId) || null;
}

/**
 * Check if bot is connected to voice in a guild
 * @param {string} guildId - Guild ID
 * @returns {boolean}
 */
export function isConnected(guildId) {
    const connection = connections.get(guildId);
    return connection && connection.state.status !== VoiceConnectionStatus.Destroyed;
}

/**
 * Get all active connections
 * @returns {Map<string, VoiceConnection>}
 */
export function getAllConnections() {
    return connections;
}
