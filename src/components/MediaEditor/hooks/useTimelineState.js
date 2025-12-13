import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing timeline state (Tracks & Clips)
 */
export const useTimelineState = () => {
    // State
    const [tracks, setTracks] = useState([]);
    const [selectedClipId, setSelectedClipId] = useState(null);

    // History Management
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoing = useRef(false);

    // Helper to add state to history
    const addToHistory = useCallback((newTracks) => {
        if (isUndoing.current) return;

        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, newTracks];
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    // Initialize timeline with a main media file
    const initializeTimeline = useCallback((mediaFile, mediaType, duration) => {
        // If we already have tracks, don't overwrite unless empty? 
        // For now, we assume this is called on first load.

        const initialTrack = {
            id: 'track-main',
            type: mediaType === 'video' ? 'video' : 'image',
            height: 80,
            clips: [{
                id: `clip-${Date.now()}`,
                type: mediaType === 'video' ? 'video' : 'image',
                name: 'Main Media',
                startTime: 0,
                duration: duration || 10,
                startOffset: 0, // Where in the source file this clip starts
                source: mediaFile, // Reference to the actual file/url
                sourceDuration: duration || 10 // Store max duration for constraints
            }]
        };

        // Initialize with one text track, one sticker track, and one audio track
        const textTrack = { id: 'track-text-1', type: 'text', height: 64, clips: [] };
        const stickerTrack = { id: 'track-sticker-1', type: 'sticker', height: 64, clips: [] };
        const audioTrack = { id: 'track-audio-1', type: 'audio', height: 48, clips: [] };

        const newTracks = [initialTrack, textTrack, stickerTrack, audioTrack];
        setTracks(newTracks);

        // Reset history
        setHistory([newTracks]);
        setHistoryIndex(0);
    }, []);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoing.current = true;
            const newIndex = historyIndex - 1;
            setTracks(history[newIndex]);
            setHistoryIndex(newIndex);
            setTimeout(() => { isUndoing.current = false; }, 0);
        }
    }, [history, historyIndex]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoing.current = true;
            const newIndex = historyIndex + 1;
            setTracks(history[newIndex]);
            setHistoryIndex(newIndex);
            setTimeout(() => { isUndoing.current = false; }, 0);
        }
    }, [history, historyIndex]);

    // Add a new track
    const addTrack = useCallback((type) => {
        setTracks(prev => {
            // Count existing tracks of this type to generate a nice ID
            const count = prev.filter(t => t.type === type).length;
            const newTrack = {
                id: `track-${type}-${count + 1}-${Date.now()}`,
                type,
                height: type === 'audio' ? 48 : 80,
                clips: []
            };
            // Add to top (start of array) or bottom? 
            // Usually new layers are added on top (foreground).
            // Let's add to the end of the list for now, which we will treat as "Top/Foreground" visually in the list,
            // but we need to decide on rendering order.
            // If list is [Background, ..., Foreground], then push is correct for "New Layer on Top".
            const newTracks = [...prev, newTrack];
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Reorder tracks
    const reorderTracks = useCallback((fromIndex, toIndex) => {
        setTracks(prev => {
            const newTracks = [...prev];
            const [movedTrack] = newTracks.splice(fromIndex, 1);
            newTracks.splice(toIndex, 0, movedTrack);
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Update track height
    const updateTrackHeight = useCallback((trackId, newHeight) => {
        setTracks(prev => {
            const newTracks = prev.map(track =>
                track.id === trackId ? { ...track, height: Math.max(32, newHeight) } : track
            );
            // Don't add to history for resizing to avoid spamming undo stack
            return newTracks;
        });
    }, []);

    // Add a clip to a track
    const addClip = useCallback((trackId, clipData) => {
        setTracks(prev => {
            const newTracks = prev.map(track => {
                if (track.id === trackId) {
                    return {
                        ...track,
                        clips: [...track.clips, {
                            id: clipData.id || `clip-${Date.now()}`,
                            ...clipData
                        }]
                    };
                }
                return track;
            });
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Add a clip to a new track
    const addClipToNewTrack = useCallback((type, clipData) => {
        setTracks(prev => {
            const count = prev.filter(t => t.type === type).length;
            const newTrackId = `track-${type}-${count + 1}-${Date.now()}`;
            const newTrack = {
                id: newTrackId,
                type,
                height: type === 'audio' ? 48 : 80,
                clips: [{
                    id: clipData.id || `clip-${Date.now()}`,
                    ...clipData
                }]
            };
            const newTracks = [...prev, newTrack];
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Update a clip's properties (e.g., filters, effects, text content)
    const updateClip = useCallback((clipId, updates) => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    clip.id === clipId ? { ...clip, ...updates } : clip
                )
            }));
            // Only add to history if meaningful change (optimization)
            // For now, add to history
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Add a transition to a clip (start of clip)
    const addTransition = useCallback((clipId, transitionType, duration = 1.0) => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    clip.id === clipId ? {
                        ...clip,
                        transition: { type: transitionType, duration }
                    } : clip
                )
            }));
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Split a clip at a specific time
    const splitClip = useCallback((clipId, splitTime) => {
        setTracks(prev => {
            let tracksChanged = false;
            const newTracks = prev.map(track => {
                const clipIndex = track.clips.findIndex(c => c.id === clipId);
                if (clipIndex === -1) return track;

                const clip = track.clips[clipIndex];

                // Calculate relative split point within the clip
                const relativeSplit = splitTime - clip.startTime;

                // Validation
                if (relativeSplit <= 0.1 || relativeSplit >= clip.duration - 0.1) return track;

                tracksChanged = true;

                // Create two new clips
                const firstClip = {
                    ...clip,
                    duration: relativeSplit
                };

                const secondClip = {
                    ...clip,
                    id: `clip-${Date.now()}`,
                    startTime: splitTime,
                    duration: clip.duration - relativeSplit,
                    startOffset: clip.startOffset + relativeSplit,
                    // Copy over effects/filters
                    filter: clip.filter,
                    effect: clip.effect,
                    adjustments: clip.adjustments,
                    // Text/Sticker props
                    text: clip.text,
                    style: clip.style,
                    sticker: clip.sticker
                };

                // Replace original clip with new ones
                const newClips = [...track.clips];
                newClips.splice(clipIndex, 1, firstClip, secondClip);

                // Sort clips by start time just in case
                newClips.sort((a, b) => a.startTime - b.startTime);

                return { ...track, clips: newClips };
            });

            if (tracksChanged) {
                addToHistory(newTracks);
                return newTracks;
            }
            return prev;
        });
    }, [addToHistory]);

    // Trim a clip
    const trimClip = useCallback((clipId, newStartTime, newDuration, newStartOffset) => {
        setTracks(prev => {
            const newTracks = prev.map(track => {
                const clipIndex = track.clips.findIndex(c => c.id === clipId);
                if (clipIndex === -1) return track;

                const clip = track.clips[clipIndex];
                const prevClip = clipIndex > 0 ? track.clips[clipIndex - 1] : null;
                const nextClip = clipIndex < track.clips.length - 1 ? track.clips[clipIndex + 1] : null;

                // 1. Constrain Start Time (Collision with Prev Clip)
                let validatedStartTime = newStartTime;
                if (prevClip) {
                    const minStartTime = prevClip.startTime + prevClip.duration;
                    if (validatedStartTime < minStartTime) {
                        validatedStartTime = minStartTime;
                    }
                } else {
                    if (validatedStartTime < 0) validatedStartTime = 0;
                }

                // 2. Constrain Duration/End Time (Collision with Next Clip)
                let validatedDuration = newDuration;
                if (nextClip) {
                    const maxEndTime = nextClip.startTime;
                    if (validatedStartTime + validatedDuration > maxEndTime) {
                        validatedDuration = maxEndTime - validatedStartTime;
                    }
                }

                // 3. Constrain by Source Duration
                if (clip.sourceDuration) {
                    let validatedStartOffset = newStartOffset;
                    if (validatedStartOffset < 0) validatedStartOffset = 0;

                    // Check if end of clip exceeds source
                    if (validatedStartOffset + validatedDuration > clip.sourceDuration) {
                        validatedDuration = clip.sourceDuration - validatedStartOffset;
                    }

                    newDuration = validatedDuration;
                    newStartOffset = validatedStartOffset;
                }

                // Final safety check for min duration
                if (validatedDuration < 0.1) validatedDuration = 0.1;

                // Update clip
                const updatedClip = {
                    ...clip,
                    startTime: validatedStartTime,
                    duration: validatedDuration,
                    startOffset: newStartOffset
                };

                const newClips = [...track.clips];
                newClips[clipIndex] = updatedClip;

                return { ...track, clips: newClips };
            });

            return newTracks;
        });
    }, []);

    // Move a clip
    const moveClip = useCallback((clipId, newStartTime) => {
        setTracks(prev => {
            const newTracks = prev.map(track => {
                const clipIndex = track.clips.findIndex(c => c.id === clipId);
                if (clipIndex === -1) return track;

                const clip = track.clips[clipIndex];
                const prevClip = clipIndex > 0 ? track.clips[clipIndex - 1] : null;
                const nextClip = clipIndex < track.clips.length - 1 ? track.clips[clipIndex + 1] : null;

                let validatedStartTime = newStartTime;

                // Collision with Prev Clip
                if (prevClip) {
                    const minStartTime = prevClip.startTime + prevClip.duration;
                    // Snap if close enough (e.g., within 0.1s)
                    if (Math.abs(validatedStartTime - minStartTime) < 0.1 || validatedStartTime < minStartTime) {
                        validatedStartTime = minStartTime;
                    }
                } else {
                    if (validatedStartTime < 0) validatedStartTime = 0;
                }

                // Collision with Next Clip
                if (nextClip) {
                    const maxEndTime = nextClip.startTime;
                    // Snap if close enough
                    if (Math.abs((validatedStartTime + clip.duration) - maxEndTime) < 0.1 || validatedStartTime + clip.duration > maxEndTime) {
                        validatedStartTime = maxEndTime - clip.duration;
                    }
                }

                // Update clip
                const updatedClip = {
                    ...clip,
                    startTime: validatedStartTime
                };

                const newClips = [...track.clips];
                newClips[clipIndex] = updatedClip;

                return { ...track, clips: newClips };
            });

            return newTracks;
        });
    }, []);

    // Commit trim/move to history (call this on drag end)
    const commitUpdate = useCallback(() => {
        setTracks(currentTracks => {
            addToHistory(currentTracks);
            return currentTracks;
        });
    }, [addToHistory]);

    // Delete a clip
    const deleteClip = useCallback((clipId) => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.filter(c => c.id !== clipId)
            }));
            addToHistory(newTracks);
            return newTracks;
        });
        if (selectedClipId === clipId) setSelectedClipId(null);
    }, [selectedClipId, addToHistory]);

    return {
        tracks,
        setTracks,
        selectedClipId,
        setSelectedClipId,
        initializeTimeline,
        addTrack,
        reorderTracks,
        updateTrackHeight,
        addClip,
        addClipToNewTrack,
        updateClip,
        addTransition,
        splitClip,
        trimClip,
        moveClip,
        commitUpdate,
        deleteClip,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1
    };
};
