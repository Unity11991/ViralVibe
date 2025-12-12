import React, { useState, useEffect, useRef } from 'react';
import { X, Download, RotateCcw, Video, Upload } from 'lucide-react';
import { useMediaProcessor } from './MediaEditor/hooks/useMediaProcessor';
import { useCanvasRenderer } from './MediaEditor/hooks/useCanvasRenderer';
import { useOverlays } from './MediaEditor/hooks/useOverlays';
import { useExport } from './MediaEditor/hooks/useExport';
import { useTimelineState } from './MediaEditor/hooks/useTimelineState';
import { getInitialAdjustments, applyFilterPreset } from './MediaEditor/utils/filterUtils';
import { buildFilterString } from './MediaEditor/utils/canvasUtils';
import { Button } from './MediaEditor/components/UI';

// New Layout Components
import { EditorLayout } from './MediaEditor/components/layout/EditorLayout';
import { AssetsPanel } from './MediaEditor/components/panels/AssetsPanel';
import { PropertiesPanel } from './MediaEditor/components/panels/PropertiesPanel';
import { TimelinePanel } from './MediaEditor/components/timeline/TimelinePanel';
import { PreviewPlayer } from './MediaEditor/components/preview/PreviewPlayer';

/**
 * MediaEditor - Professional Video & Image Editor
 * Rebuilt with 3-pane layout and advanced timeline
 */
const MediaEditor = ({ mediaFile: initialMediaFile, onClose, initialText, initialAdjustments, suggestedFilter, isPro = false }) => {
    // Hooks
    const {
        mediaFile,
        mediaUrl,
        mediaType,
        videoDuration,
        isLoading,
        mediaElementRef,
        loadMedia,
        isVideo
    } = useMediaProcessor();

    const {
        canvasRef,
        canvasDimensions,
        initializeCanvas,
        render
    } = useCanvasRenderer(mediaElementRef, mediaType);

    // Overlay hooks replaced by timeline state
    // const { ... } = useOverlays();

    const {
        isExporting,
        exportProgress,
        showExportModal,
        exportSettings,
        setShowExportModal,
        setExportSettings,
        handleExport,
        cancelExport
    } = useExport(mediaElementRef, mediaType);

    // Timeline State Hook
    const {
        tracks,
        setTracks,
        selectedClipId,
        setSelectedClipId,
        initializeTimeline,
        addClip,
        updateClip,
        addTransition,
        splitClip,
        trimClip,
        moveClip,
        commitUpdate,
        deleteClip,
        undo,
        redo,
        canUndo,
        canRedo,
        addTrack,
        reorderTracks,
        updateTrackHeight
    } = useTimelineState();

    // Editor State
    const [activeTab, setActiveTab] = useState('adjust');
    const [adjustments, setAdjustments] = useState(getInitialAdjustments());
    const [activeFilterId, setActiveFilterId] = useState('normal');
    const [activeEffectId, setActiveEffectId] = useState(null);
    const [effectIntensity, setEffectIntensity] = useState(50);
    const [cropPreset, setCropPreset] = useState('free');
    const [cropData, setCropData] = useState({ x: 0, y: 0, width: 100, height: 100 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [timelineZoom, setTimelineZoom] = useState(1);
    const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [memeMode, setMemeMode] = useState(!!initialText);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [mediaLibrary, setMediaLibrary] = useState([]);

    const fileInputRef = useRef(null);
    const containerRef = useRef(null);
    const overlayRef = useRef(null);
    const imageElementsRef = useRef({}); // Cache for image clip elements
    const audioElementsRef = useRef({}); // Cache for audio clip elements
    const videoElementsRef = useRef({}); // Cache for secondary video clip elements

    // Calculate total timeline duration dynamically
    const timelineDuration = React.useMemo(() => {
        let maxDuration = videoDuration || 10;
        tracks.forEach(track => {
            track.clips.forEach(clip => {
                const end = clip.startTime + clip.duration;
                if (end > maxDuration) maxDuration = end;
            });
        });
        // Add a little buffer (e.g., 5 seconds) for easier editing at the end
        return Math.max(maxDuration, (videoDuration || 10));
    }, [tracks, videoDuration]);

    // Update trim range when timeline duration changes
    useEffect(() => {
        setTrimRange(prev => ({ ...prev, end: timelineDuration }));
    }, [timelineDuration]);

    // Initialize Timeline when media loads
    useEffect(() => {
        if (mediaUrl && videoDuration) {
            // Only initialize if tracks are empty to avoid resetting on every render
            if (tracks.length === 0) {
                initializeTimeline(mediaUrl, isVideo ? 'video' : 'image', videoDuration);
            }
        }
    }, [mediaUrl, videoDuration, isVideo, initializeTimeline, tracks.length]);

    // Combined Tracks for Visualization - No longer needed as we use real tracks
    // But we need to ensure we have tracks for text/stickers if they don't exist
    const visualizationTracks = tracks;

    // Handle Split
    const handleSplit = () => {
        if (!selectedClipId) {
            // If no clip selected, try to split the clip under the playhead on the main track
            const mainTrack = tracks.find(t => t.id === 'track-main');
            if (mainTrack) {
                const clipAtPlayhead = mainTrack.clips.find(c =>
                    currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
                );
                if (clipAtPlayhead) {
                    splitClip(clipAtPlayhead.id, currentTime);
                    return;
                }
            }
            return;
        }
        splitClip(selectedClipId, currentTime);
    };

    // Handle Clip Selection
    const handleClipSelect = (clipId) => {
        setSelectedClipId(clipId);

        // Determine type of clip to set active tab
        const track = tracks.find(t => t.clips.some(c => c.id === clipId));
        if (track) {
            const clip = track.clips.find(c => c.id === clipId);

            // Sync UI state with clip properties
            if (clip) {
                setAdjustments(clip.adjustments || getInitialAdjustments());
                setActiveFilterId(clip.filter || 'normal');
                setActiveEffectId(clip.effect || null);
                // Note: effectIntensity might need to be stored on clip too if we want per-clip intensity
            }

            if (track.type === 'text') setActiveTab('text');
            else if (track.type === 'sticker') setActiveTab('stickers');
            else setActiveTab('adjust');
        } else {
            // Deselected or not found - reset to defaults or keep global?
            // Ideally we should have a "Global" state vs "Clip" state.
            // For now, let's just keep whatever is there, or reset to global defaults if we had a global store.
        }
    };

    // Wrappers for UI updates to target selected clip
    const handleSetAdjustments = (newAdjustments) => {
        // Handle both functional updates and direct values
        const resolvedAdjustments = typeof newAdjustments === 'function'
            ? newAdjustments(adjustments)
            : newAdjustments;

        setAdjustments(resolvedAdjustments);

        if (selectedClipId) {
            updateClip(selectedClipId, { adjustments: resolvedAdjustments });
        }
    };

    const handleSetFilter = (filterId) => {
        setActiveFilterId(filterId);

        // Apply preset values to adjustments
        const presetAdjustments = applyFilterPreset(filterId);
        setAdjustments(presetAdjustments);

        if (selectedClipId) {
            updateClip(selectedClipId, {
                filter: filterId,
                adjustments: presetAdjustments
            });
        }
    };

    const handleSetEffect = (effectId) => {
        setActiveEffectId(effectId);
        if (selectedClipId) {
            updateClip(selectedClipId, { effect: effectId });
        }
    };

    const handleSetEffectIntensity = (intensity) => {
        setEffectIntensity(intensity);
        // TODO: Store intensity on clip if supported
        // For now, we assume global intensity or simple effect ID
    };

    // Load initial media
    useEffect(() => {
        if (initialMediaFile) {
            loadMedia(initialMediaFile);
        }
    }, [initialMediaFile, loadMedia]);

    // Initialize canvas when media loads
    useEffect(() => {
        if (!mediaUrl || !mediaElementRef.current) return;

        // Simple initialization for now, will be optimized in resize observer
        const mediaAspect = mediaElementRef.current.videoWidth
            ? mediaElementRef.current.videoWidth / mediaElementRef.current.videoHeight
            : mediaElementRef.current.width / mediaElementRef.current.height;

        initializeCanvas(800, 600, mediaAspect, memeMode ? 0.3 : 0);

        if (isVideo) {
            setTrimRange({ start: 0, end: videoDuration });
        }
    }, [mediaUrl, mediaElementRef, initializeCanvas, isVideo, videoDuration, memeMode]);

    // Generate Thumbnail for Filters
    useEffect(() => {
        if (!mediaUrl) return;

        const generate = async () => {
            if (mediaType === 'image') {
                setThumbnailUrl(mediaUrl);
            } else if (mediaType === 'video') {
                try {
                    const video = document.createElement('video');
                    video.crossOrigin = 'anonymous';
                    video.src = mediaUrl;
                    video.muted = true;
                    video.preload = 'metadata';

                    await new Promise((resolve) => {
                        video.onloadeddata = resolve;
                    });

                    // Seek to 1s or 10% of duration
                    video.currentTime = Math.min(1, video.duration * 0.1);

                    await new Promise((resolve) => {
                        video.onseeked = resolve;
                    });

                    const canvas = document.createElement('canvas');
                    // Keep aspect ratio but small
                    const aspect = video.videoWidth / video.videoHeight;
                    canvas.width = 160;
                    canvas.height = 160 / aspect;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.7));
                } catch (e) {
                    console.error('Thumbnail generation failed:', e);
                    setThumbnailUrl(null);
                }
            }
        };

        generate();
    }, [mediaUrl, mediaType]);

    // Ref to hold latest state for the render loop
    const renderStateRef = useRef({});

    // Update render state ref whenever relevant state changes
    useEffect(() => {
        const mainTrack = tracks.find(t => t.id === 'track-main');
        const activeClip = mainTrack?.clips.find(c =>
            currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
        );
        const hasActiveClip = !!activeClip;



        // Extract overlays from tracks for rendering
        // We only render overlays that are active at the current time!
        const activeTextOverlays = [];
        const activeStickers = [];

        tracks.forEach(track => {
            if (track.type === 'text') {
                track.clips.forEach(clip => {
                    if (currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)) {
                        activeTextOverlays.push({
                            id: clip.id,
                            text: clip.text || 'Text',
                            x: clip.style?.x || 50,
                            y: clip.style?.y || 50,
                            fontSize: clip.style?.fontSize || 48,
                            fontFamily: clip.style?.fontFamily || 'Arial',
                            fontWeight: clip.style?.fontWeight || 'bold',
                            color: clip.style?.color || '#ffffff',
                            rotation: clip.style?.rotation || 0
                        });
                    }
                });
            } else if (track.type === 'sticker') {
                track.clips.forEach(clip => {
                    if (currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)) {
                        activeStickers.push({
                            id: clip.id,
                            x: clip.sticker?.x || 50,
                            y: clip.sticker?.y || 50,
                            scale: clip.sticker?.scale || 1,
                            rotation: clip.sticker?.rotation || 0,
                            image: clip.sticker?.image // We need to store the image object or URL
                        });
                    }
                });
            }
        });

        // Calculate Transition State
        let transition = null;
        if (activeClip && activeClip.transition) {
            const transitionDuration = activeClip.transition.duration || 1.0;
            const timeInClip = currentTime - activeClip.startTime;

            if (timeInClip < transitionDuration) {
                transition = {
                    type: activeClip.transition.type,
                    progress: timeInClip / transitionDuration
                };
            }
        }

        const initialAdjustments = getInitialAdjustments();
        const transform = { rotation, zoom };

        // Calculate visible clips for multi-track rendering
        const visibleClips = tracks
            .filter(t => t.type === 'video' || t.type === 'image') // Only renderable tracks
            .map(track => {
                const clip = track.clips.find(c =>
                    currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
                );
                if (!clip) return null;

                // Resolve media source
                let mediaSource = null;
                if (track.id === 'track-main' && isVideo) {
                    mediaSource = mediaElementRef.current;
                } else if (clip.type === 'image') {
                    // Check cache
                    if (!imageElementsRef.current[clip.id]) {
                        const img = new Image();
                        img.src = clip.source;
                        imageElementsRef.current[clip.id] = img;
                    }
                    mediaSource = imageElementsRef.current[clip.id];
                } else if (clip.type === 'video' && track.id !== 'track-main') {
                    // Secondary video support
                    if (!videoElementsRef.current[clip.id]) {
                        const video = document.createElement('video');
                        video.src = clip.source;
                        video.muted = true; // Secondary videos muted by default? Or mixed?
                        video.crossOrigin = 'anonymous';
                        videoElementsRef.current[clip.id] = video;
                    }
                    mediaSource = videoElementsRef.current[clip.id];
                }

                if (!mediaSource) return null;

                return {
                    ...clip,
                    media: mediaSource,
                    // Track-level or clip-level adjustments
                    adjustments: clip.adjustments || getInitialAdjustments(),
                    filter: clip.filter || 'normal',
                    effect: clip.effect || null,
                    transform: {
                        ...transform, // Global transform (zoom/pan) applies to everything? Or just main?
                        // Ideally, each clip has its own transform.
                        // For now, let's apply global transform only to main track?
                        // Or apply to all? Let's apply to all for "Canvas" feel.
                    }
                };
            })
            .filter(Boolean);

        renderStateRef.current = {
            visibleClips, // New multi-track state
            // Fallbacks for single-track renderers (if any)
            adjustments: activeClip?.adjustments || initialAdjustments,
            vignette: activeClip?.adjustments?.vignette || initialAdjustments.vignette,
            grain: activeClip?.adjustments?.grain || initialAdjustments.grain,
            textOverlays: activeTextOverlays,
            stickers: activeStickers,
            stickerImages: [],
            transform: { rotation, zoom },
            canvasDimensions,
            activeOverlayId: selectedClipId,
            memePadding: memeMode ? 0.3 : 0,
            activeEffectId: activeClip?.effect || null,
            effectIntensity,
            activeFilterId: activeClip?.filter || 'normal',
            hasActiveClip: visibleClips.length > 0, // Update this
            transition // Pass transition state
        };
    }, [adjustments, tracks, rotation, zoom, canvasDimensions, selectedClipId, memeMode, activeEffectId, effectIntensity, activeFilterId, currentTime, isVideo]);

    // Stable Render Loop
    useEffect(() => {
        if (!mediaUrl || !canvasRef.current) return;

        const interval = setInterval(() => {
            if (renderStateRef.current) {
                render(renderStateRef.current, { applyFiltersToContext: true });
            }
        }, 33);

        return () => clearInterval(interval);
    }, [mediaUrl, canvasRef, render]);

    // Video playback engine
    useEffect(() => {
        let animationFrameId;
        let lastTime = Date.now();

        const playbackLoop = () => {
            if (!isPlaying) return;

            const now = Date.now();
            const delta = (now - lastTime) / 1000; // seconds
            lastTime = now;

            // Increment timeline time
            setCurrentTime(prevTime => {
                const newTime = prevTime + delta;

                // Stop if reached end
                if (newTime >= trimRange.end) {
                    setIsPlaying(false);
                    if (mediaElementRef.current) mediaElementRef.current.pause();

                    // Pause all audio
                    Object.values(audioElementsRef.current).forEach(audio => {
                        if (!audio.paused) audio.pause();
                    });

                    return trimRange.end;
                }

                // --- SMART SYNC LOGIC (Video) ---
                if (mediaElementRef.current && isVideo) {
                    const mainTrack = tracks.find(t => t.id === 'track-main');
                    const activeClip = mainTrack?.clips.find(c =>
                        newTime >= c.startTime && newTime < (c.startTime + c.duration)
                    );

                    if (activeClip) {
                        const expectedSourceTime = activeClip.startOffset + (newTime - activeClip.startTime);
                        const drift = Math.abs(mediaElementRef.current.currentTime - expectedSourceTime);

                        if (drift > 0.1) {
                            mediaElementRef.current.currentTime = expectedSourceTime;
                        }
                        if (mediaElementRef.current.paused) {
                            mediaElementRef.current.play().catch(() => { });
                        }
                    } else {
                        if (!mediaElementRef.current.paused) {
                            mediaElementRef.current.pause();
                        }
                    }
                }

                // --- SECONDARY VIDEO SYNC LOGIC ---
                tracks.filter(t => t.type === 'video' && t.id !== 'track-main').forEach(track => {
                    const activeClip = track.clips.find(c =>
                        newTime >= c.startTime && newTime < (c.startTime + c.duration)
                    );

                    if (activeClip) {
                        if (!videoElementsRef.current[activeClip.id]) {
                            const video = document.createElement('video');
                            video.src = activeClip.source;
                            video.muted = true;
                            video.crossOrigin = 'anonymous';
                            videoElementsRef.current[activeClip.id] = video;
                        }
                        const video = videoElementsRef.current[activeClip.id];

                        const expectedSourceTime = activeClip.startOffset + (newTime - activeClip.startTime);
                        const drift = Math.abs(video.currentTime - expectedSourceTime);

                        if (drift > 0.1) {
                            video.currentTime = expectedSourceTime;
                        }
                        if (video.paused) {
                            video.play().catch(() => { });
                        }
                    } else {
                        // Pause inactive videos
                        track.clips.forEach(c => {
                            if (videoElementsRef.current[c.id] && !videoElementsRef.current[c.id].paused) {
                                videoElementsRef.current[c.id].pause();
                            }
                        });
                    }
                });

                // --- AUDIO MIXER LOGIC ---
                tracks.filter(t => t.type === 'audio').forEach(track => {
                    const activeClip = track.clips.find(c =>
                        newTime >= c.startTime && newTime < (c.startTime + c.duration)
                    );

                    if (activeClip) {
                        // Get or create Audio element
                        if (!audioElementsRef.current[activeClip.id]) {
                            const audio = new Audio(activeClip.source);
                            audio.loop = false;
                            audioElementsRef.current[activeClip.id] = audio;
                        }
                        const audio = audioElementsRef.current[activeClip.id];

                        // Sync Audio
                        const expectedSourceTime = activeClip.startOffset + (newTime - activeClip.startTime);
                        const drift = Math.abs(audio.currentTime - expectedSourceTime);

                        if (drift > 0.1 || audio.paused) {
                            if (drift > 0.1) audio.currentTime = expectedSourceTime;
                            audio.play().catch(e => console.warn("Audio play failed", e));
                        }

                        // Volume control (TODO: Add volume to clip model)
                        audio.volume = 1.0;
                    } else {
                        // Pause any playing audio for this track? 
                        // Actually we need to check all cached audios for this track and pause them if not active.
                        // But simpler: iterate all cached audios and pause if not active?
                        // No, that's expensive.
                        // Better: We only care about the *previous* active clip? 
                        // Let's just iterate all cached audios in the cleanup or check here.
                        // For now, let's iterate all clips in this track and ensure their audio is paused if not active.
                        track.clips.forEach(c => {
                            if (c.id !== activeClip?.id && audioElementsRef.current[c.id]) {
                                const audio = audioElementsRef.current[c.id];
                                if (!audio.paused) audio.pause();
                            }
                        });
                    }
                });

                return newTime;
            });

            animationFrameId = requestAnimationFrame(playbackLoop);
        };

        if (isPlaying) {
            lastTime = Date.now();
            playbackLoop();
        } else {
            cancelAnimationFrame(animationFrameId);
            // Ensure video pauses when timeline pauses
            if (mediaElementRef.current) mediaElementRef.current.pause();

            // Pause all audio
            Object.values(audioElementsRef.current).forEach(audio => {
                if (!audio.paused) audio.pause();
            });

            // Pause all secondary videos
            Object.values(videoElementsRef.current).forEach(video => {
                if (!video.paused) video.pause();
            });
        }

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, trimRange.end, tracks, isVideo, mediaElementRef]);

    // Sync video element to timeline time
    useEffect(() => {
        // Dragging logic for overlays on canvas needs to update the CLIP in the timeline
        // This is complex because canvasUtils expects specific overlay objects.
        // For now, we'll disable canvas dragging of overlays to simplify the migration
        // and rely on the Properties Panel for positioning.
        // TODO: Re-implement canvas dragging by mapping canvas events to updateClip
    }, []);

    // Handlers
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) loadMedia(file);
    };

    const handlePlayPause = () => {
        if (mediaElementRef.current) {
            if (isPlaying) {
                mediaElementRef.current.pause();
            } else {
                mediaElementRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (time) => {
        setCurrentTime(time);

        // Sync video element immediately for preview
        if (mediaElementRef.current && isVideo) {
            const mainTrack = tracks.find(t => t.id === 'track-main');
            const activeClip = mainTrack?.clips.find(c =>
                time >= c.startTime && time < (c.startTime + c.duration)
            );

            if (activeClip) {
                const sourceTime = activeClip.startOffset + (time - activeClip.startTime);
                if (Number.isFinite(sourceTime)) {
                    mediaElementRef.current.currentTime = sourceTime;
                }
            }
            // If in gap, we don't strictly need to seek, but maybe pause?
            // The render loop will handle the black screen.
        }

        // Sync secondary videos
        tracks.filter(t => t.type === 'video' && t.id !== 'track-main').forEach(track => {
            const activeClip = track.clips.find(c =>
                time >= c.startTime && time < (c.startTime + c.duration)
            );

            if (activeClip && videoElementsRef.current[activeClip.id]) {
                const sourceTime = activeClip.startOffset + (time - activeClip.startTime);
                if (Number.isFinite(sourceTime)) {
                    videoElementsRef.current[activeClip.id].currentTime = sourceTime;
                }
            }
        });
    };

    const handleAddAsset = (type, data) => {
        if (type === 'text') {
            // Find or create text track
            let textTrack = tracks.find(t => t.type === 'text');
            if (!textTrack) {
                // We need to add a track first. 
                // Since addTrack is async/state-based, we might need a better way.
                // For now, let's assume we can just add a clip to a 'track-text' if we create it.
                // Actually, useTimelineState's addClip needs a trackId.
                // Let's just use a fixed ID for simplicity or check if it exists.
                // If not, we might need to modify useTimelineState to auto-create track.
                // For now, let's just use 'track-text-1' and ensure it exists on init or add it.
            }

            // Better: Just add a new track with the clip?
            // Or add to the first available text track.

            const newClip = {
                id: `text-${Date.now()}`,
                type: 'text',
                name: data.text || 'Text',
                startTime: currentTime,
                duration: 3, // Default 3s
                startOffset: 0,
                text: data.text || 'Double Click',
                style: {
                    x: 50, y: 50,
                    fontSize: 48,
                    fontFamily: 'Arial',
                    fontWeight: 'bold',
                    color: '#ffffff'
                }
            };

            // Find text track
            const track = tracks.find(t => t.type === 'text');
            if (track) {
                addClip(track.id, newClip);
            } else {
                // We need to add a track. This is tricky inside this handler.
                // Let's modify useTimelineState to support "addClipToNewTrack" or similar?
                // Or just hack it:
                // We can't easily do it here without refactoring useTimelineState.
                // Let's assume we initialize with a text track or add one.
                // For now, let's just console.warn if no track.
                // Wait, we can use setTracks directly if we really wanted, but we should use the hook.
                // Let's just add a text track on init.
            }
        } else if (type === 'media' || type === 'audio' || type === 'video' || type === 'image') {
            // Handle adding media/audio from library to timeline
            // Find appropriate track or create new one
            // For MVP: Find first track of type, or create new
            let targetTrack = tracks.find(t => t.type === type);

            // Relaxed check: Allow images on video tracks and vice versa
            if (!targetTrack && (type === 'image' || type === 'video')) {
                targetTrack = tracks.find(t => t.type === 'video' || t.type === 'image');
            }

            // If no track of this type, we should probably add one, but for now let's reuse logic
            // Ideally useTimelineState should expose 'addTrack' which we have.

            if (!targetTrack) {
                // TODO: Auto-create track. For now, we rely on pre-existing tracks or manual creation
                console.warn(`No track found for type ${type}`);
                return;
            }

            const newClip = {
                id: `clip-${Date.now()}`,
                type: type,
                name: data.file.name,
                startTime: currentTime,
                duration: data.duration || 10, // Default or actual duration
                startOffset: 0,
                source: data.url,
                sourceDuration: data.duration
            };

            addClip(targetTrack.id, newClip);
        }
    };

    const handleAddToLibrary = (file) => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';

        // For video/audio, we might want to get duration. 
        // For now, simple add.
        const newItem = {
            id: `asset-${Date.now()}`,
            file,
            url,
            type,
            name: file.name
        };

        setMediaLibrary(prev => [...prev, newItem]);

        // If it's the first media, maybe load it as main?
        // Only if timeline is empty?
    };

    const getActiveItem = () => {
        if (!selectedClipId) return null;
        const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
        if (!track) return null;
        const clip = track.clips.find(c => c.id === selectedClipId);
        return { ...clip, type: track.type };
    };

    const handleUpdateActiveItem = (updates) => {
        if (!selectedClipId) return;

        // If updating style (x, y, etc), nest it
        if (updates.x !== undefined || updates.color !== undefined) {
            // Fetch current clip to merge style
            const current = getActiveItem();
            updateClip(selectedClipId, {
                style: { ...current.style, ...updates }
            });
        } else {
            updateClip(selectedClipId, updates);
        }
    };

    const handleDelete = () => {
        if (selectedClipId) {
            deleteClip(selectedClipId);
        }
    };

    const handleDrop = (trackId, asset, time) => {
        addClip(trackId, {
            type: asset.type,
            source: asset.url,
            startTime: time,
            duration: asset.duration || 5, // Default duration
            name: asset.name
        });
    };

    // Render upload screen if no media
    if (!mediaUrl) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                <div className="max-w-md w-full p-8 bg-[#1a1a1f] rounded-3xl border border-white/10 shadow-2xl text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                        <Video size={32} className="text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Media Editor</h2>
                    <p className="text-white/50 mb-8">Upload a video or image to start editing.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="primary" className="w-full" icon={Upload}>Select File</Button>
                    <Button onClick={onClose} variant="ghost" className="w-full mt-4" icon={X}>Close</Button>
                </div>
            </div>
        );
    }

    return (
        <EditorLayout
            header={
                <div className="flex items-center justify-between px-4 h-full">
                    <div className="flex items-center gap-3">
                        <Video size={20} className="text-blue-500" />
                        <h2 className="text-lg font-bold text-white">Media Editor</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setShowExportModal(true)} variant="primary" size="sm" icon={Download}>Export</Button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            }
            leftPanel={
                <AssetsPanel
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onAddAsset={handleAddAsset}
                    adjustments={adjustments}
                    setAdjustments={handleSetAdjustments}
                    activeFilterId={activeFilterId}
                    setActiveFilterId={handleSetFilter}
                    activeEffectId={activeEffectId}
                    setActiveEffectId={handleSetEffect}
                    effectIntensity={effectIntensity}
                    setEffectIntensity={handleSetEffectIntensity}
                    mediaUrl={mediaUrl}
                    thumbnailUrl={thumbnailUrl}
                    suggestedFilter={suggestedFilter}
                    mediaLibrary={mediaLibrary}
                    onAddToLibrary={handleAddToLibrary}
                />
            }
            centerPanel={
                <PreviewPlayer
                    canvasRef={canvasRef}
                    overlayRef={overlayRef}
                    textOverlays={renderStateRef.current.textOverlays || []}
                    stickers={renderStateRef.current.stickers || []}
                    stickerImages={[]} // Handled internally now
                    activeOverlayId={selectedClipId}
                    startDragging={() => { }} // Disabled for now
                    updateTextOverlay={() => { }}
                    deleteOverlay={handleDelete}
                    setActiveOverlayId={setSelectedClipId}
                    adjustments={adjustments}
                    cropData={cropData}
                    setCropData={setCropData}
                    cropPreset={cropPreset}
                    activeTab={activeTab}
                    buildFilterString={buildFilterString}
                />
            }
            rightPanel={
                <PropertiesPanel
                    activeItem={getActiveItem()}
                    onUpdate={handleUpdateActiveItem}
                />
            }
            bottomPanel={
                <TimelinePanel
                    tracks={visualizationTracks}
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPause}
                    currentTime={currentTime}
                    duration={timelineDuration}
                    onSeek={handleSeek}
                    onSplit={handleSplit}
                    onDelete={handleDelete}
                    zoom={timelineZoom}
                    onZoomChange={setTimelineZoom}
                    selectedClipId={selectedClipId}
                    onClipSelect={handleClipSelect}
                    onTrim={trimClip}
                    onTrimEnd={commitUpdate}
                    onMove={moveClip}
                    undo={undo}
                    redo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onAddTransition={addTransition}
                    onAddTrack={addTrack}
                    onDrop={handleDrop}
                    onReorderTrack={reorderTracks}
                    onResizeTrack={updateTrackHeight}
                />
            }
        />
    );
};

export default MediaEditor;

