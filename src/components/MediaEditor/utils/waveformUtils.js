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

/**
 * Calculates tempo (BPM) from beat timestamps
 * @param {number[]} beats - Array of beat timestamps in seconds
 * @returns {number} - Beats per minute (BPM)
 */
export const calculateTempo = (beats) => {
    if (beats.length < 2) return 120; // Default tempo

    // Calculate intervals between consecutive beats
    const intervals = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }

    // Remove outliers (beats that are too far apart or too close)
    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const median = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

    // Filter intervals within 50% of median
    const filteredIntervals = intervals.filter(
        interval => interval > median * 0.5 && interval < median * 1.5
    );

    if (filteredIntervals.length === 0) return 120;

    // Calculate average interval
    const avgInterval = filteredIntervals.reduce((a, b) => a + b, 0) / filteredIntervals.length;

    // Convert to BPM
    const bpm = Math.round(60 / avgInterval);

    // Clamp to reasonable range
    return Math.max(60, Math.min(200, bpm));
};

/**
 * Gets energy profile over time
 * @param {string} url - Audio URL
 * @param {number} segments - Number of time segments to analyze (default: 100)
 * @returns {Promise<number[]>} - Normalized energy levels (0-1) for each segment
 */
export const getEnergyProfile = async (url, segments = 100) => {
    try {
        const audioBuffer = await fetchAudioBuffer(url);
        if (!audioBuffer) return new Array(segments).fill(0.5);

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        const segmentDuration = duration / segments;

        const energyLevels = [];

        for (let i = 0; i < segments; i++) {
            const startSample = Math.floor(i * segmentDuration * sampleRate);
            const endSample = Math.floor((i + 1) * segmentDuration * sampleRate);

            // Calculate RMS (Root Mean Square) energy for this segment
            let sum = 0;
            let count = 0;

            for (let j = startSample; j < endSample && j < channelData.length; j++) {
                sum += channelData[j] * channelData[j];
                count++;
            }

            const rms = count > 0 ? Math.sqrt(sum / count) : 0;
            energyLevels.push(rms);
        }

        // Normalize to 0-1 range
        const maxEnergy = Math.max(...energyLevels, 0.001); // Avoid division by zero
        return energyLevels.map(energy => energy / maxEnergy);

    } catch (e) {
        console.error("Energy profile generation failed:", e);
        return new Array(segments).fill(0.5);
    }
};

/**
 * Analyzes audio mood based on waveform characteristics
 * @param {AudioBuffer} audioBuffer - Decoded audio buffer
 * @returns {Object} - Mood analysis with characteristics
 */
export const analyzeAudioMood = (audioBuffer) => {
    if (!audioBuffer) {
        return {
            mood: 'neutral',
            energy: 0.5,
            variance: 0.5,
            characteristics: {}
        };
    }

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Calculate overall statistics
    let sum = 0;
    let sumSquares = 0;
    let maxAmplitude = 0;

    for (let i = 0; i < channelData.length; i++) {
        const val = Math.abs(channelData[i]);
        sum += val;
        sumSquares += val * val;
        if (val > maxAmplitude) maxAmplitude = val;
    }

    const mean = sum / channelData.length;
    const variance = (sumSquares / channelData.length) - (mean * mean);
    const stdDev = Math.sqrt(variance);

    // Calculate zero-crossing rate (indicates frequency content)
    let zeroCrossings = 0;
    for (let i = 1; i < channelData.length; i++) {
        if ((channelData[i] >= 0 && channelData[i - 1] < 0) ||
            (channelData[i] < 0 && channelData[i - 1] >= 0)) {
            zeroCrossings++;
        }
    }
    const zcr = zeroCrossings / channelData.length;

    // Determine mood based on characteristics
    let mood = 'neutral';
    const energy = Math.min(1, mean * 10); // Normalized energy
    const dynamicRange = stdDev / (mean + 0.001); // Avoid division by zero

    if (energy > 0.7 && dynamicRange > 1.5) {
        mood = 'energetic';
    } else if (energy > 0.6 && zcr > 0.1) {
        mood = 'upbeat';
    } else if (energy < 0.3 && dynamicRange < 0.8) {
        mood = 'calm';
    } else if (dynamicRange > 2.0) {
        mood = 'dramatic';
    } else if (energy < 0.4 && zcr < 0.05) {
        mood = 'melancholic';
    }

    return {
        mood,
        energy,
        variance: dynamicRange,
        characteristics: {
            meanAmplitude: mean,
            maxAmplitude,
            standardDeviation: stdDev,
            zeroCrossingRate: zcr,
            dynamicRange
        }
    };
};

/**
 * Detects audio segments with different energy/mood characteristics
 * @param {string} url - Audio URL
 * @param {number} minSegmentDuration - Minimum segment duration in seconds (default: 5)
 * @returns {Promise<Array>} - Array of segments with start, end, and characteristics
 */
export const detectAudioSegments = async (url, minSegmentDuration = 5) => {
    try {
        const audioBuffer = await fetchAudioBuffer(url);
        if (!audioBuffer) return [];

        const duration = audioBuffer.duration;
        const energyProfile = await getEnergyProfile(url, Math.ceil(duration));

        const segments = [];
        let currentSegment = {
            start: 0,
            energySum: 0,
            count: 0
        };

        for (let i = 0; i < energyProfile.length; i++) {
            const time = i;
            const energy = energyProfile[i];

            currentSegment.energySum += energy;
            currentSegment.count++;

            // Check if we should start a new segment
            const avgEnergy = currentSegment.energySum / currentSegment.count;
            const energyChange = Math.abs(energy - avgEnergy);

            // Start new segment if significant energy change or minimum duration reached
            if ((energyChange > 0.3 && time - currentSegment.start >= minSegmentDuration) ||
                time - currentSegment.start >= 30) {

                segments.push({
                    start: currentSegment.start,
                    end: time,
                    energy: avgEnergy,
                    mood: avgEnergy > 0.7 ? 'high-energy' : avgEnergy > 0.4 ? 'medium-energy' : 'low-energy'
                });

                currentSegment = {
                    start: time,
                    energySum: energy,
                    count: 1
                };
            }
        }

        // Add final segment
        if (currentSegment.count > 0) {
            const avgEnergy = currentSegment.energySum / currentSegment.count;
            segments.push({
                start: currentSegment.start,
                end: duration,
                energy: avgEnergy,
                mood: avgEnergy > 0.7 ? 'high-energy' : avgEnergy > 0.4 ? 'medium-energy' : 'low-energy'
            });
        }

        return segments;

    } catch (e) {
        console.error("Segment detection failed:", e);
        return [];
    }
};
