import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePlayback - Master Clock for Media Editor
 * Handles synchronization between timeline time and media elements.
 */
export const usePlayback = (duration, onTick) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    const requestRef = useRef();
    const startTimeRef = useRef();
    const lastTimeRef = useRef(0); // Track last committed time

    // Registered media elements to sync
    const mediaElementsRef = useRef(new Set());

    const registerMedia = useCallback((element) => {
        if (element && !mediaElementsRef.current.has(element)) {
            mediaElementsRef.current.add(element);
            // Initial sync
            if (Math.abs(element.currentTime - currentTime) > 0.1) {
                element.currentTime = currentTime;
            }
        }
        return () => {
            if (element) mediaElementsRef.current.delete(element);
        };
    }, [currentTime]);

    // Master Loop
    const animate = useCallback((time) => {
        if (!isPlaying) return;

        if (startTimeRef.current === undefined) {
            startTimeRef.current = time;
        }

        // Calculate delta since last frame
        // We don't use (time - startTime) because we might pause/resume
        // Instead we just add delta to currentTime

        // Actually, simpler:
        // We need a high-precision clock.
        // Let's use performance.now() delta.

        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000; // seconds
        lastTimeRef.current = now;

        setCurrentTime(prevTime => {
            const newTime = prevTime + (delta * playbackRate);

            // Loop or Stop at end
            if (newTime >= duration) {
                setIsPlaying(false);
                return duration;
            }

            return newTime;
        });

        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, duration, playbackRate]);

    // Start/Stop Logic
    useEffect(() => {
        if (isPlaying) {
            lastTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(animate);

            // Play all registered media
            mediaElementsRef.current.forEach(el => {
                if (el.paused) {
                    el.play().catch(e => {
                        if (e.name !== 'AbortError') {
                            console.warn("Auto-play failed", e);
                        }
                    });
                }
            });
        } else {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            // Pause all registered media
            mediaElementsRef.current.forEach(el => {
                if (!el.paused) el.pause();
            });
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, animate]);

    // Sync Logic (Run on every time update)
    useEffect(() => {
        // Notify parent (for rendering)
        if (onTick) onTick(currentTime);

        // Sync Media Elements
        mediaElementsRef.current.forEach(el => {
            // Check drift
            // Note: This assumes media should be exactly at currentTime.
            // If media has an offset (like in a timeline track), the consumer needs to handle that wrapper
            // or we need a more complex registration that includes offset.
            // For now, we assume the consumer manages the media element's src/time mapping or we just sync the "main" video.
            // Actually, for multi-track, we usually sync the *main* video directly, 
            // and other clips are handled by the renderer seeking them.

            // Let's assume registered elements are "Main" videos that match timeline time 1:1 (or close enough)
            // OR the consumer manually syncs them in onTick.

            // If we want this hook to handle sync, we need to know the offset.
            // Let's keep it simple: This hook provides the MASTER CLOCK.
            // It exposes `currentTime`.
            // It can optionally "force sync" elements that are supposed to be playing.

            if (el.duration) { // Only sync if loaded
                const drift = Math.abs(el.currentTime - currentTime);
                if (drift > 0.2) {
                    el.currentTime = currentTime;
                }

                if (isPlaying && el.paused) {
                    el.play().catch(() => { });
                } else if (!isPlaying && !el.paused) {
                    el.pause();
                }

                if (el.playbackRate !== playbackRate) {
                    el.playbackRate = playbackRate;
                }
            }
        });

    }, [currentTime, isPlaying, playbackRate, onTick]);

    const play = () => setIsPlaying(true);
    const pause = () => setIsPlaying(false);
    const togglePlay = () => setIsPlaying(prev => !prev);
    const seek = (time) => {
        const newTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(newTime);
        // Immediate sync for seeking
        mediaElementsRef.current.forEach(el => {
            el.currentTime = newTime;
        });
    };

    return {
        isPlaying,
        currentTime,
        playbackRate,
        setPlaybackRate,
        play,
        pause,
        togglePlay,
        seek,
        registerMedia
    };
};
