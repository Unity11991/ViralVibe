import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing timeline state (clips, tracks)
 */
export const useTimeline = () => {
    const [clips, setClips] = useState([]);
    const [activeClipId, setActiveClipId] = useState(null);
    const [totalDuration, setTotalDuration] = useState(0);

    // Helper to recalculate start times and total duration
    const recalculateTimeline = (currentClips) => {
        let currentTime = 0;
        const updatedClips = currentClips.map(clip => {
            const updatedClip = { ...clip, startTime: currentTime };
            currentTime += clip.duration;
            return updatedClip;
        });
        return { clips: updatedClips, duration: currentTime };
    };

    const addClip = useCallback((newClip) => {
        setClips(prev => {
            const nextClips = [...prev, newClip];
            const { clips: updatedClips, duration } = recalculateTimeline(nextClips);
            setTotalDuration(duration);
            return updatedClips;
        });
    }, []);

    const splitClip = useCallback((clipId, splitTime) => {
        setClips(prev => {
            const clipIndex = prev.findIndex(c => c.id === clipId);
            if (clipIndex === -1) return prev;

            const clip = prev[clipIndex];
            const relativeSplitTime = splitTime - clip.startTime;

            if (relativeSplitTime <= 0 || relativeSplitTime >= clip.duration) {
                return prev; // Invalid split point
            }

            // Create two new clips
            const firstHalf = {
                ...clip,
                id: `${clip.sourceId}-${Date.now()}-1`,
                duration: relativeSplitTime,
                // sourceOffset remains same
            };

            const secondHalf = {
                ...clip,
                id: `${clip.sourceId}-${Date.now()}-2`,
                duration: clip.duration - relativeSplitTime,
                sourceOffset: clip.sourceOffset + relativeSplitTime
            };

            const nextClips = [
                ...prev.slice(0, clipIndex),
                firstHalf,
                secondHalf,
                ...prev.slice(clipIndex + 1)
            ];

            const { clips: updatedClips, duration } = recalculateTimeline(nextClips);
            setTotalDuration(duration);
            return updatedClips;
        });
    }, []);

    const removeClip = useCallback((clipId) => {
        setClips(prev => {
            const nextClips = prev.filter(c => c.id !== clipId);
            const { clips: updatedClips, duration } = recalculateTimeline(nextClips);
            setTotalDuration(duration);
            return updatedClips;
        });
        if (activeClipId === clipId) setActiveClipId(null);
    }, [activeClipId]);

    const moveClip = useCallback((fromIndex, toIndex) => {
        setClips(prev => {
            const nextClips = [...prev];
            const [movedClip] = nextClips.splice(fromIndex, 1);
            nextClips.splice(toIndex, 0, movedClip);

            const { clips: updatedClips, duration } = recalculateTimeline(nextClips);
            setTotalDuration(duration);
            return updatedClips;
        });
    }, []);

    const updateClip = useCallback((clipId, updates) => {
        setClips(prev => {
            const nextClips = prev.map(c => c.id === clipId ? { ...c, ...updates } : c);
            const { clips: updatedClips, duration } = recalculateTimeline(nextClips);
            setTotalDuration(duration);
            return updatedClips;
        });
    }, []);

    // Get the clip active at a specific time
    const getClipAtTime = useCallback((time) => {
        return clips.find(clip => time >= clip.startTime && time < clip.startTime + clip.duration);
    }, [clips]);

    return {
        clips,
        activeClipId,
        totalDuration,
        setActiveClipId,
        addClip,
        splitClip,
        removeClip,
        moveClip,
        updateClip,
        getClipAtTime
    };
};
