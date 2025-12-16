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
 * Aligned with Mobile "Play & Capture" concept for stability,
 * but retaining Desktop features (Audio, Multi-track).
 */
export const useExport = (mediaElementRef, mediaType) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSettings, setExportSettings] = useState({
        resolution: 'HD',
        fps: 30, // Default to 30 FPS for stability
        format: 'image/png'
    });

    const mediaRecorderRef = useRef(null);
    const isExportingRef = useRef(false);
    const destinationNodeRef = useRef(null);

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
            // Ensure no selection UI is rendered
            renderFrame(ctx, media, { ...state, activeOverlayId: null }, { applyFiltersToContext: true, isExport: true });

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
     * Export video (Offline Rendering)
     */
    const exportVideo = useCallback(async (canvasRef, state, trimRange, tracks, mediaResources, globalState) => {
        try {
            setIsExporting(true);
            isExportingRef.current = true;
            setExportProgress(0);

            // 1. Setup Canvas
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');
            const video = mediaElementRef.current; // Main video (background)

            // Calculate export dimensions
            // Fix: Handle case where main video is null (e.g. empty canvas project)
            const originalWidth = video?.videoWidth || 1920;
            const originalHeight = video?.videoHeight || 1080;

            // Handle Crop (if any)
            let finalWidth = originalWidth;
            let finalHeight = originalHeight;

            if (state.transform?.crop) {
                const { width, height } = state.transform.crop;
                finalWidth = (width / 100) * originalWidth;
                finalHeight = (height / 100) * originalHeight;
            }

            // Aspect Ratio Check
            const aspectRatio = finalWidth / finalHeight;
            let baseSize = 1080; // HD default
            if (exportSettings.resolution === '2K') baseSize = 1440;
            if (exportSettings.resolution === '4K') baseSize = 2160;

            let exportWidth, exportHeight;
            if (aspectRatio >= 1) { // Landscape
                exportHeight = baseSize;
                exportWidth = baseSize * aspectRatio;
            } else { // Portrait
                exportWidth = baseSize;
                exportHeight = baseSize / aspectRatio;
            }

            exportWidth = Math.round(exportWidth);
            exportHeight = Math.round(exportHeight);

            // Need valid even dimensions for some codecs
            if (exportWidth % 2 !== 0) exportWidth++;
            if (exportHeight % 2 !== 0) exportHeight++;

            exportCanvas.width = exportWidth;
            exportCanvas.height = exportHeight;

            const exportGlobalState = {
                ...globalState,
                canvasDimensions: { width: exportWidth, height: exportHeight },
                initialAdjustments: globalState.initialAdjustments || state.adjustments,
                activeOverlayId: null,
                activeElementId: null
            };

            // 2. Setup Video Exporter (Offline)
            // Import dynamically to avoid loading if not exporting
            const { VideoExporter } = await import('../utils/videoEncoder');

            const targetFPS = exportSettings.fps || 30;
            const bitrateMap = {
                'HD': 8000000,
                '2K': 16000000,
                '4K': 25000000
            };

            const exporter = new VideoExporter({
                width: exportWidth,
                height: exportHeight,
                fps: targetFPS,
                bitrate: bitrateMap[exportSettings.resolution] || 8000000
            });

            // 3. Offline Render Loop
            // 3. Offline Render Loop
            const startTime = trimRange.start;

            // Calculate actual content duration from tracks to prevent blank frames
            // This acts as a safety net if trimRange.end is stale or set to full video duration
            let maxContentDuration = 0;
            if (tracks && tracks.length > 0) {
                tracks.forEach(track => {
                    track.clips.forEach(clip => {
                        const end = clip.startTime + clip.duration;
                        if (end > maxContentDuration) maxContentDuration = end;
                    });
                });
            }

            // If we found content, clamp to it. Otherwise fallback to trimRange (e.g. empty timeline)
            const contentEnd = maxContentDuration > 0 ? maxContentDuration : trimRange.end;

            // Use the smaller of trimRange.end (user selection) or contentEnd (actual media)
            // But if trimRange.end is LARGER than content (the bug), this clamps it.
            // If trimRange.end is SMALLER (user selected a region), we respect it.
            // Wait, if trimRange defaults to full video (16s) and content is 8s, we want 8s.
            // So Math.min is correct.
            let endTime = trimRange.end;
            if (contentEnd > 0) {
                endTime = Math.min(trimRange.end, contentEnd);
            }
            // Ensure we don't end before start
            if (endTime <= startTime) endTime = startTime + 1; // Minimal duration

            const duration = endTime - startTime;
            const totalFrames = Math.ceil(duration * targetFPS);

            // 3. Render Audio Offline
            setExportProgress(1); // Show some activity
            const { renderOfflineAudio } = await import('../utils/audioExportUtils');

            try {
                // Ensure we have the audio source for the main video.
                // The tracks array usually has it.
                // Note: renderOfflineAudio expects clips to have 'source' property.
                // Main video clip might rely on global state, but initializeTimeline usually sets source.

                // Let's verify main track source for robustness
                const mainTrack = tracks.find(t => t.id === 'track-main');
                if (mainTrack && mainTrack.clips.length > 0 && !mainTrack.clips[0].source && mediaResources.mediaUrl) {
                    // Fallback: Ensure source is set if missing (rare case)
                    mainTrack.clips[0].source = mediaResources.mediaUrl;
                }

                console.log('Starting offline audio rendering...');
                const audioBuffer = await renderOfflineAudio(tracks, duration);

                if (audioBuffer) {
                    console.log('Audio rendered, encoding...', audioBuffer.duration);
                    await exporter.encodeAudio(audioBuffer);
                }
            } catch (audioErr) {
                console.warn('Audio export failed, proceeding with video only', audioErr);
            }

            // 4. Offline Render Loop (Video)

            // Let's pause real playback
            if (video) video.pause();

            for (let i = 0; i < totalFrames; i++) {
                if (!isExportingRef.current) break;

                const currentTime = startTime + (i / targetFPS);

                // 1. Seek Main Video
                // Check if we need to switch source for main track
                const mainTrack = tracks.find(t => t.id === 'track-main');
                if (mainTrack && video) {
                    const activeMainClip = mainTrack.clips.find(c => currentTime >= c.startTime && currentTime < (c.startTime + c.duration));
                    if (activeMainClip) {
                        // Check if source needs update
                        // We use a data attribute or just check src if possible, but for export we can just track it locally
                        // or rely on the element's current src if we can normalize it. 
                        // Safer to track what we set.
                        // But wait, video.src returns absolute URL. activeMainClip.source might be blob or relative.
                        // Let's use the dataset approach similar to MediaEditor.jsx

                        if (video.dataset.clipId !== activeMainClip.id) {
                            console.log(`Export: Switching main video source to clip ${activeMainClip.id}`);
                            video.src = activeMainClip.source;
                            video.dataset.clipId = activeMainClip.id;

                            // Wait for load
                            await new Promise((resolve, reject) => {
                                video.onloadeddata = () => resolve();
                                video.onerror = (e) => reject(new Error(`Failed to load video source for clip ${activeMainClip.id}`));
                                // video.load(); // Trigger load
                            });
                        }

                        // Calculate offset time
                        const clipTime = activeMainClip.startOffset + (currentTime - activeMainClip.startTime);
                        video.currentTime = clipTime;
                    }
                } else if (video) {
                    // Fallback for single source or no main track structure
                    video.currentTime = currentTime;
                }

                // 2. Create Listeners for ALL videos that need seeking
                const seekPromises = [];

                // Helper to create seek promise
                const createSeekPromise = (vidElement) => {
                    return new Promise(resolve => {
                        if (!vidElement.seeking && Math.abs(vidElement.currentTime - vidElement.currentTime) < 0.001) {
                            resolve();
                            return;
                        }
                        const onSeeked = () => resolve();
                        vidElement.addEventListener('seeked', onSeeked, { once: true });
                        setTimeout(() => {
                            vidElement.removeEventListener('seeked', onSeeked);
                            resolve();
                        }, 1000);
                    });
                };

                // Add main video seek promise if it exists
                if (video) {
                    seekPromises.push(createSeekPromise(video));
                }

                // Sync Secondary Tracks & Add Promises
                if (tracks) {
                    tracks.forEach(track => {
                        if ((track.type === 'video' || track.type === 'sticker') && track.id !== 'track-main') {
                            track.clips.forEach(clip => {
                                const el = mediaResources?.videoElements?.[clip.id];
                                if (el) {
                                    if (currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)) {
                                        const clipTime = clip.startOffset + (currentTime - clip.startTime);
                                        // Only set/seek if time has changed significantly to avoid jitter? 
                                        // Actually for export we want exact.
                                        el.currentTime = clipTime;
                                        seekPromises.push(createSeekPromise(el));
                                    }
                                }
                            });
                        }
                    });
                }

                // Wait for ALL videos to be ready
                if (seekPromises.length > 0) {
                    await Promise.all(seekPromises);
                }

                // 3. Update State & Render
                // We need to construct a fake "state" for this frame if our state is React state.
                // But `getFrameState` does this logic! 
                // Ensure no UI overlays (draggers/selection) are rendered by clearing selection ID
                const cleanGlobalState = {
                    ...exportGlobalState,
                    selectedClipId: null,
                    activeOverlayId: null
                };
                const frameState = getFrameState(currentTime, tracks, mediaResources, cleanGlobalState);

                renderFrame(ctx, video, frameState, { applyFiltersToContext: true, isExport: true });

                // 4. Encode
                await exporter.encodeFrame(exportCanvas, i);

                // 5. Progress
                const progress = Math.min(100, Math.round((i / totalFrames) * 100));
                setExportProgress(progress);

                // Yield to event loop to keep UI responsive (and allow cancel)
                await new Promise(r => setTimeout(r, 0));
            }

            if (isExportingRef.current) {
                // Finalize
                const blob = await exporter.stop();
                const filename = generateExportFilename('video');
                downloadBlob(blob, filename);
            }

            setIsExporting(false);
            isExportingRef.current = false;
            setShowExportModal(false);

            // Cleanup: Reset video to start
            if (video) video.currentTime = startTime;

        } catch (error) {
            console.error('Video export failed:', error);
            // alert('Video export failed. ' + error.message);
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
        if (mediaElementRef.current) mediaElementRef.current.pause();

        // Restore audio if needed (usually handled by onstop cleanup, but good to be safe)
        voiceEffects.unmuteSpeakers();

        if (destinationNodeRef.current) {
            voiceEffects.untap(destinationNodeRef.current);
            destinationNodeRef.current = null;
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
            if (!tracks || !mediaResources) {
                console.error("Missing tracks or mediaResources for video export");
                return;
            }
            await exportVideo(canvasRef, state, trimRange || { start: 0, end: mediaElementRef.current.duration }, tracks, mediaResources, globalState);
        }
    }, [mediaType, exportImage, exportVideo, mediaElementRef]);

    return {
        isExporting,
        exportProgress,
        showExportModal,
        exportSettings,
        setShowExportModal,
        setExportSettings,
        handleExport,
        cancelExport
    };
};
