import { useState, useRef, useCallback } from 'react';
import * as Mp4Muxer from 'mp4-muxer';
import { renderFrame } from '../utils/canvasUtils';
import { getFrameState } from '../utils/renderLogic';

/**
 * Hook for High Quality Video Export using WebCodecs and mp4-muxer
 */
export const useExport = (timelineState, mediaResources, canvasRef) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState(''); // 'rendering', 'encoding', 'saving'
    const [exportError, setExportError] = useState(null);

    const abortControllerRef = useRef(null);

    const exportVideo = useCallback(async (config = {
        width: 1920,
        height: 1080,
        fps: 30,
        bitrate: 5000000, // 5 Mbps
        filename: 'video-export.mp4'
    }) => {
        if (isExporting) return;

        try {
            setIsExporting(true);
            setExportProgress(0);
            setExportStatus('Initializing...');
            setExportError(null);
            abortControllerRef.current = new AbortController();

            const { width, height, fps, bitrate } = config;
            const duration = timelineState.duration;
            const totalFrames = Math.ceil(duration * fps);

            // Determine Codec Level based on resolution and FPS
            // Baseline Profile (4200)
            let codec = 'avc1.42001f'; // Default Level 3.1 (720p)

            if (width > 1920 || height > 1080 || fps > 60) {
                codec = 'avc1.420033'; // Level 5.1 (4K or High FPS)
            } else if (width > 1280 || height > 720 || fps > 30) {
                codec = 'avc1.42002a'; // Level 4.2 (1080p @ 60fps)
            }

            // 1. Initialize Muxer
            const muxer = new Mp4Muxer.Muxer({
                target: new Mp4Muxer.ArrayBufferTarget(),
                video: {
                    codec: 'avc', // H.264
                    width,
                    height
                },
                fastStart: 'in-memory', // Optimize for web playback
                firstTimestampBehavior: 'offset',
            });

            let encoderError = null;

            // 2. Initialize VideoEncoder
            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => {
                    console.error("VideoEncoder error:", e);
                    encoderError = e;
                }
            });

            videoEncoder.configure({
                codec: codec,
                width,
                height,
                bitrate,
                framerate: fps,
            });

            // 3. Prepare Canvas for Rendering
            // We use an offscreen canvas or the existing ref but resized for export
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = width;
            exportCanvas.height = height;
            const ctx = exportCanvas.getContext('2d', {
                alpha: false,
                willReadFrequently: false
            });

            // 4. Render Loop
            setExportStatus('Rendering & Encoding...');

            for (let i = 0; i < totalFrames; i++) {
                if (abortControllerRef.current.signal.aborted) {
                    throw new Error('Export cancelled');
                }

                if (encoderError) {
                    throw new Error(`Encoding failed: ${encoderError.message}`);
                }

                if (videoEncoder.state === 'closed') {
                    throw new Error('VideoEncoder closed unexpectedly');
                }

                const time = i / fps;

                // Update Progress
                setExportProgress(Math.round((i / totalFrames) * 100));

                // Get State for this Frame
                // We need to ensure media elements are sought to the correct time
                // This is the trickiest part: waiting for video elements to seek

                // A. Seek all video elements
                const seekPromises = [];
                const activeVideos = [];

                // Helper to seek a video element with precise frame synchronization
                const seekVideo = async (videoEl, targetTime) => {
                    // 1. Set time
                    videoEl.currentTime = targetTime;

                    // 2. Wait for seeked event if needed (if not already close enough)
                    // We use a very tight tolerance (0.001s = 1ms) because we want exact frames
                    if (Math.abs(videoEl.currentTime - targetTime) > 0.001) {
                        await new Promise(resolve => {
                            const onSeeked = () => {
                                videoEl.removeEventListener('seeked', onSeeked);
                                resolve();
                            };
                            videoEl.addEventListener('seeked', onSeeked, { once: true });
                        });
                    }

                    // 3. Wait for frame to be painted (Critical for frame accuracy)
                    // requestVideoFrameCallback ensures the new frame is actually ready for composition
                    if (videoEl.requestVideoFrameCallback) {
                        await new Promise(resolve => {
                            videoEl.requestVideoFrameCallback(() => resolve());
                        });
                    } else {
                        // Fallback for browsers without rVFC
                        // A small delay to allow paint
                        await new Promise(r => setTimeout(r, 20));
                    }
                };

                // Identify active videos for this frame from timelineState
                // This logic mirrors renderLogic but we need to actually touch the DOM elements
                timelineState.tracks.forEach(track => {
                    if (track.type === 'video') {
                        const clip = track.clips.find(c => time >= c.startTime && time < (c.startTime + c.duration));
                        if (clip) {
                            const videoEl = mediaResources.videoElements[clip.id];
                            if (videoEl) {
                                // Calculate source time
                                const clipTime = time - clip.startTime;
                                const sourceTime = (clip.offset || 0) + clipTime;
                                seekPromises.push(seekVideo(videoEl, sourceTime));
                                activeVideos.push(videoEl);
                            }
                        }
                    }
                });

                // Also main media element if used
                if (mediaResources.mediaElement) {
                    // Check if main track is active
                    const mainTrack = timelineState.tracks.find(t => t.id === 'track-main');
                    const mainClip = mainTrack?.clips.find(c => time >= c.startTime && time < (c.startTime + c.duration));
                    if (mainClip) {
                        const clipTime = time - mainClip.startTime;
                        const sourceTime = (mainClip.offset || 0) + clipTime;
                        seekPromises.push(seekVideo(mediaResources.mediaElement, sourceTime));
                    }
                }

                // Wait for all seeks to complete
                if (seekPromises.length > 0) {
                    await Promise.all(seekPromises);
                }

                // B. Render Frame
                const frameState = getFrameState(time, timelineState.tracks, mediaResources, {
                    ...timelineState,
                    canvasDimensions: { width, height }, // Force export dimensions
                    // Ensure we use high quality settings
                    effectIntensity: timelineState.effectIntensity,
                    activeEffectId: timelineState.activeEffectId,
                    activeFilterId: timelineState.activeFilterId
                });

                // Render to our export canvas
                renderFrame(ctx, mediaResources.mediaElement, frameState, {
                    forceHighQuality: true,
                    applyFiltersToContext: true
                });

                // C. Encode Frame
                // Create VideoFrame from canvas
                const frame = new VideoFrame(exportCanvas, {
                    timestamp: i * (1000000 / fps), // microseconds
                    duration: 1000000 / fps
                });

                videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
                frame.close();

                // Yield to main thread occasionally to keep UI responsive
                if (i % 5 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            // 5. Finalize
            setExportStatus('Finalizing...');
            await videoEncoder.flush();
            muxer.finalize();

            const { buffer } = muxer.target;
            const blob = new Blob([buffer], { type: 'video/mp4' });

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = config.filename;
            a.click();
            URL.revokeObjectURL(url);

            setIsExporting(false);
            setExportProgress(100);
            setExportStatus('Completed');

        } catch (err) {
            console.error("Export failed:", err);
            setExportError(err.message);
            setIsExporting(false);
        }
    }, [timelineState, mediaResources]);

    const cancelExport = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsExporting(false);
        setExportStatus('Cancelled');
    }, []);

    return {
        exportVideo,
        cancelExport,
        isExporting,
        exportProgress,
        exportStatus,
        exportError
    };
};
