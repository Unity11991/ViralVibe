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

    // Master Loop
    const animate = useCallback((time) => {
        if (!isPlaying) return;

        const now = performance.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime(prevTime => {
            const nextTime = prevTime + (delta * playbackRate);

            if (nextTime >= duration) {
                setIsPlaying(false);
                return duration;
            }

            return nextTime;
        });

        requestRef.current = requestAnimationFrame(animate);
    }, [isPlaying, duration, playbackRate]);

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
    useEffect(() => {
        if (onTick) {
            onTick(currentTime, isPlaying);
        }
    }, [currentTime, isPlaying, onTick]);

    const play = () => setIsPlaying(true);
    const pause = () => setIsPlaying(false);
    const togglePlay = () => setIsPlaying(prev => !prev);

    const seek = (time) => {
        const newTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(newTime);
        // We notify onTick via the useEffect above
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
