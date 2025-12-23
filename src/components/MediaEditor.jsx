import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, RotateCcw, Video, Upload, Wand2 } from 'lucide-react';
import { useMediaProcessor } from './MediaEditor/hooks/useMediaProcessor';
import { useCanvasRenderer } from './MediaEditor/hooks/useCanvasRenderer';
import { usePlayback } from './MediaEditor/hooks/usePlayback';
import { useTimeline } from './MediaEditor/hooks/useTimeline';
import { useTimelineState } from './MediaEditor/hooks/useTimelineState';
import { useOverlays } from './MediaEditor/hooks/useOverlays';

import { useVoiceRecorder } from './MediaEditor/hooks/useVoiceRecorder';
import { useVideoRecorder } from './MediaEditor/hooks/useVideoRecorder';
import { useExport } from './MediaEditor/hooks/useExport';
import ExportModal from './MediaEditor/components/modals/ExportModal';


import { getInitialAdjustments, applyFilterPreset } from './MediaEditor/utils/filterUtils';
import { isPointInClip, isPointInText, getHandleAtPoint, buildFilterString } from './MediaEditor/utils/canvasUtils';
import { detectBeats } from './MediaEditor/utils/waveformUtils';
import { Button } from './MediaEditor/components/UI';
import { getFrameState } from './MediaEditor/utils/renderLogic';
import mediaSourceManager from './MediaEditor/utils/MediaSourceManager';
import { removeBackgroundAI } from '../utils/aiService';
import { processVideoBackgroundRemoval } from '../utils/videoProcessor';

// New Layout Components
import { EditorLayout } from './MediaEditor/components/layout/EditorLayout';
import { AssetsPanel } from './MediaEditor/components/panels/AssetsPanel';
import { FilterPanel } from './MediaEditor/components/FilterPanel';
import { MaskPanel } from './MediaEditor/components/MaskPanel';
import { PropertiesPanel } from './MediaEditor/components/panels/PropertiesPanel';
import { TimelinePanel } from './MediaEditor/components/timeline/TimelinePanel';
import { PreviewPlayer } from './MediaEditor/components/preview/PreviewPlayer';
import { voiceEffects } from './MediaEditor/utils/VoiceEffects';

import { AutoCompositePanel } from './MediaEditor/components/panels/AutoCompositePanel';
import { CompositionLoadingModal } from './MediaEditor/components/modals/CompositionLoadingModal';
import { ProjectCreationModal } from './MediaEditor/components/modals/ProjectCreationModal';
import { getDefaultAspectRatio } from './MediaEditor/utils/aspectRatios';
import { PixelFilters } from './MediaEditor/components/PixelFilters'; // Import PixelFilters

const EPSILON = 0.01;

/**
 * MediaEditor - Professional Video & Image Editor
 * Rebuilt with 3-pane layout and advanced timeline
 */
const MediaEditor = ({ mediaFile: initialMediaFile, onClose, initialText, initialAdjustments, suggestedFilter, isPro = false }) => {
    // Project Creation State
    const [showProjectCreation, setShowProjectCreation] = useState(!initialMediaFile);
    const [projectAspectRatio, setProjectAspectRatio] = useState(getDefaultAspectRatio());
    const [isEmptyProject, setIsEmptyProject] = useState(false); // Track if user chose empty canvas

    // Auto-Composite State
    const [showAutoComposite, setShowAutoComposite] = useState(false);
    const [showCompositionLoading, setShowCompositionLoading] = useState(false);
    const [compositionProgress, setCompositionProgress] = useState(0);
    const [compositionStatus, setCompositionStatus] = useState('');
    const [compositionSteps, setCompositionSteps] = useState({ current: 0, total: 0 });
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    // Load Fonts
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Roboto&family=Open+Sans&family=Lato&family=Montserrat&family=Oswald&family=Raleway&family=Merriweather&family=Playfair+Display&family=Nunito&family=Poppins&family=Ubuntu&family=Lobster&family=Pacifico&family=Dancing+Script&family=Satisfy&family=Great+Vibes&family=Kaushan+Script&family=Sacramento&family=Parisienne&family=Cookie&family=Bangers&family=Creepster&family=Fredoka+One&family=Righteous&family=Audiowide&family=Press+Start+2P&family=Monoton&family=Permanent+Marker&family=Rock+Salt&family=Shadows+Into+Light&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => {
            document.head.removeChild(link);
        };
    }, []);

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



    // Timeline State Hook
    const {
        tracks = [],
        setTracks,
        selectedClipId,
        setSelectedClipId,
        initializeTimeline,
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
        canUndo,
        canRedo,
        addTrack,
        reorderTracks,
        updateTrackHeight,

        detachAudio,
        addMarkersToClip,

        // Advanced features
        selectedClipIds,
        selectClip,
        magneticMode,
        toggleMagneticMode,
        groupSelectedClips,
        ungroupSelectedClips,
        addKeyframe,
        removeKeyframe
    } = useTimelineState() || {};

    // Editor State
    const [activeTab, setActiveTab] = useState('media');
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
    const [memeMode, setMemeMode] = useState(!!initialText);
    const [isCropMode, setIsCropMode] = useState(false); // Crop Mode State

    // Canvas Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [activeHandle, setActiveHandle] = useState(null); // 'tl', 'tr', 'br', 'bl', 'rot'
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialClipStateRef = useRef(null);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [mediaLibrary, setMediaLibrary] = useState([]);

    const fileInputRef = useRef(null);
    const containerRef = useRef(null);
    const overlayRef = useRef(null);
    const lastFrameRef = useRef(null);

    // Export State
    const [showExportModal, setShowExportModal] = useState(false);



    // Calculate timeline duration dynamically
    const timelineDuration = React.useMemo(() => {
        if (!tracks || tracks.length === 0) return 10; // Default 10s
        let maxDuration = 0;
        tracks.forEach(track => {
            track.clips.forEach(clip => {
                const end = clip.startTime + clip.duration;
                if (end > maxDuration) maxDuration = end;
            });
        });
        return Math.max(maxDuration, 5); // Minimum 5s
    }, [tracks]);

    // Prepare state for export
    const exportTimelineState = {
        tracks,
        duration: timelineDuration,
        canvasDimensions,
        rotation,
        zoom,
        memeMode,
        selectedClipId,
        initialAdjustments,
        effectIntensity,
        activeEffectId,
        activeFilterId
    };

    const {
        exportVideo,
        cancelExport,
        isExporting,
        exportProgress,
        exportStatus,
        exportError
    } = useExport(exportTimelineState, canvasRef);




    // Update trimRange when timeline duration changes
    useEffect(() => {
        setTrimRange(prev => ({ ...prev, end: timelineDuration }));
    }, [timelineDuration]);

    // Unified Loop Handler (Sync + Render)
    const handleRender = useCallback((time, isPlaying) => {
        const globalState = {
            canvasDimensions,
            rotation: 0,
            zoom: 1,
            memeMode,
            selectedClipId,
            initialAdjustments: adjustments,
            effectIntensity,
            activeEffectId,
            activeFilterId
        };

        const frameState = getFrameState(time, tracks, globalState);

        // 1. Sync all active layers' media elements
        // 1. Sync & Audio Logic (Deduplicated)
        const sourceMap = new Map(); // source -> { time, volume, muted, speed, media }

        frameState.visibleLayers.forEach(layer => {
            if (layer.media && layer.source && (layer.type === 'video' || layer.type === 'audio')) {
                // Determine clip properties
                const clip = tracks.flatMap(t => t.clips).find(c => c.id === layer.id);
                let vol = 0;
                let muted = true;
                let speed = 1;

                if (clip) {
                    speed = clip.speed || 1;
                    vol = (clip.volume !== undefined ? clip.volume : 100) / 100;
                    muted = !!clip.muted;

                    // Apply fades
                    if (clip.fadeIn > 0) {
                        const relTime = time - clip.startTime;
                        if (relTime < clip.fadeIn) vol *= (relTime / clip.fadeIn);
                    }
                    if (clip.fadeOut > 0) {
                        const relTime = time - clip.startTime;
                        const timeRem = clip.duration - relTime;
                        if (timeRem < clip.fadeOut) vol *= (timeRem / clip.fadeOut);
                    }
                }

                // Key by source AND variant to support multiple instances of same media
                const sourceKey = `${layer.source}::${layer.variant || 'main'}`;

                if (!sourceMap.has(sourceKey)) {
                    sourceMap.set(sourceKey, {
                        source: layer.source, // Keep raw source for prepare/sync
                        variant: layer.variant || 'main',
                        time: layer.sourceTime,
                        volume: 0,
                        muted: true, // Default muted, any unmuted clip un-mutes it
                        speed: speed,
                        media: layer.media
                    });
                }

                // Aggregate properties
                const entry = sourceMap.get(sourceKey);
                // Be slightly conservative with speed, assume first clip's speed is dominant or they match
                if (speed !== 1) entry.speed = speed;

                // Volume mixing: Max volume wins (simplest for now)
                // If any clip using this source is NOT muted, the source is NOT muted
                if (!muted) {
                    entry.muted = false;
                    entry.volume = Math.max(entry.volume, vol);
                }
            }

            // Sync Mask Video if present
            if (layer.mask && layer.mask.source && layer.mask.media && layer.mask.media instanceof HTMLVideoElement) {
                const maskKey = `${layer.mask.source}::main`;
                if (!sourceMap.has(maskKey)) {
                    sourceMap.set(maskKey, {
                        source: layer.mask.source,
                        variant: 'main',
                        time: layer.sourceTime, // Sync to same time as layer
                        volume: 0,
                        muted: true,
                        speed: layer.speed || 1,
                        media: layer.mask.media
                    });
                }
            }
        });

        // Apply synced state
        sourceMap.forEach((entry) => {
            mediaSourceManager.syncMedia(entry.source, entry.time, isPlaying, 1, entry.variant);

            const element = entry.media;
            if (element) {
                if (Math.abs(element.playbackRate - entry.speed) > 0.01) {
                    element.playbackRate = entry.speed;
                }
                const targetVol = Math.max(0, Math.min(1, entry.volume));
                if (Math.abs(element.volume - targetVol) > 0.01) {
                    element.volume = targetVol;
                }
                // Avoid property thrashing
                if (element.muted !== entry.muted) {
                    element.muted = entry.muted;
                }
            }
        });

        // 2. Pre-buffer upcoming clips (0.5s - 2.0s ahead)
        // CRITICAL: Only prepare sources that are NOT currently active to avoid seek fighting
        const activeSources = new Set(frameState.visibleLayers.map(l => l.source).filter(Boolean));
        const lookaheadTime = time + 1.0;
        tracks.forEach(track => {
            const nextClip = track.clips.find(c =>
                lookaheadTime >= c.startTime && lookaheadTime < (c.startTime + c.duration)
            );
            if (nextClip && nextClip.source && !activeSources.has(nextClip.source)) {
                const nextSourceTime = (nextClip.startOffset || 0) + (lookaheadTime - nextClip.startTime);
                mediaSourceManager.prepare(nextClip.source, nextSourceTime);
            }
        });

        // 3. Draw Frame
        render(frameState, { isPlaying });

        // 4. Cleanup old sources occasionally
        if (Math.floor(time) % 30 === 0 && !isPlaying) {
            mediaSourceManager.cleanup();
        }
    }, [
        tracks, canvasDimensions, memeMode, selectedClipId,
        adjustments, effectIntensity, activeEffectId, activeFilterId, render
    ]);

    // Playback Hook
    const {
        isPlaying,
        currentTime,
        play,
        pause,
        togglePlay,
        seek
    } = usePlayback(timelineDuration, handleRender);

    // Register Main Media Element - DISABLED
    // We handle main media sync manually now to support multiple clips on the main track
    /*
    useEffect(() => {
        if (mediaElementRef.current && isVideo) {
            return registerMedia(mediaElementRef.current);
        }
    }, [mediaElementRef, isVideo, registerMedia]);
    */

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
    const handleSplit = useCallback((targetClipId, targetTime) => {
        // If arguments are provided (Razor Tool), use them
        if (targetClipId && typeof targetClipId === 'string' && typeof targetTime === 'number') {
            splitClip(targetClipId, targetTime);
            return;
        }

        // Fallback to "Split at Playhead" logic (Keyboard Shortcut / Button)
        if (!selectedClipId) {
            // If no clip selected, try to split the clip under the playhead on the main track
            const mainTrack = tracks.find(t => t.id === 'track-main');
            if (mainTrack) {
                const clipAtPlayhead = mainTrack.clips.find(c =>
                    currentTime >= c.startTime - EPSILON && currentTime < (c.startTime + c.duration - EPSILON)
                );
                if (clipAtPlayhead) {
                    splitClip(clipAtPlayhead.id, currentTime);
                    return;
                }
            }
            return;
        }
        splitClip(selectedClipId, currentTime);
    }, [selectedClipId, tracks, currentTime, splitClip]);

    // Sync UI state when tracks change (e.g. Undo/Redo)
    useEffect(() => {
        if (selectedClipId) {
            const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
            if (track) {
                const clip = track.clips.find(c => c.id === selectedClipId);
                if (clip) {
                    // Only update if different to avoid loops (though setters usually handle this)
                    setAdjustments(prev => {
                        const newAdj = clip.adjustments || getInitialAdjustments();
                        return JSON.stringify(prev) !== JSON.stringify(newAdj) ? newAdj : prev;
                    });
                    setActiveFilterId(prev => clip.filter !== prev ? (clip.filter || 'normal') : prev);
                    setActiveEffectId(prev => clip.effect !== prev ? (clip.effect || null) : prev);
                }
            }
        }
    }, [tracks, selectedClipId]);

    // Handle Clip Selection
    const handleClipSelect = useCallback((clipId) => {
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

                // Sync Crop State
                setCropData(clip.crop || { x: 0, y: 0, width: 100, height: 100 });
                setCropPreset(clip.cropPreset || 'free');
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
    }, [tracks, setSelectedClipId, setAdjustments, setActiveFilterId, setActiveEffectId]);

    // Voice Recorder
    const { isRecording, recordingTime, startRecording, stopRecording } = useVoiceRecorder();

    const handleVoiceoverToggle = async () => {
        if (isRecording) {
            // Stop Recording
            const result = await stopRecording();
            pause(); // Pause timeline

            if (result && result.blob) {
                // Add to timeline on new audio track
                // Create audio asset
                const audioAsset = {
                    id: `voiceover - ${Date.now()} `, // temp id, addClip will generate real one
                    type: 'audio',
                    source: result.url,
                    duration: result.blob.size > 0 ? recordingTime : 1.0,
                    name: `Voiceover ${new Date().toLocaleTimeString()} `,
                    format: 'webm'
                };

                // Insert at start time (current time - duration)
                const startTime = Math.max(0, currentTime - recordingTime);
                const duration = audioAsset.duration;

                // Find an available audio track (no overlap)
                const availableTrack = tracks.find(t => {
                    if (t.type !== 'audio') return false;
                    // Check for overlap
                    const hasOverlap = t.clips.some(c => {
                        const start = c.startTime;
                        const end = c.startTime + c.duration;
                        return (startTime < end && (startTime + duration) > start);
                    });
                    return !hasOverlap;
                });

                if (availableTrack) {
                    addClip(availableTrack.id, {
                        ...audioAsset,
                        startTime
                    });
                } else {
                    addClipToNewTrack('audio', {
                        ...audioAsset,
                        startTime
                    });
                }
            }

        } else {
            // Start Recording
            await startRecording();
            play(); // Start playback for context
        }
    };

    // Video Recorder
    const { isRecordingVideo, recordingVideoTime, startVideoRecording, stopVideoRecording } = useVideoRecorder();

    const handleVideoOverToggle = async () => {
        if (isRecordingVideo) {
            // Stop Recording
            const result = await stopVideoRecording();
            pause();

            if (result && result.blob) {
                const videoAsset = {
                    id: `videoover - ${Date.now()} `,
                    type: 'video',
                    source: result.url,
                    duration: result.blob.size > 0 ? recordingVideoTime : 1.0,
                    name: `Camera ${new Date().toLocaleTimeString()} `,
                    format: 'webm',
                    transform: { scale: 50, x: 20, y: 20 }
                };

                const startTime = Math.max(0, currentTime - recordingVideoTime);
                const duration = videoAsset.duration;

                // Find available video track (no overlap)
                const availableTrack = tracks.find(t => {
                    if (t.type !== 'video') return false;
                    const hasOverlap = t.clips.some(c => {
                        const start = c.startTime;
                        const end = c.startTime + c.duration;
                        return (startTime < end && (startTime + duration) > start);
                    });
                    return !hasOverlap;
                });

                if (availableTrack) {
                    addClip(availableTrack.id, {
                        ...videoAsset,
                        startTime
                    });
                } else {
                    addClipToNewTrack('video', {
                        ...videoAsset,
                        startTime
                    });
                }
            }
        } else {
            // Start Recording
            await startVideoRecording();
            play();
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

    const handleSetMask = (newMask) => {
        if (selectedClipId) {
            updateClip(selectedClipId, { mask: newMask });
        }
    };

    // Load initial media
    useEffect(() => {
        if (initialMediaFile) {
            loadMedia(initialMediaFile);
        }
    }, [initialMediaFile, loadMedia]);

    // Initialize canvas when media loads
    // Initialize canvas when media loads
    useEffect(() => {
        if (!mediaUrl || !mediaElementRef.current || !containerRef.current) return;

        const updateCanvasSize = () => {
            const container = containerRef.current;
            if (!container) return;

            // Get container dimensions
            const { clientWidth, clientHeight } = container;
            if (clientWidth === 0 || clientHeight === 0) return;

            const mediaAspect = mediaElementRef.current.videoWidth
                ? mediaElementRef.current.videoWidth / mediaElementRef.current.videoHeight
                : mediaElementRef.current.width / mediaElementRef.current.height;

            // Initialize with full container size
            initializeCanvas(clientWidth, clientHeight, mediaAspect, memeMode ? 0.3 : 0);
        };

        // Initial sizing
        updateCanvasSize();

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            // Request animation frame to debounce and ensure layout is settled
            requestAnimationFrame(() => updateCanvasSize());
        });

        resizeObserver.observe(containerRef.current);

        if (isVideo) {
            setTrimRange({ start: 0, end: videoDuration });
        }

        return () => {
            resizeObserver.disconnect();
        };
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

    // Update render state ref whenever relevant state changes AND render immediately
    useEffect(() => {
        // Render if we have canvas AND either (main media OR timeline clips)
        if (!canvasRef.current) return;

        const hasTimelineClips = tracks.some(t => t.clips && t.clips.length > 0);
        if (!mediaUrl && !hasTimelineClips) return; // Skip only if no media AND no timeline clips


        const globalState = {
            canvasDimensions,
            rotation,
            zoom,
            memeMode,
            selectedClipId,
            initialAdjustments,
            effectIntensity,
            activeEffectId,
            activeFilterId,
            clipOverrides: selectedClipId ? { [selectedClipId]: { crop: cropData } } : null
        };

        const newState = getFrameState(currentTime, tracks, globalState);

        renderStateRef.current = newState;

        // Render immediately
        render(newState, { applyFiltersToContext: true });

    }, [adjustments, tracks, rotation, zoom, canvasDimensions, selectedClipId, memeMode, activeEffectId, effectIntensity, activeFilterId, currentTime, isVideo, render, mediaUrl, cropData]);

    // Playback controls are now handled by usePlayback
    // We just need to sync secondary videos and audio manually in the render/tick loop if usePlayback doesn't handle them all.
    // usePlayback handles registered elements.
    // For dynamic elements (secondary tracks), we should register them or sync them in an effect.

    // Media loading and synchronization are now handled by MediaSourceManager in the handleRender pulse.


    /* Disabling force-seek temporarily to debug blank screen loop
    useEffect(() => {
        const mainTrack = tracks.find(t => t.id === 'track-main');
        const clip = mainTrack?.clips.find(c =>
            currentTime >= c.startTime - EPSILON &&
            currentTime < c.startTime + c.duration - EPSILON
        );
    
        if (clip && mediaElementRef.current) {
            const expectedTime = clip.startOffset + (currentTime - clip.startTime);
            const drift = Math.abs(mediaElementRef.current.currentTime - expectedTime);
            if (drift > 0.1) {
                mediaElementRef.current.currentTime = expectedTime;
            }
        }
    }, [currentTime, tracks, mediaElementRef]);
    */

    // Cleanup Effect (Global Unmount)
    useEffect(() => {
        return () => {
            mediaSourceManager.destroy();
        };
    }, []);

    // Redundant sync effects removed as they are now handled in the unified handleRender pulse.

    // Canvas Interaction State
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragAction, setDragAction] = useState(null); // 'move', 'scale', 'rotate'
    const [initialTransform, setInitialTransform] = useState({});

    const getCanvasCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvasDimensions.width / rect.width;
        const scaleY = canvasDimensions.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleCanvasPointerDown = (e) => {
        if (!canvasRef.current) return;

        const { x, y } = getCanvasCoordinates(e);

        // 1. Check for Handles on Selected Clip first
        if (selectedClipId) {
            // Find the selected clip/text object
            let selectedItem = null;
            let isText = false;

            // Check text tracks
            for (const track of tracks) {
                if (track.type === 'text') {
                    const clip = track.clips.find(c => c.id === selectedClipId);
                    if (clip) {
                        selectedItem = clip;
                        isText = true;
                        break;
                    }
                } else {
                    const clip = track.clips.find(c => c.id === selectedClipId);
                    if (clip) {
                        selectedItem = clip;
                        break;
                    }
                }
            }

            if (selectedItem) {
                // Check if we hit a handle
                // For text, we need to construct the overlay object expected by utils
                const itemForHitTest = isText ? {
                    type: 'text',
                    x: selectedItem.style?.x || 50,
                    y: selectedItem.style?.y || 50,
                    fontSize: selectedItem.style?.fontSize || 48,
                    fontFamily: selectedItem.style?.fontFamily || 'Arial',
                    fontWeight: selectedItem.style?.fontWeight || 'bold',
                    text: selectedItem.text,
                    rotation: selectedItem.style?.rotation || 0
                } : {
                    type: 'media',
                    transform: selectedItem.transform || {}
                };

                // Get real media dimensions for accurate handle positioning
                let mediaDims = { width: 100, height: 100 };
                if (!isText) {
                    const el = mediaSourceManager.getMedia(
                        selectedItem.source,
                        selectedItem.type === 'image' ? 'image' : 'video'
                    );
                    if (el) {
                        mediaDims = {
                            width: el.videoWidth || el.width || 100,
                            height: el.videoHeight || el.height || 100
                        };
                    }
                }

                const handle = getHandleAtPoint(x, y, itemForHitTest, canvasDimensions,
                    isText ? null : mediaDims
                );

                if (handle) {
                    setIsDraggingCanvas(true);
                    setDragAction(handle.name === 'rot' ? 'rotate' : 'scale');
                    setActiveHandle(handle.name);

                    // Calculate Center for precise math
                    let cx, cy;
                    if (isText) {
                        cx = ((selectedItem.style?.x || 50) / 100) * canvasDimensions.width;
                        cy = ((selectedItem.style?.y || 50) / 100) * canvasDimensions.height;
                    } else {
                        cx = canvasDimensions.width / 2 + (selectedItem.transform?.x || 0);
                        cy = canvasDimensions.height / 2 + (selectedItem.transform?.y || 0);
                    }

                    const dx = x - cx;
                    const dy = y - cy;
                    const angle = Math.atan2(dy, dx);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    setDragStart({
                        x, y,
                        cx, cy,
                        initialAngle: angle,
                        initialDistance: distance,
                        initialRotation: (isText ? selectedItem.style?.rotation : selectedItem.transform?.rotation) || 0,
                        initialScale: isText ? (selectedItem.style?.fontSize || 48) : (selectedItem.transform?.scale || 100)
                    });
                    setInitialTransform(isText ? { ...selectedItem.style } : { ...selectedItem.transform });
                    return;
                }
            }
        }

        // 2. Hit Test for Selection (Reverse render order: Top to Bottom)
        // Gather all visible items in Z-order
        const visibleItems = [];
        tracks.forEach((track, index) => {
            track.clips.forEach(clip => {
                if (currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)) {
                    visibleItems.push({ ...clip, trackType: track.type, zIndex: index });
                }
            });
        });

        // Iterate reverse (Top to Bottom)
        for (let i = visibleItems.length - 1; i >= 0; i--) {
            const item = visibleItems[i];
            let isHit = false;

            if (item.trackType === 'text') {
                const textOverlay = {
                    x: item.style?.x || 50,
                    y: item.style?.y || 50,
                    fontSize: item.style?.fontSize || 48,
                    fontFamily: item.style?.fontFamily || 'Arial',
                    fontWeight: item.style?.fontWeight || 'bold',
                    text: item.text,
                    rotation: item.style?.rotation || 0
                };
                isHit = isPointInText(x, y, textOverlay, canvasDimensions);
            } else {
                // Media, Sticker, Image
                // Need dimensions for aspect ratio calculation in isPointInClip
                let mediaDims = { width: 100, height: 100 };

                if (item.trackType === 'sticker') {
                    // Estimate or use default for stickers if image not available
                    // TODO: Get actual sticker dims
                    mediaDims = { width: 100, height: 100 };
                } else {
                    // Video/Image
                    const type = item.trackType === 'image' ? 'image' : 'video';
                    const el = mediaSourceManager.getMedia(item.source, type);
                    if (el) {
                        mediaDims = {
                            width: el.videoWidth || el.width || 100,
                            height: el.videoHeight || el.height || 100
                        };
                    }
                }

                isHit = isPointInClip(x, y, item, canvasDimensions, mediaDims);
            }

            if (isHit) {
                handleClipSelect(item.id);
                setIsDraggingCanvas(true);
                setDragAction('move');
                setDragStart({ x, y });
                setInitialTransform(item.trackType === 'text' ? { ...item.style } : { ...item.transform });
                return;
            }
        }

        // If clicked on nothing, deselect?
        // setSelectedClipId(null);
    };

    const handleCanvasPointerMove = (e) => {
        if (!isDraggingCanvas || !selectedClipId || !dragAction) return;

        const { x, y } = getCanvasCoordinates(e);
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        // Find the track/clip to update
        const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
        if (!track) return;
        const clip = track.clips.find(c => c.id === selectedClipId);
        if (!clip) return;

        const isText = track.type === 'text';

        if (dragAction === 'move') {
            // Convert px delta to % delta
            const dxPercent = (dx / canvasDimensions.width) * 100;
            const dyPercent = (dy / canvasDimensions.height) * 100;

            if (isText) {
                const newStyle = {
                    ...clip.style,
                    x: (initialTransform.x || 50) + dxPercent,
                    y: (initialTransform.y || 50) + dyPercent
                };
                updateClip(selectedClipId, { style: newStyle });
            } else {
                // Media/Sticker
                const newTransform = {
                    ...clip.transform,
                    // Wait, drawMediaToCanvas uses x as offset in pixels?
                    // Let's check drawMediaToCanvas:
                    // const centerX = logicalWidth / 2 + x;
                    // So x is in pixels from center.
                    // But text uses % from top-left.
                    // This inconsistency is annoying.
                    // Let's assume media transform x/y is in pixels for now as per previous code.
                    x: (initialTransform.x || 0) + dx,
                    y: (initialTransform.y || 0) + dy
                };
                updateClip(selectedClipId, { transform: newTransform });
            }
        } else if (dragAction === 'scale') {
            const { cx, cy, initialDistance, initialScale } = dragStart;
            const dx = x - cx;
            const dy = y - cy;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            // Prevent division by zero or negative scale
            if (initialDistance < 1) return;

            const scaleFactor = currentDistance / initialDistance;
            const newScaleVal = Math.max(1, initialScale * scaleFactor);

            if (isText) {
                updateClip(selectedClipId, {
                    style: { ...clip.style, fontSize: newScaleVal }
                });
            } else {
                updateClip(selectedClipId, {
                    transform: { ...clip.transform, scale: newScaleVal }
                });
            }
        } else if (dragAction === 'rotate') {
            const { cx, cy, initialAngle, initialRotation } = dragStart;
            const dx = x - cx;
            const dy = y - cy;
            const currentAngle = Math.atan2(dy, dx);
            const deltaAngle = (currentAngle - initialAngle) * (180 / Math.PI);
            const newRotation = initialRotation + deltaAngle;

            if (isText) {
                updateClip(selectedClipId, {
                    style: { ...clip.style, rotation: newRotation }
                });
            } else {
                updateClip(selectedClipId, {
                    transform: { ...clip.transform, rotation: newRotation }
                });
            }
        }
    };

    const handleCanvasPointerUp = () => {
        setIsDraggingCanvas(false);
        setDragAction(null);
    };



    // Handlers
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) loadMedia(file);
    };

    const handlePlayPause = () => {
        togglePlay();
    };

    // Loading state for seeking
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const wasPlayingBeforeSeek = useRef(false);

    const handleSeek = useCallback((time) => {
        seek(time);

        // Immediate sync for preview
        const globalState = {
            canvasDimensions,
            rotation: 0,
            zoom: 1,
            memeMode,
            selectedClipId,
            initialAdjustments: adjustments,
            effectIntensity,
            activeEffectId,
            activeEffectId,
            activeFilterId,
            clipOverrides: selectedClipId ? { [selectedClipId]: { crop: cropData } } : null
        };

        const frameState = getFrameState(time, tracks, globalState);

        frameState.visibleLayers.forEach(layer => {
            if (layer.media && (layer.type === 'video' || layer.type === 'audio')) {
                mediaSourceManager.syncMedia(layer.source, layer.sourceTime, false);
            }
        });

        render(frameState, { isPlaying: false });
    }, [seek, tracks, canvasDimensions, memeMode, selectedClipId, adjustments, effectIntensity, activeEffectId, activeFilterId, render]);

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
                id: `text - ${Date.now()} `,
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
                addClipToNewTrack('text', newClip);
            }
        } else if (type === 'media' || type === 'audio' || type === 'video' || type === 'image') {
            // Handle adding media/audio from library to timeline

            const duration = data.duration || 10;
            const startTime = currentTime;
            const endTime = startTime + duration;

            // Helper to check for collision on a specific track
            const hasCollision = (track) => {
                return track.clips.some(c => {
                    const cStart = c.startTime;
                    const cEnd = c.startTime + c.duration;
                    // Check overlap: (StartA < EndB) and (EndA > StartB)
                    return (startTime < cEnd && endTime > cStart);
                });
            };

            // Find appropriate track or create new one
            // 1. Try to find an existing track of compatible type that has NO collision
            let targetTrack = tracks.find(t => {
                // Check type compatibility
                let isCompatible = t.type === type;
                if (type === 'image' || type === 'video') {
                    isCompatible = (t.type === 'video' || t.type === 'image');
                }

                if (!isCompatible) return false;

                // Check collision
                return !hasCollision(t);
            });

            const newClip = {
                id: `clip - ${Date.now()} `,
                type: type,
                name: data.file ? data.file.name : (data.name || 'Media'),
                startTime: startTime,
                duration: duration,
                startOffset: 0,
                source: data.url,
                sourceDuration: data.duration
            };

            if (targetTrack) {
                addClip(targetTrack.id, newClip);
            } else {
                // No available track found, create a new one
                // Determine track type for creation
                const trackType = (type === 'image' || type === 'video') ? 'video' : type;
                addClipToNewTrack(trackType, newClip);
            }
        } else if (type === 'adjustment') {
            const newClip = {
                id: `clip - adj - ${Date.now()} `,
                type: 'adjustment',
                name: data.name || 'Adjustment Layer',
                startTime: currentTime,
                duration: data.duration || 5, // Default 5s
                startOffset: 0,
                adjustments: {}
            };

            const track = tracks.find(t => t.type === 'adjustment');
            if (track) {
                // Find a free spot? For now, overlap is okay or just add.
                // Or snap to end if occupied?
                // Let's just add it at currentTime.
                addClip(track.id, newClip);
            } else {
                addClipToNewTrack('adjustment', newClip);
            }
        } else if (type === 'sticker') {
            // Handle Sticker
            // Check if it's animated (Tenor usually is)
            const isAnimated = data.isAnimated || data.url.endsWith('.mp4');

            const newClip = {
                id: `sticker - ${Date.now()} `,
                type: 'sticker',
                name: 'Sticker',
                startTime: currentTime,
                duration: 5, // Default duration
                startOffset: 0,
                source: data.url,
                isAnimated: isAnimated,
                thumbnail: data.thumbnail,
                transform: {
                    x: 50, y: 50, scale: 100, rotation: 0
                }
            };

            // Find sticker track or create
            let track = tracks.find(t => t.type === 'sticker');
            if (track) {
                addClip(track.id, newClip);
            } else {
                addClipToNewTrack('sticker', newClip);
            }
        }
    };

    /**
     * Applies AI-generated composition to timeline with loading progress
     * Supports muting original video audio based on user preference
     */
    const handleApplyComposition = useCallback(async (plan, audioTrack, videoClips, options = {}) => {
        if (!plan) return;

        const { muteOriginalAudio = true } = options;
        const timestamp = Date.now();
        const totalSteps = plan.clips.length + 2; // clips + audio + finalization

        // Show loading modal
        setShowAutoComposite(false);
        setShowCompositionLoading(true);
        setCompositionProgress(0);
        setCompositionSteps({ current: 0, total: totalSteps });

        try {
            // Small delay to show modal
            await new Promise(resolve => setTimeout(resolve, 300));

            // Step 1: Create Video Track
            setCompositionStatus('Creating video track...');
            const mainTrack = {
                id: 'track-main',
                type: 'video',
                height: 80,
                clips: plan.clips.map((clip, index) => ({
                    id: `clip - ${timestamp} -${index} `,
                    type: 'video',
                    name: `Clip ${index + 1} `,
                    startTime: clip.startTime,
                    duration: clip.duration,
                    startOffset: clip.startOffset,
                    source: clip.source,
                    sourceDuration: clip.videoAnalysis?.duration || 10,
                    // Apply audio muting based on user preference
                    muted: muteOriginalAudio,
                    audioDetached: muteOriginalAudio,
                    // Keep filter and adjustments on clips for backward compatibility?
                    // NO: We are moving them to adjustment layers (Step 3), so we must CLEAR them here to avoid double application.
                    filter: null,
                    adjustments: {},
                    effects: clip.effects,
                    transition: plan.transitions?.find(t => t.fromClipIndex === index)
                }))
            };

            setCompositionProgress(30);
            setCompositionSteps(prev => ({ ...prev, current: 1 }));
            await new Promise(resolve => setTimeout(resolve, 200));

            // Step 2: Create Audio Track
            setCompositionStatus('A dding background audio...');
            const audioTrackObj = {
                id: 'track-audio-main',
                type: 'audio',
                height: 48,
                clips: [{
                    id: `clip - audio - ${timestamp} `,
                    type: 'audio',
                    name: audioTrack.name || 'Background Music',
                    startTime: 0,
                    duration: plan.duration,
                    startOffset: 0,
                    source: audioTrack.url,
                    volume: 100
                }]
            };

            setCompositionProgress(60);
            setCompositionSteps(prev => ({ ...prev, current: 2 }));
            await new Promise(resolve => setTimeout(resolve, 200));

            // Step 3: Create Adjustment Layer Tracks for Color Grading
            setCompositionStatus('Applying color grading...');
            const filterGroups = {};
            plan.clips.forEach((clip, index) => {
                const filter = clip.filter || 'normal';
                const hasAdjustments = clip.adjustments && Object.keys(clip.adjustments).length > 0;

                // Fix: Allow normal filter if it has custom adjustments (e.g. from AI)
                if (filter !== 'normal' || hasAdjustments) {
                    const groupKey = filter === 'normal' ? 'custom' : filter;
                    if (!filterGroups[groupKey]) {
                        filterGroups[groupKey] = [];
                    }
                    filterGroups[groupKey].push({ clip, index });
                }
            });

            const adjustmentTracks = Object.entries(filterGroups).map(([filter, clips], trackIndex) => {
                const adjustmentClips = clips.map(({ clip, index }) => ({
                    id: `adj - ${timestamp} -${trackIndex} -${index} `,
                    type: 'adjustment',
                    name: `${filter === 'custom' ? 'Custom' : filter} Grade`,
                    startTime: clip.startTime,
                    duration: clip.duration,
                    startOffset: 0,
                    adjustments: clip.adjustments || {},
                    filter: null, // Force no filter preset, only adjustments
                    rawAI_Grading: clip.videoAnalysis?.colorGrading || {}
                }));

                return {
                    id: `track - adjustment - ${timestamp} -${trackIndex} `,
                    type: 'adjustment',
                    height: 40,
                    clips: adjustmentClips
                };
            });

            setCompositionProgress(80);
            await new Promise(resolve => setTimeout(resolve, 200));

            // Step 4: Pre-buffering / Prerendering
            setCompositionStatus('Prerendering for smooth playback...');
            const video = mediaElementRef.current;
            if (video && plan.clips.length > 0) {
                // Pause first
                video.pause();

                // Sample a few key points to force buffering
                // We don't want to do every clip if there are too many, just enough to warm up cache
                const clipsToBuffer = plan.clips.filter((_, i) => i % 2 === 0 || i === 0); // Every other clip

                for (let i = 0; i < clipsToBuffer.length; i++) {
                    const clip = clipsToBuffer[i];
                    const seekTime = clip.sourceStartTime || 0; // Use source start time if available, else 0

                    // Seek
                    video.currentTime = seekTime;

                    // Wait for buffer
                    await new Promise(resolve => {
                        const onSeeked = () => resolve();
                        video.addEventListener('seeked', onSeeked, { once: true });
                        setTimeout(resolve, 300); // Fast timeout, just need to trigger request
                    });

                    // Update progress slightly within this step
                    setCompositionProgress(80 + Math.floor((i / clipsToBuffer.length) * 10));
                }
            }

            // Step 5: Finalize - Update Timeline
            setCompositionStatus('Finalizing timeline...');
            setTracks([mainTrack, ...adjustmentTracks, audioTrackObj]);
            setSelectedClipId(null);

            // Critical: Update trim range to match composition duration
            // This ensures export covers the full length
            if (plan.duration && plan.duration > 0) {
                setTrimRange({ start: 0, end: plan.duration });
            }

            setCompositionProgress(100);
            setCompositionSteps(prev => ({ ...prev, current: totalSteps }));
            setCompositionStatus('Complete!');

            // Wait a moment before closing
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
            console.error('Error applying composition:', error);
            setCompositionStatus('Error occurred');
            await new Promise(resolve => setTimeout(resolve, 1500));
        } finally {
            // Close loading modal
            setShowCompositionLoading(false);
        }
    }, [setTracks, setSelectedClipId]);

    const handleAddToLibrary = async (file) => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
        let duration = 5; // Default for images

        if (type === 'video' || type === 'audio') {
            const element = type === 'video' ? document.createElement('video') : document.createElement('audio');
            element.preload = 'metadata';
            element.src = url;

            try {
                await new Promise((resolve, reject) => {
                    element.onloadedmetadata = () => {
                        if (isFinite(element.duration)) {
                            duration = element.duration;
                        }
                        resolve();
                    };
                    element.onerror = () => {
                        console.warn("Failed to load media metadata");
                        resolve(); // Resolve anyway to allow adding
                    };
                    // Timeout safety
                    setTimeout(resolve, 1000);
                });
            } catch (e) {
                console.warn("Error getting duration", e);
            }
        }

        const newItem = {
            id: `asset - ${Date.now()} `,
            file,
            url,
            type,
            name: file.name,
            duration: duration
        };

        setMediaLibrary(prev => [...prev, newItem]);
    };

    const getActiveItem = () => {
        if (!selectedClipId) return null;
        const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
        if (!track) return null;
        const clip = track.clips.find(c => c.id === selectedClipId);
        // Prioritize clip type if available (e.g. image on video track), fallback to track type
        return { type: track.type, ...clip };
    };

    const handleUpdateActiveItem = (updates) => {
        if (!selectedClipId) return;

        const current = getActiveItem();
        const finalUpdates = { ...updates };

        // Handle Transform Merging
        if (updates.transform) {
            finalUpdates.transform = {
                ...(current.transform || {}),
                ...updates.transform
            };
        }

        // Handle Style Merging
        // If updates has a style object, merge it with current style
        if (updates.style) {
            finalUpdates.style = {
                ...(current.style || {}),
                ...updates.style
            };
        }

        // Legacy support: if x/y/color are passed at top level, move them to style
        // But DO NOT move 'text' to style, as it lives at top level.
        if (updates.x !== undefined || updates.y !== undefined || updates.color !== undefined) {
            finalUpdates.style = {
                ...(finalUpdates.style || current.style || {}),
            };

            if (updates.x !== undefined) {
                finalUpdates.style.x = updates.x;
                delete finalUpdates.x;
            }
            if (updates.y !== undefined) {
                finalUpdates.style.y = updates.y;
                delete finalUpdates.y;
            }
            if (updates.color !== undefined) {
                finalUpdates.style.color = updates.color;
                delete finalUpdates.color;
            }
        }

        updateClip(selectedClipId, finalUpdates);
    };

    const getVideoElement = useCallback((clipId) => {
        const track = tracks.find(t => t.clips.some(c => c.id === clipId));
        if (track) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip && clip.source) {
                return mediaSourceManager.getMedia(clip.source, track.type === 'image' ? 'image' : 'video');
            }
        }
        return null;
    }, [tracks]);

    /**
     * Handle Crop Data Changes
     */
    const handleCropChange = useCallback((newCropData) => {
        setCropData(newCropData);
        // Only update local state for performance. 
        // Real-time canvas updates should use clipOverrides in render loop.
    }, []);

    const handleCropEnd = useCallback(() => {
        if (selectedClipId && cropData) {
            updateClip(selectedClipId, { crop: cropData });
        }
    }, [selectedClipId, cropData, updateClip]);

    const handleRemoveBackground = useCallback(async (clipId) => {
        const item = getActiveItem();

        if (!item || item.id !== clipId) {
            console.error("Invalid item for background removal");
            return;
        }

        // Check if item is image or video
        const isVideo = item.type === 'video';

        try {
            // Get the actual media element
            const mediaElement = getVideoElement(clipId);
            if (!mediaElement) throw new Error("Media element not found");

            if (isVideo) {
                // Video Background Removal Logic
                console.log("Starting Video Background Removal (Baked Alpha)...");

                // Process Video
                const processedVideoUrl = await processVideoBackgroundRemoval(item.source, (progress) => {
                    console.log(`Processing: ${progress}%`);
                });

                // Update Clip with new transparent video
                updateClip(clipId, {
                    source: processedVideoUrl,
                    maskSource: null,
                    mask: null // Clear any existing mask
                });

                // Register new source
                mediaSourceManager.getMedia(processedVideoUrl, 'video');

                console.log("Video Background Removal Complete!");


            } else {
                // Image Background Removal (Existing Logic)
                const canvas = document.createElement('canvas');
                canvas.width = mediaElement.naturalWidth || mediaElement.width;
                canvas.height = mediaElement.naturalHeight || mediaElement.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(mediaElement, 0, 0);
                const base64 = canvas.toDataURL('image/png');

                // No token needed for client-side removal
                const resultBase64 = await removeBackgroundAI(base64);

                if (resultBase64) {
                    updateClip(clipId, { source: resultBase64 });
                    // Also update the media source manager so it doesn't use the old cached version
                    mediaSourceManager.getMedia(resultBase64, 'image');
                }
            }
        } catch (error) {
            console.error("Failed to remove background:", error);
            alert("Failed to remove background: " + error.message);
        }
    }, [selectedClipId, tracks, updateClip, getVideoElement]);

    const handleCropPresetChange = useCallback((preset) => {
        setCropPreset(preset);
        if (selectedClipId) {
            updateClip(selectedClipId, { cropPreset: preset });
        }
    }, [selectedClipId, updateClip]);

    // Handle Rotation/Zoom from Crop Panel (updates transform)
    const handleCropTransformChange = useCallback((key, value) => {
        const current = getActiveItem();
        if (!current) return;

        const newTransform = {
            ...(current.transform || {}),
            [key]: value
        };
        handleUpdateActiveItem({ transform: newTransform });
    }, [selectedClipId, tracks]);



    const handleDelete = useCallback(() => {
        if (selectedClipId) {
            deleteClip(selectedClipId);
        }
    }, [selectedClipId, deleteClip]);

    const handleDrop = useCallback((trackId, asset, time) => {
        const clipData = {
            type: asset.type,
            source: asset.url,
            startTime: time,
            duration: asset.duration || 5, // Default duration
            name: asset.name
        };

        if (!trackId) {
            // Auto-create new track
            addClipToNewTrack(asset.type, clipData);
        } else {
            // Add to existing track with "Connect" logic (Snap to end if close)
            // We need to find the track to check for collisions/snapping
            // We need to find the track to check for collisions/snapping
            const track = tracks.find(t => t.id === trackId);
            if (track) {
                // Find if we are dropping near the end of another clip
                let closestEnd = -1;
                let minDiff = Infinity;

                track.clips.forEach(c => {
                    const end = c.startTime + c.duration;
                    const diff = Math.abs(time - end);
                    if (diff < 1.0) { // Snap threshold 1s
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestEnd = end;
                        }
                    }
                });

                if (closestEnd !== -1) {
                    clipData.startTime = closestEnd;
                }
            }

            addClip(trackId, clipData);
        }
    }, [addClipToNewTrack, tracks, addClip]);

    const handleBeatDetect = useCallback(async (clipId, source) => {
        if (!source || !clipId) return;
        const beats = await detectBeats(source);
        if (beats && beats.length > 0) {
            addMarkersToClip(clipId, beats);
        }
    }, [addMarkersToClip]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if input/textarea is focused
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedClipId) {
                    handleDelete();
                }
            }

            // Undo/Redo
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (canRedo) redo();
                } else {
                    if (canUndo) undo();
                }
            }

            // Redo (Ctrl+Y)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if (canRedo) redo();
            }

            // Play/Pause (Spacebar)
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                togglePlay();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipId, handleDelete, undo, redo, canUndo, canRedo]);


    const handleAddAdjustmentLayer = useCallback((targetClipId, adjustments) => {
        // Find target clip to get timing
        let targetClip = null;
        for (const track of tracks) {
            const clip = track.clips.find(c => c.id === targetClipId);
            if (clip) {
                targetClip = clip;
                break;
            }
        }

        if (!targetClip) return;

        const clipData = {
            type: 'adjustment',
            startTime: targetClip.startTime,
            duration: targetClip.duration,
            name: 'AI Color Grade',
            adjustments: adjustments
        };

        // Add to a new track to ensure it sits above
        addClipToNewTrack('adjustment', clipData);
    }, [tracks, addClipToNewTrack]);

    // Handle project creation
    const handleCreateProject = useCallback((aspectRatio, mediaFile) => {
        setProjectAspectRatio(aspectRatio);

        if (mediaFile) {
            // Load media with the selected aspect ratio
            setIsEmptyProject(false);
            loadMedia(mediaFile);
        } else {
            // Initialize empty timeline with blank canvas
            setIsEmptyProject(true);
            initializeTimeline(null, 'video', 10);

            // Initialize canvas with proper sizing after a short delay to ensure container is rendered
            setTimeout(() => {
                if (containerRef.current && canvasRef.current) {
                    const container = containerRef.current;
                    const containerWidth = container.clientWidth || 800;
                    const containerHeight = container.clientHeight || 600;
                    const aspectRatioValue = aspectRatio.dimensions.width / aspectRatio.dimensions.height;

                    initializeCanvas(containerWidth, containerHeight, aspectRatioValue, 0);
                }
            }, 100);
        }

        setShowProjectCreation(false);
    }, [containerRef, canvasRef, loadMedia, initializeTimeline, initializeCanvas]);

    const handleToggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            // Enter Fullscreen
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            // Exit Fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    // Show project creation screen if no media and not skipped
    if (showProjectCreation) {
        return (
            <ProjectCreationModal
                onCreateProject={handleCreateProject}
                onClose={onClose}
            />
        );
    }


    // Render upload screen if no media (after project created) - but skip for empty projects
    if (!mediaUrl && !isEmptyProject) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                <div className="max-w-md w-full p-8 bg-[#1a1a1f] rounded-3xl border border-white/10 shadow-2xl text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                        <Video size={32} className="text-blue-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Media Editor</h2>
                    <p className="text-white/50 mb-4">Canvas: {projectAspectRatio.name} ({projectAspectRatio.ratio})</p>
                    <p className="text-white/30 mb-8">{projectAspectRatio.dimensions.width}Ã—{projectAspectRatio.dimensions.height}</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/*" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="primary" className="w-full" icon={Upload}>Import Media</Button>
                    <Button onClick={onClose} variant="ghost" className="w-full mt-4" icon={X}>Close</Button>
                </div>
            </div>
        );
    }

    const handleTransitionSelect = (clipId) => {
        setSelectedClipId(clipId);
        setActiveTab('transitions');
    };





    return (
        <>
            <PixelFilters />
            <EditorLayout
                header={
                    <div className="flex items-center justify-between px-4 h-full">
                        <div className="flex items-center gap-3">
                            <Video size={20} className="text-blue-500" />
                            <h2 className="text-lg font-bold text-white">Media Editor</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setShowAutoComposite(true)}
                                variant="secondary"
                                size="sm"
                                icon={Wand2}
                                title="AI Auto Composite"
                            >
                                Auto Composite
                            </Button>
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
                        mask={tracks.find(t => t.clips.some(c => c.id === selectedClipId))?.clips.find(c => c.id === selectedClipId)?.mask}
                        onUpdateMask={handleSetMask}
                        activeClip={getActiveItem()}
                        onUpdateClip={handleUpdateActiveItem}
                    />
                }
                centerPanel={
                    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PreviewPlayer
                            canvasRef={canvasRef}
                            overlayRef={overlayRef}
                            textOverlays={renderStateRef.current.textOverlays || []}
                            stickers={renderStateRef.current.stickers || []}
                            stickerImages={[]}
                            activeOverlayId={selectedClipId}
                            startDragging={() => { }}
                            updateTextOverlay={() => { }}
                            deleteOverlay={handleDelete}
                            setActiveOverlayId={setSelectedClipId}
                            adjustments={adjustments}
                            cropData={cropData}
                            setCropData={handleCropChange}
                            onCropEnd={handleCropEnd}
                            cropPreset={cropPreset}
                            activeTab={activeTab}
                            isCropMode={isCropMode}
                            buildFilterString={buildFilterString}
                            onCanvasPointerDown={handleCanvasPointerDown}
                            onCanvasPointerMove={handleCanvasPointerMove}
                            onCanvasPointerUp={handleCanvasPointerUp}
                        />
                    </div>
                }
                rightPanel={
                    <PropertiesPanel
                        activeItem={getActiveItem()}
                        onUpdate={handleUpdateActiveItem}
                        currentTime={currentTime}
                        onAddKeyframe={addKeyframe}
                        onRemoveKeyframe={removeKeyframe}
                        getVideoElement={getVideoElement}
                        onAddAdjustmentLayer={handleAddAdjustmentLayer}
                        isCropMode={isCropMode}
                        onToggleCropMode={setIsCropMode}
                        cropPreset={cropPreset}
                        onCropPresetChange={handleCropPresetChange}
                        onRemoveBackground={handleRemoveBackground}
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
                        selectedClipIds={selectedClipIds}
                        onClipSelect={(id, event) => {
                            // Support multi-select with Shift/Ctrl
                            const isMulti = event?.shiftKey || event?.ctrlKey || event?.metaKey;
                            selectClip(id, isMulti);
                        }}
                        magneticMode={magneticMode}
                        onToggleMagnetic={toggleMagneticMode}
                        onGroup={groupSelectedClips}
                        onUngroup={ungroupSelectedClips}
                        onTrim={trimClip}
                        onTrimEnd={commitUpdate}
                        onMove={moveClip}
                        undo={undo}
                        redo={redo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onAddTransition={addTransition}
                        onTransitionSelect={handleTransitionSelect}
                        onAddTrack={addTrack}
                        onDrop={handleDrop}
                        onReorderTrack={reorderTracks}
                        onResizeTrack={updateTrackHeight}
                        onDetachAudio={detachAudio}
                        onBeatDetect={handleBeatDetect}
                        isRecording={isRecording}
                        onToggleRecording={handleVoiceoverToggle}
                        isRecordingVideo={isRecordingVideo}
                        onToggleVideoRecording={handleVideoOverToggle}
                        onToggleFullscreen={handleToggleFullscreen}
                    />
                }
            />


            {/* Auto-Composite Panel Modal */}
            {
                showAutoComposite && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowAutoComposite(false)}
                    >
                        <div
                            className="w-[800px] h-[700px] bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <AutoCompositePanel
                                onApplyComposition={handleApplyComposition}
                                mediaLibrary={mediaLibrary}
                                apiKey={apiKey}
                                onClose={() => setShowAutoComposite(false)}
                            />
                        </div>
                    </div>
                )
            }

            {/* Composition Loading Modal */}
            <CompositionLoadingModal
                isOpen={showCompositionLoading}
                progress={compositionProgress}
                status={compositionStatus}
                currentStep={compositionSteps.current}
                totalSteps={compositionSteps.total}
            />

            <ExportModal
                isOpen={showExportModal}
                onClose={() => !isExporting && setShowExportModal(false)}
                onExport={exportVideo}
                isExporting={isExporting}
                progress={exportProgress}
                status={exportStatus}
                error={exportError}
            />
        </>
    );
};

export default MediaEditor;

