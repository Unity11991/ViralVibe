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
        console.error("Error decoding audio:", e);
        throw e;
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
