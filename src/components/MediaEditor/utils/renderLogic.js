import { getInitialAdjustments } from './filterUtils';
import { interpolateProperty, applyAnimation } from './animationUtils';
import mediaSourceManager from './MediaSourceManager';

/**
 * Calculate the state of the current frame based on the timeline
 * @param {number} currentTime - Current playback time in seconds
 * @param {Array} tracks - Timeline tracks
 * @param {Object} globalState - Global editor state
 * @returns {Object} Frame state object ready for renderFrame
 */
const EPSILON = 0.01;

export const getFrameState = (currentTime, tracks, globalState = {}) => {
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

    // Find active clip on main track for global context
    const mainTrack = tracks.find(t => t.id === 'track-main');
    const activeMainClip = mainTrack?.clips.find(c =>
        currentTime >= c.startTime && currentTime < (c.startTime + c.duration + EPSILON)
    );

    const visibleLayers = [];

    tracks.forEach((track, index) => {
        // Find active clip in this track
        const clip = track.clips.find(c =>
            currentTime >= c.startTime && currentTime < (c.startTime + c.duration + EPSILON)
        );

        if (!clip) return;

        // Calculate clip-relative time
        const clipTime = currentTime - clip.startTime;
        const sourceTime = (clip.startOffset || 0) + clipTime;

        // Resolve Media via Manager
        let media = null;
        if (clip.source) {
            const trackType = track.type === 'audio' ? 'audio' : (track.type === 'image' ? 'image' : 'video');
            media = mediaSourceManager.getMedia(clip.source, clip.type || trackType);
        }

        // Common Layer Properties
        const baseLayer = {
            id: clip.id,
            zIndex: index,
            opacity: clip.opacity !== undefined ? clip.opacity : 100,
            blendMode: clip.blendMode || 'normal',
            startTime: clip.startTime,
            duration: clip.duration,
            type: clip.type || (track.type === 'text' ? 'text' : (track.type === 'adjustment' ? 'adjustment' : 'video')),
            media: media,
            source: clip.source,
            sourceTime: sourceTime // Store actual time on source for sync
        };

        const keyframes = clip.keyframes || {};

        // Helper to get animated value
        const getVal = (prop, fallback) => {
            if (keyframes[prop] && keyframes[prop].length > 0) {
                return interpolateProperty(clipTime, keyframes[prop], fallback);
            }
            return fallback;
        };

        // --- TRANSITION LOGIC ---
        let transitionObj = null;
        let transitionOpacity = 1;

        if (clip.transition && clip.transition.type !== 'none' && clip.transition.duration > 0) {
            const transDuration = clip.transition.duration;
            if (clipTime < transDuration) {
                transitionObj = {
                    type: clip.transition.type,
                    progress: clipTime / transDuration,
                    duration: transDuration
                };

                // Find Previous Clip (Outgoing)
                // We need to render the previous clip underneath this one
                const prevClip = track.clips.find(c => Math.abs((c.startTime + c.duration) - clip.startTime) < EPSILON * 10);

                if (prevClip) {
                    // Resolve Previous Media
                    let prevMedia = null;
                    if (prevClip.source) {
                        const trackType = track.type === 'audio' ? 'audio' : (track.type === 'image' ? 'image' : 'video');
                        prevMedia = mediaSourceManager.getMedia(prevClip.source, prevClip.type || trackType);
                    }

                    const prevClipTime = currentTime - prevClip.startTime;
                    // Clamp to duration for freeze frame at the cut point
                    // Note: We freeze at duration. If moving backwards, we might want live media, but standard transition is B over A(end).
                    const prevSourceTime = (prevClip.startOffset || 0) + Math.min(prevClipTime, prevClip.duration);

                    visibleLayers.push({
                        id: prevClip.id + '_outgoing',
                        zIndex: index - 0.5, // Render below current
                        opacity: prevClip.opacity !== undefined ? prevClip.opacity : 100,
                        blendMode: prevClip.blendMode || 'normal',
                        type: prevClip.type || baseLayer.type,
                        media: prevMedia,
                        source: prevClip.source,
                        sourceTime: prevSourceTime,
                        transform: {
                            x: prevClip.transform?.x || 0,
                            y: prevClip.transform?.y || 0,
                            scale: prevClip.transform?.scale || 100,
                            rotation: prevClip.transform?.rotation || 0,
                            opacity: prevClip.opacity !== undefined ? prevClip.opacity : 100
                        },
                        adjustments: prevClip.adjustments || getInitialAdjustments(),
                        filter: prevClip.filter || 'normal',
                        effect: prevClip.effect || null,
                        mask: prevClip.mask || null,
                        text: prevClip.text,
                        style: prevClip.style,
                        faceRetouch: prevClip.faceRetouch
                    });
                }
            }
        }

        // Base Transform
        const activeOpacity = getVal('opacity', baseLayer.opacity) * transitionOpacity;

        const animatedProps = {
            x: getVal('x', clip.transform?.x || (track.type === 'text' ? 50 : 0)),
            y: getVal('y', clip.transform?.y || (track.type === 'text' ? 50 : 0)),
            scale: getVal('scale', clip.transform?.scale || (track.type === 'text' ? clip.style?.fontSize || 48 : 100)),
            rotation: getVal('rotation', clip.transform?.rotation || 0),
            opacity: activeOpacity
        };

        // Apply Preset Animation
        if (clip.animation && clip.animation.type !== 'none') {
            const animDuration = clip.animation.duration || 1.0;
            const animType = clip.animation.type;
            let progress = 0;
            const isOut = animType.toLowerCase().includes('out');

            if (isOut) {
                const startTime = clip.duration - animDuration;
                if (clipTime >= startTime) {
                    progress = (clipTime - startTime) / animDuration;
                    Object.assign(animatedProps, applyAnimation(animatedProps, animType, Math.min(1, progress)));
                }
            } else if (clipTime <= animDuration) {
                progress = clipTime / animDuration;
                Object.assign(animatedProps, applyAnimation(animatedProps, animType, Math.min(1, progress)));
            }
        }

        // Final Layer Assembly
        const layer = {
            ...baseLayer,
            ...animatedProps,
            transform: {
                ...animatedProps,
                blendMode: clip.blendMode || 'normal'
            },
            adjustments: clip.adjustments || getInitialAdjustments(),
            filter: clip.filter || 'normal',
            effect: clip.effect || null,
            mask: clip.mask || null,
            text: clip.text,
            style: clip.style,
            faceRetouch: clip.faceRetouch,
            transition: transitionObj // Attach fully resolved transition object
        };

        if (layer.type === 'text' && clip.animation?.type === 'typewriter') {
            const animDuration = clip.animation.duration || 1.0;
            const progress = Math.min(1, clipTime / animDuration);
            layer.text = (layer.text || '').substring(0, Math.floor(progress * layer.text.length));
        }

        visibleLayers.push(layer);
    });

    return {
        visibleLayers,
        canvasDimensions,
        activeOverlayId: selectedClipId,
        memePadding: memeMode ? 0.3 : 0,
        hasActiveClip: visibleLayers.length > 0,
        // Fallback/Legacy
        adjustments: activeMainClip?.adjustments || initialAdjustments,
        activeEffectId: activeMainClip?.effect || activeEffectId,
        activeFilterId: activeMainClip?.filter || activeFilterId || 'normal',
    };
};
