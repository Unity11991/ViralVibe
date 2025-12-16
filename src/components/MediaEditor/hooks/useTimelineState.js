import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing timeline state (Tracks & Clips)
 * Includes History, Selection, and Magnetic Timeline logic.
 */
export const useTimelineState = () => {
    // State
    const [tracks, setTracks] = useState([]);
    const [selectedClipId, setSelectedClipId] = useState(null); // Legacy (Primary)
    const [selectedClipIds, setSelectedClipIds] = useState(new Set()); // Multi-select
    const [magneticMode, setMagneticMode] = useState(false);

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

    // Selection Logic
    const selectClip = useCallback((clipId, isMulti = false) => {
        setSelectedClipIds(prev => {
            const newSet = new Set(isMulti ? prev : []);
            if (newSet.has(clipId)) {
                if (isMulti) newSet.delete(clipId);
            } else {
                newSet.add(clipId);

                // If this clip is part of a group, select all group members
                // We need access to tracks here. 
                // Since setState updater doesn't give us tracks, we rely on the `tracks` closure variable.
                // Assuming `tracks` is fresh enough or included in dependency? 
                // Ideally we should pass tracks to this function or use a ref for tracks if needed inside setState?
                // But `useCallback` has `[tracks]` dependency, so it's fine.
                const groupMembers = [];
                tracks.forEach(track => {
                    track.clips.forEach(c => {
                        if (c.id === clipId && c.groupId) {
                            // Found the clip, now find others with same groupId
                            tracks.forEach(t2 => {
                                t2.clips.forEach(c2 => {
                                    if (c2.groupId === c.groupId) groupMembers.push(c2.id);
                                });
                            });
                        }
                    });
                });
                groupMembers.forEach(id => newSet.add(id));
            }

            // Sync legacy state (first item or null)
            const firstId = newSet.size > 0 ? Array.from(newSet)[0] : null;
            setSelectedClipId(firstId);

            return newSet;
        });
    }, [tracks]);

    const selectAll = useCallback(() => {
        const allIds = new Set();
        tracks.forEach(t => t.clips.forEach(c => allIds.add(c.id)));
        setSelectedClipIds(allIds);
        setSelectedClipId(allIds.size > 0 ? Array.from(allIds)[0] : null);
    }, [tracks]);

    const deselectAll = useCallback(() => {
        setSelectedClipIds(new Set());
        setSelectedClipId(null);
    }, []);

    // Toggle Magnetic Mode
    const toggleMagneticMode = useCallback(() => {
        setMagneticMode(prev => !prev);
    }, []);

    // Grouping
    const groupSelectedClips = useCallback(() => {
        setTracks(prev => {
            if (selectedClipIds.size < 2) return prev; // Need 2+ to group

            const groupId = `group-${Date.now()}`;
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    selectedClipIds.has(clip.id) ? { ...clip, groupId } : clip
                )
            }));
            addToHistory(newTracks);
            return newTracks;
        });
    }, [selectedClipIds, addToHistory]);

    const ungroupSelectedClips = useCallback(() => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    selectedClipIds.has(clip.id) ? { ...clip, groupId: undefined } : clip
                )
            }));
            addToHistory(newTracks);
            return newTracks;
        });
    }, [selectedClipIds, addToHistory]);

    // Initialize timeline with a main media file OR empty for blank canvas
    const initializeTimeline = useCallback((mediaFile, mediaType, duration) => {
        // If no media file, initialize with empty timeline
        if (!mediaFile) {
            const newTracks = [];
            setTracks(newTracks);
            setHistory([newTracks]);
            setHistoryIndex(0);
            return;
        }

        // Otherwise create initial track with main media
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
                startOffset: 0,
                source: mediaFile,
                sourceDuration: duration || 10
            }]
        };

        const newTracks = [initialTrack];
        setTracks(newTracks);
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
            const count = prev.filter(t => t.type === type).length;
            const newTrack = {
                id: `track-${type}-${count + 1}-${Date.now()}`,
                type,
                height: type === 'audio' ? 48 : (type === 'adjustment' ? 32 : 80),
                clips: []
            };
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
                height: type === 'audio' ? 48 : (type === 'adjustment' ? 32 : 80),
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

    // Update a clip's properties
    const updateClip = useCallback((clipId, updates) => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    clip.id === clipId ? { ...clip, ...updates } : clip
                )
            }));
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Add a transition
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

    // Split a clip
    const splitClip = useCallback((clipId, splitTime) => {
        setTracks(prev => {
            let tracksChanged = false;
            const newTracks = prev.map(track => {
                const clipIndex = track.clips.findIndex(c => c.id === clipId);
                if (clipIndex === -1) return track;

                const clip = track.clips[clipIndex];
                const relativeSplit = splitTime - clip.startTime;

                if (relativeSplit <= 0.1 || relativeSplit >= clip.duration - 0.1) return track;

                tracksChanged = true;

                const firstClip = { ...clip, duration: relativeSplit };
                const secondClip = {
                    ...clip,
                    id: `clip-${Date.now()}`,
                    startTime: splitTime,
                    duration: clip.duration - relativeSplit,
                    startOffset: clip.startOffset + relativeSplit,
                    filter: clip.filter,
                    effect: clip.effect,
                    adjustments: clip.adjustments,
                    text: clip.text,
                    style: clip.style,
                    sticker: clip.sticker
                };

                const newClips = [...track.clips];
                newClips.splice(clipIndex, 1, firstClip, secondClip);
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

                let validatedStartTime = newStartTime;
                if (prevClip) {
                    const minStartTime = prevClip.startTime + prevClip.duration;
                    if (validatedStartTime < minStartTime) validatedStartTime = minStartTime;
                } else {
                    if (validatedStartTime < 0) validatedStartTime = 0;
                }

                let validatedDuration = newDuration;
                if (nextClip) {
                    const maxEndTime = nextClip.startTime;
                    if (validatedStartTime + validatedDuration > maxEndTime) {
                        validatedDuration = maxEndTime - validatedStartTime;
                    }
                }

                if (clip.sourceDuration) {
                    let validatedStartOffset = newStartOffset;
                    if (validatedStartOffset < 0) validatedStartOffset = 0;
                    if (validatedStartOffset + validatedDuration > clip.sourceDuration) {
                        validatedDuration = clip.sourceDuration - validatedStartOffset;
                    }
                    newDuration = validatedDuration;
                    newStartOffset = validatedStartOffset;
                }

                if (validatedDuration < 0.1) validatedDuration = 0.1;

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

    // Move a clip (supports cross-track)
    const moveClip = useCallback((clipId, newStartTime, newTrackId) => {
        setTracks(prev => {
            // 1. Find the clip and its current track
            let sourceTrackIndex = -1;
            let sourceClipIndex = -1;
            let clip = null;

            prev.forEach((t, ti) => {
                const ci = t.clips.findIndex(c => c.id === clipId);
                if (ci !== -1) {
                    sourceTrackIndex = ti;
                    sourceClipIndex = ci;
                    clip = t.clips[ci];
                }
            });

            if (!clip) return prev; // Clip not found

            const sourceTrack = prev[sourceTrackIndex];
            const targetTrackId = newTrackId || sourceTrack.id;
            const targetTrackIndex = prev.findIndex(t => t.id === targetTrackId);

            if (targetTrackIndex === -1) return prev; // Target track not found

            // 2. Check compatibility (if changing tracks)
            const targetTrack = prev[targetTrackIndex];
            if (sourceTrack.id !== targetTrack.id) {
                // Allow video->video, audio->audio, text->text, etc.
                // Also allow video->image (if we treat them as visual)
                // For now, strict type check or specific allowances
                const isCompatible =
                    (sourceTrack.type === targetTrack.type) ||
                    (sourceTrack.type === 'video' && targetTrack.type === 'video') || // both video
                    (sourceTrack.type === 'video' && clip.type === 'image' && targetTrack.type === 'video'); // image on video track

                if (!isCompatible) {
                    // console.warn("Incompatible track type");
                    return prev;
                }
            }

            // 3. Remove from source track
            const newSourceClips = [...sourceTrack.clips];
            newSourceClips.splice(sourceClipIndex, 1);

            // 4. Prepare clip for target
            const updatedClip = { ...clip, startTime: Math.max(0, newStartTime) };

            // 5. Add to target track (and handle collisions/constraints)
            let newTargetClips = sourceTrack.id === targetTrack.id ? newSourceClips : [...targetTrack.clips];

            // Simple insertion for now. 
            // Ideally we should check for collisions and prevent move if it overlaps?
            // Or just let it overlap? The user asked to "drag to other tracks".
            // Let's just add it and sort by time.
            newTargetClips.push(updatedClip);
            newTargetClips.sort((a, b) => a.startTime - b.startTime);

            // 6. Construct new tracks array
            const newTracks = [...prev];
            newTracks[sourceTrackIndex] = { ...sourceTrack, clips: newSourceClips };
            newTracks[targetTrackIndex] = { ...targetTrack, clips: newTargetClips };

            return newTracks;
        });
    }, []);

    const commitUpdate = useCallback(() => {
        setTracks(currentTracks => {
            addToHistory(currentTracks);
            return currentTracks;
        });
    }, [addToHistory]);

    // Delete a clip (Ripple Aware)
    const deleteClip = useCallback((targetClipId) => {
        setTracks(prev => {
            let idsToDelete = new Set();
            if (targetClipId && selectedClipIds.has(targetClipId)) {
                idsToDelete = new Set(selectedClipIds);
            } else if (targetClipId) {
                idsToDelete.add(targetClipId);
            } else {
                idsToDelete = new Set(selectedClipIds);
            }

            if (idsToDelete.size === 0) return prev;

            const newTracks = prev.map(track => {
                const keptClips = track.clips.filter(c => !idsToDelete.has(c.id));
                return { ...track, clips: keptClips };
            });

            // Post-process for Ripple if Magnetic is ON
            if (magneticMode) {
                newTracks.forEach(track => {
                    const deletedClips = prev.find(t => t.id === track.id)?.clips.filter(c => idsToDelete.has(c.id)) || [];
                    if (deletedClips.length === 0) return;

                    deletedClips.sort((a, b) => a.startTime - b.startTime);

                    deletedClips.forEach(deleted => {
                        track.clips.forEach(clip => {
                            if (clip.startTime > deleted.startTime) {
                                clip.startTime = Math.max(deleted.startTime, clip.startTime - deleted.duration);
                            }
                        });
                    });
                });
            }

            addToHistory(newTracks);
            return newTracks;
        });

        setSelectedClipId(null);
        setSelectedClipIds(new Set());
    }, [selectedClipIds, selectedClipId, addToHistory, magneticMode]);

    // Detach audio
    const detachAudio = useCallback((clipId) => {
        setTracks(prev => {
            let clipToDetach = null;
            let tracksChanged = false;

            const newTracks = prev.map(track => {
                const clipIndex = track.clips.findIndex(c => c.id === clipId);
                if (clipIndex === -1) return track;
                const clip = track.clips[clipIndex];
                if (track.type !== 'video' && clip.type !== 'video') return track;
                if (clip.audioDetached) return track;

                clipToDetach = clip;
                tracksChanged = true;
                const updatedClip = { ...clip, muted: true, audioDetached: true };
                const newClips = [...track.clips];
                newClips[clipIndex] = updatedClip;
                return { ...track, clips: newClips };
            });

            if (!tracksChanged || !clipToDetach) return prev;

            const audioClip = {
                ...clipToDetach,
                id: `clip-audio-${Date.now()}`,
                type: 'audio',
                muted: false,
                style: undefined,
                transform: undefined,
                filter: undefined,
                effect: undefined,
                mask: undefined
            };

            const audioTrackCount = prev.filter(t => t.type === 'audio').length;
            const newAudioTrack = {
                id: `track-audio-${audioTrackCount + 1}-${Date.now()}`,
                type: 'audio',
                height: 48,
                clips: [audioClip]
            };

            const firstAudioIndex = newTracks.findIndex(t => t.type === 'audio');
            if (firstAudioIndex !== -1) {
                newTracks.splice(firstAudioIndex, 0, newAudioTrack);
            } else {
                newTracks.push(newAudioTrack);
            }

            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Add markers
    const addMarkersToClip = useCallback((clipId, markers) => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip =>
                    clip.id === clipId ? { ...clip, markers } : clip
                )
            }));
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    // Keyframe Management
    const addKeyframe = useCallback((clipId, property, time, value, easing = 'linear') => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip => {
                    if (clip.id !== clipId) return clip;

                    const keyframes = { ...(clip.keyframes || {}) };
                    const propKeyframes = [...(keyframes[property] || [])];

                    // Check if keyframe exists at this time (allow small tolerance)
                    const existingIndex = propKeyframes.findIndex(k => Math.abs(k.time - time) < 0.01);

                    if (existingIndex !== -1) {
                        // Update existing
                        propKeyframes[existingIndex] = { ...propKeyframes[existingIndex], value, easing };
                    } else {
                        // Add new
                        propKeyframes.push({
                            id: `kf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            time,
                            value,
                            easing
                        });
                    }

                    // Sort by time
                    propKeyframes.sort((a, b) => a.time - b.time);

                    keyframes[property] = propKeyframes;
                    return { ...clip, keyframes };
                })
            }));
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    const removeKeyframe = useCallback((clipId, property, keyframeId) => {
        setTracks(prev => {
            const newTracks = prev.map(track => ({
                ...track,
                clips: track.clips.map(clip => {
                    if (clip.id !== clipId) return clip;
                    if (!clip.keyframes || !clip.keyframes[property]) return clip;

                    const newKeyframes = clip.keyframes[property].filter(k => k.id !== keyframeId);

                    return {
                        ...clip,
                        keyframes: {
                            ...clip.keyframes,
                            [property]: newKeyframes
                        }
                    };
                })
            }));
            addToHistory(newTracks);
            return newTracks;
        });
    }, [addToHistory]);

    return {
        tracks,
        setTracks,
        selectedClipId,
        setSelectedClipId: (id) => selectClip(id, false),
        selectedClipIds,
        selectClip,
        selectAll,
        deselectAll,
        magneticMode,
        toggleMagneticMode,
        groupSelectedClips,
        ungroupSelectedClips,

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
        detachAudio,
        addMarkersToClip,
        addKeyframe,
        removeKeyframe,
        undo,
        redo,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1
    };
};
