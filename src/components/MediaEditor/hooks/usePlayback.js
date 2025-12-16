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
    // OPTIMIZED: Throttle sync frequency to reduce overhead
    useEffect(() => {
        // Notify parent (for rendering)
        if (onTick) onTick(currentTime);

        // Batch sync operations and reduce frequency
        // Only sync every ~5 frames during playback (avoid excessive sync calls)
        const shouldSync = !isPlaying || Math.floor(currentTime * 30) % 5 === 0;

        if (!shouldSync && isPlaying) return;

        // Sync Media Elements
        mediaElementsRef.current.forEach(el => {
            if (!el.duration) return; // Only sync if loaded

            const drift = Math.abs(el.currentTime - currentTime);

            // OPTIMIZATION: Increase drift tolerance to reduce seek operations
            // Only sync if drift is significant (> 0.3s)
            if (drift > 0.3) {
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
