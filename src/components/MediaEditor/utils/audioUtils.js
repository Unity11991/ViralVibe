/**
 * Audio Rendering Utilities
 * Handles offline audio rendering for export.
 */

/**
 * Render the entire timeline audio to a single AudioBuffer
 * @param {Array} tracks - Timeline tracks
 * @param {number} duration - Total duration in seconds
 * @returns {Promise<AudioBuffer>}
 */
export const renderOfflineAudio = async (tracks, duration) => {
    // 1. Create OfflineAudioContext
    const sampleRate = 48000;
    const length = Math.ceil(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // 2. Load and Schedule Audio Clips
    const audioLoaders = [];

    tracks.forEach(track => {
        if (track.isMuted) return;

        track.clips.forEach(clip => {
            if (!clip.source) return;

            // Determine if clip has audio
            // Video clips might have audio, Audio clips definitely do.
            // Text/Image clips do not.
            if (clip.type !== 'video' && clip.type !== 'audio') return;
            if (clip.isMuted) return;

            audioLoaders.push(async () => {
                try {
                    // Fetch audio data
                    const response = await fetch(clip.source);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

                    // Create Source
                    const source = offlineCtx.createBufferSource();
                    source.buffer = audioBuffer;

                    // Calculate timing
                    // Clip Start Time (on timeline)
                    const startTime = clip.startTime;

                    // Source Offset (start point within the file)
                    const offset = clip.startOffset || 0;

                    // Duration to play
                    const playDuration = clip.duration;

                    // Apply Volume/Gain
                    const gainNode = offlineCtx.createGain();
                    gainNode.gain.value = (clip.volume !== undefined ? clip.volume : 1) * (track.volume !== undefined ? track.volume : 1);

                    // Connect
                    source.connect(gainNode);
                    gainNode.connect(offlineCtx.destination);

                    // Schedule
                    source.start(startTime, offset, playDuration);
                } catch (e) {
                    console.warn(`Failed to load audio for clip ${clip.id}:`, e);
                }
            });
        });
    });

    // Wait for all clips to be scheduled
    await Promise.all(audioLoaders.map(loader => loader()));

    // 3. Render
    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer;
};
