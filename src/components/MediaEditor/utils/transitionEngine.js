/**
 * Transition Engine
 * Handles transition rendering and application between clips
 * Supports: Cut, Crossfade, Zoom, Slide, Whip Pan, Glitch, Fade to Black
 */

/**
 * Transition types and their configurations
 */
export const TRANSITION_TYPES = {
    cut: {
        name: 'Cut',
        duration: 0,
        requiresBlending: false
    },
    crossfade: {
        name: 'Crossfade',
        duration: 0.5,
        requiresBlending: true,
        easing: 'ease-in-out'
    },
    zoom: {
        name: 'Zoom',
        duration: 0.3,
        requiresBlending: true,
        easing: 'ease-out'
    },
    slide: {
        name: 'Slide',
        duration: 0.4,
        requiresBlending: false,
        easing: 'ease-in-out'
    },
    whipPan: {
        name: 'Whip Pan',
        duration: 0.2,
        requiresBlending: true,
        easing: 'ease-in'
    },
    glitch: {
        name: 'Glitch',
        duration: 0.15,
        requiresBlending: true,
        easing: 'linear'
    },
    fadeToBlack: {
        name: 'Fade to Black',
        duration: 0.6,
        requiresBlending: true,
        easing: 'ease-in-out'
    }
};

/**
 * Easing functions for smooth transitions
 */
const easingFunctions = {
    linear: t => t,
    'ease-in': t => t * t,
    'ease-out': t => t * (2 - t),
    'ease-in-out': t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    'ease-in-cubic': t => t * t * t,
    'ease-out-cubic': t => (--t) * t * t + 1
};

/**
 * Renders a transition between two clips
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLVideoElement|HTMLImageElement} clipA - Outgoing clip element
 * @param {HTMLVideoElement|HTMLImageElement} clipB - Incoming clip element
 * @param {number} progress - Transition progress (0-1)
 * @param {string} type - Transition type
 * @param {Object} options - Additional options
 */
export const renderTransition = (ctx, clipA, clipB, progress, type = 'crossfade', options = {}) => {
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;

    const transitionConfig = TRANSITION_TYPES[type] || TRANSITION_TYPES.crossfade;
    const easing = easingFunctions[transitionConfig.easing] || easingFunctions.linear;
    const easedProgress = easing(progress);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    switch (type) {
        case 'cut':
            renderCut(ctx, clipA, clipB, progress, width, height);
            break;
        case 'crossfade':
            renderCrossfade(ctx, clipA, clipB, easedProgress, width, height);
            break;
        case 'zoom':
            renderZoom(ctx, clipA, clipB, easedProgress, width, height, options);
            break;
        case 'slide':
            renderSlide(ctx, clipA, clipB, easedProgress, width, height, options);
            break;
        case 'whipPan':
            renderWhipPan(ctx, clipA, clipB, easedProgress, width, height);
            break;
        case 'glitch':
            renderGlitch(ctx, clipA, clipB, easedProgress, width, height);
            break;
        case 'fadeToBlack':
            renderFadeToBlack(ctx, clipA, clipB, easedProgress, width, height);
            break;
        default:
            renderCrossfade(ctx, clipA, clipB, easedProgress, width, height);
    }
};

/**
 * Cut transition (instant switch)
 */
const renderCut = (ctx, clipA, clipB, progress, width, height) => {
    const clip = progress < 0.5 ? clipA : clipB;
    if (clip) {
        ctx.drawImage(clip, 0, 0, width, height);
    }
};

/**
 * Crossfade transition (opacity blend)
 */
const renderCrossfade = (ctx, clipA, clipB, progress, width, height) => {
    // Draw outgoing clip
    if (clipA) {
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(clipA, 0, 0, width, height);
    }

    // Draw incoming clip
    if (clipB) {
        ctx.globalAlpha = progress;
        ctx.drawImage(clipB, 0, 0, width, height);
    }

    ctx.globalAlpha = 1;
};

/**
 * Zoom transition (scale effect)
 */
const renderZoom = (ctx, clipA, clipB, progress, width, height, options = {}) => {
    const direction = options.direction || 'out'; // 'in' or 'out'

    if (direction === 'out') {
        // Zoom out from clipA, zoom in to clipB
        if (clipA) {
            const scale = 1 + progress * 0.3; // Scale up to 1.3x
            const offsetX = (width * scale - width) / 2;
            const offsetY = (height * scale - height) / 2;

            ctx.globalAlpha = 1 - progress;
            ctx.drawImage(clipA, -offsetX, -offsetY, width * scale, height * scale);
        }

        if (clipB) {
            const scale = 0.7 + progress * 0.3; // Scale from 0.7x to 1x
            const offsetX = (width - width * scale) / 2;
            const offsetY = (height - height * scale) / 2;

            ctx.globalAlpha = progress;
            ctx.drawImage(clipB, offsetX, offsetY, width * scale, height * scale);
        }
    } else {
        // Zoom in to clipA, zoom out from clipB
        if (clipA) {
            const scale = 1 - progress * 0.3; // Scale down to 0.7x
            const offsetX = (width - width * scale) / 2;
            const offsetY = (height - height * scale) / 2;

            ctx.globalAlpha = 1 - progress;
            ctx.drawImage(clipA, offsetX, offsetY, width * scale, height * scale);
        }

        if (clipB) {
            const scale = 1.3 - progress * 0.3; // Scale from 1.3x to 1x
            const offsetX = (width * scale - width) / 2;
            const offsetY = (height * scale - height) / 2;

            ctx.globalAlpha = progress;
            ctx.drawImage(clipB, -offsetX, -offsetY, width * scale, height * scale);
        }
    }

    ctx.globalAlpha = 1;
};

/**
 * Slide transition (directional wipe)
 */
const renderSlide = (ctx, clipA, clipB, progress, width, height, options = {}) => {
    const direction = options.direction || 'left'; // 'left', 'right', 'up', 'down'

    let offsetAX = 0, offsetAY = 0, offsetBX = 0, offsetBY = 0;

    switch (direction) {
        case 'left':
            offsetAX = -width * progress;
            offsetBX = width * (1 - progress);
            break;
        case 'right':
            offsetAX = width * progress;
            offsetBX = -width * (1 - progress);
            break;
        case 'up':
            offsetAY = -height * progress;
            offsetBY = height * (1 - progress);
            break;
        case 'down':
            offsetAY = height * progress;
            offsetBY = -height * (1 - progress);
            break;
    }

    // Draw outgoing clip
    if (clipA) {
        ctx.drawImage(clipA, offsetAX, offsetAY, width, height);
    }

    // Draw incoming clip
    if (clipB) {
        ctx.drawImage(clipB, offsetBX, offsetBY, width, height);
    }
};

/**
 * Whip Pan transition (fast blur transition)
 */
const renderWhipPan = (ctx, clipA, clipB, progress, width, height) => {
    // Create blur effect in the middle of transition
    const blurAmount = Math.sin(progress * Math.PI) * 20; // Peak blur at 50%

    if (progress < 0.5) {
        // First half: blur and slide clipA
        if (clipA) {
            ctx.filter = `blur(${blurAmount}px)`;
            const offset = -width * progress * 2;
            ctx.drawImage(clipA, offset, 0, width, height);
            ctx.filter = 'none';
        }
    } else {
        // Second half: slide in and unblur clipB
        if (clipB) {
            ctx.filter = `blur(${blurAmount}px)`;
            const offset = width * (1 - (progress - 0.5) * 2);
            ctx.drawImage(clipB, offset, 0, width, height);
            ctx.filter = 'none';
        }
    }
};

/**
 * Glitch transition (digital distortion)
 */
const renderGlitch = (ctx, clipA, clipB, progress, width, height) => {
    const glitchIntensity = Math.sin(progress * Math.PI); // Peak at 50%

    // Draw base clip
    const baseClip = progress < 0.5 ? clipA : clipB;
    if (baseClip) {
        ctx.drawImage(baseClip, 0, 0, width, height);
    }

    // Add glitch effect
    if (glitchIntensity > 0.3) {
        const sliceCount = 5;
        const sliceHeight = height / sliceCount;

        for (let i = 0; i < sliceCount; i++) {
            const offset = (Math.random() - 0.5) * 50 * glitchIntensity;
            const y = i * sliceHeight;

            // Get slice from base clip
            if (baseClip) {
                ctx.drawImage(
                    baseClip,
                    0, y, width, sliceHeight,
                    offset, y, width, sliceHeight
                );
            }
        }

        // Add RGB split effect
        if (Math.random() > 0.5) {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.3;

            if (baseClip) {
                // Red channel offset
                ctx.drawImage(baseClip, -5 * glitchIntensity, 0, width, height);
                // Blue channel offset
                ctx.drawImage(baseClip, 5 * glitchIntensity, 0, width, height);
            }

            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }
    }
};

/**
 * Fade to Black transition (fade out then fade in)
 */
const renderFadeToBlack = (ctx, clipA, clipB, progress, width, height) => {
    if (progress < 0.5) {
        // First half: fade out clipA to black
        if (clipA) {
            ctx.drawImage(clipA, 0, 0, width, height);
            ctx.fillStyle = 'black';
            ctx.globalAlpha = progress * 2;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;
        }
    } else {
        // Second half: fade in clipB from black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        if (clipB) {
            ctx.globalAlpha = (progress - 0.5) * 2;
            ctx.drawImage(clipB, 0, 0, width, height);
            ctx.globalAlpha = 1;
        }
    }
};

/**
 * Calculates optimal transition duration based on tempo
 * @param {string} type - Transition type
 * @param {number} tempo - BPM
 * @returns {number} Duration in seconds
 */
export const getTransitionDuration = (type, tempo = 120) => {
    const baseConfig = TRANSITION_TYPES[type];
    if (!baseConfig) return 0.5;

    // For beat-synced transitions, align to beat fractions
    if (type === 'cut') return 0;

    const beatDuration = 60 / tempo; // Duration of one beat

    // Use fractions of beats for musical timing
    const beatFractions = {
        whipPan: beatDuration / 4,      // 1/4 beat
        glitch: beatDuration / 8,        // 1/8 beat
        zoom: beatDuration / 2,          // 1/2 beat
        slide: beatDuration / 2,         // 1/2 beat
        crossfade: beatDuration,         // 1 beat
        fadeToBlack: beatDuration * 2    // 2 beats
    };

    return beatFractions[type] || baseConfig.duration;
};

/**
 * Applies transition metadata to clips
 * @param {Object} clipA - Outgoing clip
 * @param {Object} clipB - Incoming clip
 * @param {string} type - Transition type
 * @param {number} duration - Transition duration
 * @param {Object} options - Additional options
 */
export const applyTransitionToClips = (clipA, clipB, type, duration, options = {}) => {
    const transitionData = {
        type,
        duration,
        options,
        timestamp: clipA.startTime + clipA.duration
    };

    // Store transition on the outgoing clip
    if (!clipA.transitions) {
        clipA.transitions = [];
    }
    clipA.transitions.push(transitionData);

    return transitionData;
};

/**
 * Checks if a transition is currently active at a given time
 * @param {Object} clip - Clip with transition data
 * @param {number} currentTime - Current playback time
 * @returns {Object|null} Active transition or null
 */
export const getActiveTransition = (clip, currentTime) => {
    if (!clip.transitions || clip.transitions.length === 0) return null;

    const clipEndTime = clip.startTime + clip.duration;

    for (const transition of clip.transitions) {
        const transitionStart = clipEndTime - transition.duration;
        const transitionEnd = clipEndTime;

        if (currentTime >= transitionStart && currentTime < transitionEnd) {
            const progress = (currentTime - transitionStart) / transition.duration;
            return {
                ...transition,
                progress,
                isActive: true
            };
        }
    }

    return null;
};

/**
 * Selects random transition direction for slide/zoom
 */
export const getRandomDirection = (type) => {
    if (type === 'slide') {
        const directions = ['left', 'right', 'up', 'down'];
        return directions[Math.floor(Math.random() * directions.length)];
    }
    if (type === 'zoom') {
        return Math.random() > 0.5 ? 'in' : 'out';
    }
    return null;
};
