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

    // Iterate tracks in Reverse Order (Draw Bottom Tracks first, Top Tracks last)
    // Track 0 is Top (Adjustment), Track N is Bottom (Sticker)
    // We want to draw Sticker -> Text -> Audio -> Video -> Adjustment
    // So we iterate tracks backwards.
    [...tracks].reverse().forEach((track, reverseIndex) => {
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
            zIndex: track.id === 'track-adjustment-1' ? 999 : (tracks.length - 1 - reverseIndex),
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
            visibleLayers.push({
                ...baseLayer,
                type: 'text',
                text: clip.text || 'Text',
                x: getVal('x', clip.style?.x || 50),
                y: getVal('y', clip.style?.y || 50),
                fontSize: getVal('scale', clip.style?.fontSize || 48), // Text scale maps to fontSize? Or explicit scale? standardizing on fontSize for now
                fontFamily: clip.style?.fontFamily || 'Arial',
                fontWeight: clip.style?.fontWeight || 'bold',
                color: clip.style?.color || '#ffffff',
                rotation: getVal('rotation', clip.style?.rotation || 0),
            });
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
            const isMainSource = clip.source === mediaUrl;

            // Scenario 1: It's the main media, and we have a shared element for it
            if (isMainSource && isVideo && clip.id === activeMainClip?.id) {
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
