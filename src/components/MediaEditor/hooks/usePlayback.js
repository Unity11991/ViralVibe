import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePlayback - Master Clock for Media Editor
 * Pure clock implementation for synchronized rendering.
 */
export const usePlayback = (duration, onTick) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    const requestRef = useRef();
    const lastTimeRef = useRef(0);
    const currentTimeRef = useRef(0);
    const lastStateUpdateRef = useRef(0);

    // Sync ref with state when seeking
    useEffect(() => {
        if (!isPlaying) {
            currentTimeRef.current = currentTime;
        }
    }, [currentTime, isPlaying]);

    // Master Loop
    // Master Loop
    const animate = useCallback((time) => {
        if (!isPlaying) return;

        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        // Use Ref for current time to avoid dependency cycles and strict mode double-invocations
        currentTimeRef.current = currentTimeRef.current + (delta * playbackRate);
        const nextTime = currentTimeRef.current;

        if (nextTime >= duration) {
            setIsPlaying(false);
            setCurrentTime(duration);
            return;
        }

        // FAST PATH: Call render logic synchronously (60fps+)
        // This ensures the canvas and audio context update immediately without waiting for React commit
        if (onTick) {
            onTick(nextTime, true);
        }

        // SLOW PATH: Update UI state (Throttled to ~30fps to save CPU)
        // We only need high precision for the canvas, the Playhead UI leads to heavy React diffing
        const timeSinceLastStateUpdate = now - lastStateUpdateRef.current;
        if (timeSinceLastStateUpdate > 32) { // ~30fps
            setCurrentTime(nextTime);
            lastStateUpdateRef.current = now;
        }

        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, duration, playbackRate, onTick]);

    // Start/Stop Logic
    useEffect(() => {
        if (isPlaying) {
            lastTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, animate]);

    // Internal tick notification
    // Internal tick notification (only when paused/seeking)
    // When playing, the animation loop handles the tick directly for smoother performance
    useEffect(() => {
        if (onTick && !isPlaying) {
            onTick(currentTime, isPlaying);
        }
    }, [currentTime, isPlaying, onTick]);

    const play = () => setIsPlaying(true);
    const pause = () => setIsPlaying(false);
    const togglePlay = () => setIsPlaying(prev => !prev);

    const seek = (time) => {
        const newTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(newTime);
        currentTimeRef.current = newTime;
        lastTimeRef.current = performance.now(); // Prevent large delta jump
        // We notify onTick via the useEffect above (if paused) or next frame (if playing)

        // Force immediate tick to update UI/Canvas even if paused
        if (onTick) onTick(newTime, isPlaying);
    };

    return {
        isPlaying,
        currentTime,
        playbackRate,
        setPlaybackRate,
        play,
        pause,
        togglePlay,
        seek
    };
};
