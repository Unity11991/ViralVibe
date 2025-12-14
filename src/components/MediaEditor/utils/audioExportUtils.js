/**
 * Audio Export Utilities
 * Handles mixing and rendering of audio tracks for offline export.
 */

/**
 * Fetch and decode audio buffer from a URL
 * @param {AudioContext} ctx 
 * @param {string} url 
 * @returns {Promise<AudioBuffer>}
 */
const fetchAudioBuffer = async (ctx, url) => {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.warn(`Failed to load audio from ${url}`, e);
        return null; // Silent failure for missing assets
    }
};

/**
 * Render all audio tracks into a single AudioBuffer
 * @param {Array} tracks - Timeline tracks
 * @param {number} duration - Total duration in seconds
 * @returns {Promise<AudioBuffer>}
 */
export const renderOfflineAudio = async (tracks, duration) => {
    // Standard sample rate for video
    const sampleRate = 48000;

    // Create Offline Context
    // Length in samples = duration * sampleRate
    const offlineCtx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);

    // Collect all audio clips
    const audioClips = [];
    tracks.forEach(track => {
        if (track.type === 'audio' || track.type === 'video') { // Video tracks also have audio
            track.clips.forEach(clip => {
                if (clip.muted) return;
                audioClips.push(clip);
            });
        }
    });

    if (audioClips.length === 0) {
        // Return silent buffer
        return offlineCtx.createBuffer(2, Math.ceil(duration * sampleRate), sampleRate);
    }

    // Process all clips
    await Promise.all(audioClips.map(async (clip) => {
        if (!clip.source) return;

        const buffer = await fetchAudioBuffer(offlineCtx, clip.source);
        if (!buffer) return;

        // Create Source
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;

        // Create Gain for Volume
        const gainNode = offlineCtx.createGain();
        const volume = (clip.volume !== undefined ? clip.volume : 100) / 100;
        gainNode.gain.value = volume;

        // Connect
        source.connect(gainNode);
        gainNode.connect(offlineCtx.destination);

        // Schedule
        // offset: part of the audio file to start playing
        // startTime: when in the timeline to start playing
        // duration: how long to play

        const startTime = clip.startTime;
        const sourceOffset = clip.startOffset || 0;
        let playDuration = clip.duration;

        // Ensure we don't read past buffer duration
        if (sourceOffset + playDuration > buffer.duration) {
            playDuration = buffer.duration - sourceOffset;
        }

        if (playDuration <= 0) return;

        source.start(startTime, sourceOffset, playDuration);

        // Apply Fades (Linear Ramp)
        if (clip.fadeIn > 0) {
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + clip.fadeIn);
        }

        if (clip.fadeOut > 0) {
            const endTime = startTime + playDuration;
            gainNode.gain.setValueAtTime(volume, endTime - clip.fadeOut);
            gainNode.gain.linearRampToValueAtTime(0, endTime);
        }
    }));

    // Render
    return await offlineCtx.startRendering();
};
