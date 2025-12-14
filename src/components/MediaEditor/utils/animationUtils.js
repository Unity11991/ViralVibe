/**
 * Animation Utilities
 * Handles interpolation between keyframes for motion properties.
 */

// Easing Functions
export const easings = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => t * (2 - t),
    easeInOut: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};

/**
 * Interpolate a value at a specific time based on keyframes.
 * @param {number} currentTime - The current playback time (relative to clip start or global?)
 *                               Usually we store keyframes relative to clip start (0 = start of clip).
 * @param {Array} keyframes - Array of { time, value, easing } objects. Sorted by time.
 * @param {any} defaultValue - Fallback value if no keyframes.
 * @returns {number} - The interpolated value.
 */
export const interpolateProperty = (currentTime, keyframes, defaultValue) => {
    if (!keyframes || keyframes.length === 0) return defaultValue;

    // Sort to be safe (though usually we assume sorted)
    // Optimization: Should be sorted on storage.
    // const sorted = [...keyframes].sort((a, b) => a.time - b.time); 
    const sorted = keyframes;

    // 1. Before first keyframe
    if (currentTime <= sorted[0].time) {
        return sorted[0].value;
    }

    // 2. After last keyframe
    if (currentTime >= sorted[sorted.length - 1].time) {
        return sorted[sorted.length - 1].value;
    }

    // 3. Between keyframes
    // Find the segment [k1, k2] where k1.time <= t < k2.time
    for (let i = 0; i < sorted.length - 1; i++) {
        const k1 = sorted[i];
        const k2 = sorted[i + 1];

        if (currentTime >= k1.time && currentTime < k2.time) {
            const range = k2.time - k1.time;
            if (range === 0) return k1.value;

            // Normalized progress (0 to 1)
            let t = (currentTime - k1.time) / range;

            // Apply easing
            const easingFunc = easings[k2.easing || 'linear'] || easings.linear;
            t = easingFunc(t);

            // Interpolate
            return k1.value + (k2.value - k1.value) * t;
        }
    }

    return defaultValue;
};
