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

/**
 * Apply preset animation to layer properties
 * @param {Object} props - Current properties { x, y, scale, rotation, opacity }
 * @param {string} type - Animation ID
 * @param {number} progress - Animation progress (0 to 1)
 * @returns {Object} - Modified properties
 */
export const applyAnimation = (props, type, progress) => {
    const p = props;
    const t = progress;
    const invT = 1 - t;

    // Helper easings
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeOutBack = t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const easeInBack = t => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    };
    const easeOutElastic = t => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    };

    switch (type) {
        // --- IN ANIMATIONS ---
        case 'fadeIn':
            return { ...p, opacity: p.opacity * t };
        case 'scaleIn':
            return { ...p, scale: p.scale * t, opacity: p.opacity * t };
        case 'slideInLeft':
            return { ...p, x: p.x - (100 * invT), opacity: p.opacity * t };
        case 'slideInRight':
            return { ...p, x: p.x + (100 * invT), opacity: p.opacity * t };
        case 'slideInUp':
            return { ...p, y: p.y + (100 * invT), opacity: p.opacity * t };
        case 'slideInDown':
            return { ...p, y: p.y - (100 * invT), opacity: p.opacity * t };
        case 'rotateIn':
            return { ...p, rotation: p.rotation - (200 * invT), opacity: p.opacity * t };
        case 'rotateInCw':
            return { ...p, rotation: p.rotation - (180 * invT), opacity: p.opacity * t };
        case 'rotateInCcw':
            return { ...p, rotation: p.rotation + (180 * invT), opacity: p.opacity * t };
        case 'bounceIn':
            {
                const b = easeOutBack(t);
                return { ...p, scale: p.scale * b, opacity: p.opacity * t };
            }
        case 'elasticIn':
            {
                const e = easeOutElastic(t);
                return { ...p, scale: p.scale * e, opacity: p.opacity * t };
            }
        case 'flipInX':
            return { ...p, scale: p.scale * Math.abs(Math.cos(invT * Math.PI / 2)), opacity: p.opacity * t }; // Simplified flip via scale
        case 'flipInY':
            // Since we don't have 3D scaleX/Y separation in this simple prop set, we simulate with scale
            // Ideally we'd need scaleX/scaleY. For now, just scale.
            return { ...p, scale: p.scale * t, opacity: p.opacity * t };
        case 'zoomIn':
            return { ...p, scale: p.scale * t, opacity: p.opacity * t };
        case 'zoomInUp':
            return { ...p, scale: p.scale * t, y: p.y + (100 * invT), opacity: p.opacity * t };
        case 'zoomInDown':
            return { ...p, scale: p.scale * t, y: p.y - (100 * invT), opacity: p.opacity * t };
        case 'zoomInLeft':
            return { ...p, scale: p.scale * t, x: p.x - (100 * invT), opacity: p.opacity * t };
        case 'zoomInRight':
            return { ...p, scale: p.scale * t, x: p.x + (100 * invT), opacity: p.opacity * t };
        case 'rollIn':
            return { ...p, x: p.x - (100 * invT), rotation: p.rotation - (120 * invT), opacity: p.opacity * t };
        case 'lightSpeedInRight':
            return { ...p, x: p.x + (100 * invT), rotation: p.rotation - (30 * invT), opacity: p.opacity * t }; // Skew simulated with rotation

        // --- OUT ANIMATIONS ---
        // For OUT, progress goes 0->1, but we want effect to happen at end.
        // Usually OUT animations run from (1-duration) to 1.
        // But here 'progress' is passed as 0->1 for the duration of the animation.
        // So t=0 is start of exit, t=1 is fully gone.
        case 'fadeOut':
            return { ...p, opacity: p.opacity * invT };
        case 'scaleOut':
            return { ...p, scale: p.scale * invT, opacity: p.opacity * invT };
        case 'slideOutLeft':
            return { ...p, x: p.x - (100 * t), opacity: p.opacity * invT };
        case 'slideOutRight':
            return { ...p, x: p.x + (100 * t), opacity: p.opacity * invT };
        case 'slideOutUp':
            return { ...p, y: p.y - (100 * t), opacity: p.opacity * invT };
        case 'slideOutDown':
            return { ...p, y: p.y + (100 * t), opacity: p.opacity * invT };
        case 'rotateOut':
            return { ...p, rotation: p.rotation + (200 * t), opacity: p.opacity * invT };
        case 'rotateOutCw':
            return { ...p, rotation: p.rotation + (180 * t), opacity: p.opacity * invT };
        case 'rotateOutCcw':
            return { ...p, rotation: p.rotation - (180 * t), opacity: p.opacity * invT };
        case 'bounceOut':
            {
                // Inverse bounce
                const b = easeInBack(t);
                return { ...p, scale: p.scale * (1 - t), opacity: p.opacity * invT };
            }
        case 'elasticOut':
            return { ...p, scale: p.scale * (1 - t), opacity: p.opacity * invT };
        case 'zoomOut':
            return { ...p, scale: p.scale * invT, opacity: p.opacity * invT };
        case 'zoomOutUp':
            return { ...p, scale: p.scale * invT, y: p.y - (100 * t), opacity: p.opacity * invT };
        case 'zoomOutDown':
            return { ...p, scale: p.scale * invT, y: p.y + (100 * t), opacity: p.opacity * invT };
        case 'zoomOutLeft':
            return { ...p, scale: p.scale * invT, x: p.x - (100 * t), opacity: p.opacity * invT };
        case 'zoomOutRight':
            return { ...p, scale: p.scale * invT, x: p.x + (100 * t), opacity: p.opacity * invT };
        case 'rollOut':
            return { ...p, x: p.x + (100 * t), rotation: p.rotation + (120 * t), opacity: p.opacity * invT };
        case 'lightSpeedOutRight':
            return { ...p, x: p.x + (100 * t), rotation: p.rotation - (30 * t), opacity: p.opacity * invT };

        // --- COMBO / LOOP ANIMATIONS ---
        // These usually run throughout or loop. Here we assume one-shot for the duration.
        case 'pulse':
            {
                const s = 1 + (Math.sin(t * Math.PI * 2) * 0.1);
                return { ...p, scale: p.scale * s };
            }
        case 'shake':
            {
                const x = Math.sin(t * Math.PI * 10) * 10;
                return { ...p, x: p.x + x };
            }
        case 'swing':
            {
                const r = Math.sin(t * Math.PI * 2) * 15;
                return { ...p, rotation: p.rotation + r };
            }
        case 'tada':
            {
                const s = 1 + (Math.sin(t * Math.PI * 4) * 0.1);
                const r = Math.sin(t * Math.PI * 4) * 3;
                return { ...p, scale: p.scale * s, rotation: p.rotation + r };
            }
        case 'wobble':
            {
                const x = Math.sin(t * Math.PI * 4) * 20 * (1 - t);
                const r = Math.sin(t * Math.PI * 4) * 5 * (1 - t);
                return { ...p, x: p.x + x, rotation: p.rotation + r };
            }
        case 'jello':
            // Skew simulation via rotation/scale combo? Hard in 2D canvas without skew.
            // Just wobble scale
            const sx = 1 + Math.sin(t * Math.PI * 6) * 0.1 * (1 - t);
            const sy = 1 + Math.cos(t * Math.PI * 6) * 0.1 * (1 - t);
            return { ...p, scale: p.scale * sx }; // Simplified
        case 'heartbeat':
            const h = 1 + (Math.sin(t * Math.PI * 6) * 0.2 * Math.abs(Math.sin(t * Math.PI)));
            return { ...p, scale: p.scale * h };
        case 'flash':
            const o = Math.abs(Math.sin(t * Math.PI * 4));
            return { ...p, opacity: p.opacity * o };
        case 'rubberBand':
            const rb = 1 + (Math.sin(t * Math.PI * 2) * 0.3 * (1 - t));
            return { ...p, scale: p.scale * rb }; // Simplified
        case 'headShake':
            const hs = Math.sin(t * Math.PI * 4) * 6 * (1 - t);
            return { ...p, x: p.x + hs, rotation: p.rotation + (hs * 0.5) };

        default:
            return p;
    }
};
