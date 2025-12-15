/**
 * Render Logic Utility
 * Shared logic for calculating the visual state of the frame for both Editor and Export
 */

import { getInitialAdjustments } from './filterUtils';
import { interpolateProperty } from './animationUtils';

/**
 * Calculate the state of the current frame based on the timeline
 * @param {number} currentTime - Current playback time in seconds
 * @param {Array} tracks - Timeline tracks
 * @param {Object} mediaResources - References to media elements { mediaElement, videoElements, imageElements }
 * @param {Object} globalState - Global editor state { canvasDimensions, rotation, zoom, memeMode, selectedClipId, initialAdjustments }
 * @returns {Object} Frame state object ready for renderFrame
 */
export const getFrameState = (currentTime, tracks, mediaResources, globalState) => {
    const {
        mediaElement, // Main shared video element (ref.current)
        videoElements = {}, // Map of clipId -> video element (ref.current)
        imageElements = {}, // Map of clipId -> image element (ref.current)
        mediaUrl,      // Main media URL
        isVideo
    } = mediaResources || {}; // Handle null mediaResources

    const {
        canvasDimensions,
        rotation = 0,
        zoom = 1,
        memeMode = false,
        selectedClipId = null,
        initialAdjustments = getInitialAdjustments(),
        effectIntensity = 50,
        activeEffectId = null,
        activeFilterId = null
    } = globalState;

    // Find active clip on main track for global context (filters/effects logic fallback)
    const mainTrack = tracks.find(t => t.id === 'track-main');
    const activeMainClip = mainTrack?.clips.find(c =>
        currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
    );

    // Create Unified Layer List
    const visibleLayers = [];

    // Iterate tracks in Normal Order (Draw Bottom Tracks first, Top Tracks last)
    // Track 0 is Bottom (Background), Track N is Top (Foreground)
    tracks.forEach((track, index) => {
        // Find active clip in this track
        const clip = track.clips.find(c =>
            currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
        );

        if (!clip) return;

        // Common Layer Properties
        // Note: zIndex logic might need adjustment if used for sorting elsewhere, 
        // but renderFrame uses array order.
        const baseLayer = {
            id: clip.id,
            zIndex: index,
            // We keep original index semblance or just rely on array order.
            opacity: clip.opacity !== undefined ? clip.opacity : 100,
            blendMode: clip.blendMode || 'normal',
            startTime: clip.startTime,
            duration: clip.duration
        };

        // Calculate Animation State
        const clipTime = currentTime - clip.startTime;
        const keyframes = clip.keyframes || {};

        // Helper to get animated value or fallback
        const getVal = (prop, fallback) => {
            if (keyframes[prop] && keyframes[prop].length > 0) {
                return interpolateProperty(clipTime, keyframes[prop], fallback);
            }
            return fallback;
        };

        // Base Transform (Active Values for this Frame)
        // These override static clip properties
        const activeOpacity = getVal('opacity', baseLayer.opacity);

        // Apply Opacity override
        baseLayer.opacity = activeOpacity;

        if (track.type === 'text') {
            const textLayer = {
                ...baseLayer,
                type: 'text',
                text: clip.text || 'Text',
                x: getVal('x', clip.style?.x || 50),
                y: getVal('y', clip.style?.y || 50),
                fontSize: getVal('scale', clip.style?.fontSize || 48),
                fontFamily: clip.style?.fontFamily || 'Arial',
                fontWeight: clip.style?.fontWeight || 'bold',
                color: clip.style?.color || '#ffffff',
                rotation: getVal('rotation', clip.style?.rotation || 0),
            };

            // Apply Text Animations
            if (clip.animation && clip.animation.type !== 'none') {
                const animDuration = clip.animation.duration || 1.0;
                const progress = Math.min(1, Math.max(0, clipTime / animDuration));

                switch (clip.animation.type) {
                    case 'typewriter':
                        textLayer.text = textLayer.text.substring(0, Math.floor(progress * textLayer.text.length));
                        break;
                    case 'fadeIn':
                        textLayer.opacity = (textLayer.opacity / 100) * progress * 100;
                        break;
                    case 'slideIn': // From Left
                        // Assuming 50 is center, 0 is left. Start from -50?
                        // Let's assume standard percent coordinates.
                        const startX = -20;
                        textLayer.x = startX + (textLayer.x - startX) * (1 - Math.pow(1 - progress, 3)); // Ease Out Cubic
                        textLayer.opacity = progress * 100;
                        break;
                    case 'slideUp': // From Bottom
                        const startY = 120;
                        textLayer.y = startY + (textLayer.y - startY) * (1 - Math.pow(1 - progress, 3));
                        textLayer.opacity = progress * 100;
                        break;
                    case 'bounce':
                        // Simple bounce effect scaling up
                        const bounce = (t) => {
                            if (t < (1 / 2.75)) return 7.5625 * t * t;
                            else if (t < (2 / 2.75)) return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
                            else if (t < (2.5 / 2.75)) return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
                            else return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
                        };
                        // This is bounce ease out, typically used for falling.
                        // For "Pop In" bounce:
                        const elastic = (x) => {
                            const c4 = (2 * Math.PI) / 3;
                            return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
                        }
                        textLayer.fontSize *= elastic(progress);
                        break;
                }
            }

            visibleLayers.push(textLayer);
        } else if (track.type === 'sticker') {
            // New Sticker Logic: Treat as Image/Video Layer
            let media = null;
            const isAnimated = clip.isAnimated;

            if (isAnimated) {
                // Try video cache
                media = videoElements && videoElements[clip.id];
                if (!media && clip.source) {
                    const v = document.createElement('video');
                    v.src = clip.source;
                    v.crossOrigin = 'anonymous';
                    media = v;
                }
            } else {
                // Try image cache
                media = imageElements && imageElements[clip.id];
                if (!media && (clip.source || clip.thumbnail)) {
                    const img = new Image();
                    img.src = clip.source || clip.thumbnail;
                    media = img;
                }
            }

            if (media) {
                visibleLayers.push({
                    ...baseLayer,
                    type: isAnimated ? 'video' : 'image', // Use robust renderer
                    media: media,
                    adjustments: clip.adjustments || getInitialAdjustments(),
                    filter: clip.filter || 'normal',
                    effect: clip.effect || null,
                    transform: {
                        ...(clip.transform || {
                            x: 0, y: 0, scale: 100, rotation: 0
                        }),
                        blendMode: clip.blendMode || 'normal'
                    },
                    mask: clip.mask || null
                });
            }
        } else if (track.type === 'adjustment') {
            visibleLayers.push({
                ...baseLayer,
                type: 'adjustment',
                adjustments: clip.adjustments || {}
            });
        } else if (track.type === 'video' || track.type === 'image') {
            // Resolve Media Element
            let media = null;
            // Scenario 1: It's the active clip on the main track, so we use the shared main media element
            // (MediaEditor.jsx ensures this element is synced to the active clip's source)
            if (isVideo && clip.id === activeMainClip?.id && track.id === 'track-main') {
                media = mediaElement;
            }

            // Scenario 2: Fallback to individual element (Secondary video or Image or Main not active)
            if (!media) {
                if (clip.type === 'image') {
                    // Check cache passed in
                    media = imageElements && imageElements[clip.id];

                    // Note: If not in cache, we can't create it synchronously here nicely.
                    // The caller should ensure elements are loaded or we return null/placeholder.
                    // For export, we MUST ensure they are loaded.
                    if (!media && clip.source) {
                        const img = new Image();
                        img.src = clip.source;
                        media = img;
                    }
                } else {
                    // Video
                    media = videoElements && videoElements[clip.id];
                    if (!media && clip.source) {
                        const v = document.createElement('video');
                        v.src = clip.source;
                        v.crossOrigin = 'anonymous';
                        media = v;
                    }
                }
            }

            if (media) {
                // Calculate Transition
                let transition = null;
                if (clip.transition && clip.transition.type !== 'none') {
                    const tDur = clip.transition.duration || 1.0;
                    const tTime = currentTime - clip.startTime;
                    if (tTime < tDur) {
                        transition = { ...clip.transition, progress: tTime / tDur };
                    }
                }

                visibleLayers.push({
                    ...baseLayer,
                    type: clip.type || 'video',
                    media: media,
                    adjustments: clip.adjustments || getInitialAdjustments(),
                    filter: clip.filter || 'normal',
                    effect: clip.effect || null,
                    transform: {
                        ...(clip.transform || { rotation, zoom }),
                        // Override with animated values
                        x: getVal('x', clip.transform?.x || 0),
                        y: getVal('y', clip.transform?.y || 0),
                        scale: getVal('scale', clip.transform?.scale || 100),
                        rotation: getVal('rotation', clip.transform?.rotation || 0),
                        blendMode: clip.blendMode || 'normal'
                    },
                    mask: clip.mask || null,
                    transition: transition
                });
            }
        }
    });

    return {
        visibleLayers,
        // Legacy props potentially needed by renderFrame (or we clean renderFrame to only use visibleLayers)
        visibleClips: [],
        textOverlays: [],
        stickers: [],
        adjustments: activeMainClip?.adjustments || initialAdjustments,
        transform: { rotation, zoom },
        canvasDimensions,
        activeOverlayId: selectedClipId,
        memePadding: memeMode ? 0.3 : 0,
        activeEffectId: activeMainClip?.effect || activeEffectId, // Active clip takes precedence
        effectIntensity,
        activeFilterId: activeMainClip?.filter || activeFilterId || 'normal',
        hasActiveClip: visibleLayers.length > 0
    };
};
