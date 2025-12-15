/**
 * Utility for generating audio waveforms
 */

// Cache for decoded audio buffers: URL -> AudioBuffer
const audioBufferCache = new Map();

// Cache for computed peaks: key(url + samples) -> Float32Array
const peaksCache = new Map();

// Shared AudioContext
let audioContext = null;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

/**
 * Fetches and decodes audio from a URL
 * @param {string} url 
 * @returns {Promise<AudioBuffer>}
 */
const fetchAudioBuffer = async (url) => {
    if (audioBufferCache.has(url)) {
        return audioBufferCache.get(url);
    }

    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const ctx = getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferCache.set(url, audioBuffer);
        return audioBuffer;
    } catch (e) {
        // console.warn("Error decoding audio (might be unsupported format or video file):", e.message);
        // Return null instead of throwing to allow caller to handle gracefully
        return null;
    }
};

/**
 * Generates waveform peaks from an audio URL
 * @param {string} url - Audio URL
 * @param {number} samples - Number of peaks to generate
 * @returns {Promise<Float32Array>} - Normalized peaks (0.0 to 1.0)
 */
export const generateWaveform = async (url, samples = 100) => {
    const cacheKey = `${url}-${samples}`;
    if (peaksCache.has(cacheKey)) {
        return peaksCache.get(cacheKey);
    }

    try {
        const audioBuffer = await fetchAudioBuffer(url);

        if (!audioBuffer) {
            // Return flat line if decoding failed
            const empty = new Float32Array(samples).fill(0.1);
            peaksCache.set(cacheKey, empty);
            return empty;
        }

        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const step = Math.ceil(channelData.length / samples);
        const peaks = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            let max = 0;
            const start = i * step;
            const end = Math.min((i + 1) * step, channelData.length);

            // Find max amplitude in this step window
            for (let j = start; j < end; j++) {
                const val = Math.abs(channelData[j]);
                if (val > max) max = val;
            }
            peaks[i] = max;
        }

        // Normalize if needed? (Usually raw peaks are fine, but can scale)
        // Let's ensure at least some visibility if volume is low, 
        // but generally we want accurate relative representation.

        peaksCache.set(cacheKey, peaks);
        return peaks;
    } catch (e) {
        console.error("Waveform generation failed:", e);
        // Return empty peaks on failure
        return new Float32Array(samples).fill(0.1);
    }
};

/**
 * Detects beats in an audio file
 * @param {string} url - Audio URL
 * @returns {Promise<number[]>} - Array of timestamps (in seconds) where beats occur
 */
export const detectBeats = async (url) => {
    try {
        const audioBuffer = await fetchAudioBuffer(url);
        if (!audioBuffer) return [];

        // Use offline context for analysis if needed, or just raw data processing
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const beatTimestamps = [];

        // Window size for analysis (e.g., 0.05s)
        const windowSize = Math.floor(0.05 * sampleRate);
        const step = Math.floor(windowSize / 2); // Overlap

        let localEnergies = [];

        // 1. Calculate energy for each window
        for (let i = 0; i < channelData.length - windowSize; i += step) {
            let sum = 0;
            // Optimize loop for performance
            for (let j = 0; j < windowSize; j++) {
                const val = channelData[i + j];
                sum += val * val;
            }
            localEnergies.push({
                time: i / sampleRate,
                energy: sum / windowSize
            });
        }

        // 2. Calculate local threshold (moving average of energy)
        const neighborCount = 40; // ~2 seconds window if step is small

        for (let i = 0; i < localEnergies.length; i++) {
            const start = Math.max(0, i - neighborCount);
            const end = Math.min(localEnergies.length, i + neighborCount);
            let sum = 0;
            for (let j = start; j < end; j++) {
                sum += localEnergies[j].energy;
            }
            const avg = sum / (end - start);

            // C = Constant multiplier (sensitivity)
            const C = 1.5;

            if (localEnergies[i].energy > C * avg && localEnergies[i].energy > 0.01) {
                // Potential beat
                // Debounce
                const lastBeat = beatTimestamps[beatTimestamps.length - 1];
                // Min distance between beats? 0.25s = 240 BPM limit
                if (!lastBeat || (localEnergies[i].time - lastBeat > 0.25)) {
                    beatTimestamps.push(localEnergies[i].time);
                }
            }
        }

        return beatTimestamps;

    } catch (e) {
        console.error("Beat detection failed:", e);
        return [];
    }
};
