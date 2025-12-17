/**
 * Analyzes audio buffer to detect clipping (distortion)
 * @param {AudioBuffer} buffer 
 * @returns {Array<{start: number, end: number}>} - Time ranges where clipping occurs
 */
export const detectClipping = (buffer) => {
    const data = buffer.getChannelData(0); // Analyze first channel
    const sampleRate = buffer.sampleRate;
    const clippingThreshold = 0.99; // Near +/- 1.0
    const clippingRegions = [];

    let inClip = false;
    let clipStartSample = 0;

    for (let i = 0; i < data.length; i++) {
        const absVal = Math.abs(data[i]);
        if (absVal >= clippingThreshold) {
            if (!inClip) {
                inClip = true;
                clipStartSample = i;
            }
        } else {
            if (inClip) {
                inClip = false;
                clippingRegions.push({
                    start: clipStartSample / sampleRate,
                    end: i / sampleRate
                });
            }
        }
    }

    // Close open region
    if (inClip) {
        clippingRegions.push({
            start: clipStartSample / sampleRate,
            end: data.length / sampleRate
        });
    }

    return clippingRegions;
};

/**
 * Detects silence in audio buffer
 * @param {AudioBuffer} buffer 
 * @param {number} threshold - Amplitude threshold below which is considered silence (0-1)
 * @param {number} minDuration - Minimum duration in seconds to consider as silence
 * @returns {Array<{start: number, end: number}>}
 */
export const detectSilence = (buffer, threshold = 0.02, minDuration = 0.5) => {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const silenceRegions = [];

    let inSilence = false;
    let silenceStartSample = 0;
    const minSamples = minDuration * sampleRate;

    for (let i = 0; i < data.length; i++) {
        const absVal = Math.abs(data[i]);

        if (absVal < threshold) {
            if (!inSilence) {
                inSilence = true;
                silenceStartSample = i;
            }
        } else {
            if (inSilence) {
                inSilence = false;
                if ((i - silenceStartSample) >= minSamples) {
                    silenceRegions.push({
                        start: silenceStartSample / sampleRate,
                        end: i / sampleRate
                    });
                }
            }
        }
    }

    if (inSilence && (data.length - silenceStartSample) >= minSamples) {
        silenceRegions.push({
            start: silenceStartSample / sampleRate,
            end: data.length / sampleRate
        });
    }

    return silenceRegions;
};

/**
 * Detects beats/peaks in audio buffer
 * @param {AudioBuffer} buffer 
 * @param {number} threshold - Threshold for peak detection
 * @returns {Array<number>} - Array of timestamps for beats
 */
export const detectBeats = (buffer, threshold = 0.8) => {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const beats = [];

    // Analyze using a sliding window to find local maxima
    // Simplistic beat detection based on amplitude spikes
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms window
    let maxInWindow = 0;
    let maxIndex = 0;

    for (let i = 0; i < data.length; i++) {
        const val = Math.abs(data[i]);

        if (val > maxInWindow) {
            maxInWindow = val;
            maxIndex = i;
        }

        if (i % windowSize === 0) {
            if (maxInWindow > threshold) {
                // Ensure we haven't already marked a beat too close
                const time = maxIndex / sampleRate;
                if (beats.length === 0 || (time - beats[beats.length - 1]) > 0.2) {
                    beats.push(time);
                }
            }
            maxInWindow = 0;
        }
    }

    return beats;
};
