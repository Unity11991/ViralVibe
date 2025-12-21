import { useCallback, useRef } from 'react';

/**
 * Hook to handle frame composition logic
 * Calculates which layers are visible, handles transitions, and z-indexing
 */

/**
 * Standalone Utility for calculating visible layers
 * Can be used by hooks (useRenderLogic) and non-hook utilities (useExport)
 */
export const getVisibleLayers = (tracks, currentTime) => {
    let layers = [];

    // Helper for Reverse Layering Logic
    const isReverseLayering = (type) => {
        const reverseTypes = [
            'iris_circle_out',
            'zoom_out',
            'wipe_out', // fictional generic
            'slide_out' // fictional generic
        ];
        return type && (type.includes('_out') || reverseTypes.includes(type));
    };

    // 1. Process Video/Image/Text Tracks
    tracks.forEach(track => {
        if (track.muted) return;
        if (track.type === 'audio') return;

        // Find current clip(s)
        for (let i = 0; i < track.clips.length; i++) {
            const clip = track.clips[i];
            const clipEnd = clip.startTime + clip.duration;

            // Check basic visibility
            if (currentTime >= clip.startTime && currentTime < clipEnd) {

                const nextClip = track.clips[i + 1];
                let isInTransition = false;
                let transitionProgress = 0;
                let activeTransition = null;

                // Handling Entry Transition (This clip entering over previous)
                if (clip.transition && i > 0) {
                    const prevClip = track.clips[i - 1];
                    const transDur = clip.transition.duration || 1.0;
                    const transStart = clip.startTime;
                    const transEnd = clip.startTime + transDur;

                    if (currentTime >= transStart && currentTime < transEnd) {
                        transitionProgress = (currentTime - transStart) / transDur;
                        activeTransition = { ...clip.transition, progress: transitionProgress };
                    }
                }

                // Prepare Layer Object
                layers.push({
                    ...clip,
                    isCurrent: true,
                    transition: activeTransition,
                    zIndex: track.type === 'text' ? 100 : (track.type === 'sticker' ? 50 : 10)
                });
            }

            // EXTENDED VISIBILITY CHECK (For previous clips being covered by a transition)
            const nextClipSameTrack = track.clips[i + 1];
            if (nextClipSameTrack && nextClipSameTrack.transition) {
                const transDur = nextClipSameTrack.transition.duration || 1.0;

                if (currentTime >= nextClipSameTrack.startTime && currentTime < nextClipSameTrack.startTime + transDur) {
                    // This clip is the "Outgoing" clip of the transition
                    const transType = nextClipSameTrack.transition.type;
                    const reverseLayering = isReverseLayering(transType);

                    layers.push({
                        ...clip,
                        isOutgoing: true,
                        zIndex: reverseLayering ? 20 : 5
                    });
                }
            }
        }
    });

    // Sort by Z-Index
    layers.sort((a, b) => a.zIndex - b.zIndex);

    return layers;
};

/**
 * Hook to handle frame composition logic
 */
export const useRenderLogic = (tracks) => {

    // Memoized wrapper around the utility
    const getVisibleLayersAtTime = useCallback((currentTime) => {
        return getVisibleLayers(tracks, currentTime);
    }, [tracks]);

    return {
        getVisibleLayersAtTime
    };
};
