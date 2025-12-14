import { useState, useCallback, useRef } from 'react';
import { renderFrame } from '../utils/canvasUtils';
import { getFrameState } from '../utils/renderLogic';
import { voiceEffects } from '../utils/VoiceEffects';
import {
    canvasToBlob,
    downloadBlob,
    setupMediaRecorder,
    generateExportFilename,
    calculateProgress
} from '../utils/exportUtils';

/**
 * Custom hook for exporting media
 */
export const useExport = (mediaElementRef, mediaType) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSettings, setExportSettings] = useState({
        resolution: 'HD',
        fps: 60,
        format: 'image/png'
    });

    const mediaRecorderRef = useRef(null);
    const isExportingRef = useRef(false);

    /**
     * Export image
     */
    const exportImage = useCallback(async (canvasRef, state) => {
        try {
            setIsExporting(true);
            setExportProgress(10);

            // Create temporary canvas for export
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');

            // Set export dimensions (high quality)
            // Set export dimensions based on crop
            const media = mediaElementRef.current;
            const originalWidth = media.width || media.videoWidth;
            const originalHeight = media.height || media.videoHeight;

            let exportWidth = originalWidth;
            let exportHeight = originalHeight;

            if (state.transform?.crop) {
                const { width, height } = state.transform.crop;
                exportWidth = (width / 100) * originalWidth;
                exportHeight = (height / 100) * originalHeight;
            }

            exportCanvas.width = exportWidth;
            exportCanvas.height = exportHeight;

            setExportProgress(30);

            // Render final frame
            renderFrame(ctx, media, state);

            setExportProgress(70);

            // Convert to blob
            const blob = await canvasToBlob(exportCanvas, exportSettings.format, 0.95);

            setExportProgress(90);

            // Download
            const filename = generateExportFilename('image', exportSettings.format.split('/')[1]);
            downloadBlob(blob, filename);

            setExportProgress(100);
            setIsExporting(false);
            setShowExportModal(false);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
            setIsExporting(false);
        }
    }, [mediaElementRef, exportSettings]);

    /**
     * Export video
     */
    const destinationNodeRef = useRef(null);

    /**
     * Export video
     */
    const exportVideo = useCallback(async (canvasRef, state, trimRange, tracks, mediaResources, globalState) => {
        try {
            setIsExporting(true);
            isExportingRef.current = true;
            setExportProgress(0);

            // Create export canvas
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');
            const video = mediaElementRef.current; // Main Video

            // Set dimensions
            // Calculate dimensions based on crop and resolution
            const originalWidth = video.videoWidth;
            const originalHeight = video.videoHeight;

            let cropWidth = originalWidth;
            let cropHeight = originalHeight;

            if (state.transform?.crop) {
                const { width, height } = state.transform.crop;
                cropWidth = (width / 100) * originalWidth;
                cropHeight = (height / 100) * originalHeight;
            }

            const aspectRatio = cropWidth / cropHeight;

            // Determine base size based on resolution setting
            let baseSize = 1080; // HD
            if (exportSettings.resolution === '2K') baseSize = 1440;
            if (exportSettings.resolution === '4K') baseSize = 2160;

            let exportWidth, exportHeight;

            if (aspectRatio >= 1) {
                // Landscape or Square
                exportHeight = baseSize;
                exportWidth = baseSize * aspectRatio;
            } else {
                // Portrait
                exportWidth = baseSize;
                exportHeight = baseSize / aspectRatio;
            }

            exportCanvas.width = Math.round(exportWidth);
            exportCanvas.height = Math.round(exportHeight);

            // Override global state with export dimensions?
            // getFrameState uses canvasDimensions for aspect ratio logic mostly,
            // but we need to ensure it renders at high res.
            // We pass the EXPORT canvas dimensions to getFrameState via a modified globalState
            const exportGlobalState = {
                ...globalState,
                canvasDimensions: { width: exportCanvas.width, height: exportCanvas.height },
                // Ensure adjustments are passed if not present in globalState
                initialAdjustments: globalState.initialAdjustments || state.adjustments // Fallback
            };

            // --- Audio Handling (Multi-track Master Bus) ---
            let audioTrack = null;
            let destNode = null;

            try {
                // 1. Get Audio Context from VoiceEffects (centralized)
                const actx = voiceEffects.getContext();

                // 2. Create Destination for Recording
                destNode = actx.createMediaStreamDestination();
                destinationNodeRef.current = destNode;

                // 3. Tap ALL audio sources (Main video, effects, overlays) into this destination
                voiceEffects.tap(destNode);

                // 4. Get the mixed audio track
                const stream = destNode.stream;
                if (stream) {
                    const audioTracks = stream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        audioTrack = audioTracks[0];
                    }
                }

                // Resume context if suspended
                if (actx.state === 'suspended') {
                    await actx.resume();
                }

            } catch (e) {
                console.warn('Failed to setup master audio export:', e);
            }

            // Setup MediaRecorder
            const mediaRecorder = setupMediaRecorder(
                exportCanvas,
                exportSettings.fps,
                exportSettings.resolution,
                audioTrack
            );
            mediaRecorderRef.current = mediaRecorder;

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            const cleanupExport = () => {
                try {
                    if (destinationNodeRef.current) {
                        voiceEffects.untap(destinationNodeRef.current);
                        destinationNodeRef.current = null;
                    }

                    // Pause Forcefully all media
                    video.pause();
                    if (mediaResources.videoElements) {
                        Object.values(mediaResources.videoElements).forEach(v => v.pause());
                    }
                    if (mediaResources.audioElements) {
                        // Object.values(mediaResources.audioElements).forEach(a => a.pause()); 
                        // Note: audioElements might not be passed in mediaResources?
                        // We need to add audioElements to mediaResources in calling site!
                    }

                } catch (e) {
                    console.warn('Error cleaning up cleanupexport:', e);
                }
            };

            mediaRecorder.onstop = () => {
                cleanupExport();
                if (!isExportingRef.current) return;

                const blob = new Blob(chunks, { type: 'video/webm' });
                const filename = generateExportFilename('video');
                downloadBlob(blob, filename);

                setIsExporting(false);
                isExportingRef.current = false;
                setShowExportModal(false);
            };

            mediaRecorder.start();

            // Prepare for Playback
            const startTime = trimRange.start;
            const endTime = trimRange.end;

            // Seek Main Video and Wait
            video.currentTime = startTime;

            // Wait for seek to complete on main video
            await new Promise(resolve => {
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    resolve();
                };
                // If already sufficient
                if (Math.abs(video.currentTime - startTime) < 0.1) {
                    resolve();
                } else {
                    video.addEventListener('seeked', onSeeked);
                    // Timeout fallback
                    setTimeout(resolve, 500);
                }
            });

            // Ensure secondary media are also ready/paused at their correct times?
            // For now, allow them to drift-correct in the loop.

            try {
                await video.play();
            } catch (e) {
                console.warn("Play interrupted or failed, retrying play in loop", e);
            }

            const processFrame = () => {
                if (!isExportingRef.current) {
                    mediaRecorder.stop();
                    video.pause();
                    return;
                }

                // End Condition
                if (video.currentTime >= endTime || video.ended) {
                    mediaRecorder.stop();
                    video.pause();
                    return;
                }

                // If paused unexpectedly, resume
                if (video.paused && isExportingRef.current) {
                    video.play().catch(e => console.warn('Resume failed', e));
                }

                const currentTime = video.currentTime;

                // --- Sync Secondary Media ---
                // We must manually sync them because the main React loop might rely on 'isPlaying' state 
                // which might be false during export modal (or we don't want to depend on it).

                // Helper to sync element
                const syncElement = (element, clip) => {
                    if (!element || !clip) return;

                    const expectedTime = clip.startOffset + (currentTime - clip.startTime);

                    // Check if should be playing
                    if (currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)) {
                        // Drift Correction
                        const drift = Math.abs(element.currentTime - expectedTime);
                        if (drift > 0.2) {
                            element.currentTime = expectedTime;
                        }

                        if (element.paused) {
                            element.play().catch(e => { /* ignore play promise errors */ });
                        }

                        // Volume/Mute (Simple apply)
                        element.volume = (clip.volume !== undefined ? clip.volume : 100) / 100;
                        element.muted = !!clip.muted;

                    } else {
                        if (!element.paused) element.pause();
                    }
                };

                // Sync Videos
                tracks.forEach(track => {
                    if (track.type === 'video' && track.id !== 'track-main') {
                        track.clips.forEach(clip => {
                            const params = mediaResources.videoElements[clip.id];
                            if (params) syncElement(params, clip);
                        });
                    }
                    if (track.type === 'audio') {
                        // We need access to audio elements too! Use mediaResources.
                        // We will assume `audioElements` is passed in mediaResources
                        if (mediaResources.audioElements) {
                            track.clips.forEach(clip => {
                                const params = mediaResources.audioElements[clip.id];
                                if (params) syncElement(params, clip);
                            });
                        }
                    }
                });


                // Calculate State
                const frameState = getFrameState(currentTime, tracks, mediaResources, exportGlobalState);

                // Render frame
                renderFrame(ctx, video, frameState);

                // Update progress
                const progress = calculateProgress(
                    currentTime - startTime,
                    endTime - startTime
                );
                setExportProgress(Math.min(95, progress));

                requestAnimationFrame(processFrame);
            };

            processFrame();

        } catch (error) {
            console.error('Video export failed:', error);
            alert('Video export failed. Please try again.');
            setIsExporting(false);
            isExportingRef.current = false;
        }
    }, [mediaElementRef, exportSettings]);

    /**
     * Cancel export
     */
    const cancelExport = useCallback(() => {
        isExportingRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (mediaElementRef.current && mediaElementRef.current.pause) {
            mediaElementRef.current.pause();
        }

        // Restore audio
        try {
            if (sourceNodeRef.current && audioContextRef.current) {
                sourceNodeRef.current.disconnect(destinationNodeRef.current);
                sourceNodeRef.current.connect(audioContextRef.current.destination);
            }
        } catch (e) {
            console.warn('Error restoring audio on cancel:', e);
        }

        setIsExporting(false);
        setExportProgress(0);
    }, [mediaElementRef]);

    /**
     * Main export handler
     */
    const handleExport = useCallback(async (canvasRef, state, trimRange = null, tracks, mediaResources, globalState) => {
        if (mediaType === 'image') {
            await exportImage(canvasRef, state);
        } else {
            // Validate required args for video
            if (!tracks || !mediaResources) {
                console.error("Missing tracks or mediaResources for video export");
                return;
            }
            await exportVideo(canvasRef, state, trimRange || { start: 0, end: mediaElementRef.current.duration }, tracks, mediaResources, globalState);
        }
    }, [mediaType, exportImage, exportVideo, mediaElementRef]);

    return {
        // State
        isExporting,
        exportProgress,
        showExportModal,
        exportSettings,

        // Actions
        setShowExportModal,
        setExportSettings,
        handleExport,
        cancelExport
    };
};
