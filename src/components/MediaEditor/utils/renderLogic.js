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
        // --- Professional Transition Logic (A/B Roll) ---
        // We define two potential active clips per track:
        // 1. Primary: The clip that "owns" this timeslot.
        // 2. Outgoing: The clip that is fading out (if Primary has an entry transition).

        // Identify Primary Clip (Incoming/Current)
        const primaryClip = track.clips.find(c =>
            currentTime >= c.startTime && currentTime < (c.startTime + c.duration + EPSILON)
        );

        const activeClipsToRender = [];

        if (primaryClip) {
            // Push Primary with standard role
            activeClipsToRender.push({
                clip: primaryClip,
                role: 'primary',
                transition: null
            });
        }

        // --- CENTERED TRANSITION LOGIC ---
        // Verify if we are in the "Pre-Roll" of a clip (Transitioning IN centered on cut)
        // Checks for: Clip starting soon that has a transition

        // Find a clip that starts in the future, where (startTime - duration/2) <= currentTime < startTime
        const incomingPreClip = track.clips.find(c => {
            if (!c.transition || c.transition.duration <= 0) return false;
            const halfDur = c.transition.duration / 2;
            const startWindow = c.startTime - halfDur;
            const endWindow = c.startTime; // We only care about the pre-roll part here
            return currentTime >= startWindow && currentTime < endWindow;
        });

        if (incomingPreClip) {
            // We found a clip that is transitioning "IN" right now (Pre-Roll).
            const transDur = incomingPreClip.transition.duration;
            const halfDur = transDur / 2;
            const relativeTime = currentTime - (incomingPreClip.startTime - halfDur);
            const progress = relativeTime / transDur;

            // Render this Incoming Clip (B-Roll)
            // It is technically NOT primary yet, but we force it visible.
            activeClipsToRender.push({
                clip: incomingPreClip,
                role: 'incoming_preroll',
                transition: {
                    type: incomingPreClip.transition.type,
                    progress: progress
                }
            });

            // Find Outgoing Clip (The one we are transitioning FROM)
            const prevClip = track.clips.find(c =>
                Math.abs((c.startTime + c.duration) - incomingPreClip.startTime) < 0.1
            );

            if (prevClip) {
                // Ensure Outgoing is rendered (it technically IS primary during pre-roll if we are before the cut)
                // If we are in pre-roll, prevClip IS the primaryClip (usually).
                const isAlreadyRendered = activeClipsToRender.some(e => e.clip.id === prevClip.id);
                if (!isAlreadyRendered) {
                    activeClipsToRender.push({
                        clip: prevClip,
                        role: 'outgoing',
                        transition: {
                            type: incomingPreClip.transition.type,
                            progress: progress
                        }
                    });
                } else {
                    // It is already rendered as Primary.
                    // Update it to have the transition so it animates out!
                    const entry = activeClipsToRender.find(e => e.clip.id === prevClip.id);
                    if (entry) {
                        entry.transition = {
                            type: incomingPreClip.transition.type,
                            progress: progress
                        };
                    }
                }
            }
        }


        // --- POST-ROLL TRANSITION LOGIC ---
        // If we are in the "Post-Roll" (currentTime >= startTime), the clip IS primaryClip.
        // We just need to attach the transition info to it if it's in the first half of duration.

        if (primaryClip && primaryClip.transition && primaryClip.transition.duration > 0) {
            const transDur = primaryClip.transition.duration;
            const halfDur = transDur / 2;
            // The post-roll window is [startTime, startTime + halfDur]

            if (currentTime >= primaryClip.startTime && currentTime < primaryClip.startTime + halfDur) {
                // We are in the second half of the centered transition
                // relativeTime should continue from where Pre-Roll left off.
                // Pre-Roll was [startTime - halfDur, startTime] -> progress [0, 0.5]
                // Post-Roll is [startTime, startTime + halfDur] -> progress [0.5, 1.0]

                // currentTime - (startTime - halfDur)
                const relativeTime = currentTime - (primaryClip.startTime - halfDur);
                const progress = relativeTime / transDur;

                const primaryEntry = activeClipsToRender.find(e => e.clip.id === primaryClip.id);
                if (primaryEntry) {
                    primaryEntry.transition = {
                        type: primaryClip.transition.type,
                        progress: progress
                    };
                }

                // Also ensure Outgoing is still visible!
                const prevClip = track.clips.find(c =>
                    Math.abs((c.startTime + c.duration) - primaryClip.startTime) < 0.1
                );

                if (prevClip) {
                    // It won't be primary anymore (we past the cut), so we MUST add it as Outgoing
                    activeClipsToRender.push({
                        clip: prevClip,
                        role: 'outgoing',
                        transition: {
                            type: primaryClip.transition.type,
                            progress: progress
                        }
                    });
                }
            }
        }

        // --- Render Layer Assembly ---
        activeClipsToRender.forEach(({ clip, role, transition }) => {
            const isOutgoing = role === 'outgoing';
            const isPreRoll = role === 'incoming_preroll';

            // Resolve Adjustments & Overrides
            let activeCrop = clip.crop || clip.transform?.crop;
            if (globalState.clipOverrides && globalState.clipOverrides[clip.id]) {
                activeCrop = globalState.clipOverrides[clip.id].crop;
            }

            // Time Calculation (Standard NLE Behavior: Extension or Freeze)
            let clipTime;
            let sourceTime;

            // We need to know media constraints
            // If checking duration is expensive or unreliable here, we let the SourceManager clamp?
            // But we want to avoid asking for > duration to avoid 'end of stream' event glitches?

            const startOffset = clip.startOffset || 0;
            // Note: We don't always know sourceDuration here if it's not on the clip object.
            // We'll trust MediaSourceManager to clamp the upper bound if we pass a large number.

            if (isOutgoing) {
                // Outgoing Clip Extension
                // Play PAST the end.
                const timeSinceEnd = currentTime - (clip.startTime + clip.duration);
                const totalTimeInClip = clip.duration + timeSinceEnd;
                // Just let it grow linearly. Manager will hold last frame if it exceeds duration.
                sourceTime = startOffset + totalTimeInClip;
            } else if (isPreRoll) {
                // Incoming Pre-Roll
                // Play BEFORE the start.
                clipTime = currentTime - clip.startTime; // Negative value

                const rawSourceTime = startOffset + clipTime;

                // CRITICAL FIX: Do NOT mirror/ping-pong. 
                // Just Clamp to 0 if handles don't exist.
                // This prevents "Reverse Playback" and "Seek Lag".
                sourceTime = Math.max(0, rawSourceTime);
            } else {
                // Primary Standard
                clipTime = currentTime - clip.startTime;
                sourceTime = startOffset + clipTime;
            }

            // Resolve Media
            let media = null;
            // Variant Key: If Incoming and Outgoing are same source, use different variants
            const variant = isOutgoing ? 'transition_out' : 'main'; // 'main' for primary/incoming

            if (clip.source) {
                const trackType = track.type === 'audio' ? 'audio' : (track.type === 'image' ? 'image' : 'video');
                media = mediaSourceManager.getMedia(clip.source, clip.type || trackType, variant);
            }

            let maskMedia = null;
            if (clip.maskSource) {
                maskMedia = mediaSourceManager.getMedia(clip.maskSource, 'video', 'main');
            }

            const keyframes = clip.keyframes || {};
            // Helper for animations
            const getVal = (prop, fallback) => {
                if (keyframes[prop] && keyframes[prop].length > 0) {
                    const t = currentTime - clip.startTime; // relative linear time
                    return interpolateProperty(t, keyframes[prop], fallback);
                }
                return fallback;
            };

            // Calculate Animations/Transforms
            const baseOpacity = clip.opacity !== undefined ? clip.opacity : 100;
            const animatedProps = {
                x: getVal('x', clip.transform?.x || (['text', 'image'].includes(track.type) ? 50 : 0)),
                y: getVal('y', clip.transform?.y || (['text', 'image'].includes(track.type) ? 50 : 0)),
                scale: getVal('scale', clip.transform?.scale || (track.type === 'text' ? clip.style?.fontSize || 48 : 100)),
                rotation: getVal('rotation', clip.transform?.rotation || 0),
                opacity: getVal('opacity', baseOpacity),
                crop: activeCrop || null
            };

            // Preset Animation (Intro/Outro)
            if (clip.animation && clip.animation.type !== 'none') {
                const animDuration = clip.animation.duration || 1.0;
                const animType = clip.animation.type;
                let progress = 0;
                const ct = currentTime - clip.startTime;

                const isOut = animType.toLowerCase().includes('out');
                if (isOut) {
                    const paramsStart = clip.duration - animDuration;
                    if (ct >= paramsStart) {
                        progress = (ct - paramsStart) / animDuration;
                        Object.assign(animatedProps, applyAnimation(animatedProps, animType, Math.min(1, progress)));
                    }
                } else if (ct <= animDuration) {
                    if (ct < 0) {
                        // No Animation in pre-roll
                    } else {
                        progress = ct / animDuration;
                        Object.assign(animatedProps, applyAnimation(animatedProps, animType, Math.min(1, progress)));
                    }
                }
            }

            // --- DYNAMIC TRANSITION ANIMATION ---
            // Applies spatial transforms (Slide, Zoom, Shake) during the transition window
            if (transition && transition.duration > 0) {
                const tType = transition.type;
                const p = transition.progress;
                const { width = 1920, height = 1080 } = canvasDimensions;

                if (isOutgoing) {
                    // Outgoing Clip Dynamics
                    if (tType === 'slide_left' || tType === 'fast_swipe' || tType === 'left') {
                        animatedProps.x -= width * p; // Move Left
                    } else if (tType === 'slide_right') {
                        animatedProps.x += width * p; // Move Right
                    } else if (tType === 'slide_up') {
                        animatedProps.y -= height * p;
                    } else if (tType === 'slide_down') {
                        animatedProps.y += height * p;
                    } else if (tType === 'zoom_in' || tType === 'pull_in' || tType === 'shock_zoom') {
                        animatedProps.scale *= (1 + 0.5 * p); // Grow out
                    } else if (tType === 'zoom_out' || tType === 'pull_out') {
                        animatedProps.scale *= (1 - 0.2 * p); // Shrink slightly
                    } else if (tType === 'shake' || tType === 'shaky_inhale' || tType === 'tremble_zoom') {
                        animatedProps.x += (Math.random() - 0.5) * 20;
                        animatedProps.y += (Math.random() - 0.5) * 20;
                    } else if (tType === 'whirl' || tType === 'twist_turn') {
                        animatedProps.rotation -= 180 * p;
                    } else if (tType === 'app_switch') {
                        // Recede back and slide left
                        const scaleFactor = 1 - (0.2 * p);
                        animatedProps.scale *= scaleFactor;
                        animatedProps.x -= (width * 0.5) * p;
                    }
                } else {
                    // Incoming Clip Dynamics
                    if (tType === 'slide_left' || tType === 'fast_swipe' || tType === 'left') {
                        animatedProps.x += width * (1 - p); // From Right
                    } else if (tType === 'slide_right') {
                        animatedProps.x -= width * (1 - p); // From Left
                    } else if (tType === 'slide_up') {
                        animatedProps.y += height * (1 - p);
                    } else if (tType === 'slide_down') {
                        animatedProps.y -= height * (1 - p);
                    } else if (tType === 'zoom_in' || tType === 'pull_in') {
                        animatedProps.scale *= (0.8 + 0.2 * p); // Start smaller
                    } else if (tType === 'zoom_out' || tType === 'pull_out') {
                        animatedProps.scale *= (1.2 - 0.2 * p); // Start larger
                    } else if (tType === 'shock_zoom') {
                        // Elastic overshoot
                        const s = p < 0.5 ? (0.5 + p) : (1 + Math.sin((p - 0.5) * Math.PI) * 0.1);
                        animatedProps.scale *= s;
                    } else if (tType === 'shake' || tType === 'shaky_inhale' || tType === 'tremble_zoom') {
                        animatedProps.x += (Math.random() - 0.5) * 20;
                        animatedProps.y += (Math.random() - 0.5) * 20;
                        if (tType === 'shaky_inhale' || tType === 'tremble_zoom') {
                            animatedProps.scale *= (1 + 0.05 * Math.sin(p * 20));
                        }
                    } else if (tType === 'whirl' || tType === 'twist_turn') {
                        animatedProps.rotation += 180 * (1 - p);
                    } else if (tType === 'app_switch') {
                        // Come from right, scaled down, then grow
                        const scaleFactor = 0.8 + (0.2 * p);
                        animatedProps.scale *= scaleFactor;
                        animatedProps.x += (width * 0.5) * (1 - p);
                    }
                }
            }

            // Layer Construction
            const layerZ = index + (isOutgoing ? -0.5 : 0);

            const layer = {
                id: clip.id + (isOutgoing ? '_out' : ''),
                zIndex: layerZ,
                opacity: animatedProps.opacity,
                blendMode: clip.blendMode || 'normal',
                startTime: clip.startTime,
                duration: clip.duration,
                type: clip.type || (track.type === 'text' ? 'text' : (track.type === 'adjustment' ? 'adjustment' : (track.type === 'sticker' ? 'sticker' : 'video'))),
                media: media,
                source: clip.source,
                variant: variant,
                sourceTime: sourceTime,

                transform: {
                    ...animatedProps,
                    blendMode: clip.blendMode || 'normal'
                },
                adjustments: clip.adjustments || getInitialAdjustments(),
                filter: clip.filter || 'normal',
                effect: clip.effect || null,
                mask: clip.mask ? { ...clip.mask, media: maskMedia, source: clip.maskSource } : null,
                text: clip.text,
                style: clip.style,
                faceRetouch: clip.faceRetouch,

                transition: transition
            };

            if (layer.type === 'text' && clip.animation?.type === 'typewriter') {
                const animDuration = clip.animation.duration || 1.0;
                const ct = currentTime - clip.startTime;
                const progress = Math.min(1, ct / animDuration);
                layer.text = (layer.text || '').substring(0, Math.floor(progress * layer.text.length));
            }

            visibleLayers.push(layer);
        });
    });

    visibleLayers.sort((a, b) => a.zIndex - b.zIndex);

    return {
        visibleLayers,
        canvasDimensions,
        activeOverlayId: selectedClipId,
        memePadding: memeMode ? 0.3 : 0,
        hasActiveClip: visibleLayers.length > 0,
        adjustments: activeMainClip?.adjustments || initialAdjustments,
        activeEffectId: activeMainClip?.effect || activeEffectId,
        activeFilterId: activeMainClip?.filter || activeFilterId || 'normal',
    };
};
