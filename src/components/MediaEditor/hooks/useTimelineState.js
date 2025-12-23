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

    // Consolidated History State to prevent race conditions
    const [historyState, setHistoryState] = useState({
        past: [],
        present: null,
        future: []
    });

    // We keep track of "isUndoing" to prevent circular updates if needed, 
    // although with this pattern it's less critical if we manage updates carefully.
    const isUndoing = useRef(false);

    // Initialization Helper
    const _initHistory = (initialTracks) => {
        setHistoryState({
            past: [],
            present: initialTracks,
            future: []
        });
    };

    // Add to History
    const addToHistory = useCallback((newTracks) => {
        if (isUndoing.current) return;

        setHistoryState(prev => {
            // If we have a present state, push it to past
            const newPast = prev.present ? [...prev.past, prev.present] : [...prev.past];

            // Limit history size if needed (e.g. 50 steps)
            if (newPast.length > 50) newPast.shift();

            return {
                past: newPast,
                present: newTracks,
                future: [] // Clear future on new action
            };
        });
    }, []);

    // Selection Logic
    const selectClip = useCallback((clipId, isMulti = false) => {
        setSelectedClipIds(prev => {
            const newSet = new Set(isMulti ? prev : []);
            if (newSet.has(clipId)) {
                if (isMulti) newSet.delete(clipId);
            } else {
                newSet.add(clipId);
                // Group logic requires current tracks reference or lookahead.
                // Since we need tracks to find groups, and tracks is a dependency
                // this is acceptable, but be aware of stale closures if selectClip is called async.
                // For direct interactions it's fine.
                const groupMembers = [];
                tracks.forEach(track => {
                    track.clips.forEach(c => {
                        if (c.id === clipId && c.groupId) {
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

    const toggleMagneticMode = useCallback(() => {
        setMagneticMode(prev => !prev);
    }, []);

    const groupSelectedClips = useCallback(() => {
        if (selectedClipIds.size < 2) return;
        const groupId = `group-${Date.now()}`;
        const newTracks = tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
                selectedClipIds.has(clip.id) ? { ...clip, groupId } : clip
            )
        }));
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, selectedClipIds, addToHistory]);

    const ungroupSelectedClips = useCallback(() => {
        const newTracks = tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
                selectedClipIds.has(clip.id) ? { ...clip, groupId: undefined } : clip
            )
        }));
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, selectedClipIds, addToHistory]);

    const initializeTimeline = useCallback((mediaFile, mediaType, duration) => {
        let newTracks;
        if (!mediaFile) {
            newTracks = [
                { id: 'track-video-main', type: 'video', height: 80, clips: [] },
                { id: 'track-audio-main', type: 'audio', height: 48, clips: [] }
            ];
        } else {
            newTracks = [{
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
            }];
        }
        setTracks(newTracks);
        _initHistory(newTracks);
    }, []);

    // Undo
    const undo = useCallback(() => {
        setHistoryState(prev => {
            if (prev.past.length === 0) return prev; // Cannot undo

            const previous = prev.past[prev.past.length - 1];
            const newPast = prev.past.slice(0, prev.past.length - 1);

            isUndoing.current = true;
            setTracks(previous);
            setTimeout(() => { isUndoing.current = false; }, 0);

            return {
                past: newPast,
                present: previous,
                future: [prev.present, ...prev.future]
            };
        });
    }, []);

    // Redo
    const redo = useCallback(() => {
        setHistoryState(prev => {
            if (prev.future.length === 0) return prev; // Cannot redo

            const next = prev.future[0];
            const newFuture = prev.future.slice(1);

            isUndoing.current = true;
            setTracks(next);
            setTimeout(() => { isUndoing.current = false; }, 0);

            return {
                past: [...prev.past, prev.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    const addTrack = useCallback((type) => {
        const count = tracks.filter(t => t.type === type).length;
        const newTrack = {
            id: `track-${type}-${count + 1}-${Date.now()}`,
            type,
            height: type === 'audio' ? 48 : (type === 'adjustment' ? 32 : 80),
            clips: []
        };
        const newTracks = [...tracks, newTrack];
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const reorderTracks = useCallback((fromIndex, toIndex) => {
        const newTracks = [...tracks];
        const [movedTrack] = newTracks.splice(fromIndex, 1);
        newTracks.splice(toIndex, 0, movedTrack);
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const updateTrackHeight = useCallback((trackId, newHeight) => {
        setTracks(prev => {
            const newTracks = prev.map(track =>
                track.id === trackId ? { ...track, height: Math.max(32, newHeight) } : track
            );
            return newTracks;
        });
    }, []);

    const addClip = useCallback((trackId, clipData) => {
        const newTracks = (tracks || []).map(track => {
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
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const addClipToNewTrack = useCallback((type, clipData) => {
        const currentTracks = tracks || [];
        const count = currentTracks.filter(t => t.type === type).length;
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
        const newTracks = [...tracks, newTrack];
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const updateClip = useCallback((clipId, updates) => {
        const newTracks = tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
                clip.id === clipId ? { ...clip, ...updates } : clip
            )
        }));
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const addTransition = useCallback((clipId, transitionType, duration = 1.0) => {
        const newTracks = tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
                clip.id === clipId ? {
                    ...clip,
                    transition: { type: transitionType, duration }
                } : clip
            )
        }));
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const splitClip = useCallback((clipId, splitTime) => {
        let tracksChanged = false;
        const newTracks = tracks.map(track => {
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
            setTracks(newTracks);
            addToHistory(newTracks);
        }
    }, [tracks, addToHistory]);

    const trimClip = useCallback((clipId, newStartTime, newDuration, newStartOffset) => {
        // Optimistic update for UI performance (drag)
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

    const moveClip = useCallback((clipId, newStartTime, newTrackId) => {
        setTracks(prev => {
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

            if (!clip) return prev;

            const sourceTrack = prev[sourceTrackIndex];
            const targetTrackId = newTrackId || sourceTrack.id;
            const targetTrackIndex = prev.findIndex(t => t.id === targetTrackId);

            if (targetTrackIndex === -1) return prev;

            const targetTrack = prev[targetTrackIndex];
            if (sourceTrack.id !== targetTrack.id) {
                const isCompatible =
                    (sourceTrack.type === targetTrack.type) ||
                    (sourceTrack.type === 'video' && targetTrack.type === 'video') ||
                    (sourceTrack.type === 'video' && clip.type === 'image' && targetTrack.type === 'video');

                if (!isCompatible) return prev;
            }

            const newSourceClips = [...sourceTrack.clips];
            newSourceClips.splice(sourceClipIndex, 1);

            const updatedClip = { ...clip, startTime: Math.max(0, newStartTime) };

            let newTargetClips = sourceTrack.id === targetTrack.id ? newSourceClips : [...targetTrack.clips];
            newTargetClips.push(updatedClip);
            newTargetClips.sort((a, b) => a.startTime - b.startTime);

            const newTracks = [...prev];
            newTracks[sourceTrackIndex] = { ...sourceTrack, clips: newSourceClips };
            newTracks[targetTrackIndex] = { ...targetTrack, clips: newTargetClips };

            return newTracks;
        });
    }, []);

    const commitUpdate = useCallback(() => {
        addToHistory(tracks);
    }, [tracks, addToHistory]);

    const deleteClip = useCallback((targetClipId) => {
        let idsToDelete = new Set();
        if (targetClipId && selectedClipIds.has(targetClipId)) {
            idsToDelete = new Set(selectedClipIds);
        } else if (targetClipId) {
            idsToDelete.add(targetClipId);
        } else {
            idsToDelete = new Set(selectedClipIds);
        }

        if (idsToDelete.size === 0) return;

        const newTracks = tracks.map(track => {
            const keptClips = track.clips.filter(c => !idsToDelete.has(c.id));
            return { ...track, clips: keptClips };
        });

        if (magneticMode) {
            newTracks.forEach(track => {
                const deletedClips = tracks.find(t => t.id === track.id)?.clips.filter(c => idsToDelete.has(c.id)) || [];
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

        setTracks(newTracks);
        addToHistory(newTracks);

        setSelectedClipId(null);
        setSelectedClipIds(new Set());
    }, [tracks, selectedClipIds, selectedClipId, addToHistory, magneticMode]);

    const detachAudio = useCallback((clipId) => {
        let clipToDetach = null;
        let tracksChanged = false;

        const newTracks = tracks.map(track => {
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

        if (!tracksChanged || !clipToDetach) return;

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

        const audioTrackCount = tracks.filter(t => t.type === 'audio').length;
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

        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const addMarkersToClip = useCallback((clipId, markers) => {
        const newTracks = tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip =>
                clip.id === clipId ? { ...clip, markers } : clip
            )
        }));
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const addKeyframe = useCallback((clipId, property, time, value, easing = 'linear') => {
        const newTracks = tracks.map(track => ({
            ...track,
            clips: track.clips.map(clip => {
                if (clip.id !== clipId) return clip;

                const keyframes = { ...(clip.keyframes || {}) };
                const propKeyframes = [...(keyframes[property] || [])];
                const existingIndex = propKeyframes.findIndex(k => Math.abs(k.time - time) < 0.01);

                if (existingIndex !== -1) {
                    propKeyframes[existingIndex] = { ...propKeyframes[existingIndex], value, easing };
                } else {
                    propKeyframes.push({
                        id: `kf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        time,
                        value,
                        easing
                    });
                }

                propKeyframes.sort((a, b) => a.time - b.time);
                keyframes[property] = propKeyframes;
                return { ...clip, keyframes };
            })
        }));
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

    const removeKeyframe = useCallback((clipId, property, keyframeId) => {
        const newTracks = tracks.map(track => ({
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
        setTracks(newTracks);
        addToHistory(newTracks);
    }, [tracks, addToHistory]);

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
        canUndo: historyState.past.length > 0,
        canRedo: historyState.future.length > 0
    };
};
