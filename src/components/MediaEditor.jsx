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
import { buildFilterString, isPointInClip, isPointInText, getHandleAtPoint } from './MediaEditor/utils/canvasUtils';
import { detectBeats } from './MediaEditor/utils/waveformUtils';
import { Button } from './MediaEditor/components/UI';
import { getFrameState } from './MediaEditor/utils/renderLogic';

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
    const [memeMode, setMemeMode] = useState(!!initialText);

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
    const imageElementsRef = useRef({}); // Cache for image clip elements
    const audioElementsRef = useRef({}); // Cache for audio clip elements
    const videoElementsRef = useRef({}); // Cache for secondary video clip elements

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

    const exportMediaResources = {
        mediaElement: mediaElementRef.current,
        videoElements: videoElementsRef.current,
        imageElements: imageElementsRef.current,
        mediaUrl,
        isVideo
    };

    const {
        exportVideo,
        cancelExport,
        isExporting,
        exportProgress,
        exportStatus,
        exportError
    } = useExport(exportTimelineState, exportMediaResources, canvasRef);




    // Update trimRange when timeline duration changes
    useEffect(() => {
        setTrimRange(prev => ({ ...prev, end: timelineDuration }));
    }, [timelineDuration]);

    // Playback Hook
    const {
        isPlaying,
        currentTime,
        play,
        pause,
        togglePlay,
        seek
    } = usePlayback(timelineDuration, (time) => {
        // Optional: Any per-tick logic that isn't rendering
    });

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


        const mainTrack = tracks.find(t => t.id === 'track-main');
        const globalState = {
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

        const mediaResources = {
            mediaElement: mediaElementRef.current,
            videoElements: videoElementsRef.current,
            imageElements: imageElementsRef.current,
            mediaUrl,
            isVideo
        };

        const newState = getFrameState(currentTime, tracks, mediaResources, globalState);

        renderStateRef.current = newState;

        // Render immediately
        render(newState, { applyFiltersToContext: true });

    }, [adjustments, tracks, rotation, zoom, canvasDimensions, selectedClipId, memeMode, activeEffectId, effectIntensity, activeFilterId, currentTime, isVideo, render, mediaUrl]);

    // Playback controls are now handled by usePlayback
    // We just need to sync secondary videos and audio manually in the render/tick loop if usePlayback doesn't handle them all.
    // usePlayback handles registered elements.
    // For dynamic elements (secondary tracks), we should register them or sync them in an effect.

    // Pre-load video/image elements for all clips when tracks change
    useEffect(() => {
        tracks.forEach(track => {
            if (track.type === 'video' || track.type === 'sticker') {
                track.clips.forEach(clip => {
                    // Create video element if not exists
                    if (clip.type === 'video' && !videoElementsRef.current[clip.id]) {
                        const video = document.createElement('video');
                        video.src = clip.source;
                        video.muted = !!(clip.muted || clip.audioDetached);
                        video.crossOrigin = 'anonymous';
                        video.preload = 'metadata';
                        videoElementsRef.current[clip.id] = video;

                        // Load video metadata
                        video.load();
                    }
                });
            } else if (track.type === 'image') {
                track.clips.forEach(clip => {
                    // Create image element if not exists
                    if (!imageElementsRef.current[clip.id]) {
                        const img = new Image();
                        img.src = clip.source || clip.thumbnail;
                        img.crossOrigin = 'anonymous';
                        imageElementsRef.current[clip.id] = img;
                    }
                });
            }
        });
    }, [tracks]);

    // Separate Cleanup Effect to avoid running on every frame
    useEffect(() => {
        const currentClipIds = new Set();
        tracks.forEach(t => t.clips.forEach(c => currentClipIds.add(c.id)));

        // Cleanup Audio Ref
        Object.keys(audioElementsRef.current).forEach(clipId => {
            if (!currentClipIds.has(clipId)) {
                const audio = audioElementsRef.current[clipId];
                if (!audio.paused) audio.pause();
                audio.src = '';
                delete audioElementsRef.current[clipId];
            }
        });

        // Cleanup Video Ref
        Object.keys(videoElementsRef.current).forEach(clipId => {
            if (!currentClipIds.has(clipId)) {
                const video = videoElementsRef.current[clipId];
                if (!video.paused) video.pause();
                video.src = '';
                delete videoElementsRef.current[clipId];
            }
        });

        // Cleanup Image Ref
        Object.keys(imageElementsRef.current).forEach(clipId => {
            if (!currentClipIds.has(clipId)) {
                delete imageElementsRef.current[clipId];
            }
        });
    }, [tracks]);

    useEffect(() => {
        // Helper to apply audio properties
        const applyAudioProps = (element, clip, time) => {
            if (!element || !clip) return;

            // Speed
            const speed = clip.speed || 1;
            if (Math.abs(element.playbackRate - speed) > 0.01) {
                element.playbackRate = speed;
            }

            // Volume & Fades
            let volume = (clip.volume !== undefined ? clip.volume : 100) / 100;

            // Fade In
            if (clip.fadeIn > 0) {
                const relativeTime = time - clip.startTime;
                if (relativeTime < clip.fadeIn) {
                    volume *= (relativeTime / clip.fadeIn);
                }
            }

            // Fade Out
            if (clip.fadeOut > 0) {
                const relativeTime = time - clip.startTime;
                const endTime = clip.duration;
                const timeRemaining = endTime - relativeTime;

                if (timeRemaining < clip.fadeOut) {
                    volume *= (timeRemaining / clip.fadeOut);
                }
            }

            // Clamp and Apply
            volume = Math.max(0, Math.min(1, volume));
            if (Math.abs(element.volume - volume) > 0.01) {
                element.volume = volume;
            }
        };

        // Sync Secondary Videos (and Animated Stickers) + ALL videos on empty canvas
        tracks.forEach(track => {
            // Skip non-video tracks, but INCLUDE track-main for empty canvas projects
            if (track.type !== 'video' && track.type !== 'sticker') return;

            const activeClip = track.clips.find(c =>
                currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
            );

            if (activeClip) {
                // Create video element if not already exists
                if (!videoElementsRef.current[activeClip.id]) {
                    const video = document.createElement('video');
                    video.src = activeClip.source;
                    video.muted = !!(activeClip.muted || activeClip.audioDetached); // Respect muting
                    video.crossOrigin = 'anonymous';
                    videoElementsRef.current[activeClip.id] = video;
                }
                const video = videoElementsRef.current[activeClip.id];

                // Manual Sync
                const expectedSourceTime = activeClip.startOffset + (currentTime - activeClip.startTime);
                const drift = Math.abs(video.currentTime - expectedSourceTime);

                if (drift > 0.2) video.currentTime = expectedSourceTime;

                // Apply Properties
                applyAudioProps(video, activeClip, currentTime);

                // Voice Effect
                if (activeClip.voiceEffect) {
                    voiceEffects.applyEffect(video, activeClip.voiceEffect);
                } else {
                    voiceEffects.applyEffect(video, 'none');
                }

                // Check Muted
                const shouldMute = !!(activeClip.muted || activeClip.audioDetached);
                if (video.muted !== shouldMute) video.muted = shouldMute;

                if (isPlaying && video.paused) video.play().catch(() => { });
                else if (!isPlaying && !video.paused) video.pause();
            } else {
                // Pause inactive
                track.clips.forEach(c => {
                    if (videoElementsRef.current[c.id] && !videoElementsRef.current[c.id].paused) {
                        videoElementsRef.current[c.id].pause();
                    }
                });
            }
        });

        // Sync Images
        tracks.forEach(track => {
            if (track.type !== 'image' && track.type !== 'sticker') return;

            const activeClip = track.clips.find(c =>
                currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
            );

            if (activeClip) {
                // Check if it's already handled as video
                if (videoElementsRef.current[activeClip.id]) return;

                if (!imageElementsRef.current[activeClip.id]) {
                    const img = new Image();
                    img.src = activeClip.source || activeClip.thumbnail;
                    img.crossOrigin = 'anonymous';
                    imageElementsRef.current[activeClip.id] = img;
                }
            }
        });

        // Sync Audio
        tracks.forEach(track => {
            if (track.type !== 'audio') return;

            const activeClip = track.clips.find(c =>
                currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
            );

            if (activeClip) {
                if (!audioElementsRef.current[activeClip.id]) {
                    const audio = new Audio(activeClip.source);
                    audioElementsRef.current[activeClip.id] = audio;
                }
                const audio = audioElementsRef.current[activeClip.id];

                const expectedSourceTime = activeClip.startOffset + (currentTime - activeClip.startTime);
                const drift = Math.abs(audio.currentTime - expectedSourceTime);

                if (drift > 0.2) audio.currentTime = expectedSourceTime;

                // Apply Properties
                applyAudioProps(audio, activeClip, currentTime);

                // Voice Effect
                if (activeClip.voiceEffect) {
                    voiceEffects.applyEffect(audio, activeClip.voiceEffect);
                } else {
                    voiceEffects.applyEffect(audio, 'none');
                }

                if (isPlaying && audio.paused) audio.play().catch(() => { });
                else if (!isPlaying && !audio.paused) audio.pause();
            } else {
                track.clips.forEach(c => {
                    if (audioElementsRef.current[c.id] && !audioElementsRef.current[c.id].paused) {
                        audioElementsRef.current[c.id].pause();
                    }
                });
            }
        });

        // Sync Main Media Mute State & Properties & Time
        const mainVideoTrack = tracks.find(t => t.type === 'video'); // Get first video track (usually main)
        if (mainVideoTrack && mediaElementRef.current) {
            const activeMainClip = mainVideoTrack.clips.find(c => currentTime >= c.startTime && currentTime < (c.startTime + c.duration));

            if (activeMainClip) {
                const video = mediaElementRef.current;

                // 1. Check Source
                if (video.dataset.clipId !== activeMainClip.id) {
                    // Only update src if it's different to avoid reloading
                    // Check if src is actually different (handle absolute URLs)
                    const currentSrc = video.src;
                    const newSrc = activeMainClip.source;

                    // Create anchor to resolve relative URLs if needed (though blob URLs are absolute)
                    const a = document.createElement('a');
                    a.href = newSrc;

                    if (currentSrc !== a.href) {
                        video.src = activeMainClip.source;
                    }

                    // Always update clipId
                    video.dataset.clipId = activeMainClip.id;
                }

                // 2. Sync Time
                const expectedSourceTime = activeMainClip.startOffset + (currentTime - activeMainClip.startTime);

                // Only sync if loaded metadata (duration) is available or we just switched
                if (video.readyState >= 1) {
                    const drift = Math.abs(video.currentTime - expectedSourceTime);
                    if (drift > 0.2) {
                        video.currentTime = expectedSourceTime;
                    }
                }

                // 3. Play/Pause
                if (isPlaying && video.paused) {
                    video.play().catch(() => { });
                } else if (!isPlaying && !video.paused) {
                    video.pause();
                }

                // Apply Mute
                const shouldMute = !!activeMainClip.muted;
                if (video.muted !== shouldMute) {
                    video.muted = shouldMute;
                }

                // Apply Speed/Pitch/Volume
                applyAudioProps(video, activeMainClip, currentTime);

                // Apply Voice Effect
                if (activeMainClip.voiceEffect) {
                    voiceEffects.applyEffect(video, activeMainClip.voiceEffect);
                } else {
                    voiceEffects.applyEffect(video, 'none');
                }
            } else {
                // No active clip on main track
                if (mediaElementRef.current && !mediaElementRef.current.paused) {
                    mediaElementRef.current.pause();
                }
            }
        }

    }, [currentTime, isPlaying, tracks, mediaElementRef]);

    // Force pause all elements when isPlaying becomes false
    useEffect(() => {
        if (!isPlaying) {
            Object.values(audioElementsRef.current).forEach(audio => {
                if (!audio.paused) audio.pause();
            });
            Object.values(videoElementsRef.current).forEach(video => {
                if (!video.paused) video.pause();
            });
            // Main media is handled by usePlayback usually, but let's be safe if it's exposed
            if (mediaElementRef.current && !mediaElementRef.current.paused) {
                mediaElementRef.current.pause();
            }
        }
    }, [isPlaying, mediaElementRef]);

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
                    const track = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
                    if (track?.id === 'track-main') {
                        if (mediaElementRef.current) {
                            mediaDims = {
                                width: mediaElementRef.current.videoWidth || mediaElementRef.current.width,
                                height: mediaElementRef.current.videoHeight || mediaElementRef.current.height
                            };
                        }
                    } else {
                        const el = videoElementsRef.current[selectedClipId] || imageElementsRef.current[selectedClipId];
                        if (el) {
                            mediaDims = {
                                width: el.videoWidth || el.width,
                                height: el.videoHeight || el.height
                            };
                        }
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
                    const mainTrack = tracks.find(t => t.id === 'track-main');
                    const activeMainClip = mainTrack?.clips.find(c =>
                        currentTime >= c.startTime && currentTime < (c.startTime + c.duration)
                    );

                    if (item.id === activeMainClip?.id && item.trackType === 'video' && tracks.find(t => t.id === 'track-main')?.clips.includes(item)) {
                        // Main video
                        if (mediaElementRef.current) {
                            mediaDims = {
                                width: mediaElementRef.current.videoWidth || mediaElementRef.current.width,
                                height: mediaElementRef.current.videoHeight || mediaElementRef.current.height
                            };
                        }
                    } else {
                        // Secondary
                        const el = videoElementsRef.current[item.id] || imageElementsRef.current[item.id];
                        if (el) {
                            mediaDims = {
                                width: el.videoWidth || el.width,
                                height: el.videoHeight || el.height
                            };
                        }
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

    const handleSeek = useCallback((time) => {
        seek(time);

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
    }, [seek, isVideo, tracks, mediaElementRef]);

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
                    x: 0, y: 0, scale: 100, rotation: 0
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
        return { ...clip, type: track.type };
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
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipId, handleDelete, undo, redo, canUndo, canRedo]);

    const getVideoElement = useCallback((clipId) => {
        // Check secondary videos first
        if (videoElementsRef.current[clipId]) {
            return videoElementsRef.current[clipId];
        }
        // Check main video
        const mainTrack = tracks.find(t => t.id === 'track-main');
        if (mainTrack && mainTrack.clips.some(c => c.id === clipId)) {
            return mediaElementRef.current;
        }
        return null;
    }, [tracks]);

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
                    <p className="text-white/30 mb-8">{projectAspectRatio.dimensions.width}×{projectAspectRatio.dimensions.height}</p>
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
                    />
                }
            />


            {/* Auto-Composite Panel Modal */}
            {showAutoComposite && (
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
            )}

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

